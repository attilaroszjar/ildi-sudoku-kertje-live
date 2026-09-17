(function(root){
  'use strict';
  if(!root.SudokuGenerator||root.XSumsRuntimeHardening)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var EXPERT_MIN_SCORE=80;
  var MAX_CANDIDATES=12;
  var MAX_OUTSIDE_ATTEMPTS=16;
  var SKYSCRAPER_PARKS_EXPERT_TARGET=30;
  var SKYSCRAPER_PARKS_VERIFICATION='skyscraper-parks-postassign-prefix-bound-exact-v3';
  var SKYSCRAPER_STRUCTURAL_KINDS=[
    'skyscraper','skyscrapersums','skyscraperproduct','skyscrapermixed',
    'skyscrapernontouching','killerskyscrapers','diagonalskyscrapers','insideskyscrapers'
  ];

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function bitCount(x){var count=0;while(x){x&=x-1;count++;}return count;}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}

  function candidateSeed(seed,index){
    if(index===0)return seed>>>0;
    return ((seed>>>0)^0x58534844^Math.imul(index,0x9E3779B1))>>>0;
  }

  function calibratedExpert(variant,seed){
    var best=null;
    for(var i=0;i<MAX_CANDIDATES;i++){
      var actualSeed=candidateSeed(seed,i);
      var out=baseMake.call(generator,variant,actualSeed,'expert');
      var g=out&&out.generation;
      if(!g||g.unique!==true||g.variantEssential!==true||!Number.isFinite(g.difficultyScore))continue;
      if(!best||g.difficultyScore>best.generation.difficultyScore)best=out;
      if(g.difficultyScore>=EXPERT_MIN_SCORE){best=out;break;}
    }
    if(!best||best.generation.difficultyScore<EXPERT_MIN_SCORE)throw new Error('X-Sums expert calibration failed for seed '+seed+' (best score '+(best&&best.generation?best.generation.difficultyScore:'none')+')');
    best.generation.requestedSeed=seed>>>0;
    best.generation.candidateSeed=best.generation.seed>>>0;
    best.generation.seed=seed>>>0;
    best.generation.difficultyCalibration={metric:'variant-search-score',minimum:EXPERT_MIN_SCORE,selected:best.generation.difficultyScore,maxCandidates:MAX_CANDIDATES};
    return best;
  }

  function sudokuAutomorphism(source,seed,xor){
    var random=rng((seed^(xor>>>0))>>>0),digits=shuffle([1,2,3,4,5,6,7,8,9],random),digitMap={};
    for(var d=1;d<=9;d++)digitMap[d]=digits[d-1];
    var bands=shuffle([0,1,2],random),rows=[];
    bands.forEach(function(b){shuffle([0,1,2],random).forEach(function(x){rows.push(b*3+x);});});
    var stacks=shuffle([0,1,2],random),cols=[];
    stacks.forEach(function(s){shuffle([0,1,2],random).forEach(function(x){cols.push(s*3+x);});});
    return rows.map(function(r){return cols.map(function(c){return digitMap[source[r][c]];});});
  }

  function nonTouchingSolution(seed){
    if(typeof generator.makeSeededAntiSolution!=='function')throw new Error('makeSeededAntiSolution missing before Skyscraper hardening');
    var built=generator.makeSeededAntiSolution('anti-king',(seed^0x4E54534B)>>>0,250000);
    return built&&built.solution?built.solution:null;
  }

  function mono(a,b,c){return a<b&&b<c?'inc':a>b&&b>c?'dec':null;}
  function rossiniClues(solution){
    var clues=[];
    for(var r=0;r<9;r++){
      var left=mono(solution[r][0],solution[r][1],solution[r][2]);if(left)clues.push({axis:'row',index:r,side:'left',dir:left});
      var right=mono(solution[r][8],solution[r][7],solution[r][6]);if(right)clues.push({axis:'row',index:r,side:'right',dir:right});
    }
    for(var c=0;c<9;c++){
      var top=mono(solution[0][c],solution[1][c],solution[2][c]);if(top)clues.push({axis:'col',index:c,side:'top',dir:top});
      var bottom=mono(solution[8][c],solution[7][c],solution[6][c]);if(bottom)clues.push({axis:'col',index:c,side:'bottom',dir:bottom});
    }
    return clues;
  }

  function freshRossini(variant,seed,difficulty){
    difficulty=difficulty||'focused';
    for(var attempt=0;attempt<MAX_OUTSIDE_ATTEMPTS;attempt++){
      var actual=((seed>>>0)^0x524F5353^Math.imul(attempt+1,0x9E3779B1))>>>0;
      var solution=sudokuAutomorphism(variant.solution,actual,0x524F5353),working=clone(variant);
      working.solution=solution;working.data=Object.assign({},working.data||{},{clues:rossiniClues(solution)});
      var out=baseMake.call(generator,working,actual,difficulty),g=out&&out.generation;
      if(!g||g.unique!==true||g.variantEssential!==true)continue;
      out.solution=solution;out.data=working.data;out.generation=Object.assign({},g,{seed:seed>>>0,actualSeed:actual,attempt:attempt,generatorFamily:'rossini-fresh-solution-derived-arrows'});return out;
    }
    throw new Error('Rossini generation failed for seed '+seed+' / '+difficulty);
  }

  function orientedLine(solution,clue){var line=clue.axis==='row'?solution[clue.index].slice():solution.map(function(row){return row[clue.index];});if(clue.side==='right'||clue.side==='bottom')line.reverse();return line;}
  function sandwichSum(line){var a=line.indexOf(1),b=line.indexOf(9),lo=Math.min(a,b),hi=Math.max(a,b),sum=0;for(var i=lo+1;i<hi;i++)sum+=line[i];return sum;}
  function sandwichClues(solution,templates){return (templates||[]).map(function(template){var clue=clone(template);clue.sum=sandwichSum(orientedLine(solution,clue));return clue;});}
  function freshSandwich(variant,seed,difficulty){
    difficulty=difficulty||'focused';var requested=seed>>>0,templates=(variant.data&&variant.data.clues)||[];
    for(var attempt=0;attempt<MAX_OUTSIDE_ATTEMPTS;attempt++){
      var actual=(requested^0x53414E44^Math.imul(attempt+1,0x9E3779B1))>>>0,solution=sudokuAutomorphism(variant.solution,actual,0x53414E44),working=clone(variant);
      working.solution=solution;working.data=Object.assign({},working.data||{},{clues:sandwichClues(solution,templates)});
      var out=baseMake.call(generator,working,actual,difficulty),g=out&&out.generation;if(!g||g.unique!==true||g.variantEssential!==true)continue;
      out.solution=solution;out.data=working.data;out.generation=Object.assign({},g,{seed:requested,actualSeed:actual,attempt:attempt,generatorFamily:'sandwich-fresh-solution-derived-clues'});return out;
    }
    throw new Error('Sandwich generation exhausted after '+MAX_OUTSIDE_ATTEMPTS+' deterministic attempts');
  }

  function parkVisibleCount(line,parkValue){var max=0,count=0;for(var i=0;i<line.length;i++){var value=line[i];if(value===parkValue)continue;if(value>max){max=value;count++;}}return count;}
  function parkVisibleSum(line,parkValue){var max=0,sum=0;for(var i=0;i<line.length;i++){var value=line[i];if(value===parkValue)continue;if(value>max){max=value;sum+=value;}}return sum;}
  function parkLineValid(variant,grid,clue,parkValue){var line=orientedLine(grid,clue);if(variant.kind==='skyscraperparks')return parkVisibleCount(line,parkValue)===clue.count;if(variant.kind==='sumskyscraperparks')return parkVisibleSum(line,parkValue)===clue.sum;return true;}
  function parkDirectionalPossible(line,target,parkValue,n){
    var visible=0,max=0,firstGap=-1;
    for(var i=0;i<line.length;i++){
      var value=line[i];
      if(!value){firstGap=i;break;}
      if(value===parkValue)continue;
      if(value>max){max=value;visible++;}
    }
    if(firstGap<0)return visible===target;
    if(visible>target)return false;
    var suffixCapacity=0;for(i=firstGap;i<line.length;i++)if(line[i]!==parkValue)suffixCapacity++;
    var possibleExtra=0;for(var digit=max+1;digit<=n;digit++)if(digit!==parkValue)possibleExtra++;
    return visible+Math.min(suffixCapacity,possibleExtra)>=target;
  }
  function parkCountLinePossible(line,nearTarget,farTarget,parkValue,n){
    return parkDirectionalPossible(line,nearTarget,parkValue,n)&&parkDirectionalPossible(line.slice().reverse(),farTarget,parkValue,n);
  }
  function countParkSolutionsPostAssignBound(source,variant,limit,ignoreClues){
    var grid=cloneGrid(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),r,c;
    var clues=(variant.data&&variant.data.clues)||[],park=(variant.data&&variant.data.parkValue)||n;
    var rowClues=Array.from({length:n},function(){return[];}),colClues=Array.from({length:n},function(){return[];});
    var rowPairs=Array.from({length:n},function(){return[null,null];}),colPairs=Array.from({length:n},function(){return[null,null];});
    if(!ignoreClues)for(var ci=0;ci<clues.length;ci++){
      var clue=clues[ci],bucket=clue.axis==='row'?rowClues[clue.index]:colClues[clue.index];bucket.push(clue);
      if(variant.kind==='skyscraperparks'){
        var pair=clue.axis==='row'?rowPairs[clue.index]:colPairs[clue.index];
        if(clue.side==='left'||clue.side==='top')pair[0]=clue.count;
        else if(clue.side==='right'||clue.side==='bottom')pair[1]=clue.count;
      }
    }
    for(r=0;r<n;r++)for(c=0;c<n;c++){
      var value=grid[r][c];if(!value)continue;var bit=1<<(value-1);if((rows[r]|cols[c])&bit)return 0;rows[r]|=bit;cols[c]|=bit;
    }
    function lineValidOrPossible(axis,index){
      if(ignoreClues)return true;
      var bucket=axis==='row'?rowClues[index]:colClues[index];
      var mask=axis==='row'?rows[index]:cols[index];
      if(mask===full){for(var i=0;i<bucket.length;i++)if(!parkLineValid(variant,grid,bucket[i],park))return false;return true;}
      if(variant.kind!=='skyscraperparks')return true;
      var pair=axis==='row'?rowPairs[index]:colPairs[index];
      if(!Number.isInteger(pair[0])||!Number.isInteger(pair[1]))return true;
      var line=axis==='row'?grid[index].slice():grid.map(function(row){return row[index];});
      return parkCountLinePossible(line,pair[0],pair[1],park,n);
    }
    if(!ignoreClues){for(r=0;r<n;r++)if(!lineValidOrPossible('row',r))return 0;for(c=0;c<n;c++)if(!lineValidOrPossible('col',c))return 0;}
    var found=0;
    function visit(){
      if(found>=limit)return;
      var br=-1,bc=-1,bm=0,best=n+1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var mask=full&~(rows[rr]|cols[cc]),count=bitCount(mask);
        if(count<best){br=rr;bc=cc;bm=mask;best=count;if(best<=1)break;}
      }
      if(br<0){found++;return;}if(!bm)return;
      for(var bits=bm;bits;bits&=bits-1){
        var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);
        grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;
        if(lineValidOrPossible('row',br)&&lineValidOrPossible('col',bc))visit();
        rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;
        if(found>=limit)return;
      }
    }
    visit();return found;
  }

  generator.countParkSolutions=countParkSolutionsPostAssignBound;

  function freshSkyscraperParksExpert(variant,seed){
    if(typeof generator.countParkSolutions!=='function')throw new Error('countParkSolutions missing before Skyscraper Parks hardening');
    var requested=seed>>>0;
    for(var attempt=0;attempt<MAX_OUTSIDE_ATTEMPTS;attempt++){
      var actual=(requested^0x5041524B^Math.imul(attempt+1,0x9E3779B1))>>>0;
      var out=baseMake.call(generator,variant,actual,'focused'),g=out&&out.generation;
      if(!g||g.unique!==true||g.variantEssential!==true)continue;
      var grid=clone(out.puzzle),order=[];
      for(var r=0;r<grid.length;r++)for(var c=0;c<grid.length;c++)if(grid[r][c])order.push(r*grid.length+c);
      shuffle(order,rng((actual^0x45585054)>>>0));
      var clues=order.length;
      for(var i=0;i<order.length&&clues>SKYSCRAPER_PARKS_EXPERT_TARGET;i++){
        var idx=order[i],rr=Math.floor(idx/grid.length),cc=idx%grid.length,old=grid[rr][cc];
        if(!old)continue;grid[rr][cc]=0;
        if(generator.countParkSolutions(grid,out,2,false)!==1)grid[rr][cc]=old;else clues--;
      }
      if(clues!==SKYSCRAPER_PARKS_EXPERT_TARGET)continue;
      if(generator.countParkSolutions(grid,out,2,false)!==1)continue;
      if(generator.countParkSolutions(grid,out,2,true)<=1)continue;
      out.puzzle=grid;
      out.generation=Object.assign({},g,{seed:requested,requestedSeed:requested,actualSeed:actual,attempt:attempt,clues:clues,generatorFamily:'skyscraper-parks-bounded-expert-carve',verification:SKYSCRAPER_PARKS_VERIFICATION,difficultyCalibration:{metric:'paired-givens-pressure',sourceDifficulty:'focused',targetClues:SKYSCRAPER_PARKS_EXPERT_TARGET,maxAttempts:MAX_OUTSIDE_ATTEMPTS}});
      return out;
    }
    throw new Error('Skyscraper Parks expert generation exhausted after '+MAX_OUTSIDE_ATTEMPTS+' deterministic attempts');
  }

  function freshSkyscraperStructure(variant,seed,difficulty){
    difficulty=difficulty||'focused';var requested=seed>>>0;
    for(var attempt=0;attempt<MAX_OUTSIDE_ATTEMPTS;attempt++){
      var actual=(requested^0x534B5953^Math.imul(attempt+1,0x9E3779B1))>>>0,working=clone(variant);
      var solution=variant.kind==='skyscrapernontouching'?nonTouchingSolution(actual):sudokuAutomorphism(variant.solution,actual,0x53545255);if(!solution)continue;
      working.solution=solution;var innerSeed=(actual^0x43415256)>>>0,out=baseMake.call(generator,working,innerSeed,difficulty),g=out&&out.generation;
      if(!g||g.unique!==true||g.variantEssential!==true)continue;if(generator.countVariantSolutions(out.puzzle,out,2)!==1)continue;if(generator.countSolutions(out.puzzle,2)<=1)continue;
      out.generation=Object.assign({},g,{seed:requested,actualSeed:actual,innerSeed:innerSeed,attempt:attempt,generatorFamily:variant.kind==='skyscrapernontouching'?'skyscraper-nontouching-anti-king-seeded-exact-verified':'skyscraper-structural-automorphism-exact-verified'});return out;
    }
    throw new Error('Skyscraper structural generation exhausted after '+MAX_OUTSIDE_ATTEMPTS+' deterministic attempts for '+variant.id);
  }

  generator.make=function(variant,seed,difficulty){
    if(variant&&variant.kind==='xsums'&&difficulty==='expert')return calibratedExpert(variant,seed>>>0);
    if(variant&&variant.kind==='rossini')return freshRossini(variant,seed>>>0,difficulty);
    if(variant&&variant.kind==='sandwich')return freshSandwich(variant,seed>>>0,difficulty);
    if(variant&&variant.kind==='skyscraperparks'&&difficulty==='expert')return freshSkyscraperParksExpert(variant,seed>>>0);
    if(variant&&SKYSCRAPER_STRUCTURAL_KINDS.indexOf(variant.kind)>=0)return freshSkyscraperStructure(variant,seed>>>0,difficulty);
    return baseMake.call(generator,variant,seed,difficulty);
  };

  root.XSumsRuntimeHardening={expertMinimumScore:EXPERT_MIN_SCORE,maxCandidates:MAX_CANDIDATES,candidateSeed:candidateSeed,rossiniClues:rossiniClues,sandwichClues:sandwichClues,outsideMaxAttempts:MAX_OUTSIDE_ATTEMPTS,skyscraperStructuralKinds:SKYSCRAPER_STRUCTURAL_KINDS.slice(),nonTouchingStructure:'reuse-iteration4-anti-king-seeded-solver-v2',skyscraperParksExpertTarget:SKYSCRAPER_PARKS_EXPERT_TARGET,skyscraperParksVerification:SKYSCRAPER_PARKS_VERIFICATION};
})(typeof window!=='undefined'?window:globalThis);