import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||93004);
const difficulty='expert';

function percentile(xs,p){
  if(!xs.length)return null;
  const a=xs.slice().sort((x,y)=>x-y);
  return a[Math.min(a.length-1,Math.ceil(p*a.length)-1)];
}
function rounded(x){return x==null?null:+x.toFixed(3);}
function emit(prefix,obj){console.log(prefix+' '+JSON.stringify(obj));}
function cloneGrid(grid){return grid.map(row=>row.slice());}
function sameGrid(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function boxDims(n){
  if(n===4)return [2,2];
  if(n===6)return [2,3];
  if(n===9)return [3,3];
  const h=Math.floor(Math.sqrt(n));
  return [h,Math.floor(n/h)];
}
function mulberry32(seedValue){
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
  for(let i=list.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    const t=list[i];list[i]=list[j];list[j]=t;
  }
  return list;
}
function permuteSolution(source,seedValue){
  const n=source.length,[bh,bw]=boxDims(n),random=mulberry32(seedValue);
  const digits=shuffle(Array.from({length:n},(_,i)=>i+1),random),digitMap={};
  for(let i=1;i<=n;i++)digitMap[i]=digits[i-1];
  const bandOrder=shuffle(Array.from({length:n/bh},(_,i)=>i),random),rowOrder=[];
  bandOrder.forEach(b=>{
    const within=shuffle(Array.from({length:bh},(_,i)=>i),random);
    within.forEach(x=>rowOrder.push(b*bh+x));
  });
  const stackOrder=shuffle(Array.from({length:n/bw},(_,i)=>i),random),colOrder=[];
  stackOrder.forEach(st=>{
    const within=shuffle(Array.from({length:bw},(_,i)=>i),random);
    within.forEach(x=>colOrder.push(st*bw+x));
  });
  return rowOrder.map(r=>colOrder.map(c=>digitMap[source[r][c]]));
}

function loadScript(ref){
  const f=path.join(root,ref);
  if(!fs.existsSync(f))throw new Error('missing runtime script: '+ref);
  (0,eval)(`${fs.readFileSync(f,'utf8')}\n//# sourceURL=${ref}`);
}

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const generatorRef='games/sudoku-generator.js';
const first=refs.indexOf(generatorRef);
const sizeRef='games/p3-size-control.js';
const sizeIndex=refs.indexOf(sizeRef);
if(first<0||sizeIndex<=first)throw new Error('production 12x12 runtime range missing');

globalThis.window=globalThis;
globalThis.performance=performance;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};

// Phase A: load only the canonical banks and raw generator. This is the exact
// environment in which makeLargePuzzle itself is defined, before any later
// SudokuGenerator.make wrappers are installed by runtime hardening scripts.
for(const ref of bankRefs)loadScript(ref);
loadScript(generatorRef);

const G=globalThis.SudokuGenerator;
const B=globalThis.SudokuBank;
if(!G||!Array.isArray(B)||typeof G.make!=='function'||typeof G.countSolutions!=='function')throw new Error('Sudoku runtime missing');
const variant=B.find(v=>v.id==='sudoku-12x12');
if(!variant)throw new Error('sudoku-12x12 variant missing');
if(!variant.solution||variant.solution.length!==12)throw new Error('unexpected sudoku-12x12 solution contract');

// Reproduce the audited raw makeLargePuzzle phases without changing the solver
// or puzzle contract. This mirrors games/sudoku-generator.js exactly and lets us
// separate solution permutation/setup from the initial exact uniqueness carve.
const permutationStart=performance.now();
const permuted=permuteSolution(variant.solution,seed>>>0);
const solutionPermutationMs=performance.now()-permutationStart;

const setupStart=performance.now();
const n=permuted.length;
const baseGrid=cloneGrid(permuted);
const random=mulberry32((seed>>>0)^0x9E3779B9);
const baseOrder=shuffle(Array.from({length:n*n},(_,i)=>i),random);
const targetBlanks=Math.round(n*4.25);
let blanks=0;
const initialPuzzleSetupMs=performance.now()-setupStart;

const baseCalls=[];
let baseAccepted=0,baseRejected=0;
const carveStart=performance.now();
for(let i=0;i<baseOrder.length&&blanks<targetBlanks;i++){
  const idx=baseOrder[i],r=Math.floor(idx/n),c=idx%n,saved=baseGrid[r][c];
  baseGrid[r][c]=0;
  const t0=performance.now();
  const count=G.countSolutions(baseGrid,2);
  const ms=performance.now()-t0;
  baseCalls.push({ms,count,givens:n*n-blanks-1});
  if(count!==1){baseGrid[r][c]=saved;baseRejected++;}
  else{blanks++;baseAccepted++;}
}
const initialCarveMs=performance.now()-carveStart;
const baseVerifyStart=performance.now();
const baseUnique=G.countSolutions(baseGrid,2)===1;
const baseFinalVerificationMs=performance.now()-baseVerifyStart;
const baseGivens=n*n-blanks;

// Validate the diagnostic reproduction against the still-unwrapped raw generator.
// This call also deliberately primes the raw generator cache. Later production
// wrappers therefore measure only their own work instead of repeating Phase A.
const productionBaseStart=performance.now();
const productionBaseOut=G.make(variant,seed,difficulty);
const productionBaseMakeMs=performance.now()-productionBaseStart;
if(!productionBaseOut||!sameGrid(productionBaseOut.puzzle,baseGrid)){
  throw new Error('diagnostic base reproduction diverged from raw makeLargePuzzle');
}

// Phase B: install every game runtime script that production loads after the raw
// generator through p3-size-control, preserving index.html order. This gives the
// actual wrapper chain while keeping the already-audited raw base result cached.
for(const ref of refs.slice(first+1,sizeIndex+1)){
  if(!ref.startsWith('games/'))continue;
  loadScript(ref);
}

// The production 12x12 wrapper dynamically calls SudokuGenerator.countSolutions.
// Wrap that public exact counter only for observation; return values are untouched.
const exact=G.countSolutions;
const localCalls=[];
G.countSolutions=function(source,limit){
  const t0=performance.now();
  const result=exact.apply(this,arguments);
  localCalls.push({ms:performance.now()-t0,result,givens:source.flat().filter(Boolean).length});
  return result;
};

const localStart=performance.now();
const out=G.make(variant,seed,difficulty);
const localWrapperMs=performance.now()-localStart;
G.countSolutions=exact;

if(!out||!out.generation)throw new Error('production 12x12 generation output missing');
const finalCall=localCalls.length?localCalls[localCalls.length-1]:null;
const trialCalls=localCalls.slice(0,-1);
const trialMs=trialCalls.map(x=>x.ms);
const finalGivens=out.puzzle.flat().filter(Boolean).length;

emit('SUDOKU12_PHASE_PROFILE',{
  seed,
  difficulty,
  base:{
    solutionPermutationMs:rounded(solutionPermutationMs),
    initialPuzzleSetupMs:rounded(initialPuzzleSetupMs),
    carveMs:rounded(initialCarveMs),
    exactCalls:baseCalls.length,
    exactTotalMs:rounded(baseCalls.reduce((s,x)=>s+x.ms,0)),
    exactP50Ms:rounded(percentile(baseCalls.map(x=>x.ms),.5)),
    exactP95Ms:rounded(percentile(baseCalls.map(x=>x.ms),.95)),
    exactWorstMs:rounded(baseCalls.length?Math.max(...baseCalls.map(x=>x.ms)):0),
    acceptedRemovals:baseAccepted,
    rejectedRemovals:baseRejected,
    finalVerificationMs:rounded(baseFinalVerificationMs),
    finalGivens:baseGivens,
    unique:baseUnique,
    productionBaseMakeMs:rounded(productionBaseMakeMs)
  },
  localIrreducibility:{
    wrapperMs:rounded(localWrapperMs),
    trialExactCalls:trialCalls.length,
    exactTotalMs:rounded(trialMs.reduce((s,x)=>s+x,0)),
    exactP50Ms:rounded(percentile(trialMs,.5)),
    exactP95Ms:rounded(percentile(trialMs,.95)),
    exactWorstMs:rounded(trialMs.length?Math.max(...trialMs):0),
    finalVerificationMs:rounded(finalCall&&finalCall.ms),
    finalVerificationCount:finalCall&&finalCall.result,
    finalGivens,
    acceptedRemovals:out.generation.acceptedRemovals??null,
    rejectedRemovals:out.generation.rejectedRemovals??null
  },
  counters:{nodes:null,branches:null,deadEnds:null,reason:'12x12 countSolutions does not expose search counters'},
  contract:{
    unique:out.generation.unique===true,
    verification:out.generation.verification,
    generatorFamily:out.generation.generatorFamily,
    locallyIrreducibleUnderProductionContract:out.generation.locallyIrreducibleUnderProductionContract===true
  }
});
console.log('SUDOKU12_HOTSPOT_PHASE_PROFILE:PASS');
