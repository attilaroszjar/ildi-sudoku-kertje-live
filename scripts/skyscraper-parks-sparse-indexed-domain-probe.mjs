import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const first=refs.indexOf('games/sudoku-generator.js'),last=refs.indexOf('games/miracle-generator-hardening.js');
const banks=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const load=[...banks,...refs.slice(first,last+1).filter(ref=>!banks.includes(ref))];
globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of load)(0,eval)(`${fs.readFileSync(path.join(root,ref),'utf8')}\n//# sourceURL=${ref}`);

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(x=>x.id==='skyscraper-parks');
if(!G||!variant)throw new Error('Skyscraper Parks runtime unavailable');
const seed=92001,generated=G.make(variant,seed,'expert');
const n=9,park=generated.data?.parkValue??9,full=(1<<n)-1;
function bitCount(x){let c=0;while(x){x&=x-1;c++;}return c;}
function visible(line){let max=0,count=0;for(const v of line){if(v===park)continue;if(v>max){max=v;count++;}}return count;}
function cluePair(axis,index){const clues=(generated.data?.clues||[]).filter(cl=>cl.axis===axis&&cl.index===index);const near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom';return [clues.find(cl=>cl.side===near)?.count,clues.find(cl=>cl.side===far)?.count];}
function key(a,b){return `${a},${b}`;}
const needed=new Set();for(let i=0;i<n;i++){const r=cluePair('row',i),c=cluePair('col',i);needed.add(key(...r));needed.add(key(...c));}
const buckets=new Map([...needed].map(k=>[k,[]]));
const perm=Array(n).fill(0),used=Array(n+1).fill(false);
function emit(pos){if(pos===n){const k=key(visible(perm),visible([...perm].reverse()));const b=buckets.get(k);if(b)b.push(Uint8Array.from(perm));return;}for(let d=1;d<=n;d++)if(!used[d]){used[d]=true;perm[pos]=d;emit(pos+1);used[d]=false;}}
const buildStart=performance.now();emit(0);
function buildIndex(domain){const wc=Math.ceil(domain.length/32),all=new Uint32Array(wc),byPos=Array.from({length:n},()=>Array.from({length:n+1},()=>new Uint32Array(wc)));for(let i=0;i<domain.length;i++){all[i>>>5]|=1<<(i&31);for(let p=0;p<n;p++)byPos[p][domain[i][p]][i>>>5]|=1<<(i&31);}return {domain,all,byPos,wc};}
const rowDomains=Array.from({length:n},(_,i)=>buildIndex(buckets.get(key(...cluePair('row',i))))),colDomains=Array.from({length:n},(_,i)=>buildIndex(buckets.get(key(...cluePair('col',i)))));const domainBuildMs=performance.now()-buildStart;
function support(line,index,stats){const active=index.all.slice();for(let p=0;p<n;p++)if(line[p]){const m=index.byPos[p][line[p]];for(let w=0;w<index.wc;w++){active[w]&=m[w];stats.andWords++;}}let any=false;for(const x of active)if(x){any=true;break;}if(!any)return null;const out=Array(n).fill(0);for(let p=0;p<n;p++)if(!line[p]){let mask=0;for(let d=1;d<=n;d++){const m=index.byPos[p][d];for(let w=0;w<index.wc;w++){stats.testWords++;if(active[w]&m[w]){mask|=1<<(d-1);break;}}}out[p]=mask;}return out;}
function solve(source,limit=2){const grid=source.map(r=>r.slice()),stats={nodes:0,branches:0,deadEnds:0,solutions:0,andWords:0,testWords:0,maxDepth:0};function visit(depth){stats.nodes++;stats.maxDepth=Math.max(stats.maxDepth,depth);if(stats.solutions>=limit)return;const rs=Array(n),cs=Array(n);for(let r=0;r<n;r++){rs[r]=support(grid[r],rowDomains[r],stats);if(!rs[r]){stats.deadEnds++;return;}}for(let c=0;c<n;c++){const line=Array.from({length:n},(_,r)=>grid[r][c]);cs[c]=support(line,colDomains[c],stats);if(!cs[c]){stats.deadEnds++;return;}}let br=-1,bc=-1,bm=0,best=10;for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){const mask=rs[r][c]&cs[c][r]&full,cnt=bitCount(mask);if(!cnt){stats.deadEnds++;return;}if(cnt<best){best=cnt;br=r;bc=c;bm=mask;if(cnt===1)break;}}if(br<0){stats.solutions++;return;}if(best>1)stats.branches++;for(let bits=bm;bits;bits&=bits-1){const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=d;visit(depth+1);grid[br][bc]=0;if(stats.solutions>=limit)return;}}const t0=performance.now();visit(0);return {solutions:stats.solutions,runtimeMs:performance.now()-t0,stats};}

const removed=['r5c9','r7c7','r6c2','r1c9','r6c3','r6c1','r3c5','r1c3','r2c3','r9c4','r2c5','r7c3','r1c1','r5c1','r8c9','r8c6','r2c1','r7c6','r2c6'];
const puzzle=generated.puzzle.map(r=>r.slice());for(const cell of removed){const m=/r(\d+)c(\d+)/.exec(cell);puzzle[+m[1]-1][+m[2]-1]=0;}
const clues=puzzle.flat().filter(Boolean).length;if(clues!==11)throw new Error(`expected 11 clues, got ${clues}`);
console.log('SKYSCRAPER_PARKS_SPARSE_INDEXED_PROGRESS '+JSON.stringify({phase:'start',seed,clues,domainBuildMs:+domainBuildMs.toFixed(1)}));
const result=solve(puzzle,2);
console.log('SKYSCRAPER_PARKS_SPARSE_INDEXED_DOMAIN '+JSON.stringify({seed,clues,solutions:result.solutions,expectedSolutions:1,match:result.solutions===1,runtimeMs:+result.runtimeMs.toFixed(1),domainBuildMs:+domainBuildMs.toFixed(1),stats:result.stats,domainSizes:{rows:rowDomains.map(x=>x.domain.length),cols:colDomains.map(x=>x.domain.length)}}));
console.log('SKYSCRAPER_PARKS_SPARSE_INDEXED_DOMAIN_GATE:'+(result.solutions===1?'PASS':'FAIL'));
if(result.solutions!==1)process.exitCode=1;
