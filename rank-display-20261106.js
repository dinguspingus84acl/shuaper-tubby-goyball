/* Display numeric rank values without a leading #. Retain # on jersey numbers,
   stat labels, and other non-ranking content. No ranking values are changed. */
(()=>{
 'use strict';
 const selector=[
  '#tableCard td.rank',
  '#rankingPlayerNav .ranking-nav-rank',
  '#modal .unified-overview-rank b',
  '#modal .unified-rank-card b',
  '#modal .unified-stat-item b',
  '#modal .stat b',
  '#shuaStock .stock-value',
  '#shuaAnalyticsSection .st-rank-num',
  '#shuaAnalyticsSection .st-big-value',
  '#shuaAnalyticsSection .st-hero-stat strong',
  '#shuaAnalyticsSection .st-timeline b',
  '#shuaAnalyticsSection .st-compare-metric b',
  '#espnLiveSection .espn-rank',
  '#espnLiveSection .espn-pos-rank'
 ].join(',');
 function apply(){
  document.querySelectorAll(selector).forEach(el=>{
   // Only touch rank text, preserving any nested descriptions or controls.
   for(const node of el.childNodes){
    if(node.nodeType===Node.TEXT_NODE&&/^\s*#(?=\d)/.test(node.nodeValue)){
     node.nodeValue=node.nodeValue.replace(/^(\s*)#(?=\d)/,'$1');
    }
   }
  });
 }
 let frame=0;
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;apply()});};
 function init(){
  apply();
  const root=document.body;
  new MutationObserver(records=>{
   if(records.some(record=>record.addedNodes.length||record.removedNodes.length))schedule();
  }).observe(root,{subtree:true,childList:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
