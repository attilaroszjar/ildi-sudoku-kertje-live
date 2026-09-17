'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const ROOT=path.resolve(__dirname,'..');
const MIGRATION=fs.readFileSync(path.join(ROOT,'server/brutal-search/migrations/004_phase_b_fingerprint_corpus.sql'),'utf8');
const GATE=fs.readFileSync(path.join(ROOT,'server/brutal-search/sql/phase-b-integration.sql'),'utf8');

async function loadPipeline(){
  return import(pathToFileURL(path.join(ROOT,'server/brutal-search/lib/phase-b-pipeline.js')).href);
}

const PUZZLE='530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const RECORD=Object.freeze({
  recordHash:'record:test',puzzleHash:'puzzle:test',traceHash:'trace:test',band:'brutal',targetBand:'brutal',score:240,
  hardestTechnique:'aic',dependencyDepth:3
});

test('migration encodes restart-safe fingerprint ownership and sparse accepted corpus',()=>{
  assert.match(MIGRATION,/PRIMARY KEY \(domain, fingerprint\)/);
  assert.match(MIGRATION,/UNIQUE \(campaign_id, seed\)/);
  assert.match(MIGRATION,/RETURN v_campaign_id = p_campaign_id AND v_seed = p_seed/);
  assert.match(MIGRATION,/CREATE TABLE IF NOT EXISTS corpus\.classic_brutal_records/);
  assert.match(MIGRATION,/ON CONFLICT \(campaign_id, seed\) DO NOTHING/);
  assert.match(MIGRATION,/accepted record must be brutal/);
});

test('PostgreSQL integration gate covers typed claim replay duplicate and materialization replay',()=>{
  assert.match(GATE,/first fingerprint claim must succeed/);
  assert.match(GATE,/same campaign\+seed replay must remain owned/);
  assert.match(GATE,/different seed must see duplicate fingerprint/);
  assert.match(GATE,/accepted materialization replay must be idempotent/);
  assert.match(GATE,/24::smallint/);
  assert.match(GATE,/PHASE_B_DB_GATE:PASS/);
  assert.match(GATE,/ROLLBACK;/);
});

test('persistent pipeline delegates fingerprint and accepted record to the shared store',async()=>{
  const P=await loadPipeline();
  const calls=[];
  const store={
    async claimClassicFingerprint(args){calls.push(['claim',args]);return true;},
    async materializeClassicBrutalRecord(args){calls.push(['materialize',args]);return true;}
  };
  const pipeline=P.createPersistentPhaseBPipeline({
    store,
    generate:async(seed)=>({puzzle:PUZZLE,targetBand:'brutal',generatorProfile:'fixture',seed}),
    countSolutions:async()=>1,
    prescreen:async()=>({pass:true,status:'STALLED',rating:null}),
    fullAudit:async()=>({reason:'ACCEPTED',record:RECORD})
  });
  const campaign={id:7,targetCount:2,acceptedCount:0,status:'RUNNING'};
  const out=await pipeline.processSeed(10,{campaign});
  assert.equal(out.reason,P.REJECTION.ACCEPTED);
  assert.equal(calls.length,2);
  assert.equal(calls[0][0],'claim');
  assert.equal(calls[0][1].campaignId,7);
  assert.equal(calls[0][1].seed,10);
  assert.equal(calls[1][0],'materialize');
  assert.equal(calls[1][1].campaignId,7);
  assert.equal(calls[1][1].record,RECORD);
});

test('persistent pipeline fails closed without campaign identity or corpus-capable store',async()=>{
  const P=await loadPipeline();
  assert.throws(()=>P.createPersistentPhaseBPipeline({store:{}}),/corpus-capable store/);
  const store={
    async claimClassicFingerprint(){return true;},
    async materializeClassicBrutalRecord(){return true;}
  };
  const pipeline=P.createPersistentPhaseBPipeline({
    store,
    generate:async(seed)=>({puzzle:PUZZLE,targetBand:'brutal',generatorProfile:'fixture',seed}),
    countSolutions:async()=>1,
    prescreen:async()=>({pass:true}),
    fullAudit:async()=>({reason:'ACCEPTED',record:RECORD})
  });
  await assert.rejects(()=>pipeline.processSeed(10,{}),/campaign\.id is required/);
});
