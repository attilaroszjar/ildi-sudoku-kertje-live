(function(root){
  'use strict';
  if(root.ExtraHouseGeneratorCore)return;

  function clone(grid){return grid.map(function(row){return row.slice();});}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(values,random){for(var i=values.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),tmp=values[i];values[i]=values[j];values[j]=tmp;}return values;}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function digitForBit(one){return 1+Math.round(Math.log(one)/Math.LN2);}

  function compile(extraHouses){
    var houses=(extraHouses||[]).map(function(house){return house.map(function(cell){return [cell[0],cell[1]];});});
    var cellHouses=Array.from({length:81},function(){return [];});
    for(var h=0;h<houses.length;h++)for(var i=0;i<houses[h].length;i++){
      var cell=houses[h][i],r=cell[0],c=cell[1];
      if(r<0||r>8||c<0||c>8)throw new Error('Invalid extra-house cell '+r+','+c);
      cellHouses[r*9+c].push(h);
    }
    return {houses:houses,cellHouses:cellHouses};
  }

  function extraUsed(extraMasks,topology,r,c){
    var list=topology.cellHouses[r*9+c],used=0;
    for(var i=0;i<list.length;i++)used|=extraMasks[list[i]];
    return used;
  }
  function addExtra(extraMasks,topology,r,c,bit){var list=topology.cellHouses[r*9+c];for(var i=0;i<list.length;i++)extraMasks[list[i]]|=bit;}
  function removeExtra(extraMasks,topology,r,c,bit){var list=topology.cellHouses[r*9+c];for(var i=0;i<list.length;i++)extraMasks[list[i]]^=bit;}

  function solve(source,topology,limit,stats){
    var grid=clone(source),full=0x1ff,rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),extra=Array(topology.houses.length).fill(0),found=0;
    stats=stats||{};stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.solutions=0;
    for(var r=0;r<9;r++)for(var c=0;c<9;c++){
      var v=grid[r][c];if(!v)continue;
      var bit=1<<(v-1),box=Math.floor(r/3)*3+Math.floor(c/3),used=rows[r]|cols[c]|boxes[box]|extraUsed(extra,topology,r,c);
      if(used&bit)return 0;
      rows[r]|=bit;cols[c]|=bit;boxes[box]|=bit;addExtra(extra,topology,r,c,bit);
    }
    function visit(){
      if(found>=limit)return;stats.nodes++;
      var br=-1,bc=-1,bm=0,best=10;
      for(var rr=0;rr<9;rr++)for(var cc=0;cc<9;cc++)if(!grid[rr][cc]){
        var box=Math.floor(rr/3)*3+Math.floor(cc/3),used=rows[rr]|cols[cc]|boxes[box]|extraUsed(extra,topology,rr,cc),mask=full&~used,count=bitCount(mask);
        if(!count){stats.deadEnds++;return;}
        if(count<best){br=rr;bc=cc;bm=mask;best=count;}
      }
      if(br<0){found++;stats.solutions++;return;}
      if(best>1)stats.branches++;
      var box=Math.floor(br/3)*3+Math.floor(bc/3);
      for(var bits=bm;bits;bits&=bits-1){
        var one=bits&-bits,digit=digitForBit(one);grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;boxes[box]|=one;addExtra(extra,topology,br,bc,one);
        visit();
        removeExtra(extra,topology,br,bc,one);rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;
        if(found>=limit)return;
      }
    }
    visit();return found;
  }

  function freshAttempt(topology,seed,nodeLimit){
    var full=0x1ff,grid=Array.from({length:9},function(){return Array(9).fill(0);}),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),extra=Array(topology.houses.length).fill(0),random=rng(seed>>>0),nodes=0,exhausted=false;
    function fill(){
      if(++nodes>nodeLimit){exhausted=true;return false;}
      var best=10,candidates=[];
      for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(!grid[r][c]){
        var box=Math.floor(r/3)*3+Math.floor(c/3),used=rows[r]|cols[c]|boxes[box]|extraUsed(extra,topology,r,c),mask=full&~used,count=bitCount(mask);
        if(!count)return false;
        if(count<best){best=count;candidates=[{r:r,c:c,mask:mask}];}
        else if(count===best)candidates.push({r:r,c:c,mask:mask});
      }
      if(!candidates.length)return true;
      var pick=candidates[Math.floor(random()*candidates.length)],choices=[];
      for(var mask=pick.mask;mask;mask&=mask-1)choices.push(mask&-mask);
      shuffle(choices,random);
      var box=Math.floor(pick.r/3)*3+Math.floor(pick.c/3);
      for(var i=0;i<choices.length;i++){
        var one=choices[i],digit=digitForBit(one);grid[pick.r][pick.c]=digit;rows[pick.r]|=one;cols[pick.c]|=one;boxes[box]|=one;addExtra(extra,topology,pick.r,pick.c,one);
        if(fill())return true;
        removeExtra(extra,topology,pick.r,pick.c,one);rows[pick.r]^=one;cols[pick.c]^=one;boxes[box]^=one;grid[pick.r][pick.c]=0;
        if(exhausted)return false;
      }
      return false;
    }
    return fill()?{grid:grid,nodes:nodes}:null;
  }

  function freshSolution(topology,seed,options){
    options=options||{};
    var base=seed>>>0,maxAttempts=options.maxAttempts||1,nodeLimit=options.nodeLimit||250000,seedXor=(options.seedXor||0)>>>0,attemptMix=(options.attemptMix||0)>>>0,totalNodes=0;
    for(var attempt=0;attempt<maxAttempts;attempt++){
      var mixed=attemptMix?Math.imul(attempt+1,attemptMix):0,attemptSeed=(base^seedXor^mixed)>>>0,result=freshAttempt(topology,attemptSeed,nodeLimit);
      if(result){return {grid:result.grid,nodes:result.nodes,totalNodes:totalNodes+result.nodes,attempts:attempt+1};}
      totalNodes+=nodeLimit;
    }
    throw new Error((options.label||'Extra-house')+' fresh solution generation exhausted after '+maxAttempts+' deterministic attempt'+(maxAttempts===1?'':'s'));
  }

  function makeVariant(generator,variant,seed,difficulty,extraHouses,options){
    options=options||{};
    var topology=compile(extraHouses),targets=options.targets||{gentle:40,focused:32,expert:27},target=targets[difficulty]||targets.focused||32;
    var fresh=freshSolution(topology,seed,options),solution=fresh.grid,grid=clone(solution),order=Array.from({length:81},function(_,i){return i;}),random=rng(((seed>>>0)^(options.carveSeedXor||0))>>>0),clues=81;
    shuffle(order,random);
    for(var oi=0;oi<order.length&&clues>target;oi++){
      var idx=order[oi],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;
      if(solve(grid,topology,2,{})!==1)grid[r][c]=old;else clues--;
    }
    var essential=generator.countSolutions(grid,2)!==1;
    if(!essential){
      shuffle(order,random);
      for(oi=0;oi<order.length&&!essential;oi++){
        idx=order[oi];r=Math.floor(idx/9);c=idx%9;old=grid[r][c];if(!old)continue;grid[r][c]=0;
        if(solve(grid,topology,2,{})!==1)grid[r][c]=old;else{clues--;essential=generator.countSolutions(grid,2)!==1;}
      }
    }
    if(!essential)throw new Error((options.label||'Extra-house')+' variant-essential generation exhausted');
    var stats={},unique=solve(grid,topology,2,stats)===1,out=JSON.parse(JSON.stringify(variant));
    out.solution=solution;out.puzzle=grid;
    out.generation={seed:seed>>>0,clues:clues,unique:unique,verification:unique?'solver-verified':'unverified',generatorFamily:options.generatorFamily||'extra-house-fresh-fill-mrv',solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:stats.nodes+stats.branches*3+stats.deadEnds*2,mode:'seeded-variant-essential',variantEssential:essential};
    return out;
  }

  root.ExtraHouseGeneratorCore={compile:compile,solve:solve,freshSolution:freshSolution,makeVariant:makeVariant,clone:clone,rng:rng,shuffle:shuffle};
})(globalThis);
