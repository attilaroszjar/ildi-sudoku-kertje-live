import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const loadRefs=[...bankRefs,'games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js','games/line-generator-proven-siblings-hardening.js'];
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of loadRefs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});

const G=ctx.SudokuGenerator;
const siblings=ctx.LineGeneratorProvenSiblings;
const variant=ctx.SudokuBank.find(v=>v.id==='nabner');
if(!G||!siblings||!variant)throw new Error('Nabner runtime not loaded');
const seed=Number(process.env.NABNER_PROP_SEED||92003);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('NABNER_PROP_SEED invalid');

function cloneGrid(grid){return grid.map(row=>row.slice());}
function countClues(grid){return grid.flat().filter(Boolean).length;}
function bitCount(x){let c=0;while(x){x&=x-1;c++;}return c;}
function bitToDigit(bit){return 1+Math.round(Math.log(bit)/Math.LN2);}
function expandedForbidden(mask,full){return(mask|((mask<<1)&full)|(mask>>>1))&full;}
function rng(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}

function makeIndex(data){
  const n=9,raw=data.lines||[],lines=[],cells=Array.from({length:n},()=>Array.from({length:n},()=>[]));
  for(const rawLine of raw){
    const line=Array.isArray(rawLine)?rawLine:rawLine.cells||[];
    const id=lines.length;lines.push(line);
    for(const [r,c] of line)cells[r][c].push(id);
  }
  return{lines,cells};
}

function countPropagatingSolutions(source,data,limit,stats={}){
  stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.propagated=0;stats.hiddenSingles=0;stats.nakedSingles=0;
  const n=9,full=511,index=makeIndex(data),grid=cloneGrid(source);
  const rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),lineMasks=Array(index.lines.length).fill(0);
  function boxOf(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const v=grid[r][c];if(!v)continue;
    const bit=1<<(v-1),b=boxOf(r,c);
    if((rows[r]|cols[c]|boxes[b])&bit)return 0;
    rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;
    for(const lineId of index.cells[r][c]){
      if(expandedForbidden(lineMasks[lineId],full)&bit)return 0;
      lineMasks[lineId]|=bit;
    }
  }
  function maskAt(r,c){
    let mask=full&~(rows[r]|cols[c]|boxes[boxOf(r,c)]);
    for(const lineId of index.cells[r][c])mask&=~expandedForbidden(lineMasks[lineId],full);
    return mask&full;
  }
  function place(r,c,bit,trail,kind){
    grid[r][c]=bitToDigit(bit);rows[r]|=bit;cols[c]|=bit;boxes[boxOf(r,c)]|=bit;
    for(const lineId of index.cells[r][c])lineMasks[lineId]|=bit;
    trail.push([r,c,bit]);stats.propagated++;if(kind==='hidden')stats.hiddenSingles++;else if(kind==='naked')stats.nakedSingles++;
  }
  function rollback(trail){
    for(let i=trail.length-1;i>=0;i--){
      const [r,c,bit]=trail[i];
      for(const lineId of index.cells[r][c])lineMasks[lineId]^=bit;
      rows[r]^=bit;cols[c]^=bit;boxes[boxOf(r,c)]^=bit;grid[r][c]=0;
    }
  }
  function hiddenSingle(){
    const units=[];
    for(let r=0;r<n;r++)units.push(Array.from({length:n},(_,c)=>[r,c]));
    for(let c=0;c<n;c++)units.push(Array.from({length:n},(_,r)=>[r,c]));
    for(let br=0;br<3;br++)for(let bc=0;bc<3;bc++){
      const unit=[];for(let dr=0;dr<3;dr++)for(let dc=0;dc<3;dc++)unit.push([br*3+dr,bc*3+dc]);units.push(unit);
    }
    for(const unit of units){
      let present=0;for(const [r,c] of unit)if(grid[r][c])present|=1<<(grid[r][c]-1);
      let missing=full&~present;
      for(let bits=missing;bits;bits&=bits-1){
        const bit=bits&-bits;let placeCell=null,count=0;
        for(const [r,c] of unit)if(!grid[r][c]&&(maskAt(r,c)&bit)){placeCell=[r,c];count++;if(count>1)break;}
        if(count===0)return{dead:true};
        if(count===1)return{dead:false,r:placeCell[0],c:placeCell[1],bit};
      }
    }
    return null;
  }
  function propagate(trail){
    while(true){
      let progress=false;
      for(let r=0;r<n&&!progress;r++)for(let c=0;c<n;c++)if(!grid[r][c]){
        const mask=maskAt(r,c),cnt=bitCount(mask);
        if(cnt===0)return false;
        if(cnt===1){place(r,c,mask,trail,'naked');progress=true;break;}
      }
      if(progress)continue;
      const hidden=hiddenSingle();
      if(hidden?.dead)return false;
      if(hidden){place(hidden.r,hidden.c,hidden.bit,trail,'hidden');continue;}
      return true;
    }
  }
  let found=0;
  function visit(){
    if(found>=limit)return;
    stats.nodes++;
    const forced=[];
    if(!propagate(forced)){stats.deadEnds++;rollback(forced);return;}
    let br=-1,bc=-1,bm=0,best=10,bestPressure=-1;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){
      const mask=maskAt(r,c),cnt=bitCount(mask);
      let pressure=index.cells[r][c].length*n;
      for(const lineId of index.cells[r][c])pressure+=bitCount(expandedForbidden(lineMasks[lineId],full));
      if(cnt<best||(cnt===best&&pressure>bestPressure)){br=r;bc=c;bm=mask;best=cnt;bestPressure=pressure;}
    }
    if(br<0){found++;rollback(forced);return;}
    if(bitCount(bm)>1)stats.branches++;
    const b=boxOf(br,bc);
    for(let bits=bm;bits&&found<limit;bits&=bits-1){
      const one=bits&-bits;
      grid[br][bc]=bitToDigit(one);rows[br]|=one;cols[bc]|=one;boxes[b]|=one;
      for(const lineId of index.cells[br][bc])lineMasks[lineId]|=one;
      visit();
      for(const lineId of index.cells[br][bc])lineMasks[lineId]^=one;
      rows[br]^=one;cols[bc]^=one;boxes[b]^=one;grid[br][bc]=0;
    }
    rollback(forced);
  }
  visit();return found;
}

const baseline=siblings.makeVariantPilot(G,variant,seed,'expert');
const puzzle=cloneGrid(baseline.puzzle);
if(countClues(puzzle)!==30)throw new Error('expected 30-given baseline');
const order=[];for(let i=0;i<81;i++)if(puzzle[Math.floor(i/9)][i%9])order.push(i);
shuffle(order,rng((seed^0x4E414243)>>>0));

const attempts=[];let accepted=0,rejected=0,totalMs=0,maxMs=0,totalNodes=0,totalPropagated=0;
for(const index of order){
  const r=Math.floor(index/9),c=index%9,old=puzzle[r][c];puzzle[r][c]=0;
  const stats={};const t0=performance.now();
  const solutions=countPropagatingSolutions(puzzle,baseline.data,2,stats);
  const elapsed=performance.now()-t0;totalMs+=elapsed;maxMs=Math.max(maxMs,elapsed);totalNodes+=stats.nodes;totalPropagated+=stats.propagated;
  const keep=solutions===1;if(keep)accepted++;else{rejected++;puzzle[r][c]=old;}
  attempts.push({index,cell:`r${r+1}c${c+1}`,accepted:keep,solutions,givensAfter:countClues(puzzle),runtimeMs:+elapsed.toFixed(1),nodes:stats.nodes,branches:stats.branches,deadEnds:stats.deadEnds,propagated:stats.propagated,hiddenSingles:stats.hiddenSingles,nakedSingles:stats.nakedSingles});
}
const finalStats={};const finalSolutions=countPropagatingSolutions(puzzle,baseline.data,2,finalStats);
const referenceSolutions=G.countVariantSolutions(puzzle,baseline,2);
const essential=G.countSolutions(puzzle,2)>1;
const local=attempts.filter(x=>!x.accepted).every(x=>x.solutions>=2);
const mismatches=finalSolutions!==referenceSolutions?1:0;
const hottest=attempts.slice().sort((a,b)=>b.runtimeMs-a.runtimeMs).slice(0,10);
console.log('NABNER_PROPAGATION_PROBE '+JSON.stringify({seed,baseGivens:30,acceptedRemovals:accepted,rejectedRemovals:rejected,finalGivens:countClues(puzzle),density:+(countClues(puzzle)/81).toFixed(3),finalSolutions,referenceSolutions,mismatches,essential,local,totalMs:+totalMs.toFixed(1),maxMs:+maxMs.toFixed(1),totalNodes,totalPropagated,finalNodes:finalStats.nodes,finalPropagated:finalStats.propagated,hottest}));
const pass=mismatches===0&&finalSolutions===1&&essential&&local&&accepted+rejected===30;
console.log('NABNER_PROPAGATION_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
