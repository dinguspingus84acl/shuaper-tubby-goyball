from pathlib import Path
import json, re
root=Path(__file__).resolve().parent
def patch(name,old,new):
 p=root/name;s=p.read_text();assert old in s,(name,'missing anchor',old[:80]);p.write_text(s.replace(old,new))
patch('analytics/data.js','players:{limit:700,','players:{')
patch('scripts/prepare-analytics-studio.py',"'players':{'limit':700,","'players':{")
patch('site-enhancements.js',"function updateRankingPlayerNav(){\n  const modal=","function updateRankingPlayerNav(){\n  const currentNav=document.getElementById('rankingPlayerNav');\n  if(currentNav&&!currentNav.querySelector('[data-ranking-nav]'))return;\n  const modal=")
patch('analytics/ui.js',"let resize=0;window.addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>{if(visible&&dataset)render();},220);},{passive:true});","let resize=0,layoutWidth=window.innerWidth;window.addEventListener('resize',()=>{if(window.innerWidth===layoutWidth)return;layoutWidth=window.innerWidth;clearTimeout(resize);resize=setTimeout(()=>{if(visible&&dataset)render();},220);},{passive:true});")
patch('analytics/data.js','S.Data={load,schedule,rankHistory,currentRanks,json,normalise,parseEspn,clear()',"async function preferredYear(){try{const m=await json('analytics/manifest.json',{cache:'no-store'});const ys=Object.keys(m.datasets||{}).map(Number).filter(y=>y<=YEAR);return ys.length?Math.max(...ys):YEAR;}catch(e){return YEAR;}}\nS.Data={load,schedule,rankHistory,currentRanks,json,normalise,parseEspn,preferredYear,clear()")
patch('analytics/ui.js','async function load(){const id=++epoch;',"let firstLoad=true;\nasync function load(){const id=++epoch;if(firstLoad){firstLoad=false;let saved=null;try{saved=JSON.parse(localStorage.getItem('shuaStudioStateV1')||'null');}catch(e){}if(!saved?.year){state.year=await S.Data.preferredYear();if(id!==epoch)return;}}")
p=root/'analytics/ui.js';s=p.read_text();s=s.replace('function rankedRows(',"function chartName(p){const a=String(p.name||'').trim().split(/\\s+/);if(a.length===1)return a[0];const suffix=/^(?:jr\\.?|sr\\.?|ii|iii|iv|v)$/i.test(a.at(-1));const surname=a.slice(suffix?-2:-1).join(' ');return a[0][0]+'. '+surname;}\nfunction rankedRows(")
s=s.replace("p.name.split(' ').at(-1)","chartName(p)").replace("p.name.split(' ').slice(-1).join(' ')","chartName(p)").replace("r.player.name.split(' ').slice(-1).join(' ')","chartName(r.player)")
s=s.replace('<div class="st-score">${E(value(p))}', '<div class="st-score ${String(value(p)).startsWith(\'-\')?\'negative\':\'\'}">${E(value(p))}')
s=s.replace('window.profile(found.id);return;',"window.profile(found.id);document.getElementById('modal').dataset.studioProfile='1';return;")
s=s.replace("if(window.ShuaEspnLive?.openStatsPlayerByName?.(p.name))return;","if(window.ShuaEspnLive?.openStatsPlayerByName?.(p.name)){document.getElementById('modal').dataset.studioProfile='1';return;}");p.write_text(s)
p=root/'player-insights.js';s=p.read_text();s=s.replace("function attach(){frame=0;if(!modal.classList.contains('open'))return;","function attach(){frame=0;if(!modal.classList.contains('open')){document.getElementById('stReturnToAnalytics')?.remove();delete modal.dataset.studioProfile;return;}if(modal.dataset.studioProfile==='1'&&!document.getElementById('stReturnToAnalytics')){const b=document.createElement('button');b.id='stReturnToAnalytics';b.type='button';b.textContent='← Back to Analytics';b.setAttribute('aria-label','Close player profile and return to Analytics');b.onclick=()=>document.getElementById('close')?.click();modal.querySelector('.profile')?.prepend(b);}")
s=s.replace("['class','data-unified-name']","['class','data-unified-name','data-studio-profile']");p.write_text(s)
p=root/'analytics/studio.css';p.write_text(p.read_text()+'''\n#shuaAnalyticsSection .st-score.negative{color:#ff6779;border-color:#fa60764d;background:linear-gradient(130deg,#391827,#211827)}
#stReturnToAnalytics{display:block!important;position:sticky;top:0;z-index:45;min-height:42px;margin:6px 8px;padding:8px 14px;background:#082237;border:1px solid #36bce866;color:#e9f8ff;border-radius:10px;font-weight:800;cursor:pointer}
''')
p=root/'index.html';s=p.read_text();s,n=re.subn(r'(site-enhancements\.js)\?v=[^"\s]+',r'\1?v=20261017-profile-nav-guard24',s);assert n==1;p.write_text(s)
for p in (root/'tests').rglob('*.pyc'):p.unlink()
p=root/'tests/studio-real-site.py';s=p.read_text();start=s.index('    closers=');end=s.index("    assert not page.locator('#modal.open').count()",start);s=s[:start]+"    page.locator('#stReturnToAnalytics').click()\n"+s[end:];s=s.replace("assert not [e for e in errors if 'ShuaStudio' in e or 'stContent' in e],errors","assert not errors,errors")
needle="   page.locator('[data-st-view=\"trends\"]').click()"
extra='''   page.locator('[data-st-view="trends"]').click()
   page.locator('[data-st-pos="WR"]').click()
   options=page.locator('#stPlayer option').evaluate_all('(es)=>es.map(e=>e.value)')
   if len(options)>1:page.select_option('#stPlayer',options[1])
   assert page.locator('#stContent .st-chart').count()>=1
   page.select_option('#stWeek','8');assert 'Week 8' in page.locator('#stWeek').inner_text()
   page.locator('[data-st-view="schedule"]').click();page.select_option('#stPlayoffs','playoffs')
   assert page.locator('#stContent').inner_text().find('15')>=0
'''
s=s.replace(needle,extra+needle,1);p.write_text(s)
print('Applied final source contract, profile integration, width-only resize and control tests.',flush=True)
