'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../games/classic-human/pool-evaluator.js');

const EASY='530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const NON_UNIQUE='000000000000000000000000000000000000000000000000000000000000000000000000000000000';
const STALLED='100007090030020008009600500005300900010080002600004000300000010040000007007000300';
function candidate(puzzle,targetBand){return {puzzle:puzzle,targetBand:targetBand||'gentle',generatorProfile:'test-profile',seed:101};}

test('accepts a unique logically solved candidate only in its measured target band',()=>{
  const out=E.evaluatePoolCandidate(candidate(EASY,'gentle'));
  assert.equal(out.reason,E.REASONS.ACCEPTED);
  assert.ok(out.record);
  assert.equal(out.record.band,'gentle');
  assert.equal(out.record.targetBand,'gentle');
  assert.equal(out.record.uniqueness,'UNIQUE');
});

test('rejects malformed or contradictory candidates as INVALID without a record',()=>{
  for(const puzzle of ['bad','110000000'+ '0'.repeat(72)]){
    const out=E.evaluatePoolCandidate(candidate(puzzle));
    assert.equal(out.reason,E.REASONS.INVALID);
    assert.equal(out.record,null);
  }
});

test('rejects multiple-solution candidates before human solving',()=>{
  const out=E.evaluatePoolCandidate(candidate(NON_UNIQUE));
  assert.equal(out.reason,E.REASONS.NON_UNIQUE);
  assert.equal(out.solutionCount,2);
  assert.equal(out.record,null);
  assert.equal(out.rating,undefined);
});

test('rejects bounded human-solver stalls as UNRATED_INCOMPLETE',()=>{
  const out=E.evaluatePoolCandidate(candidate(STALLED,'brutal'));
  assert.equal(out.reason,E.REASONS.UNRATED_INCOMPLETE);
  assert.equal(out.record,null);
  assert.equal(out.rating.score,null);
  assert.equal(out.rating.band,null);
});

test('rejects measured band mismatch without normalizing a pool record',()=>{
  const out=E.evaluatePoolCandidate(candidate(EASY,'focused'));
  assert.equal(out.reason,E.REASONS.BAND_MISMATCH);
  assert.equal(out.record,null);
  assert.equal(out.rating.band,'gentle');
});

test('evaluation is deterministic and solver maxSteps remains bounded',()=>{
  const a=E.evaluatePoolCandidate(candidate(EASY,'gentle'));
  const b=E.evaluatePoolCandidate(candidate(EASY,'gentle'));
  assert.equal(a.record.recordHash,b.record.recordHash);
  assert.equal(a.record.traceHash,b.record.traceHash);
  assert.equal(E.DEFAULT_SOLVER_OPTIONS.maxSteps,10000);
  assert.equal(E.evaluatePoolCandidate(Object.assign(candidate(EASY),{solverOptions:{maxSteps:10001}})).reason,E.REASONS.INVALID);
});
