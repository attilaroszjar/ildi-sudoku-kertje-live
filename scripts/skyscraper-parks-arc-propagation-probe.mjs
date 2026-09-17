import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
const banks=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const first=refs.indexOf('games/sudoku-generator.js');
const last=refs.indexOf('games/miracle-generator-hardening.js');
if(first<0||last<first)throw new Error('production generator range missing');
const load=[...banks,...refs.slice(first,last+1).filter(ref=>!banks.includes(ref))];
globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of load){const p=path.join(root,ref);if(fs.existsSync(p))(0,eval)(`${fs.readFileSync(p,'utf8')}\n//# sourceURL=${ref}`);}

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(v=>v.id==='skyscraper-parks');
if(!G||!variant)throw new Error('Skyscraper Parks runtime unavailable');
const seed=Number(process.env.SKYSCRAPER_PARKS_SEED||92001);

console.log('ARC:GENERATION_START seed='+seed);
let t=performance.now();
const out=G.make(variant,seed,'expert');
console.log('ARC:GENERATION_DONE '+JSON.stringify({ms:+(performance.now()-t).toFixed(1),givens:out.puzzle.flat().filter(Boolean).length}));

const n=out.puzzle.length,park=out.data?.parkValue??n;
function visible(line){let max=0,count=0;for(const v of line){if(v===park)continue;if(v>max){max=v;count++;}}return count;}
function cluePair(axis,index){const cs=(out.data?.clues||[]).filter(cl=>cl.axis===axis&&cl.index===index);const near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom';const a=cs.find(cl=>cl.side===near)?.count,b=cs.find(cl=>cl.side===far)?.count;if(!Number.isInteger(a)||!Number.isInteger(b))throw new Error(`missing clue pair ${axis}/${index}`);return[a,b];}
function key(a,b){return `${a},${b}`;}
const needed=new Set();for(let i=0;i<n;i++){const r=cluePair('row',i),c=cluePair('col',i);needed.add(key(...r));needed.add(key(...c));}
const buckets=new Map([...needed].map(k=>[k,[]]));
const perm=Array(n).fill(0),used=Array(n+1).fill(false);
function emit(pos){if(pos===n){const a=visible(perm),b=visible([...perm].reverse()),bucket=buckets.get(key(a,b));if(bucket)bucket.push(Uint8Array.from(perm));return;}for(let d=1;d<=n;d++)if(!used[d]){used[d]=true;perm[pos]=d;emit(pos+1);used[d]=false;}}
console.log('ARC:DOMAIN_BUILD_START');t=performance.now();emit(0);console.log('ARC:DOMAIN_BUILD_DONE ms='+(performance.now()-t).toFixed(1));
const rowDomains=Array.from({length:n},(_,i)=>{const p=cluePair('row',i);return buckets.get(key(...p));});
const colDomains=Array.from({length:n},(_,i)=>{const p=cluePair('col',i);return buckets.get(key(...p));});

function initialActive(domain,line){const out=[];outer:for(let i=0;i<domain.length;i++){const p=domain[i];for(let k=0;k<n;k++)if(line[k]&&line[k]!==p[k])continue outer;out.push(i);}return out;}
function digitSupport(domain,active,pos){let mask=0;for(const idx of active)mask|=1<<(domain[idx][pos]-1);return mask;}
function filterLine(domain,active,allowedAtPos){const next=[];outer:for(const idx of active){const p=domain[idx];for(let k=0;k<n;k++)if(!(allowedAtPos[k]&(1<<(p[k]-1))))continue outer;next.push(idx);}return next;}
function cloneState(s){return{rows:s.rows.map(a=>a.slice()),cols:s.cols.map(a=>a.slice())};}
function propagate(state,stats){let changed=true;while(changed){changed=false;stats.propagationRounds++;
  const colSupport=Array.from({length:n},(_,c)=>Array.from({length:n},(_,r)=>digitSupport(colDomains[c],state.cols[c],r)));
  for(let r=0;r<n;r++){const allowed=Array.from({length:n},(_,c)=>colSupport[c][r]);const next=filterLine(rowDomains[r],state.rows[r],allowed);if(!next.length)return false;if(next.length!==state.rows[r].length){stats.domainPrunes+=state.rows[r].length-next.length;state.rows[r]=next;changed=true;}}
  const rowSupport=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>digitSupport(rowDomains[r],state.rows[r],c)));
  for(let c=0;c<n;c++){const allowed=Array.from({length:n},(_,r)=>rowSupport[r][c]);const next=filterLine(colDomains[c],state.cols[c],allowed);if(!next.length)return false;if(next.length!==state.cols[c].length){stats.domainPrunes+=state.cols[c].length-next.length;state.cols[c]=next;changed=true;}}
}return true;}
function countArc(source,limit=2){const state={rows:Array(n),cols:Array(n)};for(let r=0;r<n;r++)state.rows[r]=initialActive(rowDomains[r],source[r]);for(let c=0;c<n;c++)state.cols[c]=initialActive(colDomains[c],Array.from({length:n},(_,r)=>source[r][c]));const stats={nodes:0,branches:0,deadEnds:0,solutions:0,propagationRounds:0,domainPrunes:0,maxDepth:0};
  function visit(s,depth){stats.nodes++;stats.maxDepth=Math.max(stats.maxDepth,depth);if(stats.solutions>=limit)return;if(!propagate(s,stats)){stats.deadEnds++;return;}let axis=null,line=-1,best=Infinity;for(let r=0;r<n;r++){const k=s.rows[r].length;if(k>1&&k<best){axis='row';line=r;best=k;}}for(let c=0;c<n;c++){const k=s.cols[c].length;if(k>1&&k<best){axis='col';line=c;best=k;}}if(axis===null){stats.solutions++;return;}stats.branches++;const choices=(axis==='row'?s.rows[line]:s.cols[line]).slice();for(const choice of choices){const child=cloneState(s);if(axis==='row')child.rows[line]=[choice];else child.cols[line]=[choice];visit(child,depth+1);if(stats.solutions>=limit)return;}}
  const t0=performance.now();visit(state,0);return{count:stats.solutions,ms:performance.now()-t0,stats};}

function densify(source,target){const g=source.map(r=>r.slice());const empties=[];for(let i=0;i<n*n;i++){const r=Math.floor(i/n),c=i%n;if(!g[r][c])empties.push(i);}for(const idx of empties){if(g.flat().filter(Boolean).length>=target)break;const r=Math.floor(idx/n),c=idx%n;g[r][c]=out.solution[r][c];}return g;}

for(const target of [16,15,13,11]){const puzzle=target===11?out.puzzle:densify(out.puzzle,target);console.log('ARC:CASE_START target='+target);const a=countArc(puzzle,2);console.log('ARC:CASE_RESULT '+JSON.stringify({target,actual:puzzle.flat().filter(Boolean).length,count:a.count,ms:+a.ms.toFixed(1),...a.stats}));if(target===16){const l0=performance.now();const legacy=globalThis.SkyscraperParksHybridRuntime.legacyCount(puzzle,out,2,false);console.log('ARC:LEGACY_16 '+JSON.stringify({count:legacy,ms:+(performance.now()-l0).toFixed(1),match:legacy===a.count}));if(legacy!==a.count)process.exitCode=1;}}
console.log('SKYSCRAPER_PARKS_ARC_PROPAGATION_PROBE:PASS');