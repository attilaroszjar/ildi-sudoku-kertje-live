'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');

test('public status page exposes the 14-game Japanese logic focus separately',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ildi-japanese-status-'));
  const out=path.join(dir,'status.html');

  const run=spawnSync(
    process.execPath,
    ['scripts/build-development-status.mjs',out],
    {cwd:root,encoding:'utf8'}
  );

  assert.equal(run.status,0,run.stderr||run.stdout);

  const html=fs.readFileSync(out,'utf8');

  assert.match(html,/<h2>Aktuális japán fejlesztési fókusz<\/h2>/);
  assert.match(html,/<strong>14<\/strong>Összes japán játék/);
  assert.match(html,/14 kiemelt játék/);
  assert.match(html,/id="scope"/);
  assert.match(html,/Aktuális japán fókusz \(14\)/);

  assert.equal(
    (html.match(/data-japanese="1"/g)||[]).length,
    14,
    'exactly the 14 Japanese focus games must be marked'
  );

  assert.match(
    html,
    /77 \/ 77<\/strong>Teljesen kész/,
    'Sudoku generator summary must remain intact'
  );
});
