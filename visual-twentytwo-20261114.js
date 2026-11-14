/* Presentation-only placement for the jersey number on player cards.
   The original number stays in its data location for existing profile code. */
(() => {
  'use strict';
  const modal = document.getElementById('modal');
  if (!modal || window.__shuaV22Jersey) return;
  window.__shuaV22Jersey = true;

  function polishCards() {
    modal.querySelectorAll('.featured-player-card.broadcast-card').forEach(card => {
      const row = card.querySelector('.featured-last-row');
      const original = card.querySelector('.featured-identity-meta .featured-jersey-number');
      if (!row || !original) return;

      const value = original.textContent.trim();
      let inline = row.querySelector('.shua-v22-jersey-inline');
      if (!inline) {
        inline = document.createElement('span');
        inline.className = 'shua-v22-jersey-inline';
        inline.setAttribute('aria-hidden', 'true');
        row.appendChild(inline);
      }
      if (inline.textContent !== value) inline.textContent = value;
      const hasValue = Boolean(value);
      if (card.classList.contains('shua-v22-inline-number') !== hasValue) {
        card.classList.toggle('shua-v22-inline-number', hasValue);
      }
    });
  }

  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      polishCards();
    });
  };

  const observer = new MutationObserver(records => {
    if (records.every(record => record.target.nodeType === 1 &&
        record.target.closest?.('.shua-v22-jersey-inline'))) return;
    schedule();
  });
  observer.observe(modal, {subtree:true, childList:true, characterData:true});
  schedule();
})();
