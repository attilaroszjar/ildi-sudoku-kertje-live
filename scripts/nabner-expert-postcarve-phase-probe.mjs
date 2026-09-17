import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const loadRefs=[...bankRefs,'games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js','games/line-generator-proven-siblings-hardening.js'];
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of loadRefs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const G=ctx.SudokuGenerator,siblings=ctx.LineGeneratorProvenSiblings,variant=ctx.SudokuBank.find(v=>v.id==='nabner');
if(!G||!siblings||!variant)throw new Error('Nabner runtime not loaded');
const seed=Number(process.env.NABNER_POSTCARVE_SEED||92003);
function cloneGrid(g){return g.map(r=>r.slice());}
function clues(g){return g.flat().filter(Boolean).length;}
function rng(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,random){for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

let t=performance.now();
const baseline=siblings.makeVariantPilot(G,variant,seed,'expert');
const baselineMs=performance.now()-t;
const grid=cloneGrid(baseline.puzzle);
const order=[];for(let i=0;i<81;i++)if(grid[Math.floor(i/9)][i%9])order.push(i);
shuffle(order,rng((seed^0x4E414243)>>>0));
let carveMs=0,accepted=0,rejected=0;
for(const index of order){
  const r=Math.floor(index/9),c=index%9,old=grid[r][c];grid[r][c]=0;
  t=performance.now();const n=G.countVariantSolutions(grid,baseline,2);carveMs+=performance.now()-t;
  if(n===1)accepted++;else{grid[r][c]=old;rejected++;}
}
const finalGivens=clues(grid);
const nabnerStats={};t=performance.now();const finalVariantSolutions=G.countVariantSolutions(grid,baseline,2,nabnerStats);const finalNabnerMs=performance.now()-t;
t=performance.now();const finalClassicSolutions=G.countSolutions(grid,2);const finalClassicMs=performance.now()-t;
console.log('NABNER_POSTCARVE_PHASES '+JSON.stringify({seed,baselineMs:+baselineMs.toFixed(1),baseGivens:clues(baseline.puzzle),carveMs:+carveMs.toFixed(1),accepted,rejected,finalGivens,finalVariantSolutions,finalNabnerMs:+finalNabnerMs.toFixed(1),finalNabnerNodes:nabnerStats.nodes??null,finalClassicSolutions,finalClassicMs:+finalClassicMs.toFixed(1),measuredTotalMs:+(baselineMs+carveMs+finalNabnerMs+finalClassicMs).toFixed(1)}));
const pass=finalVariantSolutions===1&&finalClassicSolutions>1&&accepted+rejected===30;
console.log('NABNER_POSTCARVE_PHASE_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
