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

test('new Compare assets use fresh cache versions',()=>{
 for(const asset of ['analytics-dashboard.js','clean-design.js','feature-polish-20261106.js','visual-twenty-20261113.js']){
  assert.ok(html.includes(asset+'?v=20261114-compare-current-week-v1'),asset);
 }
 assert.match(read('analytics-dashboard.js'),/20261114-compare-current-week-v1/);
});
