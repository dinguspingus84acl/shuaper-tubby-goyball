const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const css=read('visual-nineteen-20261113.css');
const js=read('visual-nineteen-20261113.js');
const html=read('index.html');

test('new visual code is last and preserves the Weather rollback',()=>{
  assert.match(html,/visual-eighteen-20261113\.js\?v=20261113-v1[\s\S]*visual-nineteen-20261113\.css\?v=20261113-v1[\s\S]*visual-nineteen-20261113\.js\?v=20261113-v3/);
  assert.match(html,/weather\.js\?v=20261113-weather-revert-v1/);
});
test('alternate background shading follows existing four-round data attributes',()=>{
  assert.match(css,/#board \.pick:is\(/);
  for(const round of [5,6,7,8,13,14,15,16,21,22])assert.ok(css.includes(`[data-shua-round="${round}"]`));
  assert.match(css,/:not\(\.shua-selected-pick\)::after/);
  assert.doesNotMatch(css,/grid-template-columns:repeat\(11/);
});
test('player glow remains behind rather than replacing the portrait',()=>{
  assert.match(css,/\.featured-portrait-box::before/);
  assert.match(css,/color-mix\(in srgb,var\(--featured-accent/);
  assert.match(css,/pointer-events:none/);
  assert.doesNotMatch(css,/\.featured-photo\{|display:none/);
});
test('comparison ticks decorate existing Stats bars without changing their values',()=>{
  assert.match(css,/\.espn-metric-track::after/);
  assert.match(css,/25% center\/1px 10px/);
  assert.match(css,/50% center\/1px 10px/);
  assert.match(css,/75% center\/1px 10px/);
  assert.doesNotMatch(js,/espn-metric-track/);
});
test('My Teams indicator requires two authentic, finite matchup projections',()=>{
  assert.match(html,/const projected=team=>/);
  assert.match(html,/team\?\.totalProjectedPoints/);
  assert.match(html,/if\(mine!==null&&theirs!==null&&mine\+theirs>0\)/);
  assert.match(html,/shua-proj-edge/);
  assert.match(css,/\.shua-proj-own/);
  assert.match(css,/\.shua-proj-opponent/);
});
test('Weekly Report compares real PPR points to clearly labelled ESPN projections or xFP',()=>{
  assert.match(js,/espnProjectedPoints \?\? game\?\.projectedPpr \?\? game\?\.projectedPoints/);
  assert.match(js,/expected-weekly-2026\.json/);
  assert.match(js,/data\?\.schema === 1 && data\?\.season === 2026/);
  assert.match(js,/not a pregame prediction/);
  assert.match(js,/analytics\?\.dataset\.activeView === 'weekly'/);
  assert.match(js,/querySelector\('#stSeason'\)/);
  assert.match(js,/querySelector\('#stWeek'\)/);
  assert.match(js,/row\.querySelector\('\.st-score'\)/);
  assert.match(js,/analyticsSection = \(\) => document\.getElementById\('shuaAnalyticsSection'\)/);
  assert.match(js,/observe\(document\.body, \{childList: true, subtree: true\}\)/);
  assert.match(js,/\.st-rank-row/);
  assert.match(css,/\.shua-weekly-bar-track\.is-ahead/);
  assert.match(css,/\.shua-weekly-bar-track\.is-behind/);
});
test('mobile overflow cues reflect actual scroll position and exclude Weather',()=>{
  assert.match(js,/element\.scrollWidth - element\.clientWidth/);
  assert.match(js,/element\.scrollLeft > 4/);
  assert.match(js,/element\.scrollLeft < overflow - 4/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/\.shua-scroll-cue\.shua-scroll-left\.shua-scroll-right/);
  assert.doesNotMatch(css,/#shuaWeatherSection|\.wx-/);
  assert.doesNotMatch(js,/wx-hourly-scroll|wx-filters/);
});
test('excluded choices do not add column spotlight, ROS rank emphasis, heatmap, or History timeline',()=>{
  assert.doesNotMatch(css,/shua-column-selected|\#unifiedOverviewPanel.+font-size|weekly-heatmap|history-timeline/);
  assert.doesNotMatch(js,/shua-column-selected|weekly-heatmap|history-timeline/);
});
