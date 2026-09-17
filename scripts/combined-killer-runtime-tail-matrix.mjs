import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const worker=path.join(root,'scripts','combined-killer-runtime-tail-diagnostic.mjs');
const ids=['killer-palindrome','killer-zipper','killer-modular','killer-renban','killer-dutch-whispers'];
const seedsById={
  'killer-palindrome':[0x6b4b1262,0x74630202,0x735d21a5],
  'killer-zipper':[0x6b4b12c3,0x74640303,0x735e3298],
  'killer-modular':[0x6b4b1385,0x74660505,0x7360507e],
  'killer-renban':[0x6b4b13e6,0x74670606,0x73616171],
  'killer-dutch-whispers':[0x6b4b1447,0x74680707,0x73627264]
};
const perSampleTimeoutMs=10000;
const rows=[];
for(const id of ids){
  for(const seed of seedsById[id]){
    const r=spawnSync(process.execPath,[worker,'--worker',id,String(seed>>>0)],{cwd:root,encoding:'utf8',timeout:perSampleTimeoutMs,maxBuffer:1024*1024});
    if(r.error&&r.error.code==='ETIMEDOUT'){
      const row={id,seed:seed>>>0,status:'TIMEOUT',limitMs:perSampleTimeoutMs};rows.push(row);console.log('COMBINED_KILLER_TAIL '+JSON.stringify(row));continue;
    }
    const lines=String(r.stdout||'').trim().split(/\r?\n/).filter(Boolean);
    let row=null;
    try{row=JSON.parse(lines.at(-1)||'');}catch{}
    if(!row)row={id,seed:seed>>>0,status:'WORKER_ERROR',exitCode:r.status};
    rows.push(row);console.log('COMBINED_KILLER_TAIL '+JSON.stringify(row));
  }
}
const byVariant={};
for(const id of ids){
  const rs=rows.filter(r=>r.id===id),pass=rs.filter(r=>r.status==='PASS'),times=pass.map(r=>r.ms).sort((a,b)=>a-b);
  byVariant[id]={samples:rs.length,passes:pass.length,timeouts:rs.filter(r=>r.status==='TIMEOUT').length,failures:rs.filter(r=>r.status!=='PASS'&&r.status!=='TIMEOUT').length,medianMs:times.length?times[Math.floor(times.length/2)]:null,maxMs:times.length?times.at(-1):null};
}
console.log('COMBINED_KILLER_TAIL_SUMMARY '+JSON.stringify({perSampleTimeoutMs,byVariant,rows}));
