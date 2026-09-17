'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const H=require('../games/classic-human/index.js');

function blank(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function mask(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}

function forcedFalseState(){
  const s=blank(),seed=cell(0,0),peer=cell(0,1);
  s.restrictMask(seed,mask(1,2));
  s.restrictMask(peer,mask(1));
  return {s,seed};
}

function forcingNetState(){
  const s=blank(),seed=cell(0,0);
  s.restrictMask(seed,mask(1,2,3));
  s.restrictMask(cell(0,1),mask(1));
  s.restrictMask(cell(1,0),mask(2));
  return {s,seed};
}

test('canonical classic entry exports Phase F forcing recognizers',()=>{
  assert.equal(typeof H.findForcingChain,'function');
  assert.equal(typeof H.findForcingNet,'function');
});

test('Phase F finder registry contains each forcing technique exactly once',()=>{
  for(const id of ['forcing-chain','forcing-net'])assert.equal(H.FINDERS.filter(x=>x.id===id).length,1);
});

test('Phase F priorities remain contract driven',()=>{
  const forcing=H.FINDERS.filter(x=>x.id==='forcing-chain'||x.id==='forcing-net').map(x=>C.TECHNIQUES[x.id].priority);
  assert.deepEqual(forcing,[400,410]);
});

test('server-preferred forcing stays disabled by default even with an explicit technique filter',()=>{
  const {s}=forcedFalseState();
  assert.equal(H.findNext(s,{techniques:['forcing-chain'],seeds:[{cell:cell(0,0),digit:1}],maxSteps:0}),null);
  const net=forcingNetState();
  assert.equal(H.findNext(net.s,{techniques:['forcing-net'],seedCells:[net.seed],maxSteps:0}),null);
});

test('explicit server-preferred opt-in enables forcing-chain without guessing',()=>{
  const {s,seed}=forcedFalseState();
  const d=H.findNext(s,{techniques:['forcing-chain'],allowServerPreferred:true,seeds:[{cell:seed,digit:1}],maxSteps:0});
  assert.ok(d);
  assert.equal(d.techniqueId,'forcing-chain');
  const r=H.solve(s,{techniques:['forcing-chain'],allowServerPreferred:true,seeds:[{cell:seed,digit:1}],maxSteps:0});
  assert.equal(r.guessRequired,false);
});

test('explicit server-preferred opt-in enables forcing-net without guessing',()=>{
  const {s,seed}=forcingNetState();
  const d=H.findNext(s,{techniques:['forcing-net'],allowServerPreferred:true,seedCells:[seed],maxSteps:0});
  assert.ok(d);
  assert.equal(d.techniqueId,'forcing-net');
  assert.equal(H.solve(s,{techniques:['forcing-net'],allowServerPreferred:true,seedCells:[seed],maxSteps:0}).guessRequired,false);
});

test('server-preferred forcing policy remains independent from uniqueness policy',()=>{
  const s=blank();
  assert.equal(H.findNext(s,{techniques:['unique-rectangle'],allowServerPreferred:true}),null);
  const forcing=forcedFalseState();
  assert.equal(H.findNext(forcing.s,{techniques:['forcing-chain'],allowUniqueness:true,seeds:[{cell:forcing.seed,digit:1}],maxSteps:0}),null);
});
