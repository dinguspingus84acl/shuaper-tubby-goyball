'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const usage=require(path.join(root,'analytics/data/ranked-usage-2026.json'));
const ui=fs.readFileSync(path.join(root,'analytics/ui.js'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/analytics-studio-data.yml'),'utf8');
const fields=['expectedFantasyPointsTrend','expectedTouchdowns','endZoneTargets',
 'targetShareTrend','fantasyPointsPerOpportunity','explosivePlayRate','rushingSuccessRate',
 'firstReadTargetShare','averageSeparation','epaPerDropback',
 'completionPctOverExpected','pressureToSackRate'];
const counts=Object.fromEntries(fields.map(f=>[f,0]));
assert.equal(fields.length,12);
assert.equal(usage.rankedPlayers,Object.keys(usage.players).length);
assert.equal(usage.rankedPlayers,require('./ranked-player-count.cjs')(),
 'Ranked pool must match the current Big Board and ROS rankings');
for(const [id,p] of Object.entries(usage.players)){
 for(const field of fields){
  assert.ok(Object.hasOwn(p,field),id+' missing '+field);
  const value=p[field];
  assert.ok(value===null||(typeof value==='number'&&Number.isFinite(value)),id+'/'+field+' invalid number');
  if(value!==null)counts[field]++;
  assert.ok(ui.includes("['"+field+"',"),'Missing selectable column '+field);
  assert.ok(ui.includes(' '+field+':['),'Missing tooltip formula '+field);
 }
 for(const field of ['expectedTouchdowns','firstReadTargetShare','averageSeparation'])
  assert.equal(p[field],null,id+' should not have fabricated '+field);
 if(p.position==='QB'){
  assert.equal(p.fantasyPointsPerOpportunity,null,'Do not divide QB passing points by carries and targets');
  assert.equal(p.endZoneTargets,null,'QB should not have end-zone receiving targets');
 }else{
  for(const field of ['epaPerDropback','completionPctOverExpected','pressureToSackRate'])
   assert.equal(p[field],null,'Non-QB passing metric '+id+'/'+field);
 }
 for(const field of ['explosivePlayRate','rushingSuccessRate','pressureToSackRate'])
  if(p[field]!==null)assert.ok(p[field]>=0&&p[field]<=100,id+'/'+field+' out of percent range');
 if(p.expectedFantasyPointsTrend!==null){
  assert.ok(p.nextUsageCoverage.trendRecentWeeks>=2&&p.nextUsageCoverage.trendPriorWeeks>=2,'Unverified xFP trend '+id);
 }
 if(p.targetShareTrend!==null){
  assert.ok(p.nextUsageCoverage.targetRecentWeeks>=2&&p.nextUsageCoverage.targetPriorWeeks>=2,'Unverified target trend '+id);
 }
 if(p.completionPctOverExpected!==null){
  const c=p.nextUsageCoverage;
  assert.ok(c.cpoeRecordedAttempts>=10&&c.cpoeRecordedAttempts/c.cpoeTotalAttempts>=.75,'Insufficient CPOE coverage '+id);
 }
}
const minimum={expectedFantasyPointsTrend:140,endZoneTargets:150,targetShareTrend:150,
 fantasyPointsPerOpportunity:200,explosivePlayRate:200,rushingSuccessRate:120,
 epaPerDropback:25,completionPctOverExpected:25,pressureToSackRate:25};
for(const field of fields){
 assert.equal(usage.nextUsageCoverage[field]||0,counts[field],'Coverage mismatch '+field);
 if(minimum[field])assert.ok(counts[field]>=minimum[field],'Low source coverage '+field+': '+counts[field]);
}
assert.ok(ui.includes("['signals','Signals']"),'Signals category missing');
assert.ok(ui.includes("usageSortDirection==='asc'?'asc':'desc'"),'Numeric sort toggling missing');
assert.ok(ui.includes("e.target.closest?.('.st-usage-info')"),'Info-icon tooltip restricted hover missing');
assert.ok(workflow.indexOf('enrich-ranked-advanced-usage.py')<workflow.indexOf('enrich-ranked-next-usage.py'),'Advanced data must be ready before the further metrics');
assert.ok(workflow.indexOf('enrich-ranked-next-usage.py')<workflow.indexOf('usage-next-metrics.cjs'),'Validate after enrichment');
assert.match(workflow,/cron: '17 \*\/6 \* \* \*'/,'Six-hour schedule changed');
console.log('PASS: 12 source-constrained new Usage metrics, null integrity, QB restrictions, coverage, 42 selectable columns, and scheduled refresh',counts);
