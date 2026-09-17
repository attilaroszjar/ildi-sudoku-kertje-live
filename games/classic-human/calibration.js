(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var H=root.ClassicHuman;
  var R=root.ClassicHumanRating;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!H&&typeof require==='function')H=require('./index.js');
  if(!R&&typeof require==='function')R=require('./rating.js');

  function normalizePuzzleRecord(raw,index){
    if(!raw||typeof raw!=='object')throw new TypeError('corpus record must be an object');
    var id=typeof raw.id==='string'&&raw.id?raw.id:'puzzle-'+String(index+1).padStart(4,'0');
    var puzzle=typeof raw.puzzle==='string'?raw.puzzle:null;
    if(!puzzle||puzzle.length!==81||!/^[0-9.]+$/.test(puzzle))throw new TypeError('corpus record puzzle must be an 81-char classic grid');
    var expectedBand=raw.expectedBand==null?null:String(raw.expectedBand);
    return Object.freeze({
      id:id,
      puzzle:puzzle,
      expectedBand:expectedBand,
      source:raw.source==null?null:String(raw.source),
      tags:Object.freeze(Array.isArray(raw.tags)?raw.tags.map(String).sort():[]),
      metadata:Object.freeze(Object.assign({},raw.metadata||{}))
    });
  }

  function percentile(sorted,p){
    if(!sorted.length)return 0;
    var idx=Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1));
    return sorted[idx];
  }

  function auditCorpus(records,options){
    if(!Array.isArray(records))throw new TypeError('records must be an array');
    options=options||{};
    var solverOptions=Object.assign({allowUniqueness:true,allowServerPreferred:true,allowServerOnly:true},options.solverOptions||{});
    var started=Date.now();
    var rows=[];
    for(var i=0;i<records.length;i++){
      var record=normalizePuzzleRecord(records[i],i);
      var uniqueCount=C.countSolutions(record.puzzle,2);
      var t0=Date.now();
      var solve=H.solve(record.puzzle,solverOptions);
      var rating=R.rateSolve(solve,options.ratingOptions||{});
      var elapsed=Date.now()-t0;
      rows.push(Object.freeze({
        id:record.id,
        source:record.source,
        sourceBand:record.metadata&&record.metadata.sourceBand||null,
        clueCount:record.metadata&&Number.isFinite(record.metadata.clueCount)?record.metadata.clueCount:null,
        seed:record.metadata&&Number.isFinite(record.metadata.seed)?record.metadata.seed:null,
        expectedBand:record.expectedBand,
        unique:uniqueCount===1,
        solutionCountCapped:uniqueCount,
        status:solve.status,
        score:rating.score,
        band:rating.band,
        scoreStatus:rating.scoreStatus,
        hardestTechnique:rating.hardestTechnique,
        totalSteps:rating.totalSteps,
        advancedSteps:rating.advancedSteps,
        dependencyDepth:rating.dependencyDepth,
        bottleneckStatus:rating.bottleneckStatus,
        usesUniquenessAssumption:rating.usesUniquenessAssumption,
        usesServerPreferred:rating.usesServerPreferred,
        usesServerOnly:rating.usesServerOnly,
        elapsedMs:elapsed
      }));
    }
    var bandCounts={},statusCounts={},sourceBandCounts={},sourceBandRatingMatrix={},runtime=rows.map(function(r){return r.elapsedMs;}).sort(function(a,b){return a-b;});
    var uniqueCount=0,solvedCount=0,expectedCount=0,bandMatchCount=0;
    rows.forEach(function(r){
      bandCounts[r.band]=(bandCounts[r.band]||0)+1;
      statusCounts[r.status]=(statusCounts[r.status]||0)+1;
      if(r.sourceBand){
        sourceBandCounts[r.sourceBand]=(sourceBandCounts[r.sourceBand]||0)+1;
        var row=sourceBandRatingMatrix[r.sourceBand]||(sourceBandRatingMatrix[r.sourceBand]={});
        row[r.band]=(row[r.band]||0)+1;
      }
      if(r.unique)uniqueCount++;
      if(r.status==='SOLVED_LOGICALLY')solvedCount++;
      if(r.expectedBand!=null){expectedCount++;if(r.expectedBand===r.band)bandMatchCount++;}
    });
    var frozenMatrix={};
    Object.keys(sourceBandRatingMatrix).sort().forEach(function(sourceBand){frozenMatrix[sourceBand]=Object.freeze(Object.assign({},sourceBandRatingMatrix[sourceBand]));});
    return Object.freeze({
      schemaVersion:2,
      ratingStatus:'PROVISIONAL_UNCALIBRATED',
      total:rows.length,
      uniqueCount:uniqueCount,
      solvedLogicallyCount:solvedCount,
      expectedBandCount:expectedCount,
      expectedBandMatchCount:bandMatchCount,
      bandCounts:Object.freeze(Object.assign({},bandCounts)),
      statusCounts:Object.freeze(Object.assign({},statusCounts)),
      sourceBandCounts:Object.freeze(Object.assign({},sourceBandCounts)),
      sourceBandRatingMatrix:Object.freeze(frozenMatrix),
      runtime:Object.freeze({
        totalMs:Date.now()-started,
        medianMs:percentile(runtime,0.5),
        p95Ms:percentile(runtime,0.95),
        maxMs:runtime.length?runtime[runtime.length-1]:0
      }),
      rows:Object.freeze(rows.slice())
    });
  }

  var api={normalizePuzzleRecord:normalizePuzzleRecord,auditCorpus:auditCorpus};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanCalibration=api;
})(typeof globalThis!=='undefined'?globalThis:this);
