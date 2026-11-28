/* Season-by-season player stats. Shares the History data source. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>v==null||v===''||Array.isArray(v)||!Number.isFinite(Number(v))?null:Number(v);
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').replace(/kennethwalkeriii$/,'kennethwalker').replace(/lutherburdeniii$/,'lutherburden');
const statKeys=['passAtt','completions','passYds','passTD','interceptions','rushAtt','rushYds','rushTD','targets','receptions','recYds','recTD','fumblesLost'];
const fmt=(v,d=0)=>num(v)===null?'—':num(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const ratio=(a,b,scale=1)=>num(a)!==null&&num(b)>0?num(a)/num(b)*scale:null;
const gp=r=>num(r.gamesPlayed??r.gp??r.games);
const col=(label,key,d=0,lower=false)=>({label,key,d,lower,value:r=>num(r[key])});
const calc=(label,key,fn,d=1,lower=false)=>({label,key,d,lower,value:fn});
const passing=[col('CMP','completions'),col('ATT','passAtt'),col('YD','passYds'),calc('CMP%','completionPct',r=>ratio(r.completions,r.passAtt,100),1),calc('YPA','passYpa',r=>ratio(r.passYds,r.passAtt),2),col('TD','passTD'),col('INT','interceptions',0,true)];
const rushing=[col('ATT','rushAtt'),col('YD','rushYds'),calc('YPC','rushYpc',r=>ratio(r.rushYds,r.rushAtt),2),col('TD','rushTD')];
const receiving=[col('TAR','targets'),col('REC','receptions'),col('YD','recYds'),calc('YPT','recYpt',r=>ratio(r.recYds,r.targets),2),calc('YPC','recYpc',r=>ratio(r.recYds,r.receptions),2),col('TD','recTD'),calc('CATCH%','catchPct',r=>ratio(r.receptions,r.targets,100),1)];
const fantasy=[calc('GM','gp',gp,0),col('FPTS','points',1),calc('PPG','ppg',r=>num(r.ppg??r.average)??ratio(r.points,gp(r)))];
const ranks=[col('PPR','rank',0,true),col('PPG','ppgRank',0,true)];
const misc=[col('FL','fumblesLost',0,true)];
const allCols=[...fantasy,...ranks,...passing,...rushing,...receiving,...misc];
const style=document.createElement('style');
style.id='playerSeasonStatsStyles';
style.textContent=`
#unifiedPlayerStatsPanel,.ps-shell{min-width:0;max-width:100%;box-sizing:border-box}
.ps-shell{display:grid;gap:8px;padding:5px 2px}
.ps-heading{margin:0 0 2px;padding:0 4px;color:#a8c7d7;font-size:.8rem;font-weight:950;text-transform:uppercase;letter-spacing:.03em}
.ps-table-wrap{width:100%;max-width:100%;min-width:0;overflow-x:auto!important;overflow-y:hidden!important;overscroll-behavior-x:contain;touch-action:pan-x pan-y!important;-webkit-overflow-scrolling:touch;scrollbar-width:thin;border-radius:6px}
.ps-table{width:var(--ps-width)!important;min-width:100%;max-width:none!important;border-collapse:separate!important;border-spacing:0;table-layout:fixed;font-variant-numeric:tabular-nums;background:#0b1a2b}
.ps-table col.ps-year-col{width:52px}.ps-table col.ps-team-col{width:53px}.ps-table col.ps-stat-col{width:66px}.ps-table col.ps-start-col{width:73px}
.ps-table :is(th,td){box-sizing:border-box;width:66px;min-width:66px;padding:2px 2px!important;text-align:center;white-space:nowrap;line-height:1.15;border:0!important;vertical-align:middle}
.ps-table .ps-group-head{padding:6px 4px 5px!important;text-align:left;color:#a8c7d7;font-size:.68rem;font-weight:950;text-transform:uppercase}
.ps-table .ps-stat-head{font-size:.61rem;color:#eff5ff;font-weight:950;padding:3px 2px!important}
.ps-table .ps-team-cell{width:53px;min-width:53px}
.ps-table .ps-year-cell{position:sticky!important;left:0!important;z-index:4;width:52px!important;min-width:52px!important;text-align:left;padding:2px 5px!important;background:#0b1a2b!important;color:#a8c7d7;font-size:.82rem;font-weight:950}
.ps-table thead .ps-year-cell{z-index:5}
.ps-table .ps-year-cell:after{content:'';position:absolute;top:0;bottom:0;right:-1px;width:1px;background:#5b718b35}
.ps-value{display:flex;align-items:center;justify-content:center;min-height:28px;border-radius:3px;background:#e1eaf5;color:#263343;font-size:.8rem;font-weight:950;padding:3px 2px}
.ps-value.good{background:#bddda1;color:#293e28}
.ps-value.mid{background:#ffdf86;color:#4e4128}
.ps-value.low{background:#ee999a;color:#523435}
.ps-value.empty{background:#e1eaf5;color:#79879a}
.ps-team{display:flex;align-items:center;justify-content:center;gap:3px;color:#e5effb;font-size:.66rem;font-weight:900}
.ps-team img{width:17px;height:17px;object-fit:contain}
.ps-table .ps-group-start{padding-left:9px!important;width:73px;min-width:73px}
.ps-note{font-size:.58rem;color:#9cb4c6;line-height:1.45;padding:0 4px}
.ps-legend{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.56rem;color:#a8c7d7;padding:0 4px}
.ps-legend span{display:inline-flex;align-items:center;gap:4px}
.ps-legend i{display:inline-block;width:9px;height:9px;border-radius:2px}
.ps-legend .good{background:#bddda1}.ps-legend .mid{background:#ffdf86}.ps-legend .low{background:#ee999a}
#modal .profile:has(#unifiedPlayerStatsPanel:not([hidden])){touch-action:pan-x pan-y!important}
#modal .profile #unifiedProfileTabs:has([data-profile-tab="stats"]){grid-template-columns:repeat(7,minmax(0,1fr))!important}
@media(max-width:760px){
 #modal .profile #unifiedProfileTabs:has([data-profile-tab="stats"]){grid-template-columns:repeat(4,minmax(0,1fr))!important;overflow:visible!important}
 #modal .profile #unifiedProfileTabs:has([data-profile-tab="stats"]) .unified-profile-tab{font-size:.62rem!important;padding:7px 2px!important;white-space:nowrap}
 .ps-table col.ps-year-col{width:47px}.ps-table col.ps-stat-col{width:63px}.ps-table col.ps-start-col{width:70px}
 .ps-table :is(th,td){width:63px;min-width:63px}
 .ps-table .ps-year-cell{width:47px!important;min-width:47px!important;font-size:.77rem}
 .ps-table .ps-group-start{width:70px;min-width:70px}
 .ps-value{min-height:24px;font-size:.76rem}
}
`;
// The site's mobile ranking layout globally hides thead and stacks table cells.
style.textContent += `
body #modal .profile #unifiedPlayerStatsPanel{width:100%!important;max-width:100%!important;min-width:0!important;overflow:visible!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-shell{display:grid!important;grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:100%!important;min-width:0!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table-wrap{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:auto!important;overflow-y:hidden!important;touch-action:pan-x pan-y!important}
body #modal .profile #unifiedPlayerStatsPanel table.ps-table{display:table!important;width:var(--ps-width)!important;min-width:var(--ps-width)!important;max-width:none!important;table-layout:fixed!important;border-collapse:separate!important;border-spacing:0!important;margin:0!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table colgroup{display:table-column-group!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table col{display:table-column!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table thead{display:table-header-group!important;visibility:visible!important;opacity:1!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table tbody{display:table-row-group!important;padding:0!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table tr{display:table-row!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table :is(th,td){display:table-cell!important;visibility:visible!important;white-space:nowrap!important;vertical-align:middle!important;text-align:center!important;float:none!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table :is(th,td)::before{content:none!important;display:none!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table .ps-group-head{text-align:left!important;font-size:.68rem!important;color:#a8c7d7!important;background:#0b1a2b!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table .ps-stat-head{font-size:.65rem!important;color:#eff5ff!important;background:#0b1a2b!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table .ps-year-cell{position:sticky!important;left:0!important;z-index:6!important;text-align:left!important;background:#0b1a2b!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table .ps-year-cell:after{content:''!important;display:block!important}
body #modal .profile #unifiedPlayerStatsPanel .ps-table .ps-value{display:flex!important}
`;
document.head.appendChild(style);
function teamCell(r){
 const team=String(r.teamAbbr||r.team||'');
 const logo=window.ShuaEspnLive?.getTeamLogoUrl?.(team)||'';
 return '<div class="ps-team">'+(logo?'<img src="'+esc(logo)+'" alt="">':'')+esc(team)+'</div>';
}
function rankLimits(position){
 const pos=String(position||'').toUpperCase();
 return pos==='QB'||pos==='TE'?[12,24]:pos==='RB'||pos==='WR'?[15,30]:null;
}
function rankColor(rank,position){
 const limits=rankLimits(position),n=num(rank);
 return !limits||n===null||n<1?'':n<=limits[0]?'good':n<=limits[1]?'mid':'low';
}
function statRank(value,values,lower=false){
 if(value===null||!values.length)return null;
 // Equal values share the same competition rank.
 return 1+values.filter(v=>lower?v<value-1e-8:v>value+1e-8).length;
}
function enrichRow(r,board){
 const pool=(board||[]).filter(p=>p.position===r.position&&gp(p)>0);
 if(pool.length<2)return r;
 const rankFor=fn=>statRank(fn(r),pool.map(fn).filter(v=>v!==null));
 const ppg=p=>num(p.ppg??p.average)??ratio(p.points,gp(p));
 const row={...r,rank:rankFor(p=>num(p.points)),ppgRank:rankFor(ppg)};
 const colors={},statRanks={};
 for(const c of allCols){
  const v=c.value(row);
  if(v===null)continue;
  const rank=c.key==='rank'||c.key==='ppgRank'?v:statRank(v,pool.map(c.value).filter(x=>x!==null),c.lower);
  statRanks[c.key]=rank;
  colors[c.key]=rankColor(rank,row.position);
 }
 return {...row,psColors:colors,psRanks:statRanks};
}
function build(rows,pos){
 if(!rows.length)return '<div class="unified-profile-loading">No season statistics available.</div>';
 const has=k=>rows.some(r=>num(r[k])!==null&&num(r[k])!==0);
 const special=['K','D/ST'].includes(pos);
 const limits=rankLimits(pos);
 const legend=limits?'<div class="ps-legend"><span><i class="good"></i>1–'+limits[0]+'</span><span><i class="mid"></i>'+(limits[0]+1)+'–'+limits[1]+'</span><span><i class="low"></i>'+(limits[1]+1)+'+</span></div>':'';

 const groups=[{label:'Fantasy',cols:fantasy}];
 if(!special){
  groups.push({label:'Position Rank',cols:ranks});
  if(pos==='QB'||has('passAtt'))groups.push({label:'Passing',cols:passing});
  if(['QB','RB'].includes(pos)||has('rushAtt'))groups.push({label:'Rushing',cols:rushing});
  if(['RB','WR','TE'].includes(pos)||has('targets')||has('receptions'))groups.push({label:'Receiving',cols:receiving});
  groups.push({label:'Misc',cols:misc});
 }
 const cols=groups.flatMap(g=>g.cols.map((c,i)=>({...c,start:i===0})));
 const width=105+cols.reduce((n,c)=>n+(c.start?73:66),0);
 const colgroup='<colgroup><col class="ps-year-col"><col class="ps-team-col">'+cols.map(c=>'<col class="'+(c.start?'ps-start-col':'ps-stat-col')+'">').join('')+'</colgroup>';
 const groupHead='<tr><th class="ps-year-cell" rowspan="2" scope="col">Year</th><th class="ps-team-cell" rowspan="2" scope="col">Team</th>'+groups.map(g=>'<th class="ps-group-head ps-group-start" colspan="'+g.cols.length+'" scope="colgroup">'+esc(g.label)+'</th>').join('')+'</tr>';
 const statHead='<tr>'+cols.map(c=>'<th scope="col" class="ps-stat-head'+(c.start?' ps-group-start':'')+'">'+esc(c.label)+'</th>').join('')+'</tr>';
 const body=rows.map(r=>'<tr><th scope="row" class="ps-year-cell">'+esc(r.year)+'</th><td class="ps-team-cell">'+teamCell(r)+'</td>'+cols.map(c=>{
  const v=c.value(r),rank=r.psRanks?.[c.key]??((c.key==='rank'||c.key==='ppgRank')?v:null);
  const color=v===null?'empty':(r.psColors?.[c.key]||rankColor(rank,r.position));
  const title=rank!=null?' title="'+esc(r.position+' '+c.label+' rank: '+rank)+'"':'';
  return '<td'+(c.start?' class="ps-group-start"':'')+'><span class="ps-value '+esc(color)+'"'+title+'>'+fmt(v,c.d)+'</span></td>';
 }).join('')+'</tr>').join('');
 return '<div class="ps-shell"><h3 class="ps-heading">Career</h3><div class="ps-table-wrap" tabindex="0" role="region" aria-label="Career statistics, scroll horizontally"><table class="ps-table" style="--ps-width:'+width+'px" aria-label="Season by season statistics">'+colgroup+'<thead>'+groupHead+statHead+'</thead><tbody>'+body+'</tbody></table></div>'+legend+'<div class="ps-note">Colors reflect each statistic’s rank among players at the same position in that season. Current season totals are year-to-date. — means unavailable.'+(special?' Kicker and defense coverage includes fantasy scoring only.':'')+'</div></div>';
}
async function load(name,seed){
 const api=window.ShuaEspnLive;
 const position=String(seed?.position||'').toUpperCase();
 if(position==='K'||position==='D/ST'){
  const special=position==='K'?await window.ShuaKickerProfile?.getSeasonStats?.(seed.id):await window.ShuaDefenseProfile?.getSeasonStats?.(seed.id,seed.team);
  return (special||[]).filter(r=>gp(r)>0).map(r=>({...r,position})).sort((a,b)=>b.year-a.year);
 }
 if(!api?.getCompleteCareer)return [];
 const career=await api.getCompleteCareer(name);
 const out=new Array(career.length);
 let next=0;
 async function worker(){
  while(true){
   const i=next++;if(i>=career.length)return;
   const r=career[i];
   try{
    const list=await api.getCareerSeasonBoard(r.year);
    const row=list.find(p=>p.position===r.position&&String(p.id)===String(r.id))||
     list.find(p=>p.position===r.position&&norm(p.name)===norm(r.name||name));
    const merged=row?{...r,...row,year:r.year,teamAbbr:row.team||r.teamAbbr}:r;
    out[i]=row?enrichRow(merged,list):merged;
   }catch(e){out[i]=r}
  }
 }
 await Promise.all(Array.from({length:Math.min(4,career.length)},worker));
 return out.filter(Boolean).filter(r=>gp(r)>0||statKeys.some(k=>num(r[k])!==null&&num(r[k])!==0)).sort((a,b)=>b.year-a.year);
}
let serial=0;
async function render(name,target,seed=null){
 if(!target)return;
 const token=String(++serial);target.dataset.psToken=token;
 target.innerHTML='<div class="unified-profile-loading">Loading season stats…</div>';
 try{
  const rows=await load(name,seed);
  if(target.dataset.psToken!==token)return;
  target.innerHTML=build(rows,String(rows[0]?.position||seed?.position||'').toUpperCase());
 }catch(e){if(target.dataset.psToken===token)target.innerHTML='<div class="unified-profile-loading">Season statistics are unavailable right now.</div>'}
}
window.ShuaPlayerSeasonStats={render,build,load};
})();