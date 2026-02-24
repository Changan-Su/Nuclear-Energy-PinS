/**
 * PromptPolicy — system prompt, evidence formatting, and refusal messages.
 *
 * Builds the messages array sent to the LLM, embedding retrieved evidence
 * as context. Keeps the system prompt strict about Energy Physics scope.
 */
window.PromptPolicy = (function () {
  'use strict';

  // ── System prompt ──────────────────────────────────────────────────────────

  const SYSTEM_PROMPT = `You are Nuclear Energy Expert AI, an educational assistant for the \
"Nuclear Energy: Physics in Society" project by Durham University Physics students.

STRICT RULES — follow every one of these without exception:

1. SCOPE: You ONLY answer questions about energy physics, specifically:
   nuclear fission, nuclear fusion, molten salt reactors (MSRs), \
renewable energy (solar, wind, hydroelectric, geothermal), fossil fuels vs. nuclear \
comparisons, and related physics/thermodynamics concepts.

2. OFF-TOPIC REFUSAL: If the question is not about energy physics, reply with exactly:
   "I'm only able to answer questions about energy physics topics such as nuclear \
fission, fusion, reactors, and energy sources. Please ask something related to \
those areas."
   Do NOT attempt to answer or rephrase an off-topic question.

3. EVIDENCE-FIRST: Base your answer primarily on the evidence provided under \
[EVIDENCE FROM PROJECT MATERIALS]. Cite evidence using the reference IDs shown \
(e.g., "according to [2]" or "as noted in [19]").

4. INSUFFICIENT EVIDENCE: If the provided evidence does not contain enough detail \
to answer the question, say clearly: "The project materials don't cover this in \
detail." You may then add a brief note using general physics knowledge, labelling \
it as "General knowledge (not from project materials):".

5. CITATIONS: End every substantive answer with a "Sources:" line listing the \
reference IDs you used (e.g., "Sources: [2], [7], [19]"). If you used general \
knowledge only, write "Sources: general knowledge".

6. LANGUAGE: Use clear, educational language appropriate for A-level / first-year \
undergraduate physics students. Avoid jargon without explanation.

7. LENGTH: Be concise. 2–4 sentences for simple factual questions; up to 8 sentences \
for complex explanations. Use line breaks between distinct points.

8. MATHS: You may include LaTeX inline (\\(…\\)) or display (\\[…\\]) notation where \
it aids understanding.`;

  // ── Evidence formatter ─────────────────────────────────────────────────────

  /**
   * Format retrieved chunks into a readable evidence block.
   * @param {Array} chunks - from KnowledgeIndex
   * @returns {string}
   */
  function formatEvidence(chunks) {
    if (!chunks || chunks.length === 0) {
      return '(No relevant evidence found in project materials.)';
    }
    return chunks.map((c, i) => {
      const header = `[${i + 1}] "${c.title}" — ${c.sectionName}`;
      const body   = c.text.slice(0, 600);
      const refs   = c.refIds.length > 0
        ? `References: ${c.refIds.map(id => `[${id}]`).join(', ')}`
        : '';
      return [header, body, refs].filter(Boolean).join('\n');
    }).join('\n\n---\n\n');
  }

  // ── Message builder ────────────────────────────────────────────────────────

  /**
   * Builds the messages array for the chat completion request.
   * @param {string} query
   * @param {Array}  chunks  - retrieved evidence chunks
   * @returns {Array<{role, content}>}
   */
  function buildMessages(query, chunks) {
    const evidenceBlock = formatEvidence(chunks);
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          `[EVIDENCE FROM PROJECT MATERIALS]\n${evidenceBlock}\n\n` +
          `[STUDENT QUESTION]\n${query}`,
      },
    ];
  }

  // ── Canned responses ───────────────────────────────────────────────────────

  const REFUSAL_MESSAGE =
    "I'm only able to answer questions about energy physics topics such as " +
    "nuclear fission, fusion, reactors, and energy sources. Please ask something " +
    "related to those areas.";

  const NO_EVIDENCE_PREFIX =
    "The project materials don't cover this in enough detail. " +
    "Based on general knowledge: ";

  return { buildMessages, formatEvidence, REFUSAL_MESSAGE, NO_EVIDENCE_PREFIX };
})();
