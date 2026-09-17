'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');

function rowFor(html,id){
  const match=html.match(new RegExp(`<tr[^>]*>\\s*<td><strong>[^<]+</strong><small>${id}</small>[\\s\\S]*?</tr>`));
  assert.ok(match,`missing development-status row for ${id}`);
  return match[0];
}

test('10/10 audited aliases render as Kesz on the public development status page',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ildi-status-alias-'));
  const out=path.join(dir,'status.html');
  const run=spawnSync(process.execPath,['scripts/build-development-status.mjs',out],{cwd:root,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
  const html=fs.readFileSync(out,'utf8');
  for(const id of ['hashiwokakero','samurai']){
    const row=rowFor(html,id);
    assert.match(row,/badge base-READY/);
    assert.match(row,/>Kész<\/span>/);
  }
});
