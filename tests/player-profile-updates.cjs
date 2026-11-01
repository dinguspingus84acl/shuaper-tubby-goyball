'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html'),profile=read('unified-profile.js'),espn=read('espn-live.js'),
      history=read('player-history.js'),studio=read('analytics/ui.js'),
      search=read('player-search.js'),searchStyle=read('player-search.css'),
      live=read('my-teams-live.js');
for(const name of ['unified-profile.js','espn-live.js','player-history.js','analytics/ui.js','player-search.js','my-teams-live.js'])
  new vm.Script(read(name),{filename:name});
assert.ok(profile.includes("'<span class=\"featured-jersey-number\" aria-label=\"Jersey number\"></span>'"));
assert.ok(profile.includes('overflow-wrap:anywhere'));
assert.ok(studio.includes("target.innerHTML=C.line({title:'Weekly scoring',labels:gs.map(g=>'W'+g.week),series:[{name:'PPR',values:gs.map(g=>g.points)}]}"));
assert.ok(!studio.includes("target.innerHTML=C.line({title:'Weekly scoring',labels:gs.map(g=>'W'+g.week),series:[{name:'PPR',values:gs.map(g=>g.points)},{name:'3-game average'"));
const begin=espn.indexOf('function gameLogColumns(mode,position){');
const end=espn.indexOf('function cleanGameLogOpponent',begin);
assert.ok(begin>=0&&end>begin);
const columns=vm.runInNewContext('('+espn.slice(begin,end).trim()+')');
for(const position of ['QB','RB','WR','TE']){
 const keys=columns(null,position).map(c=>c.key);
 for(const field of ['pts','snapRate','receptions','targets','recYds','recTD','rushAtt','rushYds','rushTD'])
  assert.ok(keys.includes(field),position+' missing '+field);
 assert.equal(keys[0],'pts');
 assert.equal(keys[1],'snapRate');
 if(position==='QB')assert.ok(keys.includes('passYds'));
}
assert.ok(espn.includes('attachGameLogSnapRates')&&espn.includes('analytics/data/season-2026.json'));
assert.ok(history.includes('getWeeklySnapRates'));
assert.ok(espn.includes('Swipe across the table')&&espn.includes('width:max-content!important'));
assert.ok(espn.includes("g.snapRate===null||g.snapRate===undefined"));
assert.ok(html.includes('player-search.js?v=20261101-search1')&&html.includes('player-search.css?v=20261101-search1'));
assert.ok(search.includes('legacy-stats/index.json')&&search.includes('openUnifiedPlayerProfileByName'));
assert.ok(searchStyle.includes('100dvh'));
assert.ok(html.includes('my-teams-live.js?v=20261101-roster1')&&html.includes('window.ShuaMyTeamsUI='));
assert.ok(live.includes("credentials:'omit'")&&live.includes('view=mTeam&view=mRoster&view=mStatus'));
assert.ok(live.includes('setInterval')&&live.includes('visibilitychange')&&live.includes('lastSuccess'));
assert.ok(live.includes('if(!snapshot)continue')&&live.includes('lastFailures'));
assert.ok(!live.includes('espn_s2')&&!live.includes('SWID'));
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
 if(match[1].trim())new vm.Script(match[1]);
}
console.log('PASS: separate jersey label; single-series Performance; swipeable full game-log; source-backed snaps; retired-player search; public-ESPN roster refresh.');
