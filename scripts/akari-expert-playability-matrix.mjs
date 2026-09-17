import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const probe=path.join(root,'scripts','akari-expert-playability-baseline.mjs');
const sizes=[5,6,7,8,9];
const seeds=[93001,93017,93043];
let failures=0;
let samples=0;
let slowest={ms:0,label:'n/a'};

for(const size of sizes){
  for(const seed of seeds){
    const started=Date.now();
    const run=spawnSync(process.execPath,[probe,String(seed),String(size)],{
      cwd:root,
      encoding:'utf8',
      maxBuffer:1024*1024
    });
    const elapsed=Date.now()-started;
    samples++;
    const label=`seed=${seed} size=${size}x${size}`;
    if(elapsed>slowest.ms)slowest={ms:elapsed,label};
    const stdout=run.stdout||'';
    const stderr=run.stderr||'';
    const pass=run.status===0&&stdout.includes('AKARI_EXPERT_BASELINE:PASS_LOCAL_IRREDUCIBLE');
    const generation=stdout.split(/\r?\n/).find(line=>line.startsWith('AKARI_EXPERT_GENERATION '))||'';
    const exact=stdout.split(/\r?\n/).find(line=>line.startsWith('AKARI_EXPERT_EXACT '))||'';
    const frontier=stdout.split(/\r?\n/).find(line=>line.startsWith('AKARI_EXPERT_FRONTIER '))||'';
    console.log(`AKARI_EXPERT_MATRIX ${label} elapsedMs=${elapsed} ${pass?'PASS':'FAIL'}`);
    if(generation)console.log(`  ${generation}`);
    if(exact)console.log(`  ${exact}`);
    if(frontier)console.log(`  ${frontier}`);
    if(!pass){
      failures++;
      if(stdout)process.stdout.write(stdout);
      if(stderr)process.stderr.write(stderr);
    }
  }
}

console.log(`AKARI_EXPERT_MATRIX_SUMMARY samples=${samples} failures=${failures} slowestMs=${slowest.ms} slowest=${slowest.label}`);
if(failures){
  console.log('AKARI_EXPERT_MATRIX:FAIL');
  process.exitCode=1;
}else{
  console.log('AKARI_EXPERT_MATRIX:PASS');
}
