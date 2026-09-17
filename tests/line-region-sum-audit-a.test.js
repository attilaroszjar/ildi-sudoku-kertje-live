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
for(const f of ['games/sudoku-generator.js','games/line-generator-core.js','games/region-sum-segments.js','games/region-sum-runtime-hardening.js','games/line-generator-region-sum.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);

const v=ctx.SudokuBank.find(x=>x.id==='region-sum');assert.ok(v);
const core=ctx.LineGeneratorCore,rs=ctx.RegionSumSegments,gen=ctx.LineGeneratorRegionSum;
function canonicalSolution(g){
  const map=new Map();let next=1;return g.map(row=>row.map(x=>{if(!map.has(x))map.set(x,next++);return map.get(x);})).flat().join('');
}
function topology(p){return core.topologyFingerprint(p.data.lines,{directed:false});}
function validLine(p){for(const line of p.data.lines){const segs=rs.sums(p.solution,line);assert.ok(segs.length>=2);assert.ok(segs.every(s=>s.cells.length>=2&&s.complete));assert.equal(new Set(segs.map(s=>s.sum)).size,1);}}

test('region-sum audit A: 8/8 exact, essential, replayable and structurally diverse',()=>{
  const solutions=new Set(),tops=new Set(),times=[];
  for(let i=0;i<8;i++){
    const seed=0x524700+i*17,t0=performance.now();
    const a=gen.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused'),ms=performance.now()-t0;
    const b=gen.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused');
    times.push(ms);assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);
    assert.equal(a.generation.variantEssential,true);assert.equal(a.generation.unique,true);validLine(a);
    solutions.add(canonicalSolution(a.solution));tops.add(topology(a));
  }
  assert.equal(solutions.size,8);assert.equal(tops.size,8);
  times.sort((a,b)=>a-b);const p95=times[Math.min(times.length-1,Math.ceil(times.length*.95)-1)];
  console.log(`REGION_SUM_A PASS seeds=8 structuralSolution=${solutions.size}/8 structuralTopology=${tops.size}/8 p95Ms=${p95.toFixed(1)}`);
});

test('region-sum audit A confirms production wiring',()=>{
  const src=fs.readFileSync(path.join(root,'games/line-generator-region-sum-hardening.js'),'utf8');
  assert.match(src,/LineGeneratorRegionSum/);
  assert.match(html,/line-generator-region-sum\.js/);
});
