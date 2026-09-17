'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const H=require('../games/classic-human/index.js');

const serverPreferred=['death-blossom','junior-exocet','multi-sector-locked-set','forcing-chain','forcing-net','digit-forcing-chain','digit-forcing-net'];
const quarantined=['aligned-pair-exclusion'];
const serverOnly=['dynamic-forcing-chain','nested-forcing-chain'];

function ids(options){return H.eligibleFinders(options).map(x=>x.entry.id);}

test('server-preferred techniques remain excluded from default finder eligibility',()=>{
  const eligible=new Set(ids({allowUniqueness:true}));
  for(const id of serverPreferred)assert.equal(eligible.has(id),false,id);
  for(const id of quarantined)assert.equal(eligible.has(id),false,id);
  for(const id of serverOnly)assert.equal(eligible.has(id),false,id);
});

test('allowServerPreferred enables verified server-preferred techniques but not quarantined or server-only techniques',()=>{
  const eligible=new Set(ids({allowUniqueness:true,allowServerPreferred:true}));
  for(const id of serverPreferred)assert.equal(eligible.has(id),true,id);
  for(const id of quarantined)assert.equal(eligible.has(id),false,id);
  for(const id of serverOnly)assert.equal(eligible.has(id),false,id);
});

test('allowServerOnly is independent from allowServerPreferred',()=>{
  const eligible=new Set(ids({allowUniqueness:true,allowServerOnly:true}));
  for(const id of serverPreferred)assert.equal(eligible.has(id),false,id);
  for(const id of quarantined)assert.equal(eligible.has(id),false,id);
  for(const id of serverOnly)assert.equal(eligible.has(id),true,id);
});

test('explicit technique filtering cannot bypass server-preferred or quarantine gates',()=>{
  for(const id of ['death-blossom','junior-exocet','multi-sector-locked-set','digit-forcing-chain','digit-forcing-net']){
    assert.deepEqual(ids({techniques:[id]}),[],id);
    assert.deepEqual(ids({techniques:[id],allowServerPreferred:true}),[id],id);
  }
  for(const id of quarantined){
    assert.deepEqual(ids({techniques:[id]}),[],id);
    assert.deepEqual(ids({techniques:[id],allowServerPreferred:true}),[],id);
  }
});
