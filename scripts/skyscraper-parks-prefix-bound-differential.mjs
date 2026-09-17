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
const n=generated.puzzle.length,full=(1<<n)-1,park=generated.data?.parkValue??n;
function bitCount(x){let c=0;while(x){x&=x-1;c++;}return c;}
function pair(axis,index){
  const clues=(generated.data?.clues||[]).filter(cl=>cl.axis===axis&&cl.index===index);
  const near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom';
  const a=clues.find(cl=>cl.side===near)?.count,b=clues.find(cl=>cl.side===far)?.count;
  if(!Number.isInteger(a)||!Number.isInteger(b))throw new Error(`missing clue pair ${axis} ${index}`);
  return [a,b];
}
const rowPairs=Array.from({length:n},(_,i)=>pair('row',i));
const colPairs=Array.from({length:n},(_,i)=>pair('col',i));

function directionalFeasible(line,target,stats){
  stats.directionalBounds++;
  let max=0,seen=0,prefix=0;
  for(;prefix<n&&line[prefix];prefix++){
    const v=line[prefix];
    if(v===park)continue;
    if(v>max){max=v;seen++;}
  }
  if(prefix===n)return seen===target;
  if(seen>target)return false;
  let higher=0;
  for(let d=max+1;d<=n;d++)if(d!==park)higher++;
  const upper=seen+Math.min(n-prefix,higher);
  return target<=upper;
}
function lineFeasible(line,pair,stats){
  if(!directionalFeasible(line,pair[0],stats))return false;
  const rev=Array.from(line).reverse();
  return directionalFeasible(rev,pair[1],stats);
}
function countBoundSolutions(source,limit=2){
  const grid=source.map(r=>r.slice()),rows=Array(n).fill(0),cols=Array(n).fill(0);
  const stats={nodes:0,branches:0,deadEnds:0,solutions:0,candidateDigitsTested:0,directionalBounds:0,boundPrunes:0,maxDepth:0};
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const v=grid[r][c];if(!v)continue;const bit=1<<(v-1);if((rows[r]|cols[c])&bit)return {solutions:0,stats,runtimeMs:0};rows[r]|=bit;cols[c]|=bit;
  }
  function candidateFeasible(r,c,d){
    grid[r][c]=d;
    const rowOk=lineFeasible(grid[r],rowPairs[r],stats);
    let colOk=false;
    if(rowOk){const col=Array.from({length:n},(_,rr)=>grid[rr][c]);colOk=lineFeasible(col,colPairs[c],stats);}
    grid[r][c]=0;
    if(!(rowOk&&colOk))stats.boundPrunes++;
    return rowOk&&colOk;
  }
  function visit(depth){
    stats.nodes++;if(depth>stats.maxDepth)stats.maxDepth=depth;if(stats.solutions>=limit)return;
    let br=-1,bc=-1,bm=0,best=n+1;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){
      let mask=full&~(rows[r]|cols[c]),allowed=0;
      for(let bits=mask;bits;bits&=bits-1){const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);stats.candidateDigitsTested++;if(candidateFeasible(r,c,d))allowed|=one;}
      const cnt=bitCount(allowed);if(!cnt){stats.deadEnds++;return;}
      if(cnt<best){br=r;bc=c;bm=allowed;best=cnt;if(cnt===1)break;}
    }
    if(br<0){stats.solutions++;return;}
    if(best>1)stats.branches++;
    for(let bits=bm;bits;bits&=bits-1){const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;visit(depth+1);rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;if(stats.solutions>=limit)return;}
  }
  const t0=performance.now();
  for(let r=0;r<n;r++)if(!lineFeasible(grid[r],rowPairs[r],stats)){return {solutions:0,stats,runtimeMs:performance.now()-t0};}
  for(let c=0;c<n;c++){const col=Array.from({length:n},(_,r)=>grid[r][c]);if(!lineFeasible(col,colPairs[c],stats)){return {solutions:0,stats,runtimeMs:performance.now()-t0};}}
  visit(0);return {solutions:stats.solutions,stats,runtimeMs:performance.now()-t0};
}

const cases=[{id:'base',puzzle:generated.puzzle.map(r=>r.slice())}];
for(let idx=0;idx<n*n;idx++){
  const r=Math.floor(idx/n),c=idx%n;if(!generated.puzzle[r][c])continue;
  const p=generated.puzzle.map(row=>row.slice());p[r][c]=0;cases.push({id:`r${r+1}c${c+1}`,puzzle:p});
}
let mismatches=0,legacyMs=0,boundMs=0,totalNodes=0,totalPrunes=0;
const results=[];
for(const tc of cases){
  const t0=performance.now(),legacy=G.countParkSolutions(tc.puzzle,generated,2,false),lms=performance.now()-t0;
  const opt=countBoundSolutions(tc.puzzle,2);
  if(legacy!==opt.solutions)mismatches++;
  legacyMs+=lms;boundMs+=opt.runtimeMs;totalNodes+=opt.stats.nodes;totalPrunes+=opt.stats.boundPrunes;
  results.push({id:tc.id,legacy,bound:opt.solutions,match:legacy===opt.solutions,legacyMs:+lms.toFixed(1),boundMs:+opt.runtimeMs.toFixed(1),speedup:opt.runtimeMs?+(lms/opt.runtimeMs).toFixed(2):null,nodes:opt.stats.nodes,branches:opt.stats.branches,deadEnds:opt.stats.deadEnds,candidateDigitsTested:opt.stats.candidateDigitsTested,directionalBounds:opt.stats.directionalBounds,boundPrunes:opt.stats.boundPrunes,maxDepth:opt.stats.maxDepth});
}
console.log('SKYSCRAPER_PARKS_PREFIX_BOUND_DIFFERENTIAL '+JSON.stringify({seed,cases:cases.length,mismatches,legacyMs:+legacyMs.toFixed(1),boundMs:+boundMs.toFixed(1),aggregateSpeedup:boundMs?+(legacyMs/boundMs).toFixed(2):null,totalNodes,totalPrunes,slowest:results.slice().sort((a,b)=>b.boundMs-a.boundMs).slice(0,8)}));
console.log('SKYSCRAPER_PARKS_PREFIX_BOUND_DIFFERENTIAL_GATE:'+(mismatches===0?'PASS':'FAIL'));
if(mismatches)process.exitCode=1;
