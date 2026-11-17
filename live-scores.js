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
  section.innerHTML='<header class="ls-header"><div><h2 id="liveScoresTitle">Live Scores</h2><div id="lsPeriod">NFL · ESPN PPR</div></div><button type="button" id="lsRefresh">Refresh</button></header><div id="lsPositions" role="group" aria-label="Fantasy positions"></div><p id="lsStatus" role="status"></p><div id="lsGames"></div>';
  main.append(section);
  const period=section.querySelector('#lsPeriod');
  const status=section.querySelector('#lsStatus');
  const games=section.querySelector('#lsGames');
  const refreshButton=section.querySelector('#lsRefresh');
  const filters=section.querySelector('#lsPositions');
  const positions={1:'QB',2:'RB',3:'WR',4:'TE',5:'K',16:'D/ST'};
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clock=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
  let scoreboard=null, fantasy=null, busy=false, visible=false, timer=null, lastStatsAttempt=0;
  let draftPlayers=null, selectedPosition='All';
  for(const position of ['All',...Object.values(positions)]){
    const filter=document.createElement('button');
    filter.type='button';
    filter.textContent=position;
    filter.setAttribute('aria-pressed',String(position===selectedPosition));
    filter.addEventListener('click',()=>{
      selectedPosition=position;
      for(const item of filters.children)item.setAttribute('aria-pressed',String(item===filter));
      if(scoreboard)renderGames();
    });
    filters.append(filter);
  }

  async function json(url,headers){
    const abort=new AbortController();
    const timeout=setTimeout(()=>abort.abort(),14000);
    try{
      const res=await fetch(url,{cache:'no-store',headers,signal:abort.signal});
      if(!res.ok)throw Error('HTTP '+res.status);
      return await res.json();
    }finally{clearTimeout(timeout);}
  }

  function draftName(name){
    const key=window.ShuaPlayerFaces.key(name);
    return key==='chigokonkwo'?'chigoziemokonkwo':key;
  }

  async function loadDraftPlayers(){
    const board=await json('big-board.json');
    const names=new Set(board.players.map(entry=>draftName(typeof entry==='string'?entry:entry?.name)).filter(Boolean));
    if(!names.size)throw Error('Draft board is empty');
    draftPlayers=names;
  }

  function fantasyLine(stats){
    const n=id=>Number(stats[id])||0;
    return [
      n(0)?n(1)+'/'+n(0)+' CMP · '+n(3)+' PASS YDS · '+n(4)+' TD'+(n(20)?' · '+n(20)+' INT':''):'',
      n(23)?n(23)+' CAR · '+n(24)+' RUSH YDS · '+n(25)+' TD':'',
      n(58)||n(53)?n(53)+' REC'+(n(58)?' / '+n(58)+' TGT':'')+' · '+n(42)+' REC YDS · '+n(43)+' TD':'',
      n(72)?n(72)+' FUM LOST':''
    ].filter(Boolean).join(' / ');
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
      byTeam.get(team).push({id:player.id,name:player.fullName,position,points:Number(stat.appliedTotal),line:fantasyLine(stat.stats)});
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
  function playerStats(team){
    const players=fantasy?.teams.get(String(team.id))||[];
    const rows=players.filter(p=>(selectedPosition==='All'||p.position===selectedPosition)&&
      (p.position==='K'||p.position==='D/ST'||draftPlayers?.has(draftName(p.name))))
      .map(p=>'<li>'+playerFace(p,team)+'<div class="ls-player-copy"><strong>'+escape(p.name)+'</strong> <span>'+escape(p.position)+'</span>'+
        (p.line?'<small>'+escape(p.line)+'</small>':'')+'</div><b>'+p.points.toFixed(1)+'</b></li>').join('');
    const empty=!players.length?'Waiting for ESPN fantasy stats.':
      !draftPlayers&&!['K','D/ST'].includes(selectedPosition)?'Waiting for the draft player list.':
      selectedPosition==='All'?'No eligible players have stats yet.':'No '+selectedPosition+' stats yet.';
    return '<section class="ls-team"><h3>'+escape(teamLabel(team))+' <span>PPR</span></h3>'+
      (rows?'<ul>'+rows+'</ul>':'<p>'+empty+'</p>')+'</section>';
  }

  function renderGames(){
    const expanded=new Set([...games.querySelectorAll('details[open]')].map(node=>node.dataset.game));
    const firstRender=!games.querySelector('details');
    const focusGame=document.activeElement?.closest('#lsGames summary')?.parentElement.dataset.game;
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
      const box=state==='pre'?'<p class="ls-pending">Fantasy stats appear after kickoff.</p>':contenders.map(item=>playerStats(item.team)).join('');
      return '<details data-game="'+escape(event.id)+'"'+(expanded.has(String(event.id))||(firstRender&&event===initial)?' open':'')+
        '><summary><span class="ls-game-status'+(state==='in'?' ls-in-progress':'')+'">'+escape(label)+'</span><span class="ls-matchup">'+scores+'</span></summary><div class="ls-box">'+box+'</div></details>';
    }).join('');
    if(!html){games.innerHTML='<p class="ls-pending">No NFL games on ESPN’s current scoreboard.</p>';return;}
    if(games.dataset.rendered===html)return;
    games.dataset.rendered=html;
    games.innerHTML=html;
    if(focusGame)[...games.querySelectorAll('details')].find(node=>node.dataset.game===focusGame)?.querySelector('summary')?.focus({preventScroll:true});
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
      const draftRequest=canLoadStats&&!draftPlayers?loadDraftPlayers().catch(()=>null):null;
      if(canLoadStats&&(due||!fantasy)){
        lastStatsAttempt=Date.now();
        try{
          const teams=await getFantasy(year,week,type);
          if(teams.size)fantasy={key:periodKey,teams};
          else status.textContent+=' · Waiting for ESPN fantasy stats';
        }catch(_){status.textContent+=' · Fantasy stats delayed';}
        renderGames();
      }
      if(draftRequest){
        await draftRequest;
        if(!draftPlayers)status.textContent+=' · Draft player list unavailable';
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
