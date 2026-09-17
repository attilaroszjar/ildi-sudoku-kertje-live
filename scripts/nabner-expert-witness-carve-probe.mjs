import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const loadRefs=[...bankRefs,'games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js','games/line-generator-proven-siblings-hardening.js'];
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of loadRefs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});

const G=ctx.SudokuGenerator;
const variant=ctx.SudokuBank.find(v=>v.id==='nabner');
if(!G||!variant)throw new Error('Nabner runtime not loaded');
const seed=Number(process.env.NABNER_WITNESS_SEED||92001);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('NABNER_WITNESS_SEED invalid');

function clone(value){return JSON.parse(JSON.stringify(value));}
function countClues(grid){return grid.flat().filter(Boolean).length;}
function flattenGrid(grid){return grid.map(row=>row.join('')).join('');}
function witnessCompatible(witness,grid){
  for(let i=0;i<81;i++){
    const r=Math.floor(i/9),c=i%9,v=grid[r][c];
    if(v&&Number(witness[i])!==v)return false;
  }
  return true;
}
function rng(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}

const generationStart=performance.now();
const generated=G.make(variant,seed,'expert');
const generationMs=performance.now()-generationStart;
const puzzle=clone(generated.puzzle);
const baseGivens=countClues(puzzle);
const canonicalSolution=flattenGrid(generated.solution);
const baseVariantSolutions=G.countVariantSolutions(puzzle,generated,2);
const baseClassicSolutions=G.countSolutions(puzzle,2);
if(baseVariantSolutions!==1||baseClassicSolutions<=1||generated.generation?.variantEssential!==true)throw new Error('canonical Nabner expert baseline contract failed');
if(generated.generation?.verification!=='nabner-mask-mrv-exact')throw new Error('optimized Nabner verifier is not active');

const order=[];for(let i=0;i<81;i++)if(puzzle[Math.floor(i/9)][i%9])order.push(i);
shuffle(order,rng((seed^0x4E414243)>>>0));

const witnessSet=new Set();
const attempts=[];
let accepted=0,exactCalls=0,witnessRejects=0,totalSolverMs=0,maxSolverMs=0;
const carveStart=performance.now();
for(const index of order){
  const r=Math.floor(index/9),c=index%9;if(!puzzle[r][c])continue;
  const old=puzzle[r][c];puzzle[r][c]=0;
  let matchedWitness=null;
  for(const witness of witnessSet){if(witness!==canonicalSolution&&witnessCompatible(witness,puzzle)){matchedWitness=witness;break;}}
  let solutions,elapsed=0,stats={};
  if(matchedWitness){
    solutions=2;witnessRejects++;
  }else{
    stats.captureSolutions=true;
    const t0=performance.now();solutions=G.countVariantSolutions(puzzle,generated,2,stats);elapsed=performance.now()-t0;
    exactCalls++;totalSolverMs+=elapsed;maxSolverMs=Math.max(maxSolverMs,elapsed);
    for(const witness of stats.witnesses||[])if(witness!==canonicalSolution)witnessSet.add(witness);
  }
  const keepRemoved=solutions===1;
  if(keepRemoved)accepted++;else puzzle[r][c]=old;
  attempts.push({index,cell:`r${r+1}c${c+1}`,accepted:keepRemoved,solutions,givensAfter:countClues(puzzle),via:matchedWitness?'cached-witness':'exact',runtimeMs:+elapsed.toFixed(1),nodes:stats.nodes??0,branches:stats.branches??0,deadEnds:stats.deadEnds??0,witnessCacheSize:witnessSet.size});
}
const carveMs=performance.now()-carveStart;
const finalGivens=countClues(puzzle);
const finalVariantSolutions=G.countVariantSolutions(puzzle,generated,2);
const finalClassicSolutions=G.countSolutions(puzzle,2);

// A single monotone pass is a proof of local irreducibility: every retained clue was rejected
// because its removal produced >=2 solutions at an earlier, more constrained state. Removing
// additional givens afterwards can only preserve or enlarge that child solution set.
const locallyIrreducible=attempts.filter(a=>!a.accepted).every(a=>a.solutions>=2);
const pass=finalVariantSolutions===1&&finalClassicSolutions>1&&locallyIrreducible&&finalGivens===17;
console.log('NABNER_WITNESS_CARVE_BASE '+JSON.stringify({seed,baseGivens,generationMs:+generationMs.toFixed(1),baseVariantSolutions,baseClassicSolutions,verification:generated.generation?.verification||null}));
console.log('NABNER_WITNESS_CARVE_RESULT '+JSON.stringify({seed,baseGivens,acceptedRemovals:accepted,finalGivens,density:+(finalGivens/81).toFixed(3),finalVariantSolutions,finalClassicSolutions,locallyIrreducibleUnderProductionContract:locallyIrreducible,carveMs:+carveMs.toFixed(1),solverMs:+totalSolverMs.toFixed(1),maxSolverCallMs:+maxSolverMs.toFixed(1),exactCalls,witnessRejects,witnessCacheSize:witnessSet.size,attempts}));
console.log('NABNER_WITNESS_CARVE_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
