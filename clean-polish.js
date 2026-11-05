/* Additive second-pass interface refinements for the existing Clean layout.
   All original rankings, filters, profiles, data, and Classic backup remain. */
(()=>{
  'use strict';
  const nav=document.getElementById('shuaCleanNav');
  const body=document.body;
  if(!nav||!body)return;
  const activeClean=()=>body.classList.contains('shua-clean');
  const compact=()=>window.matchMedia('(max-width:700px)').matches||body.classList.contains('phone-mode');

  // Navigation stays accessible but takes less room after scrolling.
  function updateScrollClass(){
    body.classList.toggle('shua-polish-scrolled',window.scrollY>85);
  }
  window.addEventListener('scroll',updateScrollClass,{passive:true});
  updateScrollClass();
  function updateResponsiveMode(){
    body.classList.toggle('shua-polish-phone',compact());
  }
  window.addEventListener('resize',updateResponsiveMode,{passive:true});
  new MutationObserver(updateResponsiveMode).observe(body,{attributes:true,attributeFilter:['class']});
  updateResponsiveMode();

  // 3 is style-only: smaller titles and muted secondary descriptions.

  // 5. Board-specific settings can be revealed without stacking two toolbars.
  const teamControls=document.getElementById('teamControls');
  const viewControls=document.getElementById('overallToggle');
  if(teamControls&&viewControls){
    const toggle=document.createElement('button');
    toggle.id='shuaBoardOptions';
    toggle.type='button';
    toggle.setAttribute('aria-controls','teamControls overallToggle');
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='<span>Board Settings</span><small id="shuaBoardSummary"></small><span aria-hidden="true">⌄</span>';
    teamControls.insertAdjacentElement('beforebegin',toggle);
    function updateBoardSummary(){
      const teams=teamControls.querySelector('.team-btn.active')?.dataset.teams||'10';
      const selected=viewControls.querySelector('[data-view].active')?.dataset.view;
      toggle.querySelector('#shuaBoardSummary').textContent=teams+' teams · '+(selected==='LIST'?'List':'Board');
    }
    toggle.addEventListener('click',()=>{
      const opened=body.classList.toggle('shua-board-options-open');
      toggle.setAttribute('aria-expanded',String(opened));
      updateBoardSummary();
    });
    teamControls.addEventListener('click',()=>requestAnimationFrame(updateBoardSummary));
    viewControls.addEventListener('click',()=>requestAnimationFrame(updateBoardSummary));
    updateBoardSummary();
  }

  // 4 and 5 in Analytics: show one primary selector by default on phones and
  // move explanations into actual tap-accessible information disclosures.
  let analytics=document.getElementById('shuaAnalyticsSection');
  const openedFilters=new Map();
  function decorateAnalytics(){
    if(!analytics||!activeClean())return;
    const view=analytics.dataset.activeView||'main';
    analytics.querySelectorAll('.st-controls:not(.shua-filter-controls)').forEach((controls,index)=>{
      const labels=[...controls.children].filter(el=>el.tagName==='LABEL');
      if(labels.length<2||controls.firstElementChild?.tagName!=='LABEL')return;
      controls.classList.add('shua-filter-controls');
      const key=view+':'+index;
      const button=document.createElement('button');
      button.className='shua-filter-toggle';
      button.type='button';
      button.textContent='Filters +'+(labels.length-1);
      const opened=openedFilters.get(key)===true;
      controls.classList.toggle('shua-filters-open',opened);
      button.setAttribute('aria-expanded',String(opened));
      button.setAttribute('aria-label','Show '+(labels.length-1)+' additional chart filters');
      button.addEventListener('click',()=>{
        const isOpen=controls.classList.toggle('shua-filters-open');
        openedFilters.set(key,isOpen);
        button.setAttribute('aria-expanded',String(isOpen));
        button.textContent=isOpen?'Hide filters':'Filters +'+(labels.length-1);
      });
      if(opened)button.textContent='Hide filters';
      controls.insertBefore(button,controls.children[1]||null);
    });
    analytics.querySelectorAll('.st-panel-head:not([data-shua-info])').forEach(header=>{
      header.dataset.shuaInfo='1';
      const desc=header.querySelector(':scope > div > p');
      if(!desc||!desc.textContent.trim())return;
      const disclosure=document.createElement('details');
      disclosure.className='shua-chart-info';
      const summary=document.createElement('summary');
      summary.textContent='i';
      summary.setAttribute('aria-label','About this chart');
      disclosure.append(summary,desc);
      header.append(disclosure);
    });
  }
  function attachAnalytics(){
    analytics=document.getElementById('shuaAnalyticsSection');
    if(!analytics||analytics.dataset.shuaPolishObserved==='1')return false;
    analytics.dataset.shuaPolishObserved='1';
    let frame=null;
    const schedule=()=>{
      if(frame!==null)return;
      frame=requestAnimationFrame(()=>{frame=null;decorateAnalytics();});
    };
    new MutationObserver(schedule).observe(analytics,{childList:true,subtree:true});
    schedule();
    return true;
  }
  if(!attachAnalytics()){
    // The Analytics bundle loads asynchronously after the initial HTML.
    const main=document.querySelector('main');
    if(main){
      const watcher=new MutationObserver(()=>{if(attachAnalytics())watcher.disconnect();});
      watcher.observe(main,{childList:true});
    }
  }

  // 7. Only a path opened from a player card gets a contextual return button.
  const depth=document.getElementById('depthSection');
  if(depth){
    let priorPlayer=null;
    const back=document.createElement('button');
    back.id='depthPlayerBack';
    back.type='button';
    back.hidden=true;
    depth.prepend(back);
    const syncBack=()=>{
      back.hidden=!priorPlayer||depth.hidden;
      if(priorPlayer)back.textContent='← Back to '+priorPlayer.name;
    };
    document.addEventListener('click',event=>{
      const target=event.target;
      if(target.closest?.('#playerDepthChartButton')){
        const modal=document.getElementById('modal');
        const name=modal?.dataset.unifiedName||document.getElementById('pn')?.textContent?.trim();
        const team=document.querySelector('#playerDepthChartButton .player-depth-chart-team')?.textContent?.trim();
        const position=document.querySelector('#featuredPlayerCard .featured-team-meta strong')?.textContent?.trim();
        priorPlayer=name?{name,team:team||'',position:position||''}:null;
        queueMicrotask(syncBack);
      }else if(target.closest?.('#shuaCleanNav [data-shua-target="DEPTH"]')||
        target.closest?.('.positions .pos:not([data-pos="DEPTH"])')){
        // The player shortcut itself clicks the hidden Depth nav item.
        // Only an unrelated navigation should clear its return context.
        priorPlayer=null;syncBack();
      }
    },true);
    back.addEventListener('click',()=>{
      const player=priorPlayer;
      if(!player)return;
      back.hidden=true;
      window.openUnifiedPlayerProfileByName?.(player.name,{
        name:player.name,team:player.team,position:player.position
      });
    });
    new MutationObserver(syncBack).observe(depth,{attributes:true,attributeFilter:['hidden']});
  }

  // 8 is style-only: fixed Game Log rows now have faint week separation.

  // 9. A matchup starts as a compact summary; its exact hourly forecast,
  // weather emojis, and fantasy analysis remain one tap away.
  const weather=document.getElementById('shuaWeatherSection');
  function decorateWeather(){
    if(!weather||!activeClean())return;
    weather.querySelectorAll('.wx-game').forEach(card=>{
      if(card.querySelector('.wx-impact-pending'))return;
      if(card.querySelector('.shua-wx-game-details'))return;
      const preview=card.querySelector(':scope > .wx-hour-preview');
      const analysis=card.querySelector(':scope > .wx-analysis');
      const detailedHours=card.querySelector(':scope > .wx-details');
      if(!preview&&!analysis&&!detailedHours)return;
      const sky=preview?.querySelector('.wx-preview-sky');
      const top=card.querySelector('.wx-game-top');
      if(top&&sky&&sky.textContent.trim()!=='—'&&!top.querySelector('.shua-wx-summary-sky')){
        const icon=document.createElement('span');
        icon.className='shua-wx-summary-sky';
        icon.setAttribute('role','img');
        icon.setAttribute('aria-label',sky.getAttribute('aria-label')||'Weather conditions');
        icon.textContent=sky.textContent;
        top.querySelector('.wx-impact')?.insertAdjacentElement('beforebegin',icon);
      }
      const details=document.createElement('details');
      details.className='shua-wx-game-details';
      const summary=document.createElement('summary');
      summary.textContent='Hourly weather & fantasy analysis';
      details.append(summary);
      for(const part of [preview,analysis,detailedHours])if(part)details.append(part);
      card.insertBefore(details,card.querySelector(':scope > .wx-source-link')||null);
      const matchup=card.querySelector('.wx-matchup');
      if(matchup){
        matchup.tabIndex=0;
        matchup.setAttribute('role','button');
        matchup.setAttribute('aria-label','Expand hourly forecast and game analysis');
        matchup.setAttribute('aria-expanded','false');
        const toggle=()=>{details.open=!details.open;};
        matchup.addEventListener('click',toggle);
        matchup.addEventListener('keydown',event=>{
          if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}
        });
        details.addEventListener('toggle',()=>matchup.setAttribute('aria-expanded',String(details.open)));
      }
    });
  }
  if(weather){
    let frame=null;
    const schedule=()=>{
      if(frame!==null)return;
      frame=requestAnimationFrame(()=>{frame=null;decorateWeather();});
    };
    new MutationObserver(schedule).observe(weather,{childList:true,subtree:true});
    schedule();
  }
  // 6 and 10 are layout-only: standardized leader rows and one-row team tabs.
})();
