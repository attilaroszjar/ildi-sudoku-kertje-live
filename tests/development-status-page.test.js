'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');

test('development status page covers all 106 catalogue entries and canonical 77 generator states',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ildi-status-'));
  const out=path.join(dir,'status.html');
  const run=spawnSync(process.execPath,['scripts/build-development-status.mjs',out],{cwd:root,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
  assert.match(run.stdout,/DEVELOPMENT_STATUS BUILT games=106 sudoku=77 categoryA=77 reconcile=0 partial=0 legacy=0 static=0/);
  const html=fs.readFileSync(out,'utf8');
  assert.equal((html.match(/<tr data-generator=/g)||[]).length,106);
  for(const status of ['READY','AUDITED','VERIFIED','BASELINE'])assert.match(html,new RegExp(`base-${status}`));
  for(const status of ['CATEGORY_A','RECONCILE','PARTIAL','LEGACY','STATIC_GENERIC','N_A'])assert.match(html,new RegExp(`gen-${status}`));
  assert.match(html,/77 \/ 77<\/strong>Teljesen kész/);
  for(const label of ['Majdnem kész','Fejlesztés alatt','Régi generátor','Új generátor kell'])assert.match(html,new RegExp(label));
  assert.match(html,/77 darab 9×9-es Sudoku-változatot/);
  assert.match(html,/Little Killer/);
  assert.match(html,/Hyper \/ Windoku/);
  assert.match(html,/Rossini/);
  assert.match(html,/Sandwich/);
  assert.match(html,/<small>even-sandwich<\/small>/);
  assert.match(html,/<small>next-to-nine<\/small>/);
  assert.match(html,/<small>numbered-rooms<\/small>/);
  assert.match(html,/<small>battenburg<\/small>/);
  assert.match(html,/<small>minmax<\/small>/);
  assert.match(html,/<small>quad-sums<\/small>/);
  assert.match(html,/<small>top-heavy-parity<\/small>/);
  assert.match(html,/<small>couples<\/small>/);
  assert.match(html,/<small>reflection<\/small>/);
  assert.match(html,/<small>slingshot<\/small>/);
  assert.match(html,/<small>bishopsgate<\/small>/);
  assert.match(html,/<small>axia<\/small>/);
  assert.match(html,/<small>ascending-sequences<\/small>/);
  assert.match(html,/<small>running-cells<\/small>/);
  assert.match(html,/<small>anti-queen-9<\/small>/);
  assert.match(html,/<small>center-dot<\/small>/);
  assert.match(html,/<small>frame<\/small>/);
  assert.match(html,/<small>sukaku<\/small>/);
  assert.match(html,/<small>jigsaw<\/small>/);
  assert.match(html,/<small>miracle<\/small>/);
  assert.match(html,/<small>skyscraper<\/small>/);
  assert.match(html,/Fejlesztési állapot/);
  assert.doesNotMatch(html,/strict production contract|variant-aware újrahardening|Canonical repo-audit/);
});

test('canonical 10/10 quality audit remains authoritative for the separate base-audit column',()=>{
  const src=fs.readFileSync(path.join(root,'scripts/build-development-status.mjs'),'utf8');
  assert.match(src,/docs\/game-quality-status\.md/);
  assert.ok(src.indexOf("if(quality10(v))")<src.indexOf("if(override)return"),'canonical quality gate must precede manual override');
  const quality=fs.readFileSync(path.join(root,'docs/game-quality-status.md'),'utf8');
  for(const game of ['Hyper / Windoku','Thermo Sudoku','Kropki Sudoku','XV Sudoku','Rossini Sudoku']){
    assert.match(quality,new RegExp(`\\| ${game.replace('/','\\/')} \\| 10\\/10 \\|`));
  }
});

test('publish command carries a versioned live-only status link to avoid stale pages',()=>{
  const src=fs.readFileSync(path.join(root,'scripts/publish-ildi.mjs'),'utf8');
  assert.match(src,/build-development-status\.mjs/);
  assert.match(src,/status\.html\?v=/);
  assert.match(src,/encodeURIComponent\(sourceHead\)/);
  assert.match(src,/Fejlesztési állapot/);
  assert.match(src,/git\(\['add','index\.html','status\.html'\]/);
});
