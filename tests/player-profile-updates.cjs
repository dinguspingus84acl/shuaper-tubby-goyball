'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const profile=read('unified-profile.js'),espn=read('espn-live.js'),history=read('player-history.js'),
      studio=read('analytics/ui.js'),studioCss=read('analytics/studio.css'),
      search=read('player-search.js'),searchCss=read('player-search.css'),
      html=read('index.html'),live=read('my-teams-live.js'),loader=read('analytics-dashboard.js');
for(const f of ['unified-profile.js','espn-live.js','player-history.js','analytics/ui.js','player-search.js','my-teams-live.js','analytics-dashboard.js'])
 new vm.Script(read(f),{filename:f});
for(const [,code] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
 if(code.trim())new vm.Script(code);
assert.ok(profile.includes('<span class="featured-jersey-number" aria-label="Jersey number"></span></span></h2>'), 'Jersey number must be in last-name flex row');
assert.ok(profile.includes('flex-flow:row nowrap!important')&&profile.includes('position:static!important'),'Jersey cannot be positioned over a name');
assert.ok(profile.includes('overflow-wrap:anywhere!important'),'Long names must wrap before hitting the number');
assert.ok(studio.includes("target.innerHTML=C.line({title:'Weekly scoring',labels:gs.map(g=>'W'+g.week),series:[{name:'PPR',values:gs.map(g=>g.points)}]}"));
assert.ok(!studio.includes("target.innerHTML=C.line({title:'Weekly scoring',labels:gs.map(g=>'W'+g.week),series:[{name:'PPR',values:gs.map(g=>g.points)},{name:'3-game average'"));
function sourceFunction(source,start,end){
 const i=source.indexOf(start),j=source.indexOf(end,i);
 assert.ok(i>=0&&j>i,start+' missing');
 return vm.runInNewContext('('+source.slice(i,j).trim()+')');
}
const columns=sourceFunction(espn,'function gameLogColumns(mode,position){','function cleanGameLogOpponent');
const modes=sourceFunction(espn,'function gameLogModesFor(position){','function defaultGameLogMode');
for(const pos of ['RB','WR','TE','QB']){
 const expected=pos==='QB'?['pass','rush']:['rush','rec'];
 assert.equal(Array.from(modes(pos),x=>x.key).join(','),expected.join(','),'Wrong mode buttons for '+pos);
 for(const mode of expected){
  const keys=Array.from(columns(mode,pos),x=>x.key);
  assert.equal(keys[0],'pts');assert.equal(keys[1],'snapRate');
  if(mode==='rush')assert.equal(keys.join(','),'pts,snapRate,rushAtt,rushYds,rushTD');
  if(mode==='rec')assert.equal(keys.join(','),'pts,snapRate,receptions,targets,recYds,recTD');
  if(mode==='pass')assert.equal(keys.join(','),'pts,snapRate,completions,passAtt,passYds,passTD,turnovers');
 }
}
assert.ok(espn.includes('data-gl-mode=')&&espn.includes('data-hist-gl-mode='),'Both current and historical game logs need controls');
assert.ok(espn.includes('attachGameLogSnapRates')&&history.includes('getWeeklySnapRates'),'Keep verified snap rates');
assert.ok(espn.includes("g.snapRate===null||g.snapRate===undefined"),'Missing snaps must not be shown as zero');
assert.ok(espn.includes('width:max-content!important'),'Keep swipeable tables');
assert.ok(search.includes('faceHtml(p)')&&search.includes('legacy-stats/headshots.json'),'Search must use player photos');
assert.ok(search.includes('shua-search-initials')&&search.includes('shua-search-face'),'Initials fallback required');
assert.ok(searchCss.includes('.shua-search-avatar')&&searchCss.includes('[hidden]{display:none!important}'),'Search avatar styling');
assert.ok(studio.includes('stGlobalPlayerMatches')&&studio.includes('showAnalyticsPlayerMatches'),'Analytics suggestions required');
assert.ok(studio.includes("face(p,'st-global-player-face')"),'Analytics suggestions must include player faces');
assert.ok(studioCss.includes('st-global-search-inputrow')&&studioCss.includes('st-global-player-matches'),'Analytics search styling required');
assert.ok(html.includes('unified-profile.js?v=20261101-inline-jersey2')&&html.includes('player-search.js?v=20261101-faces2'));
assert.ok(html.includes('espn-live.js?v=20261101-gamelog-categories2')&&html.includes('analytics-dashboard.js?v=20261101-analytics-search3'));
assert.ok(loader.includes("const version = '20261101-analytics-search2'"));
assert.ok(live.includes("credentials:'omit'")&&live.includes('view=mTeam&view=mRoster&view=mStatus'));
assert.ok(live.includes('visibilitychange')&&live.includes('lastSuccess'));
console.log('PASS: inline jersey, restored game-log category buttons, snap %, face search, clean Analytics search, and unchanged private-roster safeguards.');
