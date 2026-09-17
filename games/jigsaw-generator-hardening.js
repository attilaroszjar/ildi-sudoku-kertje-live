(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.ExtraHouseGeneratorCore)return;

  var generator=root.SudokuGenerator;
  var core=root.ExtraHouseGeneratorCore;
  var baseMake=generator.make;

  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function targets(difficulty){return difficulty==='gentle'?40:(difficulty==='expert'?27:32);}
  function cellKey(r,c){return r*9+c;}
  function neighbours(r,c){var out=[];if(r>0)out.push([r-1,c]);if(r<8)out.push([r+1,c]);if(c>0)out.push([r,c-1]);if(c<8)out.push([r,c+1]);return out;}

  function standardRegions(){
    return Array.from({length:9},function(_,r){return Array.from({length:9},function(_,c){return Math.floor(r/3)*3+Math.floor(c/3);});});
  }

  function regionCells(regions,id){
    var out=[];
    for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(regions[r][c]===id)out.push([r,c]);
    return out;
  }

  function regionConnected(regions,id){
    var cells=regionCells(regions,id);
    if(cells.length!==9)return false;
    var wanted=new Set(cells.map(function(p){return cellKey(p[0],p[1]);}));
    var seen=new Set(),stack=[cells[0]];
    while(stack.length){
      var p=stack.pop(),key=cellKey(p[0],p[1]);
      if(seen.has(key))continue;
      seen.add(key);
      var ns=neighbours(p[0],p[1]);
      for(var i=0;i<ns.length;i++)if(wanted.has(cellKey(ns[i][0],ns[i][1]))&&!seen.has(cellKey(ns[i][0],ns[i][1])))stack.push(ns[i]);
    }
    return seen.size===9;
  }

  function regionsValidForSolution(solution,regions){
    for(var id=0;id<9;id++){
      var cells=regionCells(regions,id);
      if(cells.length!==9||!regionConnected(regions,id))return false;
      var seen=0;
      for(var i=0;i<cells.length;i++){
        var v=solution[cells[i][0]][cells[i][1]],bit=1<<(v-1);
        if(seen&bit)return false;
        seen|=bit;
      }
      if(seen!==0x1ff)return false;
    }
    return true;
  }

  function boundaryCells(regions,a,b){
    var left=[],right=[];
    for(var r=0;r<9;r++)for(var c=0;c<9;c++){
      var id=regions[r][c];
      if(id!==a&&id!==b)continue;
      var ns=neighbours(r,c),touches=false;
      for(var i=0;i<ns.length;i++)if(regions[ns[i][0]][ns[i][1]]===(id===a?b:a)){touches=true;break;}
      if(touches)(id===a?left:right).push([r,c]);
    }
    return [left,right];
  }

  function candidateRegionPairs(regions){
    var set=new Set(),out=[];
    for(var r=0;r<9;r++)for(var c=0;c<9;c++){
      var a=regions[r][c],ns=neighbours(r,c);
      for(var i=0;i<ns.length;i++){
        var b=regions[ns[i][0]][ns[i][1]];
        if(a===b)continue;
        var lo=Math.min(a,b),hi=Math.max(a,b),key=lo+','+hi;
        if(!set.has(key)){set.add(key);out.push([lo,hi]);}
      }
    }
    return out;
  }

  function irregularRegions(solution,seed){
    var regions=standardRegions(),random=core.rng((seed^0x4a494753)>>>0),accepted=0,attempts=0;
    while(attempts<720&&accepted<18){
      attempts++;
      var pairs=candidateRegionPairs(regions);
      core.shuffle(pairs,random);
      var changed=false;
      for(var pi=0;pi<pairs.length&&!changed;pi++){
        var a=pairs[pi][0],b=pairs[pi][1],boundary=boundaryCells(regions,a,b),left=boundary[0],right=boundary[1],swaps=[];
        for(var i=0;i<left.length;i++)for(var j=0;j<right.length;j++){
          var p=left[i],q=right[j];
          if(solution[p[0]][p[1]]===solution[q[0]][q[1]])swaps.push([p,q]);
        }
        core.shuffle(swaps,random);
        for(var si=0;si<swaps.length&&!changed;si++){
          var x=swaps[si][0],y=swaps[si][1];
          regions[x[0]][x[1]]=b;regions[y[0]][y[1]]=a;
          if(regionConnected(regions,a)&&regionConnected(regions,b)){
            accepted++;changed=true;
          }else{
            regions[x[0]][x[1]]=a;regions[y[0]][y[1]]=b;
          }
        }
      }
      if(!changed&&attempts>180)break;
    }
    return {regions:regions,acceptedSwaps:accepted,attempts:attempts,valid:accepted>=4&&regionsValidForSolution(solution,regions)};
  }

  function carve(solution,regions,seed,difficulty){
    var grid=cloneGrid(solution),target=targets(difficulty),random=core.rng((seed^0x43415256)>>>0),order=Array.from({length:81},function(_,i){return i;}),clues=81;
    core.shuffle(order,random);
    for(var oi=0;oi<order.length&&clues>target;oi++){
      var idx=order[oi],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];
      grid[r][c]=0;
      if(generator.countJigsawSolutions(grid,regions,2)!==1)grid[r][c]=old;else clues--;
    }

    var essential=generator.countSolutions(grid,2)!==1;
    if(!essential){
      core.shuffle(order,random);
      for(oi=0;oi<order.length&&!essential;oi++){
        idx=order[oi];r=Math.floor(idx/9);c=idx%9;old=grid[r][c];
        if(!old)continue;
        grid[r][c]=0;
        if(generator.countJigsawSolutions(grid,regions,2)!==1)grid[r][c]=old;
        else{clues--;essential=generator.countSolutions(grid,2)!==1;}
      }
    }

    if(!essential)return null;

    var restore=Array.from({length:81},function(_,i){return i;});
    core.shuffle(restore,core.rng((seed^0x52455354)>>>0));
    for(var ri=0;ri<restore.length&&clues<target;ri++){
      idx=restore[ri];r=Math.floor(idx/9);c=idx%9;
      if(grid[r][c])continue;
      grid[r][c]=solution[r][c];
      if(generator.countSolutions(grid,2)===1)grid[r][c]=0;else clues++;
    }

    if(generator.countJigsawSolutions(grid,regions,2)!==1||generator.countSolutions(grid,2)===1)return null;
    return {puzzle:grid,clues:clues};
  }

  function makeJigsaw(variant,seed,difficulty){
    difficulty=difficulty||'focused';
    var topology=core.compile([]),baseSeed=seed>>>0;
    for(var attempt=0;attempt<8;attempt++){
      var mixed=(baseSeed^Math.imul(attempt+1,0x9e3779b1))>>>0;
      var fresh;
      try{
        fresh=core.freshSolution(topology,mixed,{maxAttempts:2,nodeLimit:220000,seedXor:0x4a534f4c,attemptMix:0x85ebca6b,label:'Jigsaw'});
      }catch(error){continue;}
      var topo=irregularRegions(fresh.grid,(mixed^0x544f504f)>>>0);
      if(!topo.valid)continue;
      var carved=carve(fresh.grid,topo.regions,(mixed^0x50555a5a)>>>0,difficulty);
      if(!carved)continue;
      var out=JSON.parse(JSON.stringify(variant));
      out.solution=cloneGrid(fresh.grid);
      out.puzzle=carved.puzzle;
      out.data=out.data||{};
      out.data.regions=topo.regions.map(function(row){return row.slice();});
      out.generation={
        seed:baseSeed,
        clues:carved.clues,
        unique:true,
        verification:'solver-verified',
        generatorFamily:'jigsaw-fresh-solution-irregular-regions',
        solutionGenerationNodes:fresh.totalNodes,
        solutionGenerationAttempts:fresh.attempts,
        topologySwaps:topo.acceptedSwaps,
        topologyAttempts:topo.attempts,
        mode:'seeded-variant-essential',
        variantEssential:true
      };
      return out;
    }
    throw new Error('Jigsaw production generation exhausted after 8 deterministic attempts');
  }

  generator.make=function(variant,seed,difficulty){
    if(variant&&variant.kind==='jigsaw')return makeJigsaw(variant,seed,difficulty);
    return baseMake.call(this,variant,seed,difficulty);
  };
  generator.makeProductionJigsaw=makeJigsaw;
  generator.jigsawRegionsValidForSolution=regionsValidForSolution;
})(globalThis);
