'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const f of ['games/sudoku-bank.js','games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-arrow.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const v=ctx.SudokuBank.find(x=>x.id==='arrow');assert.ok(v);
const gen=ctx.LineGeneratorArrow;
function canonicalSolution(g){const map=new Map();let next=1;return g.map(row=>row.map(x=>{if(!map.has(x))map.set(x,next++);return map.get(x);})).flat().join('');}
function validArrowSet(p){assert.ok(p.data.arrows.length>=3);for(const a of p.data.arrows){assert.ok(a.path.length>=2&&a.path.length<=4);assert.ok(gen.arrowValid(p.solution,a));}}

test('arrow audit A: 8/8 exact, essential, replayable and structurally diverse',()=>{
  const solutions=new Set(),tops=new Set(),times=[];
  for(let i=0;i<8;i++){
    const seed=0x41525280+i*29,t0=performance.now();
    const a=gen.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused'),ms=performance.now()-t0;
    const b=gen.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused');
    times.push(ms);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);
    validArrowSet(a);
    solutions.add(canonicalSolution(a.solution));tops.add(a.generation.topologyFingerprint);
  }
  assert.equal(solutions.size,8);assert.equal(tops.size,8);
  times.sort((a,b)=>a-b);const p95=times[Math.min(times.length-1,Math.ceil(times.length*.95)-1)];
  console.log(`ARROW_A PASS seeds=8 structuralSolution=${solutions.size}/8 structuralTopology=${tops.size}/8 p95Ms=${p95.toFixed(1)}`);
});

test('arrow audit A confirms Arrow production wiring',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/line-generator-arrow-hardening\.js/);
});
