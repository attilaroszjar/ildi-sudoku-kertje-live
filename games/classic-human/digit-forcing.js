(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var F=root.ClassicHumanForcing;
  var S=root.ClassicHumanSolver;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!F&&typeof require==='function')F=require('./forcing.js');
  if(!S&&typeof require==='function')S=require('./solver.js');

  function intOption(value,fallback,min,max,name){
    var n=value==null?fallback:value;
    if(!Number.isInteger(n)||n<min||n>max)throw new RangeError(name+' must be '+min+'..'+max);
    return n;
  }
  function houseCells(type,index){
    var out=[],i,br,bc,r,c;
    if(type==='row'){for(i=0;i<9;i++)out.push(C.cellIndex(index,i));return out;}
    if(type==='column'){for(i=0;i<9;i++)out.push(C.cellIndex(i,index));return out;}
    br=Math.floor(index/3)*3;bc=(index%3)*3;
    for(r=br;r<br+3;r++)for(c=bc;c<bc+3;c++)out.push(C.cellIndex(r,c));
    return out;
  }
  function candidatePositions(state,type,index,digit){
    var cells=houseCells(type,index),bit=C.bitForDigit(digit),out=[];
    for(var i=0;i<cells.length;i++){
      var cell=cells[i],rc=C.rowCol(cell);
      if(!state.grid[rc[0]][rc[1]]&&(state.masks[cell]&bit))out.push(cell);
    }
    return out;
  }
  function enumerateSeeds(state,arity,options){
    options=options||{};
    var budget=intOption(options.seedBudget,arity===2?16:12,1,32,'digit forcing seedBudget');
    var types=['row','column','box'],out=[];
    for(var ti=0;ti<types.length&&out.length<budget;ti++)for(var h=0;h<9&&out.length<budget;h++)for(var d=1;d<=9&&out.length<budget;d++){
      var positions=candidatePositions(state,types[ti],h,d);
      if(positions.length===arity)out.push(Object.freeze({houseType:types[ti],houseIndex:h,digit:d,positions:Object.freeze(positions.slice())}));
    }
    return out;
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
  function intersectMany(lists){
    if(!lists.length)return [];
    var current=lists[0].slice();
    for(var i=1;i<lists.length;i++){
      var keep=new Set(lists[i].map(actionKey));
      current=current.filter(function(x){return keep.has(actionKey(x));});
    }
    return current;
  }
  function analyzeSeed(state,seed,options){
    options=options||{};
    var maxSteps=intOption(options.maxSteps,32,0,32,'digit forcing maxSteps');
    var branches=seed.positions.map(function(cell){return F.runBranch(state,{cell:cell,digit:seed.digit,value:true},{maxSteps:maxSteps});});
    var stable=[],contradictions=[];
    for(var i=0;i<branches.length;i++)(branches[i].status==='CONTRADICTION'?contradictions:stable).push(i);
    if(!stable.length)return {status:'INCONSISTENT',branches:branches,placements:[],eliminations:[]};
    if(stable.length===1){
      var forced=seed.positions[stable[0]],elims=[];
      for(i=0;i<seed.positions.length;i++)if(i!==stable[0])elims.push({cell:seed.positions[i],digit:seed.digit});
      return {status:'FORCED_POSITION',branches:branches,placements:[{cell:forced,digit:seed.digit}],eliminations:elims};
    }
    if(contradictions.length){
      return {status:'PARTIAL',branches:branches,placements:[],eliminations:contradictions.map(function(i){return {cell:seed.positions[i],digit:seed.digit};})};
    }
    var cs=stable.map(function(i){return consequences(state,branches[i]);});
    var placements=intersectMany(cs.map(function(x){return x.placements;}));
    var eliminations=intersectMany(cs.map(function(x){return x.eliminations;}));
    var seedCells=new Set(seed.positions);
    placements=placements.filter(function(x){return !(x.digit===seed.digit&&seedCells.has(x.cell));});
    eliminations=eliminations.filter(function(x){return !(x.digit===seed.digit&&seedCells.has(x.cell));});
    return {status:placements.length||eliminations.length?'COMMON_CONSEQUENCE':'NONE',branches:branches,placements:placements,eliminations:eliminations};
  }
  function find(state,arity,techniqueId,options){
    options=options||{};
    var maxSteps=intOption(options.maxSteps,32,0,32,'digit forcing maxSteps');
    var seedBudget=intOption(options.seedBudget,arity===2?16:12,1,32,'digit forcing seedBudget');
    var normalized=Object.assign({},options,{maxSteps:maxSteps,seedBudget:seedBudget});
    var seeds=normalized.seeds||enumerateSeeds(state,arity,normalized),out=[];
    for(var i=0;i<seeds.length;i++){
      var seed=seeds[i],a=analyzeSeed(state,seed,normalized);
      if(a.status==='NONE'||a.status==='INCONSISTENT')continue;
      if(!a.placements.length&&!a.eliminations.length)continue;
      out.push(C.normalizeDeduction({techniqueId:techniqueId,placements:a.placements,eliminations:a.eliminations,anchors:seed.positions,houses:[seed.houseType[0]+(seed.houseIndex+1)],complexity:{branchCount:arity,maxPropagationSteps:maxSteps,seedIndex:i+1},explanationData:{houseType:seed.houseType,houseIndex:seed.houseIndex,digit:seed.digit,positions:seed.positions.slice(),result:a.status}}));
    }
    out.sort(C.compareDeductions);return out;
  }
  function findDigitForcingChain(state,options){return find(state,2,'digit-forcing-chain',options);}
  function findDigitForcingNet(state,options){return find(state,3,'digit-forcing-net',options);}

  var api={candidatePositions:candidatePositions,enumerateSeeds:enumerateSeeds,analyzeSeed:analyzeSeed,findDigitForcingChain:findDigitForcingChain,findDigitForcingNet:findDigitForcingNet};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanDigitForcing=api;
})(typeof globalThis!=='undefined'?globalThis:this);
