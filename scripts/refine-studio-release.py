"""Apply the issues found by the real browser regressions, preserving their assertions."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'analytics/charts.js';s=p.read_text()
if 'function closeChart()' not in s:
    old="dialog.querySelector('[data-st-close-chart]').onclick=()=>dialog.close();dialog.addEventListener('close',restoreChart);"
    new="dialog.querySelector('[data-st-close-chart]').onclick=closeChart;dialog.addEventListener('close',()=>{if(!dialog.open)restoreChart();});dialog.addEventListener('cancel',e=>{e.preventDefault();closeChart();});"
    assert old in s,'Close event marker changed'
    s=s.replace(old,new,1)
    s=s.replace("if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();", "if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeChart();",1)
    s=s.replace('function expandChart(trigger){',"function closeChart(){restoreChart();if(dialog?.open)dialog.close();}\nfunction expandChart(trigger){",1)
    s=s.replace('reset(){if(dialog?.open){dialog.close();restoreChart();}registry.clear();}', 'reset(){closeChart();registry.clear();}',1)
    p.write_text(s)
p=ROOT/'analytics-dashboard.js';s=p.read_text()
old="      (document.querySelector('main') || document.body).prepend(boot);"
if old in s:
    s=s.replace(old,"""      // The home screen intentionally hides main; recovery must remain reachable.
      // Inline bootstrap presentation also works when the stylesheet itself failed.
      Object.assign(boot.style, {
        position: 'fixed', zIndex: '105', top: '50%', left: '16px', right: '16px',
        transform: 'translateY(-50%)', margin: '0 auto', maxWidth: '520px',
        maxHeight: 'calc(100dvh - 120px)', overflow: 'auto', padding: '22px',
        background: '#0b2236', color: '#eefaff', border: '1px solid #285d79',
        borderRadius: '14px', boxShadow: '0 18px 65px #0009'
      });
      document.body.append(boot);""",1)
    old="      retry.onclick = () => load().catch(() => {}); boot.append(retry);"
    new="""      Object.assign(retry.style, {minHeight:'44px', padding:'9px 14px', cursor:'pointer',
        background:'#24efa0', color:'#05271b', border:'0', borderRadius:'8px', fontWeight:'800'});
      retry.onclick = () => load().catch(() => {}); boot.append(retry);
      const dismiss = document.createElement('button'); dismiss.type = 'button';
      dismiss.textContent = 'Dismiss';
      Object.assign(dismiss.style, {minHeight:'44px', marginLeft:'12px', padding:'9px',
        background:'transparent', color:'#c1d8e8', border:'0', cursor:'pointer'});
      dismiss.onclick = () => { pending = false; if (button) delete button.dataset.pending; boot.hidden = true; };
      boot.append(dismiss);"""
    assert old in s
    s=s.replace(old,new,1);p.write_text(s)
p=ROOT/'tests/studio-entry.py';s=p.read_text()
needle="    assert page.locator('#stChartDialog svg.st-svg').count()>0\n"
if 'expanded-trend.png' not in s:
    assert needle in s
    s=s.replace(needle,needle+"    page.screenshot(path=str(OUT/f'release-{engine}-{width}-expanded-trend.png'))\n",1)
needle="   page.get_by_role('button',name='Retry loading charts',exact=True).click(timeout=30000)"
if 'failed-file-recovery.png' not in s:
    assert needle in s
    s=s.replace(needle,"""   try:
    page.get_by_role('button',name='Retry loading charts',exact=True).wait_for(state='visible',timeout=30000)
    page.screenshot(path=str(OUT/f'release-{engine}-failed-file-recovery.png'))
    page.get_by_role('button',name='Retry loading charts',exact=True).click()
   except Exception:
    page.screenshot(path=str(OUT/f'release-{engine}-recovery-failure.png'))
    (OUT/f'{engine}-recovery-failure.html').write_text(page.content())
    raise""",1)
p.write_text(s)
print('Charts restore synchronously; failed-file recovery is visible even while Home hides main.')
