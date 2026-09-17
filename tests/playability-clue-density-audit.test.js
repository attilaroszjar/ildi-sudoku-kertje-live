'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

const modelUrl=pathToFileURL(path.resolve(__dirname,'../scripts/playability-clue-density-model.mjs')).href;

async function model(){return import(modelUrl+'?t='+Date.now());}

test('grid-given density measures filled and empty cells exactly',async()=>{
  const M=await model();
  const m=M.gridGivenMetrics([[1,0,2],[0,0,3]]);
  assert.deepEqual(m,{rows:2,cols:3,total:6,filled:3,empty:3,density:0.5});
});

test('difficulty normalization maps player-facing hard labels to expert',async()=>{
  const M=await model();
  assert.equal(M.normalizeDifficulty('easy'),'gentle');
  assert.equal(M.normalizeDifficulty('Közepes'),'focused');
  assert.equal(M.normalizeDifficulty('hard'),'expert');
  assert.equal(M.normalizeDifficulty('brutal'),'expert');
});

test('hard levels flag dense starting grids more aggressively',async()=>{
  const M=await model();
  const puzzle=[
    [1,2,3,4,0,0,0,0,0,0],
    [1,2,3,4,0,0,0,0,0,0]
  ];
  const easy=M.classifyGridDensity(puzzle,'gentle');
  const hard=M.classifyGridDensity(puzzle,'expert');
  assert.equal(easy.density,0.4);
  assert.equal(easy.denseWarning,false);
  assert.equal(hard.denseWarning,true);
  assert.ok(hard.warningCeiling<easy.warningCeiling);
});

test('audit model rejects ragged grids',async()=>{
  const M=await model();
  assert.throws(()=>M.gridGivenMetrics([[1,0],[1]]),/rectangular/);
});
