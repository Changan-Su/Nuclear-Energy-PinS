/**
 * ResponseGuard — validates and sanitises LLM output before display.
 *
 * Checks:
 *   1. Response is not empty / error.
 *   2. Response does not contain hard out-of-scope content.
 *   3. Extracts citation IDs from the "Sources:" footer.
 *   4. Resolves citation IDs to full reference objects from the global refMap.
 *   5. Formats the final text for safe HTML rendering.
 *
 * Returns:
 *   { text: string, citations: Array<{id, text, url?}>, sectionCitations: Array, modified: boolean }
 */
window.ResponseGuard = (function () {
  'use strict';

  // Phrases that indicate the model has already refused the question.
  const REFUSAL_MARKERS = [
    "i'm only able to answer",
    "i can only answer",
    "outside my scope",
    "not able to help with that",
    "cannot assist with",
    'only answer questions about energy physics',
    "the project materials don't cover this in enough detail",
  ];

  // Phrases that suggest the model has drifted completely off-topic.
  const DRIFT_MARKERS = [
    'as an ai language model',
    'i am chatgpt',
    'as chatgpt',
    "i don't have access to the internet",
    'my training data',
    'i was trained by openai',
  ];

  // ── Citation extraction ────────────────────────────────────────────────────

  /**
   * Parse reference IDs from a "Sources: [2], [7], [19]" footer.
   * Also scans the body for inline [N] citations.
   */
  function extractCitedIds(text) {
    const ids = new Set();
    // Sources: [2], [7, 19], [19] — various formats
    const sourcesMatch = text.match(/sources?:?\s*([\d\s,\[\]]+)/i);
    if (sourcesMatch) {
      const raw = sourcesMatch[1];
      (raw.match(/\d+/g) || []).forEach(n => ids.add(parseInt(n, 10)));
    }
    // Inline [N] citations anywhere in the text
    const inlineMatches = text.matchAll(/\[(\d+)\]/g);
    for (const m of inlineMatches) ids.add(parseInt(m[1], 10));
    return [...ids];
  }

  // ── Text formatter ─────────────────────────────────────────────────────────

  /**
   * Converts plain-text LLM output to safe HTML for innerHTML rendering.
   * - Newlines → <br>
   * - Strips any raw <script> / <iframe> the LLM might emit
   */
  function formatText(text) {
    // Remove potentially dangerous tags
    const safe = text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');

    // Convert newlines to <br> for readable display
    return safe
      // Normalize double-escaped LaTeX delimiters from some providers.
      .replace(/\\\\\[/g, '\\[')
      .replace(/\\\\\]/g, '\\]')
      .replace(/\\\\\(/g, '\\(')
      .replace(/\\\\\)/g, '\\)')
      .replace(/\n/g, '<br>');
  }

  function extractSectionCitations(evidenceChunks) {
    if (!Array.isArray(evidenceChunks)) return [];
    const seen = new Set();
    const items = [];
    evidenceChunks.forEach(chunk => {
      if (!chunk || !chunk.section) return;
      const anchor = chunk.section === 'aiChat' ? 'ai-chat' : chunk.section;
      const key = `${anchor}::${chunk.title || ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        anchor,
        sectionName: chunk.sectionName || chunk.section,
        title: chunk.title || chunk.sectionName || chunk.section,
      });
    });
    return items.slice(0, 5);
  }

  function resolveReferenceId(citation, refMap) {
    if (!citation || !refMap) return null;
    if (Number.isFinite(Number(citation.id))) return Number(citation.id);

    const text = (citation.text || '').trim().toLowerCase();
    const urlMatch = (citation.url || citation.text || '').match(/https?:\/\/[^\s)]+/i);
    const url = urlMatch ? urlMatch[0].toLowerCase() : '';

    const refs = Object.values(refMap || {});
    // 1) URL match has highest confidence.
    if (url) {
      const byUrl = refs.find(r => {
        const rText = String(r.text || '').toLowerCase();
        return rText.includes(url);
      });
      if (byUrl && Number.isFinite(Number(byUrl.id))) return Number(byUrl.id);
    }

    // 2) Fallback: citation text contains/overlaps footer text fragment.
    if (text) {
      const byText = refs.find(r => {
        const rText = String(r.text || '').toLowerCase();
        if (!rText) return false;
        return rText.includes(text) || text.includes(rText.slice(0, 80));
      });
      if (byText && Number.isFinite(Number(byText.id))) return Number(byText.id);
    }

    return null;
  }

  function normalizeCitation(c, refMap) {
    if (!c) return null;
    const text = (c.text || '').trim();
    const id = Number.isFinite(Number(c.id)) ? Number(c.id) : resolveReferenceId(c, refMap);
    const urlMatch = (c.url || text).match(/https?:\/\/[^\s)]+/i);
    const url = urlMatch ? urlMatch[0] : '';
    if (!id && !text && !url) return null;
    return { id, text, url };
  }

  function buildEvidenceCitations(evidenceChunks, refMap) {
    if (!Array.isArray(evidenceChunks)) return [];
    const out = [];
    const seen = new Set();

    const add = (candidate) => {
      const c = normalizeCitation(candidate, refMap);
      if (!c) return;
      const key = c.id ? `id:${c.id}` : `txt:${c.text}|url:${c.url}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(c);
    };

    evidenceChunks.forEach(chunk => {
      if (!chunk) return;
      (chunk.refIds || []).forEach(id => add(refMap[id]));
      (chunk.refs || []).forEach(ref => add(ref));
    });

    return out;
  }

  function mergeCitations(modelCitations, evidenceCitations, maxCount) {
    const merged = [];
    const seen = new Set();
    const add = (c, refMap) => {
      const normalized = normalizeCitation(c, refMap);
      if (!normalized) return;
      const key = normalized.id ? `id:${normalized.id}` : `txt:${normalized.text}|url:${normalized.url}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(normalized);
    };

    (modelCitations || []).forEach(c => add(c, null));
    (evidenceCitations || []).forEach(c => add(c, null));
    return merged.slice(0, maxCount || 8);
  }

  // ── Guard function ─────────────────────────────────────────────────────────

  /**
   * @param {string} responseText  - raw LLM output
   * @param {Array}  evidenceChunks - chunks that were passed to the LLM
   * @param {object} refMap        - { refId: { id, text, url? } }
   * @returns {{ text: string, citations: Array, isRefusal: boolean, modified: boolean }}
   */
  function guard(responseText, evidenceChunks, refMap) {
    if (!responseText || responseText.trim().length === 0) {
      return {
        text: 'I was unable to generate a response. Please try again.',
        citations: [],
        sectionCitations: extractSectionCitations(evidenceChunks),
        isRefusal: false,
        modified: true,
      };
    }

    const lower = responseText.toLowerCase();
    const isRefusal = REFUSAL_MARKERS.some(m => lower.includes(m));
    const hasDrift  = DRIFT_MARKERS.some(m => lower.includes(m));

    // If the model drifted (mentioned itself as another AI), strip that part
    let text = responseText;
    if (hasDrift) {
      // Try to recover useful content by cutting at the first drift marker
      const driftIdx = DRIFT_MARKERS.reduce((idx, m) => {
        const found = lower.indexOf(m);
        return found > -1 && (idx === -1 || found < idx) ? found : idx;
      }, -1);
      if (driftIdx > 60) {
        text = responseText.slice(0, driftIdx).trim();
      } else {
        text = window.PromptPolicy.REFUSAL_MESSAGE;
        return {
          text: formatText(text),
          citations: [],
          sectionCitations: extractSectionCitations(evidenceChunks),
          isRefusal: true,
          modified: true
        };
      }
    }

    // Extract cited reference IDs from model output
    const citedIds = extractCitedIds(text);
    const modelCitations = citedIds
      .map(id => refMap[id])
      .filter(Boolean);
    const evidenceCitations = buildEvidenceCitations(evidenceChunks, refMap);
    const citations = mergeCitations(modelCitations, evidenceCitations, 8);

    // Remove the "Sources: ..." footer from the rendered text
    // (we render citations in a dedicated block below the bubble)
    const cleanText = text.replace(/\n?sources?:?\s*[\[\d\]\s,]+\.?\s*$/i, '').trim();

    return {
      text: formatText(cleanText),
      citations,
      sectionCitations: extractSectionCitations(evidenceChunks),
      isRefusal,
      modified: false,
    };
  }

  return { guard };
})();
