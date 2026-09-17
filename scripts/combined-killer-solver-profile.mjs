import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const id=process.argv[2];
const seed=Number(process.argv[3])>>>0;
if(!id||!Number.isFinite(seed))throw new Error('usage: node scripts/combined-killer-solver-profile.mjs <id> <seed>');
const files=[
  'games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-bank-iteration3.js','games/sudoku-generator.js',
  'games/line-generator-core.js','games/killer-generator.js','games/line-generator-directed.js','games/line-generator-arrow.js',
  'games/line-generator-proven-siblings.js','games/line-generator-symmetric.js','games/line-generator-sliding-triple.js',
  'games/line-generator-whole-set.js','games/line-generator-transition.js','games/combined-killer-generator.js'
];
const ctx={console,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const G=ctx.SudokuGenerator,C=ctx.CombinedKillerGenerator,variant=ctx.SudokuBank.find(v=>v.id===id);
if(!variant)throw new Error('missing variant '+id);
const origVariant=G.countVariantSolutions.bind(G),origClassic=G.countSolutions.bind(G);
const stats={combined:{calls:0,ms:0,maxMs:0},killer:{calls:0,ms:0,maxMs:0},secondary:{calls:0,ms:0,maxMs:0},classic:{calls:0,ms:0,maxMs:0}};
const slow=[];
function bucket(v){const kinds=(v&&v.kinds)||[];if(kinds.length===2)return 'combined';if(kinds.length===1&&kinds[0]==='killer')return 'killer';if(kinds.length===1)return 'secondary';return 'combined';}
G.countVariantSolutions=function(grid,v,limit,extra){const b=bucket(v),t0=performance.now(),out=origVariant(grid,v,limit,extra),ms=performance.now()-t0,s=stats[b];s.calls++;s.ms+=ms;s.maxMs=Math.max(s.maxMs,ms);if(ms>=100)slow.push({kind:b,ms:Math.round(ms*10)/10,clues:grid.flat().filter(Boolean).length,result:out});return out;};
G.countSolutions=function(grid,limit){const t0=performance.now(),out=origClassic(grid,limit),ms=performance.now()-t0,s=stats.classic;s.calls++;s.ms+=ms;s.maxMs=Math.max(s.maxMs,ms);if(ms>=100)slow.push({kind:'classic',ms:Math.round(ms*10)/10,clues:grid.flat().filter(Boolean).length,result:out});return out;};
const t0=performance.now();
let status='PASS',error=null,generated=null;
try{generated=C.makeVariantPilot(G,variant,seed,'focused',{maxAttempts:8});}catch(e){status='FAIL';error=String(e&&e.message||e);}
const totalMs=performance.now()-t0;
for(const s of Object.values(stats)){s.ms=Math.round(s.ms*10)/10;s.maxMs=Math.round(s.maxMs*10)/10;}
slow.sort((a,b)=>b.ms-a.ms);
console.log('COMBINED_KILLER_SOLVER_PROFILE '+JSON.stringify({id,seed,status,error,totalMs:Math.round(totalMs*10)/10,generation:generated&&generated.generation?{clues:generated.generation.clues,cages:generated.generation.cageCount,componentAttempts:generated.generation.componentSearchAttempts}:null,stats,slow:slow.slice(0,20)}));
if(status!=='PASS')process.exitCode=1;
