'use strict';
const test=require('node:test'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx);
const variant=kind=>ctx.SudokuBank.find(x=>x.kind===kind),diffs=['gentle','focused','expert'],seeds=[1,2,3,4,5,6,7,8,9,10];
function median(a){a=a.slice().sort((x,y)=>x-y);return (a[4]+a[5])/2;}
test('Iteration 47 Bridges difficulty uses disjoint solver-search bands',()=>{
  const bands={};for(const d of diffs){bands[d]=seeds.map(seed=>ctx.SudokuGenerator.make(variant('bridges'),seed,d).generation.difficultyScore);}
  assert.ok(Math.max(...bands.gentle)<Math.min(...bands.focused),JSON.stringify(bands));
  assert.ok(Math.max(...bands.focused)<Math.min(...bands.expert),JSON.stringify(bands));
  assert.ok(new Set(seeds.map(seed=>JSON.stringify(ctx.SudokuGenerator.make(variant('bridges'),seed,'expert').solution))).size>=4);
});
test('Iteration 47 Hitori exposes measured search depth and separates median difficulty',()=>{
  const med=diffs.map(d=>median(seeds.map(seed=>ctx.SudokuGenerator.make(variant('hitori'),seed,d).generation.difficultyScore)));
  assert.ok(med[0]<med[1]&&med[1]<med[2],med.join(' < '));
});
test('Iteration 47 Nurikabe measures starter-sea information in effective search depth',()=>{
  for(const seed of [1,2,3,4,5,6,7,8]){
    const scores=diffs.map(d=>ctx.SudokuGenerator.make(variant('nurikabe'),seed,d).generation.difficultyScore);
    assert.ok(scores[0]<=scores[1]&&scores[1]<=scores[2],seed+': '+scores.join(' <= '));
  }
});
