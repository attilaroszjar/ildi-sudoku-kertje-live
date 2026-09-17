'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/region-sum-segments.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/region-sum-runtime-hardening.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/little-killer-layout-final-hardening.js'),'utf8'),ctx);
const layout=ctx.LittleKillerRenderHardening.layout;
const decode=ctx.LittleKillerRenderHardening.decodeRawPosition;
function near(a,b,eps=1e-9){assert.ok(Math.abs(a-b)<=eps,`expected ${a} ~= ${b}`);}
function assertTips(out,expected){assert.equal(out.length,expected.length);for(let i=0;i<out.length;i++){near(out[i].tipX,expected[i][0]);near(out[i].tipY,expected[i][1]);}}

test('Little Killer arrow tips land exactly on the border endpoint of the indicated diagonal',()=>{
  const clues=[{sum:20,cells:[[8,3],[7,4],[6,5]]},{sum:31,cells:[[8,4],[7,3],[6,2]]},{sum:38,cells:[[0,5],[1,4],[2,3]]},{sum:26,cells:[[4,0],[5,1],[6,2]]},{sum:29,cells:[[3,8],[4,7],[5,6]]}];
  const out=layout(clues,9,540);assert.equal(out.length,5);
  assert.deepEqual(Array.from(out,p=>[p.side,p.arrow]),[['bottom','↗'],['bottom','↖'],['top','↙'],['left','↘'],['right','↙']]);
  assertTips(out,[[180,540],[300,540],[360,0],[0,240],[540,180]]);
  for(const p of out){assert.ok(p.x<0||p.x>540||p.y<0||p.y>540,'sum label stays outside the board');assert.ok(p.lineX<0||p.lineX>540||p.lineY<0||p.lineY>540,'leader starts outside the board');}
});

test('two clues converging on one border corner keep the same exact arrow tip but split their outer leaders',()=>{
  const clues=[{sum:20,cells:[[0,4],[1,5],[2,6]]},{sum:21,cells:[[0,3],[1,2],[2,1]]}];
  const out=layout(clues,9,540);assert.equal(out.length,2);assertTips(out,[[240,0],[240,0]]);assert.notEqual(out[0].lineX,out[1].lineX);assert.notEqual(out[0].x,out[1].x);
});

test('crowded same-side sums are separated without moving their exact arrow tips',()=>{
  const clues=[
    {sum:28,cells:[[8,5],[7,4],[6,3]]},
    {sum:15,cells:[[8,5],[7,6],[6,7]]},
    {sum:13,cells:[[8,6],[7,5],[6,4]]},
    {sum:25,cells:[[8,6],[7,7],[6,8]]}
  ];
  const out=layout(clues,9,600),bottom=out.filter(p=>p.side==='bottom').sort((a,b)=>a.x-b.x);
  assert.equal(bottom.length,4);
  for(let i=1;i<bottom.length;i++)assert.ok(bottom[i].x-bottom[i-1].x>=24,`labels ${i-1}/${i} overlap: ${bottom[i-1].x}, ${bottom[i].x}`);
  assertTips(out,[[400,600],[1000/3,600],[1400/3,600],[400,600]]);
});

test('raw renderer percentages reconstruct the actual generated entry cell and direction',()=>{const n=9,r=0,c=5,dr=1,dc=-1,left=((c+.5-dc*.92)*100/n)+'%',top=((r+.5-dr*.92)*100/n)+'%';const got=decode(left,top,'↙',n);assert.deepEqual(JSON.parse(JSON.stringify(got)),{entryR:0,entryC:5,dr:1,dc:-1,side:'top'});});

test('Little Killer hardening renders SVG leaders with arrowheads and keeps sums separate from geometry',()=>{const src=fs.readFileSync(path.join(root,'games/little-killer-layout-final-hardening.js'),'utf8');assert.match(src,/tipX/);assert.match(src,/tipY/);assert.match(src,/separateSideLabels/);assert.match(src,/ensureVectorLayer/);assert.match(src,/syncVectors/);assert.match(src,/marker-end/);assert.match(src,/lk-vector-arrowhead/);assert.match(src,/replaceChildren\(sumNode\)/);assert.match(src,/setIfChanged\(sumNode,'textContent',String\(p\.sum\)\)/);assert.doesNotMatch(src,/currentVariant/);assert.doesNotMatch(src,/SudokuBank/);assert.doesNotMatch(src,/new ResizeObserver/);});
