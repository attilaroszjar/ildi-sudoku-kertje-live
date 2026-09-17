import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const files=[
  'games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-bank-iteration3.js','games/sudoku-generator.js',
  'games/line-generator-core.js','games/killer-generator.js','games/line-generator-directed.js','games/line-generator-arrow.js',
  'games/line-generator-proven-siblings.js','games/line-generator-symmetric.js','games/line-generator-sliding-triple.js',
  'games/line-generator-whole-set.js','games/line-generator-transition.js','games/combined-killer-generator.js'
];
const ids=['killer-thermo','killer-arrow','killer-palindrome','killer-zipper','killer-entropic','killer-modular','killer-renban','killer-dutch-whispers','killer-lockout'];
const ctx={console,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const G=ctx.SudokuGenerator,C=ctx.CombinedKillerGenerator;
function cp(x){return JSON.parse(JSON.stringify(x));}
function subset(candidate,kinds){const v=cp(candidate);v.kind='combined';v.kinds=kinds.slice();delete v._singleKind;return v;}
function normalizeSymbols(grid){const map=new Map();let next=1;return grid.map(row=>row.map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}));}
function rotate(grid){const n=grid.length;return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>grid[n-1-c][r]));}
function reflect(grid){return grid.map(row=>row.slice().reverse());}
function structuralFingerprint(grid){const forms=[];let g=grid.map(row=>row.slice());for(let i=0;i<4;i++){for(const x of [g,reflect(g)])forms.push(normalizeSymbols(x).flat().join(''));g=rotate(g);}forms.sort();return forms[0];}
function round(x){return Math.round(x*10)/10;}
const rows={},failures=[];
for(let vi=0;vi<ids.length;vi++){
  const id=ids[vi],variant=ctx.SudokuBank.find(v=>v.id===id);
  if(!variant)throw new Error('missing variant '+id);
  const seeds=[(0x6b4b1000+vi*97)>>>0,(0x6b4b2000+vi*131)>>>0];
  const solutions=new Set(),structures=new Set(),topologies=new Set(),puzzles=new Set(),samples=[];
  let deterministic=0,exactCombined=0,classicAmbiguous=0,killerAmbiguous=0,secondaryAmbiguous=0,flagsOk=0;
  for(let si=0;si<seeds.length;si++){
    const seed=seeds[si],t0=performance.now();
    let generated;
    try{generated=C.makeVariantPilot(G,variant,seed,'focused',{maxAttempts:8});}
    catch(error){failures.push(id+':'+seed+':generation:'+String(error&&error.message||error));continue;}
    const ms=performance.now()-t0;
    if(si===0){
      try{const again=C.makeVariantPilot(G,variant,seed,'focused',{maxAttempts:8});if(JSON.stringify(generated)===JSON.stringify(again))deterministic++;else failures.push(id+':'+seed+':determinism');}
      catch(error){failures.push(id+':'+seed+':determinism-generation:'+String(error&&error.message||error));}
    }
    const secondary=generated.kinds[1];
    const full=G.countVariantSolutions(generated.puzzle,generated,2);
    const classic=G.countSolutions(generated.puzzle,2);
    const killer=G.countVariantSolutions(generated.puzzle,subset(generated,['killer']),2);
    const secondaryCount=G.countVariantSolutions(generated.puzzle,subset(generated,[secondary]),2);
    if(full===1)exactCombined++;else failures.push(id+':'+seed+':combined='+full);
    if(classic>1)classicAmbiguous++;else failures.push(id+':'+seed+':classic='+classic);
    if(killer>1)killerAmbiguous++;else failures.push(id+':'+seed+':killer='+killer);
    if(secondaryCount>1)secondaryAmbiguous++;else failures.push(id+':'+seed+':secondary='+secondaryCount);
    const g=generated.generation||{};
    if(g.unique===true&&g.variantEssential===true&&g.componentEssential===true&&g.killerOnlySolutions>1&&g.secondaryOnlySolutions>1&&g.cageCount>0&&typeof g.topologyFingerprint==='string'&&g.topologyFingerprint.length>0)flagsOk++;else failures.push(id+':'+seed+':generation-contract');
    solutions.add(JSON.stringify(generated.solution));structures.add(structuralFingerprint(generated.solution));topologies.add(g.topologyFingerprint);puzzles.add(JSON.stringify(generated.puzzle));
    samples.push({seed,ms:round(ms),clues:g.clues,cages:g.cageCount,componentAttempts:g.componentSearchAttempts,combined:full,classic,killer,secondary:secondaryCount});
  }
  rows[id]={generated:samples.length,deterministic,solutionUnique:solutions.size,structuralSolutionUnique:structures.size,topologyUnique:topologies.size,puzzleUnique:puzzles.size,exactCombined,classicAmbiguous,killerAmbiguous,secondaryAmbiguous,flagsOk,samples};
  const r=rows[id];
  if(!(r.generated===2&&r.deterministic===1&&r.solutionUnique===2&&r.structuralSolutionUnique===2&&r.topologyUnique===2&&r.puzzleUnique===2&&r.exactCombined===2&&r.classicAmbiguous===2&&r.killerAmbiguous===2&&r.secondaryAmbiguous===2&&r.flagsOk===2))failures.push(id+':summary-contract');
}
const pass=failures.length===0;
console.log('COMBINED_KILLER_QUALITY_AUDIT '+JSON.stringify({variants:rows,failures}));
console.log('COMBINED_KILLER_QUALITY_AUDIT:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
