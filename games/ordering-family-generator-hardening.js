(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function deepClone(x){return JSON.parse(JSON.stringify(x));}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function lineAt(grid,axis,index){return axis==='row'?grid[index].slice():grid.map(function(row){return row[index];});}
  function transformedSudokuSolution(source,seed){
    var random=rng(seed>>>0),digits=shuffle([1,2,3,4,5,6,7,8,9],random),digitMap={},bands=shuffle([0,1,2],random),stacks=shuffle([0,1,2],random),rows=[],cols=[];
    for(var d=1;d<=9;d++)digitMap[d]=digits[d-1];
    bands.forEach(function(b){shuffle([0,1,2],random).forEach(function(x){rows.push(b*3+x);});});
    stacks.forEach(function(s){shuffle([0,1,2],random).forEach(function(x){cols.push(s*3+x);});});
    var out=rows.map(function(r){return cols.map(function(c){return digitMap[source[r][c]];});});
    if(random()<0.5)out=Array.from({length:9},function(_,r){return Array.from({length:9},function(_,c){return out[c][r];});});
    return out;
  }
  function runningCellCount(line){
    var used=Array(line.length).fill(false);
    for(var i=0;i<line.length-1;i++)if(Math.abs(line[i]-line[i+1])===1){used[i]=true;used[i+1]=true;}
    return used.filter(Boolean).length;
  }
  function ascendingSequenceCount(line){
    var count=0,inRun=false;
    for(var i=0;i<line.length-1;i++){
      if(line[i]<line[i+1]){if(!inRun)count++;inRun=true;}else inRun=false;
    }
    return count;
  }
  function cluesFor(solution,measure){
    var clues=[];
    for(var i=0;i<9;i++){
      clues.push({axis:'row',index:i,side:'left',count:measure(lineAt(solution,'row',i))});
      clues.push({axis:'col',index:i,side:'top',count:measure(lineAt(solution,'col',i))});
    }
    return clues;
  }
  function makeOrdering(variant,seed,difficulty){
    var measure=variant.id==='running-cells'?runningCellCount:ascendingSequenceCount;
    for(var attempt=0;attempt<16;attempt++){
      var actualSeed=((seed>>>0)^0x4f524452^Math.imul(attempt+1,0x9E3779B1))>>>0;
      var working=deepClone(variant);
      var solution=transformedSudokuSolution(variant.solution,(actualSeed^0x534f4c56)>>>0);
      working.solution=solution;
      working.data=Object.assign({},working.data||{},{clues:cluesFor(solution,measure)});
      var out=baseMake.call(generator,working,actualSeed,difficulty||'focused');
      if(!out.generation||out.generation.unique!==true||out.generation.variantEssential!==true)continue;
      out.solution=solution;
      out.data=working.data;
      out.generation.seed=seed>>>0;
      out.generation.transformationSeed=actualSeed;
      out.generation.generatorFamily=variant.id+'-fresh-solution-derived-clues';
      return out;
    }
    throw new Error(variant.id+' bounded generation failed for seed '+seed+' / '+(difficulty||'focused'));
  }
  generator.make=function(variant,seed,difficulty){
    if(variant&&(variant.id==='running-cells'||variant.id==='ascending-sequences'))return makeOrdering(variant,seed,difficulty);
    return baseMake.call(this,variant,seed,difficulty);
  };
})(typeof window!=='undefined'?window:globalThis);
