(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var S=root.ClassicHumanSolver;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!S&&typeof require==='function')S=require('./solver.js');

  var DIRECT=[S.findFullHouse,S.findNakedSingle,S.findHiddenSingle];

  function cloneState(state){
    var copy=Object.create(S.ClassicHumanState.prototype);
    copy.grid=state.cloneGrid();
    copy.masks=new Uint16Array(state.masks);
    copy.valid=state.valid;
    copy.steps=state.steps.slice();
    return copy;
  }

  function validateMaxSteps(value){
    var max=value==null?24:value;
    if(!Number.isInteger(max)||max<0||max>32)throw new RangeError('forcing maxSteps must be 0..32');
    return max;
  }

  function directNext(state){
    var all=[];
    for(var i=0;i<DIRECT.length;i++){
      var found=DIRECT[i](state);
      for(var j=0;j<found.length;j++)all.push(found[j]);
    }
    if(!all.length)return null;
    all.sort(C.compareDeductions);
    return all[0];
  }

  function runBranch(state,assumption,options){
    options=options||{};
    var maxSteps=validateMaxSteps(options.maxSteps),branch=cloneState(state);
    if(!assumption||!Number.isInteger(assumption.cell)||assumption.cell<0||assumption.cell>=81||!Number.isInteger(assumption.digit)||assumption.digit<1||assumption.digit>9||(assumption.value!==true&&assumption.value!==false))throw new TypeError('forcing assumption requires {cell,digit,value:boolean}');
    var bit=C.bitForDigit(assumption.digit);
    if(!(branch.masks[assumption.cell]&bit))return Object.freeze({status:'CONTRADICTION',reason:'candidate-absent',steps:Object.freeze([]),state:branch});
    if(assumption.value){if(!branch.place(assumption.cell,assumption.digit))return Object.freeze({status:'CONTRADICTION',reason:'assumption',steps:Object.freeze([]),state:branch});}
    else {if(!branch.eliminate(assumption.cell,assumption.digit))return Object.freeze({status:'CONTRADICTION',reason:'assumption',steps:Object.freeze([]),state:branch});}
    var applied=[];
    for(var step=0;step<maxSteps&&branch.valid;step++){
      var d=directNext(branch);if(!d)break;
      if(!branch.apply(d))break;
      applied.push(d);
    }
    return Object.freeze({status:branch.valid?'STABLE':'CONTRADICTION',reason:branch.valid?null:'propagation',steps:Object.freeze(applied),state:branch});
  }

  function consequences(base,result){
    if(result.status==='CONTRADICTION')return {placements:[],eliminations:[]};
    var placements=[],eliminations=[];
    for(var cell=0;cell<81;cell++){
      var rc=C.rowCol(cell),before=base.grid[rc[0]][rc[1]],after=result.state.grid[rc[0]][rc[1]];
      if(!before&&after)placements.push({cell:cell,digit:after});
      var removed=base.masks[cell]&~result.state.masks[cell];
      for(var d=1;d<=9;d++)if(removed&C.bitForDigit(d))eliminations.push({cell:cell,digit:d});
    }
    return {placements:placements,eliminations:eliminations};
  }

  function actionKey(a){return a.cell+':'+a.digit;}
  function intersectActions(a,b){
    var right=new Set(b.map(actionKey));
    return a.filter(function(x){return right.has(actionKey(x));});
  }

  function analyzeBinaryAssumption(state,cell,digit,options){
    var on=runBranch(state,{cell:cell,digit:digit,value:true},options);
    var off=runBranch(state,{cell:cell,digit:digit,value:false},options);
    if(on.status==='CONTRADICTION'&&off.status==='CONTRADICTION')return Object.freeze({status:'INCONSISTENT',on:on,off:off,placements:Object.freeze([]),eliminations:Object.freeze([])});
    if(on.status==='CONTRADICTION')return Object.freeze({status:'FORCED_FALSE',on:on,off:off,placements:Object.freeze([]),eliminations:Object.freeze([{cell:cell,digit:digit}])});
    if(off.status==='CONTRADICTION')return Object.freeze({status:'FORCED_TRUE',on:on,off:off,placements:Object.freeze([{cell:cell,digit:digit}]),eliminations:Object.freeze([])});
    var ca=consequences(state,on),cb=consequences(state,off);
    var placements=intersectActions(ca.placements,cb.placements).filter(function(x){return !(x.cell===cell&&x.digit===digit);});
    var eliminations=intersectActions(ca.eliminations,cb.eliminations).filter(function(x){return !(x.cell===cell&&x.digit===digit);});
    return Object.freeze({status:placements.length||eliminations.length?'COMMON_CONSEQUENCE':'NONE',on:on,off:off,placements:Object.freeze(placements),eliminations:Object.freeze(eliminations)});
  }

  var api={cloneState:cloneState,runBranch:runBranch,analyzeBinaryAssumption:analyzeBinaryAssumption};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanForcing=api;
})(typeof globalThis!=='undefined'?globalThis:this);
