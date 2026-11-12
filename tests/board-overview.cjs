const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const css=source('board-overview-20261112.css');
const js=source('board-overview-20261112.js');

test('new layout and scripts are versioned after the previous polish layer',()=>{
  const html=source('index.html');
  assert.match(html,/visual-thirteen-20261112\.css[\s\S]*visual-thirteen-20261112\.js[\s\S]*board-overview-20261112\.css[\s\S]*board-overview-20261112\.js/);
  assert.match(html,/unified-profile\.js\?v=20261112-boardnotes1/);
});
test('Big Board controls remain functional inside a disclosure rather than five standalone buttons',()=>{
  assert.match(js,/shuaBoardSettingsPanel/);
  assert.match(js,/group\('League size',teams\),group\('Display',modes\)/);
  assert.match(js,/options\.setAttribute\('aria-controls',panel\.id\)/);
  assert.match(css,/\.shua-board-settings-panel\{[\s\S]*?display:none!important/);
  assert.match(css,/shua-board-options-open[\s\S]*\.shua-board-settings-panel\{[\s\S]*?display:grid!important/);
  assert.doesNotMatch(js,/removeChild|replaceChildren|teams\.remove\(|modes\.remove\(/);
});
test('ROS and Pre Season controls on positional rankings remain untouched',()=>{
  const html=source('index.html');
  assert.match(html,/id="positionToggle"[\s\S]*?data-posview="ROS"[\s\S]*?data-posview="PRESEASON"/);
  assert.doesNotMatch(css,/#positionToggle/);
});
test('earlier round decoration cannot pull controls out of the disclosure',()=>{
  assert.match(source('visual-thirteen-20261112.js'),/!overall\.closest\('#shuaBoardSettingsPanel'\)/);
});
test('Overview notes do not have a line clamp or inner vertical scrolling lock',()=>{
  assert.match(css,/#unifiedOverviewPanel:not\(\[hidden\]\)\{[\s\S]*?padding-bottom/);
  assert.match(css,/#playerNotes\{[\s\S]*?max-height:none!important/);
  assert.match(css,/overscroll-behavior-y:auto!important;touch-action:pan-y!important/);
  assert.match(source('unified-profile.js'),/document\.getElementById\('unifiedOverviewPanel'\)\?\.hidden\)gesture\.mode='vertical'/);
});
