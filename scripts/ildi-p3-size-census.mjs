import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=[
  'hitori','hashiwokakero','fillomino','slitherlink','akari','nurikabe','nonogram','masyu',
  'star-battle','tentai-show','ripple-effect','battleships','heyawake','futoshiki',
  'skyscraper','double-skyscrapers'
];
const difficulties=['gentle','focused','expert'];
const seeds=[0x73100001,0x73101f3e];

function runtimeRefs(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const all=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
  return all.filter(x=>{
    if(/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x))return true;
    if(x==='games/sudoku-generator.js')return true;
    if(/^games\/(?:extra-house-generator-core|line-generator-core|killer-generator|line-generator-[^/]+)\.js$/.test(x))return true;
    if(/^games\/iteration\d+-generator-hardening\.js$/.test(x))return true;
    if(/^games\/[^/]+(?:generator|runtime)-hardening\.js$/.test(x))return true;
    return false;
  });
}

function loadRuntime(){
  const ctx={console,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
  ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const file of runtimeRefs()){
    const full=path.join(root,file);
    if(!fs.existsSync(full))throw new Error('runtime ref missing: '+file);
    vm.runInContext(fs.readFileSync(full,'utf8'),ctx,{filename:file});
  }
  if(!ctx.SudokuGenerator||typeof ctx.SudokuGenerator.make!=='function')throw new Error('SudokuGenerator.make missing');
  if(!Array.isArray(ctx.SudokuBank))throw new Error('SudokuBank missing');
  return ctx;
}

function gridSize(x){
  if(!Array.isArray(x))return null;
  return x.length;
}

function shape(x){
  if(!Array.isArray(x))return null;
  const rows=x.length;
  const cols=rows&&Array.isArray(x[0])?x[0].length:null;
  return cols==null?String(rows):`${rows}x${cols}`;
}

const ctx=loadRuntime(),G=ctx.SudokuGenerator;
let failures=0;
console.log('===== ILDI P3 SIZE CENSUS =====');

for(const id of ids){
  const variant=ctx.SudokuBank.find(v=>v.id===id);
  if(!variant){
    console.log(`P3_SIZE ${id} MISSING`);
    failures++;
    continue;
  }
  const canonical=gridSize(variant.solution)||gridSize(variant.puzzle);
  const observed=new Set();
  const families=new Set();
  let ok=0,total=0;
  const byDifficulty=[];

  for(const difficulty of difficulties){
    let dOk=0;
    const sizes=[];
    for(const seed of seeds){
      total++;
      try{
        const out=G.make(variant,seed,difficulty);
        const s=gridSize(out&&out.solution)||gridSize(out&&out.puzzle);
        const pshape=shape(out&&out.puzzle);
        if(s!=null)observed.add(s);
        if(pshape)sizes.push(pshape);
        const fam=out?.generation?.generatorFamily||out?.generatorFamily;
        if(fam)families.add(fam);
        ok++;dOk++;
      }catch(error){
        sizes.push('FAIL');
      }
    }
    byDifficulty.push(`${difficulty}:${dOk}/${seeds.length}:${[...new Set(sizes)].join(',')}`);
  }

  console.log(
    `P3_SIZE ${id}`+
    ` kind=${variant.kind}`+
    ` canonical=${canonical}`+
    ` generatedSizes=${[...observed].sort((a,b)=>a-b).join(',')||'none'}`+
    ` multiSize=${observed.size>1?'YES':'NO'}`+
    ` ok=${ok}/${total}`+
    ` bands=${byDifficulty.join('|')}`+
    ` families=${[...families].join(',')||'unknown'}`
  );
}

console.log('ILDI_P3_SIZE_CENSUS:'+(failures?'FAIL':'PASS'));
if(failures)process.exitCode=1;
