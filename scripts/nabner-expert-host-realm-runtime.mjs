import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const loadRefs=[...bankRefs,'games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js','games/line-generator-proven-siblings-hardening.js'];

globalThis.window=globalThis;
globalThis.performance=performance;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of loadRefs){
  const code=fs.readFileSync(path.join(root,ref),'utf8');
  (0,eval)(`${code}\n//# sourceURL=${ref}`);
}

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(v=>v.id==='nabner');
if(!G||!variant)throw new Error('Nabner host-realm runtime not loaded');
const seed=Number(process.env.NABNER_HOST_SEED||92003);
if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('NABNER_HOST_SEED invalid');

const t0=performance.now();
const generated=G.make(variant,seed,'expert');
const runtimeMs=performance.now()-t0;
const givens=generated.puzzle.flat().filter(Boolean).length;
const verifyStart=performance.now();
const unique=G.countVariantSolutions(generated.puzzle,generated,2)===1;
const verifyMs=performance.now()-verifyStart;
const essential=G.countSolutions(generated.puzzle,2)>1;
const local=generated.generation?.locallyIrreducibleUnderProductionContract===true;
const metadata=generated.generation?.verification==='nabner-naked-single-pressure-mrv-exact-v2'&&generated.generation?.policy==='contract-driven-local-irreducibility';
console.log('NABNER_HOST_REALM_RUNTIME '+JSON.stringify({seed,givens,density:+(givens/81).toFixed(3),runtimeMs:+runtimeMs.toFixed(1),verifyMs:+verifyMs.toFixed(1),unique,essential,local,metadata,verification:generated.generation?.verification??null}));
const pass=unique&&essential&&local&&metadata;
console.log('NABNER_HOST_REALM_RUNTIME_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
