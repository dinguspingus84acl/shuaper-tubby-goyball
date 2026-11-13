/* Keep the selected-player outline attached to the real player, even when
   rankings are re-rendered or the player modal advances to another player. */
(() => {
  'use strict';
  const board = document.getElementById('board');
  const rows = document.getElementById('rows');
  if (!board) return;

  let selectedId = '';
  let selectedPick = null;

  function highlightPick() {
    if (selectedPick && selectedPick.isConnected &&
        String(selectedPick.dataset.id) === selectedId) return;
    if (selectedPick) selectedPick.classList.remove('shua-selected-pick');
    const match = selectedId
      ? [...board.querySelectorAll('.pick[data-id]')].find(p => String(p.dataset.id) === selectedId)
      : null;
    selectedPick = match || null;
    if (selectedPick) selectedPick.classList.add('shua-selected-pick');
  }

  function select(id) {
    const next = String(id || '');
    if (!next) return;
    selectedId = next;
    highlightPick();
  }

  document.addEventListener('click', event => {
    const player = event.target.closest?.('#board .pick[data-id], #rows tr[data-id]');
    if (player) select(player.dataset.id);
  }, true);

  // Existing Overview navigation highlights the current ranking row. Follow
  // those changes so next/previous player navigation also updates the board.
  if (rows) {
    new MutationObserver(() => {
      const selectedRow = rows.querySelector('tr.selected-player-row[data-id]');
      if (selectedRow) select(selectedRow.dataset.id);
    }).observe(rows, {subtree: true, childList: true, attributes: true, attributeFilter: ['class']});
    const selectedRow = rows.querySelector('tr.selected-player-row[data-id]');
    if (selectedRow) select(selectedRow.dataset.id);
  }

  // The draft board's HTML gets replaced when filters or draft mode change.
  new MutationObserver(highlightPick).observe(board, {childList: true});
})();
