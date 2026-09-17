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
const v=ctx.SudokuBank.find(x=>x.id==='arrow');assert.ok(v);const gen=ctx.LineGeneratorArrow;
function canonicalSolution(g){const map=new Map();let next=1;return g.map(row=>row.map(x=>{if(!map.has(x))map.set(x,next++);return map.get(x);})).flat().join('');}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function p95(xs){const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*.95)-1)];}
function validateArrow(p){for(const ar of p.data.arrows){assert.ok(ar.path.length>=2&&ar.path.length<=4);assert.ok(gen.arrowValid(p.solution,ar));}}

test('arrow audit B: 32x3 exact/essential/diverse with ordered measured difficulty and bounded runtime',()=>{
  const diffs=['gentle','focused','expert'],scores={},times={},solutionSet=new Set(),topologySet=new Set();
  for(const d of diffs){scores[d]=[];times[d]=[];for(let i=0;i<32;i++){
    const seed=0x41526000+i*37,t0=performance.now();
    const p=gen.makeVariantPilot(ctx.SudokuGenerator,v,seed,d);times[d].push(performance.now()-t0);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(p.puzzle,p,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(p.puzzle,2)>1);
    assert.equal(p.generation.unique,true);assert.equal(p.generation.variantEssential,true);validateArrow(p);
    scores[d].push(p.generation.difficultyScore);if(d==='focused'){solutionSet.add(canonicalSolution(p.solution));topologySet.add(p.generation.topologyFingerprint);}
  }}
  assert.equal(solutionSet.size,32);assert.equal(topologySet.size,32);
  const mg=median(scores.gentle),mf=median(scores.focused),me=median(scores.expert);assert.ok(mg<mf&&mf<me,`${mg}<${mf}<${me}`);
  const tg=p95(times.gentle),tf=p95(times.focused),te=p95(times.expert);assert.ok(tg<1000&&tf<1000&&te<1000,`${tg}/${tf}/${te}`);
  console.log(`ARROW_B PASS total=96 structuralSolution=${solutionSet.size}/32 structuralTopology=${topologySet.size}/32 difficulty=${mg}<${mf}<${me} p95Ms=${tg.toFixed(1)}/${tf.toFixed(1)}/${te.toFixed(1)}`);
});

test('arrow audit B confirms Arrow production wiring',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/line-generator-arrow-hardening\.js/);
});
