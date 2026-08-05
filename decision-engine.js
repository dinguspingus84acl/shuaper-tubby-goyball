(() => {
  const POSITIONS = ['QB','RB','WR','TE'];
  const starterTargets = {QB:1,RB:2,WR:2,TE:1};
  let scheduled = false;

  function safe(fn, fallback) {
    try { return fn(); } catch { return fallback; }
  }

  function getRank(player) {
    return Number(player.overallRank || player.positionRank || 999);
  }

  function getAdpValue(player) {
    const raw = player.additionalStats?.espnAdp;
    if (raw === '' || raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(-20, Math.min(20, n)) : 0;
  }

  function myPlayers() {
    if (!mock?.active) return [];
    return mock.picks.filter(x => x.team === mock.slot).map(x => x.player);
  }

  function rosterCounts(teamNo) {
    const counts = {QB:0,RB:0,WR:0,TE:0};
    mock.picks.filter(x => x.team === teamNo).forEach(x => {
      if (counts[x.player.position] != null) counts[x.player.position]++;
    });
    return counts;
  }

  function needScore(position) {
    const mine = myPlayers();
    const count = mine.filter(x => x.position === position).length;
    const target = starterTargets[position] || 0;
    if (count === 0) return position === 'QB' || position === 'TE' ? 13 : 18;
    if (count < target) return 20;
    if ((position === 'RB' || position === 'WR') && count < target + 2) return 10;
    return 2;
  }

  function availableAt(position) {
    const used = new Set(mock.picks.map(x => x.player.id));
    return pool(position).filter(x => !used.has(x.id));
  }

  function tierDrop(player) {
    const list = availableAt(player.position);
    const idx = list.findIndex(x => x.id === player.id);
    if (idx < 0) return 0;
    const next = list[idx + 1];
    if (!next) return 14;
    return Math.max(0, Math.min(14, getRank(next) - getRank(player)));
  }

  function picksUntilNextTurn() {
    if (!mock?.active) return 0;
    const start = mock.picks.length + 1;
    const limit = mock.teams * 14;
    for (let i = start; i < limit; i++) {
      if (teamAt(i, mock.teams) === mock.slot) return i - mock.picks.length;
    }
    return 0;
  }

  function upcomingTeams() {
    const gap = picksUntilNextTurn();
    const teams = [];
    for (let i = 1; i <= gap; i++) teams.push(teamAt(mock.picks.length + i, mock.teams));
    return [...new Set(teams.filter(t => t !== mock.slot))];
  }

  function opponentDemand(position) {
    return upcomingTeams().reduce((sum, t) => {
      const c = rosterCounts(t);
      const target = starterTargets[position] || 0;
      return sum + (c[position] < target ? 1 : 0);
    }, 0);
  }

  function returnChance(player) {
    const gap = Math.max(1, picksUntilNextTurn());
    const demand = opponentDemand(player.position);
    const rank = getRank(player);
    const urgency = Math.max(0, 60 - rank) / 4 + demand * 8 + tierDrop(player) * 2;
    return Math.max(5, Math.min(95, Math.round(88 - gap * 4 - urgency)));
  }

  function recentRun(position) {
    const recent = mock.picks.slice(-6);
    return recent.filter(x => x.player.position === position).length;
  }

  function scorePlayer(player) {
    const rankValue = Math.max(0, 30 - Math.min(30, (getRank(player) - 1) * .35));
    const need = needScore(player.position);
    const drop = Math.min(20, tierDrop(player) * 1.5);
    const survival = Math.max(0, 15 - returnChance(player) * .15);
    const adp = 4 + getAdpValue(player) * .35;
    const tag = player.additionalStats?.tag === 'draft' ? 5 : player.additionalStats?.tag === 'do-not-draft' ? -12 : 0;
    const run = recentRun(player.position) >= 3 ? 4 : 0;
    return Math.max(0, Math.min(100, Math.round(rankValue + need + drop + survival + adp + tag + run)));
  }

  function reasons(player) {
    const out = [];
    const drop = tierDrop(player);
    const demand = opponentDemand(player.position);
    const chance = returnChance(player);
    const value = getAdpValue(player);
    if (needScore(player.position) >= 18) out.push(`Fills an open ${player.position} starter spot`);
    if (drop >= 6) out.push(`Big ${player.position} tier drop after this player`);
    if (demand >= 3) out.push(`${demand} upcoming teams still need ${player.position}`);
    if (chance <= 35) out.push(`Only ${chance}% chance to make it back`);
    else out.push(`${chance}% estimated chance to return`);
    if (value >= 5) out.push(`${value} spots of value versus ESPN ADP`);
    if (player.additionalStats?.tag === 'draft') out.push('Marked as a draft target');
    if (recentRun(player.position) >= 3) out.push(`${recentRun(player.position)} ${player.position}s taken in the last 6 picks`);
    return out.slice(0,4);
  }

  function recommendations() {
    if (!mock?.active || teamAt(mock.picks.length, mock.teams) !== mock.slot) return [];
    const used = new Set(mock.picks.map(x => x.player.id));
    return pool('ALL')
      .filter(x => !used.has(x.id) && POSITIONS.includes(x.position))
      .map(player => ({player, score: scorePlayer(player), chance: returnChance(player)}))
      .sort((a,b) => b.score - a.score || getRank(a.player) - getRank(b.player))
      .slice(0,3);
  }

  function queueFor(position) {
    return availableAt(position).slice(0,3).map(x => x.name);
  }

  function ensureUI() {
    const section = document.getElementById('mockSection');
    if (!section) return null;
    let panel = document.getElementById('decisionEngine');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'decisionEngine';
      panel.className = 'decision-engine card';
      const layout = section.querySelector('.mock-layout');
      section.insertBefore(panel, layout || section.firstChild);
    }
    return panel;
  }

  function renderEngine() {
    scheduled = false;
    const panel = ensureUI();
    if (!panel) return;
    const mockSection = document.getElementById('mockSection');
    panel.hidden = !mockSection || mockSection.hidden;
    if (panel.hidden) return;

    if (!mock?.active) {
      panel.innerHTML = '<div class="engine-head"><div><small>DRAFT DECISION ENGINE</small><h3>Start a mock draft to see live recommendations</h3></div></div>';
      return;
    }

    const onClock = teamAt(mock.picks.length, mock.teams) === mock.slot;
    const recs = recommendations();
    if (!onClock) {
      panel.innerHTML = '<div class="engine-head"><div><small>DRAFT DECISION ENGINE</small><h3>Analyzing the board…</h3><p>Recommendations will update when you are on the clock.</p></div></div>';
      return;
    }
    if (!recs.length) return;

    const best = recs[0];
    const alerts = POSITIONS.map(p => ({p,count:recentRun(p)})).filter(x => x.count >= 3);
    const waitPos = POSITIONS.map(p => ({p,d:opponentDemand(p)})).sort((a,b)=>a.d-b.d)[0];

    panel.innerHTML = `
      <div class="engine-head">
        <div><small>DRAFT DECISION ENGINE</small><h3>Best pick: ${best.player.name}</h3></div>
        <div class="engine-score">${best.score}<span>/100</span></div>
      </div>
      <div class="engine-grid">
        <div class="engine-primary ${best.player.position.toLowerCase()}">
          <b>${best.player.position} #${best.player.positionRank} · ${best.player.team}</b>
          <ul>${reasons(best.player).map(x=>`<li>${x}</li>`).join('')}</ul>
        </div>
        <div class="engine-rankings">
          <h4>Top recommendations</h4>
          ${recs.map((r,i)=>`<button type="button" data-engine-pick="${r.player.id}"><span>${i+1}. ${r.player.name}</span><b>${r.score}</b><small>${r.chance}% chance to return</small></button>`).join('')}
        </div>
        <div class="engine-strategy">
          <h4>Draft strategy</h4>
          <p><b>${tierDrop(best.player) >= 6 ? `Take ${best.player.position} now` : `Best value is ${best.player.position}`}</b></p>
          <p>${waitPos ? `${waitPos.p} can likely wait; only ${waitPos.d} upcoming teams show an immediate need.` : ''}</p>
          ${alerts.map(x=>`<p class="engine-alert">Position run: ${x.count} ${x.p}s in the last 6 picks</p>`).join('')}
        </div>
      </div>
      <div class="engine-queues">
        ${POSITIONS.map(p=>`<div><b>${p} queue</b><span>${queueFor(p).join(' · ') || 'None available'}</span></div>`).join('')}
      </div>`;

    panel.querySelectorAll('[data-engine-pick]').forEach(btn => {
      btn.onclick = () => pick(btn.dataset.enginePick);
    });
  }

  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(renderEngine);
  }

  const style = document.createElement('style');
  style.textContent = `
    .decision-engine{margin:14px 0;padding:16px;overflow:visible}
    .decision-engine[hidden]{display:none!important}
    .engine-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
    .engine-head small{color:var(--r);font-weight:950;letter-spacing:.12em}
    .engine-head h3{margin:4px 0 0;font-size:1.35rem}
    .engine-head p{margin:6px 0;color:var(--m)}
    .engine-score{font-size:2rem;font-weight:950;color:var(--g)}
    .engine-score span{font-size:.75rem;color:var(--m)}
    .engine-grid{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:12px;margin-top:14px}
    .engine-primary,.engine-rankings,.engine-strategy{border:1px solid var(--l);border-radius:10px;padding:13px;background:#081a2d}
    .engine-primary{color:#061322}.engine-primary ul{margin:10px 0 0;padding-left:18px}.engine-primary li{margin:5px 0}
    .engine-grid h4{margin:0 0 9px}
    .engine-rankings button{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;text-align:left;gap:2px 8px;border:0;border-top:1px solid var(--l);background:transparent;color:#fff;padding:9px 0}
    .engine-rankings button:first-of-type{border-top:0}.engine-rankings button small{grid-column:1/-1;color:var(--m)}
    .engine-strategy p{margin:7px 0}.engine-alert{color:#ffbd59;font-weight:800}
    .engine-queues{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}
    .engine-queues div{border:1px solid var(--l);border-radius:8px;padding:9px;min-width:0}
    .engine-queues b,.engine-queues span{display:block}.engine-queues span{margin-top:4px;color:var(--m);font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    @media(max-width:950px){.engine-grid{grid-template-columns:1fr}.engine-queues{grid-template-columns:1fr 1fr}}
    @media(max-width:520px){.engine-head{align-items:flex-start}.engine-score{font-size:1.5rem}.engine-queues{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(scheduleRender);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled','class']});
  document.addEventListener('click', scheduleRender, true);
  document.addEventListener('input', scheduleRender, true);
  window.addEventListener('load', scheduleRender);
  scheduleRender();
})();
