'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const regionSrc=fs.readFileSync(path.join(root,'games/region-sum-runtime-hardening.js'),'utf8');
const finalSrc=fs.readFileSync(path.join(root,'games/little-killer-layout-final-hardening.js'),'utf8');

test('shared Region Sum observer does not mutate Little Killer marker text',()=>{
  const install=regionSrc.slice(regionSrc.indexOf('function installUiHardening()'));
  assert.ok(install.includes('correctRegionSumClasses(host)'),'Region Sum correction must remain installed');
  assert.ok(!install.includes('correctLittleKillerLayout(host)'),'shared observer must not call Little Killer layout correction');
});

test('dedicated Little Killer hardening performs idempotent sum writes and SVG vector synchronization only',()=>{
  assert.match(finalSrc,/setIfChanged\(sumNode,'textContent',String\(p\.sum\)\)/);
  assert.match(finalSrc,/ensureVectorLayer/);
  assert.match(finalSrc,/syncVectors/);
  assert.match(finalSrc,/marker-end/);
  assert.match(finalSrc,/lkCanonical/);
  assert.doesNotMatch(finalSrc,/marker\.textContent\s*=/);
  assert.doesNotMatch(finalSrc,/new ResizeObserver/);
});
