'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const B=require('../games/classic-human/pool-batch.js');
const EASY='530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const MULTI='0'.repeat(81);
const ID={targetBand:'gentle',generatorProfile:'batch-test'};
function candidate(seed){return {puzzle:seed%2===0?EASY:MULTI,targetBand:'expert',generatorProfile:'untrusted-callback'};}
function run(extra){return B.runPoolBatch({...ID,...extra});}

test('batch is deterministic, seed ordered and owns candidate identity',()=>{
  const a=run({startSeed:10,attemptBudget:8,acceptLimit:2,makeCandidate:candidate});
  const b=run({startSeed:10,attemptBudget:8,acceptLimit:2,makeCandidate:candidate});
  assert.equal(a.attempted,8);
  assert.equal(a.acceptedCount,1);
  assert.equal(a.accepted[0].targetBand,'gentle');
  assert.equal(a.accepted[0].generatorProfile,'batch-test');
  assert.equal(a.duplicates,3);
  assert.equal(a.rejections.NON_UNIQUE,4);
  assert.equal(a.rejectedCount,4);
  assert.equal(a.nextSeed,18);
  assert.equal(a.exhausted,true);
  assert.deepEqual(a,b);
});

test('batch stops early once distinct acceptance limit is reached',()=>{
  const puzzles=[EASY,'600120384008459072000006005000264030070080006940003000310000050089700000502000190'];
  const out=run({startSeed:20,attemptBudget:8,acceptLimit:2,makeCandidate:(seed,offset)=>({puzzle:puzzles[offset]})});
  assert.equal(out.attempted,2);
  assert.equal(out.acceptedCount,2);
  assert.equal(out.duplicates,0);
  assert.equal(out.nextSeed,22);
  assert.equal(out.exhausted,false);
});

test('batch exhausts a strict attempt budget and exposes aggregate rejection counts',()=>{
  const out=run({startSeed:1,attemptBudget:4,acceptLimit:4,makeCandidate:()=>({puzzle:MULTI})});
  assert.equal(out.attempted,4);
  assert.equal(out.acceptedCount,0);
  assert.equal(out.rejectedCount,4);
  assert.equal(out.rejections.NON_UNIQUE,4);
  assert.equal(out.exhausted,true);
  assert.equal(out.nextSeed,5);
});

test('batch validates identity and complete safe seed range before doing work',()=>{
  let calls=0;
  const makeCandidate=()=>{calls++;return candidate(2);};
  assert.throws(()=>run({attemptBudget:0,makeCandidate}),/attemptBudget/);
  assert.throws(()=>run({attemptBudget:B.MAX_ATTEMPTS+1,makeCandidate}),/attemptBudget/);
  assert.throws(()=>run({attemptBudget:2,acceptLimit:3,makeCandidate}),/acceptLimit/);
  assert.throws(()=>B.runPoolBatch({startSeed:-1,attemptBudget:1,...ID,makeCandidate}),/startSeed/);
  assert.throws(()=>B.runPoolBatch({startSeed:Number.MAX_SAFE_INTEGER,attemptBudget:1,...ID,makeCandidate}),/seed range/);
  assert.throws(()=>B.runPoolBatch({startSeed:0,attemptBudget:1,targetBand:'gentle',makeCandidate}),/generatorProfile/);
  assert.throws(()=>B.runPoolBatch({startSeed:0,attemptBudget:1,generatorProfile:'x',makeCandidate}),/targetBand/);
  assert.throws(()=>run({startSeed:0,attemptBudget:1,makeCandidate,onAttempt:true}),/onAttempt/);
  assert.equal(calls,0);
});

test('optional attempt observation reports result, duplicate state and runtime without changing batch result',()=>{
  const observed=[];
  const withObservation=run({startSeed:10,attemptBudget:4,acceptLimit:4,makeCandidate:candidate,onAttempt:item=>observed.push(item)});
  const plain=run({startSeed:10,attemptBudget:4,acceptLimit:4,makeCandidate:candidate});
  assert.deepEqual(withObservation,plain);
  assert.equal(observed.length,4);
  assert.deepEqual(observed.map(x=>x.seed),[10,11,12,13]);
  assert.equal(observed[0].result.reason,'ACCEPTED');
  assert.equal(observed[2].duplicate,true);
  assert.ok(observed.every(x=>Number.isFinite(x.elapsedMs)&&x.elapsedMs>=0));
});
