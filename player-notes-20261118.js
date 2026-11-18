/* Complete player notes on hover, keyboard focus, or tap, outside table clipping. */
(()=>{
 'use strict';
 const rows=document.getElementById('rows');if(!rows)return;
 const tooltip=document.createElement('aside');tooltip.id='shuaPlayerNoteTooltip';tooltip.role='tooltip';tooltip.hidden=true;
 const heading=document.createElement('strong'),copy=document.createElement('p');tooltip.append(heading,copy);document.body.append(tooltip);
 let anchor=null,pinned=false,lastPointer='';
 function hide(){
  tooltip.hidden=true;if(anchor)anchor.setAttribute('aria-expanded','false');anchor=null;pinned=false;
 }
 function position(){
  if(!anchor||tooltip.hidden)return;
  const rect=anchor.getBoundingClientRect(),box=tooltip.getBoundingClientRect(),pad=10;
  const v=window.visualViewport,left=v?.offsetLeft||0,top=v?.offsetTop||0,w=v?.width||innerWidth,h=v?.height||innerHeight;
  tooltip.style.left=Math.round(Math.max(left+pad,Math.min(rect.right-box.width,left+w-box.width-pad)))+'px';
  const down=rect.bottom+7,up=rect.top-box.height-7;
  tooltip.style.top=Math.round(Math.max(top+pad,Math.min(down+box.height<=top+h-pad?down:up,top+h-box.height-pad)))+'px';
 }
 function show(button,pin=false){
  const cell=button.closest('td.notes'),text=cell?.dataset.shuaNote||cell?.querySelector('.shua-note-excerpt')?.textContent;
  if(!text)return;hide();anchor=button;pinned=pin;
  const name=button.closest('tr')?.querySelector('.photo-cell b,.rank-player-copy b,.tagged-player-copy b')?.textContent?.trim();
  heading.textContent=name?name+' — full notes':'Full player notes';copy.textContent=text;
  button.setAttribute('aria-describedby',tooltip.id);button.setAttribute('aria-expanded','true');tooltip.hidden=false;position();
 }
 function decorate(){
  rows.querySelectorAll('.shua-note-toggle:not([data-note-hover-ready])').forEach(button=>{
   button.dataset.noteHoverReady='1';button.classList.add('shua-note-info');button.textContent='i';
   button.setAttribute('aria-label','View full player notes');button.setAttribute('aria-expanded','false');
   button.setAttribute('aria-controls',tooltip.id);button.removeAttribute('title');
  });
 }
 rows.addEventListener('pointerdown',e=>{lastPointer=e.pointerType;},true);
 rows.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  const cell=e.target.closest('td.notes'),button=cell?.querySelector('.shua-note-toggle'),rect=button?.getBoundingClientRect();
  const over=rect&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
  if(over){if(anchor!==button||tooltip.hidden)show(button);}else if(!pinned&&anchor&&document.activeElement!==anchor)hide();
 });
 rows.addEventListener('pointerover',e=>{const button=e.target.closest('.shua-note-toggle');if(button&&e.pointerType!=='touch')show(button);});
 rows.addEventListener('pointerout',e=>{if(anchor&&!pinned&&e.target.closest('.shua-note-toggle')===anchor&&!anchor.contains(e.relatedTarget)&&!tooltip.contains(e.relatedTarget))hide();});
 tooltip.addEventListener('pointerleave',()=>{if(!pinned)hide();});
 rows.addEventListener('focusin',e=>{const button=e.target.closest('.shua-note-toggle');if(button)show(button);});
 rows.addEventListener('focusout',e=>{if(!pinned&&e.target===anchor)hide();});
 document.addEventListener('click',e=>{
  const button=e.target.closest('.shua-note-toggle');
  if(button){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(anchor===button&&pinned)hide();else show(button,lastPointer==='touch'||lastPointer==='pen');return;}
  if(!tooltip.contains(e.target))hide();
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 window.addEventListener('resize',hide,{passive:true});window.addEventListener('scroll',hide,{passive:true});
 new MutationObserver(()=>{if(anchor&&!anchor.isConnected)hide();decorate();}).observe(rows,{childList:true,subtree:true});
 decorate();
})();
