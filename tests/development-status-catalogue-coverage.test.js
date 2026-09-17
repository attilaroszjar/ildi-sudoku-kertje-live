'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');

test('status page partitions all 106 games into the three visible dashboard groups',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ildi-catalogue-status-'));
  const out=path.join(dir,'status.html');

  const run=spawnSync(
    process.execPath,
    ['scripts/build-development-status.mjs',out],
    {cwd:root,encoding:'utf8'}
  );

  assert.equal(run.status,0,run.stderr||run.stdout);

  const html=fs.readFileSync(out,'utf8');

  // The redundant global 106/106 summary is intentionally gone.
  assert.doesNotMatch(html,/<h2>Teljes játékkatalógus<\/h2>/);
  assert.doesNotMatch(html,/<strong>106 \/ 106<\/strong>/);

  // The three dashboard groups are visible.
  assert.match(html,/<h2>Sudoku-generátorok<\/h2>/);
  assert.match(html,/<h2>Aktuális japán fejlesztési fókusz<\/h2>/);
  assert.match(html,/<h2>További játékok<\/h2>/);

  // Every catalogue entry belongs to exactly one top-level scope.
  const sudoku=(html.match(/data-scope="sudoku"/g)||[]).length;
  const japanese=(html.match(/data-scope="japanese"/g)||[]).length;
  const other=(html.match(/data-scope="other"/g)||[]).length;

  assert.equal(sudoku,77);
  assert.equal(japanese,14);
  assert.equal(other,15);
  assert.equal(sudoku+japanese+other,106);

  // Each group has its own clickable "all" card.
  assert.match(
    html,
    /class="card filter-card"[^>]*data-filter-scope="sudoku"[^>]*><strong>77<\/strong>Összes Sudoku/
  );

  assert.match(
    html,
    /class="card filter-card"[^>]*data-filter-scope="japanese"[^>]*><strong>14<\/strong>Összes japán játék/
  );

  assert.match(
    html,
    /class="card filter-card"[^>]*data-filter-scope="other"[^>]*><strong>15<\/strong>Összes további játék/
  );

  // The explicit scope selector mirrors the same partition.
  assert.match(html,/Aktuális japán fókusz \(14\)/);
  assert.match(html,/További játékok \(15\)/);
});
