/* Entry point: versioned Studio assets. Existing site navigation is retained. */
(function(){
'use strict';
if(window.__shuaStudioLoading)return;
window.__shuaStudioLoading=true;
const version='20261017-studio-v1',base=new URL('.',document.currentScript.src),nav=document.querySelector('.positions');
let button=nav?.querySelector('[data-pos="ANALYTICS"]');
if(nav&&!button){button=document.createElement('button');button.className='pos';button.dataset.pos='ANALYTICS';button.id='studioNav';button.type='button';button.textContent='Analytics';nav.append(button);}
if(button)button.onclick=()=>{button.dataset.pending='1';button.textContent='Loading analytics…';};
const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('analytics/studio.css?v='+version,base).href;style.id='shuaStudioStyles';document.head.append(style);
const load=path=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL(path+'?v='+version,base).href;script.onload=resolve;script.onerror=()=>reject(new Error('Could not load '+path));document.body.append(script);});
(async()=>{try{for(const path of ['analytics/core.js','analytics/data.js','analytics/charts.js','analytics/ui.js'])await load(path);if(button)button.textContent='Analytics';}catch(e){window.__shuaStudioLoading=false;console.error('Analytics Studio',e);if(button){button.textContent='Retry analytics';button.onclick=()=>location.reload();}}})();
})();
