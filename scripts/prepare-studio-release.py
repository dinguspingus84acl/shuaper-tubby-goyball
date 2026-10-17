"""Prepare the scoped Studio release on the verification branch; never push main."""
from pathlib import Path
import re, shutil
ROOT = Path(__file__).resolve().parents[1]
def update(path, edits):
    p = ROOT / path
    s = p.read_text()
    for old, new in edits:
        if old not in s:
            raise SystemExit('Missing patch target in ' + path + ': ' + old[:90])
        s = s.replace(old, new, 1)
    p.write_text(s)
if "20261017-studio-release2" in (ROOT/'index.html').read_text():
    print('Release already prepared')
    raise SystemExit(0)
shutil.copyfile(ROOT/'.release/loader.js', ROOT/'analytics-dashboard.js')
shutil.copyfile(ROOT/'.release/studio-entry.py', ROOT/'tests/studio-entry.py')
update('analytics/ui.js', [
 ("const main=document.querySelector('main')", "if(S.UI)return;\nconst main=document.querySelector('main')"),
 ("let dataset=null,epoch=0,renderId=0,visible=false,historyData=null,hiddenBefore=new Map();", """let dataset=null,epoch=0,renderId=0,visible=false,historyData=null,hiddenBefore=new Map();
function linkedView(){const m=location.hash.match(/^#analytics\/([a-z]+)$/);return m&&pages.some(p=>p[0]===m[1])?m[1]:null;}
const initialView=linkedView();if(initialView){state.view=initialView;state.week=0;}
function updateLink(){if(!visible)return;try{const u=new URL(location.href);u.hash='analytics/'+state.view;history.replaceState(history.state,'',u);}catch(e){}}
function navigate(view){if(!pages.some(p=>p[0]===view))return;state.view=view;state.outWeeks=null;if(view==='injury')state.injuryInitialized=0;if(dataset){state.week=Math.min(18,['matchup','schedule','startsit'].includes(view)?dataset.latestWeek+1:dataset.latestWeek);}if(visible&&dataset)render();else open();}
"""),
 ('<div class="st-layout"><nav', '''<label class="st-dashboard-picker"><span class="st-label">Dashboard · all 10 charts</span><select id="stDashboard">${pages.map((p,i)=>`<option value="${p[0]}" ${state.view===p[0]?'selected':''}>${String(i+1).padStart(2,'0')} · ${E(p[1])}</option>`).join('')}</select></label><div class="st-layout"><nav'''),
 ("function persist(){try{", "function persist(){updateLink();try{"),
 ("function close(){visible=false;", "function close(){visible=false;try{if(linkedView()){const u=new URL(location.href);u.hash='';history.replaceState(history.state,'',u);}}catch(e){}"),
 ("button.onclick=()=>open();", "button.onclick=()=>open();\nwindow.addEventListener('hashchange',()=>{const v=linkedView();if(v)navigate(v);else if(visible)close();});"),
 ("if(tab){state.view=tab.dataset.stView;state.outWeeks=null;if(state.view==='injury')state.injuryInitialized=0;if(dataset){if(['matchup','schedule','startsit'].includes(state.view))state.week=Math.min(18,dataset.latestWeek+1);else state.week=dataset.latestWeek;}render();return;}", "if(tab){navigate(tab.dataset.stView);return;}"),
 ("const id=e.target.id,v=e.target.value;if(id==='stSeason')", "const id=e.target.id,v=e.target.value;if(id==='stDashboard'){navigate(v);return;}if(id==='stSeason')"),
 ("S.UI={open,close,", "S.UI={open,close,navigate,"),
 ("if(button.dataset.pending==='1'||restored)open();", "if(button.dataset.pending==='1'||restored||initialView)open();")
])
update('player-insights.js', [
 ("if(!window.ShuaStudio?.UI){host.textContent='Analytics Studio is loading. Close and reopen this section in a moment.';return;}try{await window.ShuaStudio.UI.profile(name,host);", "try{if(!window.ShuaStudio?.UI)await window.ShuaStudioLoader?.load();if(!window.ShuaStudio?.UI)throw new Error('Analytics module is unavailable');if(id!==request||details.dataset.name!==name)return;await window.ShuaStudio.UI.profile(name,host);")
])
update('analytics/studio.css', [
 ('grid-template-columns:155px minmax(0,1fr) auto;gap:18px;padding:15px 18px 0;min-height:172px;', 'grid-template-columns:190px minmax(0,1fr) auto;gap:18px;padding:18px 20px 0;min-height:205px;'),
 ('width:170px;height:160px;object-fit:contain;object-position:bottom;', 'width:220px;height:205px;max-width:none;object-fit:contain;object-position:bottom;'),
 ('grid-template-columns:100px minmax(0,1fr);gap:10px;min-height:150px;padding:12px 10px 0', 'grid-template-columns:116px minmax(0,1fr);gap:10px;min-height:184px;padding:12px 10px 0'),
 ('.st-hero-art>.st-face{width:117px;height:131px}', '.st-hero-art>.st-face{width:185px;height:176px;max-width:none}'),
 ('.st-hero-art{position:relative;', '.st-hero-art{overflow:hidden;position:relative;'),
 ('border:1px solid #245274;border-radius:16px;', 'border:1px solid #25688b;border-radius:16px;'),
 ('box-shadow:0 9px 25px #0002;', 'box-shadow:inset 0 1px 0 #70c8ff12,0 10px 32px #0003;')
])
with (ROOT/'analytics/studio.css').open('a') as f:
    f.write((ROOT/'.release/presentation.css').read_text())
update('analytics/charts.js', [
 ("function empty(message=", '''function tools(id,series){return `<div class="st-chart-tools">${legend(id,series)}<button type="button" class="st-expand" data-st-expand aria-label="Expand ${E(registry.get(id)?.title||'chart')}">Expand ↗</button></div>`;}\nfunction empty(message='''),
 ('${legend(id,series)}${svg(id,body,w,h)}', '${tools(id,series)}${svg(id,body,w,h)}'),
 ('${legend(id,series)}<div class="st-chart-scroll">', '${tools(id,series)}<div class="st-chart-scroll">'),
 ('${svg(id,body,440,320)}${legend(id,series)}', '${tools(id,series)}${svg(id,body,440,320)}'),
 ('labels.forEach((label,i)=>{const gap=labels.length>1?', '''if(!invert&&series[0]){const observed=series[0].values.map((v,i)=>({v:N(v),i})).filter(p=>p.v!==null);if(observed.length){const best=observed.reduce((a,b)=>b.v>a.v?b:a),low=observed.reduce((a,b)=>b.v<a.v?b:a);const marks=[best];if(low.i!==best.i&&Math.abs(x(best.i)-x(low.i))>70)marks.push(low);for(const mark of marks){const px=Math.max(L+24,Math.min(w-R-24,x(mark.i))),py=Math.max(T+2,Math.min(h-B-28,y(mark.v)-31)),tone=mark===best?colors[0]:colors[4];body+=`<g data-series-group="0" pointer-events="none"><rect x="${px-24}" y="${py}" width="48" height="23" rx="7" fill="#071d2e" stroke="${tone}" stroke-opacity=".85"/><text x="${px}" y="${py+15}" text-anchor="middle" class="st-point-label">${F(mark.v)}</text></g>`;}}}
 labels.forEach((label,i)=>{const gap=labels.length>1?'''),
 ('function install(){', '''let dialog=null,expanded=null,placeholder=null;
function restoreChart(){if(expanded&&placeholder?.isConnected)placeholder.replaceWith(expanded);expanded=null;placeholder=null;}
function expandChart(trigger){const chart=trigger.closest('.st-chart');if(!chart)return;if(!dialog){dialog=document.createElement('dialog');dialog.className='st-chart-dialog st-profile-insights';dialog.id='stChartDialog';dialog.setAttribute('aria-labelledby','stChartDialogTitle');dialog.innerHTML='<div class="st-chart-dialog-head"><h2 id="stChartDialogTitle"></h2><button type="button" data-st-close-chart>Close chart</button></div><div data-st-chart-host></div>';document.body.append(dialog);dialog.querySelector('[data-st-close-chart]').onclick=()=>dialog.close();dialog.addEventListener('close',restoreChart);dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});}if(expanded)return;const id=chart.querySelector('svg[data-chart]')?.dataset.chart;dialog.querySelector('h2').textContent=registry.get(id)?.title||'Chart';placeholder=document.createElement('span');placeholder.hidden=true;chart.before(placeholder);expanded=chart;dialog.querySelector('[data-st-chart-host]').append(chart);dialog.showModal();}
function install(){'''),
 ("document.addEventListener('click',e=>{const b=e.target.closest('[data-legend]');", "document.addEventListener('click',e=>{const expand=e.target.closest?.('[data-st-expand]');if(expand){expandChart(expand);return;}const b=e.target.closest('[data-legend]');"),
 ('reset(){registry.clear();}', 'reset(){if(dialog?.open){dialog.close();restoreChart();}registry.clear();}')
])
p=ROOT/'index.html';s=p.read_text()
for name in ['analytics-dashboard.js','player-insights.js']:
    s,n=re.subn('('+re.escape(name)+r'\?v=)[^"\s]+',r'\g<1>20261017-studio-release2',s)
    if n!=1:raise SystemExit('Unexpected cache entry count for '+name)
p.write_text(s)
print('Prepared Studio release without touching rankings or mobile viewport CSS.')
