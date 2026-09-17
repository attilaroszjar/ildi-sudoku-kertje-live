import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const loadRefs=[...bankRefs,'games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js','games/line-generator-proven-siblings-hardening.js'];
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of loadRefs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const G=ctx.SudokuGenerator,siblings=ctx.LineGeneratorProvenSiblings,variant=ctx.SudokuBank.find(v=>v.id==='nabner');
const seed=Number(process.env.NABNER_HOTPATH_SEED||92003);
function cloneGrid(g){return g.map(r=>r.slice());}
function clues(g){return g.flat().filter(Boolean).length;}
function bitCount(x){let c=0;while(x){x&=x-1;c++;}return c;}
function bitToDigit(b){return 1+Math.round(Math.log(b)/Math.LN2);}
function expandedForbidden(mask,full){return(mask|((mask<<1)&full)|(mask>>>1))&full;}
function rng(s){let x=s>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function makeIndex(data){const cells=Array.from({length:9},()=>Array.from({length:9},()=>[])),lines=[];for(const raw of data.lines||[]){const line=Array.isArray(raw)?raw:raw.cells||[];const id=lines.length;lines.push(line);for(const [r,c] of line)cells[r][c].push(id);}return{cells,lines};}
function probeCount(source,data,limit,stats={}){
  stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.propagated=0;
  const full=511,index=makeIndex(data),grid=cloneGrid(source),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),lineMasks=Array(index.lines.length).fill(0);
  const boxOf=(r,c)=>Math.floor(r/3)*3+Math.floor(c/3);
  for(let r=0;r<9;r++)for(let c=0;c<9;c++){const v=grid[r][c];if(!v)continue;const bit=1<<(v-1),b=boxOf(r,c);rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;for(const id of index.cells[r][c])lineMasks[id]|=bit;}
  const maskAt=(r,c)=>{let m=full&~(rows[r]|cols[c]|boxes[boxOf(r,c)]);for(const id of index.cells[r][c])m&=~expandedForbidden(lineMasks[id],full);return m&full;};
  function place(r,c,bit,trail){grid[r][c]=bitToDigit(bit);rows[r]|=bit;cols[c]|=bit;boxes[boxOf(r,c)]|=bit;for(const id of index.cells[r][c])lineMasks[id]|=bit;trail.push([r,c,bit]);stats.propagated++;}
  function rollback(trail){for(let i=trail.length-1;i>=0;i--){const [r,c,bit]=trail[i];for(const id of index.cells[r][c])lineMasks[id]^=bit;rows[r]^=bit;cols[c]^=bit;boxes[boxOf(r,c)]^=bit;grid[r][c]=0;}}
  function propagate(trail){while(true){let forced=null;for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(!grid[r][c]){const m=maskAt(r,c),n=bitCount(m);if(n===0)return false;if(n===1){forced=[r,c,m];break;}}if(!forced)return true;place(forced[0],forced[1],forced[2],trail);}}
  let found=0;
  function visit(){if(found>=limit)return;stats.nodes++;const forced=[];if(!propagate(forced)){stats.deadEnds++;rollback(forced);return;}let br=-1,bc=-1,bm=0,best=10,bp=-1;for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(!grid[r][c]){const m=maskAt(r,c),n=bitCount(m);let p=index.cells[r][c].length*9;for(const id of index.cells[r][c])p+=bitCount(expandedForbidden(lineMasks[id],full));if(n<best||(n===best&&p>bp)){br=r;bc=c;bm=m;best=n;bp=p;}}if(br<0){found++;rollback(forced);return;}if(bitCount(bm)>1)stats.branches++;const b=boxOf(br,bc);for(let bits=bm;bits&&found<limit;bits&=bits-1){const one=bits&-bits;grid[br][bc]=bitToDigit(one);rows[br]|=one;cols[bc]|=one;boxes[b]|=one;for(const id of index.cells[br][bc])lineMasks[id]|=one;visit();for(const id of index.cells[br][bc])lineMasks[id]^=one;rows[br]^=one;cols[bc]^=one;boxes[b]^=one;grid[br][bc]=0;}rollback(forced);}
  visit();return found;
}
const baseline=siblings.makeVariantPilot(G,variant,seed,'expert');
const puzzle=cloneGrid(baseline.puzzle),order=[];for(let i=0;i<81;i++)if(puzzle[Math.floor(i/9)][i%9])order.push(i);shuffle(order,rng((seed^0x4E414243)>>>0));
for(const index of order){const r=Math.floor(index/9),c=index%9,old=puzzle[r][c];puzzle[r][c]=0;const s=probeCount(puzzle,baseline.data,2,{});if(s!==1)puzzle[r][c]=old;}
if(clues(puzzle)!==17)throw new Error(`expected 17-given final, got ${clues(puzzle)}`);
function compare(name,grid){const ps={},gs={};let t=performance.now();const probeSolutions=probeCount(grid,baseline.data,2,ps);const probeMs=performance.now()-t;t=performance.now();const productionSolutions=G.countVariantSolutions(grid,baseline,2,gs);const productionMs=performance.now()-t;return{name,probeSolutions,productionSolutions,probeMs:+probeMs.toFixed(1),productionMs:+productionMs.toFixed(1),probeNodes:ps.nodes,productionNodes:gs.nodes,probeBranches:ps.branches,productionBranches:gs.branches,probePropagated:ps.propagated,productionPropagated:gs.propagated};}
const rows=[compare('final-17',cloneGrid(puzzle))];
const worst=cloneGrid(puzzle);if(!worst[2][7])throw new Error('expected r3c8 clue in final puzzle');worst[2][7]=0;rows.push(compare('remove-r3c8',worst));
const pass=rows.every(r=>r.probeSolutions===r.productionSolutions);
console.log('NABNER_PRODUCTION_VS_PROBE_HOTPATH '+JSON.stringify({seed,rows}));
console.log('NABNER_PRODUCTION_VS_PROBE_HOTPATH_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
