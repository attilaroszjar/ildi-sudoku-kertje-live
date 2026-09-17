const BRUTAL_MIN_SCORE = 240;
const SCORE_BUCKETS = Object.freeze([
  Object.freeze({ id: 'lt130', min: -Infinity, max: 129 }),
  Object.freeze({ id: '130_159', min: 130, max: 159 }),
  Object.freeze({ id: '160_189', min: 160, max: 189 }),
  Object.freeze({ id: '190_219', min: 190, max: 219 }),
  Object.freeze({ id: '220_239', min: 220, max: 239 }),
  Object.freeze({ id: 'gte240', min: 240, max: Infinity }),
]);

function inc(target, key) {
  const normalized = key == null || key === '' ? 'null' : String(key);
  target[normalized] = (target[normalized] || 0) + 1;
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function scoreBucket(score) {
  if (!Number.isFinite(score)) return 'null';
  return SCORE_BUCKETS.find((bucket) => score >= bucket.min && score <= bucket.max)?.id || 'null';
}

export function compactRating(rating) {
  if (!rating || typeof rating !== 'object') return null;
  const score = finiteOrNull(rating.score);
  const rawScore = finiteOrNull(rating.rawScore);
  return Object.freeze({
    score,
    rawScore,
    band: rating.band || null,
    scoreStatus: rating.scoreStatus || null,
    hardestTechnique: rating.hardestTechnique || null,
    advancedSteps: Number.isSafeInteger(rating.advancedSteps) ? rating.advancedSteps : 0,
    dependencyDepth: Number.isSafeInteger(rating.dependencyDepth) ? rating.dependencyDepth : 0,
    usesServerPreferred: rating.usesServerPreferred === true,
    totalSteps: Number.isSafeInteger(rating.totalSteps) ? rating.totalSteps : 0,
    placements: Number.isSafeInteger(rating.placements) ? rating.placements : 0,
    eliminations: Number.isSafeInteger(rating.eliminations) ? rating.eliminations : 0,
    distanceToBrutal: score == null ? null : BRUTAL_MIN_SCORE - score,
  });
}

export function classifyAudit(audit) {
  if (!audit || typeof audit !== 'object') return 'OTHER_AUDIT_REJECT';
  if (audit.reason === 'ACCEPTED') return 'ACCEPTED';
  if (audit.reason === 'UNRATED_INCOMPLETE') return 'STALLED_INCOMPLETE';
  if (audit.reason === 'BAND_MISMATCH' && audit.solveStatus === 'SOLVED_LOGICALLY' && audit.rating?.band === 'expert') {
    return 'SOLVED_EXPERT';
  }
  return 'OTHER_AUDIT_REJECT';
}

export function compactPrescreen(pre) {
  if (!pre || typeof pre !== 'object') return null;
  return Object.freeze({
    pass: pre.pass === true,
    status: pre.status || null,
    reason: pre.reason || null,
    rating: compactRating(pre.rating),
  });
}

export function compactAudit(audit) {
  if (!audit || typeof audit !== 'object') {
    return Object.freeze({ reason: null, solveStatus: null, outcome: 'OTHER_AUDIT_REJECT', rating: null });
  }
  return Object.freeze({
    reason: audit.reason || null,
    solveStatus: audit.solveStatus || null,
    outcome: classifyAudit(audit),
    rating: compactRating(audit.rating),
  });
}

export function createSeedDiagnostic({ seed, fingerprint, prescreen, audit = null }) {
  return Object.freeze({
    seed,
    fingerprint: fingerprint || null,
    prescreen: compactPrescreen(prescreen),
    audit: audit == null ? null : compactAudit(audit),
  });
}

function sampleRank(entry) {
  const distance = entry.audit?.rating?.distanceToBrutal;
  if (Number.isFinite(distance) && distance >= 0) return distance;
  return Number.MAX_SAFE_INTEGER;
}

export function summarizeDiagnostics(entries = [], { sampleLimit = 8 } = {}) {
  if (!Array.isArray(entries)) throw new TypeError('diagnostic entries must be an array');
  if (!Number.isSafeInteger(sampleLimit) || sampleLimit < 0 || sampleLimit > 16) {
    throw new RangeError('sampleLimit must be an integer in [0, 16]');
  }

  const summary = {
    prescreenSurvivors: 0,
    fullAudits: 0,
    prescreenStatus: {},
    prescreenBand: {},
    auditOutcome: {},
    auditBand: {},
    hardestTechnique: {},
    scoreHistogram: {},
    advancedSteps: { min: null, max: null, sum: 0, count: 0 },
    dependencyDepth: { min: null, max: null, sum: 0, count: 0 },
    serverPreferredCount: 0,
    totalSteps: { min: null, max: null, sum: 0, count: 0 },
    placements: { min: null, max: null, sum: 0, count: 0 },
    eliminations: { min: null, max: null, sum: 0, count: 0 },
  };

  function addRange(target, value) {
    if (!Number.isFinite(value)) return;
    target.min = target.min == null ? value : Math.min(target.min, value);
    target.max = target.max == null ? value : Math.max(target.max, value);
    target.sum += value;
    target.count += 1;
  }

  const nearMisses = [];
  for (const entry of entries) {
    if (entry?.prescreen?.pass === true) {
      summary.prescreenSurvivors += 1;
      inc(summary.prescreenStatus, entry.prescreen.status);
      inc(summary.prescreenBand, entry.prescreen.rating?.band);
    }
    if (!entry?.audit) continue;
    summary.fullAudits += 1;
    inc(summary.auditOutcome, entry.audit.outcome);
    inc(summary.auditBand, entry.audit.rating?.band);
    inc(summary.hardestTechnique, entry.audit.rating?.hardestTechnique);
    inc(summary.scoreHistogram, scoreBucket(entry.audit.rating?.score));
    addRange(summary.advancedSteps, entry.audit.rating?.advancedSteps);
    addRange(summary.dependencyDepth, entry.audit.rating?.dependencyDepth);
    addRange(summary.totalSteps, entry.audit.rating?.totalSteps);
    addRange(summary.placements, entry.audit.rating?.placements);
    addRange(summary.eliminations, entry.audit.rating?.eliminations);
    if (entry.audit.rating?.usesServerPreferred === true) summary.serverPreferredCount += 1;
    if (entry.audit.outcome !== 'ACCEPTED') nearMisses.push(entry);
  }

  nearMisses.sort((a, b) => sampleRank(a) - sampleRank(b) || a.seed - b.seed);
  return Object.freeze({
    ...summary,
    nearMissSamples: Object.freeze(nearMisses.slice(0, sampleLimit)),
  });
}

export { BRUTAL_MIN_SCORE };
