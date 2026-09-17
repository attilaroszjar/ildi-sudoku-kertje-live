'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');

function makeElement(extra={}){
  const listeners={};
  return Object.assign({
    value:'',
    hidden:false,
    dataset:{},
    classList:{
      add(){},
      remove(){}
    },
    addEventListener(type,fn){
      listeners[type]=fn;
    },
    dispatch(type){
      if(listeners[type]) listeners[type]({target:this});
    },
    scrollIntoView(){},
    listeners
  },extra);
}

test('development status filters execute in the browser runtime',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ildi-status-runtime-'));
  const out=path.join(dir,'status.html');

  const run=spawnSync(
    process.execPath,
    ['scripts/build-development-status.mjs',out],
    {cwd:root,encoding:'utf8'}
  );

  assert.equal(run.status,0,run.stderr||run.stdout);

  const html=fs.readFileSync(out,'utf8');
  const match=html.match(/<script>([\s\S]*?)<\/script><\/body><\/html>/);
  assert.ok(match,'inline status script not found');

  const q=makeElement();
  const generator=makeElement();
  const scope=makeElement();
  const base=makeElement();
  const work=makeElement();

  const rows=[
    makeElement({
      dataset:{
        generator:'CATEGORY_A',
        base:'READY',
        work:'OPEN',
        scope:'sudoku',
        search:'klasszikus sudoku'
      }
    }),
    makeElement({
      dataset:{
        generator:'N_A',
        base:'READY',
        work:'OPEN',
        scope:'japanese',
        search:'hitori'
      }
    }),
    makeElement({
      dataset:{
        generator:'N_A',
        base:'AUDITED',
        work:'NONE',
        scope:'other',
        search:'other game'
      }
    })
  ];

  let scrolled=false;
  const table=makeElement({
    scrollIntoView(){
      scrolled=true;
    }
  });

  const sudokuCard=makeElement({
    dataset:{
      filterScope:'sudoku',
      filterGenerator:'CATEGORY_A'
    }
  });

  const japaneseCard=makeElement({
    dataset:{
      filterScope:'japanese',
      filterWork:'OPEN'
    }
  });

  const cards=[sudokuCard,japaneseCard];

  const document={
    querySelector(selector){
      if(selector==='#q') return q;
      if(selector==='#generator') return generator;
      if(selector==='#scope') return scope;
      if(selector==='#base-status') return base;
      if(selector==='#work-status') return work;
      if(selector==='table') return table;
      throw new Error('unexpected querySelector: '+selector);
    },
    querySelectorAll(selector){
      if(selector==='tbody tr') return rows;
      if(selector==='.filter-card') return cards;
      throw new Error('unexpected querySelectorAll: '+selector);
    }
  };

  const context={
    document,
    console
  };

  vm.createContext(context);

  assert.doesNotThrow(
    ()=>vm.runInContext(match[1],context),
    'status runtime must initialize without ReferenceError'
  );

  scope.value='japanese';
  scope.dispatch('change');

  assert.equal(rows[0].hidden,true);
  assert.equal(rows[1].hidden,false);
  assert.equal(rows[2].hidden,true);

  scope.value='';
  work.value='OPEN';
  work.dispatch('change');

  assert.equal(rows[0].hidden,false);
  assert.equal(rows[1].hidden,false);
  assert.equal(rows[2].hidden,true);

  work.value='';
  japaneseCard.dispatch('click');

  assert.equal(scope.value,'japanese');
  assert.equal(work.value,'OPEN');
  assert.equal(rows[0].hidden,true);
  assert.equal(rows[1].hidden,false);
  assert.equal(rows[2].hidden,true);
  assert.equal(scrolled,true,'card click must scroll to the results table');

  scrolled=false;
  sudokuCard.dispatch('click');

  assert.equal(scope.value,'sudoku');
  assert.equal(generator.value,'CATEGORY_A');
  assert.equal(rows[0].hidden,false);
  assert.equal(rows[1].hidden,true);
  assert.equal(rows[2].hidden,true);
  assert.equal(scrolled,true);
});
