import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../assets/core.js',import.meta.url),'utf8');

function option(value,text=value){
  return {
    value,
    textContent:text,
    setAttribute(name,next){
      if(name==='value')this.value=String(next);
      else this[name]=String(next);
    }
  };
}

function makeSelect(value,options){
  const listeners=new Map();
  return {
    value,
    options:options.slice(),
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
    dispatch(type){for(const fn of listeners.get(type)||[])fn({type,target:this});},
    replaceChildren(...next){this.options=next.slice();this.value=next.length?next[0].value:'';},
    appendChild(node){const i=this.options.indexOf(node);if(i!==-1)this.options.splice(i,1);this.options.push(node);if(!this.value&&this.options.length===1)this.value=node.value;return node;}
  };
}

function boot({category='lines',variant='alpha',bank=[]}={}){
  const family=makeSelect(category,[option('','All'),option('classics','Classics'),option('lines','Lines'),option('structural','Structural')]);
  const variants=makeSelect(variant,[option('zeta','Zeta'),option('alpha','Alpha')]);
  const count={textContent:''};
  const buttons=['','classics','lines','structural'].map(fam=>({
    fam,
    active:false,
    getAttribute(name){return name==='data-family'?this.fam:null;},
    classList:{toggle(_name,on){this.owner.active=!!on;},owner:null}
  }));
  buttons.forEach(b=>{b.classList.owner=b;});
  const document={
    readyState:'complete',
    getElementById(id){if(id==='category-select')return family;if(id==='variant-select')return variants;if(id==='variant-count')return count;return null;},
    querySelectorAll(sel){return sel==='#category-list .category-button'?buttons:[];},
    createElement(tag){return tag==='option'?option('',''):{addEventListener(){},setAttribute(){},appendChild(){},querySelectorAll(){return[];}};}
  };
  const window={
    SudokuLibraryState:{currentCategory:category},
    SudokuBank:bank,
    SudokuI18n:{lang:'en',variant(v){return {title:v.title};},t(k){return k==='variantCount'?'variants':k;}}
  };
  vm.runInNewContext(source,{window,document,Math,Promise});
  return {family,variants,count,buttons,window};
}

async function flush(){await Promise.resolve();await Promise.resolve();}

test('selected category survives the same replace-then-append rebuild used by remounts',()=>{
  const {family,window}=boot({category:'lines'});
  family.replaceChildren(option('','All'));
  family.appendChild(option('classics','Classics'));
  family.appendChild(option('lines','Lines'));
  family.appendChild(option('structural','Structural'));
  assert.equal(family.value,'lines');
  assert.equal(window.SudokuLibraryState.currentCategory,'lines');
});

test('choosing a game from All categories switches to that games category without dispatching a second game selection',async()=>{
  const bank=[
    {id:'classic',title:'Classic',family:'Core'},
    {id:'whispers',title:'German Whispers',family:'Lines'},
    {id:'renban',title:'Renban',family:'Lines'}
  ];
  const {family,variants,count,buttons,window}=boot({category:'',variant:'whispers',bank});
  variants.options=[option('classic','Classic'),option('whispers','German Whispers'),option('renban','Renban')];
  variants.value='whispers';
  variants.dispatch('change');
  await flush();
  assert.equal(family.value,'lines');
  assert.equal(window.SudokuLibraryState.currentCategory,'lines');
  assert.equal(variants.value,'whispers');
  assert.deepEqual(Array.from(variants.options,o=>o.value),['whispers','renban']);
  assert.equal(count.textContent,'2 variants');
  assert.equal(buttons.find(b=>b.fam==='lines').active,true);
});

test('variant options are alphabetically ordered inside categories and All categories',async()=>{
  const {family,variants}=boot({category:'lines'});
  variants.options=[option('z','Zipper'),option('a','Arrow'),option('r','Renban'),option('b','Between Lines')];
  variants.value='r';
  family.dispatch('change');
  await flush();
  assert.deepEqual(Array.from(variants.options,o=>o.textContent),['Arrow','Between Lines','Renban','Zipper']);
  assert.equal(variants.value,'r');

  family.value='';
  variants.options=[option('s','Sukaku'),option('c','Classic'),option('a','Arrow')];
  variants.value='s';
  family.dispatch('change');
  await flush();
  assert.deepEqual(Array.from(variants.options,o=>o.textContent),['Arrow','Classic','Sukaku']);
  assert.equal(variants.value,'s');
});
