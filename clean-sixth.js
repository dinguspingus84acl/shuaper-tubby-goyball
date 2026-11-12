/* Keep the existing ranking, navigation and analytics handlers intact. */
(()=>{
 'use strict';
 const clean=()=>document.body.classList.contains('shua-clean');
 const heading=document.querySelector('main>.head');
 const headingTitle=heading?.querySelector(':scope>div:first-child');
 const overall=document.getElementById('overallToggle');
 const positionToggle=document.getElementById('positionToggle');
 const draftButton=positionToggle?.querySelector('[data-posview="PRESEASON"]');
 if(draftButton)draftButton.textContent='Draft';

 // Move the REAL toggle, so its existing event listeners and state continue
 // to work. Restore its original position if the saved classic theme is used.
 function alignRankHeading(){
   if(!heading||!headingTitle||!positionToggle||!overall)return;
   if(clean()){
     // Keep ROS / Draft on a second line directly underneath the rank title.
     if(positionToggle.parentElement!==headingTitle)headingTitle.append(positionToggle);
   }else if(heading.contains(positionToggle)){
     overall.after(positionToggle);
   }
 }

 // The schedule is rendered asynchronously, and the first week in the table
 // is always the current week. A user-selected sort column takes precedence.
 let observedAnalytics=null;
 function highlightScheduleWeek(){
   if(!clean())return;
   const analytics=document.getElementById('shuaAnalyticsSection');
   if(!analytics||analytics.dataset.activeView!=='schedule')return;
   const table=analytics.querySelector('.st-schedule-heatmap-panel .st-heat-table');
   if(!table)return;
   const headers=[...table.querySelectorAll('thead tr>th')];
   const active=table.querySelector('thead .st-week-sort.active');
   const index=active?.closest('th')?.cellIndex??1;
   if(table.dataset.sixthWeekColumn===String(index))return;
   table.querySelectorAll('.shua-sixth-week-focus').forEach(cell=>cell.classList.remove('shua-sixth-week-focus'));
   headers[index]?.classList.add('shua-sixth-week-focus');
   table.querySelectorAll('tbody tr').forEach(row=>row.children[index]?.classList.add('shua-sixth-week-focus'));
   table.dataset.sixthWeekColumn=String(index);
 }

 let queued=false;
 function requestUpdate(){
   if(queued)return;
   queued=true;
   requestAnimationFrame(()=>{queued=false;alignRankHeading();highlightScheduleWeek();});
 }
 function watchAnalytics(){
   const node=document.getElementById('shuaAnalyticsSection');
   if(!node||node===observedAnalytics)return;
   observedAnalytics=node;
   new MutationObserver(requestUpdate).observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['data-active-view']});
   requestUpdate();
 }
 const main=document.querySelector('main');
 if(main)new MutationObserver(watchAnalytics).observe(main,{childList:true});
 new MutationObserver(requestUpdate).observe(document.body,{attributes:true,attributeFilter:['class']});
 alignRankHeading();
 watchAnalytics();
 requestUpdate();
})();
