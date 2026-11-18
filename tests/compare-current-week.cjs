const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const ui=read('analytics/ui.js');
const menu=read('clean-design.js');
const html=read('index.html');

test('Start/Sit has one Compare entry in Analytics navigation',()=>{
 assert.match(menu,/\{view:'startsit',label:'Compare'\}/);
 assert.doesNotMatch(menu,/items:\[\.\.\.analyticsViews,'ESPN','COMPARE'\]/);
 assert.match(read('feature-polish-20261106.js'),/startsit:'Compare'/);
 assert.match(read('visual-twenty-20261113.js'),/startsit: 'Compare'/);
});

test('Compare has no season, week, position, or separate selected-player controls',()=>{
 const compare=ui.slice(ui.indexOf('function currentWeekCompare(){'),ui.indexOf('function showCompareSuggestions('));
 assert.ok(compare.length>300);
 for(const obsolete of ['controls({week:true})','controls({season:true})','positions()','st-compare-picked','Select a player','selectedPlayers()'])
  assert.ok(!compare.includes(obsolete),'Unexpected Compare control: '+obsolete);
 assert.match(compare,/data-st-compare-search/);
 assert.match(compare,/currentCompareWeek\(\)/);
 assert.match(compare,/defenseForPosition\(p.position/);
 assert.match(compare,/role="combobox"/);
 assert.match(ui,/startsit:currentWeekCompare/);
});

test('Compare week is based on Eastern calendar week, even after Thursday games',()=>{
 const source=ui.match(/function currentCompareWeek\(now=new Date\(\)\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(source);
 const week=Function(source+'\nreturn currentCompareWeek;')();
 assert.equal(week(new Date('2026-09-10T03:00:00Z')),1); // Sep 9 in ET, pre-kickoff
 assert.equal(week(new Date('2026-09-10T23:00:00Z')),1);
 assert.equal(week(new Date('2026-11-12T23:00:00Z')),10);
 assert.equal(week(new Date('2026-11-14T20:00:00Z')),10);
 assert.equal(week(new Date('2026-11-19T23:00:00Z')),11);
 assert.equal(week(new Date('2027-01-10T22:00:00Z')),18);
});

test('Compare suggestions include players from all positions and show no-results feedback',()=>{
 const source=ui.match(/function showCompareSuggestions\(input\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(source);
 const box={hidden:true,innerHTML:'',replaceChildren(){this.innerHTML='';}};
 const input={value:'josh',dataset:{stCompareSearch:'0'},setAttribute(k,v){this[k]=v;}};
 const dataset={players:[
  {name:'Josh Allen',key:'joshallen',position:'QB',team:'BUF',customRank:3},
  {name:'Josh Jacobs',key:'joshjacobs',position:'RB',team:'GB',customRank:14},
  {name:'Justin Jefferson',key:'justinjefferson',position:'WR',team:'MIN',customRank:1}
 ]};
 const section={querySelector:()=>box};
 const search=Function('dataset','section','key','face','logo','E',source+'\nreturn showCompareSuggestions;')(
  dataset,section,s=>s.toLowerCase().replace(/[^a-z0-9]/g,''),p=>p.position,p=>p.team,s=>s
 );
 search(input);
 assert.equal(box.hidden,false);
 assert.match(box.innerHTML,/Josh Allen/);
 assert.match(box.innerHTML,/Josh Jacobs/);
 assert.doesNotMatch(box.innerHTML,/Justin Jefferson/);
 assert.equal(input['aria-expanded'],'true');
 input.value='nobody';search(input);
 assert.match(box.innerHTML,/No matching players/);
 input.value='';search(input);
 assert.equal(box.hidden,true);
 assert.equal(input['aria-expanded'],'false');
});

test('Compared players only change when a suggestion is selected or cleared',()=>{
 assert.match(ui,/e\.target\.matches\('\[data-st-compare-search\]'\)\)e\.stopImmediatePropagation\(\)/);
 assert.match(ui,/const chooseCompare=.*data-st-choose-compare/);
 assert.match(ui,/const compareClear=.*data-st-compare-clear/);
 assert.match(ui,/if\(e\.key==='Enter'&&suggestions&&!suggestions\.hidden\)/);
 assert.match(ui,/data-st-compare-results/);
});

test('touch suggestions select on initial pointer press and keyboard click still works',()=>{
 assert.match(ui,/function chooseComparedPlayer\(option\)/);
 assert.match(ui,/section\.addEventListener\('pointerdown',e=>\{/);
 assert.match(ui,/if\(!option\|\|e\.pointerType==='mouse'\)return;/);
 assert.match(ui,/e\.preventDefault\(\);\s*chooseComparedPlayer\(option\);/);
 assert.match(ui,/if\(chooseCompare\)\{chooseComparedPlayer\(chooseCompare\);return;\}/);
});

test('selected search cards are compact and third search dropdown layers over stats',()=>{
 const css=read('analytics/studio.css');
 assert.match(css,/\.st-compare-picker\.is-selected \.st-compare-search-line\{min-height:67px/);
 assert.match(css,/\.st-compare-selected\{[^}]*min-height:67px/);
 assert.match(css,/\.st-compare-searches\{position:relative;z-index:1000;overflow:visible!important\}/);
 assert.match(css,/\.st-compare-picker:focus-within\{position:relative;z-index:1100\}/);
 assert.match(css,/\.st-compare-picker:focus-within \.st-compare-results\{z-index:1200/);
});

test('Compare opens blank with no optional labels or introductory clutter',()=>{
 const compare=ui.slice(ui.indexOf('function currentWeekCompare(){'),ui.indexOf('function showCompareSuggestions('));
 assert.match(ui,/if\(state\.view==='startsit'\)\{state\.year=2026;state\.week=currentCompareWeek\(\);state\.compare=\[\];\}/);
 assert.match(ui,/if\(view==='startsit'\)\{state\.year=2026;if\(state\.view!=='startsit'\)state\.compare=\[\];\}/);
 assert.doesNotMatch(compare,/optional|Search for at least two players|Comparing Week/);
 assert.match(compare,/if\(!chosen\.length\)return search;/);
 assert.match(ui,/,'startsit'\]\.includes\(state\.view\)/);
});

test('Selecting one player immediately displays stats; additional players add a graph',()=>{
 const compare=ui.slice(ui.indexOf('function currentWeekCompare(){'),ui.indexOf('function showCompareSuggestions('));
 assert.match(compare,/if\(!chosen\.length\)return search;/);
 assert.match(compare,/const cards=/);
 assert.match(compare,/if\(chosen\.length===1\)return search\+cards\+advancedComparison\(\);/);
 assert.match(compare,/return search\+cards\+panel\('Recent scoring comparison'/);
 assert.match(compare,/st-compare-selected/);
 assert.match(compare,/st-compare-selected-logo/);
 assert.match(compare,/S\.teams\[S\.canonicalTeam\(p\.team\)\]/);
 const css=read('analytics/studio.css');
 assert.match(css,/\.st-compare-searches\{display:grid!important/);
 assert.match(css,/\.st-compare-picker\.is-selected.*\.st-compare-search-line/);
 assert.match(css,/\.st-compare-selected-info strong/);
 assert.match(css,/grid-column:1\/-1/);
});

test('new Compare assets use fresh cache versions',()=>{
 assert.ok(html.includes('analytics-dashboard.js?v=20261118-interface-fixes-v1'));
 assert.match(read('analytics-dashboard.js'),/20261118-interface-fixes-v1/);
});
