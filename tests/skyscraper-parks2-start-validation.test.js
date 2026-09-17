'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'games', 'sudoku-library.js'), 'utf8');
const start = source.indexOf('  function classicConflict(');
const end = source.indexOf('  function doubleSkyscraperConflict(', start);
assert.ok(start >= 0 && end > start, 'classicConflict source block must be discoverable');

function kindIs(v, kind) {
  return v.kind === kind || (Array.isArray(v.kinds) && v.kinds.indexOf(kind) !== -1);
}

const classicConflict = new Function('kindIs', `${source.slice(start, end)}\nreturn classicConflict;`)(kindIs);

function blank(n = 8) {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

const parks2 = {
  kind: 'skyscraperparks2',
  data: {
    parkValue: 7,
    parksPerLine: 2,
    latinOnly: true
  }
};

test('Parks2 allows exactly two park markers in one row at puzzle start', () => {
  const grid = blank();
  grid[2][1] = 7;
  grid[2][6] = 7;

  assert.equal(classicConflict(grid, 2, 1, parks2), false);
  assert.equal(classicConflict(grid, 2, 6, parks2), false);
});

test('Parks2 allows exactly two park markers in one column at puzzle start', () => {
  const grid = blank();
  grid[1][4] = 7;
  grid[6][4] = 7;

  assert.equal(classicConflict(grid, 1, 4, parks2), false);
  assert.equal(classicConflict(grid, 6, 4, parks2), false);
});

test('Parks2 rejects a third park marker in a row or column', () => {
  const rowGrid = blank();
  rowGrid[3][0] = 7;
  rowGrid[3][3] = 7;
  rowGrid[3][7] = 7;
  assert.equal(classicConflict(rowGrid, 3, 7, parks2), true);

  const colGrid = blank();
  colGrid[0][5] = 7;
  colGrid[4][5] = 7;
  colGrid[7][5] = 7;
  assert.equal(classicConflict(colGrid, 7, 5, parks2), true);
});

test('Parks2 still rejects duplicate non-park building values', () => {
  const grid = blank();
  grid[5][1] = 4;
  grid[5][6] = 4;

  assert.equal(classicConflict(grid, 5, 6, parks2), true);
});
