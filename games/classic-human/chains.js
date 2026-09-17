(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  var G=root.ClassicHumanImplicationGraph;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');
  if(!G&&typeof require==='function')G=require('./implication-graph.js');

  var normalizeDeduction=C.normalizeDeduction,bitCount=C.bitCount,digitsFromMask=C.digitsFromMask,rowCol=C.rowCol;

  function other(edge,node){return edge.a===node?edge.b:edge.a;}
  function parse(key){return G.parseNodeKey(key);}
  function edgeSignature(edge){return [edge.a,edge.b].sort().join('~')+':'+edge.type;}

  function commonEndpointEliminations(state,digit,aCell,bCell,blockedCells){
    var blocked=new Set(blockedCells||[]),out=[];
    for(var cell=0;cell<81;cell++){
      if(blocked.has(cell)||!L.hasCandidate(state,cell,digit))continue;
      if(L.sees(cell,aCell)&&L.sees(cell,bCell))out.push({cell:cell,digit:digit});
    }
    return out;
  }

  function xChainPaths(graph,start,digit,maxEdges){
    maxEdges=maxEdges==null?7:maxEdges;
    if(!Number.isInteger(maxEdges)||maxEdges<3||maxEdges>15)throw new RangeError('X-Chain maxEdges must be 3..15');
    var startNode=parse(start);if(startNode.digit!==digit)return [];
    var results=[],used={};used[start]=1;
    var bestSeen={};

    function dfs(current,nextType,path,depth){
      if(depth>=maxEdges)return;
      var list=graph.adj[current]||[];
      for(var i=0;i<list.length;i++){
        var edge=list[i];if(edge.type!==nextType)continue;
        var next=other(edge,current),node=parse(next);
        if(node.digit!==digit||used[next])continue;
        var nextDepth=depth+1,nextExpected=nextType==='strong'?'weak':'strong';
        var stateKey=next+'|'+nextExpected;
        if(bestSeen[stateKey]!=null&&bestSeen[stateKey]<=nextDepth)continue;
        bestSeen[stateKey]=nextDepth;
        path.push(edge);used[next]=1;
        if(nextDepth>=3&&nextDepth%2===1)results.push({start:start,end:next,edges:path.slice(),length:nextDepth});
        dfs(next,nextExpected,path,nextDepth);
        delete used[next];path.pop();
      }
    }
    dfs(start,'strong',[],0);
    results.sort(function(a,b){
      return a.length-b.length||a.end.localeCompare(b.end)||
        a.edges.map(edgeSignature).join(',').localeCompare(b.edges.map(edgeSignature).join(','));
    });
    return results;
  }

  function dedupe(list){
    var seen={},out=[];
    for(var i=0;i<list.length;i++){
      var d=list[i],key=d.techniqueId+'|'+d.eliminations.map(function(x){return x.cell+':'+x.digit;}).join(',')+'|'+d.candidateNodes.join(',');
      if(seen[key])continue;seen[key]=1;out.push(d);
    }
    return out;
  }

  function findXChain(state,options){
    options=options||{};
    var maxEdges=options.maxEdges==null?7:options.maxEdges;
    var graph=options.graph||G.buildGraph(state),out=[];
    for(var digit=1;digit<=9;digit++){
      var starts=graph.keys.filter(function(key){return parse(key).digit===digit;});
      for(var si=0;si<starts.length;si++){
        var start=starts[si],paths=xChainPaths(graph,start,digit,maxEdges);
        for(var pi=0;pi<paths.length;pi++){
          var path=paths[pi],a=parse(path.start),b=parse(path.end);
          if(a.cell===b.cell)continue;
          var nodeKeys=[path.start],current=path.start;
          for(var ei=0;ei<path.edges.length;ei++){current=other(path.edges[ei],current);nodeKeys.push(current);}
          var cells=[...new Set(nodeKeys.map(function(k){return parse(k).cell;}))];
          var elims=commonEndpointEliminations(state,digit,a.cell,b.cell,cells);
          if(!elims.length)continue;
          out.push(normalizeDeduction({
            techniqueId:'x-chain',eliminations:elims,anchors:cells,candidateNodes:nodeKeys,
            proofEdges:path.edges.map(function(e){return {type:e.type,a:e.a,b:e.b,reason:e.reason};}),
            complexity:{chainLength:path.length,digit:digit},
            explanationData:{digit:digit,startCell:a.cell,endCell:b.cell,path:nodeKeys.slice()}
          }));
        }
      }
    }
    return dedupe(out);
  }

  function bivalueCells(state){
    var out=[];
    for(var cell=0;cell<81;cell++){
      var rc=rowCol(cell);if(state.grid[rc[0]][rc[1]])continue;
      if(bitCount(state.masks[cell])===2)out.push(cell);
    }
    return out;
  }
  function otherDigit(state,cell,digit){
    var ds=digitsFromMask(state.masks[cell]);
    if(ds.length!==2)return 0;
    if(ds[0]===digit)return ds[1];if(ds[1]===digit)return ds[0];return 0;
  }

  function xyChainPaths(state,start,z,maxCells){
    maxCells=maxCells==null?8:maxCells;
    if(!Number.isInteger(maxCells)||maxCells<3||maxCells>12)throw new RangeError('XY-Chain maxCells must be 3..12');
    var startDigits=digitsFromMask(state.masks[start]);if(startDigits.length!==2||startDigits.indexOf(z)<0)return [];
    var first=otherDigit(state,start,z),biv=bivalueCells(state),used={};used[start]=1;
    var results=[],bestSeen={};
    function dfs(current,outgoing,path){
      if(path.length>=maxCells)return;
      for(var i=0;i<biv.length;i++){
        var next=biv[i];if(used[next]||!L.sees(current,next)||!L.hasCandidate(state,next,outgoing))continue;
        var nextOutgoing=otherDigit(state,next,outgoing);if(!nextOutgoing)continue;
        var stateKey=next+'|'+nextOutgoing;
        if(bestSeen[stateKey]!=null&&bestSeen[stateKey]<=path.length+1)continue;
        bestSeen[stateKey]=path.length+1;used[next]=1;path.push(next);
        if(path.length>=3&&nextOutgoing===z)results.push({cells:path.slice(),digit:z,length:path.length});
        else dfs(next,nextOutgoing,path);
        path.pop();delete used[next];
      }
    }
    dfs(start,first,[start]);
    results.sort(function(a,b){return a.length-b.length||a.cells.join(',').localeCompare(b.cells.join(','));});
    return results;
  }

  function findXYChain(state,options){
    options=options||{};var maxCells=options.maxCells==null?8:options.maxCells,out=[],biv=bivalueCells(state);
    for(var si=0;si<biv.length;si++){
      var start=biv[si],startDigits=digitsFromMask(state.masks[start]);
      for(var zi=0;zi<2;zi++){
        var z=startDigits[zi],paths=xyChainPaths(state,start,z,maxCells);
        for(var pi=0;pi<paths.length;pi++){
          var path=paths[pi],end=path.cells[path.cells.length-1];if(end===start)continue;
          var elims=commonEndpointEliminations(state,z,start,end,path.cells);if(!elims.length)continue;
          var nodes=[];for(var ci=0;ci<path.cells.length;ci++){
            var ds=digitsFromMask(state.masks[path.cells[ci]]);for(var di=0;di<ds.length;di++)nodes.push(G.nodeKey(path.cells[ci],ds[di]));
          }
          out.push(normalizeDeduction({
            techniqueId:'xy-chain',eliminations:elims,anchors:path.cells,candidateNodes:nodes,
            complexity:{chainCells:path.length,chainLinks:path.length-1,digit:z},
            explanationData:{digit:z,startCell:start,endCell:end,cells:path.cells.slice()}
          }));
        }
      }
    }
    return dedupe(out);
  }

  var api={xChainPaths:xChainPaths,findXChain:findXChain,xyChainPaths:xyChainPaths,findXYChain:findXYChain};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanChains=api;
})(typeof globalThis!=='undefined'?globalThis:this);
