import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs0=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const first=refs0.indexOf('games/sudoku-generator.js'),last=refs0.indexOf('games/miracle-generator-hardening.js');
if(first<0||last<first)throw new Error('production generator range missing');
const banks=refs0.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const refs=[...banks,...refs0.slice(first,last+1).filter(ref=>!banks.includes(ref))];
globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of refs)(0,eval)(`${fs.readFileSync(path.join(root,ref),'utf8')}\n//# sourceURL=${ref}`);

const G=globalThis.SudokuGenerator,variant=globalThis.SudokuBank?.find(x=>x.id==='skyscraper-parks');
if(!G||!variant||typeof G.countParkSolutions!=='function')throw new Error('Skyscraper Parks runtime unavailable');
const seed=Number(process.env.SKYSCRAPER_PARKS_EXPERT_SEED||92001);
const generated=G.make(variant,seed,'expert'),n=generated.puzzle.length,park=generated.data?.parkValue??n,full=(1<<n)-1;
function bitCount(x){let c=0;while(x){x&=x-1;c++;}return c;}
function visible(line){let max=0,count=0;for(const v of line){if(v===park)continue;if(v>max){max=v;count++;}}return count;}
function cluePair(axis,index){const clues=(generated.data?.clues||[]).filter(cl=>cl.axis===axis&&cl.index===index),near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom';return [clues.find(cl=>cl.side===near)?.count,clues.find(cl=>cl.side===far)?.count];}
const rowPairs=Array.from({length:n},(_,i)=>cluePair('row',i)),colPairs=Array.from({length:n},(_,i)=>cluePair('col',i));
function directionalPossible(line,target){let prefixVisible=0,prefixMax=0,pos=0;for(;pos<line.length;pos++){const v=line[pos];if(!v)break;if(v===park)continue;if(v>prefixMax){prefixMax=v;prefixVisible++;}}if(pos===line.length)return prefixVisible===target;if(prefixVisible>target)return false;const suffixSlots=line.length-pos;let possibleExtra=0;for(let d=prefixMax+1;d<=n;d++)if(d!==park)possibleExtra++;return prefixVisible+Math.min(suffixSlots,possibleExtra)>=target;}
function linePossible(line,pair){return directionalPossible(line,pair[0])&&directionalPossible(line.slice().reverse(),pair[1]);}
function countBoundSolutions(source,limit=2){
  const grid=source.map(r=>r.slice()),rows=Array(n).fill(0),cols=Array(n).fill(0),stats={nodes:0,branches:0,deadEnds:0,solutions:0,assignmentsTried:0,boundChecks:0,boundPrunes:0,maxDepth:0};
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){const v=grid[r][c];if(!v)continue;const bit=1<<(v-1);if((rows[r]|cols[c])&bit)return {solutions:0,stats,runtimeMs:0};rows[r]|=bit;cols[c]|=bit;}
  function affectedPossible(r,c){stats.boundChecks+=2;if(!linePossible(grid[r],rowPairs[r]))return false;const col=Array.from({length:n},(_,rr)=>grid[rr][c]);return linePossible(col,colPairs[c]);}
  function visit(depth){stats.nodes++;stats.maxDepth=Math.max(stats.maxDepth,depth);if(stats.solutions>=limit)return;let br=-1,bc=-1,bm=0,best=n+1;for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){const mask=full&~(rows[r]|cols[c]),cnt=bitCount(mask);if(!cnt){stats.deadEnds++;return;}if(cnt<best){br=r;bc=c;bm=mask;best=cnt;if(cnt===1)break;}}if(br<0){stats.solutions++;return;}if(best>1)stats.branches++;for(let bits=bm;bits;bits&=bits-1){const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);stats.assignmentsTried++;grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;if(affectedPossible(br,bc))visit(depth+1);else stats.boundPrunes++;rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;if(stats.solutions>=limit)return;}}
  const t0=performance.now();visit(0);return {solutions:stats.solutions,stats,runtimeMs:performance.now()-t0};
}
function mulberry32(x){x>>>=0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,random){for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const grid=generated.puzzle.map(r=>r.slice()),order=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(grid[r][c])order.push(r*n+c);shuffle(order,mulberry32(((generated.generation?.actualSeed??seed)^0x4C4F4341)>>>0));
const history=[];
for(let step=0;step<19;step++){
  const idx=order[step],r=Math.floor(idx/n),c=idx%n,old=grid[r][c];if(!old)continue;grid[r][c]=0;const variantSolutions=G.countParkSolutions(grid,generated,2,false);let baseFamilySolutions=null,accepted=false;if(variantSolutions===1){baseFamilySolutions=G.countParkSolutions(grid,generated,2,true);accepted=baseFamilySolutions>1;}if(!accepted)grid[r][c]=old;history.push({step:step+1,cell:`r${r+1}c${c+1}`,accepted,clues:grid.flat().filter(Boolean).length});
}
const hotspotIdx=order[19],hr=Math.floor(hotspotIdx/n),hc=hotspotIdx%n,old=grid[hr][hc];
const cluesBefore=grid.flat().filter(Boolean).length;
grid[hr][hc]=0;
const tLegacy=performance.now(),legacy=G.countParkSolutions(grid,generated,2,false),legacyMs=performance.now()-tLegacy;
const bound=countBoundSolutions(grid,2);
grid[hr][hc]=old;
const match=legacy===bound.solutions;
console.log('SKYSCRAPER_PARKS_SPARSE_HOTSPOT_BOUND '+JSON.stringify({seed,hotspotStep:20,cell:`r${hr+1}c${hc+1}`,value:old,cluesBefore,trialClues:cluesBefore-1,legacy,bound:bound.solutions,match,legacyMs:+legacyMs.toFixed(1),boundMs:+bound.runtimeMs.toFixed(1),speedup:bound.runtimeMs?+(legacyMs/bound.runtimeMs).toFixed(2):null,stats:bound.stats,history}));
console.log('SKYSCRAPER_PARKS_SPARSE_HOTSPOT_BOUND_GATE:'+(match?'PASS':'FAIL'));
if(!match)process.exitCode=1;
