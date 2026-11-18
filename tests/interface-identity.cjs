'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
let generated;
const mockFs={...fs,writeFileSync(_file,text){generated=JSON.parse(text);},statSync(){return {size:0};}};
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/build-ranked-usage.cjs'),'utf8'),{
 require:id=>id==='node:fs'?mockFs:require(id),__dirname:path.join(root,'scripts'),process:{stdout:{write(){}}}
});
const snapshot=require('../analytics/data/ranked-usage-2026.json');
for(const name of ['jamescook','travisetienne','chrisgodwin','aaronjones','deebosamuel','michaelpenix','kylepitts']){
 assert.ok(generated.players[name]?.games>0,name+' should match its suffixed source name');
 assert.ok(Number.isFinite(generated.players[name].snapShare),name+' should have verified snap counts');
 assert.equal(snapshot.players[name].games,generated.players[name].games);
 assert.equal(snapshot.players[name].targetsPerGame,generated.players[name].targetsPerGame);
}
assert.equal(generated.rankedPlayers,Object.keys(generated.players).length);
assert.equal(snapshot.rankedPlayers,generated.rankedPlayers);
// Menus must stay inside both a desktop viewport and a small zoomed viewport.
for(const [width,height,rect] of [[1360,900,{left:1000,top:10,bottom:52}],[360,300,{left:260,top:250,bottom:292}],[240,200,{left:180,top:10,bottom:40}]]){
 const properties={},menu={style:{getPropertyValue:k=>properties[k],setProperty:(k,v)=>properties[k]=v},parentElement:{querySelector:()=>({getBoundingClientRect:()=>rect})},querySelectorAll:()=>Array(10)};
 const nav={querySelectorAll:()=>[menu]},win={visualViewport:{width,height,offsetLeft:0,offsetTop:0,addEventListener(){}},addEventListener(){}};
 const context={window:win,document:{getElementById:id=>id==='shuaCleanNav'?nav:null,querySelector:()=>({}),addEventListener(){}},MutationObserver:class{observe(){}},requestAnimationFrame:()=>{},innerWidth:width,innerHeight:height};
 vm.runInNewContext(fs.readFileSync(path.join(root,'interface-fixes-20261118.js'),'utf8'),context);
 win.ShuaViewportMenus.layout();
 const left=parseFloat(properties['--menu-left']),top=parseFloat(properties['--menu-top']),w=parseFloat(properties['--menu-width']),h=parseFloat(properties['--menu-height']);
 assert.ok(left>=0&&left+w<=width,'Menu width overflows viewport');
 assert.ok(top>=0&&top+h<=height,'Menu height overflows viewport');
}
console.log('PASS: suffixed player stats and snaps resolve; menu bounds fit desktop and zoomed viewports.');

const S=require('../analytics/core.js');
const season=require('../analytics/data/season-2026.json');
const cook=season.players.find(p=>S.key(p.name)==='jamescook');
const fallback=S.completeUsageFromGames(season,cook,{games:0,targetsPerGame:null,carriesPerGame:null,snapShare:null,routeParticipation:null},10);
assert.ok(fallback.games>0&&fallback.targetsPerGame>0&&fallback.carriesPerGame>0&&fallback.snapShare>0,'Observed Cook workload must survive a missing ranked row');
assert.equal(fallback.routeParticipation,null,'Route charting must never be inferred from snaps');
assert.equal(S.completeUsageFromGames({players:[]},{games:[]},{targetsPerGame:null},10).targetsPerGame,null);
console.log('PASS: missing Usage rows recover verified games and workloads without inventing route metrics.');
