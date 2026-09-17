import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');

const TARGET_ID = process.argv[2] || null;
const records = TARGET_ID ? corpus.filter((record) => record.id === TARGET_ID) : corpus;
if (TARGET_ID && records.length === 0) throw new Error(`unknown benchmark id: ${TARGET_ID}`);

const MAX_FALSE_PROBES = 72;
const MAX_FISH_SIZE = 4;
const CHEAP_OPTIONS = Object.freeze({ allowUniqueness: true, allowServerPreferred: false, allowServerOnly: false });
const MAX_PROFILE = Object.freeze({
  allowUniqueness: true,
  allowServerPreferred: true,
  allowServerOnly: true,
  finderOptions: Object.freeze({
    'forcing-chain': Object.freeze({ maxSteps: 32, candidateBudget: 24 }),
    'forcing-net': Object.freeze({ maxSteps: 32, seedBudget: 12 }),
    'digit-forcing-chain': Object.freeze({ maxSteps: 32 }),
    'digit-forcing-net': Object.freeze({ maxSteps: 32 }),
  }),
});

function buildHouses() {
  const out = [];
  for (let r = 0; r < 9; r += 1) out.push({ id: `r${r + 1}`, type: 'row', cells: Array.from({ length: 9 }, (_, c) => C.cellIndex(r, c)) });
  for (let c = 0; c < 9; c += 1) out.push({ id: `c${c + 1}`, type: 'column', cells: Array.from({ length: 9 }, (_, r) => C.cellIndex(r, c)) });
  for (let b = 0; b < 9; b += 1) {
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    const cells = [];
    for (let r = br; r < br + 3; r += 1) for (let c = bc; c < bc + 3; c += 1) cells.push(C.cellIndex(r, c));
    out.push({ id: `b${b + 1}`, type: 'box', cells });
  }
  return out;
}
const HOUSES = buildHouses();

function replayToStall(record) {
  const state = new H.ClassicHumanState(record.puzzle);
  const steps = [];
  while (state.valid && !state.isSolved() && steps.length < 10000) {
    const d = H.findNext(state, MAX_PROFILE);
    if (!d || !state.apply(d)) break;
    steps.push(d);
  }
  return { state, steps };
}
function replayTrace(record, steps) {
  const state = new H.ClassicHumanState(record.puzzle);
  for (const step of steps) if (!state.apply(step)) throw new Error(`${record.id}: trace replay failed`);
  return state;
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
      if (C.countSolutions(probe, 1) === 0) out.push({ cell, digit, row: r + 1, col: c + 1 });
    }
  }
  return out;
}
function balancedSample(items, limit) {
  if (items.length <= limit) return items.slice();
  const buckets = Array.from({ length: 9 }, () => []);
  for (const item of items) buckets[item.digit - 1].push(item);
  const out = [];
  for (let cursor = 0; out.length < limit; cursor += 1) {
    let added = false;
    for (let d = 0; d < 9 && out.length < limit; d += 1) {
      if (cursor < buckets[d].length) { out.push(buckets[d][cursor]); added = true; }
    }
    if (!added) break;
  }
  return out;
}
function candidateSet(state, house, digit) {
  const bit = C.bitForDigit(digit);
  return new Set(house.cells.filter((cell) => {
    const [r, c] = C.rowCol(cell);
    return !state.grid[r][c] && (state.masks[cell] & bit);
  }));
}
function disjoint(a, b) { for (const x of a) if (b.has(x)) return false; return true; }
function unionInto(dst, src) { for (const x of src) dst.add(x); }
function classify(base, cover) {
  const bt = new Set(base.map((h) => h.type));
  const ct = new Set(cover.map((h) => h.type));
  const hasBox = bt.has('box') || ct.has('box');
  if (!hasBox) return 'basic';
  const baseMixedLine = bt.has('row') && bt.has('column');
  const coverMixedLine = ct.has('row') && ct.has('column');
  const boxesBothSides = bt.has('box') && ct.has('box');
  return (baseMixedLine || coverMixedLine || boxesBothSides) ? 'mutant' : 'franken';
}

function exactCoverPartitions(union, houseData, size, excludedIds) {
  const results = [];
  const unionArr = [...union].sort((a, b) => a - b);
  function rec(chosen, covered, startMin) {
    if (chosen.length === size) {
      if (covered.size === union.size) results.push(chosen.slice());
      return;
    }
    let pivot = null;
    for (const cell of unionArr) if (!covered.has(cell)) { pivot = cell; break; }
    if (pivot == null) return;
    for (let i = startMin; i < houseData.length; i += 1) {
      const item = houseData[i];
      if (excludedIds.has(item.house.id) || !item.inUnion.has(pivot) || item.inUnion.size === 0) continue;
      if (!disjoint(covered, item.inUnion)) continue;
      const next = new Set(covered); unionInto(next, item.inUnion);
      rec([...chosen, item], next, i + 1);
    }
  }
  rec([], new Set(), 0);
  return results;
}

function generalizedFishEliminations(state, digit) {
  const bit = C.bitForDigit(digit);
  const houseSets = HOUSES.map((house) => ({ house, candidates: candidateSet(state, house, digit) }));
  const eligibleBases = houseSets.filter((x) => x.candidates.size >= 2);
  const byKey = new Map();

  function visitBases(size, start, chosen, usedCells) {
    if (chosen.length === size) {
      const union = new Set(); for (const x of chosen) unionInto(union, x.candidates);
      const excludedIds = new Set(chosen.map((x) => x.house.id));
      const coverData = houseSets.map((x) => ({
        house: x.house,
        candidates: x.candidates,
        inUnion: new Set([...x.candidates].filter((cell) => union.has(cell))),
      })).filter((x) => x.inUnion.size > 0);
      for (const coverItems of exactCoverPartitions(union, coverData, size, excludedIds)) {
        const coverHouses = coverItems.map((x) => x.house);
        const baseHouses = chosen.map((x) => x.house);
        const family = classify(baseHouses, coverHouses);
        if (family === 'basic') continue;
        const baseCells = union;
        for (const h of coverHouses) {
          for (const cell of h.cells) {
            if (baseCells.has(cell)) continue;
            const [r, c] = C.rowCol(cell);
            if (state.grid[r][c] || !(state.masks[cell] & bit)) continue;
            const key = `${cell}:${digit}`;
            if (!byKey.has(key)) byKey.set(key, { family, size, digit, base: baseHouses.map((x) => x.id), cover: coverHouses.map((x) => x.id) });
          }
        }
      }
      return;
    }
    for (let i = start; i < eligibleBases.length; i += 1) {
      const item = eligibleBases[i];
      if (!disjoint(usedCells, item.candidates)) continue;
      const next = new Set(usedCells); unionInto(next, item.candidates);
      visitBases(size, i + 1, [...chosen, item], next);
    }
  }
  for (let size = 2; size <= MAX_FISH_SIZE; size += 1) visitBases(size, 0, [], new Set());
  return byKey;
}

for (const record of records) {
  const started = performance.now();
  const baseline = replayToStall(record);
  const falses = falseCandidates(baseline.state);
  const sample = balancedSample(falses, MAX_FALSE_PROBES);
  const unlocks = [];
  for (const item of sample) {
    const state = replayTrace(record, baseline.steps);
    if (!state.eliminate(item.cell, item.digit)) continue;
    const next = H.findNext(state, CHEAP_OPTIONS);
    if (next) unlocks.push({ item, unlockTechnique: next.techniqueId });
  }

  const fishMaps = new Map();
  for (const digit of new Set(unlocks.map((x) => x.item.digit))) fishMaps.set(digit, generalizedFishEliminations(baseline.state, digit));
  const explained = [];
  const familyCounts = {};
  for (const unlock of unlocks) {
    const witness = fishMaps.get(unlock.item.digit)?.get(`${unlock.item.cell}:${unlock.item.digit}`);
    if (!witness) continue;
    explained.push({ removed: unlock.item, unlockTechnique: unlock.unlockTechnique, witness });
    familyCounts[witness.family] = (familyCounts[witness.family] || 0) + 1;
  }
  explained.sort((a, b) => a.witness.family.localeCompare(b.witness.family) || a.witness.size - b.witness.size || a.removed.cell - b.removed.cell || a.removed.digit - b.removed.digit);

  console.log(`CLASSIC_POST40_COMPLEX_FISH_PROBE ${JSON.stringify({
    id: record.id,
    unlockCount: unlocks.length,
    strictComplexFishExplained: explained.length,
    explainedRate: unlocks.length ? Math.round((explained.length / unlocks.length) * 10000) / 10000 : 0,
    familyCounts,
    witnesses: explained.slice(0, 16),
    maxFishSize: MAX_FISH_SIZE,
    conservativeRule: 'pairwise-disjoint-base-occurrences + exact-disjoint-cover partition',
    elapsedMs: Math.round((performance.now() - started) * 10) / 10,
  })}`);
}
