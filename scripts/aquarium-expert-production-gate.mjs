import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||94001)>>>0;
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(ref=>ref.startsWith('games/'));
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const firstGenerator=refs.indexOf('games/sudoku-generator.js');
const lastGenerator=refs.indexOf('games/p3-size-control.js');
if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production runtime range not found');
const generatorRefs=refs.slice(firstGenerator,lastGenerator+1);
const loadRefs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];
globalThis.window=globalThis;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of loadRefs)await import(pathToFileURL(path.join(root,ref)).href);

const generator=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank&&globalThis.SudokuBank.find(v=>v&&v.id==='aquarium');
if(!generator||!variant)throw new Error('Aquarium production runtime unavailable');
const clone=x=>JSON.parse(JSON.stringify(x));

function countOptional(puzzle,limit=2){
  const n=puzzle.size,reg=puzzle.regions,ids=[...new Set(reg.flat())];
  const grid=Array.from({length:n},()=>Array(n).fill(0)),states={};
  let found=0;
  for(const id of ids){
    const seen=new Set(),arr=[];
    for(let lev=0;lev<=n;lev++){
      const cells=[];
      for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(reg[r][c]===id)cells.push([r,c,(n-r)<=lev?1:0]);
      const key=cells.map(q=>q[2]).join('');
      if(!seen.has(key)){seen.add(key);arr.push(cells);}
    }
    states[id]=arr;
  }
  const known=v=>Number.isInteger(v);
  function feasible(){
    for(let r=0;r<n;r++)if(known(puzzle.rowClues[r])&&grid[r].reduce((a,x)=>a+x,0)>puzzle.rowClues[r])return false;
    for(let c=0;c<n;c++)if(known(puzzle.colClues[c])){let s=0;for(let r=0;r<n;r++)s+=grid[r][c];if(s>puzzle.colClues[c])return false;}
    return true;
  }
  function finalValid(){
    for(let r=0;r<n;r++)if(known(puzzle.rowClues[r])&&grid[r].reduce((a,x)=>a+x,0)!==puzzle.rowClues[r])return false;
    for(let c=0;c<n;c++)if(known(puzzle.colClues[c])){let s=0;for(let r=0;r<n;r++)s+=grid[r][c];if(s!==puzzle.colClues[c])return false;}
    return true;
  }
  function go(k){
    if(found>=limit)return;
    if(k===ids.length){if(finalValid())found++;return;}
    for(const cells of states[ids[k]]){
      cells.forEach(q=>{grid[q[0]][q[1]]=q[2];});
      if(feasible())go(k+1);
      cells.forEach(q=>{grid[q[0]][q[1]]=0;});
      if(found>=limit)return;
    }
  }
  go(0);return found;
}

const t0=performance.now();
const out=generator.make(variant,seed,'expert');
const makeMs=performance.now()-t0;
const p=out.puzzle,n=p.size;
const visible=[...p.rowClues,...p.colClues].filter(Number.isInteger).length;
const fullCount=countOptional(p,2);
const base=clone(p);base.rowClues=Array(n).fill(null);base.colClues=Array(n).fill(null);
const baseCount=countOptional(base,2);
let removable=0,worstMs=0,worst='n/a';
for(const axis of ['row','col'])for(let i=0;i<n;i++){
  const key=axis==='row'?'rowClues':'colClues';
  if(!Number.isInteger(p[key][i]))continue;
  const candidate=clone(p);candidate[key][i]=null;
  const s=performance.now(),count=countOptional(candidate,2),ms=performance.now()-s;
  if(ms>worstMs){worstMs=ms;worst=`${axis}:${i},count=${count}`;}
  if(count===1)removable++;
}
const g=out.generation||{};
console.log(`AQUARIUM_EXPERT_PRODUCTION seed=${seed} size=${n}x${n} makeMs=${makeMs.toFixed(1)}`);
console.log(`AQUARIUM_EXPERT_PRODUCTION_RESULT visibleClues=${visible} reportedClues=${g.clues} fullCount=${fullCount} baseCount=${baseCount} variantEssential=${fullCount===1&&baseCount!==1}`);
console.log(`AQUARIUM_EXPERT_PRODUCTION_FRONTIER removable=${removable} locallyIrreducible=${removable===0} worstMs=${worstMs.toFixed(1)} worst=${worst}`);
console.log(`AQUARIUM_EXPERT_PRODUCTION_METADATA verification=${g.verification} policy=${g.policy} proof=${g.localIrreducibilityProof} accepted=${g.acceptedRemovals} rejected=${g.rejectedRemovals}`);
console.log(`AQUARIUM_EXPERT_PRODUCTION_CLUES rows=${JSON.stringify(p.rowClues)} cols=${JSON.stringify(p.colClues)}`);
const failures=[];
if(fullCount!==1)failures.push(`fullCount=${fullCount}`);
if(baseCount===1)failures.push('base remained unique');
if(removable!==0)failures.push(`removable=${removable}`);
if(visible>=2*n)failures.push(`visibleClues=${visible} was not reduced`);
if(g.clues!==visible)failures.push(`reportedClues=${g.clues} != visible=${visible}`);
if(g.verification!=='solver-verified-local-irreducible')failures.push(`verification=${g.verification}`);
if(g.policy!=='contract-driven-local-irreducibility')failures.push(`policy=${g.policy}`);
if(g.localIrreducibilityProof!=='monotone-nonuniqueness-from-single-pass')failures.push(`proof=${g.localIrreducibilityProof}`);
if(failures.length){for(const f of failures)console.error(`AQUARIUM_EXPERT_PRODUCTION_FAILURE ${f}`);console.log('AQUARIUM_EXPERT_PRODUCTION:FAIL');process.exitCode=1;}
else console.log('AQUARIUM_EXPERT_PRODUCTION:PASS');
