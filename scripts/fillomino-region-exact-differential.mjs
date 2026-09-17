import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||97001)>>>0;
const size=Number(process.argv[3]||6);
const id='fillomino',difficulty='expert';
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(x=>x.startsWith('games/'));
const bankRefs=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const a=refs.indexOf('games/sudoku-generator.js'),b=refs.indexOf('games/p3-size-control.js');
if(a<0||b<a)throw new Error('production runtime range not found');
const load=[...bankRefs,...refs.slice(a,b+1).filter(x=>!bankRefs.includes(x))];
globalThis.window=globalThis;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of load)await import(pathToFileURL(path.join(root,ref)).href);
const generator=globalThis.SudokuGenerator,variant=globalThis.SudokuBank&&globalThis.SudokuBank.find(v=>v&&v.id===id);
if(!generator||!variant||typeof generator.countFillominoSolutions!=='function')throw new Error('Fillomino production runtime unavailable');
variant.data=variant.data||{};variant.data.p3Size=size;
const clone=x=>JSON.parse(JSON.stringify(x));

function regionUniverse(n,maxValue){
  const bySize=Array.from({length:maxValue+1},()=>[]);
  const cellBit=i=>1n<<BigInt(i);
  const neighbors=Array.from({length:n*n},(_,i)=>{
    const r=Math.floor(i/n),c=i%n,out=[];
    if(r>0)out.push(i-n);if(r+1<n)out.push(i+n);if(c>0)out.push(i-1);if(c+1<n)out.push(i+1);return out;
  });
  for(let k=1;k<=maxValue;k++){
    const seen=new Set();
    let current=new Map();
    for(let i=0;i<n*n;i++){const m=cellBit(i);current.set(m.toString(),m);}
    if(k===1){bySize[k]=[...current.values()];continue;}
    for(let step=1;step<k;step++){
      const next=new Map();
      for(const mask of current.values()){
        let frontier=0n;
        for(let i=0;i<n*n;i++)if(mask&cellBit(i))for(const j of neighbors[i])frontier|=cellBit(j);
        frontier&=~mask;
        for(let j=0;j<n*n;j++)if(frontier&cellBit(j)){
          const m=mask|cellBit(j),key=m.toString();if(!next.has(key))next.set(key,m);
        }
      }
      current=next;
    }
    for(const m of current.values()){const key=m.toString();if(!seen.has(key)){seen.add(key);bySize[k].push(m);}}
  }
  return {bySize,neighbors,cellBit};
}

const universeCache=new Map();
function countRegionExact(puzzle,limit=2,stats={}){
  const n=puzzle.length,maxClue=Math.max(1,...puzzle.flat().map(v=>Number(v)||0)),maxValue=Math.max(6,maxClue);
  const cacheKey=`${n}:${maxValue}`;
  if(!universeCache.has(cacheKey))universeCache.set(cacheKey,regionUniverse(n,maxValue));
  const {bySize,neighbors,cellBit}=universeCache.get(cacheKey);
  const clues=puzzle.flat();
  const candidates=[],byCell=Array.from({length:n*n},()=>[]);
  for(let k=1;k<=maxValue;k++)for(const mask of bySize[k]){
    let valid=true,adj=0n;
    for(let i=0;i<n*n&&valid;i++)if(mask&cellBit(i)){
      const clue=Number(clues[i])||0;if(clue&&clue!==k){valid=false;break;}
      for(const j of neighbors[i])if(!(mask&cellBit(j)))adj|=cellBit(j);
    }
    if(!valid)continue;
    for(let i=0;i<n*n&&valid;i++)if(!(mask&cellBit(i))&&Number(clues[i])===k){
      for(const j of neighbors[i])if(mask&cellBit(j)){valid=false;break;}
    }
    if(!valid)continue;
    const idx=candidates.length;candidates.push({mask,size:k,adj});
    for(let i=0;i<n*n;i++)if(mask&cellBit(i))byCell[i].push(idx);
  }
  const full=(1n<<BigInt(n*n))-1n,blocked=Array(maxValue+1).fill(0n);
  let found=0,nodes=0,branches=0;
  function visit(covered){
    if(found>=limit)return;nodes++;
    if(covered===full){found++;return;}
    let bestCell=-1,bestList=null;
    for(let cell=0;cell<n*n;cell++)if(!(covered&cellBit(cell))){
      const list=[];
      for(const idx of byCell[cell]){
        const cand=candidates[idx];
        if(cand.mask&covered)continue;
        if(cand.mask&blocked[cand.size])continue;
        list.push(idx);
      }
      if(!list.length)return;
      if(bestList===null||list.length<bestList.length){bestCell=cell;bestList=list;if(list.length===1)break;}
    }
    if(bestList.length>1)branches++;
    for(const idx of bestList){
      const cand=candidates[idx],old=blocked[cand.size];
      blocked[cand.size]=old|cand.adj;
      visit(covered|cand.mask);
      blocked[cand.size]=old;
      if(found>=limit)return;
    }
  }
  visit(0n);stats.nodes=nodes;stats.branches=branches;stats.candidates=candidates.length;stats.solutions=found;return found;
}

const makeStart=performance.now(),out=generator.make(variant,seed,difficulty),makeMs=performance.now()-makeStart;
const source=out.puzzle;
const clueCells=[];for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(source[r][c])clueCells.push([r,c]);
const sampleIndexes=[0,Math.floor(clueCells.length/4),Math.floor(clueCells.length/2),Math.floor(3*clueCells.length/4),clueCells.length-1].filter((v,i,a)=>v>=0&&a.indexOf(v)===i);
const cases=[{name:'source',grid:clone(source)}];
for(const idx of sampleIndexes){const [r,c]=clueCells[idx],grid=clone(source);grid[r][c]=0;cases.push({name:`remove-${r}-${c}`,grid});}
let failures=0,legacyTotal=0,exactTotal=0;
console.log(`FILLOMINO_REGION_DIFFERENTIAL seed=${seed} size=${size}x${size} makeMs=${makeMs.toFixed(1)} cases=${cases.length}`);
for(const item of cases){
  const t0=performance.now(),legacy=generator.countFillominoSolutions(item.grid,2),legacyMs=performance.now()-t0;
  const stats={},t1=performance.now(),exact=countRegionExact(item.grid,2,stats),exactMs=performance.now()-t1;
  legacyTotal+=legacyMs;exactTotal+=exactMs;const parity=legacy===exact;if(!parity)failures++;
  console.log(`FILLOMINO_REGION_CASE name=${item.name} legacy=${legacy} exact=${exact} parity=${parity} legacyMs=${legacyMs.toFixed(1)} exactMs=${exactMs.toFixed(1)} candidates=${stats.candidates} nodes=${stats.nodes} branches=${stats.branches}`);
}
console.log(`FILLOMINO_REGION_SUMMARY failures=${failures} legacyTotalMs=${legacyTotal.toFixed(1)} exactTotalMs=${exactTotal.toFixed(1)} speedup=${exactTotal? (legacyTotal/exactTotal).toFixed(2):'inf'}`);
if(failures){console.log('FILLOMINO_REGION_DIFFERENTIAL:FAIL');process.exitCode=1;}else console.log('FILLOMINO_REGION_DIFFERENTIAL:PASS');
