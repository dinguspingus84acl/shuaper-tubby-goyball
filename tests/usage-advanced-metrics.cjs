#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'..');
const usage=require(path.join(base,'analytics/data/ranked-usage-2026.json'));
const source=require(path.join(base,'analytics/data/heatradar-routes-2026.json'));
const ui=fs.readFileSync(path.join(base,'analytics/ui.js'),'utf8');
const fields=[
 'expectedFantasyPointsPerGame','fantasyPointsOverExpected','redZoneTargetShare',
 'insideFiveCarryShare','insideTenTargets','routeParticipationTrend','deepTargetRate',
 'receivingFirstDownsPerRoute','yardsAfterContactPerCarry','qbDesignedRushesPerGame',
];
const minimum=[200,200,180,180,180,100,160,160,100,30];
const counts=Object.fromEntries(fields.map(name=>[name,0]));
const round=x=>Number(x.toFixed(2));
assert.equal(usage.season,2026);
assert.equal(usage.rankedPlayers,Object.keys(usage.players).length);
assert.match(usage.expectedPointsSource,/ffopportunity\/releases/);
assert.match(usage.pfrRushingSource,/advstats_week_rush_2026\.csv/);
assert.match(usage.advancedPbpSource,/play_by_play_2026\.csv\.gz/);
assert.equal(fields.length,10);
for(const [id,row] of Object.entries(usage.players)){
 for(const field of fields){
  assert.ok(Object.hasOwn(row,field),'Missing '+field+' for '+id);
  assert.ok(row[field]===null||(typeof row[field]==='number'&&Number.isFinite(row[field])),
   id+'/'+field+' must be finite or null');
  if(row[field]!==null)counts[field]++;
  assert.ok(ui.includes("['"+field+"',"),'Missing selectable Usage column '+field);
  assert.ok(ui.includes(' '+field+':['),'Missing info-icon definition '+field);
 }
 if(row.position==='QB'){
  for(const field of ['redZoneTargetShare','insideTenTargets',
   'deepTargetRate','receivingFirstDownsPerRoute','routeParticipationTrend'])
   assert.equal(row[field],null,'QB has receiving-only metric '+field);
 }else{
  assert.equal(row.qbDesignedRushesPerGame,null,'Non-QB designed rushes for '+id);
 }
 for(const field of ['redZoneTargetShare','insideFiveCarryShare','deepTargetRate',
  'receivingFirstDownsPerRoute']){
  const value=row[field];
  if(value!==null)assert.ok(value>=0&&value<=100,id+'/'+field+' percentage out of range');
 }
 if(row.routeParticipationTrend!==null){
  const weeks=Object.entries(row.routeWeeks||{});
  const last=usage.routeThroughWeek;
  const window=(from,to)=>{
   const records=weeks.filter(([week,w])=>+week>=from&&+week<=to&&w.routeParticipation>0)
    .map(([,w])=>({routes:w.routes,estimatedPasses:w.routes/(w.routeParticipation/100)}));
   if(records.length<2)return null;
   const routes=records.reduce((x,w)=>x+w.routes,0);
   const opportunities=records.reduce((x,w)=>x+w.estimatedPasses,0);
   return 100*routes/opportunities;
  };
  const current=window(last-2,last),prior=window(last-5,last-3);
  assert.ok(current!==null&&prior!==null,'Insufficient charted route weeks for '+id);
  // The saved weekly percentages are rounded twice; 0.02pp is sufficient.
  assert.ok(Math.abs(row.routeParticipationTrend-round(current-prior))<0.03,
   id+' route trend is not a weighted last-3 minus prior-3 comparison');
 }
 if(row.receivingFirstDownsPerRoute!==null){
  assert.ok(row.firstDownRouteCoverage?.matchedWeeks>0,id+' lacks same-week route coverage');
 }
 if(row.fantasyPointsOverExpected!==null){
  assert.ok(row.expectedPointsCoverage?.matchedWeeks>0,id+' lacks xFP weeks');
 }
}
for(let i=0;i<fields.length;i++){
 assert.ok(counts[fields[i]]>=minimum[i],fields[i]+' has too few verified players: '+counts[fields[i]]);
 assert.equal(usage.advancedUsageCoverage[fields[i]],counts[fields[i]],'Coverage count does not match '+fields[i]);
}
assert.ok(source.rows.length>1000,'No verified HeatRadar charting remains');
assert.match(ui,/\['advanced','Advanced'\]/,'Advanced group must be visible');
assert.match(ui,/usageSortDirection==='asc'\?'asc':'desc'/,'Numeric sorting must use direction');
assert.match(ui,/data-st-usage-info/,'Stats must have info-only tooltips');
console.log('PASS: 10 selectable, sortable, source-backed advanced Usage metrics',counts);
