'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const SCRIPT=fs.readFileSync(path.join(ROOT,'server/brutal-search/micro-pilot.mjs'),'utf8');
const STORE=fs.readFileSync(path.join(ROOT,'server/brutal-search/lib/postgres-store.js'),'utf8');

test('micro pilot is explicitly enabled and hard-capped at fifty seeds',()=>{
  assert.match(SCRIPT,/ILDI_BRUTAL_MICRO_PILOT !== '1'/);
  assert.match(SCRIPT,/ILDI_BRUTAL_PILOT_SEED_COUNT', 25, 1, 50/);
  assert.match(SCRIPT,/ILDI_BRUTAL_PILOT_BATCH_SIZE', 5, 1, 10/);
  assert.match(SCRIPT,/maxElapsedMs: 120000/);
  assert.match(SCRIPT,/maxBatchMs: 30000/);
});

test('micro pilot uses one shared two-connection store and persistent pipeline',()=>{
  assert.match(SCRIPT,/createPostgresStore\(\{ connectionString, maxConnections: 2 \}\)/);
  assert.match(SCRIPT,/createPersistentPhaseBPipeline\(\{ store \}\)/);
  assert.doesNotMatch(SCRIPT,/systemctl|SERVICE_ACTIVE|SERVICE_ENABLED/);
});

test('pilot campaign lifecycle is explicit and stores compact final report',()=>{
  assert.match(STORE,/async createPilotCampaign/);
  assert.match(STORE,/kind: 'bounded-pilot'/);
  assert.match(STORE,/async finalizePilotCampaign/);
  assert.match(STORE,/pilotReport/);
  assert.match(SCRIPT,/BRUTAL_MICRO_PILOT_REPORT:/);
});

test('resource stop reasons pause rather than silently completing the campaign',()=>{
  assert.match(SCRIPT,/\['RANGE_COMPLETE', 'MAX_SEEDS', 'MAX_BATCHES'\]\.includes\(result\.stopReason\) \? 'COMPLETE' : 'PAUSED'/);
  assert.match(SCRIPT,/status: 'FAILED'/);
});
