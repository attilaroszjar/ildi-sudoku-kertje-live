'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
for(const f of ['games/sudoku-generator.js','games/line-generator-core.js','games/argyle-runtime-hardening.js','games/line-generator-argyle.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);

const v=ctx.SudokuBank.find(x=>x.id==='argyle');assert.ok(v);
const core=ctx.LineGeneratorCore,gen=ctx.LineGeneratorArgyle;
const levels=['gentle','focused','expert'];
function canonicalSolution(g){const map=new Map();let next=1;return g.map(row=>row.map(x=>{if(!map.has(x))map.set(x,next++);return map.get(x);})).flat().join('');}
function topology(p){return core.topologyFingerprint(p.data.lines,{directed:false});}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function p95(xs){const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*.95)-1)];}
function validateLattice(p){
  const lines=p.data.lines,slopes=new Set();
  assert.ok(lines.length>=6);
  for(const line of lines){
    assert.ok(line.length>=4&&line.length<=8);
    assert.equal(new Set(line.map(([r,c])=>p.solution[r][c])).size,line.length);
    const dr=line[1][0]-line[0][0],dc=line[1][1]-line[0][1];assert.equal(Math.abs(dr),1);assert.equal(Math.abs(dc),1);slopes.add(Math.sign(dc));
  }
  assert.equal(slopes.size,2);assert.ok(gen.intersectionCount(lines)>=Math.max(3,lines.length-2));
}

test('argyle audit B: 32x3 exact/essential/diverse with ordered measured difficulty and bounded runtime',()=>{
  const solutions=new Set(),tops=new Set(),scores={gentle:[],focused:[],expert:[]},times={gentle:[],focused:[],expert:[]};
  for(let i=0;i<32;i++){
    const seed=0x415200+i*31;
    for(const level of levels){
      const t0=performance.now(),p=gen.makeVariantPilot(ctx.SudokuGenerator,v,seed,level),ms=performance.now()-t0;
      times[level].push(ms);scores[level].push(p.generation.difficultyScore);
      assert.equal(ctx.SudokuGenerator.countVariantSolutions(p.puzzle,p,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(p.puzzle,2)>1);
      assert.equal(p.generation.unique,true);assert.equal(p.generation.variantEssential,true);validateLattice(p);
      if(level==='focused'){solutions.add(canonicalSolution(p.solution));tops.add(topology(p));}
    }
  }
  assert.equal(solutions.size,32);assert.equal(tops.size,32);
  const med=levels.map(level=>median(scores[level]));assert.ok(med[0]<med[1]&&med[1]<med[2],`difficulty ordering failed: ${med.join('<')}`);
  const runtimes=levels.map(level=>p95(times[level]));for(const ms of runtimes)assert.ok(ms<1000,`p95 runtime ${ms.toFixed(1)}ms exceeds 1000ms`);
  console.log(`ARGYLE_B PASS total=96 structuralSolution=${solutions.size}/32 structuralTopology=${tops.size}/32 difficulty=${med[0]}<${med[1]}<${med[2]} p95Ms=${runtimes.map(x=>x.toFixed(1)).join('/')}`);
});

test('argyle audit B confirms production wiring',()=>{
  assert.match(html,/line-generator-argyle-hardening\.js/);
});
