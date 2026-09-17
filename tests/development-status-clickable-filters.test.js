'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');

test('development status summary cards are clickable catalogue filters',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ildi-clickable-status-'));
  const out=path.join(dir,'status.html');

  const run=spawnSync(
    process.execPath,
    ['scripts/build-development-status.mjs',out],
    {cwd:root,encoding:'utf8'}
  );

  assert.equal(run.status,0,run.stderr||run.stdout);

  const html=fs.readFileSync(out,'utf8');

  assert.doesNotMatch(
    html,
    /<strong>106 \/ 106<\/strong>/
  );

  assert.match(
    html,
    /class="card filter-card"[^>]*data-filter-scope="sudoku"/
  );

  assert.match(
    html,
    /data-filter-scope="sudoku"[^>]*data-filter-generator="CATEGORY_A"/
  );

  assert.match(
    html,
    /data-filter-scope="japanese"[^>]*data-filter-base="READY"/
  );

  assert.match(
    html,
    /data-filter-scope="other"[^>]*data-filter-base="READY"/
  );

  assert.match(
    html,
    /data-filter-base-group="further"/
  );

  assert.match(
    html,
    /id="base-status"/
  );

  assert.equal(
    (html.match(/data-scope="sudoku"/g)||[]).length,
    77
  );

  assert.equal(
    (html.match(/data-scope="japanese"/g)||[]).length,
    14
  );

  assert.equal(
    (html.match(/data-scope="other"/g)||[]).length,
    15
  );
});
