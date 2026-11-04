/* Fourth UI cleanup: keep real search actions and live roster data intact. */
(()=>{
  'use strict';

  // One visible search field at a time. On Analytics views with their own
  // player search, put the EXISTING all-players launcher inside that field.
  // It retains its original click listener and historical-player coverage.
  const globalBar=document.getElementById('shuaGlobalSearchBar');
  const studio=document.getElementById('shuaAnalyticsSection');
  const launch=globalBar?.querySelector('.shua-global-search-launch');
  let queued=false;

  function unifySearch(){
    queued=false;
    if(!globalBar||!studio||!launch)return;
    const local=!studio.hidden&&studio.querySelector('.st-global-search:not([hidden]) .st-global-search-inputrow');
    const embed=Boolean(local&&document.body.classList.contains('shua-clean')&&document.body.classList.contains('shua-studio-open'));
    const parent=embed?local:globalBar;
    if(launch.parentElement!==parent)parent.appendChild(launch);
    if(document.body.classList.contains('shua-fourth-search-unified')!==embed){
      document.body.classList.toggle('shua-fourth-search-unified',embed);
    }
    if(embed){
      launch.setAttribute('aria-label','Search all NFL players, including historical players');
      launch.title='Search all current and historical NFL players';
      local.parentElement?.setAttribute('role','search');
    }else{
      launch.setAttribute('aria-label','Search NFL players');
      launch.removeAttribute('title');
    }
  }
  function requestSearchSync(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(unifySearch);
  }
  if(globalBar&&studio&&launch){
    new MutationObserver(requestSearchSync).observe(studio,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    new MutationObserver(requestSearchSync).observe(document.body,{attributes:true,attributeFilter:['class']});
    requestSearchSync();
  }

  // Free-agent labels are routine information, so text suffices. Keep the
  // distinct waiver, injury and current-week bye indicators as designed.
  const teams=document.getElementById('shuaMyTeams');
  function tidyFreeAgents(){
    teams?.querySelectorAll('.myteams-acquire:not(.shua-fourth-status-checked)').forEach(label=>{
      label.classList.add('shua-fourth-status-checked');
      if(label.textContent.trim()==='FA')label.classList.add('shua-fourth-free-agent');
    });
  }
  if(teams){
    new MutationObserver(tidyFreeAgents).observe(teams,{childList:true,subtree:true});
    tidyFreeAgents();
  }
})();
