const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('Pre Season ranking button is relabeled Draft without changing its data mode',()=>{
  const script=read('clean-sixth.js');
  assert.match(script,/\[data-posview="PRESEASON"\]/);
  assert.match(script,/draftButton\.textContent='Draft'/);
  assert.match(read('index.html'),/data-posview="PRESEASON"/);
});

test('rank toggle moves underneath title and restores in classic mode',()=>{
  const script=read('clean-sixth.js');
  assert.match(script,/headingTitle\.append\(positionToggle\)/);
  assert.match(script,/overall\.after\(positionToggle\)/);
  const css=read('board-overview-20261112.css');
  assert.match(css,/div:first-child>#positionToggle:not\(\[hidden\]\)/);
  assert.match(css,/flex-direction:column!important/);
});

test('changed script and CSS are versioned independently for cached browsers',()=>{
  const html=read('index.html');
  assert.match(html,/clean-sixth\.js\?v=20261112-draft-heading1/);
  assert.match(html,/board-overview-20261112\.css\?v=20261112-draft-heading1/);
});
