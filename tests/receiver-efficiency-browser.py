#!/usr/bin/env python3
"""Local Chrome smoke test for all-32-team receiver efficiency, including mobile."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT))
server=ThreadingHTTPServer(('127.0.0.1',0),handler)
Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:%d/#analytics/teams'%server.server_address[1]

def check(browser, mobile):
    context=browser.new_context(viewport={'width':390 if mobile else 1440,
                                          'height':844 if mobile else 900},
                                is_mobile=mobile,has_touch=mobile,
                                device_scale_factor=1)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(url,wait_until='domcontentloaded')
    page.locator('#stReceiverEfficiencyMount .re-paper').wait_for(timeout=45000)
    assert page.locator('#stReceiverEfficiencyMount .re-table thead th').count()==9
    assert page.locator('#stReceiverEfficiencyMount .re-info').count()==8
    assert page.locator('#stReceiverEfficiencyMount .re-table tfoot').inner_text().startswith('League Avg')
    assert page.locator('#stTeamMenu').count()==1,'Existing Team Shares selector missing'
    choices=page.locator('#reEfficiencyTeam option').count()
    assert choices==32, 'Expected all 32 teams, got %d'%choices
    page.locator('#reEfficiencyTeam').select_option('CHI')
    rows=page.locator('#stReceiverEfficiencyMount .re-table tbody tr')
    assert rows.count()==5,'Chicago top five missing'
    expected=['Rome Odunze','Colston Loveland','Luther Burden III',
              'Kalif Raymond','Cole Kmet']
    observed=rows.locator('th.re-player strong').all_inner_texts()
    assert observed==expected,(observed,expected)
    for row in rows.all():
        assert row.locator('td.re-cell').count()==8
    page.locator('[data-re-sort="yprr"]').click()
    assert rows.first.locator('th.re-player strong').inner_text()=='Luther Burden III'
    page.locator('#reEfficiencyTeam').select_option('NYJ')
    assert rows.count()>=4,'NYJ WR/TE chart unavailable'
    assert rows.first.locator('th.re-player strong').inner_text()!='Luther Burden III'
    assert page.locator('#stReceiverEfficiencyMount .re-table tfoot td').count()==8
    if mobile:
        scroll=page.locator('.re-table-scroll')
        widths=scroll.evaluate('(el)=>[el.scrollWidth,el.clientWidth]')
        assert widths[0]>widths[1], 'Mobile table must scroll horizontally'
        position=page.locator('th.re-player').first.evaluate('(el)=>getComputedStyle(el).position')
        assert position=='sticky', 'Player names must stay visible while scrolling'
    assert not errors,'Browser errors: '+repr(errors)
    print('PASS', 'mobile' if mobile else 'desktop',
          '32 teams, 8 columns, Bears data, sorting, team selection')
    context.close()

try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
        check(browser,False)
        check(browser,True)
        browser.close()
finally:
    server.shutdown()
