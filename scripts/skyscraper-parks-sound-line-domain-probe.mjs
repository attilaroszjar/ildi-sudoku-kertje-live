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

console.log('SOUND_PROBE:GENERATION_START seed='+seed);
const g0=performance.now();
const out=G.make(variant,seed,'expert');
const generationMs=performance.now()-g0;
console.log('SOUND_PROBE:GENERATION_DONE ms='+generationMs.toFixed(1)+' givens='+out.puzzle.flat().filter(Boolean).length);

const n=out.puzzle.length,park=out.data?.parkValue??n,full=(1<<n)-1;
function bitCount(x){let c=0;while(x){x&=x-1;c++;}return c;}
function visible(line){let max=0,count=0;for(const v of line){if(v===park)continue;if(v>max){max=v;count++;}}return count;}
function cluePair(axis,index){
  const cs=(out.data?.clues||[]).filter(cl=>cl.axis===axis&&cl.index===index);
  const near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom';
  const a=cs.find(cl=>cl.side===near)?.count,b=cs.find(cl=>cl.side===far)?.count;
  if(!Number.isInteger(a)||!Number.isInteger(b))throw new Error(`missing clue pair ${axis}/${index}`);
  return [a,b];
}
function key(a,b){return `${a},${b}`;}
const needed=new Set();
for(let i=0;i<n;i++){const r=cluePair('row',i),c=cluePair('col',i);needed.add(key(...r));needed.add(key(...c));}
const buckets=new Map([...needed].map(k=>[k,[]]));
const perm=Array(n).fill(0),used=Array(n+1).fill(false);
function emit(pos){
  if(pos===n){const a=visible(perm),b=visible([...perm].reverse()),bucket=buckets.get(key(a,b));if(bucket)bucket.push(Uint8Array.from(perm));return;}
  for(let d=1;d<=n;d++)if(!used[d]){used[d]=true;perm[pos]=d;emit(pos+1);used[d]=false;}
}
console.log('SOUND_PROBE:DOMAIN_BUILD_START');
const d0=performance.now();emit(0);const domainBuildMs=performance.now()-d0;
console.log('SOUND_PROBE:DOMAIN_BUILD_DONE ms='+domainBuildMs.toFixed(1));

const rowDomains=Array.from({length:n},(_,i)=>{const p=cluePair('row',i);return buckets.get(key(...p));});
const colDomains=Array.from({length:n},(_,i)=>{const p=cluePair('col',i);return buckets.get(key(...p));});
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
function countExact(source,limit=2){
  const grid=source.map(r=>r.slice());
  const stats={nodes:0,branches:0,deadEnds:0,solutions:0,domainRowsTested:0,maxDepth:0};
  function visit(depth){
    stats.nodes++;if(depth>stats.maxDepth)stats.maxDepth=depth;if(stats.solutions>=limit)return;
    const rowSup=Array(n),colSup=Array(n);
    for(let r=0;r<n;r++){const s=supports(grid[r],rowDomains[r],stats);if(!s.matches){stats.deadEnds++;return;}rowSup[r]=s.masks;}
    for(let c=0;c<n;c++){const line=Array.from({length:n},(_,r)=>grid[r][c]);const s=supports(line,colDomains[c],stats);if(!s.matches){stats.deadEnds++;return;}colSup[c]=s.masks;}
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
  const t0=performance.now();visit(0);return {count:stats.solutions,ms:performance.now()-t0,stats};
}

console.log('SOUND_PROBE:HYBRID_START');
const h0=performance.now();
const hybrid=globalThis.SkyscraperParksHybridRuntime?.countSparse(out.puzzle,out,2);
const hybridMs=performance.now()-h0;
console.log('SOUND_PROBE:HYBRID_DONE count='+hybrid+' ms='+hybridMs.toFixed(1));

console.log('SOUND_PROBE:PRODUCTION_START');
const p0=performance.now();
const production=G.countVariantSolutions(out.puzzle,out,2);
const productionMs=performance.now()-p0;
console.log('SOUND_PROBE:PRODUCTION_DONE count='+production+' ms='+productionMs.toFixed(1));

console.log('SOUND_PROBE:SOUND_EXACT_START');
const exact=countExact(out.puzzle,2);
console.log('SOUND_PROBE:SOUND_EXACT_DONE count='+exact.count+' ms='+exact.ms.toFixed(1)+' nodes='+exact.stats.nodes+' branches='+exact.stats.branches+' deadEnds='+exact.stats.deadEnds+' domainRowsTested='+exact.stats.domainRowsTested+' maxDepth='+exact.stats.maxDepth);

console.log('SKYSCRAPER_PARKS_SOUND_LINE_DOMAIN '+JSON.stringify({
  seed,generationMs:+generationMs.toFixed(1),givens:out.puzzle.flat().filter(Boolean).length,
  domainBuildMs:+domainBuildMs.toFixed(1),hybrid,hybridMs:+hybridMs.toFixed(1),
  production,productionMs:+productionMs.toFixed(1),soundExact:exact.count,soundExactMs:+exact.ms.toFixed(1),
  nodes:exact.stats.nodes,branches:exact.stats.branches,deadEnds:exact.stats.deadEnds,
  domainRowsTested:exact.stats.domainRowsTested,maxDepth:exact.stats.maxDepth
}));
const pass=exact.count===production&&hybrid!==exact.count;
console.log('SKYSCRAPER_PARKS_SOUND_LINE_DOMAIN_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
