"""Exercise the real site over HTTP in Chromium and WebKit. Not physical iPhone Safari."""
import functools, http.server, json, os, threading, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'; OUT.mkdir(exist_ok=True)
VIEWS=['matchups','trends','opportunities','rankings','consistency','teams','injury','schedule','startsit','weekly']
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'renders':[],'interactions':[],'errors':[],'failures':[]}
def tab(page,key,width):
    if width<700:
        page.locator('#phoneMenuButton').click()
        page.locator('#phoneMenuItems [data-target="'+key+'"]').click()
    else: page.locator('.positions .pos[data-pos="'+key+'"]').click()
def view(page,key,width):
    if width<=650: page.locator('[data-ap-control="view"]').select_option(key)
    else: page.locator('[data-ap-view="'+key+'"]').click()
    page.wait_for_function('(v)=>ShuaAnalytics.state.view===v',arg=key)
    page.wait_for_selector('#apView .ap-panel, #apView .ap-empty')
def inspect(page,engine,width,key):
    text=page.locator('#apView').inner_text()
    assert 'could not render' not in text and 'temporarily unavailable' not in text,text[:500]
    assert len(text)>200,(key,text)
    dims=page.evaluate('({w:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth})')
    overflow=max(dims['doc'],dims['body'])-dims['w']
    assert overflow<=1,(key,dims)
    count=page.locator('#apView svg').count()
    assert count>0,(key,'no chart')
    page.screenshot(path=str(OUT/f'{engine}-{width}-{key}.png'),full_page=True)
    report['renders'].append({'engine':engine,'width':width,'view':key,'svg':count,'overflow':overflow,'characters':len(text)})
with sync_playwright() as pw:
    for engine in ['chromium','webkit']:
        browser=getattr(pw,engine).launch(headless=True)
        for width in [390,1440]:
            page=browser.new_page(viewport={'width':width,'height':900},is_mobile=width<700,has_touch=width<700)
            page.set_default_timeout(20000)
            page.on('pageerror',lambda e:report['errors'].append(str(e)))
            try:
                page.goto('http://127.0.0.1:8765',wait_until='domcontentloaded')
                page.wait_for_function('!!window.ShuaAnalytics',timeout=45000)
                page.wait_for_timeout(1200)
                tab(page,'ANALYTICS',width)
                page.wait_for_selector('#apView .ap-panel',timeout=30000)
                for key in VIEWS:
                    view(page,key,width)
                    page.wait_for_timeout(350)
                    inspect(page,engine,width,key)
                view(page,'trends',width)
                page.locator('[data-ap-control="season"]').select_option('2025')
                page.wait_for_function('ShuaAnalytics.state.season===2025 && !!document.querySelector("#apView svg")')
                assert '2025' in page.locator('.ap-data-chip').inner_text()
                page.locator('[data-ap-position="QB"]').click()
                page.wait_for_timeout(100)
                tip=page.locator('#apView [data-ap-tip]').first
                tip.focus()
                assert page.locator('.ap-tip').is_visible()
                page.keyboard.press('Escape')
                assert not page.locator('.ap-tip').is_visible()
                view(page,'consistency',width)
                assert '15, 20, 25 and 30' in page.locator('#apView').inner_text()
                view(page,'schedule',width)
                page.locator('[data-ap-schedulerange="playoffs"]').click()
                assert page.locator('.ap-heat-row').first.locator('> *').count()==4
                view(page,'rankings',width)
                page.locator('[data-ap-rankmode="position"]').click()
                assert 'your own Big Board' in page.locator('#apView').inner_text()
                view(page,'injury',width)
                week=page.locator('[data-ap-absence]').first
                before=week.get_attribute('aria-pressed'); week.click()
                assert page.locator('[data-ap-absence]').first.get_attribute('aria-pressed')!=before
                view(page,'startsit',width)
                assert page.locator('[data-ap-control^="pick"]').count()==4
                select=page.locator('[data-ap-control="pick3"]')
                select.select_option(index=4)
                assert len(page.locator('#apView').inner_text())>300
                tab(page,'QB',width)
                assert not page.locator('#shuaAnalyticsSection').is_visible()
                assert not page.evaluate('document.body.classList.contains("shua-analytics-open")')
                page.wait_for_selector('#rows tr[data-id]:visible',timeout=45000)
                page.locator('#rows tr[data-id]:visible').first.click()
                page.wait_for_selector('#modal.open')
                page.wait_for_selector('#shuaPlayerInsights')
                page.locator('#shuaPlayerInsights summary').click()
                page.wait_for_selector('#shuaPlayerInsights svg',timeout=30000)
                assert page.locator('.unified-profile-tabs').is_visible()
                page.locator('#close').click()
                for key in ['RB','WR','TE','MYGUYS','DND','DEPTH','MOCK','COMPARE','TRADE','HOME']:
                    if page.locator('.positions .pos[data-pos="'+key+'"]').count():
                        tab(page,key,width)
                        assert not page.evaluate('document.body.classList.contains("shua-analytics-open")'),key
                tab(page,'ANALYTICS',width)
                page.wait_for_selector('#apView svg')
                page.set_viewport_size({'width':320,'height':800})
                page.wait_for_timeout(150)
                inspect(page,engine,320,'compact')
                report['interactions'].append({'engine':engine,'width':width,'status':'passed','tests':['navigation','all-ten-tabs','season','QB-thresholds','tooltip-focus','tooltip-dismiss','playoff-filter','custom-rank-toggle','absence-week-toggle','four-player-selection','profile-accordion','existing-tabs','320px-overflow']})
            except Exception as e:
                report['failures'].append({'engine':engine,'width':width,'error':str(e),'traceback':traceback.format_exc()})
                try: page.screenshot(path=str(OUT/f'{engine}-{width}-failure.png'),full_page=True)
                except Exception: pass
            finally:
                (OUT/'browser-results.json').write_text(json.dumps(report,indent=2))
                page.close()
        browser.close()
server.shutdown()
print(json.dumps(report,indent=2))
if report['failures']: raise SystemExit('Browser regressions detected')
