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
const col=(label,key,d=0)=>({label,get:r=>fmt(r[key],d)});
const calc=(label,fn,d=1)=>({label,get:r=>fmt(fn(r),d)});
const gpCol=calc('GP',gp,0);
const passing=[gpCol,col('CMP','completions'),col('ATT','passAtt'),col('YDS','passYds'),col('TD','passTD'),col('INT','interceptions'),calc('CMP%',r=>ratio(r.completions,r.passAtt,100))];
const rushing=[gpCol,col('CAR','rushAtt'),col('YDS','rushYds'),col('TD','rushTD'),calc('YPC',r=>ratio(r.rushYds,r.rushAtt))];
const receiving=[gpCol,col('TGT','targets'),col('REC','receptions'),col('YDS','recYds'),col('TD','recTD'),calc('Y/R',r=>ratio(r.recYds,r.receptions)),calc('CATCH%',r=>ratio(r.receptions,r.targets,100))];
const fantasy=[gpCol,col('PTS','points',1),calc('PPG',r=>num(r.ppg??r.average)??ratio(r.points,gp(r))),col('FL','fumblesLost')];
const style=document.createElement('style');
style.textContent=`
#unifiedPlayerStatsPanel .ps-shell,.ps-shell{display:grid;gap:12px;min-width:0}
.ps-block{background:#07182a;border:1px solid #ffffff18;border-radius:10px;overflow:hidden}
.ps-heading{margin:0;padding:10px 11px;background:#112c40;color:#e9f4ff;font-size:.79rem;font-weight:950}
.ps-table-wrap{width:100%;overflow-x:auto;touch-action:pan-x pan-y}
.ps-table{width:100%;border-collapse:collapse;table-layout:fixed;font-variant-numeric:tabular-nums}
.ps-table th,.ps-table td{padding:9px 3px;text-align:center;white-space:nowrap;line-height:1.2;border-bottom:1px solid #ffffff10}
.ps-table th{font-size:.59rem;color:#a8c7d7;background:#0b2235;font-weight:900}
.ps-table td{font-size:.77rem;color:#edf6ff;font-weight:850}
.ps-table tbody tr:last-child td{border-bottom:0}
.ps-table tbody tr:nth-child(even){background:#ffffff03}
.ps-table th:first-child,.ps-table td:first-child{width:64px;text-align:left;padding-left:9px}
.ps-year{display:flex;align-items:center;gap:4px;font-size:.79rem}
.ps-team{display:flex;align-items:center;gap:3px;margin-top:4px;color:#9cb4c6;font-size:.57rem}
.ps-team img{width:15px;height:15px;object-fit:contain}
.ps-note{font-size:.6rem;color:#9cb4c6;line-height:1.45;padding:3px 4px}
#modal .profile #unifiedProfileTabs:has([data-profile-tab="stats"]){grid-template-columns:repeat(7,minmax(0,1fr))!important}
@media(max-width:760px){
 #modal .profile #unifiedProfileTabs:has([data-profile-tab="stats"]){grid-template-columns:repeat(4,minmax(0,1fr))!important;overflow:visible!important}
 #modal .profile #unifiedProfileTabs:has([data-profile-tab="stats"]) .unified-profile-tab{font-size:.62rem!important;padding:7px 2px!important;white-space:nowrap}
 .ps-table th:first-child,.ps-table td:first-child{width:47px;padding-left:5px}
 .ps-table td{font-size:.7rem;padding:9px 1px}
 .ps-table th{font-size:.53rem;padding:8px 1px}
 .ps-year{font-size:.72rem}.ps-team{font-size:.52rem}
 .ps-team img{width:13px;height:13px}
 .ps-table{min-width:300px}
}
`;
document.head.appendChild(style);
function seasonCell(r){
 const team=String(r.teamAbbr||r.team||'');
 const logo=window.ShuaEspnLive?.getTeamLogoUrl?.(team)||'';
 return '<div class="ps-year">'+esc(r.year)+'</div><div class="ps-team">'+(logo?'<img src="'+esc(logo)+'" alt="">':'')+esc(team)+'</div>';
}
function table(title,cols,rows){
 return '<section class="ps-block"><h3 class="ps-heading">'+esc(title)+'</h3><div class="ps-table-wrap"><table class="ps-table"><thead><tr><th>Year</th>'+cols.map(c=>'<th>'+esc(c.label)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><td>'+seasonCell(r)+'</td>'+cols.map(c=>'<td>'+esc(c.get(r))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></section>';
}
function build(rows,pos){
 const has=k=>rows.some(r=>num(r[k])!==null&&num(r[k])!==0);
 if(!rows.length)return '<div class="unified-profile-loading">No season statistics available.</div>';
 const special=['K','D/ST'].includes(pos);
 const sections=[];
 if(!special){
  if(pos==='QB'||has('passAtt'))sections.push(table('Passing',passing,rows));
  if(['QB','RB'].includes(pos)||has('rushAtt'))sections.push(table('Rushing',rushing,rows));
  if(['RB','WR','TE'].includes(pos)||has('targets')||has('receptions'))sections.push(table('Receiving',receiving,rows));
 }
 sections.push(table('Fantasy',special?fantasy.slice(0,3):fantasy,rows));
 return '<div class="ps-shell">'+sections.join('')+'<div class="ps-note">Regular season totals. Current season is in progress. — means unavailable.'+(special?' Kicker and defense coverage currently includes fantasy points and games.':'')+'</div></div>';
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
   if(statKeys.every(k=>num(r[k])!==null)){out[i]=r;continue}
   try{
    const list=await api.getCareerSeasonBoard(r.year);
    const row=list.find(p=>p.position===r.position&&String(p.id)===String(r.id))||
     list.find(p=>p.position===r.position&&norm(p.name)===norm(r.name||name));
    out[i]=row?{...r,...row,year:r.year,teamAbbr:row.team||r.teamAbbr}:r;
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