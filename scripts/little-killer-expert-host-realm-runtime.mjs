import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const first=refs.indexOf('games/sudoku-generator.js');
const last=refs.indexOf('games/little-killer-runtime-hardening.js');
if(first<0||last<first)throw new Error('Little Killer production script range not found');
const loadRefs=[...bankRefs,...refs.slice(first,last+1).filter(ref=>!bankRefs.includes(ref))];

globalThis.window=globalThis;
globalThis.performance=performance;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of loadRefs){
  const code=fs.readFileSync(path.join(root,ref),'utf8');
  (0,eval)(`${code}\n//# sourceURL=${ref}`);
}

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(v=>v.id==='little-killer');
if(!G||!variant)throw new Error('Little Killer host-realm runtime not loaded');
if(typeof G._compileLittleKillerClues!=='function'||typeof G._littleKillerFindAlternative!=='function')throw new Error('Little Killer exact proof helpers missing');

const seedStart=Number(process.env.LITTLE_KILLER_HOST_SEED_START||93000);
const seedCount=Number(process.env.LITTLE_KILLER_HOST_SEED_COUNT||10);
if(!Number.isSafeInteger(seedStart)||seedStart<0)throw new RangeError('LITTLE_KILLER_HOST_SEED_START invalid');
if(!Number.isSafeInteger(seedCount)||seedCount<1||seedCount>100)throw new RangeError('LITTLE_KILLER_HOST_SEED_COUNT invalid');

const rows=[];
let contractPass=true;
for(let offset=0;offset<seedCount;offset+=1){
  const seed=seedStart+offset;
  const t0=performance.now();
  const generated=G.make(variant,seed,'expert');
  const runtimeMs=performance.now()-t0;
  const givens=generated.puzzle.flat().filter(Boolean).length;

  // Production Little Killer uniqueness is certified by exhaustive search for any
  // solution different from the known generated solution. Do not use the generic
  // countVariantSolutions path here: on very sparse puzzles its separate node budget
  // can exhaust and conservatively report 2 even when the production exact proof passed.
  const compiled=G._compileLittleKillerClues(generated.data?.clues||[],9);
  const verifyStart=performance.now();
  const alt=G._littleKillerFindAlternative(generated.puzzle,compiled,generated.solution,180000);
  const verifyMs=performance.now()-verifyStart;
  const unique=!alt.exhausted&&!alt.alternative;
  const essential=G.countSolutions(generated.puzzle,2)>1;
  const generationUnique=generated.generation?.unique===true;
  const local=generated.generation?.playabilityCarving?.locallyIrreducible===true;
  const postEssentialBudgetHits=generated.generation?.search?.postEssentialBudgetHits||0;
  const metadata=generated.generation?.verification==='little-killer-tail-mask-proof'&&generated.generation?.playabilityCarving?.policy==='optimized-tail-mask-local-irreducibility-pass';
  const row={seed,givens,density:+(givens/81).toFixed(3),runtimeMs:+runtimeMs.toFixed(1),verifyMs:+verifyMs.toFixed(1),unique,generationUnique,alternative:!!alt.alternative,verifyExhausted:!!alt.exhausted,verifyNodes:alt.nodes||0,essential,local,postEssentialBudgetHits,metadata,verification:generated.generation?.verification??null};
  rows.push(row);
  console.log('LITTLE_KILLER_HOST_REALM_SAMPLE '+JSON.stringify(row));
  if(!(unique&&generationUnique&&essential&&metadata))contractPass=false;
}

const runtimes=rows.map(row=>row.runtimeMs).sort((a,b)=>a-b);
const median=runtimes.length%2?runtimes[(runtimes.length-1)/2]:(runtimes[runtimes.length/2-1]+runtimes[runtimes.length/2])/2;
const p95=runtimes[Math.ceil(runtimes.length*0.95)-1];
const summary={seedStart,seedCount,minMs:+runtimes[0].toFixed(1),medianMs:+median.toFixed(1),p95Ms:+p95.toFixed(1),maxMs:+runtimes[runtimes.length-1].toFixed(1),allUnique:rows.every(row=>row.unique),allGenerationUnique:rows.every(row=>row.generationUnique),allEssential:rows.every(row=>row.essential),allLocal:rows.every(row=>row.local),totalPostEssentialBudgetHits:rows.reduce((sum,row)=>sum+row.postEssentialBudgetHits,0),allMetadata:rows.every(row=>row.metadata)};
console.log('LITTLE_KILLER_HOST_REALM_SUMMARY '+JSON.stringify(summary));
console.log('LITTLE_KILLER_HOST_REALM_CONTRACT_GATE:'+(contractPass?'PASS':'FAIL'));
console.log('LITTLE_KILLER_HOST_REALM_LOCAL_IRREDUCIBILITY:'+(summary.allLocal?'PASS':'INCOMPLETE'));
if(!contractPass)process.exitCode=1;
