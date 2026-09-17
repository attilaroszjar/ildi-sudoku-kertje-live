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
vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/line-generator-core.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/line-generator-sliding-triple.js'),'utf8'),ctx);

const primitive=ctx.LineGeneratorSlidingTriple;
assert.ok(primitive);

function variant(id){const v=ctx.SudokuBank.find(x=>x.id===id);assert.ok(v,`canonical ${id} must exist`);return v;}
function classOf(id){return id==='entropic'?(v=>Math.floor((v-1)/3)):(v=>v%3);}
function valid(solution,line,id){const cls=classOf(id);for(let i=0;i<=line.length-3;i++)if(new Set(line.slice(i,i+3).map(p=>cls(solution[p[0]][p[1]]))).size!==3)return false;return true;}

for(const id of ['entropic','modular']){
  test(`${id} sliding-triple primitive builds deterministic valid fresh topology`,()=>{
    const v=variant(id),cfg=primitive.configFor(id);
    const fresh=ctx.LineGeneratorCore.freshStandardSolution(0x510000+(id==='entropic'?1:2));
    const a=primitive.buildSlidingTriplePath(fresh.grid,0xA11CE,{classOf:cfg.classOf,seedXor:cfg.seedXor,minLength:4,maxLength:7,maxNodes:6000});
    const b=primitive.buildSlidingTriplePath(fresh.grid,0xA11CE,{classOf:cfg.classOf,seedXor:cfg.seedXor,minLength:4,maxLength:7,maxNodes:6000});
    assert.deepEqual(a.path,b.path);assert.ok(a.path.length>=4&&a.path.length<=7);assert.ok(valid(fresh.grid,a.path,id));
    assert.ok(ctx.LineGeneratorCore.validateSimplePath(a.path,{minLength:4,maxLength:7}));assert.ok(v);
  });

  test(`${id} pilot is deterministic, exact and variant-essential`,()=>{
    const v=variant(id),a=primitive.makeVariantPilot(ctx.SudokuGenerator,v,0xBEEF+(id==='entropic'?1:2),'focused'),b=primitive.makeVariantPilot(ctx.SudokuGenerator,v,0xBEEF+(id==='entropic'?1:2),'focused');
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);assert.equal(a.generation.pilot,true);
    assert.equal(a.generation.mode,'seeded-variant-essential');assert.match(a.generation.generatorFamily,/sliding-triple-fresh-fill-mrv$/);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);
    assert.ok(a.data.lines.length>=2);for(const line of a.data.lines)assert.ok(valid(a.solution,line,id));
  });
}

test('sliding-triple pilot remains intentionally unwired from production make()',()=>{
  const src=fs.readFileSync(path.join(root,'games/line-generator-hardening.js'),'utf8');
  assert.doesNotMatch(src,/LineGeneratorSlidingTriple/);assert.doesNotMatch(src,/makeVariantPilot\(generator,variant,seed/);
});
