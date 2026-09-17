'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');const H=require('../games/classic-human/index.js');const I=require('../games/classic-human/audit-inventory.js');
const IDS=['finned-x-wing','sashimi-x-wing','finned-swordfish','sashimi-swordfish','finned-jellyfish','sashimi-jellyfish'];
const EXPECTED_TECHNIQUE_COUNT=50;

test('H1 techniques are registered wired verified and production trusted',()=>{const rows=I.buildInventory();const byId=new Map(rows.map(x=>[x.id,x]));for(const id of IDS){assert.ok(C.TECHNIQUES[id]);assert.ok(H.FINDERS.some(x=>x.id===id));const row=byId.get(id);assert.equal(row.implementationState,I.IMPLEMENTATION_STATES.WIRED);assert.equal(row.auditState,I.AUDIT_STATES.VERIFIED);assert.equal(row.productionTrusted,true);}const s=I.summarizeInventory(rows);assert.deepEqual({registered:s.registered,wired:s.wired,implementedUnwired:s.implementedUnwired,declaredOnly:s.declaredOnly,verified:s.verified,needsFix:s.needsFix,unaudited:s.unaudited,productionTrusted:s.productionTrusted},{registered:EXPECTED_TECHNIQUE_COUNT,wired:49,implementedUnwired:1,declaredOnly:0,verified:49,needsFix:1,unaudited:0,productionTrusted:49});});

test('H1 techniques are normal human finders without gated flags',()=>{for(const id of IDS){const e=H.FINDERS.find(x=>x.id===id);assert.ok(e);assert.notEqual(e.serverPreferred,true);assert.notEqual(e.serverOnly,true);assert.notEqual(e.requiresUniqueness,true);assert.ok(H.eligibleFinders({techniques:[id]}).some(x=>x.entry.id===id));}});

test('legacy gates remain fail closed',()=>{const defaults=new Set(H.eligibleFinders({}).map(x=>x.entry.id));for(const id of ['aligned-pair-exclusion','death-blossom','junior-exocet','forcing-chain','forcing-net','digit-forcing-chain','digit-forcing-net','multi-sector-locked-set'])assert.equal(defaults.has(id),false);for(const id of ['dynamic-forcing-chain','nested-forcing-chain'])assert.equal(defaults.has(id),false);for(const id of ['unique-rectangle','unique-loop','bug-plus-one'])assert.equal(defaults.has(id),false);});
