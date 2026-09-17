import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const first=allRefs.indexOf('games/sudoku-generator.js');
const last=allRefs.indexOf('games/miracle-generator-hardening.js');
if(first<0||last<first)throw new Error('production generator range missing');
const banks=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const refs=[...banks,...allRefs.slice(first,last+1).filter(ref=>!banks.includes(ref))];
globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of refs)(0,eval)(`${fs.readFileSync(path.join(root,ref),'utf8')}\n//# sourceURL=${ref}`);

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(x=>x.id==='skyscraper-parks');
if(!G||!variant||typeof G.countParkSolutions!=='function')throw new Error('Skyscraper Parks runtime unavailable');
const seed=Number(process.env.SKYSCRAPER_PARKS_EXPERT_SEED||92001);
const generated=G.make(variant,seed,'expert');
const n=generated.puzzle.length,park=generated.data?.parkValue??n,full=(1<<n)-1;
function bitCount(x){let c=0;while(x){x&=x-1;c++;}return c;}
function cluePair(axis,index){
  const clues=(generated.data?.clues||[]).filter(cl=>cl.axis===axis&&cl.index===index);
  const near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom';
  const a=clues.find(cl=>cl.side===near)?.count,b=clues.find(cl=>cl.side===far)?.count;
  if(!Number.isInteger(a)||!Number.isInteger(b))throw new Error(`missing clue pair ${axis} ${index}`);
  return [a,b];
}
const rowPairs=Array.from({length:n},(_,i)=>cluePair('row',i));
const colPairs=Array.from({length:n},(_,i)=>cluePair('col',i));

function exactVisible(line){
  let visible=0,max=0;
  for(const v of line){if(v===park)continue;if(v>max){max=v;visible++;}}
  return visible;
}
function directionalPossible(line,target){
  const firstZero=line.indexOf(0);
  if(firstZero<0)return exactVisible(line)===target;

  // Only the contiguous prefix before the first gap is immutable. Values after
  // a gap may later be hidden by a value inserted into that gap, so they cannot
  // contribute to a safe lower bound.
  let prefixVisible=0,prefixMax=0;
  for(let i=0;i<firstZero;i++){
    const v=line[i];
    if(v===park)continue;
    if(v>prefixMax){prefixMax=v;prefixVisible++;}
  }
  if(prefixVisible>target)return false;

  // Conservative exact-safe upper bound: every remaining position that is not
  // already fixed to the park value could, in the most optimistic completion,
  // add at most one new visible building. This may overestimate feasibility but
  // can never reject a valid completion.
  let remainingPotential=0;
  for(let i=firstZero;i<line.length;i++)if(line[i]!==park)remainingPotential++;
  if(prefixVisible+remainingPotential<target)return false;
  return true;
}
function linePossible(line,pair){
  if(!directionalPossible(line,pair[0]))return false;
  return directionalPossible(line.slice().reverse(),pair[1]);
}
function countBoundSolutions(source,limit=2){
  const grid=source.map(r=>r.slice()),rows=Array(n).fill(0),cols=Array(n).fill(0);
  const stats={nodes:0,branches:0,deadEnds:0,solutions:0,assignmentsTried:0,boundChecks:0,boundPrunes:0,maxDepth:0};
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const v=grid[r][c];if(!v)continue;const bit=1<<(v-1);if((rows[r]|cols[c])&bit)return {solutions:0,stats,runtimeMs:0};rows[r]|=bit;cols[c]|=bit;
  }
  function affectedPossible(r,c){
    stats.boundChecks+=2;
    if(!linePossible(grid[r],rowPairs[r]))return false;
    const col=Array.from({length:n},(_,rr)=>grid[rr][c]);
    return linePossible(col,colPairs[c]);
  }
  function visit(depth){
    stats.nodes++;if(depth>stats.maxDepth)stats.maxDepth=depth;if(stats.solutions>=limit)return;
    let br=-1,bc=-1,bm=0,best=n+1;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){
      const mask=full&~(rows[r]|cols[c]),cnt=bitCount(mask);
      if(!cnt){stats.deadEnds++;return;}
      if(cnt<best){br=r;bc=c;bm=mask;best=cnt;if(cnt===1)break;}
    }
    if(br<0){stats.solutions++;return;}
    if(best>1)stats.branches++;
    for(let bits=bm;bits;bits&=bits-1){
      const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);
      stats.assignmentsTried++;
      grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;
      if(affectedPossible(br,bc))visit(depth+1);else stats.boundPrunes++;
      rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;
      if(stats.solutions>=limit)return;
    }
  }
  const t0=performance.now();visit(0);return {solutions:stats.solutions,stats,runtimeMs:performance.now()-t0};
}

const cases=[{id:'base',puzzle:generated.puzzle.map(r=>r.slice())}];
for(let idx=0;idx<n*n;idx++){
  const r=Math.floor(idx/n),c=idx%n;if(!generated.puzzle[r][c])continue;
  const p=generated.puzzle.map(row=>row.slice());p[r][c]=0;cases.push({id:`r${r+1}c${c+1}`,puzzle:p});
}
let mismatches=0,legacyMs=0,boundMs=0,totalNodes=0,totalPrunes=0,totalChecks=0;
const results=[];
for(const tc of cases){
  const t0=performance.now(),legacy=G.countParkSolutions(tc.puzzle,generated,2,false),lms=performance.now()-t0;
  const opt=countBoundSolutions(tc.puzzle,2);
  if(legacy!==opt.solutions)mismatches++;
  legacyMs+=lms;boundMs+=opt.runtimeMs;totalNodes+=opt.stats.nodes;totalPrunes+=opt.stats.boundPrunes;totalChecks+=opt.stats.boundChecks;
  results.push({id:tc.id,legacy,bound:opt.solutions,match:legacy===opt.solutions,legacyMs:+lms.toFixed(1),boundMs:+opt.runtimeMs.toFixed(1),speedup:opt.runtimeMs?+(lms/opt.runtimeMs).toFixed(2):null,nodes:opt.stats.nodes,branches:opt.stats.branches,deadEnds:opt.stats.deadEnds,assignmentsTried:opt.stats.assignmentsTried,boundChecks:opt.stats.boundChecks,boundPrunes:opt.stats.boundPrunes,maxDepth:opt.stats.maxDepth});
}
console.log('SKYSCRAPER_PARKS_POSTASSIGN_BOUND_DIFFERENTIAL '+JSON.stringify({seed,cases:cases.length,mismatches,legacyMs:+legacyMs.toFixed(1),boundMs:+boundMs.toFixed(1),aggregateSpeedup:boundMs?+(legacyMs/boundMs).toFixed(2):null,totalNodes,totalPrunes,totalChecks,slowest:results.slice().sort((a,b)=>b.boundMs-a.boundMs).slice(0,8)}));
console.log('SKYSCRAPER_PARKS_POSTASSIGN_BOUND_DIFFERENTIAL_GATE:'+(mismatches===0?'PASS':'FAIL'));
if(mismatches)process.exitCode=1;
