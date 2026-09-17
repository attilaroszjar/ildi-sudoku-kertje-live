import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const wanted=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||['games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js'].includes(x));
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const G=ctx.SudokuGenerator,S=ctx.LineGeneratorProvenSiblings,v=ctx.SudokuBank.find(x=>x.id==='nabner');if(!v)throw new Error('missing nabner');
const seeds=Array.from({length:64},(_,i)=>31000+i),targets=[27,28,29,30];
function pct(a,p){const s=a.slice().sort((x,y)=>x-y);return s[Math.ceil(s.length*p)-1]}
const rows=[];
for(const target of targets){
  const times=[];let failures=0,valid=0,unique=0,essential=0;const lineCounts=[];
  for(const seed of seeds){
    try{
      const t=performance.now();
      const g=S.makeVariantPilot(G,v,seed,'expert',{initialLines:4,maxLines:4,targets:{gentle:40,focused:32,expert:target}});
      times.push(performance.now()-t);lineCounts.push(g.generation.lineCount);
      const okLines=g.data.lines.every(line=>{const vals=line.map(([r,c])=>g.solution[r][c]);return new Set(vals).size===vals.length&&vals.every((x,i)=>vals.every((y,j)=>i===j||Math.abs(x-y)!==1));});
      if(okLines)valid++;else failures++;
      if(G.countVariantSolutions(g.puzzle,g,2)===1)unique++;else failures++;
      if(G.countSolutions(g.puzzle,2)>1&&g.generation.variantEssential===true)essential++;else failures++;
    }catch(e){failures++;}
  }
  rows.push({target,samples:times.length,failures,valid,exactUnique:unique,variantEssential:essential,lineCountMin:Math.min(...lineCounts),lineCountMax:Math.max(...lineCounts),runtimeP50Ms:+pct(times,.5).toFixed(1),runtimeP95Ms:+pct(times,.95).toFixed(1),runtimeMaxMs:+Math.max(...times).toFixed(1)});
}
console.log('NABNER_RUNTIME_TARGET_SWEEP '+JSON.stringify(rows));
