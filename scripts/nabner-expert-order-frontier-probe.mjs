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
const seed=Number(process.env.NABNER_ORDER_SEED||92003);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('NABNER_ORDER_SEED invalid');

function clone(value){return JSON.parse(JSON.stringify(value));}
function countClues(grid){return grid.flat().filter(Boolean).length;}
function lineMembershipCounts(data){
  const counts=Array(81).fill(0),lines=(data&&data.lines)||[];
  for(const raw of lines){
    const cells=Array.isArray(raw)?raw:(raw&&raw.cells)||[];
    for(const [r,c] of cells)counts[r*9+c]++;
  }
  return counts;
}

const baseline=siblings.makeVariantPilot(G,variant,seed,'expert');
baseline.generation.pilot=false;
baseline.generation.mode='seeded-variant-essential';
baseline.generation.verification='nabner-incremental-line-mask-pressure-mrv-exact';
const basePuzzle=clone(baseline.puzzle);
const baseGivens=countClues(basePuzzle);
if(baseGivens!==30)throw new Error(`expected 30-given baseline, got ${baseGivens}`);

const memberships=lineMembershipCounts(baseline.data);
const scored=[];
let prepassMs=0;
for(let index=0;index<81;index++){
  const r=Math.floor(index/9),c=index%9;
  if(!basePuzzle[r][c])continue;
  const child=clone(basePuzzle);child[r][c]=0;
  const stats={};const t0=performance.now();
  const solutions=G.countVariantSolutions(child,baseline,2,stats);
  const elapsed=performance.now()-t0;prepassMs+=elapsed;
  scored.push({index,cell:`r${r+1}c${c+1}`,nodes:stats.nodes??Number.MAX_SAFE_INTEGER,solutions,memberships:memberships[index],prepassMs:+elapsed.toFixed(2)});
}

const permanentRejected=scored.filter(x=>x.solutions!==1);
const candidates=scored.filter(x=>x.solutions===1);
const families=[
  {name:'cost-asc',order:candidates.slice().sort((a,b)=>a.nodes-b.nodes||a.index-b.index)},
  {name:'line-first-cost-asc',order:candidates.slice().sort((a,b)=>b.memberships-a.memberships||a.nodes-b.nodes||a.index-b.index)},
  {name:'off-line-first-cost-asc',order:candidates.slice().sort((a,b)=>a.memberships-b.memberships||a.nodes-b.nodes||a.index-b.index)}
];

function carve(family){
  const puzzle=clone(basePuzzle),attempts=[];
  let accepted=0,rejected=permanentRejected.length,solverMs=0,maxMs=0;
  for(const item of family.order){
    const index=item.index,r=Math.floor(index/9),c=index%9,old=puzzle[r][c];
    if(!old)continue;
    puzzle[r][c]=0;
    const stats={};const t0=performance.now();
    const solutions=G.countVariantSolutions(puzzle,baseline,2,stats);
    const elapsed=performance.now()-t0;solverMs+=elapsed;maxMs=Math.max(maxMs,elapsed);
    const keep=solutions===1;
    if(keep)accepted++;else{rejected++;puzzle[r][c]=old;}
    attempts.push({index,cell:item.cell,accepted:keep,solutions,givensAfter:countClues(puzzle),runtimeMs:+elapsed.toFixed(1),nodes:stats.nodes??null,memberships:item.memberships});
  }
  const finalGivens=countClues(puzzle),finalStats={};
  const unique=G.countVariantSolutions(puzzle,baseline,2,finalStats)===1;
  const essential=G.countSolutions(puzzle,2)>1;
  const local=permanentRejected.every(x=>x.solutions>=2)&&attempts.filter(x=>!x.accepted).every(x=>x.solutions>=2);
  return {name:family.name,acceptedRemovals:accepted,rejectedRemovals:rejected,finalGivens,density:+(finalGivens/81).toFixed(3),unique,essential,local,solverMs:+solverMs.toFixed(1),maxMs:+maxMs.toFixed(1),finalNodes:finalStats.nodes??null,hottest:attempts.slice().sort((a,b)=>b.runtimeMs-a.runtimeMs).slice(0,5)};
}

const results=[];
for(const family of families)results.push(carve(family));
results.sort((a,b)=>a.finalGivens-b.finalGivens||a.solverMs-b.solverMs||a.name.localeCompare(b.name));
const best=results[0];
const pass=results.every(r=>r.unique&&r.essential&&r.local)&&best.finalGivens<=18;
console.log('NABNER_ORDER_FRONTIER '+JSON.stringify({seed,baseGivens,prepassMs:+prepassMs.toFixed(1),baselinePermanentRejected:permanentRejected.map(x=>({index:x.index,cell:x.cell,nodes:x.nodes,solutions:x.solutions})),results,best}));
console.log('NABNER_ORDER_FRONTIER_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
