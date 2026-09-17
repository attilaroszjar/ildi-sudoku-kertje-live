'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../games/sudoku-generator.js');
require('../games/region-sum-segments.js');
require('../games/region-sum-runtime-hardening.js');

const generator = globalThis.SudokuGenerator;
const hardening = globalThis.RegionSumRuntimeHardening;

const baseSolution = [
  [5,3,4,6,7,8,9,1,2],
  [6,7,2,1,9,5,3,4,8],
  [1,9,8,3,4,2,5,6,7],
  [8,5,9,7,6,1,4,2,3],
  [4,2,6,8,5,3,7,9,1],
  [7,1,3,9,2,4,8,5,6],
  [9,6,1,5,3,7,2,8,4],
  [2,8,7,4,1,9,6,3,5],
  [3,4,5,2,8,6,1,7,9]
];

function badLegacyCloneVariant() {
  return {
    id: 'clone-regression',
    title: 'Clone Sudoku',
    kind: 'clone',
    data: { clones: [ [[3,5]], [[3,6]] ] },
    puzzle: baseSolution.map(row => row.slice()),
    solution: baseSolution.map(row => row.slice())
  };
}

function boxIndex(cell) {
  return Math.floor(cell[0] / 3) * 3 + Math.floor(cell[1] / 3);
}

function assertCloneContract(out) {
  assert.equal(out.generation.unique, true);
  assert.equal(out.generation.variantEssential, true);
  assert.equal(out.generation.verification, 'solver-verified');
  assert.equal(out.generation.generatorFamily, 'clone-fresh-fill-matched-shapes');
  assert.equal(generator.countVariantSolutions(out.puzzle, out, 2), 1);
  assert.notEqual(generator.countSolutions(out.puzzle, 2), 1);

  assert.ok(Array.isArray(out.data.clones));
  assert.equal(out.data.clones.length, 2);
  const [a, b] = out.data.clones;
  assert.equal(a.length, b.length);
  assert.ok(a.length >= 2, 'clone regions must be visible multi-cell shapes');

  const allCells = new Set();
  for (let i = 0; i < a.length; i += 1) {
    assert.equal(out.solution[a[i][0]][a[i][1]], out.solution[b[i][0]][b[i][1]]);
    assert.notEqual(a[i][0], b[i][0], 'paired equal digits cannot share a row');
    assert.notEqual(a[i][1], b[i][1], 'paired equal digits cannot share a column');
    assert.notEqual(boxIndex(a[i]), boxIndex(b[i]), 'paired equal digits cannot share a 3x3 box');
    for (const cell of [a[i], b[i]]) {
      const key = cell.join(',');
      assert.equal(allCells.has(key), false, 'clone shapes must not overlap');
      allCells.add(key);
    }
  }

  for (let r = 0; r < 9; r += 1) for (let c = 0; c < 9; c += 1) {
    if (out.puzzle[r][c]) assert.equal(out.puzzle[r][c], out.solution[r][c]);
  }
}

test('Clone generator repairs the reported contradictory legacy topology', () => {
  const out = generator.make(badLegacyCloneVariant(), 1074168735, 'expert');
  assertCloneContract(out);
});

test('Clone generation stays valid and essential across seeded difficulties', () => {
  const cases = [
    [1, 'gentle'], [7, 'focused'], [17, 'expert'],
    [123456789, 'gentle'], [987654321, 'focused'], [0xDEADBEEF, 'expert']
  ];
  for (const [seed, difficulty] of cases) {
    const variant = badLegacyCloneVariant();
    variant.id += '-' + seed + '-' + difficulty;
    assertCloneContract(generator.make(variant, seed, difficulty));
  }
});

test('Clone topology builder never returns the impossible adjacent equal-cell geometry', () => {
  const solution = hardening.makeClonePuzzle(badLegacyCloneVariant(), 1074168735, 'focused');
  assertCloneContract(solution);
});
