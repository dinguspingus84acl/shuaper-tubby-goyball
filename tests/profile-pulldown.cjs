const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'unified-profile.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const start = code.indexOf('function installPhoneSwipeDismiss(){');
const end = code.indexOf('\nfunction prepareUnified(', start);
assert.ok(start >= 0 && end > start, 'phone swipe handler is present');
const handler = code.slice(start, end);

function setup({ fromY = 50, interactive = false, scrollTop = 0 } = {}) {
  const listeners = new Map();
  const sheet = {
    dataset: {}, style: {}, clientHeight: 800, clientWidth: 400, scrollTop, isConnected: true,
    getBoundingClientRect: () => ({ top: 0 }),
    addEventListener: (name, callback) => listeners.set(name, callback)
  };
  let dismissed = 0;
  let time = 0;
  const modal = { dataset: { id: 'player-1' } };
  const context = {
    document: {
      querySelector: () => sheet,
      getElementById: name => name === 'modal' ? modal : null
    },
    window: { innerWidth: 400, innerHeight: 800, matchMedia: () => ({ matches: false }) },
    performance: { now: () => (time += 70) },
    isPhoneProfileSheet: () => true,
    dismissPhoneProfile: () => { dismissed += 1; },
    adjacentPlayerId: () => null,
    clearPlayerSwipePreview: () => {},
    setTimeout: callback => callback()
  };
  vm.runInNewContext(handler + '\ninstallPhoneSwipeDismiss();', context);
  const target = { closest: () => interactive ? {} : null };
  const fired = name => y => listeners.get(name)({
    touches: [{ clientX: 100, clientY: y }], target, cancelable: true,
    preventDefault() { this.prevented = true; }
  });
  fired('touchstart')(fromY);
  return {
    sheet, move: fired('touchmove'),
    moveTo: (x, y) => listeners.get('touchmove')({
      touches: [{ clientX: x, clientY: y }], target, cancelable: true,
      preventDefault() { this.prevented = true; }
    }),
    end: () => listeners.get('touchend')(),
    cancel: () => listeners.get('touchcancel')(), dismissed: () => dismissed
  };
}

test('mobile profile uses a fresh cache key for pull-down dismissal', () => {
  assert.ok(html.includes('unified-profile.js?v=20261114-pull-down-5'));
  assert.match(handler, /startedAtTop/);
  assert.doesNotMatch(handler, /unifiedOverviewPanel.*hidden/);
});

test('dragging down from the top tracks the finger and closes the profile', () => {
  const ui = setup();
  ui.move(165);
  assert.match(ui.sheet.style.transform, /translate3d\(0,92px,0\)/);
  ui.end();
  assert.equal(ui.dismissed(), 1);
});

test('small downward top gesture snaps back instead of closing', () => {
  const ui = setup();
  ui.move(76);
  ui.end();
  assert.equal(ui.dismissed(), 0);
  assert.equal(ui.sheet.style.transform, '');
});

test('downward drags from content below the header remain normal scrolling', () => {
  const ui = setup({ fromY: 340 });
  ui.move(500);
  ui.end();
  assert.equal(ui.dismissed(), 0);
});

test('gestures on controls and vertically scrolled cards never dismiss', () => {
  for (const options of [{ interactive: true }, { scrollTop: 150 }]) {
    const ui = setup(options);
    ui.move(190);
    ui.end();
    assert.equal(ui.dismissed(), 0);
  }
});

test('cancelled drag returns the card to its original position', () => {
  const ui = setup();
  ui.move(165);
  ui.cancel();
  assert.equal(ui.dismissed(), 0);
  assert.equal(ui.sheet.style.transform, '');
});

test('horizontal drags still follow the existing player-swipe path', () => {
  const ui = setup();
  ui.moveTo(240, 50);
  assert.match(ui.sheet.style.transform, /translate3d\(/);
  ui.end();
  assert.equal(ui.dismissed(), 0);
  assert.equal(ui.sheet.style.transform, '');
});
