'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const A=require('../games/classic-human/audit-inventory.js');

test('Sue de Coq is wired verified and production trusted',()=>{
  const row=A.buildInventory().find(x=>x.id==='sue-de-coq');
  assert.ok(row);
  assert.equal(row.implementationState,A.IMPLEMENTATION_STATES.WIRED);
  assert.equal(row.auditState,A.AUDIT_STATES.VERIFIED);
  assert.equal(row.productionTrusted,true);
  assert.ok(H.FINDERS.some(x=>x.id==='sue-de-coq'));
  assert.equal(typeof H.findSueDeCoq,'function');
  assert.equal(C.TECHNIQUES['sue-de-coq'].serverPreferred,undefined);
  assert.equal(C.TECHNIQUES['sue-de-coq'].serverOnly,undefined);
  assert.equal(C.TECHNIQUES['sue-de-coq'].requiresUniqueness,undefined);
});

test('Classic Human inventory tracks quarantined APE explicitly',()=>{
  assert.deepEqual(A.summarizeInventory(),{registered:50,wired:49,implementedUnwired:1,declaredOnly:0,verified:49,limitedVerified:0,needsFix:1,unaudited:0,productionTrusted:49});
});
