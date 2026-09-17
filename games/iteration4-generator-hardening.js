(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(r){return r.slice();});}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function bits(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function targets(d){return d==='gentle'?40:(d==='expert'?27:32);}
  function latinCount(source,limit){
    var grid=clone(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),found=0;
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){var v=grid[r][c];if(!v)continue;var b=1<<(v-1);if((rows[r]|cols[c])&b)return 0;rows[r]|=b;cols[c]|=b;}
    function visit(){if(found>=limit)return;var br=-1,bc=-1,bm=0,best=n+1;for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){var m=full&~(rows[rr]|cols[cc]),k=bits(m);if(k<best){br=rr;bc=cc;bm=m;best=k;if(k<=1)break;}}if(br<0){found++;return;}if(!bm)return;for(var m=bm;m;m&=m-1){var one=m&-m,d=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;visit();rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;if(found>=limit)return;}}
    visit();return found;
  }
  function specialValid(variant,grid,r,c){
    var d=variant.data||{};
    if(variant.kind==='magicsquare'){
      var cells=d.cells||[],touch=cells.some(function(p){return p[0]===r&&p[1]===c;});if(!touch)return true;
      var lines=[[[3,3],[3,4],[3,5]],[[4,3],[4,4],[4,5]],[[5,3],[5,4],[5,5]],[[3,3],[4,3],[5,3]],[[3,4],[4,4],[5,4]],[[3,5],[4,5],[5,5]],[[3,3],[4,4],[5,5]],[[3,5],[4,4],[5,3]]];
      for(var i=0;i<lines.length;i++){var vals=lines[i].map(function(p){return grid[p[0]][p[1]];}),sum=vals.reduce(function(a,v){return a+(v||0);},0),missing=vals.filter(function(v){return !v;}).length;if(sum+missing>15||sum+missing*9<15)return false;if(!missing&&sum!==15)return false;}
      return true;
    }
    if(variant.kind==='uniqueline'){
      var lines=d.lines||[];for(var li=0;li<lines.length;li++){var line=lines[li];if(!line.some(function(p){return p[0]===r&&p[1]===c;}))continue;var seen={};for(var j=0;j<line.length;j++){var v=grid[line[j][0]][line[j][1]];if(v&&seen[v])return false;if(v)seen[v]=1;}}
    }
    return true;
  }
  function countSpecial(source,variant,limit,stats){
    var grid=clone(source),full=511,rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),found=0;stats=stats||{};stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.solutions=0;
    for(var r=0;r<9;r++)for(var c=0;c<9;c++){var v=grid[r][c];if(!v)continue;var one=1<<(v-1),box=Math.floor(r/3)*3+Math.floor(c/3);if((rows[r]|cols[c]|boxes[box])&one||!specialValid(variant,grid,r,c))return 0;rows[r]|=one;cols[c]|=one;boxes[box]|=one;}
    function visit(){if(found>=limit)return;stats.nodes++;var br=-1,bc=-1,bm=0,best=10;for(var rr=0;rr<9;rr++)for(var cc=0;cc<9;cc++)if(!grid[rr][cc]){var box=Math.floor(rr/3)*3+Math.floor(cc/3),mask=full&~(rows[rr]|cols[cc]|boxes[box]),allowed=0;for(var m=mask;m;m&=m-1){var one=m&-m,d=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=d;if(specialValid(variant,grid,rr,cc))allowed|=one;grid[rr][cc]=0;}var k=bits(allowed);if(k<best){br=rr;bc=cc;bm=allowed;best=k;if(k<=1)break;}}if(br<0){found++;stats.solutions++;return;}if(!bm){stats.deadEnds++;return;}if(best>1)stats.branches++;var box=Math.floor(br/3)*3+Math.floor(bc/3);for(var m=bm;m;m&=m-1){var one=m&-m,d=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;boxes[box]|=one;visit();rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;if(found>=limit)return;}}
    visit();return found;
  }
  function buildEssential(variant,seed,difficulty,countVariant,countBaseline,family){
    var target=targets(difficulty),coreTarget=targets('expert'),grid=clone(variant.solution),order=shuffle(Array.from({length:81},function(_,i){return i;}),rng((seed>>>0)^0x174A4D)),clues=81;
    for(var i=0;i<order.length&&clues>coreTarget;i++){var idx=order[i],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;if(countVariant(grid,2,{})!==1)grid[r][c]=old;else clues--;}
    var essential=countBaseline(grid,2)!==1;
    if(!essential){order=shuffle(order.slice(),rng((seed>>>0)^0xE55E471A));for(i=0;i<order.length&&!essential;i++){idx=order[i];r=Math.floor(idx/9);c=idx%9;old=grid[r][c];if(!old)continue;grid[r][c]=0;if(countVariant(grid,2,{})!==1)grid[r][c]=old;else{clues--;essential=countBaseline(grid,2)!==1;}}}
    var restoreOrder=shuffle(Array.from({length:81},function(_,i){return i;}),rng((seed>>>0)^0xD1FF1C01));
    for(i=0;i<restoreOrder.length&&clues<target;i++){
      idx=restoreOrder[i];r=Math.floor(idx/9);c=idx%9;if(grid[r][c])continue;
      grid[r][c]=variant.solution[r][c];
      if(countBaseline(grid,2)===1)grid[r][c]=0;else clues++;
    }
    essential=countBaseline(grid,2)!==1;
    var stats={},unique=countVariant(grid,2,stats)===1,out=JSON.parse(JSON.stringify(variant));out.puzzle=grid;out.generation={seed:seed>>>0,clues:clues,unique:unique,verification:unique?'solver-verified':'unverified',generatorFamily:family,difficultyScore:(stats.nodes||0)+(stats.branches||0)*3+(stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:essential};return out;
  }
  function antiKinds(kind){return kind==='anti-king'||kind==='anti-knight'||kind==='nonconsecutive';}
  function antiCandidateValid(kind,grid,r,c,value){
    var i,rr,cc,other;
    if(kind==='anti-king'){
      for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){
        if(!dr&&!dc)continue;rr=r+dr;cc=c+dc;
        if(rr>=0&&rr<9&&cc>=0&&cc<9&&grid[rr][cc]===value)return false;
      }
    }else if(kind==='anti-knight'){
      var km=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
      for(i=0;i<km.length;i++){rr=r+km[i][0];cc=c+km[i][1];if(rr>=0&&rr<9&&cc>=0&&cc<9&&grid[rr][cc]===value)return false;}
    }else if(kind==='nonconsecutive'){
      var orth=[[1,0],[-1,0],[0,1],[0,-1]];
      for(i=0;i<orth.length;i++){rr=r+orth[i][0];cc=c+orth[i][1];if(rr<0||rr>=9||cc<0||cc>=9)continue;other=grid[rr][cc];if(other&&Math.abs(other-value)===1)return false;}
    }
    return true;
  }
  function seededAntiSolution(kind,seed,nodeLimit){
    var grid=Array.from({length:9},function(){return Array(9).fill(0);}),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),full=511,nodes=0,random=rng((seed^0x414E5449)>>>0),solved=false;
    function candidates(r,c){
      var box=Math.floor(r/3)*3+Math.floor(c/3),mask=full&~(rows[r]|cols[c]|boxes[box]),allowed=[];
      for(var m=mask;m;m&=m-1){var one=m&-m,d=1+Math.round(Math.log(one)/Math.LN2);if(antiCandidateValid(kind,grid,r,c,d))allowed.push(d);}
      return allowed;
    }
    function visit(){
      if(solved||nodes++>=nodeLimit)return;
      var br=-1,bc=-1,best=null;
      for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(!grid[r][c]){
        var cand=candidates(r,c);
        if(!cand.length)return;
        if(best===null||cand.length<best.length){br=r;bc=c;best=cand;if(cand.length===1)break;}
      }
      if(br<0){solved=true;return;}
      shuffle(best,random);
      var box=Math.floor(br/3)*3+Math.floor(bc/3);
      for(var i=0;i<best.length&&!solved;i++){
        var d=best[i],one=1<<(d-1);grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;boxes[box]|=one;
        visit();
        if(!solved){rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;}
      }
    }
    visit();
    return solved?{solution:grid,nodes:nodes}:null;
  }
  function seededNonconsecutiveSolution(seed){
    var firstBand=[[0,1,2],[1,0,2],[1,2,0],[2,1,0]],lastBand=[[6,7,8],[6,8,7],[8,6,7],[8,7,6]],map=[1,6,2,7,3,8,4,9,5],shifts=[0,3,6,1,4,7,2,5,8];
    var a=firstBand[seed&3],b=lastBand[(seed>>>2)&3],rows=a.concat([3,4,5],b),mask=(seed>>>4)&7,cols=[];
    for(var stack=0;stack<3;stack++){
      var x=stack*3,part=(mask&(1<<stack))?[x+2,x+1,x]:[x,x+1,x+2];
      cols=cols.concat(part);
    }
    var grid=Array.from({length:9},function(_,r){return Array.from({length:9},function(_,c){return map[(shifts[rows[r]]+cols[c])%9];});});
    for(var rr=0;rr<9;rr++)for(var cc=0;cc<9;cc++)if(!antiCandidateValid('nonconsecutive',grid,rr,cc,grid[rr][cc]))return null;
    return {solution:grid,nodes:1,construction:'nonconsecutive-algebraic-template'};
  }
  function makeAntiVariant(variant,seed,difficulty){
    var requested=seed>>>0,MAX_ATTEMPTS=12,NODE_LIMIT=250000;
    for(var attempt=0;attempt<MAX_ATTEMPTS;attempt++){
      var actual=(requested^0x414E5449^Math.imul(attempt+1,0x9E3779B1))>>>0;
      var generated=variant.kind==='nonconsecutive'?seededNonconsecutiveSolution(actual):seededAntiSolution(variant.kind,actual,NODE_LIMIT);
      if(!generated)continue;
      var working=JSON.parse(JSON.stringify(variant));working.solution=generated.solution;
      if(generator.countVariantSolutions(working.solution,working,2)!==1)continue;
      var out=buildEssential(working,actual,difficulty,function(g,l,s){return generator.countVariantSolutions(g,working,l,s);},generator.countSolutions,'anti-constraint-seeded-full-solution');
      if(!out.generation.unique||!out.generation.variantEssential)continue;
      out.solution=generated.solution;
      out.generation.requestedSeed=requested;out.generation.actualSeed=actual;out.generation.seed=requested;out.generation.solutionNodes=generated.nodes;out.generation.solutionAttempt=attempt;out.generation.maxSolutionAttempts=MAX_ATTEMPTS;out.generation.solutionNodeLimit=variant.kind==='nonconsecutive'?1:NODE_LIMIT;if(generated.construction)out.generation.solutionConstruction=generated.construction;
      return out;
    }
    throw new Error('Anti-constraint generation exhausted for '+variant.id+' after '+MAX_ATTEMPTS+' attempts');
  }
  function makeSpecial(variant,seed,difficulty){return buildEssential(variant,seed,difficulty,function(g,l,s){return countSpecial(g,variant,l,s);},generator.countSolutions,'iteration4-constraint-mrv');}
  function makeSharedVariant(variant,seed,difficulty){return buildEssential(variant,seed,difficulty,function(g,l,s){return generator.countVariantSolutions(g,variant,l,s);},generator.countSolutions,'iteration4-shared-variant-mrv');}
  function makeJigsaw(variant,seed,difficulty){return buildEssential(variant,seed,difficulty,function(g,l){return generator.countJigsawSolutions(g,variant.data.regions,l);},latinCount,'irregular-region-unique-removal');}
  generator.countIteration4SpecialSolutions=countSpecial;
  generator.countLatinSolutions=latinCount;
  generator.makeSeededAntiSolution=seededAntiSolution;
  generator.makeSeededNonconsecutiveSolution=seededNonconsecutiveSolution;
  generator.make=function(variant,seed,difficulty){
    difficulty=difficulty||'focused';
    if(variant&&(variant.kind==='magicsquare'||variant.kind==='uniqueline'))return makeSpecial(variant,seed,difficulty);
    if(variant&&(variant.id==='miracle'||variant.id==='asterisk'))return makeSharedVariant(variant,seed,difficulty);
    if(variant&&variant.kind==='jigsaw')return makeJigsaw(variant,seed,difficulty);
    if(variant&&antiKinds(variant.kind))return makeAntiVariant(variant,seed,difficulty);
    return baseMake.call(this,variant,seed,difficulty);
  };
})(globalThis);
