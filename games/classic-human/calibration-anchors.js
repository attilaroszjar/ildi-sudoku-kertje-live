(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var R=root.ClassicHumanRating;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!R&&typeof require==='function')R=require('./rating.js');

  var ANCHORS=Object.freeze([
    Object.freeze({id:'singles',techniqueId:'naked-single',complexity:Object.freeze({})}),
    Object.freeze({id:'subset',techniqueId:'naked-pair',complexity:Object.freeze({})}),
    Object.freeze({id:'fish',techniqueId:'x-wing',complexity:Object.freeze({fishSize:2})}),
    Object.freeze({id:'wing',techniqueId:'w-wing',complexity:Object.freeze({pathLength:4})}),
    Object.freeze({id:'chain',techniqueId:'aic',complexity:Object.freeze({pathLength:7})}),
    Object.freeze({id:'als',techniqueId:'als-chain',complexity:Object.freeze({chainLength:4})}),
    Object.freeze({id:'forcing',techniqueId:'forcing-chain',complexity:Object.freeze({depth:4})}),
    Object.freeze({id:'dynamic',techniqueId:'nested-forcing-chain',complexity:Object.freeze({depth:8,branches:2})})
  ]);

  function baselineSingles(count){
    count=count==null?40:count;
    if(!Number.isInteger(count)||count<0||count>79)throw new RangeError('baselineSingles count must be 0..79');
    var steps=[];
    for(var i=0;i<count;i++)steps.push({techniqueId:'naked-single',placements:[{cell:i,digit:i%9+1}],eliminations:[],complexity:{}});
    return steps;
  }

  function buildAnchorTrace(anchor,options){
    options=options||{};
    if(typeof anchor==='string')anchor=ANCHORS.find(function(x){return x.id===anchor;});
    if(!anchor||!C.TECHNIQUES[anchor.techniqueId])throw new TypeError('unknown calibration anchor');
    var steps=baselineSingles(options.baselineSingles==null?40:options.baselineSingles);
    if(anchor.id!=='singles')steps.push({
      techniqueId:anchor.techniqueId,
      placements:[],
      eliminations:[{cell:80,digit:9}],
      anchors:[],
      candidateNodes:[],
      complexity:Object.assign({},anchor.complexity||{})
    });
    // Synthetic anchors are formula fixtures, not puzzle solve results. Mark the
    // artificial trace complete only inside this explicitly non-puzzle evidence layer
    // so rating can expose comparable score/band values without weakening the
    // production rule that real STALLED/INVALID solves are UNRATED_INCOMPLETE.
    return Object.freeze({status:'SOLVED_LOGICALLY',syntheticCalibrationAnchor:true,steps:Object.freeze(steps)});
  }

  function auditAnchors(options){
    options=options||{};
    var rows=ANCHORS.map(function(anchor){
      var rating=R.rateSolve(buildAnchorTrace(anchor,options),options.ratingOptions||{});
      return Object.freeze({
        id:anchor.id,
        techniqueId:anchor.techniqueId,
        familyId:C.TECHNIQUES[anchor.techniqueId].familyId,
        priority:C.TECHNIQUES[anchor.techniqueId].priority,
        score:rating.score,
        band:rating.band,
        workload:rating.workload.weightedLogicalWork,
        maxComplexity:rating.workload.maxComplexity,
        scoreStatus:rating.scoreStatus
      });
    });
    var monotonic=true;
    for(var i=1;i<rows.length;i++)if(rows[i].score<=rows[i-1].score)monotonic=false;
    return Object.freeze({
      schemaVersion:1,
      evidenceType:'SYNTHETIC_TECHNIQUE_ANCHOR_NOT_PUZZLE_CORPUS',
      baselineSingles:options.baselineSingles==null?40:options.baselineSingles,
      monotonicScore:monotonic,
      rows:Object.freeze(rows)
    });
  }

  var api={ANCHORS:ANCHORS,baselineSingles:baselineSingles,buildAnchorTrace:buildAnchorTrace,auditAnchors:auditAnchors};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanCalibrationAnchors=api;
})(typeof globalThis!=='undefined'?globalThis:this);
