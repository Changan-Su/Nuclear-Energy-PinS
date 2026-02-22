/**
 * EmbeddingService — TF-IDF vectoriser with optional neural embedding upgrade.
 *
 * Primary path (always available):
 *   Build a TF-IDF index over all knowledge chunks, then score a query
 *   via cosine similarity on TF-IDF vectors.
 *
 * Optional neural path (requires useEmbeddings: true in aiChat config):
 *   Dynamically imports @xenova/transformers (Xenova/all-MiniLM-L6-v2) and
 *   uses it to produce 384-dim vectors, falling back to TF-IDF on failure.
 */
window.EmbeddingService = (function () {
  'use strict';

  // ── TF-IDF implementation ──────────────────────────────────────────────────

  const STOP_WORDS = new Set([
    'a','an','the','is','it','in','on','at','to','of','and','or','but',
    'for','with','from','by','as','be','was','were','are','has','have',
    'had','this','that','these','those','also','can','could','would',
    'should','may','might','will','not','no','its','their','they','we',
    'he','she','his','her','our','your','i','me','my','you','do','does',
    'did','been','into','if','so','up','out','all','more','than','which',
    'what','how','when','where','who','why','such','any','some','between',
    'about','both','each','very','than','there','then','them','well',
  ]);

  let _idf = null;    // { term → idf_score }
  let _corpus = [];   // [{ id, vector, chunk }]

  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));
  }

  function termFreq(tokens) {
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    const total = tokens.length || 1;
    Object.keys(tf).forEach(t => { tf[t] /= total; });
    return tf;
  }

  function buildIdf(documents) {
    const N = documents.length;
    const df = {};
    documents.forEach(doc => {
      const unique = new Set(tokenize(doc));
      unique.forEach(t => { df[t] = (df[t] || 0) + 1; });
    });
    const idf = {};
    Object.keys(df).forEach(t => {
      idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1; // smoothed
    });
    return idf;
  }

  function tfidfVector(text, idf) {
    const tokens = tokenize(text);
    const tf = termFreq(tokens);
    const vec = {};
    Object.keys(tf).forEach(t => {
      vec[t] = tf[t] * (idf[t] || 0.5);
    });
    return vec;
  }

  function sparseDot(a, b) {
    let dot = 0;
    Object.keys(a).forEach(t => { if (b[t]) dot += a[t] * b[t]; });
    return dot;
  }

  function sparseNorm(v) {
    return Math.sqrt(Object.values(v).reduce((s, x) => s + x * x, 0));
  }

  function cosineSparse(a, b) {
    const denom = sparseNorm(a) * sparseNorm(b);
    return denom < 1e-10 ? 0 : sparseDot(a, b) / denom;
  }

  function buildTfidfIndex(chunks) {
    const docs = chunks.map(c => c.text);
    _idf = buildIdf(docs);
    _corpus = chunks.map(c => ({
      id: c.id,
      vector: tfidfVector(c.text, _idf),
      chunk: c,
    }));
  }

  function scoreTfidf(query) {
    if (!_idf || _corpus.length === 0) return [];
    const qVec = tfidfVector(query, _idf);
    return _corpus
      .map(entry => ({ chunk: entry.chunk, score: cosineSparse(qVec, entry.vector) }))
      .sort((a, b) => b.score - a.score);
  }

  // ── Optional neural embeddings (Transformers.js) ───────────────────────────

  let _neuralPipeline = null;
  let _neuralLoading = false;
  let _neuralFailed = false;
  let _neuralVectors = null;  // Float32Array[] per chunk

  const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2/dist/transformers.min.js';
  const NEURAL_MODEL = 'Xenova/all-MiniLM-L6-v2';

  async function loadNeuralModel() {
    if (_neuralPipeline) return _neuralPipeline;
    if (_neuralFailed) return null;
    if (_neuralLoading) {
      // Poll until loaded or failed
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (_neuralPipeline || _neuralFailed) break;
      }
      return _neuralPipeline;
    }

    _neuralLoading = true;
    try {
      if (!window.Transformers) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = TRANSFORMERS_CDN;
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const lib = window.Transformers || window;
      if (typeof lib.pipeline !== 'function') throw new Error('pipeline not found');
      _neuralPipeline = await lib.pipeline('feature-extraction', NEURAL_MODEL, { quantized: true });
      console.log('[EmbeddingService] Neural model ready:', NEURAL_MODEL);
    } catch (e) {
      console.warn('[EmbeddingService] Neural model failed, using TF-IDF:', e.message);
      _neuralFailed = true;
    } finally {
      _neuralLoading = false;
    }
    return _neuralPipeline;
  }

  async function embedTexts(texts) {
    const model = await loadNeuralModel();
    if (!model) return null;
    try {
      const output = await model(texts, { pooling: 'mean', normalize: true });
      return texts.map((_, i) => Array.from(output[i]?.data || []));
    } catch (e) {
      console.warn('[EmbeddingService] embed failed:', e);
      _neuralFailed = true;
      return null;
    }
  }

  function cosineDense(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
  }

  async function buildNeuralIndex(chunks) {
    const texts = chunks.map(c => c.text.slice(0, 400));
    const vecs = await embedTexts(texts);
    if (!vecs) return false;
    _neuralVectors = vecs;
    return true;
  }

  async function scoreNeural(query) {
    if (!_neuralVectors) return null;
    const qVecs = await embedTexts([query.slice(0, 400)]);
    if (!qVecs || !qVecs[0]) return null;
    const qVec = qVecs[0];
    return _corpus.map((entry, i) => ({
      chunk: entry.chunk,
      score: cosineDense(qVec, _neuralVectors[i] || []),
    })).sort((a, b) => b.score - a.score);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async function buildIndex(chunks, useNeural) {
    buildTfidfIndex(chunks);
    if (useNeural) {
      const ok = await buildNeuralIndex(chunks);
      if (!ok) console.info('[EmbeddingService] Falling back to TF-IDF');
    }
  }

  async function scoreChunks(query, useNeural) {
    if (useNeural && !_neuralFailed) {
      const neuralScores = await scoreNeural(query);
      if (neuralScores) {
        // Combine neural + TF-IDF with 60/40 blend
        const tfidfScores = scoreTfidf(query);
        const tfidfMap = {};
        tfidfScores.forEach(({ chunk, score }) => { tfidfMap[chunk.id] = score; });
        return neuralScores.map(({ chunk, score: ns }) => ({
          chunk,
          score: 0.6 * ns + 0.4 * (tfidfMap[chunk.id] || 0),
        })).sort((a, b) => b.score - a.score);
      }
    }
    return scoreTfidf(query);
  }

  function isNeuralAvailable() { return !_neuralFailed && _neuralPipeline !== null; }

  return { buildIndex, scoreChunks, isNeuralAvailable, loadNeuralModel };
})();
