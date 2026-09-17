import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||96001)>>>0;
const size=Number(process.argv[3]||7);
const difficulty='expert',id='hashiwokakero';
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(x=>x.startsWith('games/'));
const bankRefs=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const a=refs.indexOf('games/sudoku-generator.js'),b=refs.indexOf('games/p3-size-control.js');
if(a<0||b<a)throw new Error('production runtime range not found');
const load=[...bankRefs,...refs.slice(a,b+1).filter(x=>!bankRefs.includes(x))];
globalThis.window=globalThis;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of load)await import(pathToFileURL(path.join(root,ref)).href);
const generator=globalThis.SudokuGenerator,variant=globalThis.SudokuBank&&globalThis.SudokuBank.find(v=>v&&v.id===id);
if(!generator||!variant||typeof generator.countBridgesSolutions!=='function')throw new Error('Hashiwokakero production runtime unavailable');
variant.data=variant.data||{};variant.data.p3Size=size;
const clone=x=>JSON.parse(JSON.stringify(x));

function edges(islands){
  const out=[];
  for(let i=0;i<islands.length;i++){
    const a=islands[i];let br=null,bd=null;
    for(let j=0;j<islands.length;j++)if(i!==j){
      const q=islands[j];
      if(a.r===q.r&&q.c>a.c&&(!br||q.c<br.c))br={idx:j,c:q.c};
      if(a.c===q.c&&q.r>a.r&&(!bd||q.r<bd.r))bd={idx:j,r:q.r};
    }
    if(br)out.push([i,br.idx]);if(bd)out.push([i,bd.idx]);
  }
  return out;
}
function cross(islands,e1,e2){
  const a=islands[e1[0]],b=islands[e1[1]],c=islands[e2[0]],d=islands[e2[1]],h1=a.r===b.r,h2=c.r===d.r;
  if(h1===h2)return false;
  const h=h1?[a,b]:[c,d],v=h1?[c,d]:[a,b],hr=h[0].r,vc=v[0].c;
  return vc>Math.min(h[0].c,h[1].c)&&vc<Math.max(h[0].c,h[1].c)&&hr>Math.min(v[0].r,v[1].r)&&hr<Math.max(v[0].r,v[1].r);
}
function countOptional(puzzle,limit=2){
  const islands=puzzle.islands||puzzle,E=edges(islands),n=islands.length,vals=Array(E.length).fill(0),known=islands.map(x=>Number.isInteger(x.clue)),remain=islands.map((x,i)=>known[i]?x.clue:0);
  let found=0;
  function connected(){
    const adj=Array.from({length:n},()=>[]);
    for(let i=0;i<E.length;i++)if(vals[i]){const [a,b]=E[i];adj[a].push(b);adj[b].push(a);}
    const seen=new Set([0]),q=[0];while(q.length){const x=q.shift();for(const y of adj[x])if(!seen.has(y)){seen.add(y);q.push(y);}}
    return seen.size===n;
  }
  function possible(k,node){let m=0;for(let i=k;i<E.length;i++)if(E[i][0]===node||E[i][1]===node)m+=2;return m;}
  function go(k){
    if(found>=limit)return;
    if(k===E.length){if(known.every((yes,i)=>!yes||remain[i]===0)&&connected())found++;return;}
    const [a,b]=E[k];let max=2;if(known[a])max=Math.min(max,remain[a]);if(known[b])max=Math.min(max,remain[b]);
    for(let v=0;v<=max;v++){
      if(v&&E.slice(0,k).some((e,i)=>vals[i]>0&&cross(islands,E[k],e)))continue;
      if(known[a])remain[a]-=v;if(known[b])remain[b]-=v;vals[k]=v;
      let ok=true;for(let node=0;node<n;node++)if(known[node]&&(remain[node]<0||remain[node]>possible(k+1,node))){ok=false;break;}
      if(ok)go(k+1);
      if(known[a])remain[a]+=v;if(known[b])remain[b]+=v;
      if(found>=limit)return;
    }
    vals[k]=0;
  }
  go(0);return found;
}
function mulberry32(s){let x=s>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,rnd){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

const tMake=performance.now(),out=generator.make(variant,seed,difficulty),makeMs=performance.now()-tMake;
const puzzle=clone(out.puzzle),islands=puzzle.islands;
const original=islands.map(x=>x.clue);
const order=shuffle(islands.map((_,i)=>i),mulberry32((seed^Math.imul(size,0x9E3779B1)^0x48A51EED)>>>0));
let accepted=0,rejected=0,totalMs=0,worstMs=0,worst='n/a';
for(const i of order){
  const old=islands[i].clue;islands[i].clue=null;
  const t0=performance.now(),count=countOptional(puzzle,2),ms=performance.now()-t0;
  totalMs+=ms;if(ms>worstMs){worstMs=ms;worst=`island:${i},count=${count}`;}
  if(count===1)accepted++;else{islands[i].clue=old;rejected++;}
}
const remaining=islands.map((x,i)=>Number.isInteger(x.clue)?i:null).filter(x=>x!==null);
const finalCount=countOptional(puzzle,2);
let removable=0,closureMs=0,closureWorstMs=0,closureWorst='n/a';
for(const i of remaining){
  const candidate=clone(puzzle);candidate.islands[i].clue=null;
  const t0=performance.now(),count=countOptional(candidate,2),ms=performance.now()-t0;
  closureMs+=ms;if(ms>closureWorstMs){closureWorstMs=ms;closureWorst=`island:${i},count=${count}`;}if(count===1)removable++;
}
const bare=clone(puzzle);for(const island of bare.islands)island.clue=null;
const tBare=performance.now(),bareCount=countOptional(bare,2),bareMs=performance.now()-tBare;
console.log(`HASHI_EXPERT_CARVE seed=${seed} size=${size}x${size} makeMs=${makeMs.toFixed(1)} sourceClues=${original.length} finalClues=${remaining.length} accepted=${accepted} rejected=${rejected}`);
console.log(`HASHI_EXPERT_CARVE_ORDER ${order.join(',')}`);
console.log(`HASHI_EXPERT_CARVE_REMAINING ${remaining.map(i=>`${i}:${original[i]}@${islands[i].r},${islands[i].c}`).join(' ')}`);
console.log(`HASHI_EXPERT_CARVE_EXACT finalCount=${finalCount} bareCount=${bareCount} bareMs=${bareMs.toFixed(1)} variantEssential=${finalCount===1&&bareCount!==1}`);
console.log(`HASHI_EXPERT_CARVE_RUNTIME carveMs=${totalMs.toFixed(1)} worstMs=${worstMs.toFixed(1)} worst=${worst}`);
console.log(`HASHI_EXPERT_CLOSURE checks=${remaining.length} removable=${removable} locallyIrreducible=${removable===0} totalMs=${closureMs.toFixed(1)} worstMs=${closureWorstMs.toFixed(1)} worst=${closureWorst}`);
const failures=[];
if(finalCount!==1)failures.push(`final count ${finalCount}`);
if(bareCount===1)failures.push('numberless topology unexpectedly unique');
if(removable!==0)failures.push(`${removable} remaining clue(s) still removable`);
if(failures.length){for(const f of failures)console.error(`HASHI_EXPERT_CARVE_FAILURE ${f}`);console.log('HASHI_EXPERT_CARVE:FAIL');process.exitCode=1;}
else console.log('HASHI_EXPERT_CARVE:PASS_LOCAL_IRREDUCIBLE');
