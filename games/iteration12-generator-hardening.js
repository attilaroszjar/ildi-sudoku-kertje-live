(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function deepClone(x){return JSON.parse(JSON.stringify(x));}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function orientedLine(grid,cl){var line=cl.axis==='row'?grid[cl.index].slice():grid.map(function(row){return row[cl.index];});if(cl.side==='right'||cl.side==='bottom')line.reverse();return line;}
  function sameDigits(a,b){if(a.length!==b.length)return false;var x=a.slice().sort(function(m,n){return m-n;}),y=b.slice().sort(function(m,n){return m-n;});for(var i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;}
  function lineAt(grid,axis,index,side){var line=axis==='row'?grid[index].slice():grid.map(function(row){return row[index];});if(side==='right'||side==='bottom')line.reverse();return line;}
  function numberedRoomsClues(solution){
    var clues=[],sides=[['row','left'],['row','right'],['col','top'],['col','bottom']];
    sides.forEach(function(def){
      for(var i=0;i<9;i+=1){
        var line=lineAt(solution,def[0],i,def[1]),n=line[0];
        clues.push({axis:def[0],index:i,side:def[1],digit:line[n-1]});
      }
    });
    return clues;
  }
  function nextToNineClues(solution){
    var clues=[];
    ['row','col'].forEach(function(axis){
      for(var i=0;i<9;i+=1){
        var line=lineAt(solution,axis,i),p=line.indexOf(9),digits=[];
        if(p>0)digits.push(line[p-1]);
        if(p<8)digits.push(line[p+1]);
        digits.sort(function(a,b){return a-b;});
        clues.push({axis:axis,index:i,side:axis==='row'?'left':'top',digits:digits});
      }
    });
    return clues;
  }
  function transformedSudokuSolution(source,seed){
    var random=rng(seed>>>0),digits=shuffle([1,2,3,4,5,6,7,8,9],random),digitMap={},bands=shuffle([0,1,2],random),stacks=shuffle([0,1,2],random),rows=[],cols=[];
    for(var d=1;d<=9;d+=1)digitMap[d]=digits[d-1];
    bands.forEach(function(b){var within=shuffle([0,1,2],random);within.forEach(function(x){rows.push(b*3+x);});});
    stacks.forEach(function(s){var within=shuffle([0,1,2],random);within.forEach(function(x){cols.push(s*3+x);});});
    var out=rows.map(function(r){return cols.map(function(c){return digitMap[source[r][c]];});});
    if(random()<0.5)out=Array.from({length:9},function(_,r){return Array.from({length:9},function(_,c){return out[c][r];});});
    return out;
  }
  function searchStats(source,variant){
    var grid=clone(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),stats={nodes:0,branches:0,deadEnds:0,solutions:0};
    function boxIndex(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}
    function numberedRoomsValid(){var clues=(variant.data&&variant.data.clues)||[];for(var i=0;i<clues.length;i++){var cl=clues[i],line=orientedLine(grid,cl),first=line[0];if(!first)continue;var pos=first-1;if(pos<0||pos>=n)return false;if(line[pos]&&line[pos]!==cl.digit)return false;if(line.every(Boolean)&&line[pos]!==cl.digit)return false;}return true;}
    function nextToNineValid(){var clues=(variant.data&&variant.data.clues)||[];for(var i=0;i<clues.length;i++){var cl=clues[i],line=orientedLine(grid,cl),p=line.indexOf(9);if(p<0){if(line.every(Boolean))return false;continue;}var positions=[];if(p>0)positions.push(p-1);if(p<n-1)positions.push(p+1);if(positions.length!==cl.digits.length)return false;var known=[];for(var j=0;j<positions.length;j++){var v=line[positions[j]];if(v){if(cl.digits.indexOf(v)<0)return false;known.push(v);}}if(known.length===positions.length&&!sameDigits(known,cl.digits))return false;if(line.every(Boolean)&&!sameDigits(positions.map(function(k){return line[k];}),cl.digits))return false;}return true;}
    function extraValid(){return variant.kind==='numberedrooms'?numberedRoomsValid():variant.kind==='nexttonine'?nextToNineValid():true;}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]){var value=grid[r][c],bit=1<<(value-1),box=boxIndex(r,c);if((rows[r]|cols[c]|boxes[box])&bit)return stats;rows[r]|=bit;cols[c]|=bit;boxes[box]|=bit;}
    if(!extraValid())return stats;
    function visit(){if(stats.solutions>=2)return;stats.nodes++;var br=-1,bc=-1,bm=0,best=n+1;for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){var mask=full&~(rows[rr]|cols[cc]|boxes[boxIndex(rr,cc)]),validMask=0;for(var bits=mask;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=digit;if(extraValid())validMask|=one;grid[rr][cc]=0;}var count=bitCount(validMask);if(count<best){br=rr;bc=cc;bm=validMask;best=count;if(count<=1)break;}}if(br<0){stats.solutions++;return;}if(!bm){stats.deadEnds++;return;}if(best>1)stats.branches++;var box=boxIndex(br,bc);for(var bits=bm;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;boxes[box]|=one;visit();rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;if(stats.solutions>=2)return;}}
    visit();return stats;
  }
  function makeFreshClueVariant(variant,seed,difficulty,id,seedTag,clueBuilder,family){
    for(var attempt=0;attempt<12;attempt+=1){
      var actualSeed=((seed>>>0)^seedTag^Math.imul(attempt+1,0x9E3779B1))>>>0;
      var working=deepClone(variant),solution=transformedSudokuSolution(variant.solution,(actualSeed^0x534F4C56)>>>0);
      working.solution=solution;
      working.data=Object.assign({},working.data||{},{clues:clueBuilder(solution)});
      var out=baseMake.call(generator,working,actualSeed,difficulty||'focused');
      if(!out.generation||out.generation.unique!==true||out.generation.variantEssential!==true)continue;
      out.solution=solution;
      out.data=working.data;
      out.generation.seed=seed>>>0;
      out.generation.transformationSeed=actualSeed;
      out.generation.generatorFamily=family;
      return out;
    }
    throw new Error(id+' bounded generation failed for seed '+seed+' / '+(difficulty||'focused'));
  }
  function makeNextToNine(variant,seed,difficulty){return makeFreshClueVariant(variant,seed,difficulty,'Next to Nine',0x4E54394E,nextToNineClues,'next-to-nine-fresh-solution-derived-clues');}
  function makeNumberedRooms(variant,seed,difficulty){return makeFreshClueVariant(variant,seed,difficulty,'Numbered Rooms',0x4E524F4D,numberedRoomsClues,'numbered-rooms-fresh-solution-derived-clues');}
  generator.iteration12SearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){
    var out=variant&&variant.id==='next-to-nine'?makeNextToNine(variant,seed,difficulty):variant&&variant.id==='numbered-rooms'?makeNumberedRooms(variant,seed,difficulty):baseMake.call(this,variant,seed,difficulty);
    if(variant&&(variant.id==='numbered-rooms'||variant.id==='next-to-nine')){
      var stats=searchStats(out.puzzle,out);
      out.generation.searchStats=stats;
      out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
      out.generation.measured=true;
    }
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);
