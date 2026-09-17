'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const C=require('../games/classic-human/pool-checkpoint.js');
const R=require('../games/classic-human/pool-record.js');
const X=require('../games/classic-human/pool-promotion.js');

const sourceDir=process.env.CLASSIC_POOL_SOURCE_DIR||'.tmp/classic-pool-stage0';
const outputDir=process.env.CLASSIC_POOL_OUTPUT_DIR||'data/classic-human-pools';
const bands=['gentle','focused','expert'];
const bundles=[];
for(const band of bands){
  const file=path.join(sourceDir,band+'.json');
  const raw=C.parse(fs.readFileSync(file,'utf8'));
  bundles.push(X.buildBundle(raw,X.TARGETS[band]));
}
const manifest=X.buildManifest(bundles);
fs.mkdirSync(outputDir,{recursive:true});
for(const bundle of bundles){
  fs.writeFileSync(path.join(outputDir,bundle.band+'.json'),R.stableStringify(bundle)+'\n','utf8');
}
fs.writeFileSync(path.join(outputDir,'manifest.json'),R.stableStringify(manifest)+'\n','utf8');
console.log('CLASSIC_POOL_PROMOTE '+JSON.stringify({outputDir,manifestHash:manifest.manifestHash,bands:Object.fromEntries(bundles.map(b=>[b.band,{accepted:b.accepted,bundleHash:b.bundleHash}]))}));
