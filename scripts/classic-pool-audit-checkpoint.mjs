#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const A=require('../games/classic-human/pool-audit.js');
const C=require('../games/classic-human/pool-checkpoint.js');

function usage(){console.error('usage: node scripts/classic-pool-audit-checkpoint.mjs <checkpoint.json>');process.exit(2);}
const file=process.argv[2];if(!file)usage();
const abs=path.resolve(file);
let checkpoint;try{checkpoint=C.parse(fs.readFileSync(abs,'utf8'));}catch(error){console.error('CLASSIC_POOL_AUDIT ERROR '+(error&&error.message?error.message:String(error)));process.exit(2);}
const out=A.auditCheckpoint(checkpoint);
const j=JSON.stringify;
console.log('CLASSIC_POOL_AUDIT '+out.targetBand.toUpperCase()+' '+(out.gate.pass?'PASS':'FAIL')+' attempted='+out.attempted+' accepted='+out.accepted+' acceptance='+out.acceptanceRate.toFixed(4)+' duplicates='+out.duplicates+' duplicate_rate='+out.duplicateRate.toFixed(4));
console.log('CLASSIC_POOL_AUDIT SCORE '+j(out.score)+' CLUES '+j(out.clueCount));
console.log('CLASSIC_POOL_AUDIT TECHNIQUES '+j(out.hardestTechniques)+' SIGNATURES '+j(out.techniqueSignatures));
console.log('CLASSIC_POOL_AUDIT DIVERSITY puzzle_hash_unique='+(out.puzzleHashesUnique?1:0)+' record_hash_unique='+(out.recordHashesUnique?1:0)+' exact_mask_duplicates='+out.exactMaskDuplicates+' max_mask_similarity='+(out.maxMaskSimilarity==null?'null':out.maxMaskSimilarity.toFixed(4)));
console.log('CLASSIC_POOL_AUDIT REJECTIONS '+j(out.rejections));
if(!out.gate.pass){console.log('CLASSIC_POOL_AUDIT FAILURES '+j(out.gate.failures));process.exitCode=1;}
