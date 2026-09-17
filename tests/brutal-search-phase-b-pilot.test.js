'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const ROOT=path.resolve(__dirname,'..');
async function load(name){return import(pathToFileURL(path.join(ROOT,'server/brutal-search/lib',name)).href);}

function counters(searched, accepted=0){
  return {
    searchedCount:searched,
    generatedCount:searched,
    invalidCount:0,
    structuralRejectCount:0,
    duplicateCount:0,
    nonUniqueCount:0,
    prescreenRejectCount:0,
    fullAuditCount:accepted,
    brutalRejectCount:0,
    diversityRejectCount:0,
    candidateCount:accepted,
    acceptedCount:accepted,
  };
}

test('pilot observer separates fingerprint materialization and checkpoint writes',async()=>{
  const I=await load('pilot-instrumentation.js');
  let now=0;
  const observer=I.createPilotObserver({
    policy:{maxSeeds:100,maxBatches:10,maxElapsedMs:10000,maxBatchMs:5000,maxLoadPerCpu:1,minFreeMemoryMb:128,maxDbWritesPerSeed:1.1},
    clock:()=>now,
    resourceSampler:()=>({load1:0.1,loadPerCpu:0.1,freeMemoryMb:4096,rssMb:100})
  });
  observer.beginBatch();
  now=1000;
  const metric=observer.endBatch(counters(20,1));
  const snap=observer.snapshot();
  assert.equal(metric.seedsPerSecond,20);
  assert.equal(snap.totals.searchedCount,20);
  assert.equal(snap.funnel.accepted,1);
  assert.equal(snap.estimatedFingerprintWrites,20);
  assert.equal(snap.estimatedMaterializationWrites,1);
  assert.equal(snap.estimatedCorpusWrites,21);
  assert.equal(snap.estimatedCheckpointWrites,1);
  assert.equal(snap.estimatedDbWrites,22);
  assert.equal(snap.fingerprintWritesPerSeed,1);
  assert.equal(snap.materializationWritesPerSeed,0.05);
  assert.equal(snap.corpusWritesPerSeed,1.05);
  assert.equal(snap.checkpointWritesPerSeed,0.05);
  assert.equal(snap.dbWritesPerSeed,1.1);
  assert.equal(metric.stopReason,null);
});

test('pilot stop policy reacts to seed batch latency load memory and fingerprint-write limits',async()=>{
  const I=await load('pilot-instrumentation.js');
  const base={maxSeeds:10,maxBatches:2,maxElapsedMs:1000,maxBatchMs:100,maxLoadPerCpu:0.5,minFreeMemoryMb:1000,maxDbWritesPerSeed:1.2};
  const totals={...I.emptyTotals(),searchedCount:10,generatedCount:10};
  assert.equal(I.evaluatePilotStop({policy:base,totals,batches:1,elapsedMs:10,lastBatchMs:10,resources:{loadPerCpu:0.1,freeMemoryMb:2000},fingerprintWrites:10}),'MAX_SEEDS');
  assert.equal(I.evaluatePilotStop({policy:{...base,maxSeeds:20},totals,batches:2,elapsedMs:10,lastBatchMs:10,resources:{loadPerCpu:0.1,freeMemoryMb:2000},fingerprintWrites:10}),'MAX_BATCHES');
  assert.equal(I.evaluatePilotStop({policy:{...base,maxSeeds:20,maxBatches:3},totals,batches:1,elapsedMs:10,lastBatchMs:101,resources:{loadPerCpu:0.1,freeMemoryMb:2000},fingerprintWrites:10}),'BATCH_LATENCY');
  assert.equal(I.evaluatePilotStop({policy:{...base,maxSeeds:20,maxBatches:3},totals,batches:1,elapsedMs:10,lastBatchMs:10,resources:{loadPerCpu:0.6,freeMemoryMb:2000},fingerprintWrites:10}),'LOAD_PRESSURE');
  assert.equal(I.evaluatePilotStop({policy:{...base,maxSeeds:20,maxBatches:3},totals,batches:1,elapsedMs:10,lastBatchMs:10,resources:{loadPerCpu:0.1,freeMemoryMb:900},fingerprintWrites:10}),'MEMORY_PRESSURE');
  assert.equal(I.evaluatePilotStop({policy:{...base,maxSeeds:20,maxBatches:3},totals,batches:1,elapsedMs:10,lastBatchMs:10,resources:{loadPerCpu:0.1,freeMemoryMb:2000},fingerprintWrites:13}),'DB_WRITE_RATE');
});

test('bounded pilot never exceeds maxSeeds or 100-seed batch ceiling',async()=>{
  const B=await load('bounded-pilot.js');
  const calls=[];
  const processBatch=async({seedStart,seedEnd})=>{
    calls.push([seedStart,seedEnd]);
    return {nextSeed:seedEnd,counters:counters(seedEnd-seedStart,0)};
  };
  let tick=0;
  const I=await load('pilot-instrumentation.js');
  const observer=I.createPilotObserver({
    policy:{maxSeeds:55,maxBatches:10,maxElapsedMs:100000,maxBatchMs:10000,maxLoadPerCpu:10,minFreeMemoryMb:1,maxDbWritesPerSeed:2},
    clock:()=>tick+=10,
    resourceSampler:()=>({load1:0,loadPerCpu:0,freeMemoryMb:9999,rssMb:50})
  });
  const out=await B.runBoundedPilot({processBatch,campaign:{id:1},seedStart:0,seedEnd:1000,batchSize:25,observer});
  assert.deepEqual(calls,[[0,25],[25,50],[50,55]]);
  assert.equal(out.nextSeed,55);
  assert.equal(out.stopReason,'MAX_SEEDS');
  assert.equal(out.report.totals.searchedCount,55);
});

test('bounded pilot fails closed on non-exact batch checkpoint',async()=>{
  const B=await load('bounded-pilot.js');
  await assert.rejects(()=>B.runBoundedPilot({
    processBatch:async({seedEnd})=>({nextSeed:seedEnd-1,counters:counters(1)}),
    campaign:{id:1},seedStart:0,seedEnd:10,batchSize:5,
    policy:{maxSeeds:10,maxBatches:2,maxElapsedMs:1000,maxBatchMs:1000,maxLoadPerCpu:10,minFreeMemoryMb:1,maxDbWritesPerSeed:2}
  }),/checkpoint exactly/);
});
