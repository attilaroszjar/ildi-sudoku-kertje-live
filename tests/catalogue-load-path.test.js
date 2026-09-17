'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'..');
const gamesDir=path.join(root,'games');
const bankFiles=fs.readdirSync(gamesDir)
  .filter(x=>/^sudoku-bank(?:-iteration\d+)?\.js$/.test(x))
  .sort((a,b)=>{
    const n=x=>+(x.match(/iteration(\d+)/)||[,0])[1];
    return n(a)-n(b);
  });

const ctx={console,Map,Set,Math,JSON,Array,Object,Number,String,Boolean,Date,Uint8Array,WeakMap};
ctx.globalThis=ctx;
ctx.window=ctx;
ctx.localStorage={getItem:()=>null,setItem:()=>{}};
ctx.LogicRoom={register:()=>{}};
vm.createContext(ctx);

for(const f of bankFiles) vm.runInContext(fs.readFileSync(path.join(gamesDir,f),'utf8'),ctx,{filename:f});
vm.runInContext(fs.readFileSync(path.join(gamesDir,'sudoku-generator.js'),'utf8'),ctx,{filename:'sudoku-generator.js'});

let librarySource=fs.readFileSync(path.join(gamesDir,'sudoku-library.js'),'utf8');
const exposeNeedle='\n  function classicConflict(grid,r,c,vdef){';
assert.equal(librarySource.includes(exposeNeedle),true,'audit hook insertion point must exist');
librarySource=librarySource.replace(exposeNeedle,'\n  root.__auditTransformedVariant=transformedVariant;\n'+exposeNeedle);
vm.runInContext(librarySource,ctx,{filename:'sudoku-library.js'});

const bank=ctx.SudokuBank;
const generator=ctx.SudokuGenerator;
const transform=ctx.__auditTransformedVariant;
const passthroughMatch=librarySource.match(/var v=\(([^;]+)\)\?generated:transformedVariant\(generated,turns\)/);
assert.ok(passthroughMatch,'renderVariant passthrough expression must exist');
const passthrough=passthroughMatch[1];
const isGrid=x=>Array.isArray(x)&&x.length>0&&x.every(Array.isArray);
const bypasses=kind=>passthrough.includes(`current.kind==='${kind}'`);
const hasDedicatedRenderer=kind=>
  kind==='samurai' ||
  new RegExp(`v\\.kind==='${kind}'`).test(librarySource);

test('all 106 catalogue entries generate without throwing',()=>{
  assert.equal(bank.length,106);
  for(let i=0;i<bank.length;i++){
    const v=bank[i];
    let generated;
    assert.doesNotThrow(()=>{
      generated=generator.make(v,(0x51A7+i*97)>>>0,'gentle');
    },`generate ${v.id}`);
    assert.ok(generated,`generated puzzle for ${v.id}`);
    assert.equal(generated.id,v.id,`generated id for ${v.id}`);
  }
});

test('every non-grid puzzle bypasses Sudoku rotation and has a dedicated renderer',()=>{
  for(let i=0;i<bank.length;i++){
    const v=bank[i];
    const g=generator.make(v,(0xA11D+i*131)>>>0,'gentle');
    const gridPuzzle=isGrid(g.puzzle),gridSolution=isGrid(g.solution);
    if(gridPuzzle&&gridSolution) continue;
    assert.equal(bypasses(g.kind),true,`${v.id} (${g.kind}) must bypass transformedVariant`);
    assert.equal(hasDedicatedRenderer(g.kind),true,`${v.id} (${g.kind}) must have a dedicated renderer route`);
  }
});

test('every variant sent through Sudoku rotation survives the real transform path',()=>{
  for(let i=0;i<bank.length;i++){
    const v=bank[i];
    const g=generator.make(v,(0xC0DE+i*173)>>>0,'gentle');
    if(bypasses(g.kind)) continue;
    let rotated;
    assert.doesNotThrow(()=>{rotated=transform(g,1);},`transform ${v.id} (${g.kind})`);
    assert.equal(isGrid(rotated.puzzle),true,`${v.id} rotated puzzle must remain a grid`);
    assert.equal(isGrid(rotated.solution),true,`${v.id} rotated solution must remain a grid`);
  }
});

test('every explicit passthrough kind in the runtime catalogue has a renderer route',()=>{
  const kinds=[...new Set(bank.map(v=>v.kind).filter(bypasses))];
  for(const kind of kinds) assert.equal(hasDedicatedRenderer(kind),true,`${kind} passthrough must route to a renderer`);
});
