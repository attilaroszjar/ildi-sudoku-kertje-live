(function(root){'use strict';
  var H=root.ClassicHuman;
  var R=root.ClassicHumanRating;
  if(!H&&typeof require==='function')H=require('./index.js');
  if(!R&&typeof require==='function')R=require('./rating.js');

  var DEFAULT_PROFILES=Object.freeze([
    Object.freeze({id:'canonical',priorityOverrides:Object.freeze({})}),
    Object.freeze({id:'pattern-first',priorityOverrides:Object.freeze({
      'skyscraper':95,'two-string-kite':96,'turbot-fish':97,'empty-rectangle':98,
      'xy-wing':145,'xyz-wing':146,'w-wing':147
    })}),
    Object.freeze({id:'graph-first',priorityOverrides:Object.freeze({
      'x-chain':285,'xy-chain':286,'aic':295,'grouped-aic':335
    })})
  ]);

  function normalizeProfiles(profiles){
    profiles=profiles||DEFAULT_PROFILES;
    if(!Array.isArray(profiles)||!profiles.length||profiles.length>3)throw new TypeError('stability profiles must contain 1..3 entries');
    return profiles.map(function(profile,index){
      if(!profile||typeof profile!=='object')throw new TypeError('stability profile must be an object');
      var id=profile.id==null?'profile-'+(index+1):String(profile.id);
      var overrides=Object.assign({},profile.priorityOverrides||{});
      Object.keys(overrides).forEach(function(key){if(!Number.isFinite(overrides[key]))throw new TypeError('priority override must be finite');});
      return Object.freeze({id:id,priorityOverrides:Object.freeze(overrides)});
    });
  }

  function auditPuzzleStability(puzzle,options){
    options=options||{};
    if(typeof puzzle!=='string'||puzzle.length!==81||!/^[0-9.]+$/.test(puzzle))throw new TypeError('puzzle must be an 81-char classic grid');
    var profiles=normalizeProfiles(options.profiles);
    var baseSolverOptions=Object.assign({allowUniqueness:true,allowServerPreferred:true,allowServerOnly:true},options.solverOptions||{});
    var rows=[];
    for(var i=0;i<profiles.length;i++){
      var profile=profiles[i];
      var solverOptions=Object.assign({},baseSolverOptions,{priorityOverrides:profile.priorityOverrides});
      var solve=H.solve(puzzle,solverOptions);
      var rating=R.rateSolve(solve,options.ratingOptions||{});
      rows.push(Object.freeze({
        profileId:profile.id,
        status:solve.status,
        score:rating.score,
        band:rating.band,
        hardestTechnique:rating.hardestTechnique,
        totalSteps:rating.totalSteps,
        dependencyDepth:rating.dependencyDepth
      }));
    }
    var scores=rows.map(function(row){return row.score;});
    var bands=Array.from(new Set(rows.map(function(row){return row.band;}))).sort();
    var statuses=Array.from(new Set(rows.map(function(row){return row.status;}))).sort();
    var hardest=Array.from(new Set(rows.map(function(row){return row.hardestTechnique||'none';}))).sort();
    var minScore=Math.min.apply(Math,scores),maxScore=Math.max.apply(Math,scores);
    return Object.freeze({
      profileCount:rows.length,
      stableBand:bands.length===1,
      stableStatus:statuses.length===1,
      minScore:minScore,
      maxScore:maxScore,
      scoreSpread:maxScore-minScore,
      observedBands:Object.freeze(bands),
      observedStatuses:Object.freeze(statuses),
      observedHardestTechniques:Object.freeze(hardest),
      rows:Object.freeze(rows)
    });
  }

  function auditCorpusStability(records,options){
    if(!Array.isArray(records))throw new TypeError('records must be an array');
    var rows=records.map(function(record,index){
      if(!record||typeof record!=='object')throw new TypeError('corpus record must be an object');
      var id=record.id==null?'puzzle-'+String(index+1).padStart(4,'0'):String(record.id);
      var audit=auditPuzzleStability(record.puzzle,options);
      return Object.freeze({id:id,stableBand:audit.stableBand,stableStatus:audit.stableStatus,scoreSpread:audit.scoreSpread,audit:audit});
    });
    return Object.freeze({
      total:rows.length,
      stableBandCount:rows.filter(function(row){return row.stableBand;}).length,
      stableStatusCount:rows.filter(function(row){return row.stableStatus;}).length,
      maxScoreSpread:rows.reduce(function(max,row){return Math.max(max,row.scoreSpread);},0),
      rows:Object.freeze(rows)
    });
  }

  var api={DEFAULT_PROFILES:DEFAULT_PROFILES,normalizeProfiles:normalizeProfiles,auditPuzzleStability:auditPuzzleStability,auditCorpusStability:auditCorpusStability};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanCalibrationStability=api;
})(typeof globalThis!=='undefined'?globalThis:this);
