'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');

test('variant solver intersects Classic candidates with Killer cage combinations before MRV',()=>{
  assert.match(src,/function killerCageCandidateMask\(variant,grid,r,c,mask,n\)/);
  assert.match(src,/var killerActive=variant&&\(variant\.kind==='killer'\|\|variant\.kind==='killerskyscrapers'\|\|\(variant\.kind==='combined'&&variant\.kinds&&variant\.kinds\.indexOf\('killer'\)>=0\)\)/);
  assert.match(src,/if\(!mask\|\|!killerActive\|\|!variant\.data\|\|!variant\.data\.cages\)return mask/);
  assert.match(src,/killerCageCombinationMasks\(n,cage\.cells\.length,cage\.sum\)/);
  assert.match(src,/mask&=allowed/);
  const start=src.indexOf('function countVariantSolutions(');
  assert.ok(start>=0);
  const tail=src.slice(start);
  const cageMaskPos=tail.indexOf('mask=killerCageCandidateMask(variant,grid,rr,cc,mask,n)');
  const candidateLoopPos=tail.indexOf('for(var bits=mask;bits;bits&=bits-1)');
  const mrvCountPos=tail.indexOf('var cnt=bitCount(allowed)');
  assert.ok(cageMaskPos>=0,'Killer cage mask must be applied in variant solver');
  assert.ok(candidateLoopPos>cageMaskPos,'Killer cage mask must prune before per-digit variant validation');
  assert.ok(mrvCountPos>candidateLoopPos,'MRV count must use the fully filtered allowed mask');
});
