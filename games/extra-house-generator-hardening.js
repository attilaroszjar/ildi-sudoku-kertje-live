(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.ExtraHouseGeneratorCore)throw new Error('Extra-house generator requires SudokuGenerator and ExtraHouseGeneratorCore');
  var baseMake=root.SudokuGenerator.make,core=root.ExtraHouseGeneratorCore,cache=new Map();

  var hyperHouses=[];
  [[1,1],[1,5],[5,1],[5,5]].forEach(function(start){var house=[];for(var r=start[0];r<start[0]+3;r++)for(var c=start[1];c<start[1]+3;c++)house.push([r,c]);hyperHouses.push(house);});
  var disjointHouses=[];
  for(var rr=0;rr<3;rr++)for(var cc=0;cc<3;cc++){var disjointHouse=[];for(var br=0;br<3;br++)for(var bc=0;bc<3;bc++)disjointHouse.push([br*3+rr,bc*3+cc]);disjointHouses.push(disjointHouse);}

  var emptyTopology=core.compile([]),adjacencyKinds={kropki:true,xv:true,consecutive:true,greater:true},adjacencyPairs=[],allCells=[];
  for(var ar=0;ar<9;ar++)for(var ac=0;ac<9;ac++){allCells.push([ar,ac]);if(ac<8)adjacencyPairs.push([[ar,ac],[ar,ac+1]]);if(ar<8)adjacencyPairs.push([[ar,ac],[ar+1,ac]]);}

  function makeHyper(variant,seed,difficulty){return core.makeVariant(root.SudokuGenerator,variant,seed,difficulty,hyperHouses,{label:'Hyper',seedXor:0x48F3A911,attemptMix:0x9E3779B1,carveSeedXor:0x48A17E55,maxAttempts:4,nodeLimit:160000,generatorFamily:'extra-house-fresh-fill-mrv'});}
  function makeDisjoint(variant,seed,difficulty){return core.makeVariant(root.SudokuGenerator,variant,seed,difficulty,disjointHouses,{label:'Disjoint Groups',seedXor:0xD15A01A7,carveSeedXor:0xD15C4A7E,maxAttempts:4,nodeLimit:180000,attemptMix:0x9E3779B1,targets:{gentle:40,focused:30,expert:27},generatorFamily:'extra-house-fresh-fill-mrv'});}

  function adjacencySeedXor(kind){if(kind==='kropki')return 0x4B524F50;if(kind==='xv')return 0x00585631;if(kind==='greater')return 0x47524541;return 0x434F4E53;}
  function greaterEdges(solution,seed){var random=core.rng(((seed>>>0)^0x4752454C)>>>0),pool=adjacencyPairs.map(function(pair){return [pair[0].slice(),pair[1].slice()];});core.shuffle(pool,random);var target=24+((seed>>>0)%9),edges=[];for(var i=0;i<target&&i<pool.length;i++){var a=pool[i][0],b=pool[i][1],x=solution[a[0]][a[1]],y=solution[b[0]][b[1]];edges.push({a:a,b:b,op:x>y?'>':'<'});}return edges;}
  function adjacencyEdges(kind,solution,seed){if(kind==='greater')return greaterEdges(solution,seed);var edges=[];for(var i=0;i<adjacencyPairs.length;i++){var a=adjacencyPairs[i][0],b=adjacencyPairs[i][1],x=solution[a[0]][a[1]],y=solution[b[0]][b[1]];if(kind==='kropki'){if(x===2*y||y===2*x)edges.push({a:a.slice(),b:b.slice(),type:'black'});else if(Math.abs(x-y)===1)edges.push({a:a.slice(),b:b.slice(),type:'white'});}else if(kind==='xv'){var sum=x+y;if(sum===5||sum===10)edges.push({a:a.slice(),b:b.slice(),sum:sum});}else if(kind==='consecutive'&&Math.abs(x-y)===1)edges.push({a:a.slice(),b:b.slice()});}return edges;}
  function makeAdjacency(variant,seed,difficulty){var kind=variant.kind,fresh=core.freshSolution(emptyTopology,seed>>>0,{label:'Adjacency '+kind,seedXor:adjacencySeedXor(kind),maxAttempts:1,nodeLimit:250000});var prepared=JSON.parse(JSON.stringify(variant));prepared.solution=fresh.grid;prepared.data=Object.assign({},prepared.data||{},{edges:adjacencyEdges(kind,fresh.grid,seed)});if(!prepared.data.edges.length)throw new Error('Adjacency '+kind+' generated no relation edges');var out=baseMake.call(root.SudokuGenerator,prepared,seed,difficulty);out.generation.generatorFamily='adjacency-fresh-fill-mrv';out.generation.solutionGenerationNodes=fresh.totalNodes;out.generation.solutionGenerationAttempts=fresh.attempts;out.generation.relationCount=prepared.data.edges.length;return out;}

  function parityData(solution,seed){var random=core.rng(((seed>>>0)^0x50415249)>>>0),pool=allCells.map(function(p){return p.slice();});core.shuffle(pool,random);var target=24+((seed>>>0)%9),data={};for(var i=0;i<target;i++){var p=pool[i],v=solution[p[0]][p[1]];data[p[0]+','+p[1]]=v%2===0?'even':'odd';}return data;}
  function makeParity(variant,seed,difficulty){var fresh=core.freshSolution(emptyTopology,seed>>>0,{label:'Odd Even',seedXor:0x4F444445,maxAttempts:1,nodeLimit:250000});var prepared=JSON.parse(JSON.stringify(variant));prepared.solution=fresh.grid;prepared.data=parityData(fresh.grid,seed);var out=baseMake.call(root.SudokuGenerator,prepared,seed,difficulty);out.generation.generatorFamily='parity-fresh-fill-mrv';out.generation.solutionGenerationNodes=fresh.totalNodes;out.generation.solutionGenerationAttempts=fresh.attempts;out.generation.relationCount=Object.keys(prepared.data).length;return out;}

  root.SudokuGenerator.make=function(variant,seed,difficulty){var d=difficulty||'focused',kind=variant&&variant.kind;if(kind==='hyper'||kind==='disjoint'||kind==='parity'||adjacencyKinds[kind]){var key=kind+':'+(seed>>>0)+':'+d;if(!cache.has(key)){if(kind==='hyper')cache.set(key,makeHyper(variant,seed,d));else if(kind==='disjoint')cache.set(key,makeDisjoint(variant,seed,d));else if(kind==='parity')cache.set(key,makeParity(variant,seed,d));else cache.set(key,makeAdjacency(variant,seed,d));}return JSON.parse(JSON.stringify(cache.get(key)));}return baseMake.call(this,variant,seed,difficulty);};
})(globalThis);
