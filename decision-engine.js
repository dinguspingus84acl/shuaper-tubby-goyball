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

  function earliestRound(player) {
    const rank = positionRank(player);
    if (player.position === 'QB') {
      if (rank === 1) return 4;       // Allen
      if (rank <= 3) return 5;        // Maye, Lamar
      if (rank <= 5) return 6;
      if (rank <= 8) return 7;
      if (rank <= 12) return 8;
      if (rank <= 18) return 9;
      return 10;
    }
    if (player.position === 'TE') {
      if (rank === 1) return 3;
      if (rank === 2) return 4;
      if (rank <= 4) return 5;
      if (rank <= 8) return 7;
      if (rank <= 12) return 8;
      if (rank <= 18) return 9;
      return 10;
    }
    return 1;
  }

  function availablePlayers(position = 'ALL') {
    const used = new Set(mock.picks.map(x => x.player.id));
    return pool(position).filter(x => !used.has(x.id) && POSITIONS.includes(x.position));
  }

  function bestAvailableAt(position) {
    return availablePlayers(position).sort((a, b) => positionRank(a) - positionRank(b))[0] || null;
  }

  function isBestAvailableAtPosition(player) {
    return bestAvailableAt(player.position)?.id === player.id;
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
    if (player.position === 'QB' || player.position === 'TE') return count === 0 ? 3 : -50;
    if (count < STARTERS[player.position]) return 9;
    if (count < 4) return 3;
    return 0;
  }

  function recommendationEligible(player) {
    const round = currentRound();
    const mine = myPlayers();

    if (!isBestAvailableAtPosition(player)) return false;
    if (player.position === 'QB') {
      if (mine.some(x => x.position === 'QB')) return false;
      if (round < earliestRound(player)) return false;
    }
    if (player.position === 'TE') {
      if (mine.some(x => x.position === 'TE')) return false;
      if (round < earliestRound(player)) return false;
    }
    return true;
  }

  function scorePlayer(player) {
    const rank = overallRank(player);
    const boardScore = rank < 9999
      ? Math.max(0, 120 - (rank - 1) * 3)
      : Math.max(0, 52 - positionRank(player) * 1.7);
    const need = rosterNeed(player);
    const scarcity = Math.min(6, tierDrop(player) * 1.2);
    const demand = Math.min(5, opponentDemand(player.position));
    const tag = player.additionalStats?.tag === 'draft' ? 3 : player.additionalStats?.tag === 'do-not-draft' ? -30 : 0;
    return Math.round(boardScore + need + scarcity + demand + tag);
  }

  function returnChance(player) {
    const gap = picksUntilNextTurn();
    const demand = opponentDemand(player.position);
    const rank = overallRank(player);
    const baseRank = rank < 9999 ? rank : 40 + positionRank(player);
    return Math.max(5, Math.min(95, Math.round(90 - gap * 4 - demand * 6 - Math.max(0, 45 - baseRank) * .7)));
  }

  function recommendations() {
    if (!mock.active || teamAt(mock.picks.length, mock.teams) !== mock.slot) return [];
    const candidates = availablePlayers('ALL')
      .filter(recommendationEligible)
      .map(player => ({ player, score: scorePlayer(player), chance: returnChance(player) }));

    const rankedSkillPlayers = candidates.filter(x => ['RB', 'WR'].includes(x.player.position) && overallRank(x.player) < 9999);
    const bestSkillRank = rankedSkillPlayers.length ? Math.min(...rankedSkillPlayers.map(x => overallRank(x.player))) : 9999;

    return candidates
      .filter(x => {
        const rank = overallRank(x.player);
        if (rank < 9999) return rank <= bestSkillRank + 6;
        return x.player.position === 'QB' || x.player.position === 'TE';
      })
      .sort((a, b) => {
        const ar = overallRank(a.player), br = overallRank(b.player);
        if (ar < 9999 && br < 9999 && Math.abs(ar - br) > 3) return ar - br;
        return b.score - a.score || ar - br || positionRank(a.player) - positionRank(b.player);
      })
      .slice(0, 3);
  }

  function reasons(player) {
    const reasons = [];
    const rank = overallRank(player);
    if (rank < 9999) reasons.push(`#${rank} on your big board`);
    if (isBestAvailableAtPosition(player)) reasons.push(`Best available ${player.position}`);
    if (player.position === 'QB' || player.position === 'TE') reasons.push(`Now past your Round ${earliestRound(player)} draft threshold`);
    if (rosterNeed(player) >= 8) reasons.push(`Fills an open ${player.position} starter spot`);
    if (tierDrop(player) >= 3) reasons.push(`Noticeable ${player.position} drop after this player`);
    reasons.push(`${returnChance(player)}% estimated chance to return`);
    return reasons.slice(0, 4);
  }

  function queueFor(position) {
    return availablePlayers(position)
      .sort((a, b) => positionRank(a) - positionRank(b))
      .slice(0, 3)
      .map(x => x.name);
  }

  // Make CPU teams draft realistic one-QB rosters instead of ignoring QB/TE.
  function realisticCpuPick() {
    const used = new Set(mock.picks.map(x => x.player.id));
    const teamNo = teamAt(mock.picks.length, mock.teams);
    const counts = rosterCounts(teamNo);
    const round = currentRound();
    const available = pool('ALL').filter(x => !used.has(x.id) && POSITIONS.includes(x.position));

    const candidates = available.filter(player => {
      if (player.position === 'QB') {
        if (counts.QB >= 1 && round < 11) return false;
        return round >= earliestRound(player);
      }
      if (player.position === 'TE') {
        if (counts.TE >= 1 && round < 10) return false;
        return round >= earliestRound(player);
      }
      return true;
    }).slice(0, 45);

    if (!candidates.length) return available[0] || null;

    const scored = candidates.map(player => {
      const rank = overallRank(player);
      let score = rank < 9999 ? 130 - rank * 2.5 : 50 - positionRank(player) * 1.5;
      if (player.position === 'RB' || player.position === 'WR') {
        if (counts[player.position] < 2) score += 14;
        else if (counts[player.position] < 4) score += 5;
      }
      if (player.position === 'QB' && counts.QB === 0) score += round >= 6 ? 15 : 7;
      if (player.position === 'TE' && counts.TE === 0) score += round >= 7 ? 10 : 4;
      score += Math.random() * 8;
      return { player, score };
    }).sort((a, b) => b.score - a.score);

    const window = scored.slice(0, Math.min(4, scored.length));
    const weights = [50, 28, 15, 7].slice(0, window.length);
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < window.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return window[i].player;
    }
    return window[0].player;
  }

  if (typeof cpuPick === 'function') cpuPick = realisticCpuPick;

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
      <div class="engine-head"><div><small>DRAFT DECISION ENGINE · ROUND ${currentRound()}</small><h3>Best pick: ${best.player.name}</h3></div><div class="engine-score">${best.score}</div></div>
      <div class="engine-grid">
        <div class="engine-primary ${best.player.position.toLowerCase()}"><b>${best.player.position} #${best.player.positionRank} · ${best.player.team}</b><ul>${reasons(best.player).map(x => `<li>${x}</li>`).join('')}</ul></div>
        <div class="engine-rankings"><h4>Top recommendations</h4>${recs.map((r, i) => `<button type="button" data-engine-pick="${r.player.id}"><span>${i + 1}. ${r.player.name}</span><b>${r.score}</b><small>${overallRank(r.player) < 9999 ? `Big board #${overallRank(r.player)} · ` : ''}${r.chance}% chance to return</small></button>`).join('')}</div>
        <div class="engine-strategy"><h4>Draft strategy</h4><p><b>Big-board order stays primary.</b></p><p>QB and TE only appear after your position-specific draft threshold, and a second QB is never recommended.</p></div>
      </div>
      <div class="engine-queues">${POSITIONS.map(p => `<div><b>${p} queue</b><span>${queueFor(p).join(' · ') || 'None available'}</span></div>`).join('')}</div>`;

    panel.querySelectorAll('[data-engine-pick]').forEach(button => button.onclick = () => pick(button.dataset.enginePick));
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
