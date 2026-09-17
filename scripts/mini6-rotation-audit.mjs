import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const banks=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of banks)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
for(const ref of ['games/sudoku-generator.js','games/iteration5-generator-hardening.js'])vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='mini-6');
if(!variant)throw new Error('missing mini-6 variant');

function rotate(grid){const n=grid.length;return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>grid[n-1-c][r]));}
function rotated(grid,t){let out=grid.map(r=>r.slice());for(let i=0;i<t;i++)out=rotate(out);return out;}
function validSolution(grid){
  if(grid.length!==6||grid.some(r=>r.length!==6))return false;
  const target='1,2,3,4,5,6';
  for(let r=0;r<6;r++)if(grid[r].slice().sort((a,b)=>a-b).join(',')!==target)return false;
  for(let c=0;c<6;c++)if(grid.map(r=>r[c]).sort((a,b)=>a-b).join(',')!==target)return false;
  for(let br=0;br<6;br+=2)for(let bc=0;bc<6;bc+=3){const vals=[];for(let r=br;r<br+2;r++)for(let c=bc;c<bc+3;c++)vals.push(grid[r][c]);if(vals.sort((a,b)=>a-b).join(',')!==target)return false;}
  return true;
}
function givensMatch(puzzle,solution){for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(puzzle[r][c]&&puzzle[r][c]!==solution[r][c])return false;return true;}
function pct(xs,p){const a=xs.slice().sort((a,b)=>a-b);return a[Math.max(0,Math.ceil(a.length*p)-1)];}
function round(x){return Math.round(x*10)/10;}

const seeds=Array.from({length:64},(_,i)=>51000+i),difficulties=['gentle','focused','expert'];
let generated=0,rotationChecks=0,valid=0,unique=0,givens=0,deterministic=0,failures=[];
const solutions=new Set(),puzzles=new Set(),rows={};
for(const d of difficulties){const times=[],clueCounts=[];for(const seed of seeds){const t0=performance.now();let g;try{g=G.make(variant,seed,d);}catch(e){failures.push(`${d}:${seed}:generation:${e.message}`);continue;}times.push(performance.now()-t0);generated++;const replay=G.make(variant,seed,d);if(JSON.stringify(g)===JSON.stringify(replay))deterministic++;else failures.push(`${d}:${seed}:determinism`);solutions.add(JSON.stringify(g.solution));puzzles.add(JSON.stringify(g.puzzle));clueCounts.push(g.puzzle.flat().filter(Boolean).length);
  for(let t=0;t<4;t++){rotationChecks++;const s=rotated(g.solution,t),p=rotated(g.puzzle,t);if(validSolution(s))valid++;else failures.push(`${d}:${seed}:rotation-${t}:invalid-solution`);if(givensMatch(p,s))givens++;else failures.push(`${d}:${seed}:rotation-${t}:givens`);if(G.countSolutions(p,2)===1)unique++;else failures.push(`${d}:${seed}:rotation-${t}:unique`);}
}
rows[d]={samples:times.length,clueMin:Math.min(...clueCounts),clueMax:Math.max(...clueCounts),runtimeP50Ms:round(pct(times,.5)),runtimeP95Ms:round(pct(times,.95)),runtimeMaxMs:round(Math.max(...times))};}
const expected=seeds.length*difficulties.length,expectedRot=expected*4;
const correctness=generated===expected&&valid===expectedRot&&unique===expectedRot&&givens===expectedRot&&deterministic===expected&&failures.length===0;
const ordering=rows.gentle.clueMin>rows.focused.clueMax&&rows.focused.clueMin>rows.expert.clueMax;
const diversity=solutions.size>=48&&puzzles.size>=180;
const runtime=difficulties.every(d=>rows[d].runtimeP95Ms<250&&rows[d].runtimeMaxMs<1000);
const result={samples:expected,rotationChecks:expectedRot,generated,solutionUnique:solutions.size,puzzleUnique:puzzles.size,validRotations:valid,uniqueRotations:unique,givensMatchRotations:givens,deterministic,failures:failures.length,difficulties:rows};
console.log('MINI6_ROTATION_AUDIT '+JSON.stringify(result));
console.log('MINI6_ROTATION_CORRECTNESS:'+(correctness?'PASS':'FAIL'));
console.log('MINI6_ROTATION_DIFFICULTY_ORDERING:'+(ordering?'PASS':'FAIL'));
console.log('MINI6_ROTATION_DIVERSITY:'+(diversity?'PASS':'FAIL'));
console.log('MINI6_ROTATION_RUNTIME:'+(runtime?'PASS':'FAIL'));
console.log('MINI6_ROTATION_GATE:'+(correctness&&ordering&&diversity&&runtime?'PASS':'FAIL'));
if(!(correctness&&ordering&&diversity&&runtime))process.exitCode=1;
