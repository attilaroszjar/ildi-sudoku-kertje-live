import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { GOLDEN_PROFILES, evaluateGoldenPuzzle } from '../server/brutal-search/lib/golden-benchmark-audit.js';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');

const targetId = process.argv[2] || 'ai-escargot-2006';
const record = corpus.find((x) => x.id === targetId);
if (!record) throw new Error(`unknown benchmark id: ${targetId}`);

function replayState(puzzle, trace) {
  const state = new H.ClassicHumanState(puzzle);
  for (const step of trace || []) if (!state.apply(step)) throw new Error('trace replay failed');
  return state;
}

function falseKeySet(state) {
  const grid = state.cloneGrid();
  const out = new Set();
  for (let cell = 0; cell < 81; cell += 1) {
    const [r, c] = C.rowCol(cell);
    if (grid[r][c]) continue;
    for (const digit of C.digitsFromMask(state.masks[cell])) {
      const probe = grid.map((row) => row.slice());
      probe[r][c] = digit;
      if (C.countSolutions(probe, 1) === 0) out.add(`${cell}:${digit}`);
    }
  }
  return out;
}

function summarize(id, limitName, limit, deductions, falseKeys) {
  let falseElims = 0;
  let totalElims = 0;
  let minComplexity = null;
  const examples = [];
  const seen = new Set();
  for (const d of deductions) {
    const complexity = d.complexity || {};
    const chainSize = complexity.chainLength ?? complexity.chainCells ?? null;
    if (chainSize != null && (minComplexity == null || chainSize < minComplexity)) minComplexity = chainSize;
    for (const e of d.eliminations || []) {
      totalElims += 1;
      const key = `${e.cell}:${e.digit}`;
      if (!falseKeys.has(key)) continue;
      falseElims += 1;
      if (!seen.has(key) && examples.length < 12) {
        seen.add(key);
        const [r, c] = C.rowCol(e.cell);
        examples.push({ cell: e.cell, row: r + 1, col: c + 1, digit: e.digit, complexity: chainSize });
      }
    }
  }
  return { technique: id, [limitName]: limit, deductions: deductions.length, totalEliminations: totalElims, falseEliminations: falseElims, minComplexity, examples };
}

const started = performance.now();
const result = evaluateGoldenPuzzle(record.puzzle, GOLDEN_PROFILES.MAX_CAPABILITY);
const state = replayState(record.puzzle, result.trace);
const falseKeys = falseKeySet(state);
const rows = [];

for (const maxEdges of [9, 11, 13, 15]) rows.push(summarize('aic', 'maxEdges', maxEdges, H.findAIC(state, { maxEdges }), falseKeys));
for (const maxEdges of [7, 9, 11, 12]) rows.push(summarize('grouped-aic', 'maxEdges', maxEdges, H.findGroupedAic(state, { maxEdges }), falseKeys));
for (const maxEdges of [7, 9, 11, 13, 15]) rows.push(summarize('x-chain', 'maxEdges', maxEdges, H.findXChain(state, { maxEdges }), falseKeys));
for (const maxCells of [8, 10, 12]) rows.push(summarize('xy-chain', 'maxCells', maxCells, H.findXYChain(state, { maxCells }), falseKeys));

console.log(`CLASSIC_H7_CHAIN_DEPTH_PROBE ${JSON.stringify({
  id: record.id,
  baselineStatus: result.solveStatus,
  baselineSteps: result.totalSteps,
  exactFalseCandidateCount: falseKeys.size,
  probes: rows,
  elapsedMs: Math.round((performance.now() - started) * 10) / 10,
})}`);
