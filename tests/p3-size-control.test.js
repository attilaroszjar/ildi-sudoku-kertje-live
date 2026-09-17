'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');

function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}

test('P3 uses one shared board-size selector instead of one control per game',()=>{
  const index=read('index.html');
  const shared=read('games/p3-size-control.js');

  assert.ok(index.includes('assets/p3-size-control.css'),'shared size-control stylesheet must be wired');
  assert.ok(index.includes('games/p3-size-control.js'),'shared size-control runtime must be wired');
  assert.ok(shared.includes("select.id='size-select'"),'canonical selector id');
  assert.ok(shared.includes("document.querySelectorAll('.size-field')"),'legacy per-game controls are removed');
  assert.ok(shared.includes('root.IldiP3SizeSupport'),'supported sizes come from one registry');
});

test('shared size selector has a stable desktop and mobile layout contract',()=>{
  const css=read('assets/p3-size-control.css');
  assert.ok(css.includes('.p3-size-field{min-width:96px;max-width:116px;flex:0 0 104px}'));
  assert.ok(css.includes('@media(max-width:820px)'));
  assert.ok(css.includes('@media(max-width:560px)'));
});

test('completed P3 games still register their supported sizes',()=>{
  const files=[
    ['games/p3-star-battle-complete.js',"root.IldiP3SizeSupport['star-battle']"],
    ['games/p3-galaxies-complete.js',"root.IldiP3SizeSupport['tentai-show']"],
    ['games/p3-hitori-complete.js','root.IldiP3SizeSupport.hitori'],
    ['games/p3-futoshiki-complete.js','root.IldiP3SizeSupport.futoshiki']
  ];

  for(const [file,needle] of files){
    assert.ok(read(file).includes(needle),`${file} must register supported sizes`);
  }
});
