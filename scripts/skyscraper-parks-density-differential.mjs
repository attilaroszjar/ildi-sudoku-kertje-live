import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const snapshot=path.join(os.tmpdir(),'ildi-parks-92001-density.json');

function loadRuntime(){
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
  const banks=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
  const first=refs.indexOf('games/sudoku-generator.js');
  const last=refs.indexOf('games/miracle-generator-hardening.js');
  if(first<0||last<first)throw new Error('production generator range missing');
  const load=[...banks,...refs.slice(first,last+1).filter(ref=>!banks.includes(ref))];
  globalThis.window=globalThis;
  globalThis.performance=performance;
  globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
  for(const ref of load){const p=path.join(root,ref);if(fs.existsSync(p))(0,eval)(`${fs.readFileSync(p,'utf8')}\n//# sourceURL=${ref}`);}
}

function clueCount(grid){return grid.flat().filter(Boolean).length;}
function densify(puzzle,solution,target){
  const g=puzzle.map(r=>r.slice());
  for(let r=0;r<g.length&&clueCount(g)<target;r++)for(let c=0;c<g.length&&clueCount(g)<target;c++)if(!g[r][c])g[r][c]=solution[r][c];
  return g;
}

if(process.env.PARKS_DENSITY_CHILD==='1'){
  loadRuntime();
  const H=globalThis.SkyscraperParksHybridRuntime;
  if(!H||typeof H.legacyCount!=='function'||typeof H.countSparse!=='function')throw new Error('hybrid runtime missing');
  const saved=JSON.parse(fs.readFileSync(snapshot,'utf8'));
  const target=Number(process.env.PARKS_TARGET);
  const grid=densify(saved.puzzle,saved.solution,target);
  const h0=performance.now();
  const hybrid=H.countSparse(grid,saved.out,2);
  const hybridMs=performance.now()-h0;
  console.log('DENSITY:HYBRID_DONE '+JSON.stringify({target,actual:clueCount(grid),count:hybrid,ms:+hybridMs.toFixed(1)}));
  const l0=performance.now();
  const legacy=H.legacyCount(grid,saved.out,2,false);
  const legacyMs=performance.now()-l0;
  console.log('DENSITY:LEGACY_DONE '+JSON.stringify({target,actual:clueCount(grid),count:legacy,ms:+legacyMs.toFixed(1)}));
  console.log('DENSITY:RESULT '+JSON.stringify({target,actual:clueCount(grid),hybrid,legacy,match:hybrid===legacy,hybridMs:+hybridMs.toFixed(1),legacyMs:+legacyMs.toFixed(1)}));
  process.exit(hybrid===legacy?0:2);
}

loadRuntime();
const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(v=>v.id==='skyscraper-parks');
if(!G||!variant)throw new Error('Skyscraper Parks runtime unavailable');
const seed=92001;
console.log('DENSITY:GENERATION_START seed='+seed);
const g0=performance.now();
const out=G.make(variant,seed,'expert');
console.log('DENSITY:GENERATION_DONE '+JSON.stringify({ms:+(performance.now()-g0).toFixed(1),givens:clueCount(out.puzzle)}));
fs.writeFileSync(snapshot,JSON.stringify({puzzle:out.puzzle,solution:out.solution,out}));
const targets=[24,20,18,16,15,14,13,12,11];
let firstMismatch=null;
for(const target of targets){
  console.log('DENSITY:CASE_START target='+target);
  const child=spawnSync(process.execPath,[fileURLToPath(import.meta.url)],{
    cwd:root,
    env:{...process.env,PARKS_DENSITY_CHILD:'1',PARKS_TARGET:String(target)},
    encoding:'utf8',
    timeout:15000
  });
  if(child.stdout)process.stdout.write(child.stdout);
  if(child.stderr)process.stderr.write(child.stderr);
  if(child.error&&child.error.code==='ETIMEDOUT'){
    console.log('DENSITY:CASE_TIMEOUT '+JSON.stringify({target,timeoutMs:15000}));
    break;
  }
  console.log('DENSITY:CASE_EXIT '+JSON.stringify({target,status:child.status}));
  if(child.status===2){firstMismatch=target;break;}
  if(child.status!==0)throw new Error(`density child failed target=${target} status=${child.status}`);
}
try{fs.unlinkSync(snapshot);}catch{}
console.log('SKYSCRAPER_PARKS_DENSITY_DIFFERENTIAL '+JSON.stringify({seed,firstMismatch}));
console.log('SKYSCRAPER_PARKS_DENSITY_DIFFERENTIAL_GATE:PASS');
