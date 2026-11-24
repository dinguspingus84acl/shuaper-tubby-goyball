/* FLEX ranking modes: FLEX = RB + WR + TE, never QB. */
(()=>{
'use strict';
const nav=document.querySelector('.positions');
const toggle=document.getElementById('positionToggle');
const head=document.querySelector('main>.head');
if(!nav||!toggle||!head)return;

const style=document.createElement('style');
style.id='flexRankModesStyles';
style.textContent=`
body:has(.positions .pos.active[data-pos="FLEX"]) main>.head{
  display:flex!important;
  align-items:flex-start!important;
  justify-content:flex-start!important;
  flex-wrap:wrap!important;
  gap:8px!important;
  margin-bottom:10px!important;
}
body:has(.positions .pos.active[data-pos="FLEX"]) main>.head>div:first-child{
  display:flex!important;
  flex-direction:column!important;
  align-items:flex-start!important;
  width:100%!important;
  min-width:0!important;
}
body:has(.positions .pos.active[data-pos="FLEX"]) #positionToggle:not([hidden]){
  display:flex!important;
  align-items:center!important;
  flex-wrap:nowrap!important;
  gap:5px!important;
  width:auto!important;
  margin:8px 0 0!important;
}
body.phone-mode:has(.positions .pos.active[data-pos="FLEX"]) main>.head{
  display:flex!important;
}
`;
document.head.append(style);

function flexActive(){
  try{return typeof position!=='undefined'&&position==='FLEX';}
  catch(_){return nav.querySelector('[data-pos="FLEX"]')?.classList.contains('active')===true;}
}
function sync(){
  if(!flexActive())return;
  document.body.classList.remove('utility-tab-mode','stats-mode');
  head.style.removeProperty('display');
  toggle.hidden=false;
  toggle.style.removeProperty('display');

  const ros=toggle.querySelector('[data-posview="ROS"]');
  const draft=toggle.querySelector('[data-posview="PRESEASON"]');
  const dynasty=toggle.querySelector('[data-posview="DYNASTY"]');
  if(ros)ros.textContent='ROS';
  if(draft)draft.textContent='Draft';
  if(dynasty)dynasty.textContent='Dynasty';

  // Dynasty-specific secondary controls remain governed by dynasty-reference.js.
  requestAnimationFrame(()=>{
    toggle.hidden=false;
    if(head.getClientRects().length===0)head.style.setProperty('display','flex','important');
    if(toggle.getClientRects().length===0)toggle.style.setProperty('display','flex','important');
  });
}

nav.addEventListener('click',e=>{
  if(!e.target.closest('[data-pos="FLEX"]'))return;
  requestAnimationFrame(()=>{sync();setTimeout(sync,0);});
},true);

toggle.addEventListener('click',()=>requestAnimationFrame(sync),true);
new MutationObserver(()=>requestAnimationFrame(sync)).observe(toggle,{attributes:true,attributeFilter:['hidden','style'],childList:true});
new MutationObserver(()=>requestAnimationFrame(sync)).observe(head,{attributes:true,attributeFilter:['hidden','style','class']});
new MutationObserver(()=>requestAnimationFrame(sync)).observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('pageshow',sync);
window.addEventListener('load',sync);
sync();
})();