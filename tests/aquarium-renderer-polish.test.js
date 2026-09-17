'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const library=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

function mountShadeSource(){
  const start=library.indexOf('function mountShadePuzzle('),end=library.indexOf('function mountGalaxies(',start);
  assert.ok(start>=0&&end>start,'shared shade renderer source must exist');
  return library.slice(start,end);
}

test('Aquarium renderer exposes clear and check controls through shared shade renderer',()=>{
  const src=mountShadeSource();
  assert.match(library,/v\.kind==='aquarium'\)return mountShadePuzzle\(host,v,api,'aquarium'\)/,'Aquarium must route through shared shade renderer');
  assert.match(src,/className:'sudoku-tools '\+type\+'-tools'/,'shared shade tool group must be type-scoped');
  assert.match(src,/className:'tool-button clear-'\+type\+'-button'/,'shared shade renderer must expose a type-scoped clear control');
  assert.match(src,/className:'tool-button check-button check-'\+type\+'-button'/,'shared shade renderer must expose a type-scoped check control');
});

test('Aquarium renderer exposes localized water state semantics',()=>{
  assert.match(library,/aquariumStateLabel/,'localized Aquarium cell state helper');
  assert.match(library,/aria-pressed/,'binary water state semantics');
  assert.match(library,/víz|water/,'localized water state copy');
});

test('Aquarium language refresh updates rendered accessibility state in place',()=>{
  assert.match(library,/refreshLanguage:function\(\)\{language\(\);render\(\);\}/,'in-place Aquarium language refresh');
});
