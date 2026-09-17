import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const gate=path.join(root,'scripts','combined-killer-production-gate.mjs');
const ids=[['killer-palindrome',2],['killer-lockout',8]];
const perSampleTimeoutMs=15000;
const rows=[];

for(const [id,vi] of ids){
  for(let si=0;si<4;si++){
    const seed=(0x78100000+vi*0x10000+si*0x1f3d)>>>0;
    const r=spawnSync(process.execPath,[gate,'--worker',id,String(seed)],{cwd:root,encoding:'utf8',timeout:perSampleTimeoutMs,maxBuffer:1024*1024});
    let row;
    if(r.error&&r.error.code==='ETIMEDOUT')row={id,seed,status:'TIMEOUT',limitMs:perSampleTimeoutMs};
    else{
      const lines=String(r.stdout||'').trim().split(/\r?\n/).filter(Boolean);
      try{row=JSON.parse(lines.at(-1)||'');}
      catch{row={id,seed,status:'WORKER_ERROR',exitCode:r.status,stderr:String(r.stderr||'').trim().slice(0,240)};}
    }
    rows.push(row);
    console.log('COMBINED_KILLER_TIMEOUT_REPLAY '+JSON.stringify({id:row.id,seed:row.seed,status:row.status,ms:row.ms,limitMs:row.limitMs,clues:row.clues,cages:row.cages,componentAttempts:row.componentAttempts}));
  }
}

const timeouts=rows.filter(r=>r.status==='TIMEOUT');
const failures=rows.filter(r=>r.status!=='PASS'&&r.status!=='TIMEOUT');
const passes=rows.filter(r=>r.status==='PASS');
console.log('COMBINED_KILLER_TIMEOUT_REPLAY_SUMMARY '+JSON.stringify({perSampleTimeoutMs,passes:passes.length,timeouts:timeouts.map(r=>({id:r.id,seed:r.seed})),failures:failures.map(r=>({id:r.id,seed:r.seed,status:r.status})),maxMs:passes.length?Math.max(...passes.map(r=>r.ms||0)):null,rows:passes.map(r=>({id:r.id,seed:r.seed,ms:r.ms,clues:r.clues,cages:r.cages,componentAttempts:r.componentAttempts}))}));
