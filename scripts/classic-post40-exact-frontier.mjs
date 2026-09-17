import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { GOLDEN_PROFILES, evaluateGoldenPuzzle } from '../server/brutal-search/lib/golden-benchmark-audit.js';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');

const PROFILE = GOLDEN_PROFILES.MAX_CAPABILITY;
const MAX_FALSE_SAMPLES = 24;
const TARGET_ID = process.argv[2] || null;
const records = TARGET_ID ? corpus.filter((rec) => rec.id === TARGET_ID) : corpus;
if (TARGET_ID && records.length === 0) throw new Error(`unknown curated benchmark: ${TARGET_ID}`);

function replayState(puzzle, trace) {
  const state = new H.ClassicHumanState(puzzle);
  for (const step of trace || []) {
    if (!state.apply(step)) throw new Error('trace replay failed');
  }
  return state;
}

function unresolvedStats(state) {
  let unresolved = 0;
  let candidates = 0;
  let bivalue = 0;
  let trivalue = 0;
  let fourPlus = 0;
  for (let cell = 0; cell < 81; cell += 1) {
    const [r, c] = C.rowCol(cell);
    if (state.grid[r][c]) continue;
    unresolved += 1;
    const n = C.bitCount(state.masks[cell]);
    candidates += n;
    if (n === 2) bivalue += 1;
    else if (n === 3) trivalue += 1;
    else if (n >= 4) fourPlus += 1;
  }
  return { unresolved, candidates, bivalue, trivalue, fourPlus };
}

function falseCandidates(state) {
  const grid = state.cloneGrid();
  const out = [];
  for (let cell = 0; cell < 81; cell += 1) {
    const [r, c] = C.rowCol(cell);
    if (grid[r][c]) continue;
    for (const digit of C.digitsFromMask(state.masks[cell])) {
      const probe = grid.map((row) => row.slice());
      probe[r][c] = digit;
      if (C.countSolutions(probe, 1) === 0) out.push({ cell, row: r + 1, col: c + 1, digit });
    }
  }
  return out;
}

function digitPressure(state, falseList) {
  const byDigit = {};
  for (let digit = 1; digit <= 9; digit += 1) {
    const bit = C.bitForDigit(digit);
    const rows = new Set();
    const cols = new Set();
    const boxes = new Set();
    let candidateCount = 0;
    for (let cell = 0; cell < 81; cell += 1) {
      const [r, c] = C.rowCol(cell);
      if (state.grid[r][c] || !(state.masks[cell] & bit)) continue;
      candidateCount += 1;
      rows.add(r + 1);
      cols.add(c + 1);
      boxes.add(C.boxIndex(r, c) + 1);
    }
    const falseCount = falseList.filter((x) => x.digit === digit).length;
    if (falseCount) byDigit[digit] = { candidateCount, falseCount, rows: rows.size, cols: cols.size, boxes: boxes.size };
  }
  return byDigit;
}

for (const rec of records) {
  const t0 = performance.now();
  const result = evaluateGoldenPuzzle(rec.puzzle, PROFILE);
  const state = replayState(rec.puzzle, result.trace);
  const falseList = falseCandidates(state);
  const row = {
    id: rec.id,
    profile: PROFILE.id,
    status: result.solveStatus,
    steps: result.totalSteps,
    hardest: result.hardestTechnique,
    state: unresolvedStats(state),
    exactFalseCandidateCount: falseList.length,
    exactFalseCandidateSample: falseList.slice(0, MAX_FALSE_SAMPLES),
    digitPressure: digitPressure(state, falseList),
    elapsedMs: Math.round((performance.now() - t0) * 10) / 10,
  };
  console.log(`CLASSIC_POST40_EXACT_FRONTIER ${JSON.stringify(row)}`);
}
