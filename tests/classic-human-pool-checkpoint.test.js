'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const B=require('../games/classic-human/pool-batch.js');
const C=require('../games/classic-human/pool-checkpoint.js');
const EASY='530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const EASY2='600120384008459072000006005000264030070080006940003000310000050089700000502000190';
const MULTI='0'.repeat(81);
const ID={targetBand:'gentle',generatorProfile:'checkpoint-test'};
function make(seed){return {puzzle:seed%3===0?EASY2:seed%2===0?EASY:MULTI};}
function run(extra){return B.runPoolBatch({...ID,...extra,makeCandidate:make});}

test('checkpoint round-trips deterministically and resumes at next seed',()=>{
  const first=run({startSeed:10,attemptBudget:3,acceptLimit:3});
  const cp1=C.fromBatch(first);
  const text=C.serialize(cp1);
  assert.equal(C.serialize(C.parse(text)),text);
  assert.equal(cp1.schemaVersion,C.SCHEMA_VERSION);
  assert.equal(cp1.targetBand,ID.targetBand);
  assert.equal(cp1.generatorProfile,ID.generatorProfile);
  assert.equal(cp1.solverVersion,first.solverVersion);
  assert.equal(cp1.raterVersion,first.raterVersion);
  const second=run({startSeed:cp1.nextSeed,attemptBudget:2,acceptLimit:2,existingRecords:cp1.records});
  const cp2=C.fromBatch(second,cp1);
  assert.equal(cp2.startSeed,10);
  assert.equal(cp2.nextSeed,15);
  assert.equal(cp2.attempted,5);
});

test('checkpoint rejects gaps, overlap, duplicate records and identity mismatch',()=>{
  const first=run({startSeed:20,attemptBudget:1,acceptLimit:1});
  const cp=C.fromBatch(first);
  const gap=run({startSeed:22,attemptBudget:1,acceptLimit:1});
  assert.throws(()=>C.fromBatch(gap,cp),/contiguous/);
  if(cp.records.length)assert.throws(()=>C.normalizeCheckpoint({...cp,records:cp.records.concat(cp.records)}),/duplicate/);
  assert.throws(()=>C.normalizeCheckpoint({...cp,nextSeed:99}),/nextSeed mismatch/);
  assert.throws(()=>C.fromBatch({...first,targetBand:'focused'},cp),/identity mismatch: targetBand/);
  assert.throws(()=>C.fromBatch({...first,generatorProfile:'other'},cp),/identity mismatch: generatorProfile/);
  assert.throws(()=>C.fromBatch({...first,solverVersion:'other'},cp),/identity mismatch: solverVersion/);
  assert.throws(()=>C.fromBatch({...first,raterVersion:'other'},cp),/identity mismatch: raterVersion/);
});

test('one-shot and checkpoint resume are equivalent for the same seed range',()=>{
  const one=run({startSeed:30,attemptBudget:8,acceptLimit:8});
  const first=run({startSeed:30,attemptBudget:3,acceptLimit:3});
  const cp1=C.fromBatch(first);
  const second=run({startSeed:cp1.nextSeed,attemptBudget:5,acceptLimit:5,existingRecords:cp1.records});
  const cp2=C.fromBatch(second,cp1);
  assert.deepEqual(cp2.records.map(r=>r.recordHash),one.accepted.map(r=>r.recordHash));
  assert.deepEqual(cp2.rejections,one.rejections);
  assert.equal(cp2.duplicates,one.duplicates);
  assert.equal(cp2.nextSeed,one.nextSeed);
  assert.equal(cp2.attempted,one.attempted);
});
