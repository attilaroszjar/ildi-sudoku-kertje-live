'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const I=require('../games/classic-human/audit-inventory.js');

test('H7 APE remains registered exported and quarantined after soundness repair',()=>{
  const row=I.buildInventory().find(x=>x.id==='aligned-pair-exclusion');
  assert.ok(row);
  assert.equal(row.implementationState,I.IMPLEMENTATION_STATES.IMPLEMENTED_UNWIRED);
  assert.equal(row.auditState,I.AUDIT_STATES.NEEDS_FIX);
  assert.equal(row.productionTrusted,false);
  assert.equal(H.FINDERS.some(x=>x.id==='aligned-pair-exclusion'),false);
  assert.equal(typeof H.findAlignedPairExclusion,'function');
  assert.equal(C.TECHNIQUES['aligned-pair-exclusion'].serverPreferred,true);
});

test('H7 APE cannot be enabled through solver gating while quarantined',()=>{
  assert.deepEqual(H.eligibleFinders({techniques:['aligned-pair-exclusion']}),[]);
  assert.deepEqual(H.eligibleFinders({techniques:['aligned-pair-exclusion'],allowServerPreferred:true}),[]);
});

test('H7 inventory records exactly one quarantined technique',()=>{
  assert.deepEqual(I.summarizeInventory(),{registered:50,wired:49,implementedUnwired:1,declaredOnly:0,verified:49,limitedVerified:0,needsFix:1,unaudited:0,productionTrusted:49});
});

test('APE difficulty metadata remains between ALS Chain and Death Blossom',()=>{
  const ape=C.TECHNIQUES['aligned-pair-exclusion'];
  assert.ok(C.TECHNIQUES['als-chain'].baseRating<ape.baseRating);
  assert.ok(ape.baseRating<C.TECHNIQUES['death-blossom'].baseRating);
  assert.ok(C.TECHNIQUES['als-chain'].priority<ape.priority);
  assert.ok(ape.priority<C.TECHNIQUES['death-blossom'].priority);
});
