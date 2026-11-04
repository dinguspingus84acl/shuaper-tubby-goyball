/* Best-effort live ESPN roster synchronization for publicly readable leagues.
 * No credential capture; private/blocked leagues preserve their saved snapshots. */
(function(){
'use strict';
const ui=window.ShuaMyTeamsUI;
if(!ui||window.ShuaMyTeamsLive)return;
const root=ui.section,snapshots=ui.rosterSnapshots,leagueData=ui.leagueData;
const POSITION={1:'QB',2:'RB',3:'WR',4:'TE',5:'K',16:'D/ST'};
const SLOT={0:'QB',2:'RB',4:'WR',6:'TE',16:'D/ST',17:'K',20:'Bench',21:'IR',23:'FLEX',24:'RB/WR/TE',25:'OP'};
const NFL={1:'ATL',2:'BUF',3:'CHI',4:'CIN',5:'CLE',6:'DAL',7:'DEN',8:'DET',9:'GB',10:'TEN',11:'IND',12:'KC',13:'LV',14:'LAR',15:'MIA',16:'MIN',17:'NE',18:'NO',19:'NYG',20:'NYJ',21:'PHI',22:'ARI',23:'PIT',24:'LAC',25:'SF',26:'SEA',27:'TB',28:'WAS',29:'CAR',30:'JAX',33:'BAL',34:'HOU'};
const WAIT=60000;
let active=false,inflight=null,timer=null,lastSuccess=0,lastAttempt=0,lastFailures=0;
const syncedOn=window.ShuaMyTeamsData?.syncedOn;
const savedLabel=syncedOn?'ESPN data synced '+new Date(syncedOn+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'Saved ESPN snapshot';
const status=document.createElement('div');
status.id='myTeamsLiveStatus';
status.className='myteams-live-status';
status.innerHTML='<details class="shua-espn-sync"><summary aria-label="ESPN roster update details"><span class="shua-espn-sync-dot" aria-hidden="true"></span><span data-myteams-sync-compact>'+savedLabel+'</span></summary><div class="shua-espn-sync-expanded"><span data-myteams-sync-status role="status" aria-live="polite">'+savedLabel+' · standings, rosters, matchups and waivers</span><button type="button" data-myteams-sync-now>Check live rosters</button></div></details>';
root.querySelector('.myteams-header-right')?.append(status);
const css=document.createElement('style');css.textContent=
 '#myTeamsLiveStatus{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font:750 10px system-ui,sans-serif;color:#b2c9db}' +
 '#myTeamsLiveStatus [data-myteams-sync-now]{border:1px solid #457896;border-radius:8px;background:#0c344c;color:#e9f7ff;min-height:34px;padding:6px 10px;font:850 11px system-ui,sans-serif;cursor:pointer}' +
 '#myTeamsLiveStatus button:disabled{opacity:.5;cursor:wait}' +
 '@media(max-width:700px){#myTeamsLiveStatus{width:100%;justify-content:flex-start}#myTeamsLiveStatus [data-myteams-sync-now]{min-height:38px}}';
document.head.append(css);
const statusText=text=>{
 const el=status.querySelector('[data-myteams-sync-status]');if(el)el.textContent=text;
 const compact=status.querySelector('[data-myteams-sync-compact]');
 const updated=String(text).match(/\b\d{1,2}:\d{2}\s?[AP]M\b/i);
 if(compact)compact.textContent=updated?'Live '+updated[0]:text.startsWith('Checking')?'Checking ESPN…':text.includes('unavailable')?savedLabel:savedLabel;
 status.classList.toggle('shua-espn-unavailable',text.includes('unavailable'));
 status.classList.toggle('shua-espn-checking',text.startsWith('Checking'));
};
const btn=status.querySelector('button');
function validLeagueId(s){return /^\d{4,14}$/.test(String(s||''));}
function rosterEntry(entry){
 const player=entry?.playerPoolEntry?.player||entry?.playerPoolEntry||entry?.player;
 const id=String(player?.id??entry?.playerId??'');
 const name=String(player?.fullName||player?.displayName||player?.name||'').trim();
 const slotId=Number(entry?.lineupSlotId),positionId=Number(player?.defaultPositionId);
 if(!name||!id||!Number.isFinite(slotId))return null;
 const position=POSITION[positionId]||(Number(id)<0?'D/ST':'');
 return {
  id,name,pos:position,nfl:NFL[Number(player?.proTeamId)]||'FA',
  slot:SLOT[slotId]||'Slot '+slotId,
  status:typeof player?.injuryStatus==='string'?player.injuryStatus:'',
  // Do not carry stale or unrelated ESPN projections into newly acquired players.
  weeklyProjections:{}
 };
}
function parseLeague(data,leagueId,teamId){
 if(!data||String(data.id||'')!==String(leagueId)||!Array.isArray(data.teams))return null;
 const team=data.teams.find(t=>String(t.id)===String(teamId));
 const entries=team?.roster?.entries;
 if(!Array.isArray(entries)||entries.length<1||entries.length>55)return null;
 const result=entries.map(rosterEntry);
 if(result.some(x=>!x))return null;
 const unique=new Set(result.map(x=>x.id+'|'+x.slot));
 if(unique.size!==result.length)return null;
 const period=Number(data.status?.currentMatchupPeriod||data.status?.currentScoringPeriod||0);
 return {roster:result,period:Number.isInteger(period)&&period>=1&&period<=18?period:null};
}
async function fetchLeague(id,teamId){
 const base='/apis/v3/games/ffl/seasons/2026/segments/0/leagues/'+encodeURIComponent(id);
 const params='?view=mTeam&view=mRoster&view=mStatus';
 const hosts=['https://lm-api-reads.fantasy.espn.com','https://fantasy.espn.com'];
 let lastError;
 for(const host of hosts){
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
  try{
   const res=await fetch(host+base+params,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',
     headers:{Accept:'application/json'},signal:ctrl.signal});
   if(res.status===401||res.status===403){lastError=new Error('ESPN league not publicly readable');continue;}
   if(!res.ok){lastError=new Error('ESPN HTTP '+res.status);continue;}
   const json=await res.json();
   let parsed=parseLeague(json,id,teamId);
   if(parsed)return parsed;
   const period=Number(json?.status?.currentScoringPeriod||json?.status?.currentMatchupPeriod||0);
   if(period>=1&&period<=18){
    const again=await fetch(host+base+params+'&scoringPeriodId='+period,{method:'GET',mode:'cors',
     credentials:'omit',cache:'no-store',signal:ctrl.signal,headers:{Accept:'application/json'}});
    if(again.ok){parsed=parseLeague(await again.json(),id,teamId);if(parsed)return parsed;}
   }
   lastError=new Error('ESPN roster not returned');
  }catch(e){lastError=e;}
  finally{clearTimeout(timeout);}
 }
 throw lastError||new Error('ESPN roster unavailable');
}
function isVisible(){return document.visibilityState!=='hidden'&&document.body.classList.contains('my-teams-open')&&!root.hidden&&Number(root.querySelector('#myTeamsYear')?.value)===2026;}
async function refresh(force=false){
 if(inflight)return inflight;
 if(!isVisible())return;
 const now=Date.now();
 if(!force&&now-lastAttempt<WAIT-5000)return;
 lastAttempt=now;btn.disabled=true;statusText('Checking ESPN rosters…');
 inflight=(async()=>{
  const clubs=ui.teamIndex.filter(x=>validLeagueId(x.id)&&/^\d+$/.test(String(x.teamId||'')));
  let updated=0,readable=0,failed=0,index=0;
  const worker=async()=>{
   while(index<clubs.length){
    const x=clubs[index++];
    try{
     const value=await fetchLeague(x.id,x.teamId);
     readable++;
     const snapshot=snapshots[x.index];
     if(!snapshot)continue;
     const previous=JSON.stringify((snapshot.roster||[]).map(p=>[String(p.id),String(p.slot)]).sort());
     const fresh=JSON.stringify(value.roster.map(p=>[p.id,p.slot]).sort());
     if(fresh!==previous){
      const old=new Map((snapshot.roster||[]).map(p=>[String(p.id),p]));
      snapshot.roster=value.roster.map(p=>{
       const prior=old.get(String(p.id));
       return {...p,weeklyProjections:prior?.weeklyProjections||{},
         weeklyProjection:prior?.weeklyProjection??null,projectionWeek:prior?.projectionWeek??null};
      });
      updated++;ui.refreshOpenRoster(x.index);
     }
     const league=leagueData.find(p=>String(p.id)===String(x.id));
     if(league&&value.period)league.week=value.period;
   }catch(_){failed++;}
   }
  };
  await Promise.all(Array.from({length:Math.min(3,clubs.length)},worker));
  lastFailures=failed;
  if(readable){
   lastSuccess=Date.now();
   statusText('Live ESPN: '+readable+'/'+clubs.length+' leagues checked · '+updated+' roster'+(updated===1?'':'s')+' changed · '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})+(failed?' · '+failed+' unavailable':''));
  }else statusText(savedLabel+' · Live ESPN roster access unavailable (private or blocked leagues). Saved data remains visible.');
  return {readable,updated,failed};
 })().finally(()=>{btn.disabled=false;inflight=null;});
 return inflight;
}
function syncVisibility(){
 if(isVisible()){
  if(!active){active=true;void refresh(true);}
  if(!timer)timer=setInterval(()=>{if(isVisible())void refresh(false);},WAIT);
 }else{active=false;if(timer){clearInterval(timer);timer=null;}}
}
btn.onclick=()=>void refresh(true);
document.addEventListener('visibilitychange',syncVisibility);
window.addEventListener('focus',()=>{if(isVisible())void refresh(true);});
const observer=new MutationObserver(syncVisibility);
observer.observe(document.body,{attributes:true,attributeFilter:['class']});
observer.observe(root,{attributes:true,attributeFilter:['hidden']});
root.querySelector('#myTeamsYear')?.addEventListener('change',syncVisibility);
window.ShuaMyTeamsLive={refresh,get lastSuccess(){return lastSuccess;},get lastFailures(){return lastFailures;},parseLeague,rosterEntry};
syncVisibility();
})();
