(function(root){
  'use strict';
  if(!root.RegionSumSegments||!root.SudokuGenerator)return;

  var rs=root.RegionSumSegments,generator=root.SudokuGenerator,baseCount=generator.countVariantSolutions,baseMake=generator.make;

  function countRegionSumSolutions(source,variant,limit,stats){
    limit=limit||2;stats=stats||{};stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.solutions=0;
    var grid=source.map(function(row){return row.slice();}),n=grid.length,dims=rs.boxDims(n),bh=dims[0],bw=dims[1],full=(1<<n)-1;
    var rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),lines=(variant.data&&variant.data.lines)||[],found=0;
    function boxIndex(r,c){return Math.floor(r/bh)*Math.floor(n/bw)+Math.floor(c/bw);}
    function touches(line,r,c){for(var i=0;i<line.length;i++)if(line[i][0]===r&&line[i][1]===c)return true;return false;}
    function regionValidAt(r,c){for(var i=0;i<lines.length;i++)if(touches(lines[i],r,c)&&!rs.valid(grid,lines[i]))return false;return true;}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      var v=grid[r][c];if(!v)continue;var bit=1<<(v-1),b=boxIndex(r,c);
      if(v<1||v>n||((rows[r]|cols[c]|boxes[b])&bit))return 0;
      rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;
    }
    for(var li=0;li<lines.length;li++)if(!rs.valid(grid,lines[li]))return 0;
    function visit(){
      if(found>=limit)return;stats.nodes++;
      var br=-1,bc=-1,bm=0,best=n+1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var bb=boxIndex(rr,cc),mask=full&~(rows[rr]|cols[cc]|boxes[bb]),cnt=0;
        for(var m=mask;m;m&=m-1)cnt++;
        if(!cnt){stats.deadEnds++;return;}
        if(cnt<best){br=rr;bc=cc;bm=mask;best=cnt;if(cnt===1)break;}
      }
      if(br<0){for(var i=0;i<lines.length;i++)if(!rs.valid(grid,lines[i])){stats.deadEnds++;return;}found++;stats.solutions=found;return;}
      if(best>1)stats.branches++;
      var box=boxIndex(br,bc);
      for(var bits=bm;bits;bits&=bits-1){
        var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);
        grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;boxes[box]|=one;
        if(regionValidAt(br,bc))visit();else stats.deadEnds++;
        rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;
        if(found>=limit)return;
      }
    }
    visit();return found;
  }

  generator.countRegionSumSolutions=countRegionSumSolutions;
  generator.countVariantSolutions=function(source,variant,limit,stats){
    if(variant&&variant.kind==='regionsum')return countRegionSumSolutions(source,variant,limit,stats);
    return baseCount.call(this,source,variant,limit,stats);
  };

  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function cloneObject(value){return JSON.parse(JSON.stringify(value));}
  function cloneRng(seed){
    var x=seed>>>0;
    return function(){
      x=(x+0x6D2B79F5)>>>0;
      var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function cloneShuffle(list,random){for(var i=list.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=list[i];list[i]=list[j];list[j]=t;}return list;}
  function cloneBoxIndex(cell){return Math.floor(cell[0]/3)*3+Math.floor(cell[1]/3);}
  function clonePairCompatible(a,b){
    if(a.length!==b.length)return false;
    for(var i=0;i<a.length;i++)if(a[i][0]===b[i][0]||a[i][1]===b[i][1]||cloneBoxIndex(a[i])===cloneBoxIndex(b[i]))return false;
    var seen={};
    for(i=0;i<a.length;i++){seen[a[i][0]+','+a[i][1]]=1;if(seen[b[i][0]+','+b[i][1]])return false;seen[b[i][0]+','+b[i][1]]=1;}
    return true;
  }
  function freshClassicSolution(seed){
    var random=cloneRng((seed^0x434C4F4E)>>>0),grid=Array.from({length:9},function(){return Array(9).fill(0);}),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),full=511;
    function fill(){
      var br=-1,bc=-1,bm=0,best=10;
      for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(!grid[r][c]){var b=Math.floor(r/3)*3+Math.floor(c/3),mask=full&~(rows[r]|cols[c]|boxes[b]),count=0;for(var m=mask;m;m&=m-1)count++;if(count<best){br=r;bc=c;bm=mask;best=count;if(count===1)break;}}
      if(br<0)return true;if(!bm)return false;
      var digits=[];for(var bits=bm;bits;bits&=bits-1){var one=bits&-bits;digits.push({bit:one,digit:1+Math.round(Math.log(one)/Math.LN2)});}cloneShuffle(digits,random);
      var box=Math.floor(br/3)*3+Math.floor(bc/3);
      for(var i=0;i<digits.length;i++){var d=digits[i];grid[br][bc]=d.digit;rows[br]|=d.bit;cols[bc]|=d.bit;boxes[box]|=d.bit;if(fill())return true;rows[br]^=d.bit;cols[bc]^=d.bit;boxes[box]^=d.bit;grid[br][bc]=0;}
      return false;
    }
    if(!fill())throw new Error('Clone solution generation exhausted');
    return grid;
  }
  function translatedCloneGroups(solution,seed){
    var shapes=[[[0,0],[0,1],[1,0]],[[0,0],[0,1]],[[0,0],[1,0]]],random=cloneRng((seed^0x53484150)>>>0),pairs=[];
    for(var si=0;si<shapes.length;si++){
      var shape=shapes[si],placements=[],maxR=Math.max.apply(null,shape.map(function(p){return p[0];})),maxC=Math.max.apply(null,shape.map(function(p){return p[1];}));
      for(var r=0;r<9-maxR;r++)for(var c=0;c<9-maxC;c++){
        var cells=shape.map(function(p){return [r+p[0],c+p[1]];}),signature=cells.map(function(p){return solution[p[0]][p[1]];}).join(',');
        placements.push({cells:cells,signature:signature});
      }
      for(var a=0;a<placements.length;a++)for(var b=a+1;b<placements.length;b++)if(placements[a].signature===placements[b].signature&&clonePairCompatible(placements[a].cells,placements[b].cells))pairs.push([placements[a].cells,placements[b].cells]);
      if(pairs.length)break;
    }
    if(!pairs.length)throw new Error('Clone topology generation exhausted');
    cloneShuffle(pairs,random);return pairs[0];
  }
  function cloneTarget(difficulty){return difficulty==='gentle'?40:(difficulty==='expert'?27:32);}
  function makeClonePuzzle(variant,seed,difficulty){
    difficulty=difficulty||'focused';var target=cloneTarget(difficulty),cacheKey=(variant.id||'clone')+':'+(seed>>>0)+':'+difficulty,random=cloneRng((seed^0x52454D56)>>>0);
    for(var attempt=0;attempt<20;attempt++){
      var actualSeed=((seed>>>0)^Math.imul(attempt+1,0x9E3779B1))>>>0,solution=freshClassicSolution(actualSeed),groups;
      try{groups=translatedCloneGroups(solution,actualSeed);}catch(error){continue;}
      var candidate=cloneObject(variant);candidate.solution=cloneGrid(solution);candidate.data=Object.assign({},candidate.data||{},{clones:groups.map(function(group){return group.map(function(p){return p.slice();});})});
      if(generator.countVariantSolutions(solution,candidate,2)!==1)continue;
      var grid=cloneGrid(solution),order=Array.from({length:81},function(_,i){return i;});cloneShuffle(order,random);var clues=81;
      for(var oi=0;oi<order.length&&clues>target;oi++){
        var idx=order[oi],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;
        if(generator.countVariantSolutions(grid,candidate,2)!==1)grid[r][c]=old;else clues--;
      }
      var essential=generator.countSolutions(grid,2)!==1;
      if(!essential){cloneShuffle(order,random);for(oi=0;oi<order.length&&!essential;oi++){idx=order[oi];r=Math.floor(idx/9);c=idx%9;old=grid[r][c];if(!old)continue;grid[r][c]=0;if(generator.countVariantSolutions(grid,candidate,2)!==1)grid[r][c]=old;else{clues--;essential=generator.countSolutions(grid,2)!==1;}}}
      if(!essential)continue;
      var stats={},unique=generator.countVariantSolutions(grid,candidate,2,stats)===1;if(!unique)continue;
      candidate.puzzle=grid;candidate.generation={seed:seed>>>0,clues:clues,unique:true,verification:'solver-verified',generatorFamily:'clone-fresh-fill-matched-shapes',difficultyScore:(stats.nodes||0)+(stats.branches||0)*3+(stats.deadEnds||0)*2,mode:'seeded-variant-essential',variantEssential:true,topologyFingerprint:groups.map(function(group){return group.map(function(p){return p.join(',');}).join(';');}).join('|')};
      return candidate;
    }
    throw new Error('Clone generation failed for seed '+seed+' / '+difficulty);
  }
  var cloneCache=new Map();
  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.kind!=='clone')return baseMake.call(this,variant,seed,difficulty);
    var key=(variant.id||'clone')+':'+(seed>>>0)+':'+(difficulty||'focused');
    if(cloneCache.has(key))return cloneObject(cloneCache.get(key));
    var out=makeClonePuzzle(variant,seed>>>0,difficulty||'focused');cloneCache.set(key,cloneObject(out));if(cloneCache.size>48)cloneCache.delete(cloneCache.keys().next().value);return cloneObject(out);
  };

  function classicConflict(grid,r,c){
    var v=grid[r][c],n=grid.length;if(!v)return false;
    for(var i=0;i<n;i++){if(i!==c&&grid[r][i]===v)return true;if(i!==r&&grid[i][c]===v)return true;}
    var dims=rs.boxDims(n),br=Math.floor(r/dims[0])*dims[0],bc=Math.floor(c/dims[1])*dims[1];
    for(var rr=br;rr<br+dims[0];rr++)for(var cc=bc;cc<bc+dims[1];cc++)if((rr!==r||cc!==c)&&grid[rr][cc]===v)return true;
    return false;
  }
  function regionConflict(variant,grid,r,c){
    var lines=(variant.data&&variant.data.lines)||[];
    for(var i=0;i<lines.length;i++)if(lines[i].some(function(p){return p[0]===r&&p[1]===c;})&&!rs.valid(grid,lines[i]))return true;
    return false;
  }
  function readGrid(board,n){
    var nodes=board.querySelectorAll('.sudoku-cell'),grid=Array.from({length:n},function(){return Array(n).fill(0);});
    for(var i=0;i<Math.min(nodes.length,n*n);i++){
      var node=nodes[i];if(node.querySelector('.sudoku-notes'))continue;var text=(node.textContent||'').trim();
      if(/^\d+$/.test(text)){var v=Number(text);if(v>=1&&v<=n)grid[Math.floor(i/n)][i%n]=v;}
    }
    return grid;
  }
  function correctRegionSumClasses(host){
    var id=root.SudokuLibraryState&&root.SudokuLibraryState.currentId,variant=root.SudokuBank&&root.SudokuBank.find(function(v){return v.id===id;});
    if(!variant||variant.kind!=='regionsum')return;
    var board=host.querySelector('.sudoku-board');
    if(!board)return;
    var n=variant.solution.length,nodes=board.querySelectorAll('.sudoku-cell');
    if(nodes.length<n*n)return;
    var grid=readGrid(board,n);
    for(var i=0;i<n*n;i++){var r=Math.floor(i/n),c=i%n;nodes[i].classList.toggle('conflict',classicConflict(grid,r,c)||regionConflict(variant,grid,r,c));}
  }

  function lkSign(x){return x<0?-1:(x>0?1:0);}
  function lkArrow(dr,dc){return {'-1,-1':'↖','-1,1':'↗','1,-1':'↙','1,1':'↘'}[dr+','+dc]||'↘';}
  function littleKillerRawAnchor(clue,n,cell){
    if(!clue||!clue.cells||clue.cells.length<2)return null;
    var a=clue.cells[0],b=clue.cells[1],dr=lkSign(b[0]-a[0]),dc=lkSign(b[1]-a[1]);
    if(!dr||!dc)return null;
    var size=n*cell,extension=.78,x=(a[1]+.5-dc*extension)*cell,y=(a[0]+.5-dr*extension)*cell,side;
    if(y<0)side='top';else if(y>size)side='bottom';else if(x<0)side='left';else if(x>size)side='right';else{
      var distances={top:y,bottom:size-y,left:x,right:size-x},best='top';Object.keys(distances).forEach(function(k){if(distances[k]<distances[best])best=k;});side=best;
    }
    return{x:x,y:y,side:side,arrow:lkArrow(dr,dc),sum:clue.sum};
  }
  function littleKillerLayout(clues,n,boardSize){
    var cell=boardSize/n,points=[];(clues||[]).forEach(function(cl){var p=littleKillerRawAnchor(cl,n,cell);if(p)points.push(p);});
    var groups={top:[],bottom:[],left:[],right:[]},gap=Math.max(42,cell*.82);
    points.forEach(function(p){groups[p.side].push(p);});
    Object.keys(groups).forEach(function(side){var list=groups[side],horizontal=side==='top'||side==='bottom';list.sort(function(a,b){return(horizontal?a.x:a.y)-(horizontal?b.x:b.y);});var last=[-Infinity,-Infinity,-Infinity];list.forEach(function(p){var coord=horizontal?p.x:p.y,lane=0;while(lane<last.length&&coord-last[lane]<gap)lane++;if(lane===last.length)lane=last.indexOf(Math.min.apply(null,last));p.lane=lane;last[lane]=coord;});});
    var laneStep=Math.max(20,Math.min(28,cell*.38));points.forEach(function(p){var d=(p.lane||0)*laneStep;if(p.side==='top')p.y-=d;else if(p.side==='bottom')p.y+=d;else if(p.side==='left')p.x-=d;else if(p.side==='right')p.x+=d;});return points;
  }
  function correctLittleKillerLayout(host){
    var id=root.SudokuLibraryState&&root.SudokuLibraryState.currentId,variant=root.SudokuBank&&root.SudokuBank.find(function(v){return v.id===id;});
    if(!variant||variant.kind!=='littlekiller'||!variant.data||!variant.data.clues)return;
    var shell=host.querySelector('.sudoku-board-shell.has-littlekiller-clues'),board=shell&&shell.querySelector('.sudoku-board');if(!shell||!board)return;
    var markers=Array.prototype.slice.call(shell.querySelectorAll('.sudoku-littlekiller-clue')),clues=variant.data.clues;if(markers.length!==clues.length)return;
    var size=board.getBoundingClientRect().width;if(!size)return;
    shell.style.margin='72px 58px';shell.style.overflow='visible';
    var points=littleKillerLayout(clues,variant.solution.length,size),ox=board.offsetLeft,oy=board.offsetTop;
    markers.forEach(function(marker,i){var p=points[i];if(!p)return;marker.textContent=String(p.sum)+p.arrow;marker.dataset.lkSide=p.side;marker.dataset.lkLane=String(p.lane||0);marker.style.left=(ox+p.x)+'px';marker.style.top=(oy+p.y)+'px';});
  }

  function installUiHardening(){
    if(!root.LogicRoom||!root.LogicRoom.games)return;
    var game=root.LogicRoom.games.find(function(g){return g.id==='sudoku-library';});if(!game||game.__regionSumHardened)return;
    var baseMount=game.mount;game.__regionSumHardened=true;
    game.mount=function(api){
      var inst=baseMount.call(this,api),host=document.getElementById('game-stage'),busy=false,queued=false;
      function fix(){if(busy)return;busy=true;try{if(host){correctRegionSumClasses(host);}}finally{busy=false;}}
      function queue(){if(queued)return;queued=true;Promise.resolve().then(function(){queued=false;fix();});}
      var observer=host&&typeof MutationObserver!=='undefined'?new MutationObserver(queue):null;
      if(observer)observer.observe(host,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
      var resizeObserver=host&&typeof ResizeObserver!=='undefined'?new ResizeObserver(queue):null;if(resizeObserver)resizeObserver.observe(host);
      queue();
      var oldDestroy=inst&&inst.destroy;if(inst)inst.destroy=function(){if(observer)observer.disconnect();if(resizeObserver)resizeObserver.disconnect();if(oldDestroy)oldDestroy.call(inst);};
      return inst;
    };
  }
  installUiHardening();

  root.LittleKillerRenderHardening={layout:littleKillerLayout,correct:correctLittleKillerLayout};
  root.RegionSumRuntimeHardening={countRegionSumSolutions:countRegionSumSolutions,classicConflict:classicConflict,regionConflict:regionConflict,correctRegionSumClasses:correctRegionSumClasses,makeClonePuzzle:makeClonePuzzle,translatedCloneGroups:translatedCloneGroups};
})(typeof window!=='undefined'?window:globalThis);
