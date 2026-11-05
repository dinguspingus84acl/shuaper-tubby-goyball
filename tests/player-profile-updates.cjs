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
assert.ok(profile.includes('featured-identity-meta')&&profile.includes('featured-identity-divider'),'Jersey number and position must share a separated line below the name');
assert.ok(profile.includes('featured-player-card broadcast-card')&&profile.includes("card.classList.contains('broadcast-card')?available"),'The broadcast card must fit the surname without subtracting the jersey width');
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
assert.ok(searchCss.includes('body.fantasy-home-mode #shuaGlobalSearchBar{position:fixed;top:70px;left:0;right:0;z-index:35}'),'Search control must remain above the home header while its empty area stays click-through');
assert.ok(studio.includes('stGlobalPlayerMatches')&&studio.includes('showAnalyticsPlayerMatches'),'Analytics suggestions required');
assert.ok(studio.includes("face(p,'st-global-player-face')"),'Analytics suggestions must include player faces');
assert.ok(studioCss.includes('st-global-search-inputrow')&&studioCss.includes('st-global-player-matches'),'Analytics search styling required');
assert.ok(studio.includes('stGlobalLeadingAvatar')&&studio.includes('setAnalyticsLeadingAvatar(options[0]||null)'),'Analytics input needs a face preview');
assert.ok(studio.includes("magnifier.toggleAttribute('hidden',!!player)"),'Analytics magnifier must actually hide as an SVG attribute');
assert.ok(studioCss.includes('.st-global-leading-avatar'),'Analytics leading face styling required');
assert.ok(/unified-profile\.js\?v=[A-Za-z0-9-]+/.test(html)&&html.includes('player-search.js?v=20261102-facefix1'));
assert.ok(profile.includes("if(meta)meta.innerHTML='<strong>'+String(player?.position||bio?.position||'—')+'</strong>';"),'Player identity should not repeat the team abbreviation');
const latestProfileCss=read('broadcast-player-card.css');
assert.ok(latestProfileCss.includes('left:49%!important')&&latestProfileCss.includes('grid-column:1 / -1!important'),'The logo stays behind the portrait and stats span the entire broadcast card');
assert.ok(latestProfileCss.includes('.featured-mini-logo')&&latestProfileCss.includes('.featured-divider'),'Broadcast team identity needs its small team logo and vertical divider');
assert.ok(latestProfileCss.includes('.featured-team-meta strong')&&latestProfileCss.includes('featured-jersey-number:empty + .featured-identity-divider'),'Number and position must remain aligned, even for missing jersey numbers');
assert.ok(html.includes('broadcast-player-card.css?v=20261105-broadcast2'),'The new broadcast styling must load after the older overrides');
assert.ok(profile.includes("['performance','Analytics']"),'Player card Performance tab must read Analytics');
assert.ok(profile.includes('playerDepthChartButton')&&profile.includes('openTeamDepthChart(team)'),'Player card needs its team depth-chart button');
assert.ok(profile.includes('canonicalTeam(option.value)===canonicalTeam(team)'),'Team depth chart navigation must resolve league abbreviation aliases');
const cleanDesign=read('clean-design.js');
assert.ok(!cleanDesign.includes("switcher.id='shuaDesignSwitch'"),'Remove the Classic toggle without removing the clean theme');
assert.ok(cleanDesign.includes("requested==='classic'?'classic':'clean'"),'Previously saved Classic selection must not trap visitors on the old UI');
assert.ok(html.includes('espn-live.js?v=20261104-metrics4')&&html.includes('analytics-dashboard.js?v=20261104-ten-clean2'));
assert.ok(html.includes('player-search.js?v=20261102-facefix1')&&html.includes('player-search.css?v=20261101-search-all-tabs5'));
assert.ok(loader.includes("const version = '20261104-ten-clean2'"));
const faces=read('player-face-fix.js');
new vm.Script(faces,{filename:'player-face-fix.js'});
for(const id of ['4685278','3126486','4870653','4723820','4686658','4685307'])
 assert.ok(faces.includes(id),'Missing a verified 2026 ESPN portrait ID: '+id);
const faceContext={window:{},document:{body:null},fetch:()=>Promise.reject(Error('offline'))};
vm.runInNewContext(faces,faceContext);
for(const [name,id] of [['Luther Burden','4685278'],['Luther Burden III','4685278'],
 ['Deebo Samuel','3126486'],['Deebo Samuel Sr.','3126486'],
 ['Omar Cooper','4723820'],['Kevin Coleman','4685307'],
 ['Chigoziem Okonkwo','4360635'],['KC Concepcion','4870653']])
 assert.equal(faceContext.window.ShuaPlayerFaces.verifiedUrl(name),
  'https://a.espncdn.com/i/headshots/nfl/players/full/'+id+'.png',
  'Suffix-safe official portrait resolution failed for '+name);
assert.ok(html.includes('player-face-fix.js?v=20261102-face1'),'Global face repair must be loaded');
assert.ok(profile.includes('window.ShuaPlayerFaces?.urls')&&espn.includes('window.ShuaPlayerFaces?.urls'),'Player cards must use verified portraits');
assert.ok(search.includes('window.ShuaPlayerFaces?.url'),'Search must use verified portraits');
const rbCss=read('rb-rankings.css');
assert.ok(html.includes('rb-rankings.css?v=20261103-2'),'Position ranking layout stylesheet must be loaded');
assert.ok(rbCss.includes('.pos.active:is('),'Ranked player styling must be scoped to position tabs');
for(const pos of ['QB','RB','WR','TE'])
 assert.ok(rbCss.includes('[data-pos="'+pos+'"]'),'Missing full-name and rank support for '+pos);
assert.ok(rbCss.includes('grid-template-columns:54px minmax(0,1fr)'),'Show every one-, two- and three-digit position rank');
assert.ok(rbCss.includes('white-space:normal!important')&&rbCss.includes('overflow:visible!important'),'Allow full position names to wrap instead of ellipsis');
assert.ok(live.includes("credentials:'omit'")&&live.includes('view=mTeam&view=mRoster&view=mStatus'));
assert.ok(live.includes('visibilitychange')&&live.includes('lastSuccess'));
console.log('PASS: broadcast player cards, number | position identity, all two-line names, uniform game logs, Snap Rates, global search and swipe safeguards.');
