'use strict';
const test=require('node:test'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx);
const variant=kind=>ctx.SudokuBank.find(x=>x.kind===kind),seeds=[1,2,3,4,5,6,7,8,9,10];
function median(a){a=a.slice().sort((x,y)=>x-y);return (a[4]+a[5])/2;}
test('Iteration 48 Futoshiki exposes solver-search depth with increasing population difficulty',()=>{
  const med=['gentle','focused','expert'].map(d=>median(seeds.map(seed=>ctx.SudokuGenerator.make(variant('futoshiki'),seed,d).generation.difficultyScore)));
  assert.ok(med[0]<med[1]&&med[1]<med[2],med.join(' < '));
  for(const d of ['gentle','focused','expert'])for(const seed of seeds){const g=ctx.SudokuGenerator.make(variant('futoshiki'),seed,d);assert.equal(g.generation.unique,true);assert.ok(Number.isFinite(g.generation.difficultyScore)&&g.generation.difficultyScore>0);}
});
test('Iteration 48 dense loop-game edge targets are mobile touch sized',()=>{
  const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
  assert.match(css,/\.slither-edge\.horizontal\{height:44px\}/);assert.match(css,/\.slither-edge\.vertical\{width:44px\}/);
  assert.match(css,/\.masyu-edge\.horizontal\{height:44px\}/);assert.match(css,/\.masyu-edge\.vertical\{width:44px\}/);
});
