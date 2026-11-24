/* Final FLEX ranking-mode guard: FLEX = RB + WR + TE and always exposes ROS / Draft / Dynasty. */
(()=>{
'use strict';
const nav=document.querySelector('.positions');
const toggle=document.getElementById('positionToggle');
if(!nav||!toggle)return;

function isFlex(){
  try{return typeof position!=='undefined'&&position==='FLEX';}catch(_){return nav.querySelector('[data-pos="FLEX"]')?.classList.contains('active');}
}
function isRankingContext(){
  return !document.body.classList.contains('utility-tab-mode') &&
    !document.body.classList.contains('stats-mode') &&
    !document.getElementById('tradeSection')?.hidden===false ? true : true;
}
function sync(){
  const flex=isFlex();
  if(flex && !document.body.classList.contains('utility-tab-mode') && !document.body.classList.contains('stats-mode')){
    toggle.hidden=false;
    toggle.style.removeProperty('display');
    const draft=toggle.querySelector('[data-posview="PRESEASON"]');
    if(draft)draft.textContent='Draft';
    const ros=toggle.querySelector('[data-posview="ROS"]');
    if(ros)ros.textContent='ROS';
    const dynasty=toggle.querySelector('[data-posview="DYNASTY"]');
    if(dynasty)dynasty.textContent='Dynasty';
  }
}
nav.addEventListener('click',e=>{
  if(!e.target.closest('[data-pos="FLEX"]'))return;
  requestAnimationFrame(()=>{sync();requestAnimationFrame(sync);});
},true);
toggle.addEventListener('click',()=>requestAnimationFrame(sync),true);
new MutationObserver(()=>requestAnimationFrame(sync)).observe(toggle,{attributes:true,attributeFilter:['hidden','style'],childList:true});
new MutationObserver(()=>requestAnimationFrame(sync)).observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('pageshow',sync);
sync();
})();