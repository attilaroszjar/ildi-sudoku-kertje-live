'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');
const ctx={console,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const f of ['games/sudoku-bank.js','games/sudoku-generator.js','games/line-generator-core.js','games/killer-generator.js','games/killer-generator-hardening.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const v=ctx.SudokuBank.find(x=>x.id==='killer');assert.ok(v);const gen=ctx.KillerGenerator;
function tr(r,c,t){switch(t){case 0:return[r,c];case 1:return[c,8-r];case 2:return[8-r,8-c];case 3:return[8-c,r];case 4:return[r,8-c];case 5:return[8-c,8-r];case 6:return[8-r,c];default:return[c,r];}}
function canonicalSolution(g){let best=null;for(let t=0;t<8;t++){const map=new Map();let next=1,s='';for(let r=0;r<9;r++)for(let c=0;c<9;c++){const q=tr(r,c,t),x=g[q[0]][q[1]];if(!map.has(x))map.set(x,next++);s+=map.get(x);}if(best===null||s<best)best=s;}return best;}
function canonicalTopology(cages){let best=null;for(let t=0;t<8;t++){const cs=cages.map(c=>c.cells.map(p=>{const q=tr(p[0],p[1],t);return q[0]+','+q[1];}).sort().join(';')).sort().join('|');if(best===null||cs<best)best=cs;}return best;}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function p95(xs){const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*.95)-1)];}
function validateCages(p){const seen=new Set();for(const cage of p.data.cages){assert.ok(cage.cells.length>=2&&cage.cells.length<=4);const vals=[];const local=new Set();for(const cell of cage.cells){const k=cell[0]+','+cell[1];assert.ok(!seen.has(k));seen.add(k);local.add(k);vals.push(p.solution[cell[0]][cell[1]]);}assert.equal(new Set(vals).size,vals.length);assert.equal(vals.reduce((a,b)=>a+b,0),cage.sum);const stack=[cage.cells[0]],reach=new Set([cage.cells[0][0]+','+cage.cells[0][1]]);while(stack.length){const a=stack.pop();for(const b of cage.cells)if(!reach.has(b[0]+','+b[1])&&Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])===1){reach.add(b[0]+','+b[1]);stack.push(b);}}assert.equal(reach.size,cage.cells.length);}assert.equal(seen.size,81);}

test('Killer audit B: 32x3 exact/essential/diverse with ordered measured difficulty and bounded runtime',()=>{
  const diffs=['gentle','focused','expert'],scores={},times={},solutionSet=new Set(),topologySet=new Set();
  for(const d of diffs){scores[d]=[];times[d]=[];for(let i=0;i<32;i++){
    const seed=0x4b110000+i*37,t0=performance.now();
    const p=ctx.SudokuGenerator.make(v,seed,d);times[d].push(performance.now()-t0);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(p.puzzle,p,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(p.puzzle,2)>1);
    assert.equal(p.generation.unique,true);assert.equal(p.generation.variantEssential,true);assert.equal(p.generation.generatorFamily,'killer-fresh-fill-mrv-cages');assert.equal(p.generation.pilot,false);validateCages(p);
    scores[d].push(p.generation.difficultyScore);if(d==='focused'){solutionSet.add(canonicalSolution(p.solution));topologySet.add(canonicalTopology(p.data.cages));}
  }}
  assert.equal(solutionSet.size,32);assert.equal(topologySet.size,32);
  const mg=median(scores.gentle),mf=median(scores.focused),me=median(scores.expert);assert.ok(mg<mf&&mf<me,`${mg}<${mf}<${me}`);
  const tg=p95(times.gentle),tf=p95(times.focused),te=p95(times.expert);assert.ok(tg<1000&&tf<1000&&te<1000,`${tg}/${tf}/${te}`);
  console.log(`KILLER_B PASS total=96 structuralSolution=${solutionSet.size}/32 structuralTopology=${topologySet.size}/32 difficulty=${mg}<${mf}<${me} p95Ms=${tg.toFixed(1)}/${tf.toFixed(1)}/${te.toFixed(1)}`);
});

test('Killer audit B uses the production fresh-cage make() route',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/killer-generator\.js/);assert.match(html,/killer-generator-hardening\.js/);
});
