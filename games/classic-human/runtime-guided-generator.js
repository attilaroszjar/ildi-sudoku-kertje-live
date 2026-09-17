(function(root){'use strict';
  var E=root.ClassicHumanRuntimeEvaluator;
  if(!E&&typeof require==='function')E=require('./runtime-evaluator.js');
  var PROFILE='classic-human-runtime-guided-v8';
  var BUDGETS=Object.freeze({
    gentle:Object.freeze({baseAttempts:2,removals:0}),
    focused:Object.freeze({baseAttempts:6,removals:18}),
    expert:Object.freeze({baseAttempts:6,steps:14,beamWidth:4,candidatesPerState:6})
  });
  var LEVEL_RANGE=Object.freeze({gentle:Object.freeze([1,2]),focused:Object.freeze([3,5]),expert:Object.freeze([6,8])});
  var MIN_LEVEL=Object.freeze({gentle:1,focused:3,expert:6});
  function validBand(b){return Object.prototype.hasOwnProperty.call(BUDGETS,b);}
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function gridString(grid){var out='';for(var r=0;r<9;r++)for(var c=0;c<9;c++)out+=String(grid[r][c]||0);return out;}
  function grid(text){var out=[];for(var r=0;r<9;r++){var row=[];for(var c=0;c<9;c++)row.push(Number(text[r*9+c]));out.push(row);}return out;}
  function clueCount(text){var n=0;for(var i=0;i<text.length;i++)if(text[i]!=='0')n++;return n;}
  function acceptedLevel(band,rating){var range=LEVEL_RANGE[band];return !!(range&&rating&&Number.isInteger(rating.level)&&rating.level>=range[0]&&rating.level<=range[1]);}
  function distance(band,rating){
    if(!rating||rating.score==null||!Number.isInteger(rating.level))return 1000000;
    var range=LEVEL_RANGE[band];
    if(rating.level<range[0])return 10000+(range[0]-rating.level)*100+Math.max(0,70-(rating.score||0));
    if(rating.level>range[1])return 20000+(rating.level-range[1])*100+(rating.score||0);
    if(band==='gentle')return rating.score<=69?0:rating.score-69;
    if(band==='focused'){
      if(rating.level>=4&&rating.level<=5)return 0;
      return 1000+Math.abs(90-(rating.score||0));
    }
    return rating.score<130?130-rating.score:(rating.score<=239?0:rating.score-239);
  }
  function expertProgress(rating,status){
    if(status!=='SOLVED_LOGICALLY'||!rating||!Number.isInteger(rating.level))return 1000000;
    if(rating.level>=6&&rating.level<=8)return 0;
    if(rating.level===9)return 500000+(rating.score||0);
    return (6-rating.level)*10000+Math.max(0,130-(rating.score||0));
  }
  function frontierSummary(candidate){
    if(!candidate||!candidate.evaluation)return 'none';
    var ev=candidate.evaluation,r=ev.rating||{};
    return 'status='+(ev.status||'UNKNOWN')+',level='+(Number.isInteger(r.level)?r.level:'null')+',score='+(r.score==null?'null':r.score)+',hardest='+(r.hardestTechnique||'none')+',clues='+clueCount(candidate.puzzle);
  }
  function hashPuzzle(text){var h=2166136261>>>0;for(var i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function mulberry32(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(list,random){for(var i=list.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=list[i];list[i]=list[j];list[j]=t;}return list;}
  function randomClassicSolution(seed){
    var cells=Array(81).fill(0),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),full=511,random=mulberry32((seed^0xC1A551C5)>>>0);
    function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
    function visit(filled){
      if(filled===81)return true;
      var best=-1,bestMask=0,bestCount=10;
      for(var idx=0;idx<81;idx++)if(!cells[idx]){
        var r=Math.floor(idx/9),c=idx%9,b=Math.floor(r/3)*3+Math.floor(c/3),mask=full&~(rows[r]|cols[c]|boxes[b]),count=bitCount(mask);
        if(!count)return false;
        if(count<bestCount){best=idx;bestMask=mask;bestCount=count;if(count===1)break;}
      }
      var digits=[];for(var d=1;d<=9;d++)if(bestMask&(1<<(d-1)))digits.push(d);shuffle(digits,random);
      var rr=Math.floor(best/9),cc=best%9,bb=Math.floor(rr/3)*3+Math.floor(cc/3);
      for(var i=0;i<digits.length;i++){
        var digit=digits[i],bit=1<<(digit-1);cells[best]=digit;rows[rr]|=bit;cols[cc]|=bit;boxes[bb]|=bit;
        if(visit(filled+1))return true;
        cells[best]=0;rows[rr]^=bit;cols[cc]^=bit;boxes[bb]^=bit;
      }
      return false;
    }
    if(!visit(0))throw new Error('seeded Classic solution generation failed');
    var out=[];for(var r=0;r<9;r++)out.push(cells.slice(r*9,r*9+9));return out;
  }
  function orderFor(seed,puzzle){var out=[];for(var i=0;i<81;i++)if(puzzle[i]!=='0')out.push(i);var random=mulberry32((seed^0x9E3779B9)>>>0);for(var j=out.length-1;j>0;j--){var k=Math.floor(random()*(j+1)),t=out[j];out[j]=out[k];out[k]=t;}return out;}
  function decorate(base,puzzle,evaluation,requestedBand,seed,stats){
    var out=clone(base),rating=evaluation&&evaluation.rating||null;
    out.puzzle=grid(puzzle);
    if(evaluation&&evaluation.solution)out.solution=grid(evaluation.solution);
    out.generation=Object.assign({},base.generation||{}, {
      source:'classic-human-runtime-generator',runtimeProfile:PROFILE,requestedHumanBand:requestedBand,
      measuredHumanBand:rating&&rating.band||null,humanScore:rating&&rating.score!=null?rating.score:null,
      humanLevel:rating&&Number.isInteger(rating.level)?rating.level:null,
      humanStatus:evaluation&&evaluation.status||'UNKNOWN',humanGuided:true,bounded:true,
      degraded:!acceptedLevel(requestedBand,rating),
      baseAttempts:stats.baseAttempts,removalAttempts:stats.removalAttempts,seed:seed>>>0,
      clues:clueCount(puzzle),unique:true,verification:'solver-verified',fallbackSource:null,
      diversifiedSolution:stats.diversifiedSolution===true
    });
    return out;
  }
  function compareBeam(a,b){
    if(a.progress!==b.progress)return a.progress-b.progress;
    var ar=a.evaluation&&a.evaluation.rating||{},br=b.evaluation&&b.evaluation.rating||{};
    var as=ar.score||0,bs=br.score||0;if(as!==bs)return bs-as;
    return clueCount(a.puzzle)-clueCount(b.puzzle);
  }
  function expertSearch(baseMake,variant,seed,budget){
    var totalBase=0,totalRemovals=0,bestGlobal=null,bestProgress=Infinity;
    for(var attempt=0;attempt<budget.baseAttempts;attempt++){
      var derived=(seed+Math.imul(attempt,0x9E3779B1))>>>0,expertVariant=clone(variant);
      expertVariant.solution=randomClassicSolution((derived^Math.imul(attempt+1,0x27D4EB2D))>>>0);
      var base=baseMake(expertVariant,derived,'expert');totalBase++;
      if(!base||!base.generation||base.generation.unique!==true||base.generation.verification!=='solver-verified')continue;
      var start=gridString(base.puzzle),startEv=E.evaluate(start),startProgress=expertProgress(startEv.rating,startEv.status);
      if(startProgress===0)return decorate(base,start,startEv,'expert',seed,{baseAttempts:totalBase,removalAttempts:totalRemovals,diversifiedSolution:true});
      var beam=[{base:base,puzzle:start,evaluation:startEv,progress:startProgress}],seen=new Set([start]);
      if(startProgress<bestProgress){bestGlobal=beam[0];bestProgress=startProgress;}
      for(var step=0;step<budget.steps&&beam.length;step++){
        var next=[];
        for(var bi=0;bi<beam.length;bi++){
          var node=beam[bi],order=orderFor((derived^hashPuzzle(node.puzzle)^Math.imul(step+1,0x85EBCA6B))>>>0,node.puzzle),examined=0;
          for(var oi=0;oi<order.length&&examined<budget.candidatesPerState;oi++){
            var idx=order[oi];if(node.puzzle[idx]==='0')continue;examined++;
            var trial=node.puzzle.slice(0,idx)+'0'+node.puzzle.slice(idx+1);if(seen.has(trial))continue;seen.add(trial);totalRemovals++;
            var tev=E.evaluate(trial);if(!tev.unique||tev.status==='INVALID'||tev.status==='NON_UNIQUE')continue;
            var progress=expertProgress(tev.rating,tev.status),candidate={base:base,puzzle:trial,evaluation:tev,progress:progress};
            if(progress===0)return decorate(base,trial,tev,'expert',seed,{baseAttempts:totalBase,removalAttempts:totalRemovals,diversifiedSolution:true});
            next.push(candidate);
            if(progress<bestProgress||(progress===bestProgress&&compareBeam(candidate,bestGlobal)<0)){bestGlobal=candidate;bestProgress=progress;}
          }
        }
        next.sort(compareBeam);
        beam=next.slice(0,budget.beamWidth);
      }
    }
    if(bestGlobal&&acceptedLevel('expert',bestGlobal.evaluation&&bestGlobal.evaluation.rating))return decorate(bestGlobal.base,bestGlobal.puzzle,bestGlobal.evaluation,'expert',seed,{baseAttempts:totalBase,removalAttempts:totalRemovals,diversifiedSolution:true});
    throw new Error('bounded expert search exhausted seed='+seed+' baseAttempts='+totalBase+' removalAttempts='+totalRemovals+' best={'+frontierSummary(bestGlobal)+'}');
  }
  function make(baseMake,variant,seed,targetBand){
    if(typeof baseMake!=='function')throw new TypeError('baseMake required');
    if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('seed must be a non-negative safe integer');
    if(!validBand(targetBand))throw new RangeError('targetBand invalid');
    var budget=BUDGETS[targetBand];
    if(targetBand==='expert')return expertSearch(baseMake,variant,seed,budget);
    var globalBest=null,globalDistance=Infinity,totalBase=0,totalRemovals=0;
    for(var attempt=0;attempt<budget.baseAttempts;attempt++){
      var derived=(seed+Math.imul(attempt,0x9E3779B1))>>>0,baseVariant=variant;
      if(targetBand==='focused'){
        baseVariant=clone(variant);
        baseVariant.solution=randomClassicSolution((derived^Math.imul(attempt+1,0x27D4EB2D)^0xF0C05ED)>>>0);
      }
      var base=baseMake(baseVariant,derived,targetBand);totalBase++;
      if(!base||!base.generation||base.generation.unique!==true||base.generation.verification!=='solver-verified')continue;
      var current=gridString(base.puzzle),ev=E.evaluate(current),d=distance(targetBand,ev.rating),best={base:base,puzzle:current,evaluation:ev,distance:d};
      if(d===0&&acceptedLevel(targetBand,ev.rating))return decorate(base,current,ev,targetBand,seed,{baseAttempts:totalBase,removalAttempts:totalRemovals,diversifiedSolution:targetBand==='focused'});
      var order=orderFor(derived,current);
      for(var i=0;i<order.length&&i<budget.removals;i++){
        var idx=order[i];if(current[idx]==='0')continue;
        var trial=current.slice(0,idx)+'0'+current.slice(idx+1);totalRemovals++;
        var tev=E.evaluate(trial);if(!tev.unique||tev.status==='INVALID'||tev.status==='NON_UNIQUE')continue;
        current=trial;var td=distance(targetBand,tev.rating);
        if(td<best.distance)best={base:base,puzzle:trial,evaluation:tev,distance:td};
        if(td===0&&acceptedLevel(targetBand,tev.rating))return decorate(base,trial,tev,targetBand,seed,{baseAttempts:totalBase,removalAttempts:totalRemovals,diversifiedSolution:targetBand==='focused'});
      }
      if(best.distance<globalDistance){globalBest=best;globalDistance=best.distance;}
    }
    if(globalBest&&acceptedLevel(targetBand,globalBest.evaluation&&globalBest.evaluation.rating))return decorate(globalBest.base,globalBest.puzzle,globalBest.evaluation,targetBand,seed,{baseAttempts:totalBase,removalAttempts:totalRemovals,diversifiedSolution:targetBand==='focused'});
    if(targetBand==='focused')throw new Error('bounded focused search exhausted seed='+seed+' baseAttempts='+totalBase+' removalAttempts='+totalRemovals+' best={'+frontierSummary(globalBest)+'}');
    if(!globalBest){
      var fallbackBase=baseMake(variant,seed,targetBand),fp=gridString(fallbackBase.puzzle),fev=E.evaluate(fp);
      globalBest={base:fallbackBase,puzzle:fp,evaluation:fev,distance:distance(targetBand,fev.rating)};totalBase++;
    }
    return decorate(globalBest.base,globalBest.puzzle,globalBest.evaluation,targetBand,seed,{baseAttempts:totalBase,removalAttempts:totalRemovals});
  }
  var api={PROFILE:PROFILE,BUDGETS:BUDGETS,LEVEL_RANGE:LEVEL_RANGE,MIN_LEVEL:MIN_LEVEL,make:make};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanRuntimeGuidedGenerator=api;
})(typeof globalThis!=='undefined'?globalThis:this);
