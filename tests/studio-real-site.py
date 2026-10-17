"""Browser smoke tests of the actual checked-out website and source-attributed data."""
import functools, http.server, json, pathlib, threading, time
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/studio-verification';OUT.mkdir(parents=True,exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
manifest=json.loads((ROOT/'analytics/manifest.json').read_text())
year=2026 if '2026' in manifest['datasets'] else 2025
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
   for view in ['matchup','trends','opportunity','rankings','consistency','teams','injury','schedule','startsit','weekly']:
    page.locator('[data-st-view="'+view+'"]').click()
    if view=='rankings':page.wait_for_selector('#stRankBody .st-chart',timeout=20000)
    page.wait_for_timeout(300)
    assert page.locator('#stContent .st-panel').count()>0,(engine,width,view,'missing panels')
    assert not page.locator('#stContent').inner_text().startswith('This dashboard could not render'),(view,page.locator('#stContent').inner_text())
    sizes=page.evaluate('({width:innerWidth,document:document.documentElement.scrollWidth})')
    assert sizes['document']<=width+2,(engine,view,sizes)
    result['views'].append({'view':view,'panels':page.locator('#stContent .st-panel').count(),'documentWidth':sizes['document']})
    if view in ['trends','opportunity','injury','schedule','weekly']:
     page.screenshot(path=str(OUT/f'{engine}-{width}-{view}.png'),full_page=True)
   page.locator('[data-st-view="trends"]').click()
   page.locator('.st-chart-hit').first.focus();assert page.locator('.st-tooltip:not([hidden])').count()
   page.locator('.st-legend-btn').first.click();assert page.locator('.st-legend-btn').first.get_attribute('aria-pressed')=='false'
   page.locator('[data-st-view="weekly"]').click()
   page.locator('[data-st-open]').first.click()
   if page.locator('#modal.open').count():
    page.locator('#shuaPlayerInsights summary').click();page.wait_for_selector('#shuaPlayerInsights .st-svg',timeout=25000)
    
    closers=page.locator('#modal button:visible').evaluate_all("els=>els.map(e=>({id:e.id,text:e.textContent,aria:e.getAttribute('aria-label'),cls:e.className}))");print('VISIBLE PROFILE CONTROLS',json.dumps(closers),flush=True)
    close=page.locator('#modal button:visible').filter(has_text='×')
    if close.count():close.first.click()
    else:page.keyboard.press('Escape')
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
   # Fail on studio runtime errors, and retain unrelated legacy errors for inspection.
   assert not [e for e in errors if 'ShuaStudio' in e or 'stContent' in e],errors
   report['browsers'].append(result);context.close()
  browser.close()
server.shutdown()
(OUT/'report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
print('PASS: actual-site Chromium and WebKit renders at phone + desktop sizes. WebKit is not physical iPhone Safari chrome.')
