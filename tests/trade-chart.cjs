'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const big=JSON.parse(read('big-board.json'));
const posFiles=['qb-rankings.json','rb-rankings.json','wr-rankings.json','te-rankings.json'];
const positions=['QB','RB','WR','TE'];
const lists=posFiles.map(f=>JSON.parse(read(f)).players);
const calc=read('trade-calculator.js'),chart=read('trade-chart.js'),html=read('index.html'),css=read('trade-chart.css');
assert.ok(calc.includes('window.ShuaTradeChartSource'), 'Chart must reuse the existing calculator values');
assert.ok(calc.includes("150*Math.exp(-0.04*(rank-1))"), 'Rank-to-trade-value scale must not change');
assert.ok(calc.includes("new Event('shua:trade-data-updated')"),'Preseason/ROS toggle must refresh chart');
assert.ok(html.includes('trade-chart.css')&&html.includes('trade-chart.js'));
assert.ok(html.indexOf('trade-calculator.js')<html.indexOf('trade-chart.js'),'Load after calculator');
assert.ok(css.includes('position:sticky')&&css.includes('overflow-x:auto'),'Mobile grid must scroll and stick');
assert.ok(chart.includes('analytics/data/season-2026.json')&&chart.includes('analytics/data/ranked-usage-2026.json'));
assert.ok(chart.includes("s.fpoe=n>0&&oe!==null?oe/n:null"),'Do not fabricate FPOE');
assert.ok(chart.includes("if(!gamePoints.length)continue"),'Missing FPG must stay missing');
assert.equal(big.players[0],'Jahmyr Gibbs');
assert.equal(big.players[2],"Ja'Marr Chase");
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const names=new Set(big.players.map(norm));
assert.ok(names.size>=200);
const meta=new Set(lists.flatMap(a=>a.map(x=>norm(x.name))));
for(const n of names)assert.ok(meta.has(n),'Big Board missing positional identity: '+n);
const val=r=>Math.max(.1,150*Math.exp(-.04*(r-1)));
assert.equal(val(1),150);
assert.ok(val(2)<val(1)&&val(3)<val(2));
assert.equal(val(200),.1);
class Element{
 constructor(name){this.name=name;this.children=[];this.innerHTML='';this.hidden=false;this.style={};this.dataset={};}
 setAttribute(){}
 addEventListener(){}
 insertBefore(child){this.children.push(child);}
 append(child){this.children.push(child);}
 querySelector(){return new Element('child');}
 querySelectorAll(){return [];}
}
const shell=new Element('shell'),section=new Element('section');
section.querySelector=selector=>selector==='.trade-shell'?shell:new Element(selector);
const doc={
 getElementById:id=>id==='tradeSection'?section:null,
 createElement:tag=>new Element(tag)
};
const win={addEventListener(){},ShuaTradeChartSource:()=>null};
vm.runInNewContext(chart,{window:win,document:doc,console,fetch(){}},{timeout:500});
assert.ok(win.ShuaTradeChartUI?.groupRows,'Chart helper missing');
const sample=big.players.slice(0,90).map((name,i)=>{
 const matches=positions.flatMap((pos,j)=>lists[j].filter(p=>norm(p.name)===norm(name)).map(p=>({pos,meta:p})));
 assert.equal(matches.length,1);
 return {name,position:matches[0].pos,rank:i+1,positionRank:matches[0].meta.rank,value:val(i+1)};
});
const bands=win.ShuaTradeChartUI.groupRows(sample);
const flatten=bands.flatMap(b=>b.players);
assert.equal(flatten.length,sample.length,'Band packing must retain every ranked player');
for(let i=1;i<flatten.length;i++)assert.ok(flatten[i-1].value>=flatten[i].value,'Trade values out of order');
assert.equal(flatten[0].name,'Jahmyr Gibbs');
for(const b of bands){assert.ok(b.players.length>=1&&b.players.length<=6);assert.ok(b.high>=b.low);}
const withDuplicate=win.ShuaTradeChartUI.groupRows([sample[0],sample[0],sample[1]]);
assert.equal(withDuplicate.flatMap(b=>b.players).length,2,'Duplicate player must appear once');
console.log('PASS: trade chart reuses Big Board order and 150-point formula; all 4 positions; source-safe FPG/FPOE; dynamic row packing; responsive grid.');
