/* Fifth visual pass. Keep ranking data, profile controls and game rows intact. */
(()=>{
  'use strict';
  const clean=()=>document.body.classList.contains('shua-clean');
  const rows=document.getElementById('rows');
  const header=document.querySelector('#tableCard thead th:nth-child(5)');

  function revealMediumNotes(){
    if(!clean())return;
    // The previous layer already provides the full-note toggle for long notes.
    // Give 35–69 character notes the same accessible control when needed.
    rows?.querySelectorAll('td.notes:not([data-shua-note])').forEach(cell=>{
      const original=cell.textContent.trim();
      if(original.length<35||original.length>=70)return;
      cell.dataset.shuaNote=original;
      const excerpt=document.createElement('span');
      excerpt.className='shua-note-excerpt';excerpt.textContent=original;
      const button=document.createElement('button');
      button.type='button';button.className='shua-note-toggle';
      button.textContent='Read full note';button.setAttribute('aria-expanded','false');
      button.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        const expanded=cell.classList.toggle('is-expanded');
        button.textContent=expanded?'Show less':'Read full note';
        button.setAttribute('aria-expanded',String(expanded));
      });
      cell.replaceChildren(excerpt,button);
    });
  }

  // The source's espnAdp field is a preseason positional-rank difference,
  // not an average draft position. Preserve the raw values in data attributes.
  function comparisonColumn(){
    if(!clean())return;
    revealMediumNotes();
    if(header){
      header.textContent='vs ESPN';
      header.title='Your preseason positional rank compared with ESPN preseason positional rank; ↑ means you ranked this player higher.';
    }
    rows?.querySelectorAll('tr').forEach(row=>{
      const cell=row.children[4];
      if(!cell||cell.dataset.fifthEspnFormatted)return;
      const raw=cell.textContent.trim();
      if(!/^[+-]?\d+$/.test(raw))return;
      const gap=Number(raw);
      const badge=document.createElement('span');
      badge.className='shua-fifth-espn-gap '+(gap>0?'is-up':gap<0?'is-down':'is-even');
      badge.textContent=gap>0?'↑ '+gap:gap<0?'↓ '+Math.abs(gap):'= 0';
      badge.title=gap>0?`Your preseason positional rank was ${gap} spot${gap===1?'':'s'} higher than ESPN`:
        gap<0?`Your preseason positional rank was ${Math.abs(gap)} spot${gap===-1?'':'s'} lower than ESPN`:'Same preseason positional rank as ESPN';
      badge.setAttribute('aria-label',badge.title);
      cell.dataset.fifthEspnFormatted='1';
      cell.dataset.fifthEspnOriginal=raw;
      cell.replaceChildren(badge);
    });
  }
  let rankQueued=false;
  function requestRanking(){
    if(rankQueued)return;
    rankQueued=true;
    requestAnimationFrame(()=>{rankQueued=false;comparisonColumn();});
  }
  if(rows)new MutationObserver(requestRanking).observe(rows,{childList:true,subtree:true});
  requestRanking();

  // Put the existing position buttons and existing Week select on one row.
  // Moving the real nodes preserves delegated click/change handlers.
  function arrangeSchedule(){
    const analytics=document.getElementById('shuaAnalyticsSection');
    if(!clean()||analytics?.dataset.activeView!=='schedule')return;
    const host=analytics.querySelector('#stContent');
    const positions=host?.querySelector(':scope > .st-schedule-positions');
    const toolbar=host?.querySelector(':scope > .st-schedule-toolbar');
    const week=toolbar?.querySelector(':scope > .st-schedule-filters');
    if(!positions||!week)return;
    let line=host.querySelector(':scope > .shua-fifth-schedule-line');
    if(!line){
      line=document.createElement('div');
      line.className='shua-fifth-schedule-line';
      host.insertBefore(line,positions);
    }
    line.append(positions,week);
  }

  // The year selector and totals still work, but are presented once beside
  // the Game Log title. Avoid changing any game data or future-week rows.
  const gameLog=document.getElementById('unifiedGameLogPanel');
  function arrangeGameLog(){
    if(!clean()||!gameLog)return;
    const title=gameLog.querySelector(':scope > .espn-game-log-title');
    const controls=gameLog.querySelector(':scope > .espn-game-log-controls');
    if(!title||!controls)return;
    const summary=gameLog.querySelector(':scope > .espn-game-log-summary');
    const yearRow=controls.querySelector(':scope > .espn-game-log-year-row');
    const heading=document.createElement('div');
    heading.className='shua-fifth-gamelog-heading';
    title.querySelector('strong')?.replaceChildren(document.createTextNode('Game Log'));
    title.querySelector('span')?.remove();
    summary?.querySelector('strong')?.remove();
    if(yearRow){
      yearRow.querySelector('select')?.setAttribute('aria-label','Game log season');
      yearRow.querySelector('.espn-game-log-year-label')?.remove();
    }
    heading.append(title);
    if(summary)heading.append(summary);
    if(yearRow)heading.append(yearRow);
    gameLog.prepend(heading);
  }

  let uiQueued=false;
  function requestUi(){
    if(uiQueued)return;
    uiQueued=true;
    requestAnimationFrame(()=>{uiQueued=false;arrangeSchedule();arrangeGameLog();});
  }
  // Analytics mounts lazily the first time its navigation tab opens.
  // Bind to that actual section when it appears, rather than retaining null.
  let observedAnalytics=null;
  function watchAnalytics(){
    const node=document.getElementById('shuaAnalyticsSection');
    if(!node||node===observedAnalytics)return;
    observedAnalytics=node;
    new MutationObserver(requestUi).observe(node,{childList:true,subtree:true});
    requestUi();
  }
  const main=document.querySelector('main');
  if(main)new MutationObserver(watchAnalytics).observe(main,{childList:true});
  watchAnalytics();
  if(gameLog)new MutationObserver(requestUi).observe(gameLog,{childList:true});
  new MutationObserver(()=>{requestRanking();requestUi();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  requestUi();
})();
