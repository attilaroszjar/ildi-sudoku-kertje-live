(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var F=root.ClassicHumanForcing;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!F&&typeof require==='function')F=require('./forcing.js');

  function validateSeedBudget(value){
    var max=value==null?6:value;
    if(!Number.isInteger(max)||max<1||max>12)throw new RangeError('forcing-net seedBudget must be 1..12');
    return max;
  }

  function seedCells(state,options){
    options=options||{};
    var budget=validateSeedBudget(options.seedBudget),out=[];
    for(var cell=0;cell<81&&out.length<budget;cell++)if(C.bitCount(state.masks[cell])===3)out.push(cell);
    return out;
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
  function key(a){return a.cell+':'+a.digit;}
  function intersectMany(lists){
    if(!lists.length)return [];
    var current=lists[0].slice();
    for(var i=1;i<lists.length;i++){
      var keep=new Set(lists[i].map(key));
      current=current.filter(function(x){return keep.has(key(x));});
    }
    return current;
  }

  function analyzeSeed(state,cell,options){
    options=options||{};
    var digits=C.digitsFromMask(state.masks[cell]);
    if(digits.length!==3)throw new TypeError('forcing-net seed must be trivalue');
    var branches=digits.map(function(digit){return F.runBranch(state,{cell:cell,digit:digit,value:true},{maxSteps:options.maxSteps});});
    var stable=[],contradictions=[];
    for(var i=0;i<branches.length;i++)(branches[i].status==='CONTRADICTION'?contradictions:stable).push(i);
    if(!stable.length)return {status:'INCONSISTENT',digits:digits,branches:branches,placements:[],eliminations:[]};
    if(stable.length===1)return {status:'FORCED_VALUE',digits:digits,branches:branches,placements:[{cell:cell,digit:digits[stable[0]]}],eliminations:digits.filter(function(_,i){return i!==stable[0];}).map(function(d){return {cell:cell,digit:d};})};
    if(contradictions.length)return {status:'PARTIAL',digits:digits,branches:branches,placements:[],eliminations:contradictions.map(function(i){return {cell:cell,digit:digits[i]};})};
    var cs=stable.map(function(i){return consequences(state,branches[i]);});
    var placements=intersectMany(cs.map(function(x){return x.placements;})).filter(function(x){return x.cell!==cell;});
    var eliminations=intersectMany(cs.map(function(x){return x.eliminations;})).filter(function(x){return x.cell!==cell;});
    return {status:placements.length||eliminations.length?'COMMON_CONSEQUENCE':'NONE',digits:digits,branches:branches,placements:placements,eliminations:eliminations};
  }

  function findForcingNet(state,options){
    options=options||{};
    var seeds=options.seeds||seedCells(state,options),out=[];
    for(var i=0;i<seeds.length;i++){
      var cell=seeds[i],a=analyzeSeed(state,cell,options);
      if(a.status==='NONE'||a.status==='INCONSISTENT')continue;
      if(!a.placements.length&&!a.eliminations.length)continue;
      out.push(C.normalizeDeduction({
        techniqueId:'forcing-net',placements:a.placements,eliminations:a.eliminations,anchors:[cell],
        complexity:{branchCount:3,maxPropagationSteps:options.maxSteps==null?24:options.maxSteps,seedIndex:i+1},
        explanationData:{seedCell:cell,seedDigits:a.digits.slice(),result:a.status}
      }));
    }
    out.sort(C.compareDeductions);return out;
  }

  var api={seedCells:seedCells,analyzeSeed:analyzeSeed,findForcingNet:findForcingNet};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanForcingNet=api;
})(typeof globalThis!=='undefined'?globalThis:this);
