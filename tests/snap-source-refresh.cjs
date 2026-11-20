'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('espn-live.js','utf8');
const start=s.indexOf('let currentSeasonSnapPromise=null;'),end=s.indexOf('async function attachGameLogSnapRates',start);
let calls=0;
const context={fetch:async(url,options)=>{assert.equal(options.cache,'no-store');calls++;if(calls===1)throw Error('Temporary source failure');return {ok:true,json:async()=>require('../analytics/data/season-2026.json')};}};
vm.createContext(context);vm.runInContext(s.slice(start,end),context);
(async()=>{
 assert.equal(await context.getCurrentSeasonSnapDataset(),null);
 const ds=await context.getCurrentSeasonSnapDataset();assert.ok(ds);
 const p=ds.players.find(p=>p.name==='Luther Burden III');
 assert.ok(p.games.some(g=>Number.isFinite(g.snapRate)&&g.snaps>0));
 await context.getCurrentSeasonSnapDataset();assert.equal(calls,2,'Successful data is reused; failed requests can retry');
 console.log('PASS: fresh snap request, transient failure recovery, Burden weekly snap source.');
})().catch(e=>{console.error(e);process.exitCode=1;});
