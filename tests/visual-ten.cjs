const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('index.html');
const css=read('visual-ten-20261109.css');
const js=read('visual-ten-20261109.js');

test('new layer is cache-busted and loaded after the existing visual polish',()=>{
  assert.match(html,/visual-nine-20261107\.js\?v=20261107-a1[\s\S]*visual-ten-20261109\.css\?v=20261109-a1[\s\S]*visual-ten-20261109\.js\?v=20261109-a1/);
});
test('trade winner styling reads current totals without changing trade math',()=>{
  assert.match(js,/tradeCompareLeft/);
  assert.match(js,/tradeCompareRight/);
  assert.match(js,/Math\.abs\(t-b\)\/Math\.max\(t,b,1\)>\.05/);
  assert.match(css,/\.trade-side\.shua-trade-leading/);
  assert.match(css,/\.trade-balance-recommendations/);
  assert.doesNotMatch(js,/adjustedSum|playerValue\(|tradeMode=/);
});
test('analytics player legends have headshots, pressed state and focus behavior',()=>{
  assert.match(js,/\.st-chart \.st-legend-btn/);
  assert.match(js,/shua-legend-face/);
  assert.match(js,/aria-pressed/);
  assert.match(js,/shua-chart-in-focus/);
  assert.match(css,/\.st-legend-btn\[aria-pressed="false"\]/);
});
test('game log has swipeable stats and sticky first two columns',()=>{
  assert.match(css,/\.espn-game-log-table-wrap\{[\s\S]*?overflow-x:auto!important/);
  assert.match(css,/min-width:660px!important/);
  assert.match(css,/left:0!important/);
  assert.match(css,/left:49px!important/);
  assert.match(css,/position:sticky!important;top:0!important/);
  assert.match(css,/background:transparent!important/);
});
test('weather displays kickoff consistently and separates indoor from outdoor games',()=>{
  assert.match(css,/\.wx-game-time\{/);
  assert.match(css,/\.wx-game-sky\{/);
  assert.match(css,/\.wx-game\.wx-indoor-game/);
  assert.match(css,/\.wx-game:not\(\.wx-indoor-game\):not\(\.wx-pending-game\)/);
  assert.match(css,/\.wx-pending-game \.wx-pending-context/);
  assert.match(read('weather.js'),/if\(game\.indoor\)/);
});
test('player card tabs use a compact underline while leaving navigation buttons intact',()=>{
  assert.match(css,/\.unified-profile-tab\.active::after/);
  assert.match(css,/\.unified-profile-panel\{padding-top:7px!important/);
  assert.doesNotMatch(js,/data-profile-tab|preferredProfileTab/);
});
test('depth headings get team logos without changing starter order or click targets',()=>{
  assert.match(js,/\.depth-player\[data-depth-team-code\]/);
  assert.match(js,/shua-depth-team-logo/);
  assert.match(css,/\.depth-player\[data-depth-order="1"\] span/);
  assert.doesNotMatch(js,/depthCharts\.sort|depthGrid\.innerHTML/);
});
test('Start/Sit uses real team colors for its chart series and player portraits',()=>{
  const helpers=js.slice(js.indexOf('const nflColors='),js.indexOf('const roots='));
  assert.equal(vm.runInNewContext(helpers+';teamTone("NOR")'),'#c7ae6e');
  assert.equal(vm.runInNewContext(helpers+';teamTone("GNB")'),'#34865b');
  assert.match(js,/path\.setAttribute\('stroke',tone\)/);
  assert.match(js,/circle\.setAttribute\('fill',tone\)/);
  assert.match(css,/\.shua-compare-graph-player \.st-face/);
});
test('loading placeholders are decorative and not substituted for zero',()=>{
  assert.match(js,/if\(node\.dataset\.shuaSkeleton\|\|!\/\^loading\\b\/i\.test/);
  assert.match(js,/host\.setAttribute\('aria-hidden','true'\)/);
  assert.match(css,/@keyframes shua-skeleton-pulse/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('unapproved position theme and injury indicator changes remain out of scope',()=>{
  assert.doesNotMatch(css,/#tableCard.*(?:data-pos|pos-badge)|#shuaAnalyticsSection.*injury|\.injury-status|\.injury-badge/);
  assert.doesNotMatch(js,/injuryStatus|statusBadge|positionColors/);
});
