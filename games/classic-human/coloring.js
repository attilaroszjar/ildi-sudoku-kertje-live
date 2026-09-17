(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');

  var normalizeDeduction=C.normalizeDeduction;

  function buildGraph(state,digit){
    var links=L.conjugateLinks(state,digit,['row','column','box']),adj={},nodes={};
    for(var i=0;i<links.length;i++){
      var e=links[i];nodes[e.a]=1;nodes[e.b]=1;
      if(!adj[e.a])adj[e.a]=[];if(!adj[e.b])adj[e.b]=[];
      adj[e.a].push({cell:e.b,houseId:e.houseId});
      adj[e.b].push({cell:e.a,houseId:e.houseId});
    }
    Object.keys(adj).forEach(function(k){adj[k].sort(function(a,b){return a.cell-b.cell||a.houseId.localeCompare(b.houseId);});});
    return {links:links,adj:adj,nodes:Object.keys(nodes).map(Number).sort(function(a,b){return a-b;})};
  }

  function components(graph){
    var seen={},out=[];
    for(var ni=0;ni<graph.nodes.length;ni++){
      var start=graph.nodes[ni];if(seen[start])continue;
      var queue=[start],colors={},cells=[],edges=[],valid=true;colors[start]=0;seen[start]=1;
      while(queue.length){
        var a=queue.shift();cells.push(a);var list=graph.adj[a]||[];
        for(var j=0;j<list.length;j++){
          var b=list[j].cell,expected=1-colors[a];edges.push({a:a,b:b,houseId:list[j].houseId});
          if(colors[b]==null){colors[b]=expected;seen[b]=1;queue.push(b);}else if(colors[b]!==expected)valid=false;
        }
      }
      cells.sort(function(a,b){return a-b;});out.push({cells:cells,colors:colors,edges:edges,valid:valid});
    }
    return out;
  }

  function members(comp,color){return comp.cells.filter(function(c){return comp.colors[c]===color;});}
  function conflictPair(cells){
    for(var i=0;i<cells.length;i++)for(var j=i+1;j<cells.length;j++)if(L.sees(cells[i],cells[j]))return [cells[i],cells[j]];
    return null;
  }
  function colorWrapElims(digit,cells){return cells.map(function(cell){return {cell:cell,digit:digit};});}
  function commonColorElims(state,digit,a,b,blocked){
    var set=new Set(blocked||[]),out=[];
    for(var cell=0;cell<81;cell++){
      if(set.has(cell)||!L.hasCandidate(state,cell,digit))continue;
      var seesA=a.some(function(c){return L.sees(cell,c);}),seesB=b.some(function(c){return L.sees(cell,c);});
      if(seesA&&seesB)out.push({cell:cell,digit:digit});
    }
    return out;
  }
  function classesSee(a,b){
    for(var i=0;i<a.length;i++)for(var j=0;j<b.length;j++)if(L.sees(a[i],b[j]))return true;
    return false;
  }
  function dedupe(list){
    var seen={},out=[];
    for(var i=0;i<list.length;i++){
      var d=list[i],k=d.techniqueId+'|'+d.eliminations.map(function(x){return x.cell+':'+x.digit;}).join(',')+'|'+d.anchors.join(',');
      if(seen[k])continue;seen[k]=1;out.push(d);
    }
    return out;
  }

  function findSimpleColoring(state){
    var out=[];
    for(var digit=1;digit<=9;digit++){
      var comps=components(buildGraph(state,digit));
      for(var ci=0;ci<comps.length;ci++){
        var comp=comps[ci];if(!comp.valid||comp.cells.length<2)continue;
        var c0=members(comp,0),c1=members(comp,1),bad0=conflictPair(c0),bad1=conflictPair(c1),elims,reason;
        if(bad0||bad1){
          var badColor=bad0?0:1,badCells=bad0||bad1,badMembers=members(comp,badColor);
          elims=colorWrapElims(digit,badMembers);
          reason={type:'color-conflict',badColor:badColor,conflict:badCells};
        }else{
          elims=commonColorElims(state,digit,c0,c1,comp.cells);
          if(!elims.length)continue;
          reason={type:'sees-both-colors'};
        }
        out.push(normalizeDeduction({techniqueId:'simple-coloring',eliminations:elims,anchors:comp.cells,candidateNodes:comp.cells,proofEdges:comp.edges.map(function(e){return {type:'strong',a:e.a,b:e.b,house:e.houseId,digit:digit};}),complexity:{componentSize:comp.cells.length},explanationData:{digit:digit,colors:{zero:c0,one:c1},reason:reason}}));
      }
    }
    return dedupe(out);
  }

  function multiColorDeductionsForPair(state,digit,A,B){
    if(!A||!B||!A.valid||!B.valid)return [];
    var ac=[members(A,0),members(A,1)],bc=[members(B,0),members(B,1)];
    if(!ac[0].length||!ac[1].length||!bc[0].length||!bc[1].length)return [];
    var conflict=[[classesSee(ac[0],bc[0]),classesSee(ac[0],bc[1])],[classesSee(ac[1],bc[0]),classesSee(ac[1],bc[1])]];
    var blocked=A.cells.concat(B.cells),out=[],a,b,elims;
    function push(eliminations,reason){
      if(!eliminations.length)return;
      out.push(normalizeDeduction({techniqueId:'multi-coloring',eliminations:eliminations,anchors:blocked,candidateNodes:blocked,complexity:{componentCount:2,componentSizes:[A.cells.length,B.cells.length]},explanationData:{digit:digit,reason:reason,components:[{zero:ac[0],one:ac[1]},{zero:bc[0],one:bc[1]}]}}));
    }

    for(a=0;a<2;a++){
      if(conflict[a][0]&&conflict[a][1])push(colorWrapElims(digit,ac[a]),{type:'component-color-impossible',component:'A',color:a});
      if(conflict[0][a]&&conflict[1][a])push(colorWrapElims(digit,bc[a]),{type:'component-color-impossible',component:'B',color:a});
    }

    if(conflict[0][0]&&conflict[1][1]){
      for(a=0;a<2;a++)push(commonColorElims(state,digit,ac[a],bc[a],blocked),{type:'phase-link',relation:'opposite',colorPair:[a,a]});
    }
    if(conflict[0][1]&&conflict[1][0]){
      for(a=0;a<2;a++){
        b=1-a;push(commonColorElims(state,digit,ac[a],bc[b],blocked),{type:'phase-link',relation:'same',colorPair:[a,b]});
      }
    }
    return dedupe(out);
  }

  function findMultiColoring(state){
    var out=[];
    for(var digit=1;digit<=9;digit++){
      var comps=components(buildGraph(state,digit)).filter(function(c){return c.valid&&c.cells.length>=2;});
      for(var ai=0;ai<comps.length;ai++)for(var bi=ai+1;bi<comps.length;bi++)out=out.concat(multiColorDeductionsForPair(state,digit,comps[ai],comps[bi]));
    }
    return dedupe(out);
  }

  var api={buildGraph:buildGraph,components:components,findSimpleColoring:findSimpleColoring,multiColorDeductionsForPair:multiColorDeductionsForPair,findMultiColoring:findMultiColoring};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanColoring=api;
})(typeof globalThis!=='undefined'?globalThis:this);
