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
const seed=(0x4b430100+i*53)>>>0;
const attemptSeed=(seed^0x434F4D42^Math.imul(1,0x9E3779B1))>>>0;
function phase(name,fn){
  process.stdout.write(`PHASE BEGIN ${name}\n`);
  const t=performance.now();
  const value=fn();
  process.stdout.write(`PHASE END ${name} ms=${(performance.now()-t).toFixed(1)}\n`);
  return value;
}
try{
  const fresh=phase('fresh-solution',()=>c.LineGeneratorCore.freshStandardSolution(attemptSeed));
  const solution=fresh.grid;
  const cages=phase('killer-cages',()=>c.KillerGenerator.buildCages(solution,(attemptSeed^0x4B494C4C)>>>0,{}));
  phase('secondary-topology',()=>c.CombinedKillerGenerator.buildSecondary(solution,id,(attemptSeed^0x5345434F)>>>0,{}));
  process.stdout.write(`PHASE PASS id=${id} cages=${cages.length}\n`);
}catch(error){
  process.stdout.write(`PHASE FAIL id=${id} error=${String(error&&error.message||error)}\n`);
  process.exit(1);
}
