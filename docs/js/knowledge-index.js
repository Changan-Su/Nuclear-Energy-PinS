/**
 * KnowledgeIndex — builds a searchable corpus from material.json sections.
 * Extracts text chunks with metadata and citation references from:
 *   highlights (Fission), Fusion2 (Fusion), safety (MSR),
 *   features (Renewables), sustainability (Fossil Fuels vs Nuclear).
 */
window.KnowledgeIndex = (function () {
  'use strict';

  let _chunks = null;
  let _refMap = {};   // refId (number) → { id, text, url? }

  // ── DOM helpers ────────────────────────────────────────────────────────────

  function stripHtml(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function extractRefIds(html) {
    if (!html) return [];
    const div = document.createElement('div');
    div.innerHTML = html;
    const seen = new Set();
    div.querySelectorAll('.ref-cite[data-ref-id]').forEach(el => {
      const id = parseInt(el.getAttribute('data-ref-id'), 10);
      if (!isNaN(id)) seen.add(id);
    });
    return [...seen];
  }

  // ── Chunk factory ──────────────────────────────────────────────────────────

  function makeChunk(sectionKey, sectionName, title, description, detail, inlineRefs) {
    const rawHtml = detail || description || '';
    const refIds = extractRefIds(rawHtml);
    const plainText = [
      title || '',
      stripHtml(description || ''),
      stripHtml(rawHtml),
    ].filter(Boolean).join(' ');

    const resolvedRefs = refIds
      .map(id => _refMap[id])
      .filter(Boolean);

    // Merge any card-level inline references (features.cards[].references)
    if (inlineRefs) {
      inlineRefs.forEach(r => {
        if (r && r.text && !resolvedRefs.find(x => x.text === r.text)) {
          resolvedRefs.push(r);
        }
      });
    }

    const id = `${sectionKey}__${(title || '').replace(/\s+/g, '_').toLowerCase()}`;
    return { id, section: sectionKey, sectionName, title: title || '', text: plainText, refIds, refs: resolvedRefs };
  }

  // ── Main builder ───────────────────────────────────────────────────────────

  function build(material) {
    const idx = material.index || {};

    // Build reference map from footer
    _refMap = {};
    (idx.footer?.reference?.items || []).forEach(r => {
      _refMap[r.id] = r;
    });

    const chunks = [];

    // Fission Introduction (tabbed-content with .items[])
    (idx.highlights?.items || []).forEach(item => {
      chunks.push(makeChunk(
        'highlights', 'Fission Introduction',
        item.title, item.description, item.detail
      ));
    });

    // Nuclear Fusion (interactive-details with .items[])
    (idx.Fusion2?.items || []).forEach(item => {
      chunks.push(makeChunk(
        'Fusion2', 'Nuclear Fusion',
        item.title, item.description, item.detail
      ));
    });

    // Molten Salt Reactors (text-image-left with .items[])
    (idx.safety?.items || []).forEach(item => {
      chunks.push(makeChunk(
        'safety', 'Molten Salt Reactors (MSR)',
        item.title, item.description, item.detail
      ));
    });

    // Renewable Energy (card-grid with .cards[])
    (idx.features?.cards || []).forEach(item => {
      chunks.push(makeChunk(
        'features', 'Renewable Energy',
        item.title, item.description, item.detail, item.references
      ));
    });

    // Fossil Fuels vs Nuclear (text-image-right with .items[])
    (idx.sustainability?.items || []).forEach(item => {
      chunks.push(makeChunk(
        'sustainability', 'Fossil Fuels vs Nuclear',
        item.title, item.description, item.detail
      ));
    });

    _chunks = chunks;
    return chunks;
  }

  function getChunks() { return _chunks || []; }
  function getRefMap()  { return _refMap; }
  function isBuilt()    { return _chunks !== null; }

  return { build, getChunks, getRefMap, isBuilt };
})();
