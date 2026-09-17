import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const ids=['skyscraper','double-skyscrapers','toroidal-skyscrapers','odd-even'];
const difficulties=['gentle','focused','expert'];
const seeds=[0x72a10001,0x72a11f3e,0x72a13e7b,0x72a15db8];

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
  const missing=ids.filter(id=>!ctx.SudokuBank.some(v=>v.id===id));
  if(missing.length)throw new Error('missing P2 variant(s): '+missing.join(','));
  return ctx;
}

function numericGivens(puzzle){
  if(!Array.isArray(puzzle))return null;
  let n=0;
  for(const row of puzzle){
    if(!Array.isArray(row))return null;
    for(const value of row)if(Number.isFinite(value)&&value!==0)n++;
  }
  return n;
}

function specialClues(generated){
  const d=generated&&generated.data||{};
  if(Array.isArray(d.toroidalClues))return d.toroidalClues.length;
  if(Array.isArray(d.clues))return d.clues.length;
  if(generated&&generated.kind==='parity')return Object.keys(d).filter(k=>/^\d+,\d+$/.test(k)).length;
  return Object.keys(d).filter(k=>/^\d+,\d+$/.test(k)).length;
}

function contractCounts(G,variant,generated){
  try{
    if(variant.id==='double-skyscrapers'&&typeof G.countDoubleSkyscraperSolutions==='function'){
      return {
        exact:G.countDoubleSkyscraperSolutions(generated.puzzle,generated,2,false),
        baseline:G.countDoubleSkyscraperSolutions(generated.puzzle,generated,2,true)
      };
    }
    if(variant.id==='toroidal-skyscrapers'){
      return {exact:generated.unique===true?1:null,baseline:null};
    }
    return {
      exact:typeof G.countVariantSolutions==='function'?G.countVariantSolutions(generated.puzzle,generated,2):null,
      baseline:typeof G.countSolutions==='function'?G.countSolutions(generated.puzzle,2):null
    };
  }catch(error){
    return {exact:null,baseline:null,countError:String(error&&error.message||error)};
  }
}

function median(values){
  const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);
  if(!a.length)return null;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}

const ctx=loadRuntime(),G=ctx.SudokuGenerator;
const rows=[];
for(const id of ids){
  const variant=ctx.SudokuBank.find(v=>v.id===id);
  for(const difficulty of difficulties){
    for(const seed of seeds){
      const started=Date.now();
      try{
        const generated=G.make(variant,seed,difficulty),g=generated.generation||{},counts=contractCounts(G,variant,generated);
        rows.push({
          id,difficulty,seed,status:'OK',ms:Date.now()-started,
          size:Array.isArray(generated.solution)?generated.solution.length:null,
          numericGivens:numericGivens(generated.puzzle),
          specialClues:specialClues(generated),
          reportedClues:Number.isFinite(g.clues)?g.clues:(Number.isFinite(generated.clues)?generated.clues:null),
          difficultyScore:Number.isFinite(g.difficultyScore)?g.difficultyScore:null,
          nodes:Number.isFinite(g.searchStats&&g.searchStats.nodes)?g.searchStats.nodes:null,
          branches:Number.isFinite(g.searchStats&&g.searchStats.branches)?g.searchStats.branches:null,
          deadEnds:Number.isFinite(g.searchStats&&g.searchStats.deadEnds)?g.searchStats.deadEnds:null,
          unique:g.unique===true||generated.unique===true,
          variantEssential:g.variantEssential===true||generated.variantEssential===true,
          exact:counts.exact,
          baseline:counts.baseline,
          generatorFamily:g.generatorFamily||generated.generatorFamily||null,
          countError:counts.countError||null
        });
      }catch(error){
        rows.push({id,difficulty,seed,status:'FAIL',ms:Date.now()-started,error:String(error&&error.message||error)});
      }
    }
  }
}

console.log('===== ILDI P2 DIFFICULTY CENSUS =====');
for(const id of ids){
  const variant=ctx.SudokuBank.find(v=>v.id===id);
  console.log(`VARIANT ${id} kind=${variant.kind} size=${variant.solution.length}`);
  for(const difficulty of difficulties){
    const part=rows.filter(r=>r.id===id&&r.difficulty===difficulty);
    const ok=part.filter(r=>r.status==='OK');
    console.log(
      `P2_CENSUS ${id} ${difficulty}`+
      ` ok=${ok.length}/${part.length}`+
      ` givens=${median(ok.map(r=>r.numericGivens))}`+
      ` special=${median(ok.map(r=>r.specialClues))}`+
      ` reported=${median(ok.map(r=>r.reportedClues))}`+
      ` score=${median(ok.map(r=>r.difficultyScore))}`+
      ` nodes=${median(ok.map(r=>r.nodes))}`+
      ` branches=${median(ok.map(r=>r.branches))}`+
      ` maxMs=${ok.length?Math.max(...ok.map(r=>r.ms)):null}`
    );
  }
}

const failures=rows.filter(r=>r.status!=='OK');
console.log('P2_CENSUS_RAW '+JSON.stringify(rows));
console.log('ILDI_P2_DIFFICULTY_CENSUS:'+(failures.length?'FAIL':'PASS'));
if(failures.length)process.exitCode=1;
