/* Layout updates follow the visual viewport, including browser zoom. */
(()=>{
 'use strict';
 const nav=document.getElementById('shuaCleanNav');
 let queued=false;
 function set(el,name,value){if(el.style.getPropertyValue(name)!==value)el.style.setProperty(name,value);}
 function layoutMenus(){
  queued=false;
  const viewport=window.visualViewport;
  const width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
  const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,pad=8;
  nav?.querySelectorAll('.shua-clean-popup:not([hidden])').forEach(menu=>{
   const trigger=menu.parentElement.querySelector('.shua-clean-trigger');if(!trigger)return;
   const box=trigger.getBoundingClientRect();
   const above=Math.max(0,box.top-top-pad*2),below=Math.max(0,top+height-box.bottom-pad*2);
   const bottomNav=box.top>top+height/2;
   const upwards=bottomNav?above>=below:below<100&&above>below;
   const available=Math.max(40,upwards?above:below),count=menu.querySelectorAll('button').length||1;
   const row=Math.max(24,Math.min(40,(available-16)/count));
   const h=Math.min(available,count*row+16),w=Math.min(280,width-pad*2);
   set(menu,'--menu-left',Math.round(Math.max(left+pad,Math.min(box.left,left+width-w-pad)))+'px');
   set(menu,'--menu-top',Math.round(upwards?Math.max(top+pad,box.top-h-pad):box.bottom+pad)+'px');
   set(menu,'--menu-width',Math.round(w)+'px');set(menu,'--menu-height',Math.floor(available)+'px');
   set(menu,'--menu-font',Math.max(11,Math.min(14,row*.36))+'px');set(menu,'--menu-row',row+'px');
  });
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(layoutMenus);}}
 if(nav)new MutationObserver(schedule).observe(nav,{attributes:true,subtree:true,attributeFilter:['hidden','class'],childList:true});
 window.addEventListener('resize',schedule,{passive:true});window.addEventListener('scroll',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
 // Return to the exact player opened before using their schedule shortcut.
 function returnControl(){
  const section=document.getElementById('shuaAnalyticsSection');if(!section)return;
  const context=window.shuaScheduleProfileReturn;
  let back=section.querySelector('#shuaScheduleProfileBack');
  if(!context||section.hidden||section.dataset.activeView!=='schedule'){back?.remove();return;}
  if(!back){back=document.createElement('button');back.id='shuaScheduleProfileBack';back.type='button';section.prepend(back);
   back.addEventListener('click',()=>{const saved=window.shuaScheduleProfileReturn;if(saved)window.openUnifiedPlayerProfileByName?.(saved.name,{name:saved.name,team:saved.team,position:saved.position,seasonYear:Number(saved.year)||2026});});
  }
  const label='Return to '+context.name+' profile';if(back.textContent!==label)back.textContent=label;
 }
 let returnQueued=false;
 new MutationObserver(()=>{if(!returnQueued){returnQueued=true;requestAnimationFrame(()=>{returnQueued=false;returnControl();});}}).observe(document.querySelector('main'),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-active-view']});
 document.addEventListener('click',e=>{
  const link=e.target.closest('#shuaCleanNav [data-shua-target],#shuaCleanNav [data-shua-studio]');
  if(link&&link.dataset.shuaStudio!=='schedule'){window.shuaScheduleProfileReturn=null;returnControl();}
 },true);
 window.ShuaViewportMenus={layout:layoutMenus};
 schedule();returnControl();
})();
