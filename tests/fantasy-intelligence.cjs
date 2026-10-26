'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const context={console};context.globalThis=context;
for(const part of ['core.js','intelligence.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'analytics',part),'utf8'),context,{filename:part});
const model=context.ShuaStudio.Intelligence;
const canonical=context.ShuaStudio.key;
const season=require('../analytics/data/season-2026.json');
const usage=require('../analytics/data/ranked-usage-2026.json');
const expectedWeekly=require('../analytics/data/expected-weekly-2026.json');
const ranks=require('../ros-rankings.json');
const matchup=require('../analytics/espn-matchups-2026.json');
const ui=fs.readFileSync(path.join(root,'analytics/ui.js'),'utf8');
const view=fs.readFileSync(path.join(root,'analytics/intelligence-view.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'analytics-dashboard.js'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/analytics-studio-data.yml'),'utf8');
const ds={...season,rankData:{position:ranks},espnRatings:matchup,
 latestWeek:Math.max(...season.players.flatMap(p=>p.games.map(g=>g.week))),
 players:season.players.map(p=>({...p,key:canonical(p.name),games:p.games.map(g=>({...g,points:g.totalPoints}))}))};
const byKey=new Map(ds.players.map(p=>[p.key,p]));
assert.equal(usage.rankedPlayers,332);
assert.equal(expectedWeekly.schema,1);
assert.equal(expectedWeekly.season,2026);
assert.equal(expectedWeekly.throughWeek,usage.throughWeek);
let weeklyValues=0;
for(const [key,row] of Object.entries(usage.players)){
 assert.equal(row.expectedWeeklyPpr,undefined,'Weekly xFP must remain in the separate source file');
 row.expectedWeeklyPpr=expectedWeekly.players[key]||{};
 const observed=new Set((byKey.get(key)?.games||[]).map(g=>String(g.week)));
 for(const [week,val] of Object.entries(row.expectedWeeklyPpr)){
  assert.ok(observed.has(week),'Expected xFP from an unobserved week '+key+'/'+week);
  assert.ok(Number(week)>=1&&Number(week)<=ds.latestWeek,'Future xFP lookahead '+key+'/'+week);
  assert.ok(typeof val==='number'&&Number.isFinite(val),'Invalid expected PPR '+key+'/'+week);
  weeklyValues++;
 }
}
assert.ok(weeklyValues>=900,'Unusually few verified weekly xFP values: '+weeklyValues);
const rows=model.build(ds,usage);
assert.equal(rows.length,usage.rankedPlayers,'Some ranked players were dropped from Intelligence');
assert.equal(new Set(rows.map(r=>r.p.key)).size,rows.length,'Duplicate ranked player');
assert.equal(model.nextWeek(ds),ds.latestWeek+1,'Projected week must be the next unplayed week');
const available=rows.filter(r=>r.projection!==null);
assert.ok(available.length>=150,'Not enough supported forecasts: '+available.length);
for(const r of rows){
 if(r.projection===null){
  for(const n of [10,15,20,25])assert.equal(r.probabilities[n],null,'Unsupported hit likelihood '+r.p.key);
  continue;
 }
 assert.ok(r.n>=3,'Forecast without three observed games '+r.p.key);
 assert.ok(r.xfp!==null,'Forecast without xFP '+r.p.key);
 assert.ok(r.opponent?.known&&!r.opponent.bye,'Forecast for bye/unknown matchup '+r.p.key);
 assert.ok(r.adjustment>=.9&&r.adjustment<=1.1,'Unbounded matchup adjustment '+r.p.key);
 assert.ok(Number.isFinite(r.projection)&&r.projection>=0,'Invalid forecast '+r.p.key);
 for(const n of [10,15,20,25])assert.ok(r.probabilities[n]>=0&&r.probabilities[n]<=100,'Invalid probability '+r.p.key+'/'+n);
 assert.ok(r.probabilities[10]>=r.probabilities[15]&&r.probabilities[15]>=r.probabilities[20]&&r.probabilities[20]>=r.probabilities[25],'Likelihoods not decreasing with threshold '+r.p.key);
}
const breakout=model.breakout(rows),buy=model.buySell(rows),sell=model.buySell(rows,'sell');
assert.ok(breakout.length>0&&buy.length>0&&sell.length>0,'Screening lists empty');
assert.ok(breakout.every(r=>r.fpoePerGame<=-.5),'Unverified breakout screen');
assert.ok(buy.every(r=>r.fpoePerGame<=-1),'Buy-low signal reversed');
assert.ok(sell.every(r=>r.fpoePerGame>=1),'Sell-high signal reversed');
const ranking=model.customRankings(rows),valid=ranking.filter(r=>r.customScore!==null);
assert.ok(valid.length>200,'Too few weighted rankings');
assert.ok(valid.every(r=>r.customScore>=0&&r.customScore<=100&&r.signals.length>=2),'Invalid weighted score');
const originalRoi=JSON.stringify(ds.rankData);
const changed=model.customRankings(rows,{actual:100,expected:0,trend:0,matchup:0,consistency:0});
assert.ok(changed.some((r,i)=>r.p.key!==ranking[i]?.p.key),'Weights do not affect rankings');
assert.equal(JSON.stringify(ds.rankData),originalRoi,'Custom rankings mutated published rankings');
const tiers=model.tiers(rows);
assert.ok(tiers.length>100&&tiers.every((r,i)=>i===0||r.p.position!==tiers[i-1].p.position||r.projection<=tiers[i-1].projection&&r.tier>=tiers[i-1].tier),'Invalid projected tiers');
assert.ok(tiers.filter(r=>r.positionIndex===1).length===4,'Projected tiers must restart at each position');
const similar=model.similar(rows,rows.find(r=>r.p.position==='WR'&&r.n>=3).p.key);
assert.ok(similar.length>0&&similar.every(r=>r.p.position==='WR'&&r.common>=4),'Similarity crossed position or sparse coverage');
assert.ok(Math.abs(model.normalCdf(0)-.5)<.000001,'Normal probability center incorrect');
context.ShuaStudio.Chart={colors:['#24efa0','#35b8ff'],line:()=>'<div class="test-chart">Chart</div>'};
vm.runInNewContext(view,context,{filename:'intelligence-view.js'});
const render=context.ShuaStudio.IntelligenceView.render;
const presentation={dataset:ds,usage,person:p=>'<button>'+context.ShuaStudio.esc(p.name)+'</button>',
 panel:(title,subtitle,body)=>'<section><h3>'+title+'</h3>'+body+'</section>',
 face:()=>'',logo:()=>''};
for(const pane of ['breakouts','trades','similar','expected','rankings','forecast','compare']){
 const output=render({...presentation,state:{intelView:pane}});
 assert.ok(output.includes('Fantasy Intelligence')&&output.includes('st-intel-nav'),'View failed to render '+pane);
 assert.ok(!output.includes('could not render'),'View error '+pane);
 if(pane==='expected')assert.ok(output.includes('Expected vs actual'),'Missing weekly xFP graph');
 if(pane==='forecast')assert.ok(output.includes('10+ chance')&&output.includes('25+ chance'),'Missing score probabilities');
 if(pane==='rankings')assert.ok(output.includes('data-st-intel-weight'),'Ranking weights not configurable');
 if(pane==='compare')assert.ok(output.includes('stIntelCompare3'),'Four-way comparison unavailable');
}
for(const marker of ['breakouts','trades','similar','expected','rankings','forecast','compare'])assert.ok(view.includes("['"+marker+"'"),'Missing feature view '+marker);
for(const marker of ['data-st-intel-view','data-st-intel-position','data-st-intel-trade','data-st-intel-rankmode','data-st-intel-weight','stIntelCompare'])assert.ok(ui.includes(marker),'Missing view control wiring '+marker);
for(const file of ['analytics/intelligence.js','analytics/intelligence-view.js'])assert.ok(loader.includes(file),'Lazy loader missing '+file);
assert.ok(ui.includes('Expected vs actual PPR'),'Player Performance lacks expected-vs-actual chart');
assert.ok(ui.includes('analytics/data/expected-weekly-2026.json'),'Expected-week source fetch not integrated');
assert.ok(workflow.includes('node tests/fantasy-intelligence.cjs'),'Six-hour data refresh does not test intelligence');
assert.ok(workflow.includes('enrich-ranked-next-usage.py'),'Six-hour data refresh does not regenerate expected weeks');
console.log('PASS: nine Intelligence features, '+rows.length+' ranked players, '+available.length+' source-supported forecasts, '+weeklyValues+' actual weekly xFP records, no fabricated missing values');
