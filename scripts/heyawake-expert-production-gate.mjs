import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||98001)>>>0,size=Number(process.argv[3]||6);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(x=>x.startsWith('games/'));
const banks=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const a=refs.indexOf('games/sudoku-generator.js'),b=refs.indexOf('games/p3-heyawake-complete.js');
if(a<0||b<a)throw new Error('Heyawake production runtime range not found');
const load=[...banks,...refs.slice(a,b+1).filter(x=>!banks.includes(x))];
globalThis.window=globalThis;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of load)await import(pathToFileURL(path.join(root,ref)).href);
const G=globalThis.SudokuGenerator,v=globalThis.SudokuBank.find(x=>x&&x.id==='heyawake');
v.data=v.data||{};v.data.p3Size=size;
const clone=x=>JSON.parse(JSON.stringify(x));
let t=performance.now();const out=G.make(v,seed,'expert'),makeMs=performance.now()-t;
const g=out.generation||{},starters=out.puzzle.starters||[];
const roomIds=Object.keys(out.puzzle.roomClues).filter(id=>out.puzzle.roomClues[id]!=null);
t=performance.now();const fullCount=G.countHeyawakeSolutions(out.puzzle,2,{}),fullMs=performance.now()-t;
const bare=clone(out.puzzle);bare.starters=[];for(const id of Object.keys(bare.roomClues))bare.roomClues[id]=null;
t=performance.now();const bareCount=G.countHeyawakeSolutions(bare,2,{}),bareMs=performance.now()-t;
let removable=0,totalMs=0,worstMs=0,worst='n/a',tested=0;
for(let i=0;i<starters.length;i++){
  const puzzle=clone(out.puzzle);puzzle.starters.splice(i,1);t=performance.now();const count=G.countHeyawakeSolutions(puzzle,2,{}),ms=performance.now()-t;
  tested++;totalMs+=ms;if(ms>worstMs){worstMs=ms;worst=`starter:${i},count=${count}`;}if(count===1)removable++;
}
for(const id of roomIds){
  const puzzle=clone(out.puzzle);puzzle.roomClues[id]=null;t=performance.now();const count=G.countHeyawakeSolutions(puzzle,2,{}),ms=performance.now()-t;
  tested++;totalMs+=ms;if(ms>worstMs){worstMs=ms;worst=`room:${id},count=${count}`;}if(count===1)removable++;
}
console.log(`HEYAWAKE_EXPERT_PRODUCTION seed=${seed} size=${size}x${size} makeMs=${makeMs.toFixed(1)}`);
console.log(`HEYAWAKE_EXPERT_PRODUCTION_RESULT starters=${starters.length} roomClues=${roomIds.length} totalClues=${starters.length+roomIds.length} fullCount=${fullCount} fullMs=${fullMs.toFixed(1)} bareCount=${bareCount} bareMs=${bareMs.toFixed(1)} clueEssential=${fullCount===1&&bareCount!==1}`);
console.log(`HEYAWAKE_EXPERT_PRODUCTION_FRONTIER tested=${tested} removable=${removable} locallyIrreducible=${removable===0} totalMs=${totalMs.toFixed(1)} worstMs=${worstMs.toFixed(1)} worst=${worst}`);
console.log(`HEYAWAKE_EXPERT_PRODUCTION_METADATA verification=${g.verification||'n/a'} policy=${g.policy||'n/a'} proof=${g.localIrreducibilityProof||'n/a'} accepted=${g.acceptedRemovals??'n/a'} rejected=${g.rejectedRemovals??'n/a'}`);
const failures=[];
if(fullCount!==1)failures.push(`fullCount=${fullCount}`);
if(bareCount===1)failures.push('clue-free topology unexpectedly unique');
if(removable)failures.push(`removable=${removable}`);
if(g.policy!=='contract-driven-local-irreducibility')failures.push(`policy=${g.policy}`);
if(g.locallyIrreducibleUnderProductionContract!==true)failures.push('local irreducibility metadata missing');
if(g.clues!==starters.length+roomIds.length)failures.push('reported clue count mismatch');
if(failures.length){for(const f of failures)console.error(`HEYAWAKE_EXPERT_PRODUCTION_FAILURE ${f}`);console.log('HEYAWAKE_EXPERT_PRODUCTION:FAIL');process.exitCode=1;}
else console.log('HEYAWAKE_EXPERT_PRODUCTION:PASS');
