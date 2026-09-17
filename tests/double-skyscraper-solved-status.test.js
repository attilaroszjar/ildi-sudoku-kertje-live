'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');

test('Double Skyscraper uses the generic Sudoku completion path',()=>{
  assert.ok(
    lib.includes("'doubleskyscrapers'"),
    'Double Skyscraper kind must remain registered in the Sudoku runtime'
  );
  assert.ok(
    lib.includes("if(v.kind==='doubleskyscrapers'&&doubleSkyscraperConflict(v,grid,r,c))return true;"),
    'Double Skyscraper must be validated by its variant conflict rule'
  );
  assert.ok(
    lib.includes("'doubleskyscrapers','sandwich'"),
    'Double Skyscraper must remain on the generic perimeter-clue Sudoku board path'
  );
});

test('generic Sudoku completion promotes an exactly solved grid',()=>{
  assert.ok(
    lib.includes("function solved(){for(var r=0;r<n;r+=1)for(var c=0;c<n;c+=1)if(grid[r][c]!==v.solution[r][c])return false;return true;}"),
    'generic board must compare every entered value with the generated solution'
  );
  assert.ok(
    lib.includes("if(solved()){cells.forEach(function(x){x.disabled=true;});api.solved();}"),
    'the final correct entry must invoke the shared solved callback and lock the cells'
  );
});

test('shared solved callback changes the visible game status to solved',()=>{
  assert.ok(
    app.includes("function finishSolve(){if(state.completed)return;state.completed=true;refs['game-status'].textContent=I.t('solved');"),
    'finishSolve must atomically set completed and the visible solved label'
  );
  assert.ok(
    app.includes('complete:finishSolve,solved:finishSolve'),
    'both completion APIs must resolve through the same finishSolve transition'
  );
  assert.ok(
    app.includes("refs['game-status'].textContent=I.t('ready')"),
    'newly mounted games must reset the status independently of solve completion'
  );
});
