'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../games/classic-human/rating.js');

test('stalled solve traces are not assigned a product difficulty band',()=>{
  const rating=R.rateSolve({status:'STALLED',steps:[]});
  assert.equal(rating.solveComplete,false);
  assert.equal(rating.score,null);
  assert.equal(rating.band,null);
  assert.equal(rating.rawScore,0);
  assert.equal(rating.scoreStatus,'UNRATED_INCOMPLETE');
});

test('invalid solve traces are not assigned a product difficulty band',()=>{
  const rating=R.rateSolve({status:'INVALID',steps:[]});
  assert.equal(rating.score,null);
  assert.equal(rating.band,null);
  assert.equal(rating.scoreStatus,'UNRATED_INCOMPLETE');
});
