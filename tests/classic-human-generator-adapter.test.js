'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../games/classic-human/generator-adapter.js');

test('adapter is deterministic and returns evaluator-ready classic candidates',()=>{
  for(const band of ['gentle','focused','expert'])for(const seed of [1,17,101]){
    const a=A.makeCandidate(seed,band),b=A.makeCandidate(seed,band);
    assert.deepEqual(a,b,band+' '+seed+' deterministic');
    assert.match(a.puzzle,/^[0-9]{81}$/);
    assert.equal(a.targetBand,band);
    assert.equal(a.generatorProfile,A.PROFILE);
    assert.equal(a.seed,seed);
    assert.ok(Number.isFinite(a.runtimeDifficultyScore)&&a.runtimeDifficultyScore>0);
  }
});

test('adapter validates seed and band before generator work',()=>{
  assert.throws(()=>A.makeCandidate(-1,'gentle'),/seed/);
  assert.throws(()=>A.makeCandidate(1,'brutal'),/targetBand/);
});
