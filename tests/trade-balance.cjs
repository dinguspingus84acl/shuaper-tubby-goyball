const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','trade-calculator.js'),'utf8');
const first=source.indexOf('function qualityWeight(');
const last=source.indexOf('function adjustmentText(',first);
assert.ok(first>=0&&last>first,'Recommendation engine is present in Trade Calculator');
const engine=source.slice(first,last);
const player=(name,rank,value)=>({name,rank,value,team:'BUF',position:'RB'});

function setup(left,right,pool){
  const box={hidden:true,innerHTML:''};
  const state={left,right};
  const context={
    state,tradePlayers:pool,
    document:{getElementById:id=>id==='tradeBalanceSuggestion'?box:null},
    norm:s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,''),
    escapeHtml:s=>String(s),tradeHeadshot:()=>'',teamLogo:()=>'',
    activeModeLabel:()=> 'ROS',
    allSelected:()=>new Set([...state.left,...state.right].map(p=>p.name.toLowerCase()))
  };
  const functions=vm.runInNewContext(engine+'\n({renderBalanceSuggestion,projectedScores,adjustedSum,differencePercent})',context);
  return {...functions,box,state};
}

test('shows three closest players and recalculates the consolidation premium',()=>{
  const elite=player('Elite',1,100);
  const weaker=player('Weaker',6,60);
  const closest=player('Closest Fit',5,48);
  const next=player('Next Fit',4,44);
  const third=player('Third Fit',3,36);
  const poorFit=player('Poor Fit',50,15);
  const testCase=setup([elite],[weaker],[elite,weaker,poorFit,third,next,closest]);
  const projected=testCase.projectedScores('right',closest);
  assert.ok(Math.abs(projected.left-106)<.00001,'Strong-side 2-for-1 premium applied');
  assert.ok(Math.abs(projected.right-105.6)<.00001,'Weak-side package discount applied');
  testCase.renderBalanceSuggestion();
  assert.equal(testCase.box.hidden,false);
  assert.equal((testCase.box.innerHTML.match(/class="trade-balance-card"/g)||[]).length,3);
  assert.match(testCase.box.innerHTML,/Closest Fit[\s\S]*Next Fit[\s\S]*Third Fit/);
  assert.match(testCase.box.innerHTML,/data-add="right"/);
  assert.doesNotMatch(testCase.box.innerHTML,/Poor Fit/);
  assert.doesNotMatch(testCase.box.innerHTML,/trade-balance-head|trade-balance-outcome|trade-balance-add|trade-balance-ready/);
  assert.equal(testCase.state.right.length,1,'Preview does not modify the trade');
});

test('does not recommend duplicate players from either selected side',()=>{
  const elite=player('Elite',1,100),weaker=player('Weaker',6,60),other=player('Other',25,20);
  const testCase=setup([elite],[weaker],[elite,weaker,other]);
  testCase.renderBalanceSuggestion();
  assert.doesNotMatch(testCase.box.innerHTML,/data-name="Elite"|data-name="Weaker"/);
});

test('suppresses additions when an existing trade is within five percent',()=>{
  const testCase=setup([player('Top',1,100)],[player('Bottom',2,98)],[player('Spare',5,48)]);
  testCase.renderBalanceSuggestion();
  assert.equal(testCase.box.hidden,true);
  assert.equal(testCase.box.innerHTML,'');
});

test('keeps recommendation hidden until both trade sides contain players',()=>{
  const testCase=setup([player('Top',1,100)],[],[player('Other',5,48)]);
  testCase.renderBalanceSuggestion();
  assert.equal(testCase.box.hidden,true);
});

test('history timeline markup and styles are removed',()=>{
  const history=fs.readFileSync(path.join(__dirname,'..','player-history.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'..','visual-eight-20261107.css'),'utf8');
  assert.doesNotMatch(history,/player-history-timeline|data-history-season/);
  assert.doesNotMatch(css,/\.player-history-timeline|\.player-history-season/);
});
