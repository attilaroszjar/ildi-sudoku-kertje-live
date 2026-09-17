import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const loadRefs=[...bankRefs,'games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js','games/line-generator-proven-siblings-hardening.js'];
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of loadRefs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});

const G=ctx.SudokuGenerator;
const siblings=ctx.LineGeneratorProvenSiblings;
const variant=ctx.SudokuBank.find(v=>v.id==='nabner');
if(!G||!siblings||!variant)throw new Error('Nabner runtime not loaded');
const seed=Number(process.env.NABNER_COST_SEED||92003);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('NABNER_COST_SEED invalid');

function clone(value){return JSON.parse(JSON.stringify(value));}
function countClues(grid){return grid.flat().filter(Boolean).length;}

const baseline=siblings.makeVariantPilot(G,variant,seed,'expert');
baseline.generation.pilot=false;
baseline.generation.mode='seeded-variant-essential';
baseline.generation.verification='nabner-incremental-line-mask-pressure-mrv-exact';
const puzzle=clone(baseline.puzzle);
const baseGivens=countClues(puzzle);
if(baseGivens!==30)throw new Error(`expected 30-given baseline, got ${baseGivens}`);

const scored=[];
let prepassMs=0;
for(let index=0;index<81;index++){
  const r=Math.floor(index/9),c=index%9;
  if(!puzzle[r][c])continue;
  const child=clone(puzzle);child[r][c]=0;
  const stats={};const t0=performance.now();
  const solutions=G.countVariantSolutions(child,baseline,2,stats);
  const elapsed=performance.now()-t0;prepassMs+=elapsed;
  scored.push({index,cell:`r${r+1}c${c+1}`,nodes:stats.nodes??Number.MAX_SAFE_INTEGER,solutions,prepassMs:+elapsed.toFixed(1)});
}
scored.sort((a,b)=>a.nodes-b.nodes||a.index-b.index);

const attempts=[];
let accepted=0,rejected=0,carveMs=0,maxMs=0;
for(const item of scored){
  const index=item.index,r=Math.floor(index/9),c=index%9,old=puzzle[r][c];
  if(!old)continue;
  puzzle[r][c]=0;
  const stats={};const t0=performance.now();
  const solutions=G.countVariantSolutions(puzzle,baseline,2,stats);
  const elapsed=performance.now()-t0;carveMs+=elapsed;maxMs=Math.max(maxMs,elapsed);
  const keep=solutions===1;
  if(keep)accepted++;else{rejected++;puzzle[r][c]=old;}
  attempts.push({index,cell:`r${r+1}c${c+1}`,accepted:keep,solutions,givensAfter:countClues(puzzle),runtimeMs:+elapsed.toFixed(1),nodes:stats.nodes??null,branches:stats.branches??null,deadEnds:stats.deadEnds??null,baselineNodes:item.nodes});
}

const finalGivens=countClues(puzzle);
const finalStats={};
const unique=G.countVariantSolutions(puzzle,baseline,2,finalStats)===1;
const essential=G.countSolutions(puzzle,2)>1;
const local=attempts.filter(x=>!x.accepted).every(x=>x.solutions>=2);
const hottest=attempts.slice().sort((a,b)=>b.runtimeMs-a.runtimeMs).slice(0,10);
console.log('NABNER_COST_ORDERED_CARVE '+JSON.stringify({
  seed,baseGivens,acceptedRemovals:accepted,rejectedRemovals:rejected,finalGivens,density:+(finalGivens/81).toFixed(3),
  unique,essential,locallyIrreducibleUnderProductionContract:local,
  prepassMs:+prepassMs.toFixed(1),carveMs:+carveMs.toFixed(1),totalMeasuredMs:+(prepassMs+carveMs).toFixed(1),maxMs:+maxMs.toFixed(1),
  finalNodes:finalStats.nodes??null,order:scored,hottest
}));
const pass=unique&&essential&&local&&accepted+rejected===baseGivens;
console.log('NABNER_COST_ORDERED_CARVE_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
