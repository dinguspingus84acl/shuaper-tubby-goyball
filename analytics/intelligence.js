/* Source-bounded fantasy decision models. Derived values are never official ESPN forecasts. */
(function(root){
'use strict';
const S=root.ShuaStudio,{num:N,mean,games:G}=S;
const POS=['QB','RB','WR','TE'];
const weightsDefault={actual:25,expected:35,trend:20,matchup:10,consistency:10};
const safe=v=>N(v)===null?null:Number(v);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const round=(v,d=1)=>v===null?null:Number(v.toFixed(d));
const sd=values=>{const a=values.map(safe).filter(v=>v!==null);if(a.length<2)return null;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));};
function normalCdf(z){ // Abramowitz-Stegun normal-CDF approximation, max absolute error < 8e-8.
 const x=Math.abs(z),t=1/(1+0.2316419*x);
 const density=Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
 const tail=density*t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
 return clamp(z>=0?1-tail:tail,0,1);
}
function nextWeek(ds){return ds.year===2026&&ds.latestWeek<18?ds.latestWeek+1:null;}
function xfpByWeek(row,w){return safe(row?.expectedWeeklyPpr?.[w]);}
function build(ds,usage){
 if(ds?.year!==2026||usage?.season!==2026||!usage?.players)return [];
 const through=ds.latestWeek,week=nextWeek(ds),ratings=ds.espnRatings?.positions||{};
 const averages=Object.fromEntries(POS.map(pos=>[pos,mean(Object.values(ratings[pos]||{}).map(x=>x.allowed))]));
 const pooled={};for(const pos of POS){
  const deviations=ds.players.filter(p=>p.position===pos).flatMap(p=>{
   const gs=G(p,through).map(g=>g.points);if(gs.length<3)return [];
   const m=mean(gs);return gs.map(v=>v-m);
  });
  pooled[pos]=clamp(sd(deviations)??6,3,20);
 }
 const actualPlayers=new Map(ds.players.map(p=>[p.key,p]));
 const positionRanks=new Map(Object.entries(ds.rankData?.position||{}).flatMap(([pos,players])=>players.map((p,i)=>[S.key(p.name),Number(p.rank)||i+1])));
 const rankedPositions=new Map(Object.entries(ds.rankData?.position||{}).flatMap(([pos,players])=>players.map(p=>[S.key(p.name),pos])));
 return Object.entries(usage.players).map(([id,row])=>actualPlayers.get(id)||{
  key:id,name:row.name||id,position:row.position||rankedPositions.get(id)||'',team:row.team||'',games:[],
  customPositionRank:positionRanks.get(id)||null
 }).filter(p=>POS.includes(p.position)).map(p=>{
  const row=usage.players[p.key],gs=G(p,through),n=gs.length;
  const actual=mean(gs.map(g=>g.points)),recent=mean(gs.slice(-3).map(g=>g.points));
  const xfp= safe(row.expectedFantasyPointsPerGame),recentXfp=gs.slice(-3).map(g=>xfpByWeek(row,g.week)).filter(v=>v!==null);
  const expectedRecent=recentXfp.length>=2?mean(recentXfp):xfp;
  const opp=ds.schedule[p.team]?.[week],rating=ratings[p.position]?.[opp?.opponent];
  const adjustment=rating&&averages[p.position]>0?clamp(1+.2*(rating.allowed/averages[p.position]-1),.9,1.1):null;
  const inactive=/^(OUT|IR|INJURED_RESERVE|SUSPENDED)$/i.test(String(p.injuryStatus||''));
  const valid=n>=3&&actual!==null&&recent!==null&&safe(xfp)!==null&&safe(expectedRecent)!==null&&rating&&opp?.known&&!opp.bye&&!inactive;
  const projection=valid?round((.35*actual+.30*recent+.35*expectedRecent)*adjustment,1):null;
  const personalSd=sd(gs.map(g=>g.points));
  const deviation=personalSd===null?null:clamp(Math.sqrt((n*personalSd**2+4*pooled[p.position]**2)/(n+4)),3,25);
  const probabilities=Object.fromEntries([10,15,20,25].map(threshold=>[threshold,projection===null||deviation===null?null:round(100*(1-normalCdf((threshold-projection)/deviation)),0)]));
  const matching=Number(row.expectedPointsCoverage?.matchedWeeks||0),fpoe=safe(row.fantasyPointsOverExpected);
  return {p,row,gs,n,actual,recent,xfp,expectedRecent,opponent:opp,oprk:rating?.rank??null,
   adjustment,projection,deviation,probabilities,week,injury:p.injuryStatus||'',
   fpoePerGame:fpoe!==null&&matching>=3?fpoe/matching:null,
   hit15:n>=3?100*gs.filter(g=>g.points>=(p.position==='QB'?20:15)).length/n:null};
 });
}
function breakout(rows){return rows.filter(r=>r.n>=3&&r.fpoePerGame!==null&&r.fpoePerGame<=-.5&&
  (safe(r.row.recentOpportunityChange)>=1.5||safe(r.row.targetShareTrend)>=2.5||
   safe(r.row.routeParticipationTrend)>=5||safe(r.row.expectedFantasyPointsTrend)>=2))
 .map(r=>({...r,signal:(Math.max(0,safe(r.row.recentOpportunityChange)||0)*2+
  Math.max(0,safe(r.row.targetShareTrend)||0)*.7+
  Math.max(0,safe(r.row.routeParticipationTrend)||0)*.17+
  Math.max(0,safe(r.row.expectedFantasyPointsTrend)||0)*1.2+Math.min(8,-r.fpoePerGame))}))
 .sort((a,b)=>b.signal-a.signal||a.p.name.localeCompare(b.p.name));}
function buySell(rows,mode='buy'){
 const sign=mode==='sell'?1:-1;
 return rows.filter(r=>r.n>=3&&r.fpoePerGame!==null&&sign*r.fpoePerGame>=1)
  .sort((a,b)=>sign*(b.fpoePerGame-a.fpoePerGame)||a.p.name.localeCompare(b.p.name));
}
function percentile(v,values){if(v===null||values.length<2)return null;
 const lower=values.filter(x=>x<v).length,equal=values.filter(x=>x===v).length;
 return 100*(lower+Math.max(0,equal-1)/2)/(values.length-1);
}
function customRankings(rows,weights=weightsDefault){
 const metrics={actual:r=>r.n>=3?r.actual:null,expected:r=>r.xfp,
  trend:r=>safe(r.row.recentOpportunityChange),
  matchup:r=>r.oprk===null?null:r.oprk,
  consistency:r=>r.hit15};
 const selected=Object.fromEntries(Object.entries(weightsDefault).map(([k,w])=>[k,clamp(safe(weights[k])??w,0,100)]));
 if(!Object.values(selected).some(v=>v>0))return [];
 const scored=rows.map(r=>{
  let points=0,denom=0,used=[];
  for(const [k,fn] of Object.entries(metrics)){
   if(!selected[k])continue;
   const val=safe(fn(r)),population=rows.filter(x=>x.p.position===r.p.position).map(fn).map(safe).filter(v=>v!==null);
   const pct=percentile(val,population);if(pct===null)continue;
   points+=selected[k]*pct;denom+=selected[k];used.push(k);
  }
  return {...r,customScore:r.n>=3&&used.length>=2&&denom>0?round(points/denom,1):null,signals:used};
 });
 return scored.sort((a,b)=>((b.customScore??-1)-(a.customScore??-1))||a.p.name.localeCompare(b.p.name));
}
function tiers(rows){
 return POS.flatMap(pos=>{
  const ranked=rows.filter(r=>r.p.position===pos&&r.projection!==null)
   .sort((a,b)=>b.projection-a.projection||a.p.name.localeCompare(b.p.name));
  let tier=1,previous=null;
  return ranked.map((r,i)=>{
   if(previous!==null&&previous-r.projection>=Math.max(1.5,previous*.10))tier++;
   previous=r.projection;
   return {...r,tier,positionIndex:i+1};
  });
 });
}
const features={
 QB:['actual','xfp','carriesPerGame','snapShare','epaPerDropback','completionPctOverExpected'],
 RB:['actual','xfp','targetsPerGame','carriesPerGame','snapShare','routeParticipation'],
 WR:['actual','xfp','targetsPerGame','targetShare','aDOT','yardsPerRouteRun'],
 TE:['actual','xfp','targetsPerGame','targetShare','aDOT','yardsPerRouteRun']};
function dimension(row,k){return k==='actual'?safe(row.actual):k==='xfp'?safe(row.xfp):safe(row.row[k]);}
function similar(rows,id){
 const selected=rows.find(r=>r.p.key===id);if(!selected)return [];
 const cohort=rows.filter(r=>r.p.position===selected.p.position),dimensions=features[selected.p.position];
 const ranges=Object.fromEntries(dimensions.map(k=>[k,sd(cohort.map(r=>dimension(r,k)))]));
 return cohort.filter(r=>r.p.key!==id).map(r=>{
  const common=dimensions.filter(k=>dimension(selected,k)!==null&&dimension(r,k)!==null&&ranges[k]>0);
  const distance=common.length>=4?Math.sqrt(common.reduce((total,k)=>total+((dimension(selected,k)-dimension(r,k))/ranges[k])**2,0)/common.length):null;
  return {...r,similarity:distance===null?null:round(100/(1+.6*distance),0),common:common.length};
 }).filter(r=>r.similarity!==null).sort((a,b)=>b.similarity-a.similarity||b.common-a.common).slice(0,12);
}
S.Intelligence={build,breakout,buySell,customRankings,tiers,similar,nextWeek,normalCdf,weightsDefault};
})(globalThis);
