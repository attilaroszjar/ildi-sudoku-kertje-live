import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const first=refs.indexOf('games/sudoku-generator.js');
const last=refs.indexOf('games/miracle-generator-hardening.js');
if(first<0||last<first)throw new Error('production generator script range missing');
const banks=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const runtime=[...banks,...refs.slice(first,last+1).filter(ref=>!banks.includes(ref))];

globalThis.window=globalThis;
globalThis.performance=performance;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of runtime)(0,eval)(`${fs.readFileSync(path.join(root,ref),'utf8')}\n//# sourceURL=${ref}`);

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(x=>x.id==='skyscraper-parks');
if(!G||!variant)throw new Error('Skyscraper Parks runtime unavailable');
const seed=Number(process.env.SKYSCRAPER_PARKS_EXPERT_SEED||92001);

console.log('SKYSCRAPER_PARKS_PRODUCTION_CLOSURE_PROGRESS '+JSON.stringify({phase:'generation-start',seed}));
const t0=performance.now();
const out=G.make(variant,seed,'expert');
const generationMs=performance.now()-t0;
const clues=out.puzzle.flat().filter(Boolean).length;
console.log('SKYSCRAPER_PARKS_PRODUCTION_CLOSURE_PROGRESS '+JSON.stringify({phase:'generation-done',seed,clues,generationMs:+generationMs.toFixed(1)}));

const verifyStart=performance.now();
const variantSolutions=G.countParkSolutions(out.puzzle,out,2,false);
const baseFamilySolutions=G.countParkSolutions(out.puzzle,out,2,true);
const verifyMs=performance.now()-verifyStart;
const g=out.generation||{};
const contract={
  uniqueUnderVariant:variantSolutions===1,
  variantEssential:baseFamilySolutions>1,
  locallyIrreducibleUnderProductionContract:g.locallyIrreducibleUnderProductionContract===true,
  policy:g.policy,
  proof:g.localIrreducibilityProof,
  verification:g.verification,
  clueFloor:g.difficultyCalibration?.clueFloor,
  runtimeCutoff:g.difficultyCalibration?.runtimeCutoff,
  stopCondition:g.difficultyCalibration?.stopCondition,
  sourceClues:g.sourceClues,
  acceptedRemovals:g.acceptedRemovals,
  rejectedRemovals:g.rejectedRemovals
};
const pass=
  clues<30&&
  variantSolutions===1&&
  baseFamilySolutions>1&&
  contract.locallyIrreducibleUnderProductionContract&&
  contract.policy==='contract-driven-local-irreducibility'&&
  contract.proof==='monotone-nonuniqueness-from-single-pass'&&
  contract.verification==='skyscraper-parks-hybrid-exact-v1'&&
  contract.clueFloor===false&&
  contract.runtimeCutoff===false;

console.log('SKYSCRAPER_PARKS_PRODUCTION_CLOSURE '+JSON.stringify({seed,runtimeRealm:'host',clues,density:+(clues/81).toFixed(3),generationMs:+generationMs.toFixed(1),verifyMs:+verifyMs.toFixed(1),variantSolutions,baseFamilySolutions,contract,hybridThreshold:globalThis.SkyscraperParksHybridRuntime?.threshold??null}));
console.log('SKYSCRAPER_PARKS_PRODUCTION_CLOSURE_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
