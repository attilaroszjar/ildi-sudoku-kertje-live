'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');

function classList(initial){
  const set=new Set(initial||[]);
  return {
    contains:x=>set.has(x),
    add:x=>set.add(x),
    remove:x=>set.delete(x),
    toggle(x,on){
      if(on===undefined){if(set.has(x))set.delete(x);else set.add(x);}
      else if(on)set.add(x);else set.delete(x);
    }
  };
}

function event(target){
  return {
    target,
    prevented:false,
    stopped:false,
    preventDefault(){this.prevented=true;},
    stopImmediatePropagation(){this.stopped=true;}
  };
}

test('solved games reject board and tool mutations while outer controls remain available',()=>{
  const listeners={};
  const boardChild={};
  const toolChild={};
  const outside={};
  const stage={
    classList:classList(),
    contains:x=>x===boardChild
  };
  const tools={contains:x=>x===toolChild};

  const document={
    readyState:'complete',
    getElementById(id){
      if(id==='game-stage')return stage;
      if(id==='game-tools')return tools;
      return null;
    },
    querySelector(){return null;},
    querySelectorAll(){return [];},
    addEventListener(type,fn,capture){
      (listeners[type]||(listeners[type]=[])).push({fn,capture});
    }
  };

  const context={
    window:null,
    document,
    globalThis:null,
    setTimeout(fn){fn();return 1;},
    requestAnimationFrame(fn){fn();return 1;},
    addEventListener(){}
  };
  context.window=context;
  context.globalThis=context;
  vm.createContext(context);

  vm.runInContext(
    fs.readFileSync(path.join(root,'games/ildi-feedback-runtime-hardening.js'),'utf8'),
    context,
    {filename:'ildi-feedback-runtime-hardening.js'}
  );

  for(const type of ['click','contextmenu','keydown','beforeinput','input','change']){
    assert.ok(listeners[type]?.some(x=>x.capture===true),`${type} must be guarded in capture phase`);
  }

  const guard=context.IldiFeedbackHardening.blockSolvedInteraction;
  assert.equal(typeof guard,'function');

  let e=event(boardChild);
  assert.equal(guard(e),false);
  assert.equal(e.prevented,false);
  assert.equal(e.stopped,false);

  stage.classList.add('is-solved');

  e=event(boardChild);
  assert.equal(guard(e),true);
  assert.equal(e.prevented,true);
  assert.equal(e.stopped,true);

  e=event(toolChild);
  assert.equal(guard(e),true);
  assert.equal(e.prevented,true);
  assert.equal(e.stopped,true);

  e=event(outside);
  assert.equal(guard(e),false);
  assert.equal(e.prevented,false);
  assert.equal(e.stopped,false);
});
