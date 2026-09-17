'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const H=require('../games/classic-human/human-guided-generator.js');
const E=require('../games/classic-human/pool-evaluator.js');

test('human-guided generator is deterministic and bounded',()=>{
  const a=H.makeCandidate(3000,'expert');
  const b=H.makeCandidate(3000,'expert');
  assert.deepEqual(a,b);
  assert.equal(a.generatorProfile,H.PROFILE);
  assert.equal(a.seed,3000);
  assert.equal(a.targetBand,'expert');
  assert.match(a.puzzle,/^[0-9]{81}$/);
});

test('zero removal budget reproduces the base profile puzzle shape',()=>{
  const out=H.makeCandidate(2000,'focused',{maxRemovalAttempts:0});
  const evaluated=E.evaluatePoolCandidate(out);
  assert.ok([E.REASONS.ACCEPTED,E.REASONS.BAND_MISMATCH].includes(evaluated.reason));
});

test('removal budget is strictly capped',()=>{
  assert.throws(()=>H.makeCandidate(1,'expert',{maxRemovalAttempts:H.MAX_REMOVAL_ATTEMPTS+1}),/maxRemovalAttempts/);
  assert.throws(()=>H.makeCandidate(1,'expert',{maxRemovalAttempts:-1}),/maxRemovalAttempts/);
  assert.throws(()=>H.makeCandidate(-1,'expert'),/seed/);
  assert.throws(()=>H.makeCandidate(1,'brutal'),/targetBand/);
});
