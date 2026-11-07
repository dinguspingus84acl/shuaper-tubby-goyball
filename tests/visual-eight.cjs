const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html');
const css=read('visual-eight-20261107.css');
const js=read('visual-eight-20261107.js');

test('new assets are loaded after the previous presentation layer',()=>{
  assert.match(html,/visual-seven-20261107\.js\?v=20261107-a1[\s\S]*visual-eight-20261107\.css\?v=20261107-a3[\s\S]*visual-eight-20261107\.js\?v=20261107-a1/);
});
test('history returns to the season list without the timeline strip',()=>{
  const history=read('player-history.js');
  assert.doesNotMatch(history,/player-history-timeline|data-history-season/);
  assert.doesNotMatch(css,/player-history-timeline|player-history-season/);
  assert.match(history,/toggleSeasonDetail\(el,row\)/);
  assert.match(history,/player-history-row/);
  assert.match(history,/r\.ppg!=null/);
});
test('depth chart emphasizes existing first-string players without changing data',()=>{
  assert.match(css,/depth-player\[data-depth-order="1"\]/);
  assert.match(css,/depth-player\[data-depth-order="3"\]/);
  assert.doesNotMatch(js,/depthCharts|data-depth-order/);
});
test('trade graphic displays live values from the unchanged calculation',()=>{
  const trade=read('trade-calculator.js');
  assert.match(trade,/tradeCompareLeft/);
  assert.match(trade,/tradeCenterDelta/);
  assert.match(trade,/a\.toFixed\(1\)/);
  assert.match(css,/trade-comparison-labels/);
});
test('expanded league header keeps current record and matchup',()=>{
  assert.match(css,/myteams-card:has\(>\.myteams-roster:not\(\[hidden\]\)\)/);
  assert.match(css,/\.shua-league-record/);
  assert.match(css,/\.myteams-glance/);
});
test('search keeps exact result indices while grouping matches and showing NFL team logos',()=>{
  const search=read('player-search.js');
  assert.match(search,/Closest matches/);
  assert.match(search,/Other matches/);
  assert.match(search,/data-search-player/);
  assert.match(search,/shua-search-team-logo/);
  assert.match(css,/shua-search-result-meta/);
});
test('mobile charts and schedule difficulty use existing live views',()=>{
  assert.match(css,/\.st-panel:has\(\.st-chart\)/);
  assert.match(css,/\[data-active-view="schedule"\] \.st-heat-cell\.easy/);
  assert.match(css,/\.st-week-opponent-logo/);
});
test('missing values only receive styling, zero remains a real number',()=>{
  assert.match(js,/\.classList\.toggle\('shua-unavailable',missing\.test\(value\)\)/);
  assert.match(js,/not available/);
  assert.doesNotMatch(js,/innerHTML\s*=|textContent\s*=/);
  assert.doesNotMatch(js,/Math\.random|setInterval/);
  assert.match(css,/\.shua-unavailable/);
});
test('excluded Stock exposure and Weekly Report feature strip are untouched',()=>{
  assert.doesNotMatch(css,/shuaStock|stock-exposure|weekly-top-three|weekly-feature-strip/i);
  assert.doesNotMatch(js,/Stock|Weekly Report/);
});
