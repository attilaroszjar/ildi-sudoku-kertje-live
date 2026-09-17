'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'..');
const bank=fs.readFileSync(path.join(root,'games/sudoku-bank.js'),'utf8');
const gen=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

function context(){
  const c={console,globalThis:null,window:null,Map,Set,WeakMap};
  c.globalThis=c;
  c.window=c;
  vm.createContext(c);
  vm.runInContext(bank,c);
  vm.runInContext(gen,c);
  return c;
}

function get(c,id){
  const v=c.SudokuBank.find(x=>x.id===id);
  assert.ok(v,id);
  return v;
}

function median(xs){
  const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}

test('Anti-Knight canonical solution satisfies every knight constraint',()=>{
  const c=context(),v=get(c,'anti-knight'),g=v.solution,n=g.length;
  const moves=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
  for(let r=0;r<n;r++)for(let col=0;col<n;col++)for(const [dr,dc] of moves){
    const rr=r+dr,cc=col+dc;
    if(rr>=0&&rr<n&&cc>=0&&cc<n)assert.notEqual(g[r][col],g[rr][cc]);
  }
});

test('Anti-King canonical solution satisfies every king constraint',()=>{
  const c=context(),v=get(c,'anti-king'),g=v.solution,n=g.length;
  for(let r=0;r<n;r++)for(let col=0;col<n;col++)
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc)continue;
      const rr=r+dr,cc=col+dc;
      if(rr>=0&&rr<n&&cc>=0&&cc<n)assert.notEqual(g[r][col],g[rr][cc]);
    }
});

test('Non-Consecutive canonical solution satisfies every orthogonal constraint',()=>{
  const c=context(),v=get(c,'nonconsecutive'),g=v.solution,n=g.length;
  for(let r=0;r<n;r++)for(let col=0;col<n;col++){
    if(r+1<n)assert.notEqual(Math.abs(g[r][col]-g[r+1][col]),1);
    if(col+1<n)assert.notEqual(Math.abs(g[r][col]-g[r][col+1]),1);
  }
});

for(const id of ['anti-knight','anti-king','nonconsecutive']){
  test(id+' generation is deterministic, solver-certified and variant-essential',()=>{
    const c=context(),v=get(c,id);

    for(const difficulty of ['gentle','focused','expert']){
      for(const seed of [1,17,101,2026]){
        const a=c.SudokuGenerator.make(v,seed,difficulty);
        const b=c.SudokuGenerator.make(v,seed,difficulty);

        assert.deepEqual(a.puzzle,b.puzzle);
        assert.equal(a.generation.unique,true);
        assert.equal(a.generation.verification,'solver-verified');
        assert.equal(a.generation.mode,'seeded-variant-essential');
        assert.equal(a.generation.variantEssential,true);
        assert.equal(c.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);
        assert.ok(c.SudokuGenerator.countSolutions(a.puzzle,2)>1);
      }
    }
  });

  test(id+' exposes measured Gentle < Focused < Expert difficulty',()=>{
    const c=context(),v=get(c,id);
    const scores={gentle:[],focused:[],expert:[]};

    for(const difficulty of Object.keys(scores))
      for(const seed of [1,17,101,2026,20260828])
        scores[difficulty].push(
          c.SudokuGenerator.make(v,seed,difficulty).generation.difficultyScore
        );

    assert.ok(median(scores.gentle)<median(scores.focused));
    assert.ok(median(scores.focused)<median(scores.expert));
  });
}

test('anti-constraint renderers retain their canonical production checks',()=>{
  assert.match(lib,/v\.kind==='anti-knight'/);
  assert.match(lib,/v\.kind==='anti-king'/);
  assert.match(lib,/v\.kind==='nonconsecutive'/);
});

test('anti-constraint variants retain shared Sudoku lifecycle',()=>{
  assert.match(lib,/note-mode-button/);
  assert.match(lib,/classList\.remove\('checked-wrong'\)/);
  assert.match(lib,/api\.solved\(\)/);
  assert.match(lib,/refreshLanguage:function\(\)/);
});
