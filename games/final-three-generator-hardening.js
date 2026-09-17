(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;

  function deepClone(x){return JSON.parse(JSON.stringify(x));}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}

  function transformedSudokuSolution(source,seed){
    var random=rng(seed>>>0),digits=shuffle([1,2,3,4,5,6,7,8,9],random),digitMap={},bands=shuffle([0,1,2],random),stacks=shuffle([0,1,2],random),rows=[],cols=[];
    for(var d=1;d<=9;d++)digitMap[d]=digits[d-1];
    bands.forEach(function(b){shuffle([0,1,2],random).forEach(function(x){rows.push(b*3+x);});});
    stacks.forEach(function(s){shuffle([0,1,2],random).forEach(function(x){cols.push(s*3+x);});});
    var out=rows.map(function(r){return cols.map(function(c){return digitMap[source[r][c]];});});
    if(random()<0.5)out=Array.from({length:9},function(_,r){return Array.from({length:9},function(_,c){return out[c][r];});});
    return out;
  }

  function centerDotSolution(seed){
    var random=rng(seed>>>0),grid=Array.from({length:9},function(){return Array(9).fill(0);});
    var rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),centers=0,full=511,nodes=0,limit=500000;
    function box(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
    function isCenter(r,c){return r%3===1&&c%3===1;}
    function maskAt(r,c){var used=rows[r]|cols[c]|boxes[box(r,c)];if(isCenter(r,c))used|=centers;return full&~used;}
    function visit(){
      if(++nodes>limit)return false;
      var br=-1,bc=-1,bm=0,best=10;
      for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(!grid[r][c]){
        var mask=maskAt(r,c),count=bitCount(mask);if(!count)return false;
        if(count<best){best=count;br=r;bc=c;bm=mask;if(count===1)break;}
      }
      if(br<0)return true;
      var choices=[];for(var bits=bm;bits;bits&=bits-1)choices.push(bits&-bits);shuffle(choices,random);
      var b=box(br,bc),center=isCenter(br,bc);
      for(var i=0;i<choices.length;i++){
        var bit=choices[i],digit=1+Math.round(Math.log(bit)/Math.LN2);
        grid[br][bc]=digit;rows[br]|=bit;cols[bc]|=bit;boxes[b]|=bit;if(center)centers|=bit;
        if(visit())return true;
        if(center)centers^=bit;boxes[b]^=bit;cols[bc]^=bit;rows[br]^=bit;grid[br][bc]=0;
      }
      return false;
    }
    return visit()?grid:null;
  }

  function frameClues(solution){
    var clues=[];
    function sum3(values){return values[0]+values[1]+values[2];}
    for(var r=0;r<9;r++){
      clues.push({axis:'row',index:r,side:'left',sum:sum3(solution[r].slice(0,3))});
      clues.push({axis:'row',index:r,side:'right',sum:sum3(solution[r].slice(6).reverse())});
    }
    for(var c=0;c<9;c++){
      var col=solution.map(function(row){return row[c];});
      clues.push({axis:'col',index:c,side:'top',sum:sum3(col.slice(0,3))});
      clues.push({axis:'col',index:c,side:'bottom',sum:sum3(col.slice(6).reverse())});
    }
    return clues;
  }

  function makeCenterDot(variant,seed,difficulty){
    for(var attempt=0;attempt<16;attempt++){
      var actualSeed=((seed>>>0)^0x43444f54^Math.imul(attempt+1,0x9E3779B1))>>>0;
      var working=deepClone(variant),solution=centerDotSolution((actualSeed^0x534f4c56)>>>0);
      if(!solution)continue;
      working.solution=solution;
      var out=baseMake.call(generator,working,actualSeed,difficulty||'focused');
      if(!out.generation||out.generation.unique!==true||out.generation.variantEssential!==true)continue;
      out.solution=solution;
      out.generation.seed=seed>>>0;
      out.generation.transformationSeed=actualSeed;
      out.generation.generatorFamily='center-dot-seeded-constrained-solution';
      return out;
    }
    throw new Error('Center Dot bounded generation failed for seed '+seed+' / '+(difficulty||'focused'));
  }

  function makeFrame(variant,seed,difficulty){
    for(var attempt=0;attempt<16;attempt++){
      var actualSeed=((seed>>>0)^0x4652414d^Math.imul(attempt+1,0x9E3779B1))>>>0;
      var working=deepClone(variant),solution=transformedSudokuSolution(variant.solution,(actualSeed^0x534f4c56)>>>0);
      working.solution=solution;
      working.data=Object.assign({},working.data||{},{clues:frameClues(solution)});
      var out=baseMake.call(generator,working,actualSeed,difficulty||'focused');
      if(!out.generation||out.generation.unique!==true||out.generation.variantEssential!==true)continue;
      out.solution=solution;
      out.data=working.data;
      out.generation.seed=seed>>>0;
      out.generation.transformationSeed=actualSeed;
      out.generation.generatorFamily='frame-fresh-solution-derived-clues';
      return out;
    }
    throw new Error('Frame bounded generation failed for seed '+seed+' / '+(difficulty||'focused'));
  }

  function makeSukaku(variant,seed,difficulty){
    for(var attempt=0;attempt<16;attempt++){
      var actualSeed=((seed>>>0)^0x53554b41^Math.imul(attempt+1,0x9E3779B1))>>>0;
      var working=deepClone(variant),solution=transformedSudokuSolution(variant.solution,(actualSeed^0x534f4c56)>>>0);
      working.solution=solution;
      var out=baseMake.call(generator,working,actualSeed,difficulty||'focused');
      if(!out.generation||out.generation.unique!==true)continue;
      out.solution=solution;
      out.generation.seed=seed>>>0;
      out.generation.transformationSeed=actualSeed;
      out.generation.generatorFamily='sukaku-fresh-solution-candidate-sets';
      return out;
    }
    throw new Error('Sukaku bounded generation failed for seed '+seed+' / '+(difficulty||'focused'));
  }

  generator.make=function(variant,seed,difficulty){
    if(variant&&variant.id==='center-dot')return makeCenterDot(variant,seed,difficulty);
    if(variant&&variant.id==='frame')return makeFrame(variant,seed,difficulty);
    if(variant&&variant.id==='sukaku')return makeSukaku(variant,seed,difficulty);
    return baseMake.call(this,variant,seed,difficulty);
  };
})(typeof window!=='undefined'?window:globalThis);
