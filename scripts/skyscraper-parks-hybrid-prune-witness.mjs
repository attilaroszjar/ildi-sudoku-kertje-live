import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
const banks=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const first=refs.indexOf('games/sudoku-generator.js');
const last=refs.indexOf('games/miracle-generator-hardening.js');
if(first<0||last<first)throw new Error('production generator range missing');
const load=[...banks,...refs.slice(first,last+1).filter(ref=>!banks.includes(ref))];

globalThis.window=globalThis;
globalThis.performance=performance;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of load){const p=path.join(root,ref);if(fs.existsSync(p))(0,eval)(`${fs.readFileSync(p,'utf8')}\n//# sourceURL=${ref}`);}

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(v=>v.id==='skyscraper-parks');
if(!G||!variant)throw new Error('Skyscraper Parks runtime unavailable');
const seed=Number(process.env.SKYSCRAPER_PARKS_SEED||92001);
console.log('WITNESS:GENERATION_START seed='+seed);
let t=performance.now();
const out=G.make(variant,seed,'expert');
console.log('WITNESS:GENERATION_DONE ms='+(performance.now()-t).toFixed(1)+' givens='+out.puzzle.flat().filter(Boolean).length);

const n=out.puzzle.length,park=out.data?.parkValue??n,full=(1<<n)-1;
const canonical=out.solution.map(r=>r.slice());
function clone(g){return g.map(r=>r.slice());}
function count(g,limit=1){return G.countVariantSolutions(g,out,limit);}
function visible(line){let max=0,c=0;for(const v of line){if(v===park)continue;if(v>max){max=v;c++;}}return c;}
function cluePair(axis,index){const cs=(out.data?.clues||[]).filter(cl=>cl.axis===axis&&cl.index===index);const near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom';const a=cs.find(cl=>cl.side===near)?.count,b=cs.find(cl=>cl.side===far)?.count;if(!Number.isInteger(a)||!Number.isInteger(b))throw new Error(`missing clue pair ${axis}/${index}`);return[a,b];}
function key(a,b){return `${a},${b}`;}
function lineValid(line,pair){return visible(line)===pair[0]&&visible([...line].reverse())===pair[1];}
function gridParkValid(g){for(let i=0;i<n;i++){if(!lineValid(g[i],cluePair('row',i)))return false;const col=Array.from({length:n},(_,r)=>g[r][i]);if(!lineValid(col,cluePair('col',i)))return false;}return true;}

console.log('WITNESS:ALT_RECONSTRUCT_START');
const prefix=clone(out.puzzle);
let firstDiff=null;
outer:for(let idx=0;idx<n*n;idx++){
  const r=Math.floor(idx/n),c=idx%n;if(prefix[r][c])continue;
  const cv=canonical[r][c];
  for(let d=1;d<=n;d++){
    if(d===cv)continue;
    const trial=clone(prefix);trial[r][c]=d;
    if(count(trial,1)>0){prefix[r][c]=d;firstDiff={r,c,canonical:cv,alternative:d};break outer;}
  }
  prefix[r][c]=cv;
}
if(!firstDiff)throw new Error('production solver found no alternative witness despite count=2');
for(let idx=firstDiff.r*n+firstDiff.c+1;idx<n*n;idx++){
  const r=Math.floor(idx/n),c=idx%n;if(prefix[r][c])continue;
  let chosen=0;
  for(let d=1;d<=n;d++){const trial=clone(prefix);trial[r][c]=d;if(count(trial,1)>0){chosen=d;break;}}
  if(!chosen)throw new Error(`cannot complete alternative at r${r+1}c${c+1}`);
  prefix[r][c]=chosen;
}
const alt=prefix;
const altParkValid=gridParkValid(alt);
console.log('WITNESS:ALT_RECONSTRUCT_DONE '+JSON.stringify({firstDifference:`r${firstDiff.r+1}c${firstDiff.c+1}`,canonical:firstDiff.canonical,alternative:firstDiff.alternative,parkValid:altParkValid}));
if(!altParkValid)throw new Error('alternative witness violates park clues');

const needed=new Set();for(let i=0;i<n;i++){needed.add(key(...cluePair('row',i)));needed.add(key(...cluePair('col',i)));}
const buckets=new Map([...needed].map(k=>[k,[]]));
const perm=Array(n).fill(0),used=Array(n+1).fill(false);
function emit(pos){if(pos===n){const k=key(visible(perm),visible([...perm].reverse()));const b=buckets.get(k);if(b)b.push(Uint8Array.from(perm));return;}for(let d=1;d<=n;d++)if(!used[d]){used[d]=true;perm[pos]=d;emit(pos+1);used[d]=false;}}
console.log('WITNESS:DOMAIN_BUILD_START');t=performance.now();emit(0);console.log('WITNESS:DOMAIN_BUILD_DONE ms='+(performance.now()-t).toFixed(1));
const rowDomains=Array.from({length:n},(_,i)=>buckets.get(key(...cluePair('row',i))));
const colDomains=Array.from({length:n},(_,i)=>buckets.get(key(...cluePair('col',i))));
function buildIndex(domain){const words=Math.ceil(domain.length/32),all=new Uint32Array(words),byPos=Array.from({length:n},()=>Array.from({length:n+1},()=>new Uint32Array(words)));for(let j=0;j<domain.length;j++){all[j>>>5]|=1<<(j&31);for(let p=0;p<n;p++)byPos[p][domain[j][p]][j>>>5]|=1<<(j&31);}return{all,byPos};}
const rowIndex=rowDomains.map(buildIndex),colIndex=colDomains.map(buildIndex);
function cloneBits(x){return x.slice();}
function intersect(bits,mask){let any=false;for(let w=0;w<bits.length;w++){bits[w]&=mask[w];if(bits[w])any=true;}return any;}
function supportMask(active,index,pos){let mask=0;for(let d=1;d<=n;d++){const hit=index.byPos[pos][d];for(let w=0;w<active.length;w++)if(active[w]&hit[w]){mask|=1<<(d-1);break;}}return mask;}
function buildSupport(active,index,line){const out=Array(n).fill(0);for(let p=0;p<n;p++)out[p]=line[p]?1<<(line[p]-1):supportMask(active,index,p);return out;}
function bitCount(x){let c=0;while(x){x&=x-1;c++;}return c;}

const grid=clone(out.puzzle),rowActive=rowIndex.map(x=>cloneBits(x.all)),colActive=colIndex.map(x=>cloneBits(x.all));
for(let r=0;r<n;r++)for(let c=0;c<n;c++){const v=grid[r][c];if(!v)continue;if(!intersect(rowActive[r],rowIndex[r].byPos[c][v]))throw new Error('initial row domain contradiction');if(!intersect(colActive[c],colIndex[c].byPos[r][v]))throw new Error('initial col domain contradiction');}
let rowCache=Array(n),colCache=Array(n);
for(let r=0;r<n;r++)rowCache[r]=buildSupport(rowActive[r],rowIndex[r],grid[r]);
for(let c=0;c<n;c++){const line=Array.from({length:n},(_,r)=>grid[r][c]);colCache[c]=buildSupport(colActive[c],colIndex[c],line);}

console.log('WITNESS:HYBRID_REPLAY_START');
let step=0;
while(true){
  let br=-1,bc=-1,bm=0,best=n+1;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){const mask=rowCache[r][c]&colCache[c][r]&full,cnt=bitCount(mask);if(!cnt)throw new Error(`hybrid replay dead end before witness at r${r+1}c${c+1}`);if(cnt<best){br=r;bc=c;bm=mask;best=cnt;if(cnt===1)break;}}
  if(br<0)break;
  step++;
  const d=alt[br][bc],bit=1<<(d-1),rowMask=rowCache[br][bc],colMask=colCache[bc][br];
  if(!(bm&bit)){
    console.log('WITNESS:HYBRID_PRUNE '+JSON.stringify({step,cell:`r${br+1}c${bc+1}`,digit:d,bestCount:best,candidateMask:bm,rowMask,colMask,rowAllows:!!(rowMask&bit),colAllows:!!(colMask&bit)}));
    console.log('SKYSCRAPER_PARKS_HYBRID_PRUNE_WITNESS:PASS');
    process.exit(0);
  }
  const nr=cloneBits(rowActive[br]),nc=cloneBits(colActive[bc]);
  if(!intersect(nr,rowIndex[br].byPos[bc][d])||!intersect(nc,colIndex[bc].byPos[br][d]))throw new Error(`active-domain prune at r${br+1}c${bc+1}`);
  grid[br][bc]=d;rowActive[br]=nr;colActive[bc]=nc;rowCache[br]=buildSupport(nr,rowIndex[br],grid[br]);const colLine=Array.from({length:n},(_,r)=>grid[r][bc]);colCache[bc]=buildSupport(nc,colIndex[bc],colLine);
}
console.log('WITNESS:HYBRID_REPLAY_COMPLETED_WITHOUT_PRUNE');
console.log('SKYSCRAPER_PARKS_HYBRID_PRUNE_WITNESS:FAIL');
process.exitCode=1;
