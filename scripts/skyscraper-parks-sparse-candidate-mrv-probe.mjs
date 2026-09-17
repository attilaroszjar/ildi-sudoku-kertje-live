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
function exactVisible(line){let visible=0,max=0;for(const v of line){if(v===park)continue;if(v>max){max=v;visible++;}}return visible;}
function directionalPossible(line,target){
  const firstZero=line.indexOf(0);
  if(firstZero<0)return exactVisible(line)===target;
  let prefixVisible=0,prefixMax=0;
  for(let i=0;i<firstZero;i++){const v=line[i];if(v===park)continue;if(v>prefixMax){prefixMax=v;prefixVisible++;}}
  if(prefixVisible>target)return false;
  let remainingPotential=0;
  for(let i=firstZero;i<line.length;i++)if(line[i]!==park)remainingPotential++;
  return prefixVisible+remainingPotential>=target;
}
function linePossible(line,pair){return directionalPossible(line,pair[0])&&directionalPossible(line.slice().reverse(),pair[1]);}

function countCandidateMrvSolutions(source,limit=2){
  const grid=source.map(r=>r.slice()),rows=Array(n).fill(0),cols=Array(n).fill(0);
  const stats={nodes:0,branches:0,deadEnds:0,solutions:0,candidateAssignments:0,candidatePrunes:0,boundChecks:0,maxDepth:0};
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
    outer:for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){
      const latinMask=full&~(rows[r]|cols[c]);
      let allowed=0;
      for(let bits=latinMask;bits;bits&=bits-1){
        const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);
        stats.candidateAssignments++;
        grid[r][c]=d;rows[r]|=one;cols[c]|=one;
        if(affectedPossible(r,c))allowed|=one;else stats.candidatePrunes++;
        rows[r]^=one;cols[c]^=one;grid[r][c]=0;
      }
      const cnt=bitCount(allowed);
      if(!cnt){stats.deadEnds++;return;}
      if(cnt<best){br=r;bc=c;bm=allowed;best=cnt;if(cnt===1)break outer;}
    }
    if(br<0){stats.solutions++;return;}
    if(best>1)stats.branches++;
    for(let bits=bm;bits;bits&=bits-1){
      const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);
      grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;
      visit(depth+1);
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
let mismatches=0,productionMs=0,hybridMs=0;
for(const tc of cases){
  const t0=performance.now();const prod=G.countParkSolutions(tc.puzzle,generated,2,false);productionMs+=performance.now()-t0;
  const h=countCandidateMrvSolutions(tc.puzzle,2);hybridMs+=h.runtimeMs;if(prod!==h.solutions)mismatches++;
}
console.log('SKYSCRAPER_PARKS_CANDIDATE_MRV_DIFFERENTIAL '+JSON.stringify({seed,cases:cases.length,mismatches,productionMs:+productionMs.toFixed(1),candidateMrvMs:+hybridMs.toFixed(1),aggregateSpeedup:hybridMs?+(productionMs/hybridMs).toFixed(2):null}));
if(mismatches){console.log('SKYSCRAPER_PARKS_SPARSE_CANDIDATE_MRV_GATE:FAIL');process.exitCode=1;}else{
  const accepted=['r5c9','r7c7','r6c2','r1c9','r6c3','r6c1','r3c5','r1c3','r2c3','r9c4','r2c5','r7c3','r1c1','r5c1','r8c9','r8c6','r2c1'];
  const sparse=generated.puzzle.map(r=>r.slice());
  for(const cell of accepted){const m=/r(\d+)c(\d+)/.exec(cell);sparse[Number(m[1])-1][Number(m[2])-1]=0;}
  const cluesBefore=sparse.flat().filter(Boolean).length;
  if(cluesBefore!==13)throw new Error(`expected 13-clue reconstructed state, got ${cluesBefore}`);
  const trial=sparse.map(r=>r.slice());trial[6][5]=0;
  const hotspot=countCandidateMrvSolutions(trial,2);
  let baseFamilySolutions=null;
  if(hotspot.solutions===1)baseFamilySolutions=G.countParkSolutions(trial,generated,2,true);
  console.log('SKYSCRAPER_PARKS_SPARSE_CANDIDATE_MRV '+JSON.stringify({seed,cell:'r7c6',value:8,cluesBefore,trialClues:12,solutions:hotspot.solutions,baseFamilySolutions,productionContractPass:hotspot.solutions===1&&baseFamilySolutions>1,runtimeMs:+hotspot.runtimeMs.toFixed(1),stats:hotspot.stats}));
  console.log('SKYSCRAPER_PARKS_SPARSE_CANDIDATE_MRV_GATE:PASS');
}
