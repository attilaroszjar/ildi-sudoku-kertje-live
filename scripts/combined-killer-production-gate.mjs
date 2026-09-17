import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { structuralSolutionFingerprint } from './lib/sudoku-production-audit.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=['killer-thermo','killer-arrow','killer-palindrome','killer-zipper','killer-entropic','killer-modular','killer-renban','killer-dutch-whispers','killer-lockout'];
const samplesPerVariant=4;
const perSampleTimeoutMs=10000;
const concurrency=4;
const self=fileURLToPath(import.meta.url);

if(process.argv[2]==='--worker'){
  const id=process.argv[3],seed=Number(process.argv[4])>>>0;
  const files=[
    'games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-bank-iteration3.js','games/sudoku-generator.js',
    'games/line-generator-core.js','games/killer-generator.js','games/line-generator-directed.js','games/line-generator-arrow.js',
    'games/line-generator-proven-siblings.js','games/line-generator-symmetric.js','games/line-generator-sliding-triple.js',
    'games/line-generator-whole-set.js','games/line-generator-transition.js','games/combined-killer-generator.js'
  ];
  const ctx={console,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
  const G=ctx.SudokuGenerator,C=ctx.CombinedKillerGenerator,variant=ctx.SudokuBank.find(v=>v.id===id);
  function cp(x){return JSON.parse(JSON.stringify(x));}
  function subset(candidate,kinds){const v=cp(candidate);v.kind='combined';v.kinds=kinds.slice();delete v._singleKind;return v;}
  const t0=Date.now();
  try{
    const generated=C.makeVariantPilot(G,variant,seed,'focused',{maxAttempts:8}),g=generated.generation||{},secondary=generated.kinds[1];
    const full=G.countVariantSolutions(generated.puzzle,generated,2),classic=G.countSolutions(generated.puzzle,2),killer=G.countVariantSolutions(generated.puzzle,subset(generated,['killer']),2),secondaryCount=G.countVariantSolutions(generated.puzzle,subset(generated,[secondary]),2);
    const flagsOk=g.unique===true&&g.variantEssential===true&&g.componentEssential===true&&g.killerOnlySolutions>1&&g.secondaryOnlySolutions>1&&g.cageCount>0&&typeof g.topologyFingerprint==='string'&&g.topologyFingerprint.length>0;
    const ok=full===1&&classic>1&&killer>1&&secondaryCount>1&&flagsOk;
    console.log(JSON.stringify({id,seed,status:ok?'PASS':'CONTRACT_FAIL',ms:Date.now()-t0,solution:JSON.stringify(generated.solution),structure:structuralSolutionFingerprint(generated.solution),topology:g.topologyFingerprint,puzzle:JSON.stringify(generated.puzzle),clues:g.clues,cages:g.cageCount,componentAttempts:g.componentSearchAttempts,full,classic,killer,secondary:secondaryCount,flagsOk}));
    process.exit(ok?0:1);
  }catch(error){console.log(JSON.stringify({id,seed,status:'FAIL',ms:Date.now()-t0,error:String(error&&error.message||error)}));process.exit(1);}
}

const jobs=[];
for(let vi=0;vi<ids.length;vi++)for(let si=0;si<samplesPerVariant;si++)jobs.push({id:ids[vi],seed:(0x78100000+vi*0x10000+si*0x1f3d)>>>0});
const rows=[];
function runJob(job){return new Promise(resolve=>{
  const child=spawn(process.execPath,[self,'--worker',job.id,String(job.seed)],{cwd:root,stdio:['ignore','pipe','pipe']});
  let out='',err='',done=false;
  const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({id:job.id,seed:job.seed,status:'TIMEOUT',limitMs:perSampleTimeoutMs});},perSampleTimeoutMs);
  child.stdout.on('data',d=>{out+=d;});child.stderr.on('data',d=>{err+=d;});
  child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);let row;try{row=JSON.parse(lines.at(-1)||'');}catch{row={id:job.id,seed:job.seed,status:'WORKER_ERROR',stderr:err.trim().slice(0,240)};}resolve(row);});
});}
let next=0;
async function workerLoop(){while(true){const i=next++;if(i>=jobs.length)return;rows[i]=await runJob(jobs[i]);}}
await Promise.all(Array.from({length:concurrency},()=>workerLoop()));
const byVariant={},failures=[];
for(const id of ids){
  const vr=rows.filter(r=>r.id===id),passes=vr.filter(r=>r.status==='PASS'),solutions=new Set(passes.map(r=>r.solution)),structures=new Set(passes.map(r=>r.structure)),topologies=new Set(passes.map(r=>r.topology)),puzzles=new Set(passes.map(r=>r.puzzle)),times=passes.map(r=>r.ms).sort((a,b)=>a-b);
  const summary={samples:vr.length,passes:passes.length,timeouts:vr.filter(r=>r.status==='TIMEOUT').length,failures:vr.filter(r=>r.status!=='PASS'&&r.status!=='TIMEOUT').length,solutionUnique:solutions.size,structuralSolutionUnique:structures.size,topologyUnique:topologies.size,puzzleUnique:puzzles.size,medianMs:times.length?times[Math.floor((times.length-1)/2)]:null,maxMs:times.length?times.at(-1):null};
  byVariant[id]=summary;
  if(summary.passes!==samplesPerVariant||summary.timeouts||summary.failures||summary.solutionUnique!==samplesPerVariant||summary.structuralSolutionUnique!==samplesPerVariant||summary.topologyUnique!==samplesPerVariant||summary.puzzleUnique!==samplesPerVariant)failures.push(id);
}
const pass=failures.length===0;
console.log('COMBINED_KILLER_PRODUCTION_GATE '+JSON.stringify({samplesPerVariant,perSampleTimeoutMs,concurrency,byVariant,failures}));
console.log('COMBINED_KILLER_PRODUCTION_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
