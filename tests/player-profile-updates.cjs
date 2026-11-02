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
assert.ok(profile.includes('function fitFeaturedName(card)')&&profile.includes('white-space:nowrap!important;overflow-wrap:normal!important'),'All names must fit on exactly two lines');
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
 const expected=pos==='QB'?['pass','rush','snaps']:['rush','rec','snaps'];
 assert.equal(Array.from(modes(pos),x=>x.key).join(','),expected.join(','),'Wrong mode buttons for '+pos);
 for(const mode of expected){
  const keys=Array.from(columns(mode,pos),x=>x.key);
  assert.equal(keys[0],'pts');assert.ok(!keys.includes('snapRate'),'Snap percentages use the Snap Rates button, not rushing/receiving columns');
  if(mode==='rush')assert.equal(keys.join(','),'pts,rushAtt,rushYds,rushTD');
  if(mode==='rec')assert.equal(keys.join(','),'pts,receptions,targets,recYds,recTD');
  if(mode==='pass')assert.equal(keys.join(','),'pts,completions,passAtt,passYds,passTD,turnovers');
 }
}
assert.ok(espn.includes('data-gl-mode=')&&espn.includes('data-hist-gl-mode='),'Both current and historical game logs need controls');
assert.ok(espn.includes('attachGameLogSnapRates')&&history.includes('getWeeklySnapRates'),'Keep verified snap rates');
assert.ok(espn.includes("g.snapRate===null||g.snapRate===undefined"),'Missing snaps must not be shown as zero');
assert.ok(!profile.includes("['snaps','Snap Rates']")&&!profile.includes('id="unifiedSnapsPanel"'),'Snap Rates must not be a profile tab');
assert.ok(espn.includes("{key:'snaps',label:'Snap Rates'}")&&espn.includes('data-embedded-snap-rates'),'Snap Rates must be a Game Log category button');
assert.ok(espn.includes('async function renderSnapRatesData')&&espn.includes('data-snap-year'),'Keep weekly Snap Rates and season selection logic');
assert.ok(espn.includes('espn-game-log-table espn-snap-game-log')&&espn.includes('const summary=\'<div class="espn-game-log-summary">'), 'Snap Rates must use the same Game Log table and season summary as rushing');
assert.ok(!espn.includes('espn-snap-summary')&&!espn.includes('espn-snap-table'), 'Remove the separate Snap Rates card/table styling');
assert.ok(espn.includes('overflow-x:hidden!important')&&espn.includes('table-layout:fixed!important'),'Game log should fit without sideways scrolling');
assert.ok(espn.includes('font-size:clamp(.9rem,4vw,1.02rem)!important')&&espn.includes('.espn-game-log-table tbody td.gl-stat,.espn-game-log-table tbody td.gl-pts'),'All Game Log amounts must be uniformly larger');
assert.ok(profile.includes('ensurePlayerSwipePreview(target)')&&profile.includes("translate3d('+shift+'px,0,0)"),'Swipe must move with the finger and preview next player');
assert.ok(profile.includes('featured-name-ladd'),'Ladd surname must stay on one line');
assert.ok(search.includes('faceHtml(p)')&&search.includes('legacy-stats/headshots.json'),'Search must use player photos');
assert.ok(search.includes('shua-search-initials')&&search.includes('shua-search-face'),'Initials fallback required');
assert.ok(searchCss.includes('.shua-search-avatar')&&searchCss.includes('[hidden]{display:none!important}'),'Search avatar styling');
assert.ok(search.includes('shuaSearchInputFace')&&search.includes('syncInputAvatar(found[0])'),'Player face must also show in search input');
assert.ok(searchCss.includes('.shua-search-field-shell')&&searchCss.includes('.shua-search-input-avatar'),'Face-preview input styling');
assert.ok(search.includes('shuaGlobalSearchBar')&&search.includes("sticky.insertAdjacentElement('afterend',globalSearch)"),'Search must stay visible across site tabs outside main content');
assert.ok(searchCss.includes('#shuaGlobalSearchBar .shua-global-search-launch')&&searchCss.includes('body.phone-mode #shuaGlobalSearchBar'),'Desktop and phone need a visible global search bar');
assert.ok(searchCss.includes('pointer-events:none')&&searchCss.includes('pointer-events:auto'),'Search bar must not cover navigation with an invisible hitbox');
assert.ok(studio.includes('stGlobalPlayerMatches')&&studio.includes('showAnalyticsPlayerMatches'),'Analytics suggestions required');
assert.ok(studio.includes("face(p,'st-global-player-face')"),'Analytics suggestions must include player faces');
assert.ok(studioCss.includes('st-global-search-inputrow')&&studioCss.includes('st-global-player-matches'),'Analytics search styling required');
assert.ok(studio.includes('stGlobalLeadingAvatar')&&studio.includes('setAnalyticsLeadingAvatar(options[0]||null)'),'Analytics input needs a face preview');
assert.ok(studio.includes("magnifier.toggleAttribute('hidden',!!player)"),'Analytics magnifier must actually hide as an SVG attribute');
assert.ok(studioCss.includes('.st-global-leading-avatar'),'Analytics leading face styling required');
assert.ok(html.includes('unified-profile.js?v=20261101-two-line-names2')&&html.includes('player-search.js?v=20261101-search-all-tabs3'));
assert.ok(html.includes('espn-live.js?v=20261101-snap-log-format3')&&html.includes('analytics-dashboard.js?v=20261101-input-face5'));
assert.ok(html.includes('player-search.js?v=20261101-search-all-tabs3')&&html.includes('player-search.css?v=20261101-search-all-tabs4'));
assert.ok(loader.includes("const version = '20261101-input-face5'"));
assert.ok(live.includes("credentials:'omit'")&&live.includes('view=mTeam&view=mRoster&view=mStatus'));
assert.ok(live.includes('visibilitychange')&&live.includes('lastSuccess'));
console.log('PASS: inline jersey, all two-line names, larger fixed game-log tables, rushing-style Snap Rates, global search on every tab, interactive swipe, and existing search/roster safeguards.');
