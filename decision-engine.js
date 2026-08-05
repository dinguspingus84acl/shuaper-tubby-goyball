(() => {
  const POSITIONS = ['QB', 'RB', 'WR', 'TE'];
  const STARTERS = { QB: 1, RB: 2, WR: 2, TE: 1 };
  let renderQueued = false;

  function overallRank(player) {
    const ranked = board.find(x => x.id === player.id) || board.find(x => N(x.name) === N(player.name));
    return Number(ranked?.overallRank || 9999);
  }

  function positionRank(player) {
    return Number(player.positionRank || 9999);
  }

  function currentRound() {
    return Math.floor(mock.picks.length / mock.teams) + 1;
  }

  function myPlayers() {
    return mock.picks.filter(x => x.team === mock.slot).map(x => x.player);
  }

  function rosterCounts(teamNo) {
    const counts = { QB: 0, RB: 0, WR: 0, TE: 0 };
    mock.picks.filter(x => x.team === teamNo).forEach(x => {
      if (counts[x.player.position] != null) counts[x.player.position]++;
    });
    return counts;
  }

  function availablePlayers(position = 'ALL') {
    const used = new Set(mock.picks.map(x => x.player.id));
    return pool(position).filter(x => !used.has(x.id) && POSITIONS.includes(x.position));
  }

  function availablePositionRank(player) {
    const list = availablePlayers(player.position).sort((a, b) => positionRank(a) - positionRank(b));
    return list.findIndex(x => x.id === player.id);
  }

  function isBestAvailableAtPosition(player) {
    return availablePositionRank(player) === 0;
  }

  function picksUntilNextTurn() {
    for (let i = mock.picks.length + 1; i < mock.teams * 14; i++) {
      if (teamAt(i, mock.teams) === mock.slot) return i - mock.picks.length;
    }
    return 0;
  }

  function upcomingTeams() {
    const teams = [];
    for (let i = 1; i <= picksUntilNextTurn(); i++) {
      const team = teamAt(mock.picks.length + i, mock.teams);
      if (team !== mock.slot && !teams.includes(team)) teams.push(team);
    }
    return teams;
  }

  function opponentDemand(position) {
    return upcomingTeams().filter(team => rosterCounts(team)[position] < STARTERS[position]).length;
  }

  function tierDrop(player) {
    const list = availablePlayers(player.position).sort((a, b) => positionRank(a) - positionRank(b));
    const index = list.findIndex(x => x.id === player.id);
    const next = list[index + 1];
    if (index < 0 || !next) return 0;
    return Math.max(0, Math.min(10, positionRank(next) - positionRank(player)));
  }

  function rosterNeed(player) {
    const count = myPlayers().filter(x => x.position === player.position).length;
    if (count < STARTERS[player.position]) return player.position === 'RB' || player.position === 'WR' ? 8 : 4;
    if ((player.position === 'RB' || player.position === 'WR') && count < 4) return 3;
    return 0;
  }

  function roundAdjustment(player) {
    const round = currentRound();
    const count = myPlayers().filter(x => x.position === player.position).length;

    if (player.position === 'QB') {
      if (count >= 1) return -45;
      if (round === 1) return -100;
      if (round === 2) return -30;
      if (round === 3) return -18;
      if (round === 4) return -8;
      return 0;
    }

    if (player.position === 'TE') {
      if (count >= 1) return -25;
      if (round === 1 && overallRank(player) > 15) return -18;
    }

    if ((player.position === 'RB' || player.position === 'WR') && round <= 3) return 6;
    return 0;
  }

  function realisticCandidate(player) {
    const round = currentRound();
    const bestAtPosition = availablePlayers(player.position)
      .sort((a, b) => positionRank(a) - positionRank(b))[0];

    // Never recommend a lower-ranked player at a position while a better one is available.
    if (bestAtPosition && bestAtPosition.id !== player.id) return false;

    // Standard one-QB format: no QB recommendations in Round 1.
    if (player.position === 'QB' && round === 1) return false;

    return true;
  }

  function scorePlayer(player) {
    const rank = overallRank(player);
    const boardScore = rank < 9999 ? Math.max(0, 100 - (rank - 1) * 2.25) : Math.max(0, 55 - positionRank(player));
    const need = rosterNeed(player);
    const scarcity = tierDrop(player) * 1.5;
    const demand = Math.min(8, opponentDemand(player.position) * 1.5);
    const tag = player.additionalStats?.tag === 'draft' ? 3 : player.additionalStats?.tag === 'do-not-draft' ? -25 : 0;
    return Math.round(boardScore + need + scarcity + demand + tag + roundAdjustment(player));
  }

  function returnChance(player) {
    const gap = picksUntilNextTurn();
    const demand = opponentDemand(player.position);
    const rank = overallRank(player);
    const chance = 90 - gap * 4 - demand * 7 - Math.max(0, 35 - rank) * 0.8;
    return Math.max(5, Math.min(95, Math.round(chance)));
  }

  function recommendations() {
    if (!mock.active || teamAt(mock.picks.length, mock.teams) !== mock.slot) return [];

    const candidates = availablePlayers('ALL')
      .filter(realisticCandidate)
      .map(player => ({ player, score: scorePlayer(player), chance: returnChance(player) }))
      .sort((a, b) => {
        const scoreGap = b.score - a.score;
        // A small situational bonus may break a close decision, but never overpower a major big-board gap.
        if (Math.abs(scoreGap) <= 6) return overallRank(a.player) - overallRank(b.player);
        return scoreGap || overallRank(a.player) - overallRank(b.player);
      });

    // Keep recommendations close to the best available big-board player.
    const bestOverall = Math.min(...candidates.map(x => overallRank(x.player)));
    return candidates
      .filter(x => overallRank(x.player) <= bestOverall + 8 || x.player.position === 'QB' && currentRound() >= 4)
      .slice(0, 3);
  }

  function reasons(player) {
    const reasons = [];
    const rank = overallRank(player);
    if (rank < 9999) reasons.push(`#${rank} on your big board`);
    if (isBestAvailableAtPosition(player)) reasons.push(`Best available ${player.position}`);
    if (rosterNeed(player) >= 8) reasons.push(`Fills an open ${player.position} starter spot`);
    if (tierDrop(player) >= 3) reasons.push(`Noticeable ${player.position} drop after this player`);
    const demand = opponentDemand(player.position);
    if (demand >= 3) reasons.push(`${demand} upcoming teams still need ${player.position}`);
    reasons.push(`${returnChance(player)}% estimated chance to return`);
    return reasons.slice(0, 4);
  }

  function queueFor(position) {
    return availablePlayers(position)
      .sort((a, b) => positionRank(a) - positionRank(b))
      .slice(0, 3)
      .map(x => x.name);
  }

  function ensurePanel() {
    const section = document.getElementById('mockSection');
    if (!section) return null;
    let panel = document.getElementById('decisionEngine');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'decisionEngine';
      panel.className = 'decision-engine card';
      section.insertBefore(panel, section.querySelector('.mock-layout'));
    }
    return panel;
  }

  function renderEngine() {
    renderQueued = false;
    const panel = ensurePanel();
    const section = document.getElementById('mockSection');
    if (!panel || !section) return;
    panel.hidden = section.hidden;
    if (panel.hidden) return;

    if (!mock.active) {
      panel.innerHTML = '<div class="engine-head"><div><small>DRAFT DECISION ENGINE</small><h3>Start a mock draft to see live recommendations</h3></div></div>';
      return;
    }

    if (teamAt(mock.picks.length, mock.teams) !== mock.slot) {
      panel.innerHTML = '<div class="engine-head"><div><small>DRAFT DECISION ENGINE</small><h3>Analyzing the board…</h3></div></div>';
      return;
    }

    const recs = recommendations();
    if (!recs.length) return;
    const best = recs[0];

    panel.innerHTML = `
      <div class="engine-head">
        <div><small>DRAFT DECISION ENGINE · ROUND ${currentRound()}</small><h3>Best pick: ${best.player.name}</h3></div>
        <div class="engine-score">${best.score}</div>
      </div>
      <div class="engine-grid">
        <div class="engine-primary ${best.player.position.toLowerCase()}">
          <b>${best.player.position} #${best.player.positionRank} · ${best.player.team}</b>
          <ul>${reasons(best.player).map(x => `<li>${x}</li>`).join('')}</ul>
        </div>
        <div class="engine-rankings">
          <h4>Top recommendations</h4>
          ${recs.map((r, i) => `<button type="button" data-engine-pick="${r.player.id}"><span>${i + 1}. ${r.player.name}</span><b>${r.score}</b><small>Big board #${overallRank(r.player)} · ${r.chance}% chance to return</small></button>`).join('')}
        </div>
        <div class="engine-strategy">
          <h4>Draft strategy</h4>
          <p><b>Follow your big board unless scarcity creates a close call.</b></p>
          <p>Lower-ranked players cannot jump a better available player at the same position.</p>
        </div>
      </div>
      <div class="engine-queues">
        ${POSITIONS.map(p => `<div><b>${p} queue</b><span>${queueFor(p).join(' · ') || 'None available'}</span></div>`).join('')}
      </div>`;

    panel.querySelectorAll('[data-engine-pick]').forEach(button => {
      button.onclick = () => pick(button.dataset.enginePick);
    });
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(renderEngine);
  }

  const style = document.createElement('style');
  style.textContent = `
    .decision-engine{margin:14px 0;padding:16px;overflow:visible}.decision-engine[hidden]{display:none!important}
    .engine-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.engine-head small{color:var(--r);font-weight:950;letter-spacing:.1em}.engine-head h3{margin:4px 0 0;font-size:1.35rem}.engine-score{font-size:2rem;font-weight:950;color:var(--g)}
    .engine-grid{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:12px;margin-top:14px}.engine-primary,.engine-rankings,.engine-strategy{border:1px solid var(--l);border-radius:10px;padding:13px;background:#081a2d}.engine-primary{color:#061322}.engine-primary ul{margin:10px 0 0;padding-left:18px}.engine-primary li{margin:5px 0}.engine-grid h4{margin:0 0 9px}
    .engine-rankings button{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;text-align:left;gap:2px 8px;border:0;border-top:1px solid var(--l);background:transparent;color:#fff;padding:9px 0}.engine-rankings button:first-of-type{border-top:0}.engine-rankings button small{grid-column:1/-1;color:var(--m)}.engine-strategy p{margin:7px 0}
    .engine-queues{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.engine-queues div{border:1px solid var(--l);border-radius:8px;padding:9px;min-width:0}.engine-queues b,.engine-queues span{display:block}.engine-queues span{margin-top:4px;color:var(--m);font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    @media(max-width:950px){.engine-grid{grid-template-columns:1fr}.engine-queues{grid-template-columns:1fr 1fr}}@media(max-width:520px){.engine-head{align-items:flex-start}.engine-score{font-size:1.5rem}.engine-queues{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  new MutationObserver(scheduleRender).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'class'] });
  document.addEventListener('click', scheduleRender, true);
  document.addEventListener('input', scheduleRender, true);
  window.addEventListener('load', scheduleRender);
  scheduleRender();
})();
