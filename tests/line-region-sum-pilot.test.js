'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const f of ['games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-generator.js','games/region-sum-segments.js','games/region-sum-runtime-hardening.js','games/line-generator-core.js','games/line-generator-region-sum.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);

const primitive=ctx.LineGeneratorRegionSum,variant=ctx.SudokuBank.find(v=>v.id==='region-sum');
assert.ok(primitive);assert.ok(variant);

function segmentSums(solution,line){return ctx.RegionSumSegments.sums(solution,line).map(x=>x.sum);}

test('Region Sum primitive builds deterministic equal-sum contiguous segments on a fresh solution',()=>{
  const fresh=ctx.LineGeneratorCore.freshStandardSolution(0x525301);
  const a=primitive.buildRegionSumPath(fresh.grid,0xA11CE),b=primitive.buildRegionSumPath(fresh.grid,0xA11CE);
  assert.equal(JSON.stringify(a.path),JSON.stringify(b.path));
  assert.ok(ctx.LineGeneratorCore.validateSimplePath(a.path,{minLength:4,maxLength:9}));
  assert.ok(primitive.topologyValid(fresh.grid,a.path));
  const sums=segmentSums(fresh.grid,a.path);assert.ok(sums.length>=2);assert.equal(new Set(sums).size,1);
  for(const seg of ctx.RegionSumSegments.split(a.path,9))assert.ok(seg.length>=2);
});

test('Region Sum pilot is deterministic, exact and variant-essential',()=>{
  const seed=0x5255AA;
  const a=primitive.makeVariantPilot(ctx.SudokuGenerator,variant,seed,'focused'),b=primitive.makeVariantPilot(ctx.SudokuGenerator,variant,seed,'focused');
  assert.equal(JSON.stringify(a.puzzle),JSON.stringify(b.puzzle));assert.equal(JSON.stringify(a.solution),JSON.stringify(b.solution));assert.equal(JSON.stringify(a.data),JSON.stringify(b.data));
  assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);assert.equal(a.generation.pilot,true);assert.match(a.generation.generatorFamily,/region-sum-fresh-fill-mrv$/);
  assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);
  assert.ok(a.data.lines.length>=2);for(const line of a.data.lines){assert.ok(primitive.topologyValid(a.solution,line));assert.equal(new Set(segmentSums(a.solution,line)).size,1);}
});

test('Region Sum pilot uses fresh solution families rather than canonical solution permutations only',()=>{
  const a=primitive.makeVariantPilot(ctx.SudokuGenerator,variant,0x525601,'gentle'),b=primitive.makeVariantPilot(ctx.SudokuGenerator,variant,0x525602,'gentle');
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(b.solution));assert.notEqual(a.generation.topologyFingerprint,b.generation.topologyFingerprint);
});

test('Region Sum generator is wired into the production runtime',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/line-generator-region-sum\.js/);
});
