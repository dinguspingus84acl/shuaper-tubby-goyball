const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html');
const css=read('clean-ninth.css');
const ui=read('clean-ninth.js');
const weather=read('weather.js');
const stats=read('espn-live.js');
const teams=read('my-teams-live.js');

assert.match(html,/backup|leagueGlance\(item\)|clean-ninth\.css/);
assert.match(html,/clean-ninth\.js\?v=20261104-ten-clean2/);
assert.match(css,/espn-stat-label\{display:none!important\}/);
assert.match(css,/--shua-ui-control-height:36px/);
assert.match(css,/\.st-panel\{[\s\S]*?border-color:var\(--shua-ui-border\)/);
assert.match(css,/espn-view-btn\.active/);
assert.match(css,/featured-bio-item:nth-child\(3\) \.featured-bio-value/);
assert.match(css,/repeat\(4,minmax\(0,1fr\)\)!important/);
assert.match(css,/\.myteams-glance/);
assert.match(css,/\.wx-indoor-game/);
assert.match(css,/\.wx-expanded/);
assert.match(ui,/ShuaStudio\?\.UI\?\.dataset/);
assert.match(ui,/snapshotAt\|\|data\.generatedAt/);
assert.match(ui,/if\(!watchStudio\(\)\)/);
assert.match(read('analytics/ui.js'),/if\(anchor&&anchor===usageTooltipAnchor/);
assert.match(teams,/Rosters checked /);

assert.match(html,/const opponent=matchup\?/);
assert.match(html,/const sameTeam=team=>String\(team\?\.teamId/);
assert.match(weather,/if\(game\.indoor\)return '<article class="wx-game wx-indoor-game"/);
assert.match(weather,/const conditions=\[/);
assert.doesNotMatch(weather,/\['Gusts',display\(f\.gustMph/);
assert.match(weather,/<details class="wx-expanded">/);
assert.match(weather,/wx-loading-cards/);
assert.match(stats,/ESPN fetched /);
assert.match(stats,/espn-loading-row/);
assert.match(stats,/espnColumnStatSelect/);

const source=JSON.parse(read('weather/data/nfl.json'));
const saintsAtHome=source.games.filter(g=>g.home?.abbr==='NO');
assert.ok(saintsAtHome.length,'Saints game should exist in current weather snapshot');
assert.ok(saintsAtHome.every(g=>g.indoor&&/Superdome/i.test(g.venue)),
  'Saints game must be included in the same indoor rendering branch as other domes');
console.log('PASS: all 10 visual refinements, retained controls, truthful timestamps, explicit indoor Saints and compact weather details.');
