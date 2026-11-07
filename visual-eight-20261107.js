/* Unavailable statistics are always visually distinct from measured zeroes.
   Only exact placeholder text is styled; source values are never changed. */
(()=>{
  'use strict';
  const rootIds=['shuaAnalyticsSection','espnLiveSection','modal','shuaMyTeams','tradeSection'];
  const targets=[
    '.st-data td','.st-metric b','.st-rank-row > b','.st-heat-cell small',
    '.st-usage-table td','.st-table-wrap td',
    '.espn-live-row .espn-points','.espn-live-row .espn-selected-stat',
    '.player-history-finish','.player-history-games','.player-history-ppg',
    '.player-history-points','.player-history-detail-stat b',
    '.myteams-roster-row > strong','.myteams-score-current strong',
    '.myteams-score-projected b','.trade-why-total b'
  ].join(',');
  const missing=/^(?:—|–|--|n\/?a|not available)$/i;
  let scheduled=false;
  function update(){
    scheduled=false;
    rootIds.forEach(id=>{
      const root=document.getElementById(id);
      if(!root)return;
      root.querySelectorAll(targets).forEach(element=>{
        const value=element.textContent.trim();
        element.classList.toggle('shua-unavailable',missing.test(value));
      });
    });
  }
  function requestUpdate(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(update);
  }
  const observer=new MutationObserver(requestUpdate);
  rootIds.forEach(id=>{
    const root=document.getElementById(id);
    if(root)observer.observe(root,{childList:true,characterData:true,subtree:true});
  });
  requestUpdate();
})();
