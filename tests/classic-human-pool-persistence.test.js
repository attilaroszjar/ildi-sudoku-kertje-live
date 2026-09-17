'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const P=require('../games/classic-human/pool-persistence.js');
const B=require('../games/classic-human/pool-batch.js');
const C=require('../games/classic-human/pool-checkpoint.js');
const EASY='530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const EASY2='600120384008459072000006005000264030070080006940003000310000050089700000502000190';
const MULTI='0'.repeat(81);
const ID={targetBand:'gentle',generatorProfile:'persistence-test'};
function make(seed){return {puzzle:seed%3===0?EASY2:seed%2===0?EASY:MULTI};}
function tempFile(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'classic-pool-'));return {dir,file:path.join(dir,'checkpoint.json')};}

test('persistence writes deterministic checkpoint atomically and resumes contiguously',()=>{
  const {dir,file}=tempFile();
  try{
    const first=P.runCheckpointChunk({...ID,checkpointPath:file,startSeed:40,attemptBudget:3,acceptLimit:3,makeCandidate:make});
    assert.equal(first.checkpoint.startSeed,40);
    assert.equal(first.checkpoint.nextSeed,43);
    assert.ok(fs.existsSync(file));
    assert.deepEqual(P.loadCheckpoint(file),C.parse(fs.readFileSync(file,'utf8')));
    assert.equal(fs.readdirSync(dir).filter(name=>name.includes('.tmp-')).length,0);
    const second=P.runCheckpointChunk({...ID,checkpointPath:file,startSeed:999,attemptBudget:5,acceptLimit:5,makeCandidate:make});
    assert.equal(second.batch.startSeed,43);
    assert.equal(second.checkpoint.nextSeed,48);
    assert.equal(second.checkpoint.attempted,8);
    assert.equal(fs.readdirSync(dir).filter(name=>name.includes('.tmp-')).length,0);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('persisted two-chunk resume equals one-shot checkpoint',()=>{
  const {dir,file}=tempFile();
  try{
    P.runCheckpointChunk({...ID,checkpointPath:file,startSeed:60,attemptBudget:3,acceptLimit:3,makeCandidate:make});
    const resumed=P.runCheckpointChunk({...ID,checkpointPath:file,startSeed:60,attemptBudget:5,acceptLimit:5,makeCandidate:make}).checkpoint;
    const one=B.runPoolBatch({...ID,startSeed:60,attemptBudget:8,acceptLimit:8,makeCandidate:make});
    const expected=C.fromBatch(one);
    assert.deepEqual(resumed.records.map(r=>r.recordHash),expected.records.map(r=>r.recordHash));
    assert.deepEqual(resumed.rejections,expected.rejections);
    assert.equal(resumed.duplicates,expected.duplicates);
    assert.equal(resumed.nextSeed,expected.nextSeed);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('resume rejects checkpoint identity drift before overwrite',()=>{
  const {dir,file}=tempFile();
  try{
    P.runCheckpointChunk({...ID,checkpointPath:file,startSeed:80,attemptBudget:1,acceptLimit:1,makeCandidate:make});
    const before=fs.readFileSync(file,'utf8');
    assert.throws(()=>P.runCheckpointChunk({...ID,targetBand:'focused',checkpointPath:file,startSeed:80,attemptBudget:1,acceptLimit:1,makeCandidate:make}),/identity mismatch/);
    assert.equal(fs.readFileSync(file,'utf8'),before);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
