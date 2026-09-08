/** OS combo maps + keydown matcher. Browser + Node. No DOM. */

export const OS_IDS = ['win', 'mac', 'linux'];

export function detectOS(ua = '', platform = '') {
  const s = `${ua} ${platform}`;
  if (/iPhone|iPad|iPod|Macintosh|Mac OS X|MacIntel/i.test(s)) return 'mac';
  if (/Android/i.test(s)) return 'win';
  if (/Linux|X11|CrOS/i.test(s)) return 'linux';
  if (/Win/i.test(s)) return 'win';
  return 'win';
}

/** Labels kids see. {mod} is the everyday boss key for shortcuts. */
export const MOD = {
  win: { mod: 'Ctrl', alt: 'Alt', win: 'Win', shift: 'Shift', ctrl: 'Ctrl', meta: 'Win' },
  mac: { mod: 'Cmd', alt: 'Option', win: 'Cmd', shift: 'Shift', ctrl: 'Ctrl', meta: 'Cmd' },
  linux: { mod: 'Ctrl', alt: 'Alt', win: 'Super', shift: 'Shift', ctrl: 'Ctrl', meta: 'Super' }
};

/**
 * Combo dictionary.
 * Each entry: `key` plus per-OS modifier flags.
 * `alts[os]` = extra chords that also count (redo Y vs Shift+Z).
 * `osEaten` = the OS steals the keys; keep as quiz, never a press challenge.
 * `browserEaten` = the BROWSER steals the keys and refuses preventDefault
 *   (Ctrl+T / Ctrl+W / Ctrl+Tab). Pressing them for real kills the game tab,
 *   so they are quiz-only too.
 */
export const COMBOS = {
  copy: { key: 'c', win: { ctrl: true }, mac: { meta: true }, linux: { ctrl: true } },
  paste: { key: 'v', win: { ctrl: true }, mac: { meta: true }, linux: { ctrl: true } },
  cut: { key: 'x', win: { ctrl: true }, mac: { meta: true }, linux: { ctrl: true } },
  undo: { key: 'z', win: { ctrl: true }, mac: { meta: true }, linux: { ctrl: true } },
  redo: {
    key: 'y',
    win: { ctrl: true },
    mac: { meta: true, shift: true, key: 'z' },
    linux: { ctrl: true, shift: true, key: 'z' },
    alts: {
      win: [{ ctrl: true, shift: true, key: 'z' }],
      mac: [{ meta: true, shift: true, key: 'z' }],
      linux: [{ ctrl: true, key: 'y' }]
    }
  },
  selectAll: { key: 'a', win: { ctrl: true }, mac: { meta: true }, linux: { ctrl: true } },
  save: { key: 's', win: { ctrl: true }, mac: { meta: true }, linux: { ctrl: true } },
  newTab: { key: 't', win: { ctrl: true }, mac: { meta: true }, linux: { ctrl: true }, browserEaten: true },
  closeTab: { key: 'w', win: { ctrl: true }, mac: { meta: true }, linux: { ctrl: true }, browserEaten: true },
  nextTab: { key: 'tab', win: { ctrl: true }, mac: { ctrl: true }, linux: { ctrl: true }, browserEaten: true },
  find: { key: 'f', win: { ctrl: true }, mac: { meta: true }, linux: { ctrl: true } },
  zoomIn: {
    key: '=',
    win: { ctrl: true },
    mac: { meta: true },
    linux: { ctrl: true },
    alts: {
      win: [{ ctrl: true, key: '+' }, { ctrl: true, shift: true, key: '=' }, { ctrl: true, key: 'add' }],
      mac: [{ meta: true, key: '+' }, { meta: true, shift: true, key: '=' }, { meta: true, key: 'add' }],
      linux: [{ ctrl: true, key: '+' }, { ctrl: true, shift: true, key: '=' }, { ctrl: true, key: 'add' }]
    }
  },
  zoomOut: { key: '-', win: { ctrl: true }, mac: { meta: true }, linux: { ctrl: true } },
  zoomReset: { key: '0', win: { ctrl: true }, mac: { meta: true }, linux: { ctrl: true } },
  switchWindow: {
    key: 'tab',
    win: { alt: true },
    mac: { meta: true },
    linux: { alt: true },
    osEaten: true
  },
  screenshot: {
    key: 's',
    win: { meta: true, shift: true },
    mac: { meta: true, shift: true, key: '4' },
    linux: { key: 'printscreen' },
    osEaten: true,
    alts: {
      win: [{ key: 'printscreen' }],
      mac: [{ meta: true, shift: true, key: '3' }],
      linux: [{ shift: true, key: 'printscreen' }]
    }
  },
  lock: {
    key: 'l',
    win: { meta: true },
    mac: { meta: true, ctrl: true, key: 'q' },
    linux: { meta: true },
    osEaten: true
  }
};

export function isOsEaten(comboId) {
  return COMBOS[comboId]?.osEaten === true;
}

/** The browser keeps these for itself; a real press would close/leave the game. */
export function isBrowserEaten(comboId) {
  return COMBOS[comboId]?.browserEaten === true;
}

/** Safe to ask for a real key press in a browser tab? */
export function isPressable(comboId) {
  if (!COMBOS[comboId]) return false;
  return !isOsEaten(comboId) && !isBrowserEaten(comboId);
}

export function fillOs(str, os) {
  const m = MOD[os] || MOD.win;
  return String(str)
    .replaceAll('{mod}', m.mod)
    .replaceAll('{alt}', m.alt)
    .replaceAll('{win}', m.win)
    .replaceAll('{shift}', m.shift)
    .replaceAll('{ctrl}', m.ctrl)
    .replaceAll('{meta}', m.meta);
}

function normKey(k) {
  if (k == null) return '';
  const raw = String(k);
  if (raw.length === 1) {
    if (raw === '+') return '=';
    return raw.toLowerCase();
  }
  const s = raw.toLowerCase();
  const map = {
    spacebar: 'space',
    ' ': 'space',
    esc: 'escape',
    arrowleft: 'left',
    arrowright: 'right',
    arrowup: 'up',
    arrowdown: 'down',
    add: '=',
    subtract: '-',
    equal: '=',
    '+': '=',
    printscreen: 'printscreen',
    'print-screen': 'printscreen'
  };
  return map[s] || s;
}

function codeToKey(code) {
  if (!code) return '';
  const c = String(code);
  if (/^Key[A-Z]$/.test(c)) return c.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(c)) return c.slice(5);
  if (c === 'Equal' || c === 'NumpadAdd') return '=';
  if (c === 'Minus' || c === 'NumpadSubtract') return '-';
  if (c === 'Tab') return 'tab';
  if (c === 'PrintScreen') return 'printscreen';
  if (c === 'Space') return 'space';
  return '';
}

function chordOf(def, os) {
  const mods = { ...(def[os] || def.win || {}) };
  const key = mods.key || def.key;
  delete mods.key;
  return { ...mods, key };
}

export function chordsFor(comboId, os) {
  const def = COMBOS[comboId];
  if (!def) return [];
  const primary = chordOf(def, os);
  const list = [primary];
  const alts = def.alts?.[os] || [];
  for (const a of alts) list.push({ ...a });
  return list;
}

function flags(c) {
  return {
    ctrl: !!c.ctrl,
    alt: !!c.alt,
    meta: !!c.meta,
    shift: !!c.shift
  };
}

function chordMatch(e, c) {
  const f = flags(c);
  if (!!e.ctrlKey !== f.ctrl) return false;
  if (!!e.altKey !== f.alt) return false;
  if (!!e.metaKey !== f.meta) return false;
  if (!!e.shiftKey !== f.shift) return false;
  const want = normKey(c.key);
  if (normKey(e.key) === want) return true;
  if (codeToKey(e.code) === want) return true;
  return false;
}

/** True when the event matches the combo on that OS. Ignores key repeats. */
export function matchKeydown(eventLike, comboId, os) {
  if (!eventLike || eventLike.repeat) return false;
  return chordsFor(comboId, os).some((c) => chordMatch(eventLike, c));
}

export function displayKey(key) {
  const k = normKey(key);
  const pretty = {
    tab: 'Tab',
    escape: 'Esc',
    printscreen: 'PrintScreen',
    space: 'Space',
    '=': '+',
    '-': '−'
  };
  if (pretty[k]) return pretty[k];
  if (k.length === 1) return k.toUpperCase();
  return k;
}

export function formatCombo(comboId, os) {
  const c = chordsFor(comboId, os)[0];
  if (!c) return comboId;
  const m = MOD[os] || MOD.win;
  const parts = [];
  if (c.meta) parts.push(m.meta);
  if (c.ctrl) parts.push(m.ctrl);
  if (c.alt) parts.push(m.alt);
  if (c.shift) parts.push(m.shift);
  parts.push(displayKey(c.key));
  return parts.join('+');
}

/** Key ids the on-screen keyboard should light. */
export function highlightKeys(comboId, os) {
  const c = chordsFor(comboId, os)[0];
  if (!c) return [];
  const out = [];
  if (c.ctrl) out.push('ctrl');
  if (c.meta) out.push(os === 'mac' ? 'cmd' : os === 'linux' ? 'super' : 'win');
  if (c.alt) out.push(os === 'mac' ? 'option' : 'alt');
  if (c.shift) out.push('shift');
  out.push(normKey(c.key));
  return out;
}

export function eventFromChord(comboId, os, extra = {}) {
  const c = chordsFor(comboId, os)[0];
  return {
    key: c.key.length === 1 ? c.key : displayKey(c.key),
    ctrlKey: !!c.ctrl,
    altKey: !!c.alt,
    metaKey: !!c.meta,
    shiftKey: !!c.shift,
    repeat: false,
    ...extra
  };
}


/**
 * Detect how the gamer will play.
 * touch if: maxTouchPoints > 0 AND (coarse pointer OR no keyboard seen yet on a narrow viewport < 800)
 * Otherwise keyboard.
 */
export function detectHands(info = {}) {
  const maxTouch = Number(info.maxTouchPoints) || 0;
  const coarse = info.pointerCoarse === true;
  const keyboardSeen = info.keyboardSeen === true;
  const width = Number(info.viewportWidth);
  const viewport = Number.isFinite(width) ? width : 1024;
  if (maxTouch > 0 && (coarse || (!keyboardSeen && viewport < 800))) return 'touch';
  return 'keyboard';
}

export function isRealKeyboardEvent(eventLike) {
  if (!eventLike || eventLike.repeat) return false;
  const tag = String(eventLike.targetTag || eventLike.target?.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;
  if (eventLike.isComposing) return false;
  const key = eventLike.key;
  if (key == null || key === '') return false;
  return true;
}
