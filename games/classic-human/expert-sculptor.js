(function(root){'use strict';
  var G=root.ClassicHumanGeneratorAdapter,E=root.ClassicHumanPoolEvaluator;
  if(!G&&typeof require==='function')G=require('./generator-adapter.js');
  if(!E&&typeof require==='function')E=require('./pool-evaluator.js');
  var PROFILE='classic-expert-sculpt-v4';
  var MAX_DEPTH=2,BEAM_WIDTH=2,CHILD_LIMIT=27,BASE_PROFILE_LIMIT=3;
  var EXPERT_MIN=130,EXPERT_MAX=239,EXPERT_TARGET=184;
  var BASE_PROFILES=Object.freeze(['expert','focused','gentle']);
  function candidate(puzzle,seed){return {puzzle:puzzle,seed:seed,targetBand:'expert',generatorProfile:PROFILE};}
  function scoreOf(ev){return ev&&ev.rating&&Number.isFinite(ev.rating.score)?ev.rating.score:-1;}
  function advancedOf(ev){return ev&&ev.rating&&Number.isInteger(ev.rating.advancedSteps)?ev.rating.advancedSteps:0;}
  function bandOf(ev){return ev&&ev.rating&&ev.rating.band||null;}
  function rank(ev){
    var score=scoreOf(ev),advanced=advancedOf(ev),band=bandOf(ev);
    if(ev.reason===E.REASONS.ACCEPTED)return 1000000-Math.abs(score-EXPERT_TARGET);
    if(band==='brutal'||score>EXPERT_MAX)return -100000-Math.max(0,score-EXPERT_MAX);
    if(score<0)return -1000000;
    return score+advanced*24;
  }
  function expandable(ev){var score=scoreOf(ev),band=bandOf(ev);return band!=='brutal'&&score>=0&&score<=EXPERT_MAX;}
  function fallbackEligible(ev){var score=scoreOf(ev),band=bandOf(ev);return score>=0&&band!=='brutal'&&score<=EXPERT_MAX;}
  function baseNode(seed){
    var fallback=null;
    for(var i=0;i<BASE_PROFILE_LIMIT;i++){
      var generated=G.makeCandidate(seed,BASE_PROFILES[i]),node={candidate:candidate(generated.puzzle,seed),eval:null,removed:-1,rank:-1,baseProfile:BASE_PROFILES[i]};
      node.eval=E.evaluatePoolCandidate(node.candidate);node.rank=rank(node.eval);
      if(node.eval.reason===E.REASONS.ACCEPTED)return node;
      if(fallbackEligible(node.eval)&&(!fallback||node.rank>fallback.rank))fallback=node;
    }
    if(!fallback)throw new Error('no non-brutal bounded expert base candidate');
    return fallback;
  }
  function children(puzzle,seed){
    var out=[];
    for(var i=0;i<81&&out.length<CHILD_LIMIT;i++)if(puzzle[i]!=='0'){
      var p=puzzle.slice(0,i)+'0'+puzzle.slice(i+1),c=candidate(p,seed),ev=E.evaluatePoolCandidate(c);
      if(ev.reason!==E.REASONS.NON_UNIQUE&&ev.reason!==E.REASONS.INVALID)out.push({candidate:c,eval:ev,removed:i,rank:rank(ev)});
    }
    return out;
  }
  function makeCandidate(seed){
    if(!Number.isSafeInteger(seed)||seed<0)throw new RangeError('seed must be a non-negative safe integer');
    var rootNode=baseNode(seed);if(rootNode.eval.reason===E.REASONS.ACCEPTED)return rootNode.candidate;
    var beam=[rootNode],best=rootNode;
    for(var depth=0;depth<MAX_DEPTH;depth++){
      var next=[];
      for(var b=0;b<beam.length;b++){
        if(!expandable(beam[b].eval))continue;
        var kids=children(beam[b].candidate.puzzle,seed);
        for(var k=0;k<kids.length;k++){
          var node=kids[k];if(node.eval.reason===E.REASONS.ACCEPTED)return node.candidate;
          if(fallbackEligible(node.eval)&&node.rank>best.rank)best=node;
          if(expandable(node.eval))next.push(node);
        }
      }
      next.sort(function(a,b){return b.rank-a.rank||a.candidate.puzzle.localeCompare(b.candidate.puzzle);});
      beam=next.slice(0,BEAM_WIDTH);if(!beam.length)break;
    }
    return best.candidate;
  }
  var api={PROFILE:PROFILE,MAX_DEPTH:MAX_DEPTH,BEAM_WIDTH:BEAM_WIDTH,CHILD_LIMIT:CHILD_LIMIT,BASE_PROFILE_LIMIT:BASE_PROFILE_LIMIT,BASE_PROFILES:BASE_PROFILES,EXPERT_MIN:EXPERT_MIN,EXPERT_MAX:EXPERT_MAX,EXPERT_TARGET:EXPERT_TARGET,makeCandidate:makeCandidate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ClassicHumanExpertSculptor=api;
})(typeof globalThis!=='undefined'?globalThis:this);
