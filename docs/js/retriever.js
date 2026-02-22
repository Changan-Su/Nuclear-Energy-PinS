/**
 * Retriever — hybrid evidence retrieval from the KnowledgeIndex.
 *
 * Uses EmbeddingService (TF-IDF + optional neural) to rank all knowledge
 * chunks against the user query, then returns the top-k most relevant ones
 * along with a confidence score.
 *
 * The returned evidence pack is passed to PromptPolicy to build the LLM context.
 */
window.Retriever = (function () {
  'use strict';

  const DEFAULT_TOP_K = 4;
  const MIN_SCORE = 0.05;   // chunks below this threshold are discarded

  let _indexBuilt = false;

  // ── Index initialisation ───────────────────────────────────────────────────

  async function ensureIndex(useNeural) {
    if (_indexBuilt) return;
    const chunks = window.KnowledgeIndex.getChunks();
    if (chunks.length === 0) return;
    await window.EmbeddingService.buildIndex(chunks, useNeural);
    _indexBuilt = true;
  }

  // ── Main retrieve function ─────────────────────────────────────────────────

  /**
   * @param {string}  query      - user's question
   * @param {object}  [options]
   * @param {number}  [options.topK=4]
   * @param {boolean} [options.useNeural=false]
   * @param {number}  [options.minScore=0.05]
   * @returns {Promise<{ chunks: chunk[], confidence: string }>}
   */
  async function retrieve(query, options) {
    const topK      = (options && options.topK)      || DEFAULT_TOP_K;
    const useNeural = (options && options.useNeural)  || false;
    const minScore  = (options && options.minScore)   || MIN_SCORE;

    await ensureIndex(useNeural);

    const scored = await window.EmbeddingService.scoreChunks(query, useNeural);
    const topChunks = scored
      .filter(s => s.score >= minScore)
      .slice(0, topK)
      .map(s => s.chunk);

    let confidence = 'none';
    if (topChunks.length > 0) {
      const best = scored[0].score;
      confidence = best >= 0.3 ? 'high' : best >= 0.12 ? 'medium' : 'low';
    }

    return { chunks: topChunks, confidence };
  }

  /** Reset the index (e.g. after material is reloaded) */
  function reset() { _indexBuilt = false; }

  return { retrieve, reset };
})();
