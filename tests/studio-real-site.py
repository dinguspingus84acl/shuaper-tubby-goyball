"""Regression tests of the actual website and source-attributed datasets, not mockups."""
import functools, http.server, json, pathlib, threading
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/studio-verification';OUT.mkdir(parents=True,exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
manifest=json.loads((ROOT/'analytics/manifest.json').read_text())
year=max(map(int,manifest['datasets']))
report={'year':year,'source':'actual repository + prepared source-attributed datasets','browsers':[]}
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  browser=getattr(pw,engine).launch(headless=True)
  for width,height in [(1440,1000),(390,844)]:
   context=browser.new_context(viewport={'width':width,'height':height},is_mobile=width<700,has_touch=width<700,device_scale_factor=1)
   context.add_init_script("localStorage.setItem('shuaViewMode',"+json.dumps('phone' if width<700 else 'desktop')+");localStorage.setItem('shuaPageStateV2',JSON.stringify({section:'ANALYTICS'}));localStorage.setItem('shuaStudioStateV1',JSON.stringify({year:"+str(year)+",view:'weekly'}));")
   page=context.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto('http://127.0.0.1:8765/',wait_until='domcontentloaded',timeout=90000)
   page.wait_for_selector('#shuaAnalyticsSection[data-ready="true"]',timeout=90000)
   result={'engine':engine,'viewport':width,'views':[]}
   for view in ['matchup','trends','opportunity','consistency','teams','injury','schedule','startsit','weekly']:
    page.locator('[data-st-view="'+view+'"]').click()
    if view=='injury':
     assert page.locator('#stInjuryList [data-st-injury]').count()>0,'No injured offensive players listed'
     assert 'Who benefits most?' in page.locator('#stContent').inner_text()
     assert page.locator('#stContent .st-chart').count()>=2,'Injury impact chart missing'
     page.select_option('#stInjuryPos','WR')
     assert page.locator('#stInjuryList [data-st-injury]').count()>0
     page.select_option('#stInjuryPos','ALL')
    if view=='schedule':
     page.wait_for_selector('#stScheduleRows tr',timeout=45000)
     assert page.locator('#stSeason').count()==0,'Schedule should remain 2026 only'
     assert page.locator('[data-st-schedule-pos="ALL"]').count()==0,'All filter must be removed'
     assert page.locator('#stScheduleRows tr').count()==36,'QB tab should include all ROS QBs'
     assert page.locator('#stScheduleSearch').get_attribute('placeholder')=='Search'
     assert page.locator('.st-schedule-tools .st-label').inner_text()=='Search'
     assert page.locator('#stScheduleRows .st-schedule-rank').count()==36,'Number circles should replace text ROS ranks'
     assert page.locator('#stScheduleRows .st-schedule-avatar').count()==36,'Circular faces should be present'
     assert page.locator('#stScheduleRows .st-schedule-person-info').first.inner_text().find('ROS')==-1
     page.locator('#stScheduleSearch').fill('Josh Allen')
     assert page.locator('#stScheduleRows tr:visible').count()==1
     page.locator('#stScheduleSearch').fill('')
     for pos,total in [('WR',130),('TE',53),('RB',110),('DST',32),('QB',36)]:
      page.locator('[data-st-schedule-pos="'+pos+'"]').click()
      assert page.locator('#stScheduleRows tr').count()==total,(pos,'missing ROS or defense entries')
     assert page.locator('#stScheduleRows .st-schedule-face').count()>0,'Player portraits missing'
    page.wait_for_timeout(300)
    assert page.locator('#stContent .st-panel').count()>0,(engine,width,view,'missing panels')
    assert not page.locator('#stContent').inner_text().startswith('This dashboard could not render'),(view,page.locator('#stContent').inner_text())
    sizes=page.evaluate('({width:innerWidth,document:document.documentElement.scrollWidth})')
    assert sizes['document']<=width+2,(engine,view,sizes)
    result['views'].append({'view':view,'panels':page.locator('#stContent .st-panel').count(),'documentWidth':sizes['document']})
    if view in ['trends','opportunity','injury','schedule','weekly']:
     page.screenshot(path=str(OUT/f'{engine}-{width}-{view}.png'),full_page=True)
   # Clicking Schedule from a player card focuses that player in the heatmap.
   page.locator('[data-st-view="schedule"]').click()
   page.wait_for_selector('#stScheduleRows [data-st-open="joshallen"]',timeout=45000)
   page.locator('[data-st-schedule-pos="QB"]').click()
   page.locator('#stScheduleRows [data-st-open="joshallen"]').first.click()
   page.wait_for_selector('#modal.open #sosStat[role="button"]',timeout=20000)
   assert page.locator('#unifiedScheduleLink').count()==0,'Old Schedule shortcut should be removed'
   page.locator('#sosStat').click()
   page.wait_for_selector('#stScheduleRows tr.st-schedule-highlight',timeout=45000)
   assert page.locator('#stScheduleRows tr.st-schedule-highlight').first.get_attribute('data-st-schedule-key')=='joshallen'
   assert page.locator('#modal.open').count()==0
   assert page.locator('[data-st-schedule-pos="QB"]').get_attribute('aria-pressed')=='true'
   page.locator('[data-st-view="trends"]').click()
   page.locator('[data-st-pos="WR"]').click()
   options=page.locator('#stPlayer option').evaluate_all('(es)=>es.map(e=>e.value)')
   if len(options)>1:
    page.select_option('#stPlayer',options[1]);assert page.locator('#stPlayer').input_value()==options[1]
   assert page.locator('#stContent .st-chart').count()>=1
   page.select_option('#stWeek','8');assert page.locator('#stWeek').input_value()=='8'
   page.locator('[data-st-view="schedule"]').click();page.select_option('#stPlayoffs','playoffs')
   assert page.locator('#stPlayoffs').input_value()=='playoffs'
   assert page.locator('#stContent').inner_text().find('15')>=0
   page.locator('[data-st-view="trends"]').click()
   page.locator('.st-chart-hit').first.focus();assert page.locator('.st-tooltip:not([hidden])').count()
   page.locator('.st-legend-btn').first.click();assert page.locator('.st-legend-btn').first.get_attribute('aria-pressed')=='false'
   page.locator('[data-st-view="weekly"]').click()
   page.locator('[data-st-open]').first.click()
   if page.locator('#modal.open').count():
    page.locator('#shuaPlayerInsights summary').click();page.wait_for_selector('#shuaPlayerInsights .st-svg',timeout=25000)
    page.locator('#stReturnToAnalytics').click()
    assert not page.locator('#modal.open').count(),'Profile did not close'
   for tab in ['QB','RB','WR','TE','DEPTH','ESPNLIVE','COMPARE','TRADE']:
    selector='.positions [data-pos="'+tab+'"]'
    if page.locator(selector).count():
     page.locator(selector).evaluate('(b)=>b.click()');page.wait_for_timeout(150)
     assert not page.locator('#shuaAnalyticsSection').is_visible(),(tab,'analytics stayed visible')
     page.locator('#studioNav').evaluate('(b)=>b.click()');page.wait_for_selector('#shuaAnalyticsSection[data-ready="true"]')
   if width<700 and page.locator('#phoneMenuButton').count():
    page.locator('#phoneMenuButton').click();page.wait_for_selector('#phoneMenuItems button[data-target="ANALYTICS"]');page.locator('#phoneMenuItems button[data-target="ANALYTICS"]').click()
    assert page.locator('#shuaAnalyticsSection').is_visible()
   result['pageErrors']=errors
   assert not errors,errors
   report['browsers'].append(result)
   (OUT/'report.json').write_text(json.dumps(report,indent=2))
   context.close()
  browser.close()
server.shutdown()
print(json.dumps(report,indent=2))
print('PASS: actual-site Chromium and WebKit at phone + desktop sizes. WebKit does not reproduce physical iPhone Safari browser chrome.')
