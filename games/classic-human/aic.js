(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  var G=root.ClassicHumanImplicationGraph;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');
  if(!G&&typeof require==='function')G=require('./implication-graph.js');

  var normalizeDeduction=C.normalizeDeduction;

  function other(edge,node){return edge.a===node?edge.b:edge.a;}
  function parse(key){return G.parseNodeKey(key);}
  function edgeSignature(edge){return [edge.a,edge.b].sort().join('~')+':'+edge.type;}
  function pathNodes(start,edges){var out=[start],current=start;for(var i=0;i<edges.length;i++){current=other(edges[i],current);out.push(current);}return out;}
  function cellsForNodes(nodes){return [...new Set(nodes.map(function(k){return parse(k).cell;}))];}

  function isPureX(nodes){
    if(!nodes.length)return false;var d=parse(nodes[0]).digit;
    for(var i=1;i<nodes.length;i++)if(parse(nodes[i]).digit!==d)return false;
    return true;
  }
  function isPureXY(edges){
    if(!edges.length)return false;
    for(var i=0;i<edges.length;i++){
      var reason=edges[i].reason||{};
      if(edges[i].type==='strong'&&reason.kind!=='bivalue')return false;
      if(edges[i].type==='weak'&&reason.kind!=='house')return false;
    }
    return true;
  }

  function aicPaths(graph,start,maxEdges){
    maxEdges=maxEdges==null?9:maxEdges;
    if(!Number.isInteger(maxEdges)||maxEdges<3||maxEdges>15)throw new RangeError('AIC maxEdges must be 3..15');
    if(!graph.nodes[start])return [];
    var startNode=parse(start),used={};used[start]=1;var results=[],bestSeen={};
    function dfs(current,nextType,path,depth){
      if(depth>=maxEdges)return;
      var list=graph.adj[current]||[];
      for(var i=0;i<list.length;i++){
        var edge=list[i];if(edge.type!==nextType)continue;
        var next=other(edge,current);if(used[next])continue;
        var nextDepth=depth+1,nextExpected=nextType==='strong'?'weak':'strong';
        var stateKey=next+'|'+nextExpected;
        if(bestSeen[stateKey]!=null&&bestSeen[stateKey]<=nextDepth)continue;
        bestSeen[stateKey]=nextDepth;used[next]=1;path.push(edge);
        if(nextDepth>=3&&nextDepth%2===1){
          var endNode=parse(next),nodes=pathNodes(start,path);
          if(endNode.cell!==startNode.cell&&endNode.digit===startNode.digit&&!isPureX(nodes)&&!isPureXY(path))results.push({start:start,end:next,edges:path.slice(),nodes:nodes,length:nextDepth,shape:'open'});
        }
        dfs(next,nextExpected,path,nextDepth);
        path.pop();delete used[next];
      }
    }
    dfs(start,'strong',[],0);
    results.sort(function(a,b){return a.length-b.length||a.end.localeCompare(b.end)||a.edges.map(edgeSignature).join(',').localeCompare(b.edges.map(edgeSignature).join(','));});
    return results;
  }

  function niceLoops(graph,start,firstType,maxEdges){
    maxEdges=maxEdges==null?9:maxEdges;
    if(firstType!=='strong'&&firstType!=='weak')throw new Error('Nice Loop firstType must be strong or weak');
    if(!Number.isInteger(maxEdges)||maxEdges<3||maxEdges>15)throw new RangeError('Nice Loop maxEdges must be 3..15');
    if(!graph.nodes[start])return [];
    var used={};used[start]=1;var results=[],seen={};
    function dfs(current,nextType,path,depth){
      if(depth>=maxEdges-1)return;
      var list=graph.adj[current]||[];
      for(var i=0;i<list.length;i++){
        var edge=list[i];if(edge.type!==nextType)continue;
        var next=other(edge,current);if(next===start||used[next])continue;
        path.push(edge);used[next]=1;var nextDepth=depth+1;
        if(nextDepth>=2){
          var closeList=graph.adj[next]||[];
          for(var ci=0;ci<closeList.length;ci++){
            var close=closeList[ci];if(close.type!==firstType||other(close,next)!==start)continue;
            var edges=path.concat([close]);
            // A single-discontinuity Nice Loop must have odd edge count. With an even
            // cycle the edge before closure has the same type as the closing edge,
            // creating a second discontinuity at the opposite end; treating that as
            // a one-node strong/weak discontinuity is unsound.
            if(edges.length%2===0)continue;
            var sig=edges.map(edgeSignature).sort().join(',');
            if(seen[sig])continue;seen[sig]=1;
            results.push({start:start,edges:edges,nodes:pathNodes(start,path),length:edges.length,shape:'nice-loop',discontinuity:firstType});
          }
        }
        dfs(next,nextType==='strong'?'weak':'strong',path,nextDepth);
        delete used[next];path.pop();
      }
    }
    dfs(start,firstType,[],0);
    results.sort(function(a,b){return a.length-b.length||a.edges.map(edgeSignature).join(',').localeCompare(b.edges.map(edgeSignature).join(','));});
    return results;
  }

  function commonEndpointElims(state,start,end,blocked){
    var a=parse(start),b=parse(end);if(a.digit!==b.digit)return [];
    var skip=new Set(blocked||[]),out=[];
    for(var cell=0;cell<81;cell++){
      if(skip.has(cell)||!L.hasCandidate(state,cell,a.digit))continue;
      if(L.sees(cell,a.cell)&&L.sees(cell,b.cell))out.push({cell:cell,digit:a.digit});
    }
    return out;
  }
  function dedupe(list){
    var seen={},out=[];
    for(var i=0;i<list.length;i++){
      var d=list[i],key=d.techniqueId+'|'+d.placements.map(function(x){return 'P'+x.cell+':'+x.digit;}).concat(d.eliminations.map(function(x){return 'E'+x.cell+':'+x.digit;})).join(',')+'|'+d.candidateNodes.join(',');
      if(seen[key])continue;seen[key]=1;out.push(d);
    }
    return out;
  }

  function findAIC(state,options){
    options=options||{};var maxEdges=options.maxEdges==null?9:options.maxEdges,graph=options.graph||G.buildGraph(state),out=[];
    for(var si=0;si<graph.keys.length;si++){
      var start=graph.keys[si],paths=aicPaths(graph,start,maxEdges);
      for(var pi=0;pi<paths.length;pi++){
        var path=paths[pi],cells=cellsForNodes(path.nodes),elims=commonEndpointElims(state,path.start,path.end,cells);
        if(!elims.length)continue;
        out.push(normalizeDeduction({techniqueId:'aic',eliminations:elims,anchors:cells,candidateNodes:path.nodes,proofEdges:path.edges.map(function(e){return {type:e.type,a:e.a,b:e.b,reason:e.reason};}),complexity:{chainLength:path.length},explanationData:{shape:'open',start:path.start,end:path.end,path:path.nodes.slice()}}));
      }

      for(var t=0;t<2;t++){
        var firstType=t===0?'strong':'weak',loops=niceLoops(graph,start,firstType,maxEdges);
        for(var li=0;li<loops.length;li++){
          var loop=loops[li],node=parse(start),cellsLoop=cellsForNodes(loop.nodes),placements=[],eliminations=[];
          if(firstType==='strong')placements=[{cell:node.cell,digit:node.digit}];
          else eliminations=[{cell:node.cell,digit:node.digit}];
          out.push(normalizeDeduction({techniqueId:'aic',placements:placements,eliminations:eliminations,anchors:cellsLoop,candidateNodes:loop.nodes,proofEdges:loop.edges.map(function(e){return {type:e.type,a:e.a,b:e.b,reason:e.reason};}),complexity:{chainLength:loop.length},explanationData:{shape:'nice-loop',discontinuity:firstType,node:start,path:loop.nodes.slice()}}));
        }
      }
    }
    return dedupe(out);
  }

  var api={aicPaths:aicPaths,niceLoops:niceLoops,findAIC:findAIC};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanAIC=api;
})(typeof globalThis!=='undefined'?globalThis:this);
