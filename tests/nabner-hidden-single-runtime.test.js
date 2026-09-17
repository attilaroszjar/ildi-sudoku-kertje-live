'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const {performance}=require('node:perf_hooks');

const root=path.resolve(__dirname,'..');
function load(ref){(0,eval)(`${fs.readFileSync(path.join(root,ref),'utf8')}\n//# sourceURL=${ref}`);}

test('Nabner hidden-single runtime preserves exact counts on deterministic dense states',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
  const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
  const first=refs.indexOf('games/sudoku-generator.js');
  const last=refs.indexOf('games/skyscraper-parks-arc-runtime.js');
  assert.ok(first>=0&&last>=first,'production generator range');
  global.window=global;
  global.performance=performance;
  global.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
  for(const ref of [...bankRefs,...refs.slice(first,last+1).filter(ref=>!bankRefs.includes(ref))])if(fs.existsSync(path.join(root,ref)))load(ref);
  load('games/nabner-hidden-single-runtime.js');
  const G=global.SudokuGenerator,R=global.NabnerHiddenSingleRuntime,S=global.LineGeneratorProvenSiblings;
  const variant=global.SudokuBank.find(v=>v.id==='nabner');
  assert.ok(G&&R&&S&&variant);
  const baseline=S.makeVariantPilot(G,variant,92003,'expert');
  const states=[baseline.puzzle.map(r=>r.slice())];
  const givens=[];
  for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(baseline.puzzle[r][c])givens.push([r,c]);
  for(let i=0;i<Math.min(6,givens.length);i++){
    const g=baseline.puzzle.map(r=>r.slice());
    for(let j=0;j<=i;j++)g[givens[j][0]][givens[j][1]]=0;
    states.push(g);
  }
  let hiddenSeen=0;
  for(const state of states){
    const legacy=R.baseCount.call(G,state,baseline,2,{});
    const stats={captureSolutions:true};
    const enhanced=R.count(state,baseline,2,stats);
    assert.equal(enhanced,legacy,'exact count parity');
    assert.ok(Number.isInteger(stats.nodes)&&stats.nodes>=1);
    hiddenSeen+=stats.hiddenSingles||0;
    if(enhanced>1)assert.ok(stats.witnesses.length>=2);
  }
  assert.ok(hiddenSeen>0,'hidden-single propagation exercised');
});
