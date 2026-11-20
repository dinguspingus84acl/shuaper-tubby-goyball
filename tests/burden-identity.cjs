'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const file of ['espn-live.js','player-history.js','unified-profile.js']){
 const source=fs.readFileSync(file,'utf8');
 const line=source.split('\n').find(x=>x.startsWith('const norm='));
 const key=vm.runInNewContext(line+'\nnorm');
 assert.equal(key('Luther Burden III'),key('Luther Burden'));
 const current=require('../analytics/data/season-2026.json').players.find(p=>key(p.name)===key('Luther Burden'));
 const past=require('../legacy-stats/2025.json').rows.find(p=>key(p.name)===key('Luther Burden'));
 assert.equal(current.id,'4685278');assert.ok(current.games.length>0);
 assert.ok(past,'Historical season must match the same display name');
 assert.equal(key('Luther Burden'), 'lutherburden');
 assert.notEqual(key('Luther Burden'), key('Other Burden'));
 console.log('PASS: '+file+' matches Luther Burden to his current and historical source records');
}
