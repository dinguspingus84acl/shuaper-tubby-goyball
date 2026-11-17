/* ESPN NFL scoreboard and actual fantasy scoring periods. */
(()=>{
  'use strict';
  const nav=document.querySelector('.positions');
  const main=document.querySelector('main');
  if(!nav||!main)return;

  const button=document.createElement('button');
  button.type='button';
  button.className='pos';
  button.dataset.pos='LIVESCORES';
  button.textContent='Live Scores';
  nav.append(button);

  const section=document.createElement('section');
  section.id='shuaLiveScores';
  section.hidden=true;
  section.setAttribute('aria-labelledby','liveScoresTitle');
  section.innerHTML='<header class="ls-header"><div><h2 id="liveScoresTitle">Live Scores</h2><div id="lsPeriod">NFL · ESPN PPR</div></div><button type="button" id="lsRefresh">Refresh</button></header><p id="lsStatus" role="status"></p><div id="lsGames"></div>';
  main.append(section);
  const period=section.querySelector('#lsPeriod');
  const status=section.querySelector('#lsStatus');
  const games=section.querySelector('#lsGames');
  const refreshButton=section.querySelector('#lsRefresh');
  const positions={1:'QB',2:'RB',3:'WR',4:'TE',5:'K',16:'D/ST'};
  const positionOptions=['All',...Object.values(positions)];
  const gamePositions=new Map();
  // ESPN stat IDs match the player card's game log.
  const receiving=[['REC',53],['TGT',58],['YDS',42],['TD',43]];
  const statColumns={
    All:[['PASS YDS',3],['RUSH YDS',24],['REC YDS',42],['OFF TD',[4,25,43]]],
    QB:[['CMP',1],['ATT',0],['YDS',3],['TD',4],['INT/FUM',[20,72]],['RUSH YDS',24]],
    RB:[['ATT',23],['YDS',24],['TD',25],['REC',53],['REC YDS',42],['REC TD',43]],
    WR:receiving,
    TE:receiving,
    K:[],
    'D/ST':[]
  };
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clock=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
  let scoreboard=null, fantasy=null, busy=false, visible=false, timer=null, lastStatsAttempt=0;

  async function json(url,headers){
    const abort=new AbortController();
    const timeout=setTimeout(()=>abort.abort(),14000);
    try{
      const res=await fetch(url,{cache:'no-store',headers,signal:abort.signal});
      if(!res.ok)throw Error('HTTP '+res.status);
      return await res.json();
    }finally{clearTimeout(timeout);}
  }

  async function getFantasy(year,week,type){
    const filter=JSON.stringify({players:{
      filterSlotIds:{value:[0,2,4,6,16,17]},
      filterStatsForSourceIds:{value:[0]},
      filterStatsForScoringPeriodIds:{value:[week]},
      filterStatsForTopScoringPeriodIds:{value:1,additionalValue:['00'+year]}
    }});
    const data=await json('https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/'+year+'/segments/0/leaguedefaults/3?scoringPeriodId='+week+'&view=kona_player_info',{
      'X-Fantasy-Filter':filter,'X-Fantasy-Source':'kona'
    });
    const byTeam=new Map();
    for(const entry of (Array.isArray(data)?data:data.players||[])){
      const player=entry.playerPoolEntry?.player||entry.player||entry;
      const position=positions[player.defaultPositionId];
      if(!position||!player.fullName||!player.proTeamId)continue;
      const stat=(player.stats||[]).filter(row=>Number(row.seasonId)===year&&Number(row.scoringPeriodId)===week&&Number(row.statSourceId)===0&&
        (!row.seasonTypeId||Number(row.seasonTypeId)===type)&&row.appliedTotal!=null&&Number.isFinite(Number(row.appliedTotal))&&Object.keys(row.stats||{}).length)
        .sort((a,b)=>Object.keys(b.stats).length-Object.keys(a.stats).length)[0];
      if(!stat)continue;
      const team=String(player.proTeamId);
      if(!byTeam.has(team))byTeam.set(team,[]);
      const points=Number(stat.appliedTotal);
      if(points===0)continue;
      byTeam.get(team).push({id:player.id,name:player.fullName,position,points,stats:stat.stats});
    }
    for(const rows of byTeam.values())rows.sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
    return byTeam;
  }

  const teamLabel=team=>team.shortDisplayName||team.displayName||team.abbreviation;
  function teamLogo(team){
    const src=team.logo;
    return /^https:\/\/a\.espncdn\.com\/i\/teamlogos\/nfl\//.test(src||'')?'<img src="'+escape(src)+'" alt="" loading="lazy" width="29" height="29">':'';
  }
  function playerFace(player,team){
    if(player.position==='D/ST')return '<span class="ls-face ls-defense" aria-hidden="true">'+teamLogo(team)+'</span>';
    const initials=player.name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase().replace(/[^\p{L}]/gu,'')||'?';
    const official=/^\d+$/.test(String(player.id))?'https://a.espncdn.com/i/headshots/nfl/players/full/'+player.id+'.png':'';
    const urls=[...new Set([official,...window.ShuaPlayerFaces.urls(player.name)].filter(Boolean))];
    if(!urls.length)return '<span class="ls-face ls-initials" aria-hidden="true">'+initials+'</span>';
    return '<img class="ls-face" src="'+escape(urls[0])+'" alt="" loading="lazy" decoding="async" width="32" height="32"'+
      ' data-face-urls="'+escape(urls.map(encodeURIComponent).join('|'))+'" data-face-initials="'+initials+'"'+
      ' data-face-fallback-class="ls-face ls-initials" onerror="window.ShuaAdvanceFace(this)">';
  }
  function positionFilters(contenders,selectedPosition){
    const matchup=contenders.map(item=>teamLabel(item.team)).join(' vs. ');
    return '<div class="ls-positions" role="group" aria-label="'+escape(matchup+' positions')+'">'+
      positionOptions.map(pos=>'<button type="button" data-ls-position="'+pos+'" aria-pressed="'+String(pos===selectedPosition)+'">'+pos+'</button>').join('')+'</div>';
  }

  function playerStats(team,selectedPosition){
    const players=fantasy?.teams.get(String(team.id));
    const columns=statColumns[selectedPosition];
    const rows=(players||[]).filter(p=>selectedPosition==='All'||p.position===selectedPosition)
      .map(p=>{
        const stats=columns.map(([,ids])=>{
          const value=Array.isArray(ids)?ids.reduce((total,id)=>total+(Number(p.stats[id])||0),0):Number(p.stats[ids])||0;
          return '<td>'+(selectedPosition==='All'&&!value?'—':value)+'</td>';
        }).join('');
        return '<tr><th scope="row"><div class="ls-player">'+playerFace(p,team)+'<div><strong>'+escape(p.name)+'</strong>'+
          '<small>'+p.position+'</small></div></div></th><td class="ls-pts'+(p.points<0?' ls-pts-negative':'')+'">'+p.points.toFixed(1)+'</td>'+stats+'</tr>';
      }).join('');
    const empty=!players?'Waiting for ESPN fantasy stats.':selectedPosition==='All'?'No players with fantasy points.':'No '+selectedPosition+' with fantasy points.';
    const label=escape(teamLabel(team));
    return '<section class="ls-team"><h3>'+label+'</h3>'+
      (rows?'<table class="ls-log" aria-label="'+label+' fantasy stats"><thead><tr><th scope="col">Player</th><th scope="col">PPR</th>'+
        columns.map(([heading])=>'<th scope="col">'+heading+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table>':'<p>'+empty+'</p>')+'</section>';
  }

  function renderGames(){
    const expanded=new Set([...games.querySelectorAll('details[open]')].map(node=>node.dataset.game));
    const firstRender=!games.querySelector('details');
    const focused=document.activeElement?.closest('#lsGames summary, #lsGames [data-ls-position]');
    const focusGame=focused?.closest('details')?.dataset.game;
    const focusPosition=focused?.dataset.lsPosition;
    const rank={in:0,pre:1,post:2};
    const events=[...scoreboard.events].filter(e=>e.competitions?.[0]?.competitors?.length===2).sort((a,b)=>{
      const aState=a.status.type.state,bState=b.status.type.state;
      return (rank[aState]??3)-(rank[bState]??3)||(aState==='post'?Date.parse(b.date)-Date.parse(a.date):Date.parse(a.date)-Date.parse(b.date));
    });
    const initial=events.find(event=>event.status.type.state==='in')||events.find(event=>event.status.type.state==='post');
    const html=events.map(event=>{
      const type=event.status.type, state=type.state;
      const contenders=[...event.competitions[0].competitors].sort((a,b)=>Number(a.homeAway==='home')-Number(b.homeAway==='home'));
      const kickoff=new Date(event.date);
      const label=state==='pre'&&type.name==='STATUS_SCHEDULED'&&Number.isFinite(+kickoff)?clock.format(kickoff):type.shortDetail||type.detail||type.description;
      const scores=contenders.map(item=>'<span class="ls-score-team">'+teamLogo(item.team)+'<strong>'+escape(teamLabel(item.team))+'</strong>'+
        (state!=='pre'&&item.score!=null?'<b>'+escape(item.score)+'</b>':'')+'</span>').join('');
      const selectedPosition=gamePositions.get(String(event.id))||'All';
      const box=state==='pre'?'<p class="ls-pending">Fantasy stats appear after kickoff.</p>':
        positionFilters(contenders,selectedPosition)+contenders.map(item=>playerStats(item.team,selectedPosition)).join('');
      return '<details data-game="'+escape(event.id)+'"'+(expanded.has(String(event.id))||(firstRender&&event===initial)?' open':'')+
        '><summary><span class="ls-game-status'+(state==='in'?' ls-in-progress':'')+'">'+escape(label)+'</span><span class="ls-matchup">'+scores+'</span></summary><div class="ls-box">'+box+'</div></details>';
    }).join('');
    if(!html){games.removeAttribute('data-rendered');games.innerHTML='<p class="ls-pending">No NFL games on ESPN’s current scoreboard.</p>';return;}
    if(games.dataset.rendered===html)return;
    games.dataset.rendered=html;
    games.innerHTML=html;
    if(focusGame){
      const game=[...games.querySelectorAll('details')].find(node=>node.dataset.game===focusGame);
      game?.querySelector(focusPosition?'[data-ls-position="'+focusPosition+'"]':'summary')?.focus({preventScroll:true});
    }
  }

  async function refresh(force=false){
    if(busy||!visible||document.hidden)return;
    busy=true;
    refreshButton.disabled=true;
    if(!scoreboard)status.textContent='Loading NFL games…';
    try{
      const next=await json('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100');
      if(!Array.isArray(next.events))throw Error('ESPN scoreboard unavailable');
      const year=Number(next.season?.year),week=Number(next.week?.number),type=Number(next.season?.type);
      const periodKey=year+'-'+type+'-'+week;
      if(fantasy?.key!==periodKey)fantasy=null;
      scoreboard=next;
      period.textContent=(week>0&&type===2?'Week '+week+' · ':'')+'ESPN PPR';
      renderGames();

      const checked=new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit',second:'2-digit'});
      status.textContent='Scores checked '+checked;
      const hasLive=next.events.some(event=>event.status?.type?.state==='in');
      const canLoadStats=next.events.some(event=>['in','post'].includes(event.status?.type?.state))&&year>2000&&week>0&&type===2;
      const due=force||hasLive||Date.now()-lastStatsAttempt>=120000;
      if(canLoadStats&&(due||!fantasy)){
        lastStatsAttempt=Date.now();
        try{
          const teams=await getFantasy(year,week,type);
          if(teams.size)fantasy={key:periodKey,teams};
          else status.textContent+=' · Waiting for ESPN fantasy stats';
        }catch(_){status.textContent+=' · Fantasy stats delayed';}
        renderGames();
      }
    }catch(_){
      status.textContent=scoreboard?'ESPN scores delayed. Showing the last update.':'Unable to load ESPN scores. Try Refresh.';
    }finally{
      busy=false;
      refreshButton.disabled=false;
    }
  }

  function show(){
    if(visible)return;
    visible=true;
    document.body.classList.remove('fantasy-home-mode','mobile-menu-open');
    document.body.classList.add('shua-live-scores-open');
    section.hidden=false;
    nav.querySelectorAll('.pos').forEach(item=>item.classList.toggle('active',item===button));
    try{localStorage.setItem('shuaPageStateV2',JSON.stringify({section:'LIVESCORES'}));}catch(_){}
    window.scrollTo(0,0);
    void refresh(true);
    timer=setInterval(refresh,30000);
  }
  function hide(){
    visible=false;
    section.hidden=true;
    document.body.classList.remove('shua-live-scores-open');
    button.classList.remove('active');
    clearInterval(timer);
  }

  refreshButton.addEventListener('click',()=>void refresh(true));
  games.addEventListener('click',event=>{
    const filter=event.target.closest('[data-ls-position]');
    if(!filter||filter.getAttribute('aria-pressed')==='true')return;
    gamePositions.set(filter.closest('details').dataset.game,filter.dataset.lsPosition);
    renderGames();
  });
  document.addEventListener('visibilitychange',()=>void refresh(true));
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('.positions [data-pos],#phoneMenuItems [data-target],#shuaCleanNav [data-shua-target],#shuaCleanNav [data-shua-studio]');
    if(visible&&target&&(target.dataset.pos||target.dataset.target||target.dataset.shuaTarget)!=='LIVESCORES')hide();
  },true);
  nav.addEventListener('click',event=>{
    if(event.target.closest('[data-pos]')!==button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    show();
  },true);
})();
