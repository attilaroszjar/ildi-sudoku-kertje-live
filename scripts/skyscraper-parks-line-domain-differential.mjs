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
const n=generated.puzzle.length;
const park=generated.data?.parkValue??n;
const full=(1<<n)-1;
function bitCount(x){let c=0;while(x){x&=x-1;c++;}return c;}
function visible(line){let max=0,count=0;for(const v of line){if(v===park)continue;if(v>max){max=v;count++;}}return count;}
function cluePair(axis,index){
  const clues=(generated.data?.clues||[]).filter(cl=>cl.axis===axis&&cl.index===index);
  const near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom';
  const a=clues.find(cl=>cl.side===near)?.count;
  const b=clues.find(cl=>cl.side===far)?.count;
  if(!Number.isInteger(a)||!Number.isInteger(b))throw new Error(`missing clue pair ${axis} ${index}`);
  return [a,b];
}
function key(a,b){return `${a},${b}`;}
const needed=new Set();for(let i=0;i<n;i++){const r=cluePair('row',i),c=cluePair('col',i);needed.add(key(r[0],r[1]));needed.add(key(c[0],c[1]));}
const buckets=new Map([...needed].map(k=>[k,[]]));
const perm=Array(n).fill(0),used=Array(n+1).fill(false);
function emit(pos){
  if(pos===n){const a=visible(perm),b=visible([...perm].reverse()),bucket=buckets.get(key(a,b));if(bucket)bucket.push(Uint8Array.from(perm));return;}
  for(let d=1;d<=n;d++)if(!used[d]){used[d]=true;perm[pos]=d;emit(pos+1);used[d]=false;}
}
const domainStart=performance.now();emit(0);const domainBuildMs=performance.now()-domainStart;
const rowDomains=Array.from({length:n},(_,i)=>{const p=cluePair('row',i);return buckets.get(key(p[0],p[1]));});
const colDomains=Array.from({length:n},(_,i)=>{const p=cluePair('col',i);return buckets.get(key(p[0],p[1]));});

function compatible(line,domain){outer:for(const p of domain){for(let i=0;i<n;i++)if(line[i]&&line[i]!==p[i])continue outer;yieldDummy=p;}}
let yieldDummy=null;
function supports(line,domain,stats){
  const masks=Array(n).fill(0);let matches=0;
  outer:for(const p of domain){
    stats.domainRowsTested++;
    for(let i=0;i<n;i++)if(line[i]&&line[i]!==p[i])continue outer;
    matches++;
    for(let i=0;i<n;i++)if(!line[i])masks[i]|=1<<(p[i]-1);
  }
  return {matches,masks};
}
function countLineDomainSolutions(source,limit=2){
  const grid=source.map(r=>r.slice());
  const stats={nodes:0,branches:0,deadEnds:0,solutions:0,domainRowsTested:0,maxDepth:0};
  function visit(depth){
    stats.nodes++;if(depth>stats.maxDepth)stats.maxDepth=depth;if(stats.solutions>=limit)return;
    const rowSup=Array(n),colSup=Array(n);
    for(let r=0;r<n;r++){
      const s=supports(grid[r],rowDomains[r],stats);if(!s.matches){stats.deadEnds++;return;}rowSup[r]=s.masks;
    }
    for(let c=0;c<n;c++){
      const line=Array.from({length:n},(_,r)=>grid[r][c]);
      const s=supports(line,colDomains[c],stats);if(!s.matches){stats.deadEnds++;return;}colSup[c]=s.masks;
    }
    let br=-1,bc=-1,bm=0,best=n+1;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){
      const mask=rowSup[r][c]&colSup[c][r]&full,cnt=bitCount(mask);
      if(!cnt){stats.deadEnds++;return;}
      if(cnt<best){br=r;bc=c;bm=mask;best=cnt;if(cnt===1)break;}
    }
    if(br<0){stats.solutions++;return;}
    if(best>1)stats.branches++;
    for(let bits=bm;bits;bits&=bits-1){const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=d;visit(depth+1);grid[br][bc]=0;if(stats.solutions>=limit)return;}
  }
  const t0=performance.now();visit(0);return {solutions:stats.solutions,stats,runtimeMs:performance.now()-t0};
}

const cases=[{id:'base',puzzle:generated.puzzle.map(r=>r.slice())}];
for(let idx=0;idx<n*n;idx++){const r=Math.floor(idx/n),c=idx%n;if(!generated.puzzle[r][c])continue;const p=generated.puzzle.map(row=>row.slice());p[r][c]=0;cases.push({id:`r${r+1}c${c+1}`,puzzle:p});}
let mismatches=0,legacyMs=0,domainMs=0;
const results=[];
for(const tc of cases){
  const t0=performance.now(),legacy=G.countParkSolutions(tc.puzzle,generated,2,false),lms=performance.now()-t0;
  const opt=countLineDomainSolutions(tc.puzzle,2);if(legacy!==opt.solutions)mismatches++;
  legacyMs+=lms;domainMs+=opt.runtimeMs;results.push({id:tc.id,legacy,domain:opt.solutions,match:legacy===opt.solutions,legacyMs:+lms.toFixed(1),domainMs:+opt.runtimeMs.toFixed(1),speedup:opt.runtimeMs?+(lms/opt.runtimeMs).toFixed(2):null,nodes:opt.stats.nodes,branches:opt.stats.branches,deadEnds:opt.stats.deadEnds,domainRowsTested:opt.stats.domainRowsTested});
}
console.log('SKYSCRAPER_PARKS_LINE_DOMAIN_DIFFERENTIAL '+JSON.stringify({seed,cases:cases.length,mismatches,domainBuildMs:+domainBuildMs.toFixed(1),legacyMs:+legacyMs.toFixed(1),domainMs:+domainMs.toFixed(1),aggregateSpeedup:domainMs?+(legacyMs/domainMs).toFixed(2):null,domainSizes:{rows:rowDomains.map(d=>d.length),cols:colDomains.map(d=>d.length)},slowest:results.slice().sort((a,b)=>b.domainMs-a.domainMs).slice(0,8)}));
console.log('SKYSCRAPER_PARKS_LINE_DOMAIN_DIFFERENTIAL_GATE:'+(mismatches===0?'PASS':'FAIL'));
if(mismatches)process.exitCode=1;
