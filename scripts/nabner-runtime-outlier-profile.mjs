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
const rows=[];
for(let i=0;i<64;i++){
  const seed=31000+i,t=performance.now(),g=G.make(v,seed,'expert'),ms=performance.now()-t;
  const verifyStats={};G.countVariantSolutions(g.puzzle,g,2,verifyStats);
  rows.push({seed,runtimeMs:+ms.toFixed(1),clues:g.generation?.clues,lineCount:g.generation?.lineCount,solutionGenerationNodes:g.generation?.solutionGenerationNodes,solutionGenerationAttempts:g.generation?.solutionGenerationAttempts,difficultyScore:g.generation?.difficultyScore,verifyNodes:verifyStats.nodes||0,verifyBranches:verifyStats.branches||0,verifyDeadEnds:verifyStats.deadEnds||0,topologyFingerprint:g.generation?.topologyFingerprint});
}
rows.sort((a,b)=>b.runtimeMs-a.runtimeMs);
const slow=rows.filter(x=>x.runtimeMs>=500),over1000=rows.filter(x=>x.runtimeMs>=1000);
console.log('NABNER_RUNTIME_OUTLIERS '+JSON.stringify({samples:rows.length,slow500:slow.length,slow1000:over1000.length,top:rows.slice(0,12)}));
