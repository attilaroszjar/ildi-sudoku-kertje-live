'use strict';
const test=require('node:test'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx);
const variant=id=>ctx.SudokuBank.find(x=>x.id===id);
test('Iteration 46 restores monotonic Skyscraper clue depth while preserving uniqueness and variant-essentiality',()=>{
  for(const id of ['classic-skyscrapers','skyscraper','skyscraper-sums','skyscraper-mixed','diagonal-skyscrapers','toroidal-skyscrapers']){
    const counts=[]; for(const d of ['gentle','focused','expert']){const g=ctx.SudokuGenerator.make(variant(id),1,d);counts.push(g.generation.clues);assert.equal(g.generation.unique,true,id+' '+d);assert.equal(g.generation.variantEssential,true,id+' '+d);}
    assert.ok(counts[0]>counts[1]&&counts[1]>counts[2],id+' '+counts.join(' > '));
  }
});
test('Iteration 46 large-grid keyboard and touch affordances are wired',()=>{
  const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8'),css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
  assert.match(lib,/function valueForKey\(/);assert.match(lib,/large-input-tools/);assert.match(css,/touch-action:manipulation/);assert.match(css,/repeat\(4,minmax\(44px,1fr\)\)/);
});
