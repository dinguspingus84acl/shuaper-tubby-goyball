const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'visual-fifteen-20261112.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('final visual stylesheet is loaded after prior Big Board layout',()=>{
  assert.match(html,/board-overview-20261112\.css[\s\S]*board-overview-20261112\.js[\s\S]*visual-fifteen-20261112\.css\?v=20261112-v2/);
});
test('player hierarchy and draft tiles preserve their actual data elements',()=>{
  assert.match(css,/#tableCard \.rank-player-copy>b/);
  assert.match(css,/#board \.pick \.name/);
  assert.match(css,/#board \.pick \.slot/);
  assert.match(css,/#board \.pick \.arrow/);
});
test('ranking rows and headshots have consistent visual rules',()=>{
  assert.match(css,/#tableCard tbody tr:has\(\.photo-cell\):nth-child\(even\)/);
  assert.match(css,/#shuaAnalyticsSection :is\(\.st-face/);
  assert.match(css,/#shuaMyTeams \.myteams-player-open>img:not\(\.myteams-nfl-logo\)/);
});
test('Overview hero and stat cards are compact without hiding contents',()=>{
  assert.match(css,/#featuredPlayerCard\.broadcast-card\{[\s\S]*?aspect-ratio:2\.12/);
  assert.match(css,/#unifiedOverviewPanel #stats \.stat/);
  assert.doesNotMatch(css,/overflow-y:hidden!important/);
});
test('filter design, numeric alignment and charts share a style system',()=>{
  assert.match(css,/#positionToggle button/);
  assert.match(css,/#shuaAnalyticsSection \.st-usage-table th:not\(:first-child\)/);
  assert.match(css,/\.st-gridline/);
  assert.match(css,/\.st-tooltip/);
});
test('My Teams and phone layouts are polished without rewriting functionality',()=>{
  assert.match(css,/#shuaMyTeams \.myteams-card-trigger/);
  assert.match(css,/#shuaMyTeams \.myteams-roster-row/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/main:has\(> :is\([\s\S]*?#shuaMyTeams[\s\S]*?\):not\(\[hidden\]\)\) > \.head\{display:none!important\}/);
});
