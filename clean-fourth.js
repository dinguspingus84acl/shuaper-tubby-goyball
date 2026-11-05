/* Fourth UI cleanup: keep live roster data and verified statuses intact. */
(()=>{
  'use strict';

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
