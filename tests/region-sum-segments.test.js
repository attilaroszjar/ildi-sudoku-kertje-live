'use strict';

const test = require('node:test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

function loadRegionSumSegments() {
  const ctx = { console };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'games/region-sum-segments.js'), 'utf8'),
    ctx
  );
  return ctx.RegionSumSegments;
}

function plainSegments(segments) {
  return segments.map(segment =>
    Array.from(segment, cell => Array.from(cell))
  );
}

test('Region Sum uses the correct box dimensions', () => {
  const rs = loadRegionSumSegments();

  assert.deepEqual(Array.from(rs.boxDims(9)), [3, 3]);
  assert.deepEqual(Array.from(rs.boxDims(6)), [2, 3]);
  assert.deepEqual(Array.from(rs.boxDims(4)), [2, 2]);
});

test('Region Sum splits a line into contiguous region segments', () => {
  const rs = loadRegionSumSegments();

  const line = [
    [0, 0], [0, 1],
    [0, 3], [1, 3],
    [1, 1], [1, 0]
  ];

  assert.deepEqual(
    plainSegments(rs.split(line, 9)),
    [
      [[0, 0], [0, 1]],
      [[0, 3], [1, 3]],
      [[1, 1], [1, 0]]
    ]
  );
});

test('Region Sum does not merge non-contiguous re-entry segments', () => {
  const rs = loadRegionSumSegments();

  const line = [
    [0, 0], [0, 1],
    [0, 3], [1, 3],
    [1, 1], [1, 0]
  ];

  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));

  grid[0][0] = 2;
  grid[0][1] = 3;

  grid[0][3] = 1;
  grid[1][3] = 4;

  grid[1][1] = 4;
  grid[1][0] = 1;

  assert.equal(rs.valid(grid, line), true);

  grid[1][0] = 2;

  assert.equal(rs.valid(grid, line), false);
});

test('Region Sum 6x6 segmentation uses 2x3 boxes', () => {
  const rs = loadRegionSumSegments();

  const line = [
    [0, 0], [0, 2],
    [0, 3], [1, 3],
    [2, 3]
  ];

  assert.deepEqual(
    plainSegments(rs.split(line, 6)),
    [
      [[0, 0], [0, 2]],
      [[0, 3], [1, 3]],
      [[2, 3]]
    ]
  );
});
