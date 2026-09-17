import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../assets/core.js',import.meta.url),'utf8');

function option(value,text){return {value,textContent:text,setAttribute(name,next){if(name==='value')this.value=String(next);}};}
function makeSelect(value,options){
  const listeners=new Map();
  return {
    value,options:options.slice(),replaceCount:0,_observer:null,
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
    replaceChildren(...next){this.options=next.slice();this.value=next.length?next[0].value:'';this.replaceCount+=1;if(this._observer)Promise.resolve().then(()=>this._observer());},
    appendChild(node){const i=this.options.indexOf(node);if(i!==-1)this.options.splice(i,1);this.options.push(node);return node;}
  };
}

async function flush(times=8){for(let i=0;i<times;i+=1)await Promise.resolve();}

test('variant sorting reaches quiescence under MutationObserver feedback',async()=>{
  const family=makeSelect('lines',[option('','All'),option('lines','Lines')]);
  const variants=makeSelect('r',[option('z','Zipper'),option('a','Arrow'),option('r','Renban')]);
  const document={
    readyState:'loading',
    addEventListener(){},
    getElementById(id){if(id==='category-select')return family;if(id==='variant-select')return variants;return null;},
    querySelectorAll(){return[];},
    createElement(tag){return tag==='option'?option('',''):{setAttribute(){},appendChild(){}};}
  };
  let observerCallback=null;
  class MutationObserver{
    constructor(cb){observerCallback=cb;}
    observe(target){target._observer=()=>observerCallback();}
  }
  const window={SudokuLibraryState:{currentCategory:'lines'},SudokuI18n:{lang:'en'}};
  vm.runInNewContext(source,{window,document,Math,Promise,MutationObserver});

  assert.ok(observerCallback,'navigation observer installed');
  observerCallback();
  await flush();

  assert.deepEqual(Array.from(variants.options,o=>o.textContent),['Arrow','Renban','Zipper']);
  assert.equal(variants.replaceCount,1,'sorting mutates the DOM exactly once');
  await flush();
  assert.equal(variants.replaceCount,1,'observer feedback causes no further mutation');
});
