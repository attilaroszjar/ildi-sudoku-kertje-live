'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const wanted=refs.filter(x=>
  /^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||
  x==='games/sudoku-generator.js'||
  x==='games/p3-nurikabe-complete.js'
);
const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
ctx.globalThis=ctx;ctx.window=ctx;ctx.localStorage={getItem(){return null;},setItem(){}};
vm.createContext(ctx);
for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});

const G=ctx.SudokuGenerator;
const variant=ctx.SudokuBank.find(v=>v.id==='nurikabe');
const rows=[];
for(const n of [5,6,7,8]){
  variant.data.p3Size=n;
  const seed=(0x76A00000+n)>>>0;
  const t0=performance.now();
  const g=G.make(variant,seed,'expert');
  const generationMs=performance.now()-t0;
  const stats={};
  const t1=performance.now();
  const count=G.countNurikabeSolutions(g.puzzle,2,stats,g.preShaded);
  const verifyMs=performance.now()-t1;
  let removable=0;
  const necessity=[];
  for(let i=0;i<g.preShaded.length;i++){
    const trial=g.preShaded.slice(0,i).concat(g.preShaded.slice(i+1));
    const s={};
    const t2=performance.now();
    const c=G.countNurikabeSolutions(g.puzzle,2,s,trial);
    const ms=performance.now()-t2;
    if(c===1)removable++;
    necessity.push({atom:g.preShaded[i],count:c,ms:Number(ms.toFixed(3)),stats:s});
  }
  rows.push({
    boardSize:n,
    seed,
    generationMs:Number(generationMs.toFixed(3)),
    verifyMs:Number(verifyMs.toFixed(3)),
    preShaded:g.preShaded.length,
    count,
    localIrreducible:g.generation.localIrreducible===true,
    individuallyRemovable:removable,
    stats,
    necessity
  });
}
console.log('NURIKABE_EXPERT_MULTISIZE '+JSON.stringify(rows));
