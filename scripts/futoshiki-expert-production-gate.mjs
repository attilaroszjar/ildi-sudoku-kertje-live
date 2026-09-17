import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||97001)>>>0,size=Number(process.argv[3]||6);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(x=>x.startsWith('games/'));
const banks=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const a=refs.indexOf('games/sudoku-generator.js'),b=refs.indexOf('games/p3-futoshiki-complete.js');
if(a<0||b<a)throw new Error('Futoshiki production runtime range not found');
const load=[...banks,...refs.slice(a,b+1).filter(x=>!banks.includes(x))];
globalThis.window=globalThis;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of load)await import(pathToFileURL(path.join(root,ref)).href);
const G=globalThis.SudokuGenerator,v=globalThis.SudokuBank.find(x=>x&&x.id==='futoshiki');
v.data=v.data||{};v.data.p3Size=size;
const clone=x=>JSON.parse(JSON.stringify(x));
let t=performance.now();const out=G.make(v,seed,'expert'),makeMs=performance.now()-t;
const g=out.generation||{},givens=out.puzzle.flat().filter(Boolean).length,inequalities=out.data.inequalities;
t=performance.now();const fullCount=G.countFutoshikiSolutions(out.puzzle,inequalities,2,{}),fullMs=performance.now()-t;
const bareInequalities=[];t=performance.now();const bareCount=G.countFutoshikiSolutions(out.puzzle,bareInequalities,2,{}),bareMs=performance.now()-t;
let removable=0,totalMs=0,worstMs=0,worst='n/a',tested=0;
for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(out.puzzle[r][c]){
  const puzzle=clone(out.puzzle);puzzle[r][c]=0;t=performance.now();const count=G.countFutoshikiSolutions(puzzle,inequalities,2,{}),ms=performance.now()-t;
  tested++;totalMs+=ms;if(ms>worstMs){worstMs=ms;worst=`given:${r},${c},count=${count}`;}if(count===1)removable++;
}
for(let i=0;i<inequalities.length;i++){
  const next=clone(inequalities);next.splice(i,1);t=performance.now();const count=G.countFutoshikiSolutions(out.puzzle,next,2,{}),ms=performance.now()-t;
  tested++;totalMs+=ms;if(ms>worstMs){worstMs=ms;worst=`inequality:${i},count=${count}`;}if(count===1)removable++;
}
console.log(`FUTOSHIKI_EXPERT_PRODUCTION seed=${seed} size=${size}x${size} makeMs=${makeMs.toFixed(1)}`);
console.log(`FUTOSHIKI_EXPERT_PRODUCTION_RESULT givens=${givens} inequalities=${inequalities.length} fullCount=${fullCount} fullMs=${fullMs.toFixed(1)} bareInequalityCount=${bareCount} bareMs=${bareMs.toFixed(1)} variantEssential=${fullCount===1&&bareCount!==1}`);
console.log(`FUTOSHIKI_EXPERT_PRODUCTION_FRONTIER tested=${tested} removable=${removable} locallyIrreducible=${removable===0} totalMs=${totalMs.toFixed(1)} worstMs=${worstMs.toFixed(1)} worst=${worst}`);
console.log(`FUTOSHIKI_EXPERT_PRODUCTION_METADATA verification=${g.verification||'n/a'} policy=${g.policy||'n/a'} proof=${g.localIrreducibilityProof||'n/a'} accepted=${g.acceptedRemovals??'n/a'} rejected=${g.rejectedRemovals??'n/a'}`);
const failures=[];
if(fullCount!==1)failures.push(`fullCount=${fullCount}`);
if(bareCount===1)failures.push('inequalities are not variant-essential');
if(removable)failures.push(`removable=${removable}`);
if(g.policy!=='contract-driven-local-irreducibility')failures.push(`policy=${g.policy}`);
if(g.locallyIrreducibleUnderProductionContract!==true)failures.push('local irreducibility metadata missing');
if(g.clues!==givens||g.inequalityCount!==inequalities.length)failures.push('reported clue counts mismatch');
if(failures.length){for(const f of failures)console.error(`FUTOSHIKI_EXPERT_PRODUCTION_FAILURE ${f}`);console.log('FUTOSHIKI_EXPERT_PRODUCTION:FAIL');process.exitCode=1;}
else console.log('FUTOSHIKI_EXPERT_PRODUCTION:PASS');
