'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');

function load(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
  const wanted=refs.filter(x=>
    /^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||
    x==='games/sudoku-generator.js'||
    x==='games/p3-nurikabe-complete.js'
  );
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;
  ctx.window=ctx;
  ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted){
    vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
  }
  return ctx;
}

function components(grid,value){
  const n=grid.length,seen=new Set(),out=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const key=r+','+c;
    if(grid[r][c]!==value||seen.has(key))continue;
    const q=[[r,c]],comp=[];seen.add(key);
    while(q.length){
      const [rr,cc]=q.pop();comp.push([rr,cc]);
      for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const r2=rr+dr,c2=cc+dc,k=r2+','+c2;
        if(r2>=0&&c2>=0&&r2<n&&c2<n&&grid[r2][c2]===value&&!seen.has(k)){
          seen.add(k);q.push([r2,c2]);
        }
      }
    }
    out.push(comp);
  }
  return out;
}

function validate(g){
  const sea=g.solution,n=sea.length,p=g.puzzle;
  assert.equal(p.length,n);
  assert.ok(p.every(row=>row.length===n));
  assert.ok(g.preShaded.every(([r,c])=>sea[r][c]===1));

  for(let r=0;r<n-1;r++)for(let c=0;c<n-1;c++){
    assert.ok(!(sea[r][c]&&sea[r+1][c]&&sea[r][c+1]&&sea[r+1][c+1]),'sea may not contain 2x2');
  }

  const seaComps=components(sea,1);
  const seaCount=sea.flat().filter(Boolean).length;
  assert.equal(seaComps.length,1,'sea must be connected');
  assert.equal(seaComps[0].length,seaCount);

  const land=sea.map(row=>row.map(x=>x?0:1));
  const islands=components(land,1);
  const clues=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(p[r][c]!=null)clues.push({r,c,n:p[r][c]});
  assert.equal(islands.length,clues.length,'each island must have one clue');

  for(const island of islands){
    const inside=clues.filter(cl=>island.some(([r,c])=>r===cl.r&&c===cl.c));
    assert.equal(inside.length,1,'one clue per island');
    assert.equal(island.length,inside[0].n,'clue equals island size');
  }
}

test('Nurikabe exposes solver-certified 5x5 through 8x8 sizes',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='nurikabe');
  for(const n of [5,6,7,8]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x76000000+n)>>>0,'focused');
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.generatorFamily,'nurikabe-multisize-sea-growth-bounded');
    validate(g);
    assert.equal(G.countNurikabeSolutions(g.puzzle,2,{},g.preShaded),1,`${n}x${n} exact uniqueness`);
  }
});

test('Nurikabe multi-size generation is deterministic and seed-diverse',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='nurikabe');
  variant.data.p3Size=8;
  const a=G.make(variant,0x76111111,'focused');
  const b=G.make(variant,0x76111111,'focused');
  const c=G.make(variant,0x76222222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b),'same seed must replay exact JSON content');
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution),'different seeds must vary sea topology');
});

test('Nurikabe difficulty stays independent from size',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='nurikabe');
  variant.data.p3Size=7;
  const counts=[];
  for(const difficulty of ['gentle','focused','expert']){
    const g=G.make(variant,0x76333333,difficulty);
    assert.equal(g.generation.boardSize,7);
    assert.equal(G.countNurikabeSolutions(g.puzzle,2,{},g.preShaded),1);
    counts.push(g.preShaded.length);
  }
  assert.ok(counts[0]>=counts[1]&&counts[1]>=counts[2],'easier bands may expose at least as many sea starters');
});

test('Nurikabe Expert exact-minimizes pre-shaded sea starters to local irreducibility',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='nurikabe');
  variant.data.p3Size=5;
  const g=G.make(variant,101001,'expert');
  assert.equal(g.generation.localIrreducible,true);
  assert.equal(G.countNurikabeSolutions(g.puzzle,2,{},g.preShaded),1,'Expert puzzle must remain exact-unique');
  for(let i=0;i<g.preShaded.length;i++){
    const trial=g.preShaded.slice(0,i).concat(g.preShaded.slice(i+1));
    assert.notEqual(G.countNurikabeSolutions(g.puzzle,2,{},trial),1,`starter ${i} must be individually necessary`);
  }
});

test('Nurikabe registers with the shared P3 size selector only',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-nurikabe-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes('root.IldiP3SizeSupport.nurikabe=supported.slice()'));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
  assert.ok(source.includes('function starterFraction(difficulty,n)'));
  assert.ok(source.includes('function minimizeExpertPreShade(puzzle,shaded)'));
  assert.ok(source.includes('for(var attempt=0;attempt<20;attempt++)'));
});
