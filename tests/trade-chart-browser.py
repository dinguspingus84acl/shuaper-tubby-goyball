#!/usr/bin/env python3
"""End-to-end test for the trade chart against the actual local website."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
URL='http://127.0.0.1:%d/'%server.server_address[1]
OUT=ROOT/'tests/trade-chart-verification'
OUT.mkdir(parents=True,exist_ok=True)

def check(browser,engine,mobile):
    context=browser.new_context(viewport={'width':390 if mobile else 1440,
                                            'height':844 if mobile else 900},
                                device_scale_factor=1,is_mobile=mobile,has_touch=mobile)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(URL,wait_until='domcontentloaded')
    page.locator('.positions [data-pos="TRADE"]').wait_for(state='attached',timeout=45000)
    if mobile:
        # Use the actual phone hamburger menu rather than an invisible desktop tab.
        page.locator('#phoneMenuButton').click()
        page.locator('#phoneMenuItems [data-target="TRADE"]').click()
    else:
        page.locator('.positions [data-pos="TRADE"]').click()
    page.locator('[data-tcc-view="chart"]').click()
    paper=page.locator('#tradeChartContent .tcc-paper')
    paper.wait_for(timeout=45000)
    assert page.locator('.tcc-headers .tcc-hposition').count()==4
    assert page.locator('.tcc-player').count()>=200
    assert page.locator('.tcc-player').first.get_attribute('data-tcc-player')=='jahmyrgibbs'
    gibbs=page.locator('.tcc-player[data-tcc-player="jahmyrgibbs"]').first
    assert gibbs.locator('.tcc-amount').inner_text()=='150.0'
    assert page.locator('#tradeChartSourceInfo').inner_text().find('Big Board overall ordering')>=0
    assert page.locator('.tcc-player[data-tcc-player="jamarrchase"]').count()==1
    for label in ['RUNNING BACKS','WIDE RECEIVERS','TIGHT ENDS','QUARTERBACKS']:
        assert page.locator('.tcc-hposition').filter(has_text=label).count()==1,label
    page.locator('#tradeChartSearch').fill('JaMarr Chase')
    assert page.locator('.tcc-player.tcc-match').count()==1
    page.locator('#tradeChartSearch').fill('')
    page.locator('[data-tcc-pos="RB"]').click()
    assert page.locator('.tcc-headers .tcc-hposition').count()==1
    assert page.locator('.tcc-table.tcc-one').count()==1
    page.locator('[data-tcc-pos="ALL"]').click()
    assert page.locator('.tcc-headers .tcc-hposition').count()==4
    if mobile:
        dims=page.locator('#tradeChartScroll').evaluate('(el)=>({scroll:el.scrollWidth,client:el.clientWidth})')
        assert dims['scroll']>dims['client'], 'Mobile four-lane chart must scroll horizontally'
        assert page.locator('.tcc-axis').first.evaluate('(el)=>getComputedStyle(el).position')=='sticky'
    page.locator('[data-trade-mode="ROS"]').click()
    assert 'REST OF SEASON' in paper.inner_text()
    assert page.locator('.tcc-player').count()>=200
    assert page.locator('#tradeChartSourceInfo').inner_text().find('ROS positional ordering')>=0
    page.locator('[data-trade-mode="PRESEASON"]').click()
    assert gibbs.locator('.tcc-amount').inner_text()=='150.0'
    page.locator('[data-tcc-view="calculator"]').click()
    assert page.locator('#tradeChartPanel').is_hidden()
    assert page.locator('.trade-sides').is_visible()
    page.locator('[data-tcc-view="chart"]').click()
    assert page.locator('.tcc-paper').is_visible()
    # Screenshots show the surrounding site and visible chart. Small viewport crop.
    page.screenshot(path=str(OUT/(engine+('-phone' if mobile else '-desktop')+'.png')))
    assert not errors, 'Browser errors: '+repr(errors)
    print('PASS',engine,'phone' if mobile else 'desktop','Big Board ranks, values, position lanes, search, ROS, calculator view',flush=True)
    context.close()

try:
    with sync_playwright() as pw:
        for name in ('chromium','webkit'):
            browser=getattr(pw,name).launch(headless=True)
            try:
                for mobile in (False,True):
                    check(browser,name,mobile)
            finally:
                browser.close()
finally:
    server.shutdown()
