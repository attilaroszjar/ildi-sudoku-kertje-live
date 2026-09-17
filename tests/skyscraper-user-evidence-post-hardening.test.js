const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const library=fs.readFileSync('games/sudoku-library.js','utf8');

test('Skyscraper family uses shared editable Sudoku renderer',()=>{
  assert.match(
    library,
    /var perimeterKinds=\[[^\]]*'skyscraper'[^\]]*\]/,
    'Skyscraper family must remain registered with shared perimeter Sudoku renderer'
  );

  assert.match(
    library,
    /if\(!v\.data\.clues\|\|!perimeterKinds\.some\(function\(k\)\{return kindIs\(v,k\);\}\)\)return false;/,
    'Skyscraper perimeter clues must be mounted through the shared Sudoku renderer'
  );
});

test('Skyscraper Check marks incorrect entered cells',()=>{
  assert.match(
    library,
    /classList\.add\('checked-wrong'\)/,
    'Check must visually mark an incorrect entered value'
  );
});

test('Skyscraper editing clears stale Check marker',()=>{
  assert.match(
    library,
    /function changed\(\)\{[^}]*classList\.remove\('checked-wrong'\)/,
    'editing a checked-wrong Skyscraper cell must clear its stale marker'
  );
});

test('Skyscraper completion uses shared solved lifecycle',()=>{
  assert.match(
    library,
    /if\(solved\(\)\)\{cells\.forEach\(function\(x\)\{x\.disabled=true;\}\);api\.solved\(\);\}/,
    'completed Skyscraper boards must enter shared solved lifecycle'
  );
});
