const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const css=read('visual-sixteen-20261113.css');
const js=read('visual-sixteen-20261113.js');
const html=read('index.html');
const weather=read('weather.js');
const charts=read('analytics/charts.js');

test('new visual layer is loaded after existing layout and scripts',()=>{
  assert.match(html,/visual-fifteen-20261112\.css\?v=20261112-v3[\s\S]*visual-sixteen-20261113\.css\?v=20261113-weather-revert-v1[\s\S]*visual-sixteen-20261113\.js\?v=20261113-v1/);
  assert.match(html,/weather\.js\?v=20261113-weather-revert-v1/);
  assert.match(html,/analytics-dashboard\.js\?v=20261113-visual16-v1/);
  assert.match(read('analytics-dashboard.js'),/const version = '20261113-visual16-v1'/);
});
test('round bands and marker depend on existing snake-draft slots',()=>{
  assert.match(js,/slot\.split\('\.'\)\[0\]/);
  assert.match(js,/tile\.dataset\.shuaRound=/);
  assert.match(js,/tile\.dataset\.shuaRoundStart=/);
  assert.match(css,/\.pick\[data-shua-round\]\.shua-round-even/);
  assert.match(css,/\.pick\[data-shua-round-start\]::before/);
});
test('watermarks use known NFL team codes and cannot intercept clicks',()=>{
  assert.match(js,/teamCodes\[player\?\.team\]/);
  assert.match(js,/https:\/\/a\.espncdn\.com\/i\/teamlogos\/nfl\/500\//);
  assert.match(css,/\.shua-pick-watermark\{[\s\S]*?opacity:\.095;pointer-events:none/);
  assert.doesNotMatch(js,/\.onclick|addEventListener\('click'/);
});
test('Big Board full names can wrap while retaining pick numbers',()=>{
  assert.match(js,/label\.textContent=player\.name/);
  assert.match(css,/-webkit-line-clamp:2;line-clamp:2/);
  assert.match(css,/\.pick\[data-shua-round\] \.slot\{position:absolute/);
});
test('the four position indicators are explanatory, not extra filters',()=>{
  for(const pos of ['QB','RB','WR','TE'])assert.match(js,new RegExp(pos+":'#"));
  assert.match(js,/key\.id='shuaBoardPositionKey'/);
  assert.doesNotMatch(js,/createElement\('button'\)/);
});
test('My Teams uses saved and live real ESPN logos when available',()=>{
  assert.match(html,/logoUrl:own\?\.logoUrl\|\|own\?\.logo/);
  assert.match(html,/logoUrl:x\.logoUrl\|\|x\.logo/);
  assert.match(read('my-teams-live.js'),/if\(value\.logoUrl\)/);
  assert.match(css,/:has\(>\.myteams-team-logo\)>\.shua-league-monogram\{display:none!important/);
});
test('My Teams cards present name, league, matchup and real record cleanly',()=>{
  assert.match(css,/#shuaMyTeams \.myteams-card-trigger/);
  assert.match(css,/#shuaMyTeams \.myteams-glance/);
  assert.match(css,/#shuaMyTeams \.shua-league-record/);
  assert.match(html,/leagueGlance\(item\)/);
});
test('roster starters, bench and IR are visually grouped without changes to projections',()=>{
  assert.match(css,/\.shua-roster-group-heading\[data-group="bench"\]/);
  assert.match(css,/\.shua-roster-group-heading\[data-group="ir"\]/);
  assert.match(css,/\.myteams-roster-row>strong/);
  assert.match(html,/weeklyProjection\(p,leagueFor/);
});
test('weather cards are restored to the former top-left kickoff layout',()=>{
  assert.match(weather,/class="wx-versus">AT<\/span>/);
  assert.match(weather,/const header='<div class="wx-game-top"><strong class="wx-game-time">'/);
  assert.doesNotMatch(weather,/class="wx-match-center"|const teamColors=|--wx-away-color:/);
  assert.doesNotMatch(css,/#shuaWeatherSection/);
  assert.match(html,/weather\.css\?v=20261106-cardtime1/);
});
test('My Teams schedule styling stays updated when Weather is restored',()=>{
  assert.match(css,/#shuaMyTeams \.myteams-schedule-row/);
});
test('line charts preserve data and include subtle comparison fill and marked points',()=>{
  assert.match(charts,/si<2&&segment\.length>1/);
  assert.match(charts,/class="st-series-dot"/);
  assert.match(css,/#shuaAnalyticsSection \.st-series-area\.is-comparison/);
  assert.match(charts,/data-point="\$\{i\}"/);
});
test('excluded Usage percentage bars are not introduced',()=>{
  assert.doesNotMatch(css,/#shuaAnalyticsSection \.st-usage[^\n]*-bar|\.st-usage-percent-bar|\.st-usage-track/);
  assert.doesNotMatch(js,/usage|percentageBar|progressBar/i);
});
