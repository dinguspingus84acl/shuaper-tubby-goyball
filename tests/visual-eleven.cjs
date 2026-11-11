const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('index.html');
const css=read('visual-eleven-20261111.css');
const js=read('visual-eleven-20261111.js');

test('new stylesheet and script are loaded last, with explicit cache busting',()=>{
  assert.match(html,/visual-ten-20261109\.js\?v=20261109-a1[\s\S]*visual-eleven-20261111\.css\?v=20261111-a1[\s\S]*visual-eleven-20261111\.js\?v=20261111-a1/);
});
test('standings highlight only the signed-in team ID and align numerical columns',()=>{
  assert.match(js,/\.myteams-standings-line:not\(\.is-heading\)/);
  assert.match(js,/String\(id\)===myTeam/);
  assert.match(css,/\.myteams-standings-line\.shua-my-own-standing/);
  assert.match(css,/\.myteams-standings-line>span:nth-child\(n\+3\)/);
});
test('starter and bench rows are subdued without changing roster ordering',()=>{
  for(const group of ['starter','bench','ir'])assert.match(css,new RegExp('data-shua-roster-group="'+group+'"'));
  assert.match(css,/\.myteams-roster-row>strong/);
  assert.doesNotMatch(js,/roster\.sort|weeklyProjection\s*=/);
});
test('waiver entries use flat separators, larger projection values and faces',()=>{
  assert.match(css,/\.myteams-wire-line:not\(\.is-heading\)/);
  assert.match(css,/\.myteams-wire-line:not\(\.is-heading\)>span:nth-child\(4\)/);
  assert.match(css,/\.myteams-wire-line \.myteams-player-open>img/);
});
test('injury comparisons preserve measured source table and original chart',()=>{
  assert.match(js,/With vs\\\. without/);
  assert.match(js,/titles\[1\]!=='With starter'/);
  assert.match(js,/titles\[2\]!=='In reported Out weeks'/);
  assert.match(js,/\.filter\(r=>r\.name&&r\.nums\.some\(Number\.isFinite\)\)/);
  assert.match(js,/\.querySelector\('\.st-chart'\)\?\.before\(grid\)/);
  const injuryPart=js.slice(js.indexOf('function measuredInjury()'),js.indexOf('function scheduleLegend()'));
  assert.doesNotMatch(injuryPart,/\.remove\(\)|\.innerHTML\s*=/);
});
test('schedule tiles have consistent size and a legend above the grid',()=>{
  assert.match(js,/scroll\.before\(legend\)/);
  for(const tone of ['easy','neutral','tough','bye'])assert.match(css,new RegExp('st-heat-cell\\.'+tone));
  assert.match(css,/width:66px;min-width:66px;min-height:57px;height:57px/);
});
test('trade ladder adds faces without altering trade rankings or values',()=>{
  assert.match(js,/ShuaPlayerFaces\?\.url\(name\)/);
  assert.match(js,/logo\.replaceWith\(wrap\)/);
  assert.match(css,/\.shua-tcc-avatar/);
  assert.match(css,/\.tcc-band\{border-top:/);
  assert.doesNotMatch(js,/playerValue|tradeTotal|ranking\s*=|value\s*=/);
});
test('common heading rhythm keeps filters and leaves skipped features alone',()=>{
  assert.match(css,/#shuaMyTeams h2,#shuaStock h2,#shuaAnalyticsSection \.st-heading h2/);
  assert.match(css,/#shuaAnalyticsSection \.st-controls/);
  assert.doesNotMatch(css,/stock-ownership-bar|weekly-projection-bar|team-opportunity-share-bar/);
  assert.doesNotMatch(js,/shuaStock|weeklyReport|teamShares|teamOpportunity/);
});
