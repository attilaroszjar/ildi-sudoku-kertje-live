import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||96001)>>>0;
const size=Number(process.argv[3]||7);
const id='hashiwokakero',difficulty='expert';
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(x=>x.startsWith('games/'));
const bankRefs=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const a=refs.indexOf('games/sudoku-generator.js'),b=refs.indexOf('games/p3-size-control.js');
if(a<0||b<a)throw new Error('production runtime range not found');
const load=[...bankRefs,...refs.slice(a,b+1).filter(x=>!bankRefs.includes(x))];
globalThis.window=globalThis;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of load)await import(pathToFileURL(path.join(root,ref)).href);
const generator=globalThis.SudokuGenerator,variant=globalThis.SudokuBank&&globalThis.SudokuBank.find(v=>v&&v.id===id);
if(!generator||!variant||typeof generator.countBridgesSparseSolutions!=='function')throw new Error('Hashiwokakero sparse production verifier unavailable');
variant.data=variant.data||{};variant.data.p3Size=size;
const clone=x=>JSON.parse(JSON.stringify(x));
const t0=performance.now(),out=generator.make(variant,seed,difficulty),makeMs=performance.now()-t0;
const puzzle=out.puzzle,g=out.generation||{},islands=puzzle.islands||[];
const fullStart=performance.now(),fullCount=generator.countBridgesSparseSolutions(puzzle,2,{}),fullMs=performance.now()-fullStart;
const bare=clone(puzzle);for(const island of bare.islands)island.clue=null;
const bareStart=performance.now(),bareCount=generator.countBridgesSparseSolutions(bare,2,{}),bareMs=performance.now()-bareStart;
let removable=0,totalMs=0,worstMs=0,worst='n/a';
for(let i=0;i<islands.length;i++)if(Number.isInteger(islands[i].clue)){
  const candidate=clone(puzzle);candidate.islands[i].clue=null;
  const s=performance.now(),count=generator.countBridgesSparseSolutions(candidate,2,{}),ms=performance.now()-s;
  totalMs+=ms;if(ms>worstMs){worstMs=ms;worst=`island:${i},count=${count}`;}if(count===1)removable++;
}
const visible=islands.filter(x=>Number.isInteger(x.clue)).length;
console.log(`HASHI_EXPERT_PRODUCTION seed=${seed} size=${size}x${size} makeMs=${makeMs.toFixed(1)}`);
console.log(`HASHI_EXPERT_PRODUCTION_RESULT visibleClues=${visible} reportedClues=${g.clues??'n/a'} fullCount=${fullCount} fullMs=${fullMs.toFixed(1)} bareCount=${bareCount} bareMs=${bareMs.toFixed(1)} variantEssential=${fullCount===1&&bareCount!==1}`);
console.log(`HASHI_EXPERT_PRODUCTION_FRONTIER tested=${visible} removable=${removable} locallyIrreducible=${removable===0} totalMs=${totalMs.toFixed(1)} worstMs=${worstMs.toFixed(1)} worst=${worst}`);
console.log(`HASHI_EXPERT_PRODUCTION_METADATA verification=${g.verification||'n/a'} policy=${g.policy||'n/a'} proof=${g.localIrreducibilityProof||'n/a'} accepted=${g.acceptedRemovals??'n/a'} rejected=${g.rejectedRemovals??'n/a'}`);
console.log(`HASHI_EXPERT_PRODUCTION_CLUES ${islands.map((x,i)=>Number.isInteger(x.clue)?`${i}:${x.clue}@${x.r},${x.c}`:null).filter(Boolean).join(' ')}`);
const failures=[];
if(fullCount!==1)failures.push(`fullCount=${fullCount}`);
if(bareCount===1)failures.push('bare topology unexpectedly unique');
if(removable!==0)failures.push(`removable=${removable}`);
if(g.verification!=='solver-verified-local-irreducible')failures.push(`verification=${g.verification}`);
if(g.policy!=='contract-driven-local-irreducibility')failures.push(`policy=${g.policy}`);
if(g.clues!==visible)failures.push(`reportedClues=${g.clues} visible=${visible}`);
if(failures.length){for(const f of failures)console.error(`HASHI_EXPERT_PRODUCTION_FAILURE ${f}`);console.log('HASHI_EXPERT_PRODUCTION:FAIL');process.exitCode=1;}
else console.log('HASHI_EXPERT_PRODUCTION:PASS');
