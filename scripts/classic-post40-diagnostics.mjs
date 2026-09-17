import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { GOLDEN_PROFILES, evaluateGoldenPuzzle } from '../server/brutal-search/lib/golden-benchmark-audit.js';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');

const POST40_IDS = new Set([
  'finned-x-wing','sashimi-x-wing','finned-swordfish','sashimi-swordfish','finned-jellyfish','sashimi-jellyfish',
  'sue-de-coq','aligned-pair-exclusion','junior-exocet','multi-sector-locked-set',
]);

const GOLDEN_ALIAS = Object.freeze({
  'ai-escargot-2006': 'ai-escargot-2006',
  'arto-inkala-2012': 'inkala-2012',
});

function firstUse(trace, predicate) {
  const index = trace.findIndex(predicate);
  return index < 0 ? null : index + 1;
}

function summarizeTrace(result) {
  const trace = result.trace || [];
  const post40Hits = {};
  const post40FirstUse = {};
  const urTypes = {};
  const urFirstUse = {};
  for (let i = 0; i < trace.length; i += 1) {
    const step = trace[i];
    if (POST40_IDS.has(step.techniqueId)) {
      post40Hits[step.techniqueId] = (post40Hits[step.techniqueId] || 0) + 1;
      if (post40FirstUse[step.techniqueId] == null) post40FirstUse[step.techniqueId] = i + 1;
    }
    if (step.techniqueId === 'unique-rectangle' && step.explanationData && step.explanationData.type != null) {
      const type = String(step.explanationData.type);
      urTypes[type] = (urTypes[type] || 0) + 1;
      if (urFirstUse[type] == null) urFirstUse[type] = i + 1;
    }
  }
  return { post40Hits, post40FirstUse, urTypes, urFirstUse };
}

function compact(id, profile, result, elapsedMs) {
  const trace = summarizeTrace(result);
  const stall = result.stallDiagnostics || {};
  return {
    id,
    golden: GOLDEN_ALIAS[id] || null,
    roles: ['curated-brutal', 'golden'],
    profile: profile.id,
    unique: result.exactSolutionCount === 1,
    status: result.solveStatus,
    solved: result.solvedLogically,
    score: result.score,
    rawScore: result.rawScore,
    band: result.band,
    hardest: result.hardestTechnique,
    steps: result.totalSteps,
    advancedSteps: result.advancedSteps,
    dependencyDepth: result.dependencyDepth,
    serverPreferred: result.usesServerPreferred,
    serverOnly: result.usesServerOnly,
    techniqueCounts: result.rating.techniqueCounts,
    post40Hits: trace.post40Hits,
    post40FirstUse: trace.post40FirstUse,
    extendedUrTypes: trace.urTypes,
    extendedUrFirstUse: trace.urFirstUse,
    stall: result.solveStatus === 'STALLED' ? {
      state: stall.state ?? null,
      nonzero: stall.nonzero ?? {},
      eligibleFinders: stall.eligibleFinders ?? null,
      errorCount: stall.errors ? Object.keys(stall.errors).length : 0,
    } : null,
    elapsedMs: Math.round(elapsedMs * 10) / 10,
  };
}

const targetId = process.argv[2] || null;
const selected = targetId ? corpus.filter((record) => record.id === targetId) : corpus;
if (targetId && selected.length !== 1) throw new Error(`unknown benchmark id: ${targetId}`);

const profiles = [GOLDEN_PROFILES.PRODUCTION_BRUTAL, GOLDEN_PROFILES.MAX_CAPABILITY];
const started = performance.now();
const rows = [];
for (const record of selected) {
  for (const profile of profiles) {
    const t0 = performance.now();
    const result = evaluateGoldenPuzzle(record.puzzle, profile);
    if (result.exactSolutionCount !== 1) throw new Error(`${record.id}: expected unique puzzle`);
    const row = compact(record.id, profile, result, performance.now() - t0);
    rows.push(row);
    console.log(`CLASSIC_POST40_DIAGNOSTIC_ROW ${JSON.stringify(row)}`);
  }
}

const maxRows = rows.filter((row) => row.profile === 'max-capability');
const summary = {
  uniquePuzzles: selected.length,
  roles: ['curated-brutal', 'golden'],
  profiles: profiles.map((p) => p.id),
  maxCapabilitySolved: maxRows.filter((row) => row.solved).length,
  maxCapabilityStalled: maxRows.filter((row) => row.status === 'STALLED').length,
  post40TechniqueHits: maxRows.reduce((sum, row) => sum + Object.values(row.post40Hits).reduce((a, b) => a + b, 0), 0),
  wallMs: Math.round((performance.now() - started) * 10) / 10,
};
console.log(`CLASSIC_POST40_DIAGNOSTIC_SUMMARY ${JSON.stringify(summary)}`);
