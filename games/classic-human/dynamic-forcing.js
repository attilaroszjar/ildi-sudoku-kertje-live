(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var S=root.ClassicHumanSolver;
  var F=root.ClassicHumanForcing;
  var FC=root.ClassicHumanForcingChain;
  var FN=root.ClassicHumanForcingNet;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!S&&typeof require==='function')S=require('./solver.js');
  if(!F&&typeof require==='function')F=require('./forcing.js');
  if(!FC&&typeof require==='function')FC=require('./forcing-chain.js');
  if(!FN&&typeof require==='function')FN=require('./forcing-net.js');

  var DIRECT=[S.findFullHouse,S.findNakedSingle,S.findHiddenSingle];

  function intOption(value,fallback,min,max,name){
    var n=value==null?fallback:value;
    if(!Number.isInteger(n)||n<min||n>max)throw new RangeError(name+' must be '+min+'..'+max);
    return n;
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

  function nestedNext(state,options){
    var all=[];
    var chain=FC.findForcingChain(state,{candidateBudget:options.candidateBudget,maxSteps:options.innerSteps});
    var net=FN.findForcingNet(state,{seedBudget:options.seedBudget,maxSteps:options.innerSteps});
    for(var i=0;i<chain.length;i++)all.push(chain[i]);
    for(i=0;i<net.length;i++)all.push(net[i]);
    if(!all.length)return null;
    all.sort(C.compareDeductions);
    return all[0];
  }

  function validateAssumption(branch,assumption){
    if(!assumption||!Number.isInteger(assumption.cell)||assumption.cell<0||assumption.cell>=81||!Number.isInteger(assumption.digit)||assumption.digit<1||assumption.digit>9||(assumption.value!==true&&assumption.value!==false))throw new TypeError('dynamic forcing assumption requires {cell,digit,value:boolean}');
    var bit=C.bitForDigit(assumption.digit);
    if(!(branch.masks[assumption.cell]&bit))return false;
    return assumption.value?branch.place(assumption.cell,assumption.digit):branch.eliminate(assumption.cell,assumption.digit);
  }

  function runDynamicBranch(state,assumption,options){
    options=options||{};
    var directBudget=intOption(options.directSteps,24,0,32,'dynamic directSteps');
    var nestedBudget=intOption(options.nestedSteps,3,0,6,'dynamic nestedSteps');
    var candidateBudget=intOption(options.candidateBudget,6,1,12,'dynamic candidateBudget');
    var seedBudget=intOption(options.seedBudget,3,1,6,'dynamic seedBudget');
    var innerSteps=intOption(options.innerSteps,12,0,24,'dynamic innerSteps');
    var branch=F.cloneState(state),steps=[],directUsed=0,nestedUsed=0;
    if(!validateAssumption(branch,assumption))return Object.freeze({status:'CONTRADICTION',reason:'assumption',steps:Object.freeze([]),directUsed:0,nestedUsed:0,state:branch});

    while(branch.valid){
      var progressed=false;
      while(directUsed<directBudget&&branch.valid){
        var d=directNext(branch);if(!d)break;
        if(!branch.apply(d))break;
        steps.push(d);directUsed++;progressed=true;
      }
      if(!branch.valid)break;
      if(nestedUsed>=nestedBudget)break;
      var n=nestedNext(branch,{candidateBudget:candidateBudget,seedBudget:seedBudget,innerSteps:innerSteps});
      if(!n)break;
      if(!branch.apply(n))break;
      steps.push(n);nestedUsed++;progressed=true;
      if(!progressed)break;
    }
    return Object.freeze({status:branch.valid?'STABLE':'CONTRADICTION',reason:branch.valid?null:'propagation',steps:Object.freeze(steps),directUsed:directUsed,nestedUsed:nestedUsed,state:branch});
  }

  function actionKey(a){return a.cell+':'+a.digit;}
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
  function intersect(a,b){var right=new Set(b.map(actionKey));return a.filter(function(x){return right.has(actionKey(x));});}

  function analyzeDynamicBinary(state,cell,digit,options){
    var on=runDynamicBranch(state,{cell:cell,digit:digit,value:true},options);
    var off=runDynamicBranch(state,{cell:cell,digit:digit,value:false},options);
    if(on.status==='CONTRADICTION'&&off.status==='CONTRADICTION')return Object.freeze({status:'INCONSISTENT',on:on,off:off,placements:Object.freeze([]),eliminations:Object.freeze([])});
    if(on.status==='CONTRADICTION')return Object.freeze({status:'FORCED_FALSE',on:on,off:off,placements:Object.freeze([]),eliminations:Object.freeze([{cell:cell,digit:digit}])});
    if(off.status==='CONTRADICTION')return Object.freeze({status:'FORCED_TRUE',on:on,off:off,placements:Object.freeze([{cell:cell,digit:digit}]),eliminations:Object.freeze([])});
    var ca=consequences(state,on),cb=consequences(state,off);
    var placements=intersect(ca.placements,cb.placements).filter(function(x){return !(x.cell===cell&&x.digit===digit);});
    var eliminations=intersect(ca.eliminations,cb.eliminations).filter(function(x){return !(x.cell===cell&&x.digit===digit);});
    return Object.freeze({status:placements.length||eliminations.length?'COMMON_CONSEQUENCE':'NONE',on:on,off:off,placements:Object.freeze(placements),eliminations:Object.freeze(eliminations)});
  }

  var api={runDynamicBranch:runDynamicBranch,analyzeDynamicBinary:analyzeDynamicBinary};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanDynamicForcing=api;
})(typeof globalThis!=='undefined'?globalThis:this);
