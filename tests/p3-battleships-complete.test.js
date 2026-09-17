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
    x==='games/p3-battleships-complete.js'
  );
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.localStorage={getItem(){return null;},setItem(){}};
  vm.createContext(ctx);
  for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
  return ctx;
}

function validate(g){
  const n=g.puzzle.size,grid=g.solution,p=g.puzzle;
  assert.equal(grid.length,n);
  assert.ok(grid.every(row=>row.length===n));
  assert.deepEqual(grid.map(row=>row.reduce((a,x)=>a+x,0)),Array.from(p.rowClues));
  const cols=Array.from({length:n},(_,c)=>grid.reduce((a,row)=>a+row[c],0));
  assert.deepEqual(cols,Array.from(p.colClues));

  const seen=new Set(),ships=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    if(!grid[r][c]||seen.has(r+','+c))continue;
    const q=[[r,c]],comp=[];seen.add(r+','+c);
    while(q.length){
      const [rr,cc]=q.pop();comp.push([rr,cc]);
      for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const r2=rr+dr,c2=cc+dc,k=r2+','+c2;
        if(r2>=0&&c2>=0&&r2<n&&c2<n&&grid[r2][c2]&&!seen.has(k)){
          seen.add(k);q.push([r2,c2]);
        }
      }
    }
    ships.push(comp);
  }
  assert.deepEqual(ships.map(s=>s.length).sort((a,b)=>b-a),Array.from(p.fleet).sort((a,b)=>b-a));
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(grid[r][c]){
    for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]){
      const rr=r+dr,cc=c+dc;
      if(rr>=0&&cc>=0&&rr<n&&cc<n)assert.equal(grid[rr][cc],0,'ships may not touch diagonally');
    }
  }
  for(const given of p.givens)assert.equal(grid[given.r][given.c],given.state);
}

test('Battleships exposes solver-certified 5x5 through 8x8 sizes',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='battleships');
  for(const n of [5,6,7,8]){
    variant.data.p3Size=n;
    const g=G.make(variant,(0x78000000+n)>>>0,'focused');
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.generatorFamily,'battleships-multisize-bounded-fleet');
    validate(g);
    assert.equal(G.countBattleshipSolutions(g.puzzle,2,{}),1,`${n}x${n} exact uniqueness`);
  }
});

test('Battleships multi-size generation is deterministic and seed-diverse',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='battleships');
  variant.data.p3Size=8;
  const a=G.make(variant,0x78111111,'focused');
  const b=G.make(variant,0x78111111,'focused');
  const c=G.make(variant,0x78222222,'focused');
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.notEqual(JSON.stringify(a.solution),JSON.stringify(c.solution),'different seeds must vary fleet placement');
});

test('Battleships difficulty stays independent from size',()=>{
  const ctx=load(),G=ctx.SudokuGenerator,variant=ctx.SudokuBank.find(v=>v.id==='battleships');
  variant.data.p3Size=7;
  const clues=[];
  for(const difficulty of ['gentle','focused','expert']){
    const g=G.make(variant,0x78333333,difficulty);
    assert.equal(g.generation.boardSize,7);
    assert.equal(G.countBattleshipSolutions(g.puzzle,2,{}),1);
    clues.push(g.generation.clues);
  }
  assert.ok(clues[0]>=clues[1]&&clues[1]>=clues[2],'easier bands expose at least as many givens');
});

test('Battleships registers with the shared P3 size selector only',()=>{
  const source=fs.readFileSync(path.join(root,'games/p3-battleships-complete.js'),'utf8');
  const control=fs.readFileSync(path.join(root,'games/p3-size-control.js'),'utf8');
  assert.ok(source.includes('root.IldiP3SizeSupport.battleships=supported.slice()'));
  assert.ok(!source.includes("select.id='size-select'"));
  assert.ok(control.includes("select.id='size-select'"));
  assert.ok(source.includes('for(var attempt=0;attempt<16&&!made;attempt++)'));
});
