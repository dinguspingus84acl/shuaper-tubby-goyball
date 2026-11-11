const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('index.html');
const css=read('game-log-unlock-20261111.css');

test('game-log unlock stylesheet loads after prior lock with cache busting',()=>{
  assert.match(html,/visual-ten-20261109\.css[\s\S]*visual-eleven-20261111\.css[\s\S]*game-log-unlock-20261111\.css\?v=20261111-a1/);
});
test('table does not trap scrolling inside a separate area',()=>{
  assert.match(css,/height:auto!important;max-height:none!important/);
  assert.match(css,/overflow:visible!important;overscroll-behavior:auto!important/);
  assert.match(css,/touch-action:pan-y!important/);
});
test('week and opponent and heading do not remain sticky',()=>{
  assert.match(css,/\.espn-game-log-table :is\(th,td\):first-child/);
  assert.match(css,/\.espn-game-log-table :is\(th,td\):nth-child\(2\)/);
  assert.match(css,/position:static!important;top:auto!important;left:auto!important/);
  assert.match(css,/\.espn-game-log-table thead th\{/);
});
test('category columns fit screen with no side-swipe lock',()=>{
  assert.match(css,/width:100%!important;min-width:0!important;max-width:100%!important/);
  assert.match(css,/table-layout:fixed!important/);
  assert.doesNotMatch(css,/min-width:660px|overflow-x:auto|position:sticky/);
});
