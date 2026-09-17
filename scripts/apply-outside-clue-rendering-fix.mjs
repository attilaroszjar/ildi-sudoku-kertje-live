import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const file=path.join(root,'games/sudoku-library.js');
let s=fs.readFileSync(file,'utf8');

const oldKinds="var perimeterKinds=['skyscraper','skyscrapersums','skyscraperproduct','skyscrapermixed','skyscrapernontouching','killerskyscrapers','skyscraperparks','sumskyscraperparks','skyscraperparks2','dominoskyscrapers','evenoddskyscrapers','doubleskyscrapers','sandwich'];";
const newKinds="var perimeterKinds=['skyscraper','skyscrapersums','skyscraperproduct','skyscrapermixed','skyscrapernontouching','killerskyscrapers','skyscraperparks','sumskyscraperparks','skyscraperparks2','dominoskyscrapers','evenoddskyscrapers','doubleskyscrapers','sandwich','xsums','frame','runningcells','ascendingsequences','numberedrooms','nexttonine','evensandwich','rossini'];";
if(!s.includes(oldKinds))throw new Error('Expected sandwich-hardened perimeterKinds anchor not found');
s=s.replace(oldKinds,newKinds);

const oldText="function perimeterClueText(cl){\n      if(kindIs(v,'sandwich'))return String(cl.sum);\n      if(kindIs(v,'skyscrapersums')||kindIs(v,'sumskyscraperparks'))return 'Σ'+cl.sum;";
const newText="function perimeterClueText(cl){\n      if(kindIs(v,'sandwich')||kindIs(v,'xsums')||kindIs(v,'frame'))return String(cl.sum);\n      if(kindIs(v,'runningcells')||kindIs(v,'ascendingsequences'))return String(cl.count);\n      if(kindIs(v,'numberedrooms'))return String(cl.digit);\n      if(kindIs(v,'nexttonine')||kindIs(v,'evensandwich'))return (cl.digits&&cl.digits.length)?cl.digits.join('·'):'–';\n      if(kindIs(v,'rossini'))return cl.dir==='inc'?'↗':'↘';\n      if(kindIs(v,'skyscrapersums')||kindIs(v,'sumskyscraperparks'))return 'Σ'+cl.sum;";
if(!s.includes(oldText))throw new Error('Expected sandwich perimeterClueText anchor not found');
s=s.replace(oldText,newText);

const oldMount="    var hasPerimeterClues=mountPerimeterClues();\n    if(kindIs(v,'diagonal')) board.classList.add('show-diagonals');";
const newMount="    var hasPerimeterClues=mountPerimeterClues();\n    function mountLittleKillerClues(){\n      if(!kindIs(v,'littlekiller')||!v.data.clues)return false;\n      shell.classList.add('has-littlekiller-clues');\n      v.data.clues.forEach(function(cl){\n        if(!cl.cells||cl.cells.length<2)return;\n        var a=cl.cells[0],b=cl.cells[1],dr=b[0]-a[0],dc=b[1]-a[1];\n        var arrows={'-1,-1':'↖','-1,1':'↗','1,-1':'↙','1,1':'↘'},arrow=arrows[dr+','+dc]||'↘';\n        var marker=LR.el('span',{className:'sudoku-littlekiller-clue',text:String(cl.sum)+arrow,'aria-hidden':'true'});\n        marker.style.left=((a[1]+.5-dc*.62)*100/n)+'%';\n        marker.style.top=((a[0]+.5-dr*.62)*100/n)+'%';\n        shell.appendChild(marker);\n      });\n      return true;\n    }\n    var hasLittleKillerClues=mountLittleKillerClues();\n    if(kindIs(v,'diagonal')) board.classList.add('show-diagonals');";
if(!s.includes(oldMount))throw new Error('Expected perimeter mount anchor not found');
s=s.replace(oldMount,newMount);

const oldStrip="if(!hasPerimeterClues&&v.data.clues&&['sandwich','littlekiller','xsums','rossini','frame','runningcells','ascendingsequences','numberedrooms','nexttonine','evensandwich'].some(function(k){return kindIs(v,k);}))";
const newStrip="if(!hasPerimeterClues&&!hasLittleKillerClues&&v.data.clues&&['sandwich','littlekiller','xsums','rossini','frame','runningcells','ascendingsequences','numberedrooms','nexttonine','evensandwich'].some(function(k){return kindIs(v,k);}))";
if(!s.includes(oldStrip))throw new Error('Expected outside clue strip anchor not found');
s=s.replace(oldStrip,newStrip);

fs.writeFileSync(file,s);

const cssFile=path.join(root,'assets/sudoku-mobile.css');
let css=fs.readFileSync(cssFile,'utf8');
const cssMarker='/* Outside-clue hardening: diagonal Little Killer clues belong beside the grid. */';
if(!css.includes(cssMarker)){
  css += `\n\n${cssMarker}\n.sudoku-board-shell.has-littlekiller-clues{margin:28px;overflow:visible}\n.sudoku-littlekiller-clue{position:absolute;z-index:9;transform:translate(-50%,-50%);white-space:nowrap;pointer-events:none;color:var(--accent-strong);font:800 clamp(10px,1.8vw,14px)/1 monospace;text-shadow:0 1px 0 var(--surface)}\n`;
  fs.writeFileSync(cssFile,css);
}

console.log('OUTSIDE_CLUE_RENDERING_FIX:APPLIED');
