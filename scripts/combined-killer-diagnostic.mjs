import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const files=[
  'games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-bank-iteration3.js','games/sudoku-generator.js',
  'games/line-generator-core.js','games/killer-generator.js','games/line-generator-directed.js','games/line-generator-arrow.js',
  'games/line-generator-proven-siblings.js','games/line-generator-symmetric.js','games/line-generator-sliding-triple.js',
  'games/line-generator-whole-set.js','games/line-generator-transition.js','games/combined-killer-generator.js'
];
const ids=['killer-thermo','killer-arrow','killer-palindrome','killer-zipper','killer-entropic','killer-modular','killer-renban','killer-dutch-whispers','killer-lockout'];
const requested=process.argv[2];
const id=ids.includes(requested)?requested:null;
if(!id){console.error('UNKNOWN_VARIANT');process.exit(2);}
const i=ids.indexOf(id);
const c={console,Map,Set,WeakMap};c.globalThis=c;c.window=c;vm.createContext(c);
for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});
const v=c.SudokuBank.find(x=>x.id===id);
if(!v){console.error('MISSING_VARIANT');process.exit(3);}
const seed=(0x4b430100+i*53)>>>0;
const t0=performance.now();
try{
  const p=c.CombinedKillerGenerator.makeVariantPilot(c.SudokuGenerator,v,seed,'focused');
  const ms=performance.now()-t0;
  console.log(`COMBINED_DIAG ${id} PASS ms=${ms.toFixed(1)} clues=${p.generation.clues} killerOnly=${p.generation.killerOnlySolutions} secondaryOnly=${p.generation.secondaryOnlySolutions}`);
}catch(error){
  const ms=performance.now()-t0;
  console.log(`COMBINED_DIAG ${id} FAIL ms=${ms.toFixed(1)} error=${String(error&&error.message||error)}`);
  process.exit(1);
}
