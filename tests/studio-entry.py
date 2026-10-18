"""Regression checks for real Studio routes, chart interactions and interrupted loads."""
import functools, http.server, json, os, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/studio-verification';OUT.mkdir(parents=True,exist_ok=True)
VIEWS=['matchup','trends','opportunity','consistency','teams','injury','schedule','startsit','weekly']
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=None;BASE=os.getenv('STUDIO_BASE_URL')
if not BASE:
 server=http.server.ThreadingHTTPServer(('127.0.0.1',8766),functools.partial(Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start();BASE='http://127.0.0.1:8766/'
BASE=BASE.rstrip('/')+'/'
report={'base':BASE,'source':'real repository datasets, not synthetic chart values','checks':[]}
try:
 with sync_playwright() as pw:
  for engine in os.getenv('STUDIO_ENGINES','chromium,webkit').split(','):
   opts={'headless':True}
   if engine=='chromium' and os.getenv('CHROMIUM_PATH'):opts.update(executable_path=os.environ['CHROMIUM_PATH'],args=['--no-sandbox'])
   browser=getattr(pw,engine).launch(**opts)
   for width,height in [(390,844),(1440,1000)]:
    ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=width<700,has_touch=width<700)
    if os.getenv('STUDIO_OFFLINE'):ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort())
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'#analytics/trends',wait_until='domcontentloaded')
    page.wait_for_selector('#shuaAnalyticsSection[data-ready="true"]',timeout=60000)
    assert page.locator('#stDashboard').count()==0
    assert page.locator('.st-navigation [data-st-view]').count()==9
    assert page.locator('#stContent .st-chart').count()>=2
    for view in VIEWS:
     page.locator('.st-navigation [data-st-view="'+view+'"]').click()
     assert page.locator('#stContent .st-panel').count()>0,view
     assert not page.locator('#stContent').inner_text().startswith('This dashboard could not render'),view
     assert page.locator('.st-navigation [data-st-view="'+view+'"]').get_attribute('aria-selected')=='true'
     if view=='schedule':
      page.wait_for_selector('#stScheduleRows tr',timeout=45000)
      assert page.locator('#stScheduleRows tr').count()==36
      assert page.locator('#stSeason').count()==0
      assert page.locator('[data-st-schedule-pos="ALL"]').count()==0
      assert page.locator('#stScheduleRows .st-schedule-rank').count()==0
      assert page.locator('#stScheduleRows .st-schedule-person-button').count()==36
      assert page.locator('#stRange').count()==0
     assert page.url.endswith('#analytics/'+view),page.url
     assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),view
     if view in ['trends','opportunity','injury','schedule','weekly']:page.screenshot(path=str(OUT/f'release-{engine}-{width}-{view}.png'),full_page=True)
    # The Schedule tab is permanently 2026, even when another analytics tab uses an archive.
    page.locator('[data-st-view="trends"]').click()
    page.select_option('#stSeason','2025')
    page.wait_for_function("window.ShuaStudio?.UI?.dataset?.year===2025",timeout=30000)
    page.locator('[data-st-view="schedule"]').click()
    page.wait_for_function("window.ShuaStudio?.UI?.dataset?.year===2026",timeout=30000)
    assert page.locator('#stSeason').count()==0,'Schedule should not offer prior seasons'
    assert '2026' in page.locator('#stWorkspace .st-heading').inner_text()
    page.wait_for_selector('#stScheduleRows tr',timeout=45000)
    assert page.locator('#stContent .st-heat-table').count()==1
    page.locator('[data-st-view="trends"]').click()
    page.wait_for_function("window.ShuaStudio?.UI?.dataset?.year===2025",timeout=30000)
    assert page.locator('#stSeason').input_value()=='2025','Other tabs must retain their season'
    page.select_option('#stSeason','2026')
    page.wait_for_function("window.ShuaStudio?.UI?.dataset?.year===2026",timeout=30000)
    count=page.locator('#stContent .st-chart').count()
    page.locator('#stContent [data-st-expand]').first.click();page.wait_for_selector('#stChartDialog[open]')
    assert page.locator('#stChartDialog svg.st-svg').count()>0
    page.screenshot(path=str(OUT/f'release-{engine}-{width}-expanded-trend.png'))
    page.locator('#stChartDialog .st-chart-hit').first.focus()
    assert page.locator('#stChartDialog .st-tooltip:not([hidden])').count()==1
    page.locator('#stChartDialog [data-st-close-chart]').click()
    assert page.locator('#stContent .st-chart').count()==count
    assert page.locator('#stChartDialog[open]').count()==0
    page.reload(wait_until='domcontentloaded');page.wait_for_selector('#shuaAnalyticsSection[data-ready="true"]',timeout=60000)
    assert page.locator('.st-navigation [data-st-view="trends"]').get_attribute('aria-selected')=='true'
    page.locator('.positions [data-pos="QB"]').evaluate('(b)=>b.click()')
    assert not page.locator('#shuaAnalyticsSection').is_visible()
    assert '#analytics/' not in page.url
    page.evaluate("location.hash='analytics/consistency'");page.wait_for_selector('#shuaAnalyticsSection[data-ready="true"]')
    assert page.locator('.st-navigation [data-st-view="consistency"]').get_attribute('aria-selected')=='true'
    assert not errors,errors
    report['checks'].append({'browser':engine,'width':width,'dashboards':9,'deepLinks':True,'expandedCharts':True,'pageErrors':errors});ctx.close()
   ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);failures={'count':0}
   def network(r):
    url=r.request.url
    if 'analytics/charts.js?' in url and failures['count']==0:failures['count']+=1;return r.abort()
    if os.getenv('STUDIO_OFFLINE') and not url.startswith(BASE):return r.abort()
    return r.continue_()
   ctx.route('**/*',network);page=ctx.new_page();page.goto(BASE+'#analytics/trends',wait_until='domcontentloaded')
   try:
    page.get_by_role('button',name='Retry loading charts',exact=True).wait_for(state='visible',timeout=30000)
    page.screenshot(path=str(OUT/f'release-{engine}-failed-file-recovery.png'))
    page.get_by_role('button',name='Retry loading charts',exact=True).click()
   except Exception:
    page.screenshot(path=str(OUT/f'release-{engine}-recovery-failure.png'))
    (OUT/f'{engine}-recovery-failure.html').write_text(page.content())
    raise
   page.wait_for_selector('#shuaAnalyticsSection[data-ready="true"]',timeout=60000)
   assert page.locator('#shuaAnalyticsSection').count()==1
   assert page.locator('#stContent .st-chart').count()>=2
   assert failures['count']==1
   report['checks'].append({'browser':engine,'interruptedAssetRetry':'PASS'});ctx.close();browser.close()
finally:
 if server:server.shutdown()
 (OUT/'entry-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2));print('PASS: dashboards, direct links, selectors, expanded charts, return navigation, interrupted-file recovery.')
