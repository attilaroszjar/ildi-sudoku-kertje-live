'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const FN=require('../games/classic-human/forcing-net.js');

function blank(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function mask(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}

test('forcing-net seed scan is limited to trivalue cells and seed budget',()=>{
  const s=blank();
  s.restrictMask(cell(0,0),mask(1,2,3));
  s.restrictMask(cell(0,1),mask(4,5,6));
  s.restrictMask(cell(0,2),mask(7,8));
  assert.deepEqual(FN.seedCells(s,{seedBudget:1}),[cell(0,0)]);
  assert.throws(()=>FN.seedCells(s,{seedBudget:0}),/1..12/);
  assert.throws(()=>FN.seedCells(s,{seedBudget:13}),/1..12/);
});

test('forcing-net forces the sole surviving value when two branches contradict',()=>{
  const s=blank(),seed=cell(0,0);
  s.restrictMask(seed,mask(1,2,3));
  s.restrictMask(cell(0,1),mask(1));
  s.restrictMask(cell(1,0),mask(2));
  const a=FN.analyzeSeed(s,seed,{maxSteps:0});
  assert.equal(a.status,'FORCED_VALUE');
  assert.deepEqual(a.placements,[{cell:seed,digit:3}]);
  const d=FN.findForcingNet(s,{seeds:[seed],maxSteps:0})[0];
  assert.ok(d);
  assert.equal(d.techniqueId,'forcing-net');
  assert.deepEqual(d.placements,[{cell:seed,digit:3}]);
});

test('forcing-net eliminates only contradictory values when one branch contradicts',()=>{
  const s=blank(),seed=cell(0,0);
  s.restrictMask(seed,mask(1,2,3));
  s.restrictMask(cell(0,1),mask(1));
  const a=FN.analyzeSeed(s,seed,{maxSteps:0});
  assert.equal(a.status,'PARTIAL');
  assert.deepEqual(a.eliminations,[{cell:seed,digit:1}]);
});

test('forcing-net keeps only consequences common to all stable branches',()=>{
  const s=blank(),seed=cell(0,0),target=cell(8,8);
  s.restrictMask(seed,mask(1,2,3));
  s.restrictMask(target,mask(4,5));
  const fake={
    runBranch(state,assumption){
      const branch=Object.create(S.ClassicHumanState.prototype);
      branch.grid=state.cloneGrid();branch.masks=new Uint16Array(state.masks);branch.valid=true;branch.steps=[];
      branch.eliminate(target,4);
      return {status:'STABLE',reason:null,steps:[],state:branch};
    }
  };
  const original=require.cache[require.resolve('../games/classic-human/forcing.js')].exports.runBranch;
  require.cache[require.resolve('../games/classic-human/forcing.js')].exports.runBranch=fake.runBranch;
  try{
    delete require.cache[require.resolve('../games/classic-human/forcing-net.js')];
    const Fresh=require('../games/classic-human/forcing-net.js');
    const a=Fresh.analyzeSeed(s,seed,{maxSteps:0});
    assert.equal(a.status,'COMMON_CONSEQUENCE');
    assert.deepEqual(a.eliminations,[{cell:target,digit:4}]);
  }finally{
    require.cache[require.resolve('../games/classic-human/forcing.js')].exports.runBranch=original;
    delete require.cache[require.resolve('../games/classic-human/forcing-net.js')];
  }
});

test('forcing-net passes propagation bound to every branch',()=>{
  const s=blank(),seed=cell(0,0);
  s.restrictMask(seed,mask(1,2,3));
  assert.throws(()=>FN.findForcingNet(s,{seeds:[seed],maxSteps:33}),/0..32/);
});

test('forcing-net output is deterministic',()=>{
  const s=blank(),seed=cell(0,0);
  s.restrictMask(seed,mask(1,2,3));
  s.restrictMask(cell(0,1),mask(1));
  s.restrictMask(cell(1,0),mask(2));
  const project=()=>FN.findForcingNet(s,{seeds:[seed],maxSteps:0}).map(d=>({p:d.placements,e:d.eliminations,r:d.explanationData.result}));
  assert.deepEqual(project(),project());
});
