const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),css=read('visual-twentyone-20261114.css');

test('latest visual asset follows v20 and preserves all existing views',()=>{
  assert.match(html,/visual-twenty-20261113\.js\?v=20261113-weekly-restore1[\s\S]*visual-twentyone-20261114\.css\?v=20261114-bigboard-restore1/);
  assert.doesNotMatch(css,/#shuaWeatherSection|\.wx-|st-injury-status|\.myteams-injury/);
});
test('2: restores previous Big Board layout and strengthens only its existing logo',()=>{
  assert.match(css,/#board \.pick \.shua-pick-watermark\{[\s\S]*opacity:\.18!important/);
  assert.doesNotMatch(css,/#board \.pick\[data-shua-round\] :is\(\.name,\.meta,\.slot\)/);
});
test('3: common page gutters do not adjust Big Board dimensions',()=>{
  for(const selector of ['#shuaAnalyticsSection','#shuaMyTeams','#espnLiveSection'])assert.ok(css.includes(selector));
  assert.match(css,/--shua-v21-gutter/);
  assert.doesNotMatch(css,/#board\s*\{[^}]*grid-template-columns|#board\s*\{[^}]*overflow|#board\s*\{[^}]*width:/);
});
test('4: Week and Season align with positional controls on desktop, collapse naturally on mobile',()=>{
  assert.match(css,/grid-template-columns:max-content minmax\(0,1fr\)/);
  assert.match(css,/#stContent>\.st-weekly-positions/);
  assert.match(css,/@media\(max-width:700px\)/);
});
test('5: values increase in hierarchy without overriding the existing red green scoring',()=>{
  for(const s of ['.st-rank-row .st-score','.espn-selected-stat','#unifiedOverviewPanel .stat b','.myteams-roster-row>strong'])assert.ok(css.includes(s));
  assert.doesNotMatch(css,/\.st-score\.negative|\.gl-pts\.negative|shua-weekly-bars|expected.points|xFP/i);
});
test('6: player header uses team accent and a genuinely centered watermark',()=>{
  assert.match(css,/radial-gradient\(ellipse at 18% 29%/);
  assert.match(css,/\.featured-bg-logo\{[\s\S]*left:50%!important;top:50%!important;transform:translate\(-50%,-50%\)/);
  assert.match(css,/\.featured-bio-value/);
});
test('7: game log keeps original controls and scrolling behavior',()=>{
  assert.match(css,/#unifiedGameLogPanel \.espn-game-log-table thead th/);
  assert.match(css,/border-bottom:2px solid #52768a/);
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g,''),/\.espn-game-log-table-wrap|overflow-x|position:sticky|\.espn-game-log-tab(?!le)/);
});
test('8: charts use restrained lines and consistent labels and dots',()=>{
  for(const name of ['.st-gridline','.st-axis-line','.st-axis','.st-series-line','.st-series-dot','.st-radar-grid'])assert.ok(css.includes(name));
  assert.doesNotMatch(css,/data-series-group|\.st-tooltip|st-chart-scroll/);
});
test('9: own and opposing teams get balanced scorecard treatment',()=>{
  assert.match(css,/\.myteams-score-side\.is-opponent/);
  assert.match(css,/\.myteams-score-current strong/);
  assert.match(css,/\.myteams-score-projected/);
  assert.doesNotMatch(css,/totalProjectedPoints|matchups\.find|innerHTML|appendChild/);
});
