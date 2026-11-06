/* Third pass: eight opt-in visual refinements layered over the saved Clean UI.
   Deliberately leaves the player-card header and injury/bye badges unchanged. */
(()=>{
  'use strict';
  const body=document.body;
  const nav=document.getElementById('shuaCleanNav');
  if(!body||!nav)return;
  const isClean=()=>body.classList.contains('shua-clean');
  const vector={
    rankings:'<path d="M8 5h12M8 12h12M8 19h12M3 5h1M3 12h1M3 19h1"/>',
    analytics:'<path d="M4 20V11m6 9V4m6 16v-8m5 8H2"/>',
    teams:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M17 6a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/>',
    tools:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    chevron:'<path d="m7 10 5 5 5-5"/>'
  };
  function icon(kind){
    const el=document.createElement('span');el.className='shua-line-icon';el.setAttribute('aria-hidden','true');
    el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+vector[kind]+'</svg>';
    return el;
  }
  for(const key of ['rankings','analytics','teams','tools']){
    const trigger=nav.querySelector('[data-shua-group="'+key+'"] .shua-clean-trigger');
    if(trigger&&!trigger.querySelector('.shua-line-icon'))trigger.prepend(icon(key));
  }
  const boardArrow=document.querySelector('#shuaBoardOptions > span[aria-hidden="true"]');
  if(boardArrow)boardArrow.replaceChildren(icon('chevron'));
  const weather=document.getElementById('shuaWeatherSection');
  function decorateWeatherIcons(){
    weather?.querySelectorAll('.shua-wx-game-details > summary:not([data-shua-outline])').forEach(summary=>{
      summary.dataset.shuaOutline='1';summary.append(icon('chevron'));
    });
  }
  if(weather){
    new MutationObserver(decorateWeatherIcons).observe(weather,{childList:true,subtree:true});
    decorateWeatherIcons();
  }

  // 1. A single compact, accessible league list replaces three-column cards.
  const myTeams=document.getElementById('shuaMyTeams');
  function leagueRecord(item){
    if(!item||item.year!==2026)return null;
    const league=window.ShuaMyTeamsUI?.leagueData?.find(x=>String(x.id)===String(item.id));
    const own=league?.standings?.find(x=>String(x.teamId)===String(item.teamId))||
      league?.standings?.find(x=>x.teamName===item.team);
    if(!own||!Number.isFinite(Number(own.wins))||!Number.isFinite(Number(own.losses)))return null;
    return own.wins+'–'+own.losses+(Number(own.ties)>0?'–'+own.ties:'');
  }
  function decorateLeagues(){
    const grid=myTeams?.querySelector('.myteams-grid');
    if(!grid||!isClean())return;
    [...grid.querySelectorAll(':scope > .myteams-card')].forEach((card,i)=>{
      const trigger=card.querySelector('.myteams-card-trigger');
      if(!trigger||trigger.dataset.shuaListReady==='1')return;
      const identity=trigger.querySelector('.myteams-card-identity');
      const league=trigger.querySelector('.myteams-league');
      const team=identity?.querySelector('.myteams-name');
      if(!identity||!league||!team)return;
      const copy=document.createElement('span');copy.className='shua-league-copy';
      copy.append(team,league);
      identity.append(copy);
      const monogram=document.createElement('span');
      monogram.className='shua-league-monogram';
      monogram.textContent=initials(team.textContent);
      monogram.setAttribute('role','img');
      monogram.setAttribute('aria-label',team.textContent+' logo unavailable');
      // Distinct, stable identity for private fantasy teams with no public logo.
      // Real team images remain visible whenever they load successfully.
      const hues=[172,196,218,255,290,32,14,145,205,265,185];
      const nameHash=[...team.textContent].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
      const hue=hues[nameHash%hues.length];
      monogram.style.setProperty('--shua-league-hue',String(hue));
      identity.prepend(monogram);
      trigger.prepend(identity);
      const result=document.createElement('span');result.className='shua-league-record';
      const record=leagueRecord(myTeams._cards?.[i]);
      const finish=trigger.querySelector('.myteams-finish')?.textContent?.trim();
      result.textContent=record||finish?.replace(/^🏆\s*/u,'')||(myTeams._cards?.[i]?.year||2026);
      result.title=record?'Win–loss record':finish?'Historical finish':'Season';
      trigger.append(result,icon('chevron'));
      trigger.dataset.shuaListReady='1';
    });
  }
  if(myTeams){
    const leagueGrid=myTeams.querySelector('.myteams-grid');
    if(leagueGrid)new MutationObserver(decorateLeagues).observe(leagueGrid,{childList:true});
    decorateLeagues();
    // Every section calls the year switch a Season selector, with no behavior change.
    const yearLabel=myTeams.querySelector('.myteams-header-right label');
    if(yearLabel?.firstChild?.nodeType===Node.TEXT_NODE)yearLabel.firstChild.textContent='Season ';
  }

  // 7. Match portrait/name/team/position hierarchy in roster, waivers, Stock.
  //    The detail affordance is distinct from the existing player-card action.
  let rowSequence=0;
  function makeDetail(row,values){
    if(row.dataset.shuaRowReady==='1')return;
    row.dataset.shuaRowReady='1';
    row.classList.add('shua-uniform-player-row');
    const id='shua-row-detail-'+(++rowSequence);
    const action=document.createElement('button');action.className='shua-row-detail-toggle';
    action.type='button';action.setAttribute('aria-expanded','false');
    action.setAttribute('aria-controls',id);
    action.setAttribute('aria-label','Show player details');
    action.append(icon('chevron'));
    const detail=document.createElement('div');detail.className='shua-player-row-detail';
    detail.id=id;detail.hidden=true;
    for(const [heading,value] of values){
      if(!String(value??'').trim())continue;
      const field=document.createElement('span');
      const name=document.createElement('small');name.textContent=heading;
      const content=document.createElement('strong');content.textContent=String(value);
      field.append(name,content);detail.append(field);
    }
    if(!detail.children.length)return;
    row.append(action);row.insertAdjacentElement('afterend',detail);
  }
  function decorateRoster(){
    if(!myTeams||!isClean())return;
    myTeams.querySelectorAll('.myteams-roster-row:not([data-shua-row-ready])').forEach(row=>{
      // The lineup slot at left already identifies the player's position.
      // Do not repeat it beneath the name or for players on the bench.
      row.dataset.shuaRowReady='1';
      row.classList.add('shua-uniform-player-row');
    });
    myTeams.querySelectorAll('.myteams-wire-line:not(.is-heading):not([data-shua-row-ready])').forEach(row=>{
      // Waiver status, projection and position are visible at a glance.
      row.dataset.shuaRowReady='1';
      row.classList.add('shua-uniform-player-row');
    });
  }
  const stock=document.getElementById('shuaStock');
  function decorateStock(){
    if(!stock||!isClean())return;
    stock.querySelectorAll('.stock-row:not([data-shua-row-ready])').forEach(row=>{
      const name=row.querySelector('.stock-name');
      const pos=row.closest('.stock-group')?.querySelector('.stock-group-head h3')?.textContent||'';
      const sub=name?.querySelector('.stock-meta');
      if(sub&&!sub.querySelector('.shua-row-pos')){
        const badge=document.createElement('span');badge.className='shua-row-pos';badge.textContent=pos;
        sub.append(badge);
      }
      const leagues=row.querySelector('.stock-person')?.getAttribute('title')||'';
      // League-level ownership is extra information, unlike visible row stats.
      makeDetail(row,[['Listed in leagues',leagues||'Not listed in the draft snapshot']]);
    });
  }
  function toggleDetails(event){
    const action=event.target.closest?.('.shua-row-detail-toggle');
    if(!action)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const content=document.getElementById(action.getAttribute('aria-controls'));
    if(!content)return;
    content.hidden=!content.hidden;
    action.setAttribute('aria-expanded',String(!content.hidden));
    action.setAttribute('aria-label',content.hidden?'Show player details':'Hide player details');
  }
  if(myTeams){
    myTeams.addEventListener('click',toggleDetails,true);
    new MutationObserver(()=>requestAnimationFrame(decorateRoster)).observe(myTeams,{childList:true,subtree:true});
    decorateRoster();
  }
  if(stock){
    stock.addEventListener('click',toggleDetails,true);
    new MutationObserver(()=>requestAnimationFrame(decorateStock)).observe(stock,{childList:true,subtree:true});
    decorateStock();
  }

  // 9. Standard list portraits and a real, team-colored initials fallback for
  // images that are missing, 404 or hidden by the older inline onerror handler.
  const teamTones={ARI:'#97233f',ATL:'#a71930',BAL:'#241773',BUF:'#00338d',CAR:'#0085ca',CHI:'#0b162a',CIN:'#fb4f14',CLE:'#ff3c00',DAL:'#003594',DEN:'#fb4f14',DET:'#0076b6',GB:'#203731',HOU:'#03202f',IND:'#002c5f',JAX:'#006778',KC:'#e31837',LAC:'#0080c6',LAR:'#003594',LV:'#5e6670',MIA:'#008e97',MIN:'#4f2683',NE:'#002244',NO:'#a08a58',NYG:'#0b2265',NYJ:'#125740',PHI:'#004c54',PIT:'#ffb612',SEA:'#002244',SF:'#aa0000',TB:'#d50a0a',TEN:'#0c2340',WAS:'#5a1414'};
  function initials(name){const parts=String(name||'').trim().split(/\s+/).filter(Boolean);return (parts.length>1?parts[0][0]+parts.at(-1)[0]:(parts[0]||'?').slice(0,2)).toUpperCase();}
  function safeTeam(t){return String(t||'').trim().toUpperCase().replace(/[^A-Z]/g,'');}
  function portrait(img,name,team){
    if(!img||img.dataset.shuaPortrait==='1')return;
    img.dataset.shuaPortrait='1';img.classList.add('shua-uniform-portrait');
    const tone=teamTones[safeTeam(team)]||'#2d6685';
    img.style.setProperty('--shua-team-tone',tone);
    const replacement=document.createElement('span');
    replacement.className='shua-avatar-initials';replacement.textContent=initials(name);
    replacement.style.setProperty('--shua-team-tone',tone);
    replacement.hidden=true;replacement.setAttribute('role','img');
    replacement.setAttribute('aria-label',name+' portrait unavailable');
    img.insertAdjacentElement('afterend',replacement);
    const fail=()=>{img.style.display='none';replacement.hidden=false;};
    img.addEventListener('error',fail);
    // Some provider placeholders resolve as transparent 1x1 images rather
    // than a network error. Show initials for those too.
    img.addEventListener('load',()=>{if(img.naturalWidth<=2||img.naturalHeight<=2)fail();});
    if(img.complete&&(img.naturalWidth<=2||img.naturalHeight<=2))fail();
  }
  function decoratePortraits(){
    if(!isClean())return;
    myTeams?.querySelectorAll('.myteams-player-open > img:not([data-shua-portrait])').forEach(img=>{
      const row=img.closest('[data-myteams-player]');
      const name=row?.dataset.myteamsPlayer||img.closest('button')?.querySelector('b')?.textContent||'Player';
      const team=row?.dataset.myteamsPlayerTeam||img.closest('button')?.dataset.myteamsPlayerTeam||'';
      portrait(img,name,team);
    });
    stock?.querySelectorAll('.stock-person .stock-face:not([data-shua-portrait])').forEach(img=>{
      const row=img.closest('.stock-row'),person=row?.querySelector('.stock-person');
      if(person?.dataset.stockPos==='D/ST')return;
      portrait(img,row?.querySelector('.stock-name')?.firstChild?.textContent||'Player',row?.querySelector('.stock-meta')?.textContent?.trim());
    });
    document.querySelectorAll('#shuaAnalyticsSection .st-person img.st-face:not([data-shua-portrait])').forEach(img=>{
      const person=img.closest('.st-person'),name=person?.querySelector('strong')?.textContent||'Player';
      const team=person?.querySelector('small')?.textContent?.trim()?.split(/\s+/)[0]||'';
      portrait(img,name,team);
    });
  }

  // Dashboard controls already identify active filters. Avoid repeating them
  // as a separate "Showing" summary above every Analytics chart.
  let analytics=document.getElementById('shuaAnalyticsSection');
  function watchAnalytics(){
    analytics=document.getElementById('shuaAnalyticsSection');
    if(!analytics||analytics.dataset.shuaThirdObserved==='1')return false;
    analytics.dataset.shuaThirdObserved='1';
    let pending=false;
    const update=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;decoratePortraits();});};
    new MutationObserver(update).observe(analytics,{subtree:true,childList:true});
    update();return true;
  }
  if(!watchAnalytics()){
    const main=document.querySelector('main');
    if(main){const watcher=new MutationObserver(()=>{if(watchAnalytics())watcher.disconnect();});watcher.observe(main,{childList:true});}
  }
  decoratePortraits();
  for(const root of [myTeams,stock])if(root)new MutationObserver(()=>requestAnimationFrame(decoratePortraits)).observe(root,{childList:true,subtree:true});
  // Reapply without altering Classic when a saved design query changes.
  window.addEventListener('pageshow',()=>{decorateLeagues();decorateRoster();decorateStock();decoratePortraits();});
})();
