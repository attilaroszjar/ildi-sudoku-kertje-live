'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');

function load(){
  const index=fs.readFileSync(
    path.join(root,'index.html'),
    'utf8'
  );

  const refs=[
    ...index.matchAll(/<script src="([^"]+)"><\/script>/g)
  ].map(m=>m[1]);

  const wanted=refs.filter(x=>
    /^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||
    x==='games/sudoku-generator.js'||
    x==='games/p3-star-battle-complete.js'
  );

  const ctx={
    console,
    Map,
    Set,
    WeakMap,
    Math,
    JSON,
    Array,
    Object,
    Number,
    String,
    Boolean,
    RegExp,
    Error,
    Date
  };

  ctx.globalThis=ctx;
  ctx.window=ctx;
  ctx.localStorage={
    getItem(){return null;},
    setItem(){}
  };

  vm.createContext(ctx);

  for(const ref of wanted){
    vm.runInContext(
      fs.readFileSync(path.join(root,ref),'utf8'),
      ctx,
      {filename:ref}
    );
  }

  return ctx;
}

function validateSolution(generated){
  const p=generated.puzzle;
  const n=p.size;
  const sol=generated.solution;

  assert.equal(sol.length,n);
  assert.equal(p.regions.length,n);
  assert.ok(p.regions.every(row=>row.length===n));

  const cols=new Set(sol);
  assert.equal(cols.size,n,'one star per column');

  for(let r=1;r<n;r++){
    assert.ok(
      Math.abs(sol[r]-sol[r-1])>1,
      'adjacent-row stars must not touch'
    );
  }

  const perRegion=Array(n).fill(0);

  for(let r=0;r<n;r++){
    const c=sol[r];
    const region=p.regions[r][c];
    assert.ok(region>=0&&region<n);
    perRegion[region]++;
  }

  assert.deepEqual(
    perRegion,
    Array(n).fill(1),
    'one solution star per region'
  );
}

test('Star Battle exposes solver-certified 5x5 through 9x9 sizes',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='star-battle');

  for(const n of [5,6,7,8,9]){
    variant.data.p3Size=n;

    const g=G.make(
      variant,
      (0x73000000+n)>>>0,
      'focused'
    );

    assert.equal(g.puzzle.size,n);
    assert.equal(g.generation.boardSize,n);
    assert.equal(g.generation.unique,true);
    assert.equal(g.generation.variantEssential,true);
    assert.equal(
      g.generation.generatorFamily,
      'starbattle-multisize-region-growth'
    );

    validateSolution(g);

    assert.equal(
      G.countStarBattleSolutions(g.puzzle,2,{}),
      1,
      `${n}x${n} exact uniqueness`
    );
  }
});

test('Star Battle multi-size generation is deterministic and seed-diverse',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='star-battle');

  variant.data.p3Size=9;

  const a=G.make(variant,0x73111111,'focused');
  const b=G.make(variant,0x73111111,'focused');
  const c=G.make(variant,0x73222222,'focused');

  assert.equal(
    JSON.stringify(a),
    JSON.stringify(b),
    'same seed, size and difficulty must replay byte-equivalent JSON content'
  );

  assert.notEqual(
    JSON.stringify(a.puzzle.regions),
    JSON.stringify(c.puzzle.regions),
    'different seeds must produce different region topology'
  );
});

test('Star Battle difficulty remains independent of board size',()=>{
  const ctx=load();
  const G=ctx.SudokuGenerator;
  const variant=ctx.SudokuBank.find(v=>v.id==='star-battle');

  variant.data.p3Size=7;

  const gentle=G.make(variant,0x73333333,'gentle');
  const focused=G.make(variant,0x73333333,'focused');
  const expert=G.make(variant,0x73333333,'expert');

  for(const g of [gentle,focused,expert]){
    assert.equal(g.puzzle.size,7);
    assert.equal(
      G.countStarBattleSolutions(g.puzzle,2,{}),
      1
    );
  }

  assert.ok(
    gentle.generation.difficultyScore<=
    focused.generation.difficultyScore
  );

  assert.ok(
    focused.generation.difficultyScore<=
    expert.generation.difficultyScore
  );
});

test('Star Battle runtime uses generated puzzle size and has a dedicated size control',()=>{
  const index=fs.readFileSync(
    path.join(root,'index.html'),
    'utf8'
  );

  const library=fs.readFileSync(
    path.join(root,'games/sudoku-library.js'),
    'utf8'
  );

  const hardening=fs.readFileSync(
    path.join(root,'games/p3-star-battle-complete.js'),
    'utf8'
  );

  assert.ok(
    index.includes(
      'games/p3-star-battle-complete.js'
    )
  );

  assert.ok(
    library.includes('var n=v.puzzle.size')
  );

  assert.ok(
    hardening.includes('var supported=[5,6,7,8,9]')
  );

  assert.ok(
    hardening.includes("select.id='size-select'")
  );

  assert.ok(
    hardening.includes(
      "variant.data.p3Size=size"
    )
  );
});
