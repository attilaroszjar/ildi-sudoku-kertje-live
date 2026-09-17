import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {canonicalJson,structuralSolutionFingerprint,summarizeProductionSamples} from './lib/sudoku-production-audit.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=['center-dot','frame','sukaku'];
const samples=4;
const perSampleTimeoutMs=15000;
const concurrency=2;
const self=fileURLToPath(import.meta.url);

function runtimeRefs(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  return [...index.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map(m=>m[1])
    .filter(x=>x==='games/sudoku-generator.js'||/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||/^games\/[^/]*(?:generator-core|generator-hardening)\.js$/.test(x));
}

function loadRuntime(){
  const ctx={console,Map,Set,WeakMap,Math,Date,JSON,Array,Object,Number,String,Boolean,RegExp,Error,TypeError,Uint8Array,Uint16Array,Uint32Array,Int32Array};
  ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const file of runtimeRefs())vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
  return ctx;
}

function countSukakuSolutions(candidateGrid,limit=2){
  const n=9,full=(1<<n)-1,grid=Array.from({length:n},()=>Array(n).fill(0));
  const rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0);
  function box(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
  function maskFor(r,c){
    const allowed=(candidateGrid[r][c]||[]).reduce((m,d)=>m|(1<<(d-1)),0);
    return allowed&full&~(rows[r]|cols[c]|boxes[box(r,c)]);
  }
  let found=0;
  function visit(){
    if(found>=limit)return;
    let br=-1,bc=-1,bm=0,best=10;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){
      const mask=maskFor(r,c);let count=0;for(let b=mask;b;b&=b-1)count++;
      if(!count)return;
      if(count<best){best=count;br=r;bc=c;bm=mask;if(count===1)break;}
    }
    if(br<0){found++;return;}
    const bx=box(br,bc);
    for(let bits=bm;bits;bits&=bits-1){
      const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);
      grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;boxes[bx]|=one;
      visit();
      rows[br]^=one;cols[bc]^=one;boxes[bx]^=one;grid[br][bc]=0;
      if(found>=limit)return;
    }
  }
  visit();return found;
}

function centerDotCertificate(generated){
  const expected=[];for(let br=0;br<3;br++)for(let bc=0;bc<3;bc++)expected.push([br*3+1,bc*3+1]);
  return canonicalJson((generated.data&&generated.data.cells)||[])===canonicalJson(expected);
}

function auditTopology(id,generated){
  if(id==='center-dot')return canonicalJson({fixedRule:'box-centers-extra-house',cells:generated.data&&generated.data.cells});
  if(id==='frame')return canonicalJson((generated.data&&generated.data.clues)||[]);
  if(id==='sukaku')return canonicalJson((generated.data&&generated.data.candidates)||[]);
  return canonicalJson(generated.data||{});
}

if(process.argv[2]==='--worker'){
  const id=process.argv[3],seed=Number(process.argv[4])>>>0;
  const ctx=loadRuntime(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id===id),started=Date.now();
  if(!variant){console.log(JSON.stringify({id,seed,status:'MISSING_VARIANT'}));process.exit(1);}
  try{
    const generated=G.make(variant,seed,'focused');
    const replay=G.make(variant,seed,'focused');
    let exact,classic,puzzleFingerprint,fixedRule=true;
    if(id==='sukaku'){
      exact=countSukakuSolutions(generated.data&&generated.data.candidates,2);
      classic=G.countSolutions(generated.puzzle,2);
      puzzleFingerprint=canonicalJson(generated.data&&generated.data.candidates);
    }else{
      exact=G.countVariantSolutions(generated.puzzle,generated,2);
      classic=G.countSolutions(generated.puzzle,2);
      puzzleFingerprint=canonicalJson(generated.puzzle);
      if(id==='center-dot')fixedRule=centerDotCertificate(generated);
    }
    const replayOk=canonicalJson({solution:generated.solution,puzzle:generated.puzzle,data:generated.data})===canonicalJson({solution:replay.solution,puzzle:replay.puzzle,data:replay.data});
    const flags=generated.generation||{};
    const contractOk=exact===1&&classic>1&&replayOk&&flags.unique===true&&fixedRule;
    console.log(JSON.stringify({id,seed,status:contractOk?'PASS':'CONTRACT_FAIL',ms:Date.now()-started,exact,classic,replayOk,fixedRule,solution:canonicalJson(generated.solution),structure:structuralSolutionFingerprint(generated.solution),topology:auditTopology(id,generated),puzzle:puzzleFingerprint,generation:flags}));
    process.exit(contractOk?0:1);
  }catch(error){
    const message=String(error&&error.message||error);
    const exhausted=/GENERATION_EXHAUSTED|generation exhausted|bounded generation failed|generation failed/i.test(message);
    console.log(JSON.stringify({id,seed,status:exhausted?'EXHAUSTED':'FAIL',ms:Date.now()-started,error:message}));
    process.exit(exhausted?0:1);
  }
}

async function runVariant(id){
  const jobs=Array.from({length:samples},(_,i)=>({id,seed:(0x46330000+ids.indexOf(id)*0x10000+i*0x1f3d)>>>0}));
  const rows=[];let next=0;
  function runJob(job){return new Promise(resolve=>{
    const child=spawn(process.execPath,[self,'--worker',job.id,String(job.seed)],{cwd:root,stdio:['ignore','pipe','pipe']});
    let out='',err='',done=false;
    const timer=setTimeout(()=>{if(done)return;done=true;child.kill('SIGKILL');resolve({id:job.id,seed:job.seed,status:'TIMEOUT',limitMs:perSampleTimeoutMs});},perSampleTimeoutMs);
    child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
    child.on('close',()=>{if(done)return;done=true;clearTimeout(timer);const lines=out.trim().split(/\r?\n/).filter(Boolean);try{resolve(JSON.parse(lines.at(-1)||''));}catch{resolve({id:job.id,seed:job.seed,status:'WORKER_ERROR',error:err.trim().slice(0,240)});}});
  });}
  async function loop(){while(true){const i=next++;if(i>=jobs.length)return;rows[i]=await runJob(jobs[i]);}}
  await Promise.all(Array.from({length:concurrency},()=>loop()));
  const exhausted=rows.filter(r=>r.status==='EXHAUSTED');
  const evaluated=rows.map(r=>r.status==='EXHAUSTED'?{...r,status:'FAIL'}:r);
  const fixedTopology=id==='center-dot';
  const result=summarizeProductionSamples(evaluated,{expectedSamples:samples,requireTopology:!fixedTopology,maxSampleMs:perSampleTimeoutMs});
  const fixedRuleOk=!fixedTopology||rows.every(r=>r.status==='PASS'&&r.fixedRule===true&&r.topology===rows[0].topology);
  const pass=result.pass&&fixedRuleOk;
  return {id,pass,fixedTopology,fixedRuleOk,report:{...result.summary,exhausted:exhausted.length,failureReasons:[...result.failures,...(!fixedRuleOk?[`${id} fixed-rule topology certificate failed`]:[])],failureSamples:rows.filter(r=>r.status!=='PASS').map(r=>({seed:r.seed,status:r.status,exact:r.exact,classic:r.classic,replayOk:r.replayOk,fixedRule:r.fixedRule,error:r.error}))}};
}

const results=[];
for(const id of ids)results.push(await runVariant(id));
const pass=results.every(r=>r.pass);
console.log('FINAL_THREE_PRODUCTION_GATE '+JSON.stringify({variants:ids.length,samplesPerVariant:samples,perSampleTimeoutMs,results}));
for(const r of results){
  console.log(`FINAL_THREE ${r.id} ${r.pass?'PASS':'FAIL'} solution=${r.report.solutionUnique}/${samples} structural=${r.report.structuralSolutionUnique}/${samples} topology=${r.report.topologyUnique}/${samples} puzzle=${r.report.puzzleUnique}/${samples} maxMs=${r.report.maxMs}${r.fixedTopology?` fixedRule=${r.fixedRuleOk?'PASS':'FAIL'}`:''}`);
}
console.log('FINAL_THREE_PRODUCTION_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
