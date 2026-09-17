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
function canonicalSolution(g){const map=new Map();let next=1;return g.map(row=>row.map(x=>{if(!map.has(x))map.set(x,next++);return map.get(x);})).flat().join('');}
function topology(p){return core.topologyFingerprint(p.data.lines,{directed:false});}
function slope(line){return line.length<2?0:Math.sign(line[1][1]-line[0][1]);}
function validLattice(p){
  let plus=0,minus=0;
  for(const line of p.data.lines){assert.ok(line.length>=4&&line.length<=8);const vals=line.map(([r,c])=>p.solution[r][c]);assert.equal(new Set(vals).size,vals.length);if(slope(line)>0)plus++;else if(slope(line)<0)minus++;}
  assert.ok(plus>=3&&minus>=3);assert.ok(gen.intersectionCount(p.data.lines)>=Math.max(3,p.data.lines.length-2));
}

test('argyle audit A: 8/8 exact, essential, replayable and structurally diverse',()=>{
  const solutions=new Set(),tops=new Set(),times=[];
  for(let i=0;i<8;i++){
    const seed=0x415200+i*23,t0=performance.now();
    const a=gen.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused'),ms=performance.now()-t0;
    const b=gen.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused');
    times.push(ms);assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);
    assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);validLattice(a);
    solutions.add(canonicalSolution(a.solution));tops.add(topology(a));
  }
  assert.equal(solutions.size,8);assert.equal(tops.size,8);
  times.sort((a,b)=>a-b);const p95=times[Math.min(times.length-1,Math.ceil(times.length*.95)-1)];
  console.log(`ARGYLE_A PASS seeds=8 structuralSolution=${solutions.size}/8 structuralTopology=${tops.size}/8 p95Ms=${p95.toFixed(1)}`);
});

test('argyle audit A confirms production wiring',()=>{
  assert.match(html,/line-generator-argyle-hardening\.js/);
});
