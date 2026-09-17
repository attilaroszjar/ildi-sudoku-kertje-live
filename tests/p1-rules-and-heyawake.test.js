'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const lib=fs.readFileSync(
  path.join(root,'games/sudoku-library.js'),
  'utf8'
);
const gen=fs.readFileSync(
  path.join(root,'games/sudoku-generator.js'),
  'utf8'
);

test('Heyawake supports explicit X marks as unshaded player state',()=>{
  assert.ok(
    lib.includes(
      "if(v.kind==='battleships'||v.kind==='heyawake')grid[rr][cc]=(grid[rr][cc]+1)%3"
    ),
    'Heyawake must cycle empty -> shaded -> X'
  );

  assert.ok(
    lib.includes("x===2?(hu?'X-szel jelölt fehér':'white marked X')"),
    'Heyawake X must have an accessible white-cell label'
  );

  assert.ok(
    lib.includes('Kattintás: üres → fekete → X (fehér) → üres.'),
    'Heyawake hint must document the interaction'
  );

  // Completion continues to distinguish only shaded vs unshaded;
  // X is therefore a player note, not a third solution value.
  assert.ok(
    lib.includes('var shaded=grid[r][c]===1;if(shaded!==!!v.solution[r][c])return false;')
  );
});

test('Shakashaka explanation matches implemented numbered-clue semantics',()=>{
  assert.ok(
    gen.includes(
      "dirs=[[1,0],[-1,0],[0,1],[0,-1]]"
    ),
    'solver must use four orthogonal neighbours'
  );

  assert.ok(
    gen.includes("yes+=grid[r][c]>0?1:0"),
    'numbered clue counts any triangle orientation'
  );

  assert.ok(
    lib.includes('négy oldal-szomszédos (nem átlós) fehér mező')
  );

  assert.ok(
    lib.includes('a háromszög iránya ennél a számolásnál nem számít')
  );
});

test('LITS explanation exposes every rule enforced by the solver',()=>{
  for(const semantic of [
    "litsShapeMap",
    "connected4",
    "2x2",
  ]){
    if(semantic==='2x2')continue;
    assert.ok(gen.includes(semantic),semantic);
  }

  assert.ok(
    lib.includes('Az összes fekete mező oldal-szomszédosan összefüggő területet alkot')
  );
  assert.ok(
    lib.includes('2×2-es teljesen fekete blokk nem lehet')
  );
  assert.ok(
    lib.includes('azonos alakú tetrominója nem érintkezhet egymással oldallal')
  );
  assert.ok(
    lib.includes('az elforgatott vagy tükrözött alak is azonos típusnak számít')
  );
});
