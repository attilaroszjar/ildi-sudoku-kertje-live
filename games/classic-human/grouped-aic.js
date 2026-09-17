(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');

  var cellIndex=C.cellIndex,rowCol=C.rowCol,boxIndex=C.boxIndex,normalizeDeduction=C.normalizeDeduction;

  function groupKey(digit,cells){return 'g:'+digit+':'+cells.slice().sort(function(a,b){return a-b;}).join('.');}
  function singleKey(digit,cell){return 's:'+digit+':'+cell;}
  function seesAll(cell,cells){for(var i=0;i<cells.length;i++)if(!L.sees(cell,cells[i]))return false;return true;}
  function houseCells(type,index){
    var out=[],i,br,bc;
    if(type==='row'){for(i=0;i<9;i++)out.push(cellIndex(index,i));return out;}
    if(type==='column'){for(i=0;i<9;i++)out.push(cellIndex(i,index));return out;}
    br=Math.floor(index/3)*3;bc=(index%3)*3;
    for(var r=br;r<br+3;r++)for(var c=bc;c<bc+3;c++)out.push(cellIndex(r,c));
    return out;
  }
  function groupedNodes(state){
    var out=[],seen={};
    for(var digit=1;digit<=9;digit++){
      for(var b=0;b<9;b++){
        var cells=houseCells('box',b).filter(function(c){return L.hasCandidate(state,c,digit);});
        if(cells.length<2)continue;
        for(var r=0;r<9;r++){
          var rowGroup=cells.filter(function(c){return rowCol(c)[0]===r;});
          if(rowGroup.length>=2){var k=groupKey(digit,rowGroup);if(!seen[k]){seen[k]=1;out.push({key:k,type:'group',digit:digit,cells:rowGroup.slice().sort(function(a,b){return a-b;}),houseType:'row',houseIndex:r,boxIndex:b});}}
        }
        for(var col=0;col<9;col++){
          var colGroup=cells.filter(function(c){return rowCol(c)[1]===col;});
          if(colGroup.length>=2){var kc=groupKey(digit,colGroup);if(!seen[kc]){seen[kc]=1;out.push({key:kc,type:'group',digit:digit,cells:colGroup.slice().sort(function(a,b){return a-b;}),houseType:'column',houseIndex:col,boxIndex:b});}}
        }
      }
    }
    out.sort(function(a,b){return a.digit-b.digit||a.cells[0]-b.cells[0]||a.key.localeCompare(b.key);});
    return out;
  }
  function buildGraph(state){
    var groups=groupedNodes(state),nodes={},adj={},edges=[],edgeSeen={};
    function addNode(n){if(!nodes[n.key]){nodes[n.key]=n;adj[n.key]=[];}}
    function addEdge(a,b,type,reason){var k=[a,b].sort().join('|')+'|'+type;if(a===b||edgeSeen[k])return;edgeSeen[k]=1;var e={a:a,b:b,type:type,reason:reason};edges.push(e);adj[a].push(e);adj[b].push(e);}
    for(var i=0;i<groups.length;i++)addNode(groups[i]);
    for(var digit=1;digit<=9;digit++)for(var cell=0;cell<81;cell++)if(L.hasCandidate(state,cell,digit))addNode({key:singleKey(digit,cell),type:'single',digit:digit,cells:[cell],cell:cell});
    for(i=0;i<groups.length;i++){
      var g=groups[i];
      for(cell=0;cell<81;cell++){
        if(!L.hasCandidate(state,cell,g.digit)||g.cells.indexOf(cell)>=0)continue;
        var sk=singleKey(g.digit,cell);
        if(seesAll(cell,g.cells))addEdge(g.key,sk,'weak',{kind:'group-peer'});
      }
      var line=houseCells(g.houseType,g.houseIndex).filter(function(c){return L.hasCandidate(state,c,g.digit);});
      var outside=line.filter(function(c){return g.cells.indexOf(c)<0;});
      if(outside.length===1)addEdge(g.key,singleKey(g.digit,outside[0]),'strong',{kind:'group-conjugate',houseType:g.houseType,houseIndex:g.houseIndex,digit:g.digit});
    }
    Object.keys(adj).forEach(function(k){adj[k].sort(function(a,b){return a.type.localeCompare(b.type)||((a.a===k?a.b:a.a).localeCompare(b.a===k?b.b:b.a));});});
    return {nodes:nodes,adj:adj,edges:edges};
  }
  function other(e,k){return e.a===k?e.b:e.a;}
  function boundedPaths(graph,start,maxEdges){
    maxEdges=maxEdges==null?7:maxEdges;if(!Number.isInteger(maxEdges)||maxEdges<3||maxEdges>12)throw new RangeError('Grouped AIC maxEdges must be 3..12');
    if(!graph.nodes[start])return [];
    var out=[],used={},bestSeen={};used[start]=1;
    function dfs(cur,nextType,path){
      if(path.length>=maxEdges)return;
      var list=graph.adj[cur]||[];
      for(var i=0;i<list.length;i++){
        var e=list[i];if(e.type!==nextType)continue;var n=other(e,cur);if(used[n])continue;
        var k=n+'|'+(nextType==='strong'?'weak':'strong');if(bestSeen[k]!=null&&bestSeen[k]<=path.length+1)continue;bestSeen[k]=path.length+1;
        used[n]=1;path.push(e);
        if(path.length>=3&&path.length%2===1)out.push({start:start,end:n,edges:path.slice(),length:path.length});
        dfs(n,nextType==='strong'?'weak':'strong',path);path.pop();delete used[n];
      }
    }
    dfs(start,'strong',[]);out.sort(function(a,b){return a.length-b.length||a.end.localeCompare(b.end);});return out;
  }
  function endpointCells(graph,key){return graph.nodes[key].cells;}
  function findGroupedAic(state,options){
    options=options||{};var graph=options.graph||buildGraph(state),maxEdges=options.maxEdges==null?7:options.maxEdges,out=[];
    var starts=Object.keys(graph.nodes).filter(function(k){return graph.nodes[k].type==='group';}).sort();
    for(var si=0;si<starts.length;si++){
      var start=starts[si],paths=boundedPaths(graph,start,maxEdges);
      for(var pi=0;pi<paths.length;pi++){
        var p=paths[pi],a=graph.nodes[p.start],b=graph.nodes[p.end];if(a.digit!==b.digit)continue;
        var blocked=new Set(endpointCells(graph,p.start).concat(endpointCells(graph,p.end))),elims=[];
        for(var cell=0;cell<81;cell++){
          if(blocked.has(cell)||!L.hasCandidate(state,cell,a.digit))continue;
          if(seesAll(cell,a.cells)&&seesAll(cell,b.cells))elims.push({cell:cell,digit:a.digit});
        }
        if(!elims.length)continue;
        var nodeKeys=[p.start],cur=p.start;for(var ei=0;ei<p.edges.length;ei++){cur=other(p.edges[ei],cur);nodeKeys.push(cur);}
        out.push(normalizeDeduction({techniqueId:'grouped-aic',eliminations:elims,anchors:Array.from(new Set(nodeKeys.flatMap(function(k){return endpointCells(graph,k);}))),candidateNodes:nodeKeys,proofEdges:p.edges,complexity:{chainLength:p.length,groupNodes:nodeKeys.filter(function(k){return graph.nodes[k].type==='group';}).length},explanationData:{digit:a.digit,path:nodeKeys.slice()}}));
      }
    }
    var seen={},ded=[];for(var i=0;i<out.length;i++){var key=out[i].eliminations.map(function(x){return x.cell+':'+x.digit;}).join(',')+'|'+out[i].candidateNodes.join(',');if(!seen[key]){seen[key]=1;ded.push(out[i]);}}return ded;
  }
  var api={groupedNodes:groupedNodes,buildGraph:buildGraph,boundedPaths:boundedPaths,findGroupedAic:findGroupedAic};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanGroupedAic=api;
})(typeof globalThis!=='undefined'?globalThis:this);
