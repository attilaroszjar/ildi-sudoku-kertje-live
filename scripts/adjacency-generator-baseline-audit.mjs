import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const bank=fs.readFileSync(path.join(root,'games/sudoku-bank.js'),'utf8');
const generator=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};
ctx.globalThis=ctx;ctx.window=ctx;
vm.createContext(ctx);
vm.runInContext(bank,ctx,{filename:'sudoku-bank.js'});
vm.runInContext(generator,ctx,{filename:'sudoku-generator.js'});

const G=ctx.SudokuGenerator;
const ids=['kropki','xv','consecutive'];
const seeds=Array.from({length:16},(_,i)=>8100+i);

function normalizeSymbols(grid){const map=new Map();let next=1;return grid.map(row=>row.map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}));}
function rotate(grid){const n=grid.length;return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>grid[n-1-c][r]));}
function reflect(grid){return grid.map(row=>row.slice().reverse());}
function structuralFingerprint(grid){const forms=[];let g=grid.map(row=>row.slice());for(let i=0;i<4;i++){for(const x of [g,reflect(g)])forms.push(normalizeSymbols(x).flat().join(''));g=rotate(g);}forms.sort();return forms[0];}
function edgeFingerprint(data){const edges=(data&&data.edges)||[];return edges.map(e=>{const a=e.a.join(','),b=e.b.join(','),ends=a<b?[a,b]:[b,a];return ends[0]+'>'+ends[1]+':'+(e.type??e.sum??e.op??'');}).sort().join('|');}
function round(x){return Math.round(x*10)/10;}

const rows={};
for(const id of ids){
  const variant=ctx.SudokuBank.find(v=>v.id===id);
  if(!variant)throw new Error('missing variant '+id);
  const puzzles=new Set(),solutions=new Set(),structures=new Set(),topologies=new Set(),times=[];
  let exactUnique=0,variantEssential=0;
  for(const seed of seeds){
    const t0=performance.now();
    const g=G.make(variant,seed,'focused');
    times.push(performance.now()-t0);
    puzzles.add(JSON.stringify(g.puzzle));
    solutions.add(JSON.stringify(g.solution));
    structures.add(structuralFingerprint(g.solution));
    topologies.add(edgeFingerprint(g.data));
    if(G.countVariantSolutions(g.puzzle,g,2)===1)exactUnique++;
    if(G.countSolutions(g.puzzle,2)>1&&g.generation&&g.generation.variantEssential===true)variantEssential++;
  }
  rows[id]={
    puzzleUnique:puzzles.size,
    solutionUnique:solutions.size,
    structuralSolutionUnique:structures.size,
    topologyUnique:topologies.size,
    exactUnique,
    variantEssential,
    runtimeMaxMs:round(Math.max(...times))
  };
}

console.log('ADJACENCY_GENERATOR_BASELINE '+JSON.stringify({seeds:seeds.length,variants:rows}));
const narrow=ids.every(id=>rows[id].solutionUnique===1&&rows[id].topologyUnique===1);
console.log('ADJACENCY_GENERATOR_BASELINE:'+(narrow?'CONFIRMED_NARROW':'REVIEW'));
