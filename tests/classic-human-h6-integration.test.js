'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const H=require('../games/classic-human/index.js');
const A=require('../games/classic-human/audit-inventory.js');

const INKALA='800000000003600000070090200050007000000045700000100030001000068008500010090000400';

test('MSLS is wired verified production trusted and server-preferred',()=>{
  const row=A.buildInventory().find(x=>x.id==='multi-sector-locked-set');
  assert.ok(row);
  assert.equal(row.implementationState,A.IMPLEMENTATION_STATES.WIRED);
  assert.equal(row.auditState,A.AUDIT_STATES.VERIFIED);
  assert.equal(row.productionTrusted,true);
  const finder=H.FINDERS.find(x=>x.id==='multi-sector-locked-set');
  assert.ok(finder);
  assert.equal(finder.serverPreferred,true);
  const meta=C.TECHNIQUES['multi-sector-locked-set'];
  assert.equal(meta.serverPreferred,true);
  assert.ok(meta.baseRating>=C.TECHNIQUES['junior-exocet'].baseRating);
  assert.ok(meta.baseRating<C.TECHNIQUES['nested-forcing-chain'].baseRating);
  assert.equal(typeof H.findMultiSectorLockedSet,'function');
});

test('MSLS remains fail-closed without allowServerPreferred',()=>{
  const s=new S.ClassicHumanState(INKALA);
  assert.equal(H.findNext(s,{techniques:['multi-sector-locked-set']}),null);
  const d=H.findNext(s,{techniques:['multi-sector-locked-set'],allowServerPreferred:true});
  assert.ok(d);
  assert.equal(d.techniqueId,'multi-sector-locked-set');
  assert.equal(d.explanationData.rank,0);
});

test('Classic Human inventory tracks quarantined APE after H7 repair',()=>{
  assert.deepEqual(A.summarizeInventory(),{registered:50,wired:49,implementedUnwired:1,declaredOnly:0,verified:49,limitedVerified:0,needsFix:1,unaudited:0,productionTrusted:49});
});
