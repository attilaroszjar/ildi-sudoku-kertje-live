(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var supported=[4,5,6,7,8];
  var cache=new Map();

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function rng(seed){
    var x=seed>>>0;
    return function(){
      x=(x+0x6D2B79F5)>>>0;
      var t=x;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function shuffle(a,random){
    for(var i=a.length-1;i>0;i--){
      var j=Math.floor(random()*(i+1));
      var t=a[i];a[i]=a[j];a[j]=t;
    }
    return a;
  }

  function edgesFor(n){
    var out=[],r,c;
    for(r=0;r<=n;r++)for(c=0;c<n;c++){
      out.push({a:[r,c],b:[r,c+1],cells:[[r-1,c],[r,c]].filter(function(x){return x[0]>=0&&x[0]<n;})});
    }
    for(r=0;r<n;r++)for(c=0;c<=n;c++){
      out.push({a:[r,c],b:[r+1,c],cells:[[r,c-1],[r,c]].filter(function(x){return x[1]>=0&&x[1]<n;})});
    }
    return out;
  }

  // Propagation-first exact solver. The legacy solver rescanned every clue and
  // every vertex on every binary edge decision. This version maintains the same
  // exact contract but aggressively applies local forced moves before branching.
  function countSlitherlinkFast(puzzle,limit,stats){
    limit=limit||2;
    stats=stats||{};
    stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.solutions=0;stats.forced=0;

    var n=puzzle.length,edges=edgesFor(n),m=edges.length;
    var cellEdges=Array.from({length:n*n},function(){return[];});
    var vertexEdges=Array.from({length:(n+1)*(n+1)},function(){return[];});
    function vk(q){return q[0]*(n+1)+q[1];}
    edges.forEach(function(e,i){
      e.cells.forEach(function(q){cellEdges[q[0]*n+q[1]].push(i);});
      vertexEdges[vk(e.a)].push(i);vertexEdges[vk(e.b)].push(i);
    });

    function fullLoop(vals){
      var used=[],adj=Array.from({length:(n+1)*(n+1)},function(){return[];});
      for(var i=0;i<m;i++)if(vals[i]===1){
        used.push(i);
        var a=vk(edges[i].a),b=vk(edges[i].b);
        adj[a].push(b);adj[b].push(a);
      }
      if(!used.length)return false;
      var start=-1,active=0;
      for(i=0;i<adj.length;i++)if(adj[i].length){
        if(adj[i].length!==2)return false;
        active++;if(start<0)start=i;
      }
      var seen={},stack=[start],count=0;
      while(stack.length){
        var x=stack.pop();if(seen[x])continue;seen[x]=1;count++;
        for(var j=0;j<adj[x].length;j++)if(!seen[adj[x][j]])stack.push(adj[x][j]);
      }
      return count===active;
    }

    function assign(vals,idx,value){
      if(vals[idx]===value)return true;
      if(vals[idx]!==-1)return false;
      vals[idx]=value;stats.forced++;
      return true;
    }

    function propagate(vals){
      var changed=true;
      while(changed){
        changed=false;
        var ci,arr,on,unk,unknown,clue,k;

        for(ci=0;ci<n*n;ci++){
          clue=puzzle[Math.floor(ci/n)][ci%n];
          if(clue==null)continue;
          arr=cellEdges[ci];on=0;unk=0;unknown=[];
          for(k=0;k<arr.length;k++){
            if(vals[arr[k]]===1)on++;
            else if(vals[arr[k]]===-1){unk++;unknown.push(arr[k]);}
          }
          if(on>clue||on+unk<clue)return false;
          if(unk&&on===clue){
            for(k=0;k<unknown.length;k++)if(vals[unknown[k]]===-1){if(!assign(vals,unknown[k],0))return false;changed=true;}
          }else if(unk&&on+unk===clue){
            for(k=0;k<unknown.length;k++)if(vals[unknown[k]]===-1){if(!assign(vals,unknown[k],1))return false;changed=true;}
          }
        }

        for(var vi=0;vi<vertexEdges.length;vi++){
          arr=vertexEdges[vi];on=0;unk=0;unknown=[];
          for(k=0;k<arr.length;k++){
            if(vals[arr[k]]===1)on++;
            else if(vals[arr[k]]===-1){unk++;unknown.push(arr[k]);}
          }
          if(on>2)return false;
          if(on===1&&unk===0)return false;
          if(on===2&&unk){
            for(k=0;k<unknown.length;k++)if(vals[unknown[k]]===-1){if(!assign(vals,unknown[k],0))return false;changed=true;}
          }else if(on===1&&unk===1){
            if(!assign(vals,unknown[0],1))return false;changed=true;
          }else if(on===0&&unk===1){
            // A Slitherlink vertex may have degree 0 or 2, never 1.
            if(!assign(vals,unknown[0],0))return false;changed=true;
          }
        }
      }
      return true;
    }

    function choose(vals){
      var best=-1,bestScore=-1;
      for(var i=0;i<m;i++)if(vals[i]===-1){
        var score=0,e=edges[i];
        for(var z=0;z<e.cells.length;z++){
          var q=e.cells[z],clue=puzzle[q[0]][q[1]];
          if(clue!=null){
            var ce=cellEdges[q[0]*n+q[1]],on=0,unk=0;
            for(var t=0;t<ce.length;t++){if(vals[ce[t]]===1)on++;else if(vals[ce[t]]===-1)unk++;}
            score+=12-Math.abs(clue-on)*2-unk;
          }
        }
        var va=[vertexEdges[vk(e.a)],vertexEdges[vk(e.b)]];
        for(z=0;z<2;z++){
          var von=0,vunk=0;
          for(t=0;t<va[z].length;t++){if(vals[va[z][t]]===1)von++;else if(vals[va[z][t]]===-1)vunk++;}
          score+=von*4+(4-vunk);
        }
        if(score>bestScore){bestScore=score;best=i;}
      }
      return best;
    }

    var found=0;
    function dfs(vals){
      if(found>=limit)return;
      stats.nodes++;
      vals=vals.slice();
      if(!propagate(vals)){stats.deadEnds++;return;}
      var edge=choose(vals);
      if(edge<0){
        if(fullLoop(vals)){found++;stats.solutions=found;}
        else stats.deadEnds++;
        return;
      }
      stats.branches++;
      var a=vals.slice();a[edge]=1;dfs(a);
      if(found>=limit)return;
      var b=vals.slice();b[edge]=0;dfs(b);
    }

    dfs(Array(m).fill(-1));
    stats.solutions=found;
    return found;
  }

  // P3 makes the optimized solver authoritative for Slitherlink. It preserves
  // exact semantics while making dense 7x7/8x8 certification practical.
  generator.countSlitherlinkSolutions=countSlitherlinkFast;

  function boundaryFromCells(n,cells,edges){
    var inside={};
    cells.forEach(function(q){inside[q[0]+','+q[1]]=1;});
    var vals=Array(edges.length).fill(0);
    edges.forEach(function(e,i){
      var hits=0;
      e.cells.forEach(function(q){if(inside[q[0]+','+q[1]])hits++;});
      if(hits===1)vals[i]=1;
    });
    return vals;
  }

  function oneLoop(vals,edges){
    var adj={};
    function key(q){return q[0]+','+q[1];}
    edges.forEach(function(e,i){
      if(!vals[i])return;
      var a=key(e.a),b=key(e.b);
      (adj[a]||(adj[a]=[])).push(b);
      (adj[b]||(adj[b]=[])).push(a);
    });
    var keys=Object.keys(adj);
    if(!keys.length||keys.some(function(k){return adj[k].length!==2;}))return false;
    var seen={},stack=[keys[0]];
    while(stack.length){
      var k=stack.pop();
      if(seen[k])continue;
      seen[k]=1;
      adj[k].forEach(function(x){if(!seen[x])stack.push(x);});
    }
    return Object.keys(seen).length===keys.length;
  }

  function makePolyomino(n,random,difficulty){
    var min=Math.max(4,Math.floor(n*n*(difficulty==='gentle'?0.28:0.24)));
    var max=Math.max(min+1,Math.floor(n*n*(difficulty==='expert'?0.50:0.42)));
    var wanted=min+Math.floor(random()*(max-min+1));
    var start=[Math.floor(random()*n),Math.floor(random()*n)];
    var cells=[start],used={};used[start[0]+','+start[1]]=1;
    var guard=0;
    while(cells.length<wanted&&guard++<n*n*12){
      var base=cells[Math.floor(random()*cells.length)];
      var dirs=shuffle([[1,0],[-1,0],[0,1],[0,-1]],random);
      for(var i=0;i<dirs.length;i++){
        var r=base[0]+dirs[i][0],c=base[1]+dirs[i][1],k=r+','+c;
        if(r>=0&&c>=0&&r<n&&c<n&&!used[k]){
          used[k]=1;cells.push([r,c]);break;
        }
      }
    }
    return cells;
  }

  function fullClues(n,solution,edges){
    var clues=Array.from({length:n},function(){return Array(n).fill(0);});
    edges.forEach(function(e,i){
      if(!solution[i])return;
      e.cells.forEach(function(q){clues[q[0]][q[1]]++;});
    });
    return clues;
  }

  function targetClueCount(n,difficulty){
    var total=n*n;
    var ratio=difficulty==='gentle'?0.94:(difficulty==='focused'?0.90:0.86);
    if(n>=8)ratio=Math.max(ratio,0.94);
    else if(n>=7)ratio=Math.max(ratio,0.92);
    else if(n>=6)ratio=Math.max(ratio,0.88);
    return Math.ceil(total*ratio);
  }

  function build(seed,n,difficulty){
    var edges=edgesFor(n);
    for(var attempt=0;attempt<8;attempt++){
      var random=rng(((seed>>>0)^0x534C4954^Math.imul(n,0x85EBCA6B)^Math.imul(attempt+1,0x9E3779B1))>>>0);
      var cells=makePolyomino(n,random,difficulty);
      if(cells.length<4)continue;
      var solution=boundaryFromCells(n,cells,edges);
      if(!oneLoop(solution,edges))continue;
      var clues=fullClues(n,solution,edges);

      var stats={};
      if(countSlitherlinkFast(clues,2,stats)!==1)continue;

      var order=shuffle(Array.from({length:n*n},function(_,i){return i;}),random);
      var target=targetClueCount(n,difficulty),count=n*n;
      var maxChecks=n>=7?2:(n===6?3:5),checks=0;
      for(var oi=0;oi<order.length&&count>target&&checks<maxChecks;oi++){
        var idx=order[oi],r=Math.floor(idx/n),c=idx%n,save=clues[r][c];
        clues[r][c]=null;checks++;
        if(countSlitherlinkFast(clues,2,{})===1)count--;
        else clues[r][c]=save;
      }

      return {puzzle:clues,solution:solution,stats:stats,clues:count,topology:cells};
    }
    return null;
  }

  function makeSlitherlink(variant,seed,difficulty,n){
    var key=[seed>>>0,difficulty,n].join(':');
    if(cache.has(key))return clone(cache.get(key));
    var built=build(seed>>>0,n,difficulty);
    if(!built)throw new Error('Slitherlink multi-size generation failed for seed '+seed+' / '+difficulty+' / '+n+'x'+n);

    var out=clone(variant);
    out.data=Object.assign({},out.data||{}, {p3Size:n,p3SupportedSizes:supported.slice()});
    out.puzzle=built.puzzle;
    out.solution=built.solution;
    out.generation={
      seed:seed>>>0,
      clues:built.clues,
      unique:true,
      verification:'solver-verified',
      generatorFamily:'slitherlink-multisize-bounded-polyomino-boundary',
      difficultyScore:Number(built.stats.nodes||0)+Number(built.stats.branches||0)*2+Number(built.stats.deadEnds||0),
      searchStats:clone(built.stats),
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:n
    };
    cache.set(key,clone(out));
    return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='slitherlink';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-slitherlink'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();
    variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:5;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='slitherlink')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(supported.indexOf(requested)<0)requested=5;
    return makeSlitherlink(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport.slitherlink=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
