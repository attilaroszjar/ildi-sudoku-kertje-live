'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank'))){
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
}
vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx,{filename:'games/sudoku-generator.js'});

const variant=ctx.SudokuBank.find(x=>x.id==='x-sums');
if(!variant)throw new Error('canonical X-Sums Sudoku not found');

const difficulties=['gentle','focused','expert'];
const sampleCount=Math.max(8,Number.parseInt(process.argv[2]||'48',10)||48);
const seeds=Array.from({length:sampleCount},(_,i)=>((0x5A17+Math.imul(i+1,0x9E3779B1))>>>0));

function quantile(values,q){
  const a=values.slice().sort((x,y)=>x-y);
  if(!a.length)return null;
  const pos=(a.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);
  return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(pos-lo);
}
function summarize(rows){
  const scores=rows.map(x=>x.score),clues=rows.map(x=>x.clues);
  return {
    count:rows.length,
    score:{min:Math.min(...scores),p25:quantile(scores,.25),median:quantile(scores,.5),p75:quantile(scores,.75),max:Math.max(...scores)},
    clues:{min:Math.min(...clues),median:quantile(clues,.5),max:Math.max(...clues)},
    variantEssential:rows.every(x=>x.variantEssential),
    unique:rows.every(x=>x.unique)
  };
}

const all={};
for(const difficulty of difficulties){
  const rows=[];
  for(const seed of seeds){
    const out=ctx.SudokuGenerator.make(variant,seed,difficulty);
    const score=out.generation&&out.generation.difficultyScore;
    if(!Number.isFinite(score))throw new Error(`missing X-Sums difficultyScore for ${difficulty} seed ${seed}`);
    rows.push({seed,score,clues:out.generation.clues,unique:out.generation.unique,variantEssential:out.generation.variantEssential});
  }
  all[difficulty]={summary:summarize(rows),rows};
}

const medians=Object.fromEntries(difficulties.map(d=>[d,all[d].summary.score.median]));
const ordered=medians.gentle<medians.focused&&medians.focused<medians.expert;
console.log('X_SUMS_DIFFICULTY_CENSUS '+JSON.stringify({sampleCount,medians,ordered,summaries:Object.fromEntries(difficulties.map(d=>[d,all[d].summary]))}));
if(!ordered)process.exitCode=2;
