'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

function loadContext(){
  const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
  for(const f of ['games/sudoku-generator.js','games/line-generator-core.js','games/region-sum-segments.js','games/region-sum-runtime-hardening.js','games/line-generator-region-sum.js','games/line-generator-region-sum-hardening.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
  return ctx;
}

test('production make() routes Region Sum through fresh segment-aware generator',()=>{
  const ctx=loadContext(),v=ctx.SudokuBank.find(x=>x.id==='region-sum');assert.ok(v);
  const p=ctx.SudokuGenerator.make(v,0x525350,'focused');
  assert.equal(p.generation.pilot,false);assert.equal(p.generation.generatorFamily,'line-region-sum-fresh-fill-mrv');
  assert.equal(p.generation.variantEssential,true);assert.equal(ctx.SudokuGenerator.countVariantSolutions(p.puzzle,p,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(p.puzzle,2)>1);
  for(const line of p.data.lines){const segs=ctx.RegionSumSegments.sums(p.solution,line);assert.ok(segs.length>=2);assert.ok(segs.every(s=>s.cells.length>=2&&s.complete));assert.equal(new Set(segs.map(s=>s.sum)).size,1);}
});

test('runtime load order registers Region Sum generator before production adapter',()=>{
  const primitive='games/line-generator-region-sum.js',adapter='games/line-generator-region-sum-hardening.js';
  assert.ok(html.includes(primitive),'index.html must load Region Sum generator');
  assert.ok(html.includes(adapter),'index.html must load Region Sum production adapter');
  assert.ok(html.indexOf(primitive)<html.indexOf(adapter),'Region Sum generator must load before production adapter');
});
