(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');

  var bitCount=C.bitCount,digitsFromMask=C.digitsFromMask,rowCol=C.rowCol,boxIndex=C.boxIndex,cellIndex=C.cellIndex;

  function nodeKey(cell,digit){return cell+':'+digit;}
  function parseNodeKey(key){var p=String(key).split(':');return {cell:Number(p[0]),digit:Number(p[1])};}
  function edgeKey(a,b,type){return (a<b?a+'|'+b:b+'|'+a)+'|'+type;}
  function addEdge(store,adj,a,b,type,reason){
    if(a===b)return;
    var k=edgeKey(a,b,type);if(store[k])return;
    var e=Object.freeze({a:a,b:b,type:type,reason:reason||null});store[k]=e;
    if(!adj[a])adj[a]=[];if(!adj[b])adj[b]=[];
    adj[a].push(e);adj[b].push(e);
  }
  function other(edge,node){return edge.a===node?edge.b:edge.a;}

  function buildCandidateNodes(state){
    var nodes={},keys=[];
    for(var cell=0;cell<81;cell++){
      var rc=rowCol(cell);if(state.grid[rc[0]][rc[1]])continue;
      var digits=digitsFromMask(state.masks[cell]);
      for(var i=0;i<digits.length;i++){
        var key=nodeKey(cell,digits[i]);
        nodes[key]=Object.freeze({key:key,cell:cell,digit:digits[i]});keys.push(key);
      }
    }
    keys.sort(function(a,b){var A=parseNodeKey(a),B=parseNodeKey(b);return A.cell-B.cell||A.digit-B.digit;});
    return {nodes:nodes,keys:keys};
  }

  function houseCells(type,index){
    var out=[],i,br,bc;
    if(type==='row'){for(i=0;i<9;i++)out.push(cellIndex(index,i));return out;}
    if(type==='column'){for(i=0;i<9;i++)out.push(cellIndex(i,index));return out;}
    br=Math.floor(index/3)*3;bc=(index%3)*3;
    for(var r=br;r<br+3;r++)for(var c=bc;c<bc+3;c++)out.push(cellIndex(r,c));
    return out;
  }

  function buildGraph(state){
    var built=buildCandidateNodes(state),nodes=built.nodes,keys=built.keys,adj={},edges={};
    for(var ki=0;ki<keys.length;ki++)adj[keys[ki]]=[];

    // Cell links: every pair is weak; a bivalue cell also gives a strong link.
    for(var cell=0;cell<81;cell++){
      var rc=rowCol(cell);if(state.grid[rc[0]][rc[1]])continue;
      var ds=digitsFromMask(state.masks[cell]);
      for(var i=0;i<ds.length;i++)for(var j=i+1;j<ds.length;j++){
        var a=nodeKey(cell,ds[i]),b=nodeKey(cell,ds[j]);
        addEdge(edges,adj,a,b,'weak',{kind:'cell',cell:cell});
        if(ds.length===2)addEdge(edges,adj,a,b,'strong',{kind:'bivalue',cell:cell});
      }
    }

    // House links for a digit: all peers are weak; exactly two positions are strong.
    var types=['row','column','box'];
    for(var ti=0;ti<types.length;ti++)for(var h=0;h<9;h++){
      var cells=houseCells(types[ti],h);
      for(var digit=1;digit<=9;digit++){
        var present=[];
        for(var ci=0;ci<cells.length;ci++)if(L.hasCandidate(state,cells[ci],digit))present.push(cells[ci]);
        for(i=0;i<present.length;i++)for(j=i+1;j<present.length;j++){
          a=nodeKey(present[i],digit);b=nodeKey(present[j],digit);
          addEdge(edges,adj,a,b,'weak',{kind:'house',houseType:types[ti],houseIndex:h,digit:digit});
        }
        if(present.length===2){
          a=nodeKey(present[0],digit);b=nodeKey(present[1],digit);
          addEdge(edges,adj,a,b,'strong',{kind:'conjugate',houseType:types[ti],houseIndex:h,digit:digit});
        }
      }
    }

    Object.keys(adj).forEach(function(k){adj[k].sort(function(x,y){return x.type.localeCompare(y.type)||other(x,k).localeCompare(other(y,k));});});
    return Object.freeze({nodes:Object.freeze(nodes),keys:Object.freeze(keys.slice()),edges:Object.freeze(Object.keys(edges).sort().map(function(k){return edges[k];})),adj:adj});
  }

  function alternatingPaths(graph,start,options){
    options=options||{};
    var firstType=options.firstType||'strong',maxEdges=options.maxEdges==null?8:options.maxEdges;
    if(firstType!=='strong'&&firstType!=='weak')throw new Error('firstType must be strong or weak');
    if(!Number.isInteger(maxEdges)||maxEdges<1||maxEdges>20)throw new RangeError('maxEdges must be 1..20');
    if(!graph.nodes[start])return [];
    var target=options.target||null,results=[],bestSeen={};
    function dfs(current,nextType,path,used,depth){
      if(depth>=maxEdges)return;
      var list=graph.adj[current]||[];
      for(var i=0;i<list.length;i++){
        var e=list[i];if(e.type!==nextType)continue;
        var n=other(e,current);if(used[n])continue;
        var stateKey=n+'|'+(nextType==='strong'?'weak':'strong');
        if(bestSeen[stateKey]!=null&&bestSeen[stateKey]<=depth+1)continue;
        bestSeen[stateKey]=depth+1;
        path.push(e);used[n]=1;
        if(!target||n===target)results.push(Object.freeze({start:start,end:n,edges:Object.freeze(path.slice()),length:path.length}));
        if(!target||n!==target)dfs(n,nextType==='strong'?'weak':'strong',path,used,depth+1);
        delete used[n];path.pop();
      }
    }
    var used={};used[start]=1;dfs(start,firstType,[],used,0);
    results.sort(function(a,b){return a.length-b.length||a.end.localeCompare(b.end)||a.edges.map(function(e){return edgeKey(e.a,e.b,e.type);}).join(',').localeCompare(b.edges.map(function(e){return edgeKey(e.a,e.b,e.type);}).join(','));});
    return results;
  }

  function candidatePeers(graph,nodeKeyValue,type){return (graph.adj[nodeKeyValue]||[]).filter(function(e){return !type||e.type===type;}).map(function(e){return other(e,nodeKeyValue);});}

  var api={nodeKey:nodeKey,parseNodeKey:parseNodeKey,buildGraph:buildGraph,alternatingPaths:alternatingPaths,candidatePeers:candidatePeers};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanImplicationGraph=api;
})(typeof globalThis!=='undefined'?globalThis:this);
