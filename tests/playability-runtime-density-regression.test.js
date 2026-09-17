'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');

function runRuntimeDensitySample(){
  const result=spawnSync(process.execPath,['scripts/playability-runtime-density-sample.mjs'],{
    cwd:root,
    encoding:'utf8',
    timeout:20000
  });
  assert.equal(result.error,undefined,result.error&&result.error.message);
  assert.equal(result.status,0,`runtime density sampler failed\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim().split(/\r?\n/);
}

test('first runtime density wave stays below warning ceilings and preserves production contracts',()=>{
  const lines=runRuntimeDensitySample();
  assert.match(lines[0],/^PLAYABILITY_RUNTIME_SAMPLE targets=7 difficulties=3 seeds=3 generated=63$/);

  const rows=lines.filter(line=>line.startsWith('RUNTIME_DENSITY '));
  assert.equal(rows.length,21);

  for(const line of rows){
    assert.match(line,/ warnings=0\/3(?: |$)/,line);
    assert.match(line,/ unique=3\/3(?: |$)/,line);
    assert.match(line,/ essential=3\/3(?: |$)/,line);
  }
});
