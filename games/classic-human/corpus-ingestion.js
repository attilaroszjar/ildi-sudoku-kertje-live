(function(root){'use strict';
  var TARGET_BANDS=Object.freeze(['gentle','focused','expert','brutal']);

  function gridToString(grid){
    if(!Array.isArray(grid)||grid.length!==9||grid.some(function(row){return !Array.isArray(row)||row.length!==9;}))throw new TypeError('classic grid must be 9x9');
    return grid.map(function(row){return row.map(function(value){if(!Number.isInteger(value)||value<0||value>9)throw new TypeError('classic grid values must be 0..9');return value||0;}).join('');}).join('');
  }

  function loadLegacyRuntime(){
    if(typeof require!=='function')throw new Error('legacy corpus ingestion requires Node/CommonJS');
    if(!root.SudokuBank)require('../sudoku-bank.js');
    if(!root.SudokuGenerator)require('../sudoku-generator.js');
    var bank=root.SudokuBank||[],generator=root.SudokuGenerator;
    var classic=bank.find(function(item){return item&&item.id==='classic';});
    if(!classic||!generator||typeof generator.make!=='function')throw new Error('classic legacy generator runtime unavailable');
    return {classic:classic,generator:generator};
  }

  function resolveRuntime(runtime){
    if(runtime==null)return loadLegacyRuntime();
    if(!runtime||!runtime.classic||!runtime.generator||typeof runtime.generator.make!=='function')throw new TypeError('runtime must provide classic and generator.make');
    return runtime;
  }

  function normalizeSeeds(seeds){
    seeds=seeds==null?[101,202,303]:seeds;
    if(!Array.isArray(seeds)||!seeds.length)throw new TypeError('seeds must be a non-empty array');
    return seeds.map(function(seed){if(!Number.isInteger(seed)||seed<0)throw new TypeError('seed must be a non-negative integer');return seed>>>0;});
  }

  function ingestLegacyClassic(options){
    options=options||{};
    var runtime=resolveRuntime(options.runtime),seeds=normalizeSeeds(options.seeds);
    var sourceBands=options.sourceBands||['gentle','focused','expert'];
    if(!Array.isArray(sourceBands)||!sourceBands.length)throw new TypeError('sourceBands must be a non-empty array');
    var rows=[];
    sourceBands.forEach(function(sourceBand){
      if(['gentle','focused','expert'].indexOf(sourceBand)<0)throw new TypeError('legacy classic generator supports gentle/focused/expert only');
      seeds.forEach(function(seed){
        var made=runtime.generator.make(runtime.classic,seed,sourceBand);
        rows.push(Object.freeze({
          id:'legacy-classic-'+sourceBand+'-'+seed,
          puzzle:gridToString(made.puzzle),
          expectedBand:null,
          source:'legacy-classic-generator',
          tags:Object.freeze(['legacy-generator',sourceBand].sort()),
          metadata:Object.freeze({
            sourceBand:sourceBand,
            seed:seed,
            clueCount:made.generation&&Number.isFinite(made.generation.clues)?made.generation.clues:null,
            generatorFamily:made.generation&&made.generation.generatorFamily||null,
            legacyDifficultyScore:made.generation&&Number.isFinite(made.generation.difficultyScore)?made.generation.difficultyScore:null
          })
        }));
      });
    });
    return Object.freeze(rows);
  }

  function normalizeCurated(records){
    if(records==null)return Object.freeze([]);
    if(!Array.isArray(records))throw new TypeError('curated records must be an array');
    return Object.freeze(records.map(function(record,index){
      if(!record||typeof record!=='object')throw new TypeError('curated record must be an object');
      var puzzle=typeof record.puzzle==='string'?record.puzzle:gridToString(record.puzzle);
      if(puzzle.length!==81||!/^[0-9.]+$/.test(puzzle))throw new TypeError('curated puzzle must be an 81-char classic grid');
      return Object.freeze({
        id:record.id==null?'curated-'+String(index+1).padStart(4,'0'):String(record.id),
        puzzle:puzzle,
        expectedBand:record.expectedBand==null?null:String(record.expectedBand),
        source:record.source==null?'curated':String(record.source),
        tags:Object.freeze(Array.isArray(record.tags)?record.tags.map(String).sort():[]),
        metadata:Object.freeze(Object.assign({},record.metadata||{}))
      });
    }));
  }

  function coverage(records){
    if(!Array.isArray(records))throw new TypeError('records must be an array');
    var sourceBandCounts={},expectedBandCounts={};
    records.forEach(function(record){
      var sourceBand=record&&record.metadata&&record.metadata.sourceBand;
      if(sourceBand)sourceBandCounts[sourceBand]=(sourceBandCounts[sourceBand]||0)+1;
      if(record&&record.expectedBand)expectedBandCounts[record.expectedBand]=(expectedBandCounts[record.expectedBand]||0)+1;
    });
    var observed={};
    Object.keys(sourceBandCounts).forEach(function(b){observed[b]=1;});
    Object.keys(expectedBandCounts).forEach(function(b){observed[b]=1;});
    return Object.freeze({
      sourceBandCounts:Object.freeze(Object.assign({},sourceBandCounts)),
      expectedBandCounts:Object.freeze(Object.assign({},expectedBandCounts)),
      missingTargetBands:Object.freeze(TARGET_BANDS.filter(function(band){return !observed[band];}))
    });
  }

  function buildRepresentativeCorpus(options){
    options=options||{};
    var legacy=options.includeLegacy===false?[]:ingestLegacyClassic({runtime:options.runtime,seeds:options.seeds,sourceBands:options.sourceBands});
    var curated=normalizeCurated(options.curated||[]);
    var records=legacy.concat(curated);
    return Object.freeze({records:Object.freeze(records),coverage:coverage(records)});
  }

  var api={TARGET_BANDS:TARGET_BANDS,gridToString:gridToString,ingestLegacyClassic:ingestLegacyClassic,normalizeCurated:normalizeCurated,coverage:coverage,buildRepresentativeCorpus:buildRepresentativeCorpus};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanCorpusIngestion=api;
})(typeof globalThis!=='undefined'?globalThis:this);
