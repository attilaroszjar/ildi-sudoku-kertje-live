'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const S=require('../games/classic-human/expert-sculptor.js');
const E=require('../games/classic-human/pool-evaluator.js');

test('expert sculptor is deterministic and bounded',()=>{
  const a=S.makeCandidate(3004),b=S.makeCandidate(3004);
  assert.deepEqual(a,b);
  assert.equal(S.MAX_DEPTH,2);
  assert.equal(S.BEAM_WIDTH,2);
  assert.equal(S.CHILD_LIMIT,27);
  assert.equal(S.BASE_PROFILE_LIMIT,3);
  const ev=E.evaluatePoolCandidate(a);
  assert.equal(ev.reason,E.REASONS.ACCEPTED);
  assert.equal(ev.rating.band,'expert');
});

test('expert sculptor preserves batch identity fields',()=>{
  const c=S.makeCandidate(3000);
  assert.equal(c.seed,3000);
  assert.equal(c.targetBand,'expert');
  assert.equal(c.generatorProfile,S.PROFILE);
  assert.match(c.puzzle,/^[0-9]{81}$/);
});

test('expert sculptor never returns brutal fallback across confirmation seeds',()=>{
  for(let seed=3000;seed<=3011;seed++){
    const c=S.makeCandidate(seed);
    const ev=E.evaluatePoolCandidate(c);
    assert.notEqual(ev.rating&&ev.rating.band,'brutal','seed '+seed+' returned brutal fallback');
    if(ev.reason!==E.REASONS.ACCEPTED)assert.equal(ev.reason,E.REASONS.BAND_MISMATCH);
  }
});
