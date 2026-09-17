'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'..');

class FakeClassList{
  constructor(el){this.el=el;}
  _set(){return new Set(String(this.el.className||'').split(/\s+/).filter(Boolean));}
  _write(s){this.el.className=[...s].join(' ');}
  add(...xs){const s=this._set();xs.forEach(x=>s.add(x));this._write(s);}
  remove(...xs){const s=this._set();xs.forEach(x=>s.delete(x));this._write(s);}
  toggle(x,force){const s=this._set();const on=force===undefined?!s.has(x):!!force;if(on)s.add(x);else s.delete(x);this._write(s);return on;}
  contains(x){return this._set().has(x);}
}
class FakeStyle{setProperty(k,v){this[k]=String(v);}}
class FakeElement{
  constructor(tag){this.tagName=String(tag).toUpperCase();this.children=[];this.attributes={};this.dataset={};this.style=new FakeStyle();this.className='';this.textContent='';this.value='';this.listeners={};this.parentNode=null;this.classList=new FakeClassList(this);}
  appendChild(x){if(x==null)return x;this.children.push(x);x.parentNode=this;return x;}
  append(...xs){xs.forEach(x=>this.appendChild(x));}
  insertBefore(x,before){const i=this.children.indexOf(before);if(i<0)return this.appendChild(x);this.children.splice(i,0,x);x.parentNode=this;return x;}
  replaceChildren(...xs){this.children=[];xs.forEach(x=>this.appendChild(x));}
  removeChild(x){const i=this.children.indexOf(x);if(i>=0)this.children.splice(i,1);x.parentNode=null;return x;}
  get firstChild(){return this.children[0]||null;}
  setAttribute(k,v){this.attributes[k]=String(v);if(k==='class')this.className=String(v);if(k==='value')this.value=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}
  getAttribute(k){return this.attributes[k]??null;}
  addEventListener(type,fn){(this.listeners[type]||(this.listeners[type]=[])).push(fn);}
  dispatchEvent(e){(this.listeners[e.type]||[]).forEach(fn=>fn.call(this,e));return true;}
  focus(){}
  querySelector(sel){if(sel.startsWith('.')){const c=sel.slice(1);if(this.classList.contains(c))return this;}for(const ch of this.children){if(ch.querySelector){const hit=ch.querySelector(sel);if(hit)return hit;}}return null;}
  querySelectorAll(sel){const out=[];if(sel.startsWith('.')&&this.classList.contains(sel.slice(1)))out.push(this);for(const ch of this.children)if(ch.querySelectorAll)out.push(...ch.querySelectorAll(sel));return out;}
}

const ids=new Map();
const document={
  createElement:t=>new FakeElement(t),
  createElementNS:(_ns,t)=>new FakeElement(t),
  getElementById:id=>ids.get(id)||null,
  addEventListener:()=>{},
  dispatchEvent:()=>true,
  readyState:'complete'
};
for(const id of ['category-select','variant-select','variant-count','category-list'])ids.set(id,new FakeElement(id.includes('select')?'select':'div'));

const ctx={console,Map,Set,Math,JSON,Array,Object,Number,String,Boolean,Date,Uint8Array,WeakMap,document};
ctx.window=ctx;ctx.globalThis=ctx;ctx.localStorage={getItem:()=>null,setItem:()=>{}};
ctx.CustomEvent=class{constructor(type,init={}){this.type=type;this.detail=init.detail;}};
vm.createContext(ctx);

function run(file){vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});}
run('assets/core.js');
run('assets/i18n.js');

const gamesDir=path.join(root,'games');
const banks=fs.readdirSync(gamesDir).filter(x=>/^sudoku-bank(?:-iteration\d+)?\.js$/.test(x)).sort((a,b)=>{const n=x=>+(x.match(/iteration(\d+)/)||[,0])[1];return n(a)-n(b);});
for(const f of banks)run('games/'+f);
run('games/sudoku-generator.js');
run('games/region-sum-segments.js');

let src=fs.readFileSync(path.join(gamesDir,'sudoku-library.js'),'utf8');
const closeRe=/\}\(typeof window!==['"]undefined['"]\?window:globalThis\)\);\s*$/;
assert.ok(closeRe.test(src),'mount audit hook point');
src=src.replace(closeRe,"  root.__mountAudit={transform:transformedVariant,mountBoard:mountBoard,mountSamurai:mountSamurai};\n}(typeof window!=='undefined'?window:globalThis));\n");
vm.runInContext(src,ctx,{filename:'games/sudoku-library.js'});

const audit=ctx.__mountAudit,bank=ctx.SudokuBank,generator=ctx.SudokuGenerator;
const passMatch=src.match(/var v=\(([^;]+)\)\?generated:transformedVariant\(generated,turns\)/);
assert.ok(passMatch,'runtime passthrough expression');
const passExpr=passMatch[1];
const bypasses=kind=>passExpr.includes(`current.kind==='${kind}'`);

function api(){return{
  root:new FakeElement('div'),tools:new FakeElement('div'),seed:0x5eed,difficulty:'gentle',i18n:ctx.SudokuI18n,
  setStatus:()=>{},setCounter:()=>{},toast:()=>{},complete:()=>{},solved:()=>{}
};}

test('all 106 generated catalogue entries mount through their real renderer without throwing',()=>{
  assert.equal(bank.length,106);
  for(let i=0;i<bank.length;i++){
    const base=bank[i];
    const generated=generator.make(base,(0x600D+i*181)>>>0,'gentle');
    let v=generated;
    if(!bypasses(base.kind))v=audit.transform(generated,1);
    const a=api(),host=new FakeElement('div');
    let inst;
    assert.doesNotThrow(()=>{
      inst=v.kind==='samurai'?audit.mountSamurai(host,v,a):audit.mountBoard(host,v,a,{});
    },`mount ${base.id} (${base.kind})`);
    assert.ok(inst&&typeof inst.moves==='function',`mount contract for ${base.id}`);
    assert.ok(host.children.length>0,`renderer output for ${base.id}`);
  }
});


test('Samurai renderer mounts active cells with final and pencil-note interaction',()=>{
  const base=bank.find(v=>v.id==='samurai');
  assert.ok(base);
  const v=generator.make(base,424242,'focused');
  const a=api(),host=new FakeElement('div');
  const inst=audit.mountSamurai(host,v,a);
  const board=host.querySelector('.samurai-board');
  assert.ok(board,'Samurai board');

  const active=board.children.filter(x=>x.classList.contains('samurai-cell'));
  const gaps=board.children.filter(x=>x.classList.contains('samurai-gap'));
  assert.equal(active.length,369);
  assert.equal(active.length+gaps.length,441);

  const editable=active.find(x=>!x.classList.contains('fixed'));
  assert.ok(editable,'editable Samurai cell');
  editable.dispatchEvent({type:'click'});

  const tools=a.tools.querySelector('.samurai-tools');
  assert.ok(tools,'Samurai tools');

  const noteButton=tools.querySelector('.note-mode-button');
  const clearButton=tools.querySelector('.clear-button');
  assert.ok(noteButton,'Samurai note mode');
  assert.equal(noteButton.getAttribute('aria-pressed'),'false');

  noteButton.dispatchEvent({type:'click'});
  assert.equal(noteButton.getAttribute('aria-pressed'),'true');

  const digit1=tools.children.find(x=>x.textContent==='1');
  assert.ok(digit1,'digit tool');
  digit1.dispatchEvent({type:'click'});
  assert.ok(editable.querySelector('.sudoku-notes'),'pencil-note visual');
  assert.match(editable.getAttribute('aria-label'),/1/);
  assert.equal(inst.moves(),1);

  clearButton.dispatchEvent({type:'click'});
  assert.equal(editable.textContent,'');
  assert.equal(editable.querySelector('.sudoku-notes'),null);

  noteButton.dispatchEvent({type:'click'});
  assert.equal(noteButton.getAttribute('aria-pressed'),'false');

  board.dispatchEvent({
    type:'keydown',
    key:'2',
    shiftKey:true,
    preventDefault(){}
  });
  assert.ok(editable.querySelector('.sudoku-notes'),'Shift+digit pencil note');

  board.dispatchEvent({
    type:'keydown',
    key:'N',
    shiftKey:false,
    preventDefault(){}
  });
  assert.equal(noteButton.getAttribute('aria-pressed'),'true');

  clearButton.dispatchEvent({type:'click'});
  const digit3=tools.children.find(x=>x.textContent==='3');
  digit3.dispatchEvent({type:'click'});
  assert.ok(editable.querySelector('.sudoku-notes'),'note-mode digit remains a note');

  noteButton.dispatchEvent({type:'click'});
  clearButton.dispatchEvent({type:'click'});

  digit1.dispatchEvent({type:'click'});
  assert.equal(editable.textContent,'1','normal mode enters final value');
});


test('dedicated renderers refresh HU/EN text in place without losing puzzle state',()=>{
  const cases=[
    {kind:'starbattle'},
    {kind:'aquarium'},
    {kind:'rippleeffect',aria:true},
    {kind:'lits'},
    {kind:'battleships',fleet:true,seed:7158},
    {kind:'heyawake'}
  ];

  function makeOneMove(host,inst){
    const before=inst.moves();
    const cells=[
      ...host.querySelectorAll('.newlogic-cell'),
      ...host.querySelectorAll('.iteration52-cell')
    ];
    for(const cell of cells){
      cell.dispatchEvent({type:'click'});
      if(inst.moves()>before)return cell;
    }
    assert.fail('no editable cell found');
  }

  for(let i=0;i<cases.length;i++){
    const spec=cases[i];
    const base=bank.find(v=>v.kind===spec.kind);
    assert.ok(base,`catalogue kind ${spec.kind}`);

    ctx.SudokuI18n.set('hu');

    const seed=spec.seed==null?(0x1A11+i*97)>>>0:spec.seed;
    const v=generator.make(base,seed,'gentle');
    const a=api(),host=new FakeElement('div');
    const inst=audit.mountBoard(host,v,a,{});

    const hint=host.querySelector('.newlogic-hint');
    assert.ok(hint,`${spec.kind} hint`);

    const huHint=hint.textContent;
    const moved=makeOneMove(host,inst);
    const moves=inst.moves();
    const state={className:moved.className,textContent:moved.textContent};

    let huAria=null;
    if(spec.aria){
      const cell=host.querySelectorAll('.iteration51-cell')
        .find(x=>x.getAttribute('aria-label'));
      assert.ok(cell,'Ripple Effect labelled cell');
      huAria=cell.getAttribute('aria-label');
      assert.match(huAria,/Hullámhatás/);
    }

    let fleet=null;
    if(spec.fleet){
      fleet=host.querySelector('.newlogic-fleet');
      assert.ok(fleet,'Battleships fleet');
      assert.match(fleet.textContent,/^Flotta:/);
    }

    ctx.SudokuI18n.set('en');
    inst.refreshLanguage();

    assert.notEqual(hint.textContent,huHint,`${spec.kind} hint switches to English`);
    assert.equal(inst.moves(),moves,`${spec.kind} moves survive language switch`);
    assert.equal(moved.className,state.className,`${spec.kind} cell class survives language switch`);
    assert.equal(moved.textContent,state.textContent,`${spec.kind} cell value survives language switch`);

    if(spec.aria){
      const cell=host.querySelectorAll('.iteration51-cell')
        .find(x=>x.getAttribute('aria-label'));
      assert.match(cell.getAttribute('aria-label'),/Ripple Effect/);
      assert.notEqual(cell.getAttribute('aria-label'),huAria);
    }

    if(spec.fleet)assert.match(fleet.textContent,/^Fleet:/);

    const enHint=hint.textContent;
    ctx.SudokuI18n.set('hu');
    inst.refreshLanguage();

    assert.equal(hint.textContent,huHint,`${spec.kind} hint switches back to Hungarian`);
    assert.notEqual(hint.textContent,enHint);
    assert.equal(inst.moves(),moves,`${spec.kind} moves survive round trip`);

    if(spec.fleet)assert.match(fleet.textContent,/^Flotta:/);
  }
});
