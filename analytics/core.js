/* SHUA Analytics Studio: data-independent calculations. No inferred missing values. */
(function(root){
'use strict';
const S=root.ShuaStudio=root.ShuaStudio||{};
const aliases={kennethwalkeriii:'kennethwalker',michaelpittmanjr:'michaelpittman',brianthomasjr:'brianthomas',marvinharrisonjr:'marvinharrison',chigokonkwo:'chigoziemokonkwo',lutherburdeniii:'lutherburden',haroldfanninjr:'haroldfannin',joshpalmer:'joshuapalmer'};
const key=v=>{const s=String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');return aliases[s]||s;};
const num=v=>v===null||v===undefined||v===''||typeof v==='boolean'?null:Number.isFinite(Number(v))?Number(v):null;
const vals=a=>a.map(num).filter(v=>v!==null);
const mean=a=>{const b=vals(a);return b.length?b.reduce((s,n)=>s+n,0)/b.length:null;};
const sum=a=>{const b=vals(a);return b.length?b.reduce((s,n)=>s+n,0):null;};
const quantile=(a,q)=>{const b=vals(a).sort((x,y)=>x-y);if(!b.length)return null;const i=(b.length-1)*q,j=Math.floor(i);return b[j]+(b[Math.ceil(i)]-b[j])*(i-j);};
const dev=a=>{const b=vals(a),m=mean(b);return b.length?Math.sqrt(mean(b.map(v=>(v-m)**2))):null;};
const rolling=(a,n)=>a.map((v,i)=>i<n-1?null:vals(a.slice(i-n+1,i+1)).length===n?mean(a.slice(i-n+1,i+1)):null);
const pct=(n,d)=>num(n)!==null&&num(d)!==null&&d>0?n/d*100:null;
const fmt=(v,d=1,suffix='')=>num(v)===null?'—':Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})+suffix;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canonicalTeam=v=>{let s=String(v||'').trim().replace(/^(@|vs\.?\s*)/i,'').toUpperCase();return ({GNB:'GB',KAN:'KC',LVR:'LV',OAK:'LV',NWE:'NE',NOR:'NO',SFO:'SF',TAM:'TB',JAC:'JAX',WSH:'WAS',LA:'LAR',STL:'LAR',SD:'LAC'})[s]||s;};
const teams={ARI:'Arizona Cardinals',ATL:'Atlanta Falcons',BAL:'Baltimore Ravens',BUF:'Buffalo Bills',CAR:'Carolina Panthers',CHI:'Chicago Bears',CIN:'Cincinnati Bengals',CLE:'Cleveland Browns',DAL:'Dallas Cowboys',DEN:'Denver Broncos',DET:'Detroit Lions',GB:'Green Bay Packers',HOU:'Houston Texans',IND:'Indianapolis Colts',JAX:'Jacksonville Jaguars',KC:'Kansas City Chiefs',LAC:'Los Angeles Chargers',LAR:'Los Angeles Rams',LV:'Las Vegas Raiders',MIA:'Miami Dolphins',MIN:'Minnesota Vikings',NE:'New England Patriots',NO:'New Orleans Saints',NYG:'New York Giants',NYJ:'New York Jets',PHI:'Philadelphia Eagles',PIT:'Pittsburgh Steelers',SEA:'Seattle Seahawks',SF:'San Francisco 49ers',TB:'Tampa Bay Buccaneers',TEN:'Tennessee Titans',WAS:'Washington Commanders'};
const positions=['QB','RB','WR','TE'];
const played=g=>g&&g.hasStats!==false&&num(g.points??g.totalPoints)!==null;
const games=(p,through=18)=>((p&&p.games)||[]).filter(g=>played(g)&&g.week<=through).sort((a,b)=>a.week-b.week);
function consistency(p,through=18){const gs=games(p,through),a=gs.map(g=>g.points),ts=p.position==='QB'?[15,20,25,30]:[10,15,20,25];return {n:a.length,mean:mean(a),median:quantile(a,.5),floor:quantile(a,.1),ceiling:quantile(a,.9),sd:dev(a),rates:ts.map(t=>({threshold:t,count:a.filter(v=>v>=t).length,percent:a.length?a.filter(v=>v>=t).length/a.length*100:null}))};}
function positionalRank(players,p,metric){const v=metric(p);if(num(v)===null)return null;return 1+players.filter(x=>x.position===p.position&&num(metric(x))!==null&&metric(x)>v).length;}
function defense(ds,position,through=18,last=0){
 const start=last?Math.max(1,through-last+1):1,groups=new Map(),weeks=new Map();
 for(const p of ds.players){for(const g of games(p,through)){if(g.week<start||!teams[g.opponent])continue;const id=g.opponent+'|'+g.week;weeks.set(id,{team:g.opponent,week:g.week});if(p.position===position)groups.set(id,(groups.get(id)||0)+g.points);}}
 const out=Object.keys(teams).map(team=>{const w=[...weeks.values()].filter(g=>g.team===team).sort((a,b)=>a.week-b.week);const a=w.map(g=>({week:g.week,points:groups.get(team+'|'+g.week)||0}));return {team,games:a.length,allowed:mean(a.map(g=>g.points)),series:a};});
 const ranked=out.filter(x=>x.allowed!==null).sort((a,b)=>b.allowed-a.allowed||a.team.localeCompare(b.team));
 ranked.forEach(x=>{x.rank=1+ranked.filter(y=>y.allowed>x.allowed).length;x.score=ranked.length>1?Math.round(100*(ranked.length-x.rank)/(ranked.length-1)):50;});
 return {rows:ranked,byTeam:Object.fromEntries(ranked.map(x=>[x.team,x])),league:mean(ranked.map(x=>x.allowed)),through,start};
}
function aggregate(p,through=18,last=0){const gs=games(p,through).filter(g=>!last||g.week>through-last);const out={n:gs.length,points:sum(gs.map(g=>g.points)),ppg:mean(gs.map(g=>g.points)),recent:mean(gs.slice(-3).map(g=>g.points))};for(const k of ['targets','rushAtt','receptions','passAtt','rushYds','recYds','passYds','redZone','inside10','snaps','routes','teamSnaps','teamDropbacks'])out[k]=sum(gs.map(g=>g[k]));out.snapRate=pct(out.snaps,out.teamSnaps)??mean(gs.map(g=>g.snapRate));out.routeRate=pct(out.routes,out.teamDropbacks);out.workload=mean(gs.map(g=>num(g.targets)!==null&&num(g.rushAtt)!==null?g.targets+g.rushAtt:null));return out;}
function teamShares(ds,team,through=18,last=0){const members=ds.players.map(p=>{const g=games(p,through).filter(g=>g.team===team&&(!last||g.week>through-last));return {...p,games:g,...aggregate({...p,games:g},through)};}).filter(p=>p.n);const totals={};for(const k of ['targets','rushAtt','redZone','inside10'])totals[k]=sum(members.map(p=>p[k]));return members.map(p=>({...p,targetShare:pct(p.targets,totals.targets),carryShare:pct(p.rushAtt,totals.rushAtt),redZoneShare:pct(p.redZone,totals.redZone),insideShare:pct(p.inside10,totals.inside10)}));}
function splits(ds,starter,team,through=18,manualOut){
 const starterWeeks=new Set(games(starter,through).filter(g=>g.team===team&&((g.targets||0)+(g.rushAtt||0)+(g.passAtt||0)>0||(g.snaps||0)>0)).map(g=>g.week));
 const allWeeks=[...new Set(ds.players.flatMap(p=>games(p,through).filter(g=>g.team===team).map(g=>g.week)))].sort((a,b)=>a-b);
 const out=manualOut?allWeeks.filter(w=>manualOut.includes(w)):allWeeks.filter(w=>!starterWeeks.has(w));
 const withWeeks=allWeeks.filter(w=>!out.includes(w)&&starterWeeks.has(w));
 const rows=ds.players.filter(p=>p.key!==starter.key).map(p=>{const gs=games(p,through).filter(g=>g.team===team);const a=gs.filter(g=>withWeeks.includes(g.week)),b=gs.filter(g=>out.includes(g.week));const av=mean(a.map(g=>(g.targets??0)+(g.rushAtt??0))),bv=mean(b.map(g=>(g.targets??0)+(g.rushAtt??0)));return {player:p,with:av,without:bv,delta:av!==null&&bv!==null?bv-av:null,withPpg:mean(a.map(g=>g.points)),withoutPpg:mean(b.map(g=>g.points)),nWith:a.length,nWithout:b.length,withoutGames:b};}).filter(x=>x.nWith||x.nWithout).sort((a,b)=>(b.delta??-Infinity)-(a.delta??-Infinity));return {out,withWeeks,rows};
}
Object.assign(S,{key,num,mean,sum,quantile,dev,rolling,pct,fmt,esc,canonicalTeam,teams,positions,games,consistency,positionalRank,defense,aggregate,teamShares,splits});
if(typeof module!=='undefined')module.exports=S;
})(globalThis);
