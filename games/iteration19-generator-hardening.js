(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function cloneValue(v){return JSON.parse(JSON.stringify(v));}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function orientedLine(grid,cl){var a=cl.axis==='row'?grid[cl.index].slice():grid.map(function(row){return row[cl.index];});if(cl.side==='right'||cl.side==='bottom')a.reverse();return a;}
  function visibleCount(line,park){var max=0,count=0;for(var i=0;i<line.length;i++){var v=line[i];if(v===park)continue;if(v>max){max=v;count++;}}return count;}
  function searchStats(source,variant){
    var grid=clone(source),n=grid.length,park=(variant.data&&variant.data.parkValue)||7,maxDigit=(variant.data&&variant.data.maxDigit)||6,parksPerLine=(variant.data&&variant.data.parksPerLine)||2;
    var stats={nodes:0,branches:0,deadEnds:0,solutions:0};
    function rowColValid(r,c){
      var rowCounts={},colCounts={},rp=0,cp=0;
      for(var i=0;i<n;i++){
        var rv=grid[r][i],cv=grid[i][c];
        if(rv===park)rp++;else if(rv){rowCounts[rv]=(rowCounts[rv]||0)+1;if(rv<1||rv>maxDigit||rowCounts[rv]>1)return false;}
        if(cv===park)cp++;else if(cv){colCounts[cv]=(colCounts[cv]||0)+1;if(cv<1||cv>maxDigit||colCounts[cv]>1)return false;}
      }
      if(rp>parksPerLine||cp>parksPerLine)return false;
      if(grid[r].every(Boolean)&&rp!==parksPerLine)return false;
      var col=grid.map(function(row){return row[c];});if(col.every(Boolean)&&cp!==parksPerLine)return false;
      return true;
    }
    function cluesValid(){
      var clues=(variant.data&&variant.data.clues)||[];
      for(var i=0;i<clues.length;i++){
        var cl=clues[i],line=orientedLine(grid,cl);
        if(line.every(Boolean)&&visibleCount(line,park)!==cl.count)return false;
      }
      return true;
    }
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]&&!rowColValid(r,c))return stats;
    if(!cluesValid())return stats;
    function validAt(r,c){return rowColValid(r,c)&&cluesValid();}
    function visit(){
      if(stats.solutions>=2)return;
      stats.nodes++;
      var br=-1,bc=-1,bm=0,best=n+1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){
        var mask=0;
        for(var d=1;d<=park;d++){grid[rr][cc]=d;if(validAt(rr,cc))mask|=1<<(d-1);grid[rr][cc]=0;}
        var count=bitCount(mask);if(count<best){br=rr;bc=cc;bm=mask;best=count;if(count<=1)break;}
      }
      if(br<0){stats.solutions++;return;}
      if(!bm){stats.deadEnds++;return;}
      if(best>1)stats.branches++;
      for(var bits=bm;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=digit;visit();grid[br][bc]=0;if(stats.solutions>=2)return;}
    }
    visit();return stats;
  }
  function certifiedExpert(seed){
    var corpus=root.SkyscraperParks2CertifiedCorpus;
    if(!Array.isArray(corpus)||!corpus.length)return null;
    var expert=corpus.filter(function(x){return x&&x.variantId==='skyscraper-parks2'&&x.difficulty==='expert'&&x.certificate&&x.certificate.exactVariantUnique===true&&x.certificate.variantEssential===true&&x.certificate.locallyIrreducibleUnderProductionContract===true;});
    if(!expert.length)return null;
    var entry=expert[(seed>>>0)%expert.length],cert=entry.certificate;
    return {puzzle:clone(entry.puzzle),solution:clone(entry.solution),data:cloneValue(entry.data),generation:{unique:true,variantEssential:true,verification:'certified-corpus-exact',generatorFamily:'certified-expert-corpus',policy:'contract-driven-local-irreducibility',corpusEntryId:entry.id,corpusSourceSeed:entry.sourceSeed,locallyIrreducibleUnderProductionContract:true,localIrreducibilityProof:cert.localIrreducibilityProof,variantEssentialityProof:'certified-corpus-base-nonuniqueness',uniquenessProof:'certified-corpus-exact-variant-uniqueness',measurementSkipped:'certified-corpus-exact-contract',measured:false,certificate:cloneValue(cert)}};
  }
  generator.iteration19SearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){
    if(variant&&variant.id==='skyscraper-parks2'&&difficulty==='expert'){
      var corpusOut=certifiedExpert(seed);
      if(corpusOut)return corpusOut;
    }
    var out=baseMake.call(this,variant,seed,difficulty);
    if(variant&&variant.id==='skyscraper-parks2'){
      var generation=out&&out.generation||{};
      var certified=generation.locallyIrreducibleUnderProductionContract===true&&
        generation.variantEssentialityProof==='monotone-base-nonuniqueness-under-clue-removal'&&
        generation.uniquenessProof==='exact-unique-invariant-through-verified-removal-pass';
      if(certified){
        generation.measurementSkipped='exact-local-irreducibility-certificate';
        generation.measured=false;
        return out;
      }
      var measured=Object.assign({},variant,{data:out.data||variant.data,solution:out.solution||variant.solution});
      var stats=searchStats(out.puzzle,measured);
      out.generation.searchStats=stats;
      out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;
      out.generation.generatorFamily=(out.generation.generatorFamily||'variant-essential')+'-measured';
    }
    return out;
  };
})(typeof window!=='undefined'?window:globalThis);
