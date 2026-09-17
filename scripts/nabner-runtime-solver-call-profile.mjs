import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const wanted=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||['games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js','games/line-generator-proven-siblings-hardening.js'].includes(x));
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const G=ctx.SudokuGenerator,v=ctx.SudokuBank.find(x=>x.id==='nabner');if(!v)throw new Error('missing nabner');
const baseClassic=G.countSolutions,baseVariant=G.countVariantSolutions,rows=[];
for(let i=0;i<64;i++){
  const seed=31000+i,stat={classicCalls:0,classicMs:0,classicMaxMs:0,variantCalls:0,variantMs:0,variantMaxMs:0};
  G.countSolutions=function(...args){const t=performance.now();try{return baseClassic.apply(this,args);}finally{const ms=performance.now()-t;stat.classicCalls++;stat.classicMs+=ms;stat.classicMaxMs=Math.max(stat.classicMaxMs,ms);}};
  G.countVariantSolutions=function(...args){const t=performance.now();try{return baseVariant.apply(this,args);}finally{const ms=performance.now()-t;stat.variantCalls++;stat.variantMs+=ms;stat.variantMaxMs=Math.max(stat.variantMaxMs,ms);}};
  const t=performance.now();let g,error=null;try{g=G.make(v,seed,'expert');}catch(e){error=String(e?.message||e);}const runtimeMs=performance.now()-t;
  rows.push({seed,runtimeMs:+runtimeMs.toFixed(1),classicCalls:stat.classicCalls,classicMs:+stat.classicMs.toFixed(1),classicMaxMs:+stat.classicMaxMs.toFixed(1),variantCalls:stat.variantCalls,variantMs:+stat.variantMs.toFixed(1),variantMaxMs:+stat.variantMaxMs.toFixed(1),lineCount:g?.generation?.lineCount,clues:g?.generation?.clues,error});
}
G.countSolutions=baseClassic;G.countVariantSolutions=baseVariant;rows.sort((a,b)=>b.runtimeMs-a.runtimeMs);
console.log('NABNER_SOLVER_CALL_PROFILE '+JSON.stringify({samples:rows.length,top:rows.slice(0,12)}));
