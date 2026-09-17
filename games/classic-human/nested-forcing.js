(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var S=root.ClassicHumanSolver;
  var F=root.ClassicHumanForcing;
  var DF=root.ClassicHumanDynamicForcingChain;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!S&&typeof require==='function')S=require('./solver.js');
  if(!F&&typeof require==='function')F=require('./forcing.js');
  if(!DF&&typeof require==='function')DF=require('./dynamic-forcing-chain.js');

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
  function validateAssumption(branch,assumption){
    if(!assumption||!Number.isInteger(assumption.cell)||assumption.cell<0||assumption.cell>=81||!Number.isInteger(assumption.digit)||assumption.digit<1||assumption.digit>9||(assumption.value!==true&&assumption.value!==false))throw new TypeError('nested forcing assumption requires {cell,digit,value:boolean}');
    var bit=C.bitForDigit(assumption.digit);
    if(!(branch.masks[assumption.cell]&bit))return false;
    return assumption.value?branch.place(assumption.cell,assumption.digit):branch.eliminate(assumption.cell,assumption.digit);
  }
  function consumeWork(work){
    if(work.used>=work.limit)return false;
    work.used++;
    return true;
  }
  function runNestedBranch(state,assumption,options,work){
    options=options||{};
    var directBudget=intOption(options.directSteps,24,0,32,'nested directSteps');
    var nestedBudget=intOption(options.nestedSteps,2,0,2,'nested nestedSteps');
    var dynamicCandidateBudget=intOption(options.dynamicCandidateBudget,4,1,8,'nested dynamicCandidateBudget');
    var dynamicNestedSteps=intOption(options.dynamicNestedSteps,2,0,4,'nested dynamicNestedSteps');
    var dynamicInnerSteps=intOption(options.dynamicInnerSteps,8,0,16,'nested dynamicInnerSteps');
    work=work||{used:0,limit:intOption(options.workBudget,6,1,12,'nested workBudget')};
    var branch=F.cloneState(state),steps=[],directUsed=0,nestedUsed=0;
    if(!validateAssumption(branch,assumption))return Object.freeze({status:'CONTRADICTION',reason:'assumption',steps:Object.freeze([]),directUsed:0,nestedUsed:0,workUsed:work.used,state:branch});
    while(branch.valid){
      while(directUsed<directBudget&&branch.valid){
        var d=directNext(branch);if(!d)break;
        if(!branch.apply(d))break;
        steps.push(d);directUsed++;
      }
      if(!branch.valid||nestedUsed>=nestedBudget||work.used>=work.limit)break;
      if(!consumeWork(work))break;
      var found=DF.findDynamicForcingChain(branch,{
        candidateBudget:dynamicCandidateBudget,
        nestedSteps:dynamicNestedSteps,
        innerCandidateBudget:Math.min(dynamicCandidateBudget,4),
        innerSeedBudget:2,
        innerSteps:dynamicInnerSteps,
        directSteps:Math.min(directBudget,24)
      });
      if(!found.length)break;
      if(!branch.apply(found[0]))break;
      steps.push(found[0]);nestedUsed++;
    }
    return Object.freeze({status:branch.valid?'STABLE':'CONTRADICTION',reason:branch.valid?null:'propagation',steps:Object.freeze(steps),directUsed:directUsed,nestedUsed:nestedUsed,workUsed:work.used,state:branch});
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
  function analyzeNestedBinary(state,cell,digit,options){
    options=options||{};
    var work={used:0,limit:intOption(options.workBudget,6,1,12,'nested workBudget')};
    var on=runNestedBranch(state,{cell:cell,digit:digit,value:true},options,work);
    var off=runNestedBranch(state,{cell:cell,digit:digit,value:false},options,work);
    if(on.status==='CONTRADICTION'&&off.status==='CONTRADICTION')return Object.freeze({status:'INCONSISTENT',on:on,off:off,workUsed:work.used,placements:Object.freeze([]),eliminations:Object.freeze([])});
    if(on.status==='CONTRADICTION')return Object.freeze({status:'FORCED_FALSE',on:on,off:off,workUsed:work.used,placements:Object.freeze([]),eliminations:Object.freeze([{cell:cell,digit:digit}])});
    if(off.status==='CONTRADICTION')return Object.freeze({status:'FORCED_TRUE',on:on,off:off,workUsed:work.used,placements:Object.freeze([{cell:cell,digit:digit}]),eliminations:Object.freeze([])});
    var ca=consequences(state,on),cb=consequences(state,off);
    var placements=intersect(ca.placements,cb.placements).filter(function(x){return !(x.cell===cell&&x.digit===digit);});
    var eliminations=intersect(ca.eliminations,cb.eliminations).filter(function(x){return !(x.cell===cell&&x.digit===digit);});
    return Object.freeze({status:placements.length||eliminations.length?'COMMON_CONSEQUENCE':'NONE',on:on,off:off,workUsed:work.used,placements:Object.freeze(placements),eliminations:Object.freeze(eliminations)});
  }

  var api={runNestedBranch:runNestedBranch,analyzeNestedBinary:analyzeNestedBinary};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanNestedForcing=api;
})(typeof globalThis!=='undefined'?globalThis:this);
