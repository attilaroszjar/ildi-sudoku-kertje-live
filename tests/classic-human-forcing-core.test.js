'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const F=require('../games/classic-human/forcing.js');

function blank(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function mask(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}

test('forcing branch clone preserves source state isolation',()=>{
  const s=blank(),a=cell(0,0);
  s.restrictMask(a,mask(1,2));
  const before=s.masks[a];
  const r=F.runBranch(s,{cell:a,digit:1,value:true},{maxSteps:0});
  assert.equal(r.status,'STABLE');
  assert.equal(s.grid[0][0],0);
  assert.equal(s.masks[a],before);
  assert.equal(r.state.grid[0][0],1);
});

test('forcing branch detects contradiction from an assumed true candidate',()=>{
  const s=blank(),a=cell(0,0),peer=cell(0,1);
  s.restrictMask(a,mask(1,2));
  s.restrictMask(peer,mask(1));
  const r=F.runBranch(s,{cell:a,digit:1,value:true},{maxSteps:0});
  assert.equal(r.status,'CONTRADICTION');
});

test('binary forcing can prove a candidate false by contradiction',()=>{
  const s=blank(),a=cell(0,0),peer=cell(0,1);
  s.restrictMask(a,mask(1,2));
  s.restrictMask(peer,mask(1));
  const r=F.analyzeBinaryAssumption(s,a,1,{maxSteps:0});
  assert.equal(r.status,'FORCED_FALSE');
  assert.deepEqual(r.eliminations,[{cell:a,digit:1}]);
});

test('binary forcing can prove a candidate true when the false branch contradicts',()=>{
  const s=blank(),a=cell(0,0),peer=cell(0,1);
  s.restrictMask(a,mask(1,2));
  s.restrictMask(peer,mask(2));
  const r=F.analyzeBinaryAssumption(s,a,1,{maxSteps:2});
  assert.equal(r.status,'FORCED_TRUE');
  assert.deepEqual(r.placements,[{cell:a,digit:1}]);
});

test('forcing propagation is hard bounded',()=>{
  const s=blank(),a=cell(0,0);
  s.restrictMask(a,mask(1,2));
  assert.throws(()=>F.runBranch(s,{cell:a,digit:1,value:true},{maxSteps:33}),/0\.\.32/);
  assert.throws(()=>F.runBranch(s,{cell:a,digit:1,value:true},{maxSteps:-1}),/0\.\.32/);
});

test('forcing analysis is deterministic',()=>{
  const s=blank(),a=cell(0,0),peer=cell(0,1);
  s.restrictMask(a,mask(1,2));
  s.restrictMask(peer,mask(1));
  const project=()=>{const r=F.analyzeBinaryAssumption(s,a,1,{maxSteps:4});return {status:r.status,p:r.placements,e:r.eliminations,on:r.on.status,off:r.off.status};};
  assert.deepEqual(project(),project());
});
