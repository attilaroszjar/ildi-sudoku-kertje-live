const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const src = fs.readFileSync('games/sudoku-library.js', 'utf8');

test('object-shaped Japanese puzzles bypass Sudoku grid rotation before mounting', () => {
  const match = src.match(
    /var v=\(([^;]+)\)\?generated:transformedVariant\(generated,turns\)/
  );

  assert.ok(match, 'renderVariant passthrough expression must exist');

  const passthrough = match[1];
  const kinds = [
    'shakashaka',
    'rippleeffect',
    'lits',
    'battleships',
    'heyawake'
  ];

  for (const kind of kinds) {
    assert.match(
      passthrough,
      new RegExp(`current\\.kind==='${kind}'`),
      `${kind} must bypass transformedVariant`
    );
  }
});

test('affected Japanese kinds still route to their dedicated renderers', () => {
  assert.match(src, /if\(v\.kind==='lits'\|\|v\.kind==='battleships'\|\|v\.kind==='heyawake'\)return mountIteration52Puzzle/);
  assert.match(src, /if\(v\.kind==='shakashaka'\)return mountShakashaka/);
  assert.match(src, /if\(v\.kind==='rippleeffect'\)return mountIteration51Puzzle/);
});
