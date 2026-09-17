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
    var out=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      if(c+1<n)out.push({a:[r,c],b:[r,c+1]});
      if(r+1<n)out.push({a:[r,c],b:[r+1,c]});
    }
    return out;
  }

  function edgeKey(a,b){
    var ka=a[0]+','+a[1],kb=b[0]+','+b[1];
    return ka<kb?ka+'|'+kb:kb+'|'+ka;
  }

  function countMasyuFast(puzzle,limit,stats){
    limit=limit||2;
    stats=stats||{};
    stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.solutions=0;stats.forced=0;

    var n=puzzle.length,edges=edgesFor(n),m=edges.length,vals=Array(m).fill(-1),found=0;
    var incident=Array.from({length:n*n},function(){return[];});
    var byDir=Array.from({length:n*n},function(){return {N:-1,S:-1,W:-1,E:-1};});
    var clueCells=[];

    function ci(r,c){return r*n+c;}
    edges.forEach(function(e,i){
      var ar=e.a[0],ac=e.a[1],br=e.b[0],bc=e.b[1];
      incident[ci(ar,ac)].push(i);incident[ci(br,bc)].push(i);
      if(ar===br){byDir[ci(ar,ac)].E=i;byDir[ci(br,bc)].W=i;}
      else{byDir[ci(ar,ac)].S=i;byDir[ci(br,bc)].N=i;}
    });
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(puzzle[r][c])clueCells.push([r,c,puzzle[r][c]]);

    function get(id){return id<0?0:vals[id];}
    function setv(id,v,trail){
      if(id<0)return v===0;
      if(vals[id]===v)return true;
      if(vals[id]>=0)return false;
      vals[id]=v;trail.push(id);stats.forced++;
      return true;
    }
    function undo(trail){for(var i=trail.length-1;i>=0;i--)vals[trail[i]]=-1;}

    function degreeInfo(r,c){
      var arr=incident[ci(r,c)],on=0,unk=0;
      for(var i=0;i<arr.length;i++){if(vals[arr[i]]===1)on++;else if(vals[arr[i]]<0)unk++;}
      return {arr:arr,on:on,unk:unk};
    }

    function forceTurnNeighbor(r,c,fromDir,trail){
      if(r<0||c<0||r>=n||c>=n)return false;
      var d=byDir[ci(r,c)],away,perpA,perpB;
      if(fromDir==='E'){away=d.W;perpA=d.N;perpB=d.S;}
      else if(fromDir==='W'){away=d.E;perpA=d.N;perpB=d.S;}
      else if(fromDir==='S'){away=d.N;perpA=d.W;perpB=d.E;}
      else{away=d.S;perpA=d.W;perpB=d.E;}
      if(!setv(away,0,trail))return false;
      if(get(perpA)===0&&get(perpB)===0)return false;
      if(get(perpA)===0&&!setv(perpB,1,trail))return false;
      if(get(perpB)===0&&!setv(perpA,1,trail))return false;
      return true;
    }

    function canTurnNeighbor(r,c,fromDir){
      if(r<0||c<0||r>=n||c>=n)return false;
      var d=byDir[ci(r,c)],away,perpA,perpB;
      if(fromDir==='E'){away=d.W;perpA=d.N;perpB=d.S;}
      else if(fromDir==='W'){away=d.E;perpA=d.N;perpB=d.S;}
      else if(fromDir==='S'){away=d.N;perpA=d.W;perpB=d.E;}
      else{away=d.S;perpA=d.W;perpB=d.E;}
      return get(away)!==1&&(get(perpA)!==0||get(perpB)!==0);
    }

    function blackContinue(r,c,dir,trail){
      var nr=r,nc=c,br=r,bc=c;
      if(dir==='N'){nr--;br-=2;}
      if(dir==='S'){nr++;br+=2;}
      if(dir==='W'){nc--;bc-=2;}
      if(dir==='E'){nc++;bc+=2;}
      if(nr<0||nc<0||nr>=n||nc>=n||br<0||bc<0||br>=n||bc>=n)return false;
      var nd=byDir[ci(nr,nc)],forward,pa,pb;
      if(dir==='N'){forward=nd.N;pa=nd.W;pb=nd.E;}
      if(dir==='S'){forward=nd.S;pa=nd.W;pb=nd.E;}
      if(dir==='W'){forward=nd.W;pa=nd.N;pb=nd.S;}
      if(dir==='E'){forward=nd.E;pa=nd.N;pb=nd.S;}
      return setv(forward,1,trail)&&setv(pa,0,trail)&&setv(pb,0,trail);
    }

    function propagate(trail){
      var changed=true,guard=0;
      while(changed&&guard++<m*4){
        var before=trail.length;changed=false;

        for(var r=0;r<n;r++)for(var c=0;c<n;c++){
          var info=degreeInfo(r,c),clue=!!puzzle[r][c];
          if(info.on>2)return false;
          if(clue){
            if(info.on+info.unk<2)return false;
            if(info.on===2){for(var x=0;x<info.arr.length;x++)if(vals[info.arr[x]]<0&&!setv(info.arr[x],0,trail))return false;}
            else if(info.on+info.unk===2){for(x=0;x<info.arr.length;x++)if(vals[info.arr[x]]<0&&!setv(info.arr[x],1,trail))return false;}
          }else{
            if(info.on===2){for(x=0;x<info.arr.length;x++)if(vals[info.arr[x]]<0&&!setv(info.arr[x],0,trail))return false;}
            else if(info.on===1&&info.unk===0)return false;
            else if(info.on===1&&info.unk===1){for(x=0;x<info.arr.length;x++)if(vals[info.arr[x]]<0&&!setv(info.arr[x],1,trail))return false;}
            else if(info.on===0&&info.unk===1){for(x=0;x<info.arr.length;x++)if(vals[info.arr[x]]<0&&!setv(info.arr[x],0,trail))return false;}
          }
        }

        for(var q=0;q<clueCells.length;q++){
          var rr=clueCells[q][0],cc=clueCells[q][1],type=clueCells[q][2],d=byDir[ci(rr,cc)];
          if(type==='w'){
            var h=get(d.W)!==0&&get(d.E)!==0&&get(d.N)!==1&&get(d.S)!==1;
            var v=get(d.N)!==0&&get(d.S)!==0&&get(d.W)!==1&&get(d.E)!==1;
            if(!h&&!v)return false;
            if(h&&!v){if(!setv(d.W,1,trail)||!setv(d.E,1,trail)||!setv(d.N,0,trail)||!setv(d.S,0,trail))return false;}
            if(v&&!h){if(!setv(d.N,1,trail)||!setv(d.S,1,trail)||!setv(d.W,0,trail)||!setv(d.E,0,trail))return false;}
            if(get(d.W)===1&&get(d.E)===1){
              var lt=canTurnNeighbor(rr,cc-1,'E'),rt=canTurnNeighbor(rr,cc+1,'W');
              if(!lt&&!rt)return false;
              if(!lt&&!forceTurnNeighbor(rr,cc+1,'W',trail))return false;
              if(!rt&&!forceTurnNeighbor(rr,cc-1,'E',trail))return false;
            }
            if(get(d.N)===1&&get(d.S)===1){
              var ut=canTurnNeighbor(rr-1,cc,'S'),dt=canTurnNeighbor(rr+1,cc,'N');
              if(!ut&&!dt)return false;
              if(!ut&&!forceTurnNeighbor(rr+1,cc,'N',trail))return false;
              if(!dt&&!forceTurnNeighbor(rr-1,cc,'S',trail))return false;
            }
          }else if(type==='b'){
            var hs=[d.W,d.E],vs=[d.N,d.S],groups=[hs,vs];
            for(var gi=0;gi<groups.length;gi++){
              var a=groups[gi][0],b=groups[gi][1],ga=get(a),gb=get(b);
              if(ga===1&&gb===1)return false;
              if(ga===0&&gb===0)return false;
              if(ga===1&&!setv(b,0,trail))return false;
              if(gb===1&&!setv(a,0,trail))return false;
              if(ga===0&&!setv(b,1,trail))return false;
              if(gb===0&&!setv(a,1,trail))return false;
            }
            if(get(d.N)===1&&!blackContinue(rr,cc,'N',trail))return false;
            if(get(d.S)===1&&!blackContinue(rr,cc,'S',trail))return false;
            if(get(d.W)===1&&!blackContinue(rr,cc,'W',trail))return false;
            if(get(d.E)===1&&!blackContinue(rr,cc,'E',trail))return false;
          }
        }

        if(trail.length>before)changed=true;
      }

      // A closed ON component cannot later reconnect without violating degree 2.
      var adj={};
      edges.forEach(function(e,i){if(vals[i]===1){var a=e.a[0]+','+e.a[1],b=e.b[0]+','+e.b[1];(adj[a]||(adj[a]=[])).push(b);(adj[b]||(adj[b]=[])).push(a);}});
      var keys=Object.keys(adj),seen={};
      for(var ki=0;ki<keys.length;ki++)if(!seen[keys[ki]]){
        var stack=[keys[ki]],comp=[],closed=true;
        while(stack.length){var k=stack.pop();if(seen[k])continue;seen[k]=1;comp.push(k);if((adj[k]||[]).length!==2)closed=false;(adj[k]||[]).forEach(function(z){if(!seen[z])stack.push(z);});}
        if(closed){
          if(comp.length!==keys.length)return false;
          var inComp={};comp.forEach(function(k){inComp[k]=1;});
          for(var qi=0;qi<clueCells.length;qi++)if(!inComp[clueCells[qi][0]+','+clueCells[qi][1]])return false;
          for(var ei=0;ei<m;ei++)if(vals[ei]<0&&!setv(ei,0,trail))return false;
        }
      }
      return true;
    }

    function cellType(r,c){
      var d=byDir[ci(r,c)],on=[];
      ['N','S','W','E'].forEach(function(k){if(get(d[k])===1)on.push(k);});
      if(on.length!==2)return null;
      if(on.indexOf('W')>=0&&on.indexOf('E')>=0)return 'h';
      if(on.indexOf('N')>=0&&on.indexOf('S')>=0)return 'v';
      return 'turn';
    }

    function fullValid(){
      var adj={},used=0;
      edges.forEach(function(e,i){if(vals[i]===1){used++;var a=e.a[0]+','+e.a[1],b=e.b[0]+','+e.b[1];(adj[a]||(adj[a]=[])).push(b);(adj[b]||(adj[b]=[])).push(a);}});
      if(!used)return false;
      var keys=Object.keys(adj);for(var i=0;i<keys.length;i++)if(adj[keys[i]].length!==2)return false;
      var seen={},stack=[keys[0]];while(stack.length){var k=stack.pop();if(seen[k])continue;seen[k]=1;adj[k].forEach(function(z){if(!seen[z])stack.push(z);});}
      if(Object.keys(seen).length!==keys.length)return false;
      for(var q=0;q<clueCells.length;q++){
        var r=clueCells[q][0],c=clueCells[q][1],type=clueCells[q][2],t=cellType(r,c);
        if(type==='w'){
          if(t!=='h'&&t!=='v')return false;
          var ok=false;
          if(t==='h')ok=(c>0&&cellType(r,c-1)==='turn')||(c+1<n&&cellType(r,c+1)==='turn');
          else ok=(r>0&&cellType(r-1,c)==='turn')||(r+1<n&&cellType(r+1,c)==='turn');
          if(!ok)return false;
        }else if(type==='b'){
          if(t!=='turn')return false;
          var d=byDir[ci(r,c)];
          if(get(d.N)===1&&(r<2||cellType(r-1,c)!=='v'))return false;
          if(get(d.S)===1&&(r+2>=n||cellType(r+1,c)!=='v'))return false;
          if(get(d.W)===1&&(c<2||cellType(r,c-1)!=='h'))return false;
          if(get(d.E)===1&&(c+2>=n||cellType(r,c+1)!=='h'))return false;
        }
      }
      return true;
    }

    function choose(){
      var best=-1,bestScore=-1;
      for(var i=0;i<m;i++)if(vals[i]<0){
        var e=edges[i],score=0;
        [e.a,e.b].forEach(function(p){
          if(puzzle[p[0]][p[1]])score+=12;
          var info=degreeInfo(p[0],p[1]);if(info.on===1)score+=6;score+=4-info.unk;
        });
        if(score>bestScore){best=i;bestScore=score;}
      }
      return best;
    }

    function dfs(){
      if(found>=limit)return;
      stats.nodes++;
      var trail=[];
      if(!propagate(trail)){stats.deadEnds++;undo(trail);return;}
      var k=choose();
      if(k<0){if(fullValid()){found++;stats.solutions=found;}else stats.deadEnds++;undo(trail);return;}
      stats.branches++;
      vals[k]=1;dfs();vals[k]=-1;
      if(found<limit){vals[k]=0;dfs();vals[k]=-1;}
      undo(trail);
    }

    dfs();
    return found;
  }

  function solutionCellType(edges,vals,n,r,c){
    var ns=[];
    edges.forEach(function(e,i){if(vals[i]!==1)return;var p=null;if(e.a[0]===r&&e.a[1]===c)p=e.b;else if(e.b[0]===r&&e.b[1]===c)p=e.a;if(p)ns.push(p);});
    if(ns.length!==2)return null;
    if(ns[0][0]===ns[1][0])return 'h';
    if(ns[0][1]===ns[1][1])return 'v';
    return 'turn';
  }

  function clueCandidates(edges,solution,n){
    var out=[];
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      var t=solutionCellType(edges,solution,n,r,c);if(!t)continue;
      if(t==='turn'){
        var ok=true,neighbors=[];
        edges.forEach(function(e,i){if(solution[i]!==1)return;if(e.a[0]===r&&e.a[1]===c)neighbors.push(e.b);else if(e.b[0]===r&&e.b[1]===c)neighbors.push(e.a);});
        for(var i=0;i<neighbors.length;i++){
          var p=neighbors[i],dr=p[0]-r,dc=p[1]-c,nt=solutionCellType(edges,solution,n,p[0],p[1]);
          if((dr===0&&nt!=='h')||(dc===0&&nt!=='v'))ok=false;
        }
        if(ok)out.push({r:r,c:c,t:'b'});
      }else{
        var turn=false;
        if(t==='h')turn=(c>0&&solutionCellType(edges,solution,n,r,c-1)==='turn')||(c+1<n&&solutionCellType(edges,solution,n,r,c+1)==='turn');
        else turn=(r>0&&solutionCellType(edges,solution,n,r-1,c)==='turn')||(r+1<n&&solutionCellType(edges,solution,n,r+1,c)==='turn');
        if(turn)out.push({r:r,c:c,t:'w'});
      }
    }
    return out;
  }

  function makeCoarsePolyomino(m,random,attempt){
    var target=1+((attempt+Math.floor(random()*Math.max(1,m*m)))%Math.max(1,m*m));
    target=Math.min(target,Math.max(1,Math.ceil(m*m*0.72)));
    var start=[Math.floor(random()*m),Math.floor(random()*m)],cells=[start],used={};used[start[0]+','+start[1]]=1;
    var guard=0;
    while(cells.length<target&&guard++<m*m*20){
      var base=cells[Math.floor(random()*cells.length)],dirs=shuffle([[1,0],[-1,0],[0,1],[0,-1]],random);
      for(var i=0;i<dirs.length;i++){
        var r=base[0]+dirs[i][0],c=base[1]+dirs[i][1],k=r+','+c;
        if(r>=0&&c>=0&&r<m&&c<m&&!used[k]){used[k]=1;cells.push([r,c]);break;}
      }
    }
    return cells;
  }

  function mappedBoundary(n,cells,shiftR,shiftC,edges){
    var inside={},edgeIndex={},solution=Array(edges.length).fill(0);
    cells.forEach(function(q){inside[q[0]+','+q[1]]=1;});
    edges.forEach(function(e,i){edgeIndex[edgeKey(e.a,e.b)]=i;});
    function mark(a,b){var i=edgeIndex[edgeKey(a,b)];if(i===undefined)return false;solution[i]=1;return true;}
    function segment(a,b){
      var mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      return mark(a,mid)&&mark(mid,b);
    }
    for(var k=0;k<cells.length;k++){
      var r=cells[k][0],c=cells[k][1];
      var top=[r-1,c],bottom=[r+1,c],left=[r,c-1],right=[r,c+1];
      var y=shiftR+2*r,x=shiftC+2*c;
      if(!inside[top[0]+','+top[1]]&&!segment([y,x],[y,x+2]))return null;
      if(!inside[bottom[0]+','+bottom[1]]&&!segment([y+2,x],[y+2,x+2]))return null;
      if(!inside[left[0]+','+left[1]]&&!segment([y,x],[y+2,x]))return null;
      if(!inside[right[0]+','+right[1]]&&!segment([y,x+2],[y+2,x+2]))return null;
    }
    return solution;
  }

  function oneLoop(solution,edges){
    var adj={};
    edges.forEach(function(e,i){if(solution[i]===1){var a=e.a[0]+','+e.a[1],b=e.b[0]+','+e.b[1];(adj[a]||(adj[a]=[])).push(b);(adj[b]||(adj[b]=[])).push(a);}});
    var keys=Object.keys(adj);if(!keys.length||keys.some(function(k){return adj[k].length!==2;}))return false;
    var seen={},stack=[keys[0]];while(stack.length){var k=stack.pop();if(seen[k])continue;seen[k]=1;adj[k].forEach(function(z){if(!seen[z])stack.push(z);});}
    return Object.keys(seen).length===keys.length;
  }

  function build(seed,n,difficulty){
    var edges=edgesFor(n),m=Math.max(1,Math.floor((n-1)/2)),slack=(n-1)-2*m;
    for(var attempt=0;attempt<18;attempt++){
      var random=rng(((seed>>>0)^0x4D415359^Math.imul(n,0x85EBCA6B)^Math.imul(attempt+1,0x9E3779B1))>>>0);
      var shiftR=slack?Math.floor(random()*(slack+1)):0,shiftC=slack?Math.floor(random()*(slack+1)):0;
      var cells=makeCoarsePolyomino(m,random,attempt),solution=mappedBoundary(n,cells,shiftR,shiftC,edges);
      if(!solution||!oneLoop(solution,edges))continue;
      var candidates=clueCandidates(edges,solution,n);
      if(candidates.length<4)continue;
      var puzzle=Array.from({length:n},function(){return Array(n).fill(null);});
      candidates.forEach(function(q){puzzle[q.r][q.c]=q.t;});
      var stats={};
      if(countMasyuFast(puzzle,2,stats)!==1)continue;

      var order=shuffle(candidates.slice(),random);
      var removals=difficulty==='gentle'?0:(difficulty==='focused'?Math.min(1,Math.floor(candidates.length/8)):Math.min(n>=7?2:3,Math.floor(candidates.length/5)));
      var removed=0;
      for(var i=0;i<order.length&&removed<removals;i++){
        var q=order[i],save=puzzle[q.r][q.c];puzzle[q.r][q.c]=null;
        if(countMasyuFast(puzzle,2,{})===1)removed++;else puzzle[q.r][q.c]=save;
      }
      return {puzzle:puzzle,solution:solution,stats:stats,clues:candidates.length-removed,topology:cells};
    }
    return null;
  }

  function makeMasyu(variant,seed,difficulty,n){
    var key=[seed>>>0,difficulty,n].join(':');if(cache.has(key))return clone(cache.get(key));
    var built=build(seed>>>0,n,difficulty);if(!built)throw new Error('Masyu multi-size generation failed for seed '+seed+' / '+difficulty+' / '+n+'x'+n);
    var out=clone(variant);
    out.data=Object.assign({},out.data||{},{p3Size:n,p3SupportedSizes:supported.slice()});
    out.puzzle=built.puzzle;out.solution=built.solution;
    out.generation={seed:seed>>>0,clues:built.clues,unique:true,verification:'solver-verified',generatorFamily:'masyu-multisize-coarse-polyomino-cycle',difficultyScore:Number(built.stats.nodes||0)+Number(built.stats.branches||0)*2+Number(built.stats.deadEnds||0),searchStats:clone(built.stats),mode:'seeded-variant-essential',variantEssential:true,boardSize:n};
    cache.set(key,clone(out));return out;
  }

  generator.countMasyuSolutions=countMasyuFast;

  var variant=root.SudokuBank.find(function(v){return v.id==='masyu';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-masyu'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:4;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='masyu')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);if(supported.indexOf(requested)<0)requested=4;
    return makeMasyu(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport.masyu=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
