'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const library=fs.readFileSync('games/sudoku-library.js','utf8');

function source(){
  const start=library.indexOf('function mountHitori(');
  const end=library.indexOf('function mountFutoshiki(',start);
  assert.ok(start>=0&&end>start,'mountHitori source must exist');
  return library.slice(start,end);
}

test('Hitori completion enters shared solved lifecycle',()=>{
  const src=source();
  assert.match(
    src,
    /if\(complete\(\)\)\{[^}]*api\.setStatus[^}]*api\.complete\(/,
    'completed Hitori must call shared completion lifecycle'
  );
});

test('Hitori Check visually marks incorrect current decisions',()=>{
  const src=source();
  assert.match(
    src,
    /classList\.(?:toggle|add)\(['"]checked-wrong['"]/,
    'Hitori Check must visually identify incorrect marked cells'
  );
});

test('Hitori editing clears stale Check feedback on the edited cell',()=>{
  const src=source();
  assert.match(
    src,
    /choose\([^)]*\)[\s\S]*?classList\.remove\(['"]checked-wrong['"]\)/,
    'editing a Hitori cell must clear its previous Check error marker'
  );
});
