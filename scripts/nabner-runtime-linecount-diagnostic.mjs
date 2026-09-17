import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const wanted=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||['games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js'].includes(x));
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const G=ctx.SudokuGenerator,S=ctx.LineGeneratorProvenSiblings,v=ctx.SudokuBank.find(x=>x.id==='nabner');if(!v)throw new Error('missing nabner');
const seeds=Array.from({length:64},(_,i)=>31000+i),configs=[2,3,4];
function pct(a,p){a=a.slice().sort((x,y)=>x-y);return a[Math.ceil(a.length*p)-1]}
const rows=[];
for(const initialLines of configs){const times=[],fails=[],lineCounts=[];for(const seed of seeds){try{const t=performance.now(),g=S.makeVariantPilot(G,v,seed,'expert',{initialLines,maxLines:4});times.push(performance.now()-t);lineCounts.push(g.generation.lineCount);}catch(e){fails.push(seed);}}rows.push({initialLines,samples:times.length,failures:fails.length,lineCountMin:Math.min(...lineCounts),lineCountMax:Math.max(...lineCounts),runtimeP50Ms:+pct(times,.5).toFixed(1),runtimeP95Ms:+pct(times,.95).toFixed(1),runtimeMaxMs:+Math.max(...times).toFixed(1)});}
console.log('NABNER_RUNTIME_LINECOUNT_DIAGNOSTIC '+JSON.stringify(rows));
