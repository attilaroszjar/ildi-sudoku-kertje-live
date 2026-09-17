(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var supported=[6,7,8,9,10];
  var cache=new Map();

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function mulberry32(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(list,random){for(var i=list.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),tmp=list[i];list[i]=list[j];list[j]=tmp;}return list;}

  function transformPoint(r,c,n,t){
    var rr=r,cc=c;
    if(t>=4){cc=n-1-cc;t-=4;}
    while(t-->0){var x=rr;rr=cc;cc=n-1-x;}
    return [rr,cc];
  }

  function bridgeEdges(islands){
    var edges=[];
    for(var i=0;i<islands.length;i++){
      var a=islands[i],bestR=null,bestD=null;
      for(var j=0;j<islands.length;j++)if(i!==j){
        var b=islands[j];
        if(a.r===b.r&&b.c>a.c&&(!bestR||b.c<bestR.c))bestR={idx:j,c:b.c};
        if(a.c===b.c&&b.r>a.r&&(!bestD||b.r<bestD.r))bestD={idx:j,r:b.r};
      }
      if(bestR)edges.push([i,bestR.idx]);
      if(bestD)edges.push([i,bestD.idx]);
    }
    return edges;
  }

  function bridgesCross(islands,e1,e2){
    var a=islands[e1[0]],b=islands[e1[1]],c=islands[e2[0]],d=islands[e2[1]],h1=a.r===b.r,h2=c.r===d.r;
    if(h1===h2)return false;
    var h=h1?[a,b]:[c,d],v=h1?[c,d]:[a,b],hr=h[0].r,vc=v[0].c;
    return vc>Math.min(h[0].c,h[1].c)&&vc<Math.max(h[0].c,h[1].c)&&hr>Math.min(v[0].r,v[1].r)&&hr<Math.max(v[0].r,v[1].r);
  }

  function countSparseSolutions(puzzle,limit,stats){
    limit=Math.max(1,Number(limit)||2);stats=stats||null;
    if(stats){stats.nodes=0;stats.branches=0;stats.deadEnds=0;stats.solutions=0;}
    var islands=puzzle.islands||puzzle,edges=bridgeEdges(islands),n=islands.length,vals=Array(edges.length).fill(0),found=0;
    var known=islands.map(function(x){return Number.isInteger(x.clue);});
    var remaining=islands.map(function(x,i){return known[i]?x.clue:0;});
    function possibleFrom(k,node){var m=0;for(var e=k;e<edges.length;e++)if(edges[e][0]===node||edges[e][1]===node)m+=2;return m;}
    function connected(){var adj=Array.from({length:n},function(){return[];});for(var e=0;e<edges.length;e++)if(vals[e]){var a=edges[e][0],b=edges[e][1];adj[a].push(b);adj[b].push(a);}var seen={0:1},q=[0];while(q.length){var x=q.shift();adj[x].forEach(function(y){if(!seen[y]){seen[y]=1;q.push(y);}});}return Object.keys(seen).length===n;}
    function visit(k){
      if(stats)stats.nodes++;if(found>=limit)return;
      if(k===edges.length){if(known.every(function(yes,i){return !yes||remaining[i]===0;})&&connected()){found++;if(stats)stats.solutions++;}else if(stats)stats.deadEnds++;return;}
      var a=edges[k][0],b=edges[k][1],max=2;
      if(known[a])max=Math.min(max,remaining[a]);if(known[b])max=Math.min(max,remaining[b]);
      if(stats&&max>0)stats.branches+=max;
      for(var v=0;v<=max;v++){
        if(v>0){var crossing=false;for(var pe=0;pe<k;pe++)if(vals[pe]>0&&bridgesCross(islands,edges[k],edges[pe])){crossing=true;break;}if(crossing)continue;}
        if(known[a])remaining[a]-=v;if(known[b])remaining[b]-=v;vals[k]=v;
        var ok=true;for(var node=0;node<n;node++)if(known[node]&&(remaining[node]<0||remaining[node]>possibleFrom(k+1,node))){ok=false;break;}
        if(ok)visit(k+1);
        if(known[a])remaining[a]+=v;if(known[b])remaining[b]+=v;
        if(found>=limit)return;
      }
      vals[k]=0;
    }
    visit(0);return found;
  }

  function makeTopology(n,seed){
    var points=[],horizontalFirst=((seed>>>3)&1)===0;
    for(var i=0;i<n;i++){
      if(horizontalFirst){
        if(i===0)points.push([0,0]);
        if(i<n-1){points.push([i,i+1]);points.push([i+1,i+1]);}
      }else{
        if(i===0)points.push([0,0]);
        if(i<n-1){points.push([i+1,i]);points.push([i+1,i+1]);}
      }
    }
    var t=(seed>>>0)%8;
    return points.map(function(p){var q=transformPoint(p[0],p[1],n,t);return {r:q[0],c:q[1],clue:0};});
  }

  function edgeMultiplicity(seed,difficulty,k){
    var salt=difficulty==='gentle'?0x13579BDF:(difficulty==='expert'?0x2468ACE1:0x10203040);
    var x=((seed>>>0)^salt^Math.imul(k+1,0x9E3779B1))>>>0;
    return ((x^(x>>>13))&3)===0?2:1;
  }

  function makeHashi(variant,seed,difficulty,n){
    var key=[seed>>>0,difficulty,n].join(':');
    if(cache.has(key))return clone(cache.get(key));

    var islands=makeTopology(n,seed>>>0);
    var edges=bridgeEdges(islands);
    if(edges.length!==islands.length-1)throw new Error('Hashiwokakero topology is not a tree');

    var solution=edges.map(function(_,k){return edgeMultiplicity(seed>>>0,difficulty,k);});
    solution.forEach(function(v,k){
      islands[edges[k][0]].clue+=v;
      islands[edges[k][1]].clue+=v;
    });

    var puzzle={size:n,islands:islands},stats={};
    if(generator.countBridgesSolutions(puzzle,2,stats)!==1){
      throw new Error('Hashiwokakero exact uniqueness failed for '+n+'x'+n+' seed '+seed);
    }

    var accepted=0,rejected=0;
    if(difficulty==='expert'){
      var order=islands.map(function(_,i){return i;});
      shuffle(order,mulberry32(((seed>>>0)^0x48A51E7D^Math.imul(n,0x9E3779B1))>>>0));
      for(var oi=0;oi<order.length;oi++){
        var idx=order[oi],old=islands[idx].clue;
        islands[idx].clue=null;
        if(countSparseSolutions(puzzle,2)===1)accepted++;
        else{islands[idx].clue=old;rejected++;}
      }
    }

    var finalStats={},finalCount=difficulty==='expert'?countSparseSolutions(puzzle,2,finalStats):generator.countBridgesSolutions(puzzle,2,finalStats);
    if(finalCount!==1)throw new Error('Hashiwokakero final exact uniqueness failed for '+n+'x'+n+' seed '+seed);
    var clueCount=islands.filter(function(x){return Number.isInteger(x.clue);}).length;

    var out=clone(variant);
    out.data=Object.assign({},out.data||{}, {p3Size:n,p3SupportedSizes:supported.slice()});
    out.puzzle=puzzle;
    out.solution=solution;
    out.generation={
      seed:seed>>>0,
      clues:clueCount,
      unique:true,
      verification:difficulty==='expert'?'solver-verified-local-irreducible':'solver-verified',
      generatorFamily:'hashiwokakero-multisize-tree-staircase',
      difficultyScore:Number(finalStats.nodes||0)+Number(finalStats.branches||0)*2+Number(finalStats.deadEnds||0),
      searchStats:clone(finalStats),
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:n
    };
    if(difficulty==='expert'){
      out.generation.policy='contract-driven-local-irreducibility';
      out.generation.localIrreducibilityProof='monotone-nonuniqueness-from-single-pass';
      out.generation.locallyIrreducibleUnderProductionContract=true;
      out.generation.acceptedRemovals=accepted;
      out.generation.rejectedRemovals=rejected;
    }

    cache.set(key,clone(out));
    return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='hashiwokakero';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-hashiwokakero'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();
    variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:7;
  }

  generator.countBridgesSparseSolutions=countSparseSolutions;
  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='hashiwokakero')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(supported.indexOf(requested)<0)requested=7;
    return makeHashi(variant,seed>>>0,difficulty||'focused',requested);
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport.hashiwokakero=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
