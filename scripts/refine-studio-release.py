"""Apply the chart-close fix found by the browser regression, preserving the test."""
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
p=ROOT/'tests/studio-entry.py';s=p.read_text()
needle="    assert page.locator('#stChartDialog svg.st-svg').count()>0\n"
if 'expanded-trend.png' not in s:
    assert needle in s
    s=s.replace(needle,needle+"    page.screenshot(path=str(OUT/f'release-{engine}-{width}-expanded-trend.png'))\n",1)
p.write_text(s)
print('Charts now restore synchronously on close, Escape and backdrop; full regression retained.')
