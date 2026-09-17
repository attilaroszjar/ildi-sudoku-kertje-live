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
const seed=Number(process.env.NABNER_CARVE_SEED||92001);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('NABNER_CARVE_SEED invalid');

function clone(value){return JSON.parse(JSON.stringify(value));}
function countClues(grid){return grid.flat().filter(Boolean).length;}
function rng(seedValue){
  let x=seedValue>>>0;
  return function(){
    x=(x+0x6D2B79F5)>>>0;
    let t=x;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function shuffle(list,random){
  for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  return list;
}

const generationStart=performance.now();
const generated=G.make(variant,seed,'expert');
const generationMs=performance.now()-generationStart;
const puzzle=clone(generated.puzzle);
const baseGivens=countClues(puzzle);
const baseVariantSolutions=G.countVariantSolutions(puzzle,generated,2);
const baseClassicSolutions=G.countSolutions(puzzle,2);
if(baseVariantSolutions!==1||baseClassicSolutions<=1||generated.generation?.variantEssential!==true)throw new Error('canonical Nabner expert baseline contract failed');
if(generated.generation?.verification!=='nabner-incremental-line-mask-pressure-mrv-exact')throw new Error('pressure-MRV Nabner verifier is not active');

const order=[];
for(let i=0;i<81;i++)if(puzzle[Math.floor(i/9)][i%9])order.push(i);
shuffle(order,rng((seed^0x4E414243)>>>0));

const attempts=[];
let accepted=0,rejected=0,totalSolverMs=0,maxSolverMs=0;
const carveStart=performance.now();
for(const index of order){
  const r=Math.floor(index/9),c=index%9;
  if(!puzzle[r][c])continue;
  const old=puzzle[r][c];
  puzzle[r][c]=0;
  const stats={};
  const t0=performance.now();
  const solutions=G.countVariantSolutions(puzzle,generated,2,stats);
  const elapsed=performance.now()-t0;
  totalSolverMs+=elapsed;maxSolverMs=Math.max(maxSolverMs,elapsed);
  const keepRemoved=solutions===1;
  if(keepRemoved)accepted++;
  else{rejected++;puzzle[r][c]=old;}
  attempts.push({
    index,cell:`r${r+1}c${c+1}`,accepted:keepRemoved,solutions,
    givensAfter:countClues(puzzle),runtimeMs:+elapsed.toFixed(1),
    nodes:stats.nodes??null,branches:stats.branches??null,deadEnds:stats.deadEnds??null
  });
}
const carveMs=performance.now()-carveStart;
const finalGivens=countClues(puzzle);
const finalStats={};
const finalVariantSolutions=G.countVariantSolutions(puzzle,generated,2,finalStats);
const finalClassicSolutions=G.countSolutions(puzzle,2);

const locallyIrreducible=attempts.filter(row=>!row.accepted).every(row=>row.solutions>=2);
const pass=finalVariantSolutions===1&&finalClassicSolutions>1&&locallyIrreducible&&accepted+rejected===baseGivens;
console.log('NABNER_OPTIMIZED_CARVE_BASE '+JSON.stringify({seed,baseGivens,generationMs:+generationMs.toFixed(1),baseVariantSolutions,baseClassicSolutions,verification:generated.generation?.verification||null}));
console.log('NABNER_OPTIMIZED_CARVE_RESULT '+JSON.stringify({
  seed,baseGivens,acceptedRemovals:accepted,rejectedRemovals:rejected,finalGivens,density:+(finalGivens/81).toFixed(3),
  finalVariantSolutions,finalClassicSolutions,locallyIrreducibleUnderProductionContract:locallyIrreducible,
  localIrreducibilityProof:'monotone-nonuniqueness-from-single-pass',
  carveMs:+carveMs.toFixed(1),solverMs:+totalSolverMs.toFixed(1),maxSolverCallMs:+maxSolverMs.toFixed(1),
  finalNodes:finalStats.nodes??null,finalBranches:finalStats.branches??null,finalDeadEnds:finalStats.deadEnds??null,attempts
}));
console.log('NABNER_OPTIMIZED_CARVE_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
