import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {canonicalJson,structuralSolutionFingerprint} from './lib/sudoku-production-audit.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const EXPECTED_TOTAL=72;
const EXPECTED_STRUCTURAL_ORBITS=1;
const FULL=0x1ff;

function runtimeRefs(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const all=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
  return all.filter(x=>{
    if(/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x))return true;
    if(x==='games/sudoku-generator.js')return true;
    if(/^games\/(?:extra-house-generator-core|line-generator-core|killer-generator|line-generator-[^/]+)\.js$/.test(x))return true;
    if(/^games\/iteration\d+-generator-hardening\.js$/.test(x))return true;
    if(/^games\/[^/]+(?:generator|runtime)-hardening\.js$/.test(x))return true;
    return false;
  });
}

function loadRuntime(){
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const file of runtimeRefs()){
    const full=path.join(root,file);
    if(!fs.existsSync(full))throw new Error('runtime ref missing: '+file);
    vm.runInContext(fs.readFileSync(full,'utf8'),ctx,{filename:file});
  }
  const G=ctx.SudokuGenerator,variant=ctx.SudokuBank&&ctx.SudokuBank.find(v=>v.id==='miracle');
  if(!G||typeof G.countVariantSolutions!=='function')throw new Error('countVariantSolutions missing');
  if(!variant)throw new Error('Miracle Sudoku missing');
  const expected=['anti-king','anti-knight','nonconsecutive'].sort();
  const actual=[...(variant.kinds||[])].sort();
  if(canonicalJson(actual)!==canonicalJson(expected))throw new Error('Miracle rule-set drift: '+canonicalJson(actual));
  return {G,variant};
}

function bitCount(x){let n=0;while(x){x&=x-1;n++;}return n;}
function bitToDigit(bit){return 1+Math.round(Math.log(bit)/Math.LN2);}
function rc(index){return [Math.floor(index/9),index%9];}

function buildPeers(){
  const equalPeers=Array.from({length:81},()=>new Set());
  const orthPeers=Array.from({length:81},()=>[]);
  const king=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)king.push([dr,dc]);
  const knight=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
  const orth=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let i=0;i<81;i++){
    const [r,c]=rc(i);
    for(const [dr,dc] of king.concat(knight)){
      const rr=r+dr,cc=c+dc;if(rr>=0&&rr<9&&cc>=0&&cc<9)equalPeers[i].add(rr*9+cc);
    }
    for(const [dr,dc] of orth){
      const rr=r+dr,cc=c+dc;if(rr>=0&&rr<9&&cc>=0&&cc<9)orthPeers[i].push(rr*9+cc);
    }
  }
  return {equalPeers:equalPeers.map(x=>[...x]),orthPeers};
}

function enumerateMiracleSolutions(){
  const {equalPeers,orthPeers}=buildPeers();
  const grid=Array(81).fill(0),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0);
  const solutions=[];let nodes=0,deadEnds=0,branches=0;

  function candidateMask(index){
    const [r,c]=rc(index),box=Math.floor(r/3)*3+Math.floor(c/3);
    let mask=FULL&~(rows[r]|cols[c]|boxes[box]);
    for(const peer of equalPeers[index]){
      const v=grid[peer];if(v)mask&=~(1<<(v-1));
    }
    for(const peer of orthPeers[index]){
      const v=grid[peer];if(!v)continue;
      if(v>1)mask&=~(1<<(v-2));
      if(v<9)mask&=~(1<<v);
    }
    return mask&FULL;
  }

  function visit(){
    nodes++;
    let best=-1,bestMask=0,bestCount=10;
    for(let i=0;i<81;i++)if(!grid[i]){
      const mask=candidateMask(i),count=bitCount(mask);
      if(!count){deadEnds++;return;}
      if(count<bestCount){best=i;bestMask=mask;bestCount=count;if(count===1)break;}
    }
    if(best<0){
      solutions.push(Array.from({length:9},(_,r)=>grid.slice(r*9,r*9+9)));
      return;
    }
    if(bestCount>1)branches++;
    const [r,c]=rc(best),box=Math.floor(r/3)*3+Math.floor(c/3);
    for(let bits=bestMask;bits;bits&=bits-1){
      const bit=bits&-bits,d=bitToDigit(bit);
      grid[best]=d;rows[r]|=bit;cols[c]|=bit;boxes[box]|=bit;
      visit();
      rows[r]^=bit;cols[c]^=bit;boxes[box]^=bit;grid[best]=0;
      if(solutions.length>EXPECTED_TOTAL)return;
    }
  }

  visit();
  return {solutions,nodes,deadEnds,branches};
}

const started=Date.now();
const {G,variant}=loadRuntime();
const enumerated=enumerateMiracleSolutions();
const exactKeys=new Set(enumerated.solutions.map(canonicalJson));
const structuralKeys=new Set(enumerated.solutions.map(structuralSolutionFingerprint));
let canonicalRejects=0;
for(const grid of enumerated.solutions)if(G.countVariantSolutions(grid,variant,2)!==1)canonicalRejects++;

const pass=enumerated.solutions.length===EXPECTED_TOTAL&&exactKeys.size===EXPECTED_TOTAL&&structuralKeys.size===EXPECTED_STRUCTURAL_ORBITS&&canonicalRejects===0;
const output={
  expectedTotal:EXPECTED_TOTAL,
  exactSolverTotal:enumerated.solutions.length,
  enumeratedUnique:exactKeys.size,
  structuralOrbits:structuralKeys.size,
  canonicalRejects,
  nodes:enumerated.nodes,
  branches:enumerated.branches,
  deadEnds:enumerated.deadEnds,
  enumerator:'dedicated-bitmask-mrv-with-canonical-full-grid-reverification',
  fingerprint:'symbol-normalized D4',
  elapsedMs:Date.now()-started
};
console.log('MIRACLE_SOLUTION_SPACE_AUDIT '+JSON.stringify(output));
console.log('MIRACLE_SOLUTION_SPACE_AUDIT:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
