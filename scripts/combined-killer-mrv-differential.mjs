import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const cases=[['killer-palindrome',2014461562],['killer-lockout',2014846781]];
const files=[
  'games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-bank-iteration3.js','games/sudoku-generator.js',
  'games/line-generator-core.js','games/killer-generator.js','games/line-generator-directed.js','games/line-generator-arrow.js',
  'games/line-generator-proven-siblings.js','games/line-generator-symmetric.js','games/line-generator-sliding-triple.js',
  'games/line-generator-whole-set.js','games/line-generator-transition.js','games/combined-killer-generator.js'
];

function makeContext(reference){
  const ctx={console,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const f of files){
    let src=fs.readFileSync(path.join(root,f),'utf8');
    if(reference&&f==='games/sudoku-generator.js'){
      src=src.replace(/mask=killerCageCandidateMask\(variant,grid,rr,cc,mask,n\);/g,'');
    }
    vm.runInContext(src,ctx,{filename:f});
  }
  return ctx;
}

function clone(x){return JSON.parse(JSON.stringify(x));}
function subset(candidate,kinds){const v=clone(candidate);v.kind='combined';v.kinds=kinds.slice();delete v._singleKind;return v;}
function clues(grid){return grid.flat().filter(Boolean).length;}
function rng(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,random){for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

const opt=makeContext(false),ref=makeContext(true);
const rows=[],mismatches=[];
for(const [id,seed] of cases){
  const refVariant=ref.SudokuBank.find(v=>v.id===id),optVariant=opt.SudokuBank.find(v=>v.id===id);
  let generated;
  const t0=performance.now();
  try{generated=ref.CombinedKillerGenerator.makeVariantPilot(ref.SudokuGenerator,refVariant,seed,'focused',{maxAttempts:8});}
  catch(error){rows.push({id,seed,status:'REFERENCE_GENERATION_FAIL',error:String(error&&error.message||error)});continue;}
  const secondary=generated.kinds[1],states=[];
  states.push({label:'generated',grid:clone(generated.puzzle)});
  const order=shuffle(Array.from({length:81},(_,i)=>i),rng(seed^0x4D525644));
  for(const target of [32,28,25,23,21]){
    const g=clone(generated.solution);let count=81;
    for(const idx of order){if(count<=target)break;const r=Math.floor(idx/9),c=idx%9;g[r][c]=0;count--;}
    states.push({label:'solution-drop-'+target,grid:g});
  }
  const candidate=clone(generated),candidateOpt=clone(generated);
  const checks=[
    ['combined',candidate,candidateOpt],
    ['killer',subset(candidate,['killer']),subset(candidateOpt,['killer'])],
    ['secondary',subset(candidate,[secondary]),subset(candidateOpt,[secondary])]
  ];
  let local=0;
  for(const state of states){
    for(const [kind,rv,ov] of checks){
      const r0=performance.now(),a=ref.SudokuGenerator.countVariantSolutions(state.grid,rv,2),rms=performance.now()-r0;
      const o0=performance.now(),b=opt.SudokuGenerator.countVariantSolutions(state.grid,ov,2),oms=performance.now()-o0;
      const same=a===b;
      if(!same){local++;mismatches.push({id,seed,state:state.label,kind,clues:clues(state.grid),reference:a,optimized:b});}
      rows.push({id,seed,state:state.label,kind,clues:clues(state.grid),reference:a,optimized:b,same,referenceMs:Math.round(rms*10)/10,optimizedMs:Math.round(oms*10)/10});
    }
  }
  rows.push({id,seed,status:local?'MISMATCH':'PASS',referenceGenerationMs:Math.round((performance.now()-t0)*10)/10,mismatches:local});
}
const pass=mismatches.length===0;
console.log('COMBINED_KILLER_MRV_DIFFERENTIAL '+JSON.stringify({cases:cases.length,checks:rows.filter(r=>r.kind).length,mismatches,rows}));
console.log('COMBINED_KILLER_MRV_DIFFERENTIAL:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
