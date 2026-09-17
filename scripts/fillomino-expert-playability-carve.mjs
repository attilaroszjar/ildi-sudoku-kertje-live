import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||97001)>>>0;
const size=Number(process.argv[3]||6);
const difficulty='expert',id='fillomino';
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
const countClues=grid=>grid.flat().filter(Boolean).length;
function rng(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,random){for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}

const tm=performance.now(),out=generator.make(variant,seed,difficulty),makeMs=performance.now()-tm;
const puzzle=clone(out.puzzle),sourceClues=countClues(puzzle);
const order=[];for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(puzzle[r][c])order.push(r*size+c);
shuffle(order,rng((seed^0xF1110E4D^Math.imul(size,0x9E3779B1))>>>0));
let accepted=0,rejected=0,totalMs=0,worstMs=0,worst='n/a';
for(const idx of order){
  const r=Math.floor(idx/size),c=idx%size,saved=puzzle[r][c];
  if(!saved)continue;
  puzzle[r][c]=0;
  const t=performance.now(),count=generator.countFillominoSolutions(puzzle,2),ms=performance.now()-t;
  totalMs+=ms;if(ms>worstMs){worstMs=ms;worst=`${r},${c},value=${saved},count=${count}`;}
  if(count===1)accepted++;else{puzzle[r][c]=saved;rejected++;}
}
const finalClues=countClues(puzzle);
const tf=performance.now(),finalCount=generator.countFillominoSolutions(puzzle,2),finalMs=performance.now()-tf;
let removable=0,closureMs=0,closureWorstMs=0,closureWorst='n/a';
for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(puzzle[r][c]){
  const candidate=clone(puzzle),saved=candidate[r][c];candidate[r][c]=0;
  const t=performance.now(),count=generator.countFillominoSolutions(candidate,2),ms=performance.now()-t;
  closureMs+=ms;if(ms>closureWorstMs){closureWorstMs=ms;closureWorst=`${r},${c},value=${saved},count=${count}`;}if(count===1)removable++;
}
console.log(`FILLOMINO_EXPERT_CARVE seed=${seed} size=${size}x${size} makeMs=${makeMs.toFixed(1)} sourceClues=${sourceClues} finalClues=${finalClues} accepted=${accepted} rejected=${rejected}`);
console.log(`FILLOMINO_EXPERT_CARVE_ORDER ${order.join(',')}`);
console.log(`FILLOMINO_EXPERT_CARVE_RUNTIME totalMs=${totalMs.toFixed(1)} worstMs=${worstMs.toFixed(1)} worst=${worst} finalVerifyMs=${finalMs.toFixed(1)}`);
console.log(`FILLOMINO_EXPERT_CLOSURE checks=${finalClues} removable=${removable} locallyIrreducible=${removable===0} totalMs=${closureMs.toFixed(1)} worstMs=${closureWorstMs.toFixed(1)} worst=${closureWorst}`);
console.log(`FILLOMINO_EXPERT_CARVE_EXACT finalCount=${finalCount}`);
console.log(`FILLOMINO_EXPERT_CARVE_GRID ${JSON.stringify(puzzle)}`);
const failures=[];if(finalCount!==1)failures.push(`final count ${finalCount}`);if(removable!==0)failures.push(`${removable} remaining removable clues`);
if(failures.length){for(const f of failures)console.error(`FILLOMINO_EXPERT_CARVE_FAILURE ${f}`);console.log('FILLOMINO_EXPERT_CARVE:FAIL');process.exitCode=1;}else console.log('FILLOMINO_EXPERT_CARVE:PASS_LOCAL_IRREDUCIBLE');
