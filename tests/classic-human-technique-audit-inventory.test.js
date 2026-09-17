'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const A=require('../games/classic-human/audit-inventory.js');

const EXPECTED_TECHNIQUE_COUNT=50;
const QUARANTINED='aligned-pair-exclusion';

test('audit inventory accounts for every registered Classic Human technique',()=>{
  const rows=A.buildInventory();
  const ids=rows.map(x=>x.id).sort();
  assert.deepEqual(ids,Object.keys(C.TECHNIQUES).sort());
  assert.equal(new Set(ids).size,ids.length);
  assert.equal(rows.length,EXPECTED_TECHNIQUE_COUNT);
});

test('wired finder coverage is explicit and no wired finder is missing from contracts',()=>{
  const rows=A.buildInventory();
  const byId=new Map(rows.map(x=>[x.id,x]));
  for(const finder of H.FINDERS){
    assert.ok(C.TECHNIQUES[finder.id],finder.id);
    assert.equal(byId.get(finder.id).implementationState,A.IMPLEMENTATION_STATES.WIRED,finder.id);
    assert.equal(byId.get(finder.id).auditState,A.AUDIT_STATES.VERIFIED,finder.id);
    assert.equal(byId.get(finder.id).productionTrusted,true,finder.id);
  }
  assert.equal(H.FINDERS.length,EXPECTED_TECHNIQUE_COUNT-1);
});

test('verified server-preferred techniques are wired without becoming default-eligible',()=>{
  const rows=A.buildInventory();
  const byId=new Map(rows.map(x=>[x.id,x]));
  for(const id of ['death-blossom','junior-exocet','multi-sector-locked-set','digit-forcing-chain','digit-forcing-net']){
    assert.equal(byId.get(id).implementationState,A.IMPLEMENTATION_STATES.WIRED,id);
    assert.equal(byId.get(id).auditState,A.AUDIT_STATES.VERIFIED,id);
    assert.equal(byId.get(id).productionTrusted,true,id);
    assert.equal(C.TECHNIQUES[id].serverPreferred,true,id);
    assert.equal(H.eligibleFinders({techniques:[id]}).some(x=>x.entry.id===id),false,id);
    assert.equal(H.eligibleFinders({techniques:[id],allowServerPreferred:true}).some(x=>x.entry.id===id),true,id);
  }
});

test('APE quarantine is explicit and cannot leak into finder eligibility',()=>{
  const row=A.buildInventory().find(x=>x.id===QUARANTINED);
  assert.ok(row);
  assert.equal(row.implementationState,A.IMPLEMENTATION_STATES.IMPLEMENTED_UNWIRED);
  assert.equal(row.auditState,A.AUDIT_STATES.NEEDS_FIX);
  assert.equal(row.productionTrusted,false);
  assert.equal(H.FINDERS.some(f=>f.id===QUARANTINED),false);
  assert.deepEqual(H.eligibleFinders({techniques:[QUARANTINED],allowServerPreferred:true}),[]);
});

test('quad techniques are fully implemented, verified and wired',()=>{
  const byId=new Map(A.buildInventory().map(x=>[x.id,x]));
  for(const id of ['naked-quad','hidden-quad']){
    assert.equal(byId.get(id).implementationState,A.IMPLEMENTATION_STATES.WIRED,id);
    assert.equal(byId.get(id).auditState,A.AUDIT_STATES.VERIFIED,id);
    assert.equal(byId.get(id).productionTrusted,true,id);
    assert.ok(H.FINDERS.some(f=>f.id===id),id);
  }
});

test('all non-quarantined registered techniques are wired verified and trusted',()=>{
  const rows=A.buildInventory();
  assert.equal(rows.length,EXPECTED_TECHNIQUE_COUNT);
  for(const row of rows){
    if(row.id===QUARANTINED)continue;
    assert.equal(row.implementationState,A.IMPLEMENTATION_STATES.WIRED,row.id);
    assert.equal(row.auditState,A.AUDIT_STATES.VERIFIED,row.id);
    assert.equal(row.productionTrusted,true,row.id);
  }
});

test('inventory reports one explicit quarantine and otherwise complete coverage',()=>{
  const summary=A.summarizeInventory();
  assert.deepEqual(summary,{registered:EXPECTED_TECHNIQUE_COUNT,wired:49,implementedUnwired:1,declaredOnly:0,verified:49,limitedVerified:0,needsFix:1,unaudited:0,productionTrusted:49});
});
