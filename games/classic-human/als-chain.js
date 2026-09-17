(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  var A=root.ClassicHumanALS;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');
  if(!A&&typeof require==='function')A=require('./als.js');

  var normalizeDeduction=C.normalizeDeduction;

  function buildGraph(pairs){
    var nodes={},adj={},seen={};
    function addNode(als){if(!nodes[als.key]){nodes[als.key]=als;adj[als.key]=[];}}
    function addEdge(a,b,digit){
      var ends=[a.key,b.key].sort(),key=ends[0]+'|'+ends[1]+'|'+digit;
      if(seen[key])return;seen[key]=1;
      var edge={a:a.key,b:b.key,digit:digit};
      adj[a.key].push(edge);adj[b.key].push(edge);
    }
    for(var i=0;i<pairs.length;i++){
      var p=pairs[i];if(!p||!p.a||!p.b||!Array.isArray(p.rcc))continue;
      addNode(p.a);addNode(p.b);
      for(var j=0;j<p.rcc.length;j++)addEdge(p.a,p.b,p.rcc[j].digit);
    }
    Object.keys(adj).forEach(function(k){adj[k].sort(function(x,y){return x.digit-y.digit||other(x,k).localeCompare(other(y,k));});});
    return {nodes:nodes,adj:adj};
  }
  function other(edge,key){return edge.a===key?edge.b:edge.a;}
  function overlaps(a,b){var s=new Set(a.cells);for(var i=0;i<b.cells.length;i++)if(s.has(b.cells[i]))return true;return false;}
  function pathOverlaps(graph,pathKeys,nextKey){for(var i=0;i<pathKeys.length;i++)if(overlaps(graph.nodes[pathKeys[i]],graph.nodes[nextKey]))return true;return false;}

  function boundedPaths(graph,start,options){
    options=options||{};var maxAls=options.maxAls==null?6:options.maxAls;
    if(!Number.isInteger(maxAls)||maxAls<4||maxAls>6)throw new RangeError('ALS-Chain maxAls must be 4..6');
    if(!graph.nodes[start])return [];
    var out=[],used={};used[start]=1;
    function dfs(cur,lastDigit,nodeKeys,edges){
      if(nodeKeys.length>=maxAls)return;
      var list=graph.adj[cur]||[];
      for(var i=0;i<list.length;i++){
        var edge=list[i],next=other(edge,cur);
        if(edge.digit===lastDigit||used[next]||pathOverlaps(graph,nodeKeys,next))continue;
        used[next]=1;nodeKeys.push(next);edges.push(edge);
        if(nodeKeys.length>=4)out.push({nodes:nodeKeys.slice(),edges:edges.slice()});
        dfs(next,edge.digit,nodeKeys,edges);
        edges.pop();nodeKeys.pop();delete used[next];
      }
    }
    dfs(start,0,[start],[]);
    out.sort(function(a,b){return a.nodes.length-b.nodes.length||a.nodes.join('|').localeCompare(b.nodes.join('|'))||a.edges.map(function(e){return e.digit;}).join('.').localeCompare(b.edges.map(function(e){return e.digit;}).join('.'));});
    return out;
  }

  function digitCells(state,als,digit){return als.cells.filter(function(cell){return L.hasCandidate(state,cell,digit);});}
  function seesAll(cell,cells){for(var i=0;i<cells.length;i++)if(!L.sees(cell,cells[i]))return false;return true;}

  function findAlsChain(state,options){
    options=options||{};
    var pairs=options.rccPairs||A.enumerateRccPairs(state,options),graph=options.graph||buildGraph(pairs),out=[];
    var starts=Object.keys(graph.nodes).sort();
    for(var si=0;si<starts.length;si++){
      var paths=boundedPaths(graph,starts[si],options);
      for(var pi=0;pi<paths.length;pi++){
        var path=paths[pi],first=graph.nodes[path.nodes[0]],last=graph.nodes[path.nodes[path.nodes.length-1]];
        var firstLink=path.edges[0].digit,lastLink=path.edges[path.edges.length-1].digit,shared=first.mask&last.mask;
        for(var z=1;z<=9;z++){
          var bit=C.bitForDigit(z);if(!(shared&bit)||z===firstLink||z===lastLink)continue;
          var fz=digitCells(state,first,z),lz=digitCells(state,last,z);if(!fz.length||!lz.length)continue;
          var blocked=new Set(),anchors=[];
          for(var ni=0;ni<path.nodes.length;ni++){
            var cells=graph.nodes[path.nodes[ni]].cells;
            for(var ci=0;ci<cells.length;ci++){blocked.add(cells[ci]);anchors.push(cells[ci]);}
          }
          var elims=[];
          for(var cell=0;cell<81;cell++){
            if(blocked.has(cell)||!L.hasCandidate(state,cell,z))continue;
            if(seesAll(cell,fz)&&seesAll(cell,lz))elims.push({cell:cell,digit:z});
          }
          if(!elims.length)continue;
          out.push(normalizeDeduction({techniqueId:'als-chain',eliminations:elims,anchors:anchors,complexity:{alsCount:path.nodes.length,rccCount:path.edges.length,totalAlsCells:path.nodes.reduce(function(n,k){return n+graph.nodes[k].size;},0)},explanationData:{alsPath:path.nodes.slice(),rccDigits:path.edges.map(function(e){return e.digit;}),zDigit:z}}));
        }
      }
    }
    var seen={},ded=[];
    for(var i=0;i<out.length;i++){
      var d=out[i],forward=d.explanationData.alsPath.join('>'),reverse=d.explanationData.alsPath.slice().reverse().join('>'),pathKey=forward<reverse?forward:reverse;
      var key=d.eliminations.map(function(e){return e.cell+':'+e.digit;}).join(',')+'|'+pathKey+'|'+d.explanationData.zDigit;
      if(!seen[key]){seen[key]=1;ded.push(d);}
    }
    ded.sort(C.compareDeductions);return ded;
  }

  var api={buildGraph:buildGraph,boundedPaths:boundedPaths,findAlsChain:findAlsChain};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanAlsChain=api;
})(typeof globalThis!=='undefined'?globalThis:this);
