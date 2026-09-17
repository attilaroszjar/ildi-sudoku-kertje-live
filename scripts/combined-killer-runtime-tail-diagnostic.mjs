import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=['killer-thermo','killer-arrow','killer-palindrome','killer-zipper','killer-entropic','killer-modular','killer-renban','killer-dutch-whispers','killer-lockout'];
const worker=process.argv[2]==='--worker';

if(worker){
  const id=process.argv[3],seed=Number(process.argv[4])>>>0;
  const files=[
    'games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-bank-iteration3.js','games/sudoku-generator.js',
    'games/line-generator-core.js','games/killer-generator.js','games/line-generator-directed.js','games/line-generator-arrow.js',
    'games/line-generator-proven-siblings.js','games/line-generator-symmetric.js','games/line-generator-sliding-triple.js',
    'games/line-generator-whole-set.js','games/line-generator-transition.js','games/combined-killer-generator.js'
  ];
  const ctx={console,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
  const variant=ctx.SudokuBank.find(v=>v.id===id);
  if(!variant){console.log(JSON.stringify({id,seed,status:'MISSING_VARIANT'}));process.exit(2);}
  const t0=performance.now();
  try{
    const generated=ctx.CombinedKillerGenerator.makeVariantPilot(ctx.SudokuGenerator,variant,seed,'focused',{maxAttempts:8});
    const g=generated.generation||{};
    console.log(JSON.stringify({id,seed,status:'PASS',ms:Math.round((performance.now()-t0)*10)/10,clues:g.clues,cages:g.cageCount,componentAttempts:g.componentSearchAttempts}));
  }catch(error){
    console.log(JSON.stringify({id,seed,status:'FAIL',ms:Math.round((performance.now()-t0)*10)/10,error:String(error&&error.message||error)}));
    process.exit(1);
  }
  process.exit(0);
}

const perVariantTimeoutMs=15000;
const rows=[];
for(let i=0;i<ids.length;i++){
  const id=ids[i],seed=(0x74610000+i*0x10101)>>>0;
  const r=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--worker',id,String(seed)],{cwd:root,encoding:'utf8',timeout:perVariantTimeoutMs,maxBuffer:1024*1024});
  if(r.error&&r.error.code==='ETIMEDOUT'){
    const row={id,seed,status:'TIMEOUT',limitMs:perVariantTimeoutMs};rows.push(row);console.log('COMBINED_KILLER_RUNTIME '+JSON.stringify(row));continue;
  }
  const lines=String(r.stdout||'').trim().split(/\r?\n/).filter(Boolean);
  let row=null;
  try{row=JSON.parse(lines.at(-1)||'');}catch{}
  if(!row)row={id,seed,status:'WORKER_ERROR',exitCode:r.status,stderr:String(r.stderr||'').trim().slice(0,300)};
  rows.push(row);console.log('COMBINED_KILLER_RUNTIME '+JSON.stringify(row));
}
const timeouts=rows.filter(r=>r.status==='TIMEOUT').map(r=>r.id);
const failures=rows.filter(r=>r.status!=='PASS'&&r.status!=='TIMEOUT').map(r=>r.id);
console.log('COMBINED_KILLER_RUNTIME_SUMMARY '+JSON.stringify({perVariantTimeoutMs,timeouts,failures,rows}));
