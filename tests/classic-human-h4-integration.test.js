'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const H=require('../games/classic-human/index.js');
const A=require('../games/classic-human/audit-inventory.js');
function m(ds){return ds.reduce((x,d)=>x|C.bitForDigit(d),0);}
function fixture(){const s=new S.ClassicHumanState('.'.repeat(81));for(let i=0;i<81;i++)s.masks[i]=m([9]);const set=(r,c,ds)=>{s.masks[C.cellIndex(r,c)]=m(ds);};const x=[1,2,3];set(0,0,x);set(0,1,x);set(1,4,[1,2,3,8]);set(2,7,[1,2,3,9]);set(2,4,[4,5]);set(1,7,[4,5]);for(const c of [2,4,7])set(3,c,[1,9]);set(4,2,[1,9]);for(const c of [2,4,7])set(5,c,[2,9]);set(6,4,[2,9]);for(const c of [2,4,7])set(7,c,[3,9]);set(8,7,[3,9]);return s;}

test('Junior Exocet is wired verified production trusted and server-preferred',()=>{const row=A.buildInventory().find(x=>x.id==='junior-exocet');assert.ok(row);assert.equal(row.implementationState,A.IMPLEMENTATION_STATES.WIRED);assert.equal(row.auditState,A.AUDIT_STATES.VERIFIED);assert.equal(row.productionTrusted,true);const finder=H.FINDERS.find(x=>x.id==='junior-exocet');assert.ok(finder);assert.equal(finder.serverPreferred,true);assert.equal(C.TECHNIQUES['junior-exocet'].serverPreferred,true);assert.equal(typeof H.findJuniorExocet,'function');});

test('Junior Exocet remains fail-closed without allowServerPreferred',()=>{const s=fixture();assert.equal(H.findNext(s,{techniques:['junior-exocet']}),null);const d=H.findNext(s,{techniques:['junior-exocet'],allowServerPreferred:true});assert.ok(d);assert.equal(d.techniqueId,'junior-exocet');});

test('Classic Human inventory tracks quarantined APE after H7 repair',()=>{assert.deepEqual(A.summarizeInventory(),{registered:50,wired:49,implementedUnwired:1,declaredOnly:0,verified:49,limitedVerified:0,needsFix:1,unaudited:0,productionTrusted:49});});
