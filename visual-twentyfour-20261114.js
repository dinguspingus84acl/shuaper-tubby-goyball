/* UI enhancements only. No ESPN data, rankings, trade math or Stock changes. */
(() => {
  'use strict';
  let queued = false;

  const statGroups = [
    ['Fantasy Points', ['points', 'average']],
    ['Passing', ['passYds', 'passTD', 'completions', 'passAtt']],
    ['Rushing', ['rushAtt', 'rushYds', 'rushTD']],
    ['Receiving', ['targets', 'receptions', 'recYds', 'recTD']]
  ];

  function groupStatsSelect() {
    const select = document.getElementById('espnColumnStatSelect');
    if (!select || !select.querySelector(':scope > option')) return;
    const value = select.value;
    const options = new Map(Array.from(select.options).map(option => [option.value, option]));
    const grouped = document.createDocumentFragment();
    for (const [label, keys] of statGroups) {
      const present = keys.filter(key => options.has(key));
      if (!present.length) continue;
      const optgroup = document.createElement('optgroup');
      optgroup.label = label;
      for (const key of present) {
        optgroup.appendChild(options.get(key));
        options.delete(key);
      }
      grouped.appendChild(optgroup);
    }
    if (options.size) {
      const other = document.createElement('optgroup');
      other.label = 'Other';
      for (const option of options.values()) other.appendChild(option);
      grouped.appendChild(other);
    }
    select.replaceChildren(grouped);
    select.value = value;
  }

  function recordBars() {
    document.querySelectorAll('#shuaMyTeams .myteams-standings-line:not(.is-heading)').forEach(row => {
      const cell = row.children[2];
      if (!cell || cell.querySelector('.shua-v24-record-bar')) return;
      const match = (cell.textContent || '').trim().match(/^(\d+)\s*[–-]\s*(\d+)(?:\s*[–-]\s*(\d+))?$/);
      if (!match) return;
      const wins = Number(match[1]);
      const losses = Number(match[2]);
      const ties = Number(match[3] || 0);
      const games = wins + losses + ties;
      if (!games) return;
      const bar = document.createElement('span');
      bar.className = 'shua-v24-record-bar';
      bar.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('i');
      fill.style.width = `${Math.max(0, Math.min(100, ((wins + ties / 2) / games) * 100)).toFixed(1)}%`;
      bar.appendChild(fill);
      cell.appendChild(bar);
    });
  }

  function comparableValue(text) {
    const s = String(text || '').trim();
    if (!/^[+\-]?[\d,]+(?:\.\d+)?%?$/.test(s)) return null;
    const n = Number(s.replace(/[,%]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function usageHeat() {
    const section = document.querySelector('#shuaAnalyticsSection[data-active-view="usage"]');
    const table = section?.querySelector('.st-usage-table table:not([data-shua-v24-heat-ready])');
    if (!table) return;
    table.dataset.shuaV24HeatReady = '1';
    const rows = Array.from(table.tBodies[0]?.rows || []);
    if (rows.length < 5) return;
    const fields = Array.from(table.tHead?.rows[0]?.cells || []).slice(1);
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]?.dataset.stUsageField;
      if (!field || field === 'espnPositionRank') continue;
      const numeric = rows.map(row => ({cell:row.cells[i + 1],value:comparableValue(row.cells[i + 1]?.textContent)}))
        .filter(item => item.cell && item.value !== null);
      if (numeric.length < 5) continue;
      const low = Math.min(...numeric.map(item => item.value));
      const high = Math.max(...numeric.map(item => item.value));
      if (high <= low) continue;
      for (const item of numeric) {
        item.cell.classList.add('shua-v24-heat');
        const intensity = .035 + .11 * ((item.value - low) / (high - low));
        item.cell.style.setProperty('--shua-v24-heat-strength', intensity.toFixed(3));
      }
    }
  }

  function tradeLabels() {
    const section = document.getElementById('tradeSection');
    if (!section) return;
    const heads = section.querySelectorAll('.trade-sides .trade-side-head h3');
    if (heads[0] && heads[0].textContent !== 'Your Side') heads[0].textContent = 'Your Side';
    if (heads[1] && heads[1].textContent !== 'Their Side') heads[1].textContent = 'Their Side';
    const compare = section.querySelectorAll('.trade-comparison-labels > span');
    for (const [i, label] of ['Your Side ', 'Their Side '].entries()) {
      const node = compare[i]?.firstChild;
      if (node?.nodeType === Node.TEXT_NODE && node.textContent !== label) node.textContent = label;
    }
  }

  function decorate() {
    queued = false;
    groupStatsSelect();
    recordBars();
    usageHeat();
    tradeLabels();
  }

  function schedule() {
    if (queued) return;
    queued = true;
    window.setTimeout(decorate, 70);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once:true});
  else schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {subtree:true, childList:true});
})();
