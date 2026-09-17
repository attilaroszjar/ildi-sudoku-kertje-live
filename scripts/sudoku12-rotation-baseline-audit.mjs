import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of ['games/sudoku-bank.js','games/sudoku-bank-iteration5.js','games/sudoku-generator.js','games/iteration5-generator-hardening.js']){
  vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
}
const G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='sudoku-12x12');
if(!variant)throw new Error('missing sudoku-12x12 variant');
function rotate(g){const n=g.length;return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>g[n-1-c][r]));}
function turns(g,k){let x=g.map(r=>r.slice());for(let i=0;i<k;i++)x=rotate(x);return x;}
function valid(grid){const n=12,bh=3,bw=4;for(let r=0;r<n;r++)if(new Set(grid[r]).size!==n)return false;for(let c=0;c<n;c++)if(new Set(grid.map(row=>row[c])).size!==n)return false;for(let br=0;br<n;br+=bh)for(let bc=0;bc<n;bc+=bw){const vals=[];for(let r=br;r<br+bh;r++)for(let c=bc;c<bc+bw;c++)vals.push(grid[r][c]);if(new Set(vals).size!==n)return false;}return true;}
function givensMatch(p,s){for(let r=0;r<12;r++)for(let c=0;c<12;c++)if(p[r][c]&&p[r][c]!==s[r][c])return false;return true;}
function pct(xs,p){const a=xs.slice().sort((a,b)=>a-b);return a[Math.ceil(a.length*p)-1];}
function round(x){return Math.round(x*10)/10;}
const difficulties=['gentle','focused','expert'],seeds=Array.from({length:16},(_,i)=>31000+i),rows={};
let generated=0,validRotations=0,uniqueRotations=0,givensMatchRotations=0,deterministic=0,failures=0,rotationChecks=0;const puzzles=new Set(),solutions=new Set();
for(const d of difficulties){const times=[];for(const seed of seeds){const t=performance.now();let g;try{g=G.make(variant,seed,d);}catch(e){failures++;continue;}times.push(performance.now()-t);generated++;puzzles.add(JSON.stringify(g.puzzle));solutions.add(JSON.stringify(g.solution));const replay=G.make(variant,seed,d);if(JSON.stringify(g)===JSON.stringify(replay))deterministic++;else failures++;for(let k=0;k<4;k++){rotationChecks++;const s=turns(g.solution,k),p=turns(g.puzzle,k);if(valid(s))validRotations++;else failures++;if(givensMatch(p,s))givensMatchRotations++;else failures++;if(G.countSolutions(p,2)===1)uniqueRotations++;else failures++;}}
  rows[d]={samples:times.length,runtimeP50Ms:round(pct(times,.5)),runtimeP95Ms:round(pct(times,.95)),runtimeMaxMs:round(Math.max(...times))};
}
const samples=seeds.length*difficulties.length,result={samples,rotationChecks,generated,solutionUnique:solutions.size,puzzleUnique:puzzles.size,validRotations,uniqueRotations,givensMatchRotations,deterministic,failures,difficulties:rows};
const correctness=generated===samples&&validRotations===rotationChecks&&uniqueRotations===rotationChecks&&givensMatchRotations===rotationChecks&&deterministic===samples&&failures===0;
const runtime=difficulties.every(d=>rows[d].samples===seeds.length&&rows[d].runtimeP95Ms<3000&&rows[d].runtimeMaxMs<8000);
console.log('SUDOKU12_ROTATION_BASELINE '+JSON.stringify(result));
console.log('SUDOKU12_ROTATION_CORRECTNESS:'+(correctness?'PASS':'FAIL'));
console.log('SUDOKU12_ROTATION_RUNTIME:'+(runtime?'PASS':'FAIL'));
console.log('SUDOKU12_ROTATION_BASELINE_GATE:'+(correctness&&runtime?'PASS':'FAIL'));
if(!(correctness&&runtime))process.exitCode=1;
