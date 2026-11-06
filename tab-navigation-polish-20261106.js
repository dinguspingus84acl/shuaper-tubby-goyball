/* On touch devices, a deliberate horizontal page swipe changes visible tabs.
   Vertical scrolling, charts, tables, player swipes and input gestures retain
   their existing native behavior. */
(() => {
 'use strict';
 const nav=document.getElementById('shuaCleanNav');
 if(!nav)return;

 function leaveOpenDetail(){
  if(document.getElementById('modal')?.classList.contains('open')){
   document.getElementById('close')?.click();
  }
  window.ShuaPlayerSearch?.close?.();
  document.querySelectorAll('dialog[open]').forEach(dialog=>{
   try{dialog.close();}catch(_e){}
  });
 }

 // The selected tab takes priority over the player card or another overlay.
 // The listener runs before the existing navigation handler.
 nav.addEventListener('click',event=>{
  if(event.target.closest('[data-shua-studio],[data-shua-target]'))leaveOpenDetail();
 },true);

 const selectors='[data-shua-studio],[data-shua-target]';
 const skipTargets='#shuaCleanNav,#modal,dialog,[role="dialog"],input,textarea,select,[contenteditable],.st-chart-scroll,.st-table-wrap,.espn-game-log-table-wrap,.stock-modes,.st-compare-results,.player-swipe-preview,.shua-search-overlay';
 const skipPages=new Set(['SEARCH','MOCK','COMMAND']);
 let started=null;

 function hasHorizontalScroller(element){
  for(let node=element;node&&node!==document.body;node=node.parentElement){
   if(node.scrollWidth<=node.clientWidth+8)continue;
   const overflow=getComputedStyle(node).overflowX;
   if(overflow==='auto'||overflow==='scroll')return true;
  }
  return false;
 }

 function orderedTabs(){
  return [...nav.querySelectorAll('.shua-clean-popup button')].filter(item=>{
   if(!item.matches(selectors))return false;
   return !skipPages.has(item.dataset.shuaTarget);
  });
 }

 function currentTab(tabs){
  const activeStudio=document.body.classList.contains('shua-studio-open')?
   window.ShuaStudio?.UI?.state?.view:null;
  if(activeStudio){
   const found=tabs.find(item=>item.dataset.shuaStudio===activeStudio);
   if(found)return found;
  }
  const activePos=document.querySelector('.positions .pos.active')?.dataset.pos;
  return tabs.find(item=>item.dataset.shuaTarget===activePos)||
   tabs.find(item=>item.classList.contains('is-selected'))||null;
 }

 document.addEventListener('touchstart',event=>{
  started=null;
  if(event.touches.length!==1||!document.body.classList.contains('shua-clean'))return;
  if(event.target.closest?.(skipTargets)||hasHorizontalScroller(event.target))return;
  // Let Safari own its edge-based back/forward gesture.
  const touch=event.touches[0];
  if(touch.clientX<24||touch.clientX>window.innerWidth-24)return;
  started={id:touch.identifier,x:touch.clientX,y:touch.clientY,time:Date.now()};
 },{passive:true});

 document.addEventListener('touchcancel',()=>{started=null;},{passive:true});
 document.addEventListener('touchend',event=>{
  const gesture=started;
  started=null;
  if(!gesture)return;
  const end=[...event.changedTouches].find(t=>t.identifier===gesture.id);
  if(!end)return;
  const dx=end.clientX-gesture.x,dy=end.clientY-gesture.y;
  if(Math.abs(dx)<72||Math.abs(dx)<Math.abs(dy)*1.55||Date.now()-gesture.time>1100)return;
  if(document.getElementById('modal')?.classList.contains('open'))return;
  const tabs=orderedTabs(),current=currentTab(tabs),index=tabs.indexOf(current);
  if(index<0)return;
  const next=tabs[index+(dx<0?1:-1)];
  if(!next)return;
  event.preventDefault();
  next.click();
  window.scrollTo({top:0,behavior:'instant'});
 },{passive:false});
})();
