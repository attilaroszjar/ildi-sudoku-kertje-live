'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
for(const f of ['games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-directed.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);

const primitive=ctx.LineGeneratorDirected;
assert.ok(primitive);
function variant(id){const v=ctx.SudokuBank.find(x=>x.id===id);assert.ok(v,`canonical ${id} must exist`);return v;}
function linesOf(v,id){return id==='thermo'?v.data.thermos:v.data.lines;}
function valid(v,id){const cfg=primitive.configFor(id);for(const line of linesOf(v,id))assert.ok(primitive.lineValid(v.solution,line,cfg.transition),`${id} directed line must satisfy exact transition`);}

for(const id of ['thermo','slow-thermo']){
  test(`${id} canonical semantics satisfy directed predicate`,()=>{valid(variant(id),id);});

  test(`${id} directed primitive builds deterministic valid fresh topology`,()=>{
    const cfg=primitive.configFor(id),fresh=ctx.LineGeneratorCore.freshStandardSolution(0xD10000+(id==='thermo'?1:2));
    const options={transition:cfg.transition,seedXor:cfg.seedXor,minLength:cfg.minLength,maxLength:cfg.maxLength,maxNodes:6000};
    const a=primitive.buildDirectedPath(fresh.grid,0xA11CE,options),b=primitive.buildDirectedPath(fresh.grid,0xA11CE,options);
    assert.deepEqual(a.path,b.path);assert.ok(primitive.lineValid(fresh.grid,a.path,cfg.transition));
  });

  test(`${id} pilot is deterministic, exact and variant-essential`,()=>{
    const v=variant(id),seed=0xD1CE+(id==='thermo'?1:2),a=primitive.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused'),b=primitive.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused');
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);assert.equal(a.generation.pilot,true);assert.equal(a.generation.mode,'seeded-variant-essential');
    assert.match(a.generation.generatorFamily,/directed-fresh-fill-mrv$/);assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);valid(a,id);
  });
}

test('Slow Thermo partial solver semantics enforce nondecreasing rise of at most one per step',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
  assert.match(src,/function slowThermoValid/);assert.match(src,/bv<av\|\|bv-av>b-a/);assert.match(src,/variant\.kind==='slowthermo'/);
});

test('directed primitive is registered in runtime after production promotion',()=>{
  assert.match(html,/games\/line-generator-directed\.js/);
  assert.match(html,/games\/line-generator-directed-hardening\.js/);
  assert.ok(html.indexOf('games/line-generator-directed.js')<html.indexOf('games/line-generator-directed-hardening.js'));
});
