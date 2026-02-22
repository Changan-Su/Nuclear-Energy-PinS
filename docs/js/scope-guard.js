/**
 * ScopeGuard — fast rule-based domain classifier.
 * Determines whether a user query is within the Energy Physics domain
 * before sending it to the retriever and LLM.
 *
 * Returns { inScope: boolean, confidence: 'high'|'medium'|'low', reason: string }
 */
window.ScopeGuard = (function () {
  'use strict';

  // ── Domain vocabulary ──────────────────────────────────────────────────────
  // Queries matching any of these phrases are treated as in-scope.
  const DOMAIN_TERMS = [
    // Nuclear fission
    'fission', 'nuclear', 'reactor', 'uranium', 'neutron', 'chain reaction',
    'criticality', 'radioactive', 'radiation', 'radioactivity', 'decay',
    'control rod', 'moderator', 'coolant', 'enrichment', 'isotope', 'nuclide',
    'binding energy', 'mass defect', 'chernobyl', 'fukushima',
    'smr', 'small modular reactor', 'lwr', 'light water reactor',
    'nuclear power', 'nuclear plant', 'nuclear energy', 'nuclear fuel',
    'nuclear waste', 'spent fuel', 'actinide', 'fission product',
    // MSR
    'molten salt', 'msr', 'lithium fluoride', 'beryllium', 'breeder',
    'thorium', 'graphite moderated', 'passive safety', 'fuel cycle', 'freeze plug',
    // Fusion
    'fusion', 'plasma', 'tokamak', 'iter', 'jet tokamak', 'nif', 'inertial',
    'deuterium', 'tritium', 'lawson criterion', 'confinement',
    'coulomb barrier', 'cross section', 'magnetic confinement',
    'inertial confinement', 'star in a jar', 'triple product',
    // Renewable energy
    'solar', 'wind', 'hydro', 'geothermal', 'photovoltaic', 'pv cell',
    'turbine', 'renewable', 'betz limit', 'penstock', 'reservoir',
    'wind power', 'wind turbine', 'solar panel', 'hydroelectric',
    'geothermal power', 'energy source',
    // Physics concepts
    'carnot', 'thermal efficiency', 'kinetic energy', 'potential energy',
    'e=mc', 'e = mc', 'mass energy', 'electromagnetic', 'faraday',
    'electricity', 'power generation', 'steam turbine', 'heat engine',
    'energy density', 'energy conversion', 'heat exchanger',
    // Environmental / economic
    'carbon emissions', 'greenhouse gas', 'carbon footprint', 'carbon intensity',
    'fossil fuel', 'coal', 'natural gas', 'oil power', 'fossil',
    'lcoe', 'levelised cost', 'electricity generation cost',
    'lifecycle emissions', 'deaths per twh', 'air pollution',
    'pm2.5', 'nox', 'co2', 'acid rain',
  ];

  // Hard refusal: query is almost certainly outside energy physics.
  const HARD_REFUSAL_TERMS = [
    'recipe', 'cooking', 'food', 'restaurant',
    'sports', 'football', 'basketball', 'soccer',
    'music', 'song', 'artist', 'album',
    'celebrity', 'actor', 'actress',
    'movie', 'film', 'tv show', 'netflix',
    'fashion', 'clothing', 'outfit',
    'dating', 'relationship', 'love',
    'social media', 'instagram', 'twitter', 'tiktok', 'facebook',
    'cryptocurrency', 'bitcoin', 'ethereum', 'nft',
    'stock market', 'trading', 'forex',
    'medical diagnosis', 'prescription', 'drug dosage',
    'legal advice', 'lawsuit', 'crime',
    'religion', 'prayer', 'scripture',
    'homework help for english', 'essay writing',
    'translate this text', 'poetry',
  ];

  // Queries about the assistant itself are always allowed.
  const META_PATTERNS = [
    /what (can|do) you (do|know|cover|answer|help)/i,
    /what (topics|subjects|areas) do you cover/i,
    /who are you/i,
    /how (does this|can i use this) work/i,
    /tell me about (this|yourself|your)/i,
    /help me/i,
  ];

  // ── Classification logic ───────────────────────────────────────────────────

  function checkScope(query) {
    if (!query || typeof query !== 'string') {
      return { inScope: false, confidence: 'high', reason: 'empty_query' };
    }

    const lower = query.toLowerCase().trim();

    // Meta queries are always allowed
    if (META_PATTERNS.some(p => p.test(lower))) {
      return { inScope: true, confidence: 'high', reason: 'meta_query' };
    }

    // Check hard refusal
    const hardRefusal = HARD_REFUSAL_TERMS.some(t => lower.includes(t));

    // Count matched domain terms
    const matched = DOMAIN_TERMS.filter(t => lower.includes(t));
    const score = matched.length;

    if (score >= 2) {
      return { inScope: true, confidence: 'high', reason: 'domain_match', matched };
    }

    if (score === 1 && !hardRefusal) {
      return { inScope: true, confidence: 'medium', reason: 'domain_match', matched };
    }

    if (hardRefusal && score === 0) {
      return { inScope: false, confidence: 'high', reason: 'hard_refusal' };
    }

    // Short queries with no keywords — be lenient, let retriever decide
    const wordCount = lower.split(/\s+/).length;
    if (wordCount <= 4) {
      return { inScope: true, confidence: 'low', reason: 'short_query' };
    }

    // Long queries with no domain keywords — out of scope
    if (score === 0 && wordCount > 8) {
      return { inScope: false, confidence: 'medium', reason: 'no_domain_keywords' };
    }

    // Uncertain — let retriever and LLM decide
    return { inScope: true, confidence: 'low', reason: 'uncertain' };
  }

  return { checkScope };
})();
