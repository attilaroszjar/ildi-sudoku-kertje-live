'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const H=require('../games/classic-human/index.js');

test('finderOptions merges only the selected technique budget',()=>{
  const base={allowServerPreferred:true,maxSteps:999,finderOptions:{
    'forcing-chain':{candidateBudget:24,maxSteps:32},
    'forcing-net':{seedBudget:12,maxSteps:31}
  }};
  const chain=H.optionsForFinder(base,'forcing-chain');
  const net=H.optionsForFinder(base,'forcing-net');
  const aic=H.optionsForFinder(base,'aic');
  assert.equal(chain.candidateBudget,24);
  assert.equal(chain.maxSteps,32);
  assert.equal(chain.seedBudget,undefined);
  assert.equal(net.seedBudget,12);
  assert.equal(net.maxSteps,31);
  assert.equal(net.candidateBudget,undefined);
  assert.equal(aic,base);
  assert.equal(base.maxSteps,999);
});

test('finderOptions rejects non-object technique overrides',()=>{
  assert.throws(()=>H.optionsForFinder({finderOptions:{aic:12}},'aic'),/must be an object/);
});
