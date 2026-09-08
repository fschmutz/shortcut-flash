import { APP_VERSION } from './version.js';
import { STR } from './i18n.js';
import { createFX } from './fx.js';
import { MISSIONS, missionById } from './missions.js';
import { generateMissionChallenges, generateBossGauntlet } from './challenges.js';
import {
  detectOS, fillOs, matchKeydown, MOD, detectHands, isRealKeyboardEvent
} from './keys.js';

const $ = (id) => document.getElementById(id);
const LS = 'shortcut-flash';
const BOSS_SECS = 90;

let lang = 'fr';
let os = 'win';
let hands = 'keyboard';
let mode = 'mix';
let keyboardSeen = false;
let handsForced = false;
let player = { name: 'Paloma' };
let beaten = {}; // missionId -> stars 1..3
let bossClear = false;
let lastCopy = null;

function S() { return STR[lang] || STR.fr; }

function detectLang() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS) || 'null');
    if (saved?.lang === 'en' || saved?.lang === 'fr') return saved.lang;
  } catch { /* ignore */ }
  const nav = (navigator.language || 'fr').toLowerCase();
  if (nav.startsWith('en')) return 'en';
  return 'fr';
}

function pointerIsCoarse() {
  try {
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  } catch {
    return false;
  }
}

function detectHandsNow() {
  return detectHands({
    maxTouchPoints: navigator.maxTouchPoints || 0,
    pointerCoarse: pointerIsCoarse(),
    keyboardSeen,
    viewportWidth: window.innerWidth || 1024
  });
}

function loadPersisted() {
  try {
    const s = JSON.parse(localStorage.getItem(LS) || 'null');
    if (!s || typeof s !== 'object') return;
    if (typeof s.name === 'string' && s.name.trim()) player.name = s.name.trim().slice(0, 14);
    if (s.os === 'win' || s.os === 'mac' || s.os === 'linux') os = s.os;
    if (s.lang === 'en' || s.lang === 'fr') lang = s.lang;
    if (s.beaten && typeof s.beaten === 'object') beaten = s.beaten;
    bossClear = !!s.boss;
    if (typeof s.lastCopy === 'string') lastCopy = s.lastCopy;
    keyboardSeen = !!s.keyboardSeen;
    handsForced = !!s.handsForced;
    if (s.hands === 'touch' || s.hands === 'keyboard') {
      if (handsForced) hands = s.hands;
    }
    if (s.mode === 'typing' || s.mode === 'mix') mode = s.mode;
  } catch { /* keep defaults */ }
}

function save() {
  try {
    localStorage.setItem(LS, JSON.stringify({
      name: player.name, os, lang, hands, mode, handsForced, keyboardSeen,
      beaten, boss: bossClear, lastCopy
    }));
  } catch { /* quota */ }
}

function isBeaten(id) {
  if (id === 'boss') return bossClear;
  return (beaten[id] || 0) > 0;
}

function isUnlocked(id) {
  const i = MISSIONS.findIndex((m) => m.id === id);
  if (i <= 0) return true;
  return isBeaten(MISSIONS[i - 1].id);
}

/* ---------- sound ---------- */
let muted = false, actx = null, master = null;
function unlockAudio() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (!master) { master = actx.createGain(); master.gain.value = 0.9; master.connect(actx.destination); }
    if (actx.state === 'suspended') actx.resume();
  } catch { /* no audio */ }
}
document.addEventListener('pointerdown', unlockAudio, { passive: true });
document.addEventListener('touchend', unlockAudio, { passive: true });
document.addEventListener('click', unlockAudio);
function beep(freq, dur, type) {
  if (muted) return;
  try {
    unlockAudio();
    if (!actx) return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.28, actx.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g); g.connect(master || actx.destination); o.start(); o.stop(actx.currentTime + dur + 0.02);
  } catch { /* ignore */ }
}
const sGood = () => { beep(880, 0.09); setTimeout(() => beep(1320, 0.10), 70); };
const sBad = () => beep(150, 0.22, 'sawtooth');
const sUp = () => { beep(660, 0.08); setTimeout(() => beep(990, 0.08), 60); setTimeout(() => beep(1480, 0.14), 120); };
const sFanfare = () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => beep(f, 0.16), i * 100)); };

const FX = createFX($('fx'));

function show(id) {
  ['who', 'map', 'brief', 'play', 'win'].forEach((p) => $(p).classList.toggle('hide', p !== id));
}

function osLabel() {
  const T = S();
  if (os === 'mac') return T.osMac;
  if (os === 'linux') return T.osLinux;
  return T.osWin;
}

function paintHands() {
  const T = S();
  const chip = hands === 'touch' ? T.handsChipTouch : T.handsChipKeyboard;
  if ($('handsChip')) $('handsChip').textContent = chip;
  if ($('playHandsChip')) $('playHandsChip').textContent = chip;
  if ($('handsTouch')) $('handsTouch').setAttribute('aria-pressed', String(hands === 'touch'));
  if ($('handsKeyboard')) $('handsKeyboard').setAttribute('aria-pressed', String(hands === 'keyboard'));
  if ($('sitTitle')) $('sitTitle').textContent = hands === 'touch' ? T.sitPhone : T.sitComputer;
  if ($('sitOs')) $('sitOs').textContent = T.sitOsGuess(osLabel());
  if ($('handsEyebrow')) $('handsEyebrow').textContent = T.sitHandsHint;
}

function paintMode() {
  const T = S();
  const chip = mode === 'typing' ? T.modeChipTyping : T.modeChipMix;
  if ($('modeChip')) $('modeChip').textContent = chip;
  if ($('playModeChip')) $('playModeChip').textContent = chip;
  if ($('modeMix')) $('modeMix').setAttribute('aria-pressed', String(mode === 'mix'));
  if ($('modeTyping')) $('modeTyping').setAttribute('aria-pressed', String(mode === 'typing'));
}

function applyI18n() {
  const T = S();
  document.documentElement.lang = T.htmlLang;
  document.title = T.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', T.description);
  const skip = document.querySelector('.skip');
  if (skip) skip.textContent = T.skip;
  const ns = document.querySelector('.noscript-msg');
  if (ns) ns.textContent = T.noscript;
  $('updateText').textContent = T.update;
  $('reloadBtn').textContent = T.reload;
  document.querySelector('.lang').setAttribute('aria-label', T.langGroup);
  $('langFr').setAttribute('aria-pressed', lang === 'fr' ? 'true' : 'false');
  $('langEn').setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
  $('mute').setAttribute('aria-label', muted ? T.muteOff : T.muteOn);
  $('tagline').textContent = T.tagline(player.name);
  $('whoEyebrow').textContent = T.whoEyebrow;
  $('pname').placeholder = T.namePh;
  $('osEyebrow').textContent = T.osEyebrow;
  $('osHint').textContent = T.osHint;
  $('osWin').textContent = T.osWin;
  $('osMac').textContent = T.osMac;
  $('osLinux').textContent = T.osLinux;
  $('handsTouch').textContent = T.handsTouch;
  $('handsKeyboard').textContent = T.handsKeyboard;
  $('modeEyebrow').textContent = T.modeEyebrow;
  $('modeMix').textContent = T.modeMix;
  $('modeTyping').textContent = T.modeTyping;
  $('modeHint').textContent = T.modeHint;
  $('toMap').textContent = T.go;
  $('mapEyebrow').textContent = T.mapEyebrow;
  $('changePlayer').textContent = T.changePlayer;
  $('resetQuest').textContent = T.resetQuest;
  $('briefGo').textContent = T.briefGo;
  $('briefBack').textContent = T.backMap;
  $('lblTime').textContent = T.time;
  $('keysOk').textContent = T.keysOk;
  $('keysClear').textContent = T.keysClear;
  $('tfTrue').textContent = T.tfTrue;
  $('tfFalse').textContent = T.tfFalse;
  $('playHint').textContent = T.pressHint;
  $('winContinue').textContent = T.continue;
  $('winRetry').textContent = T.retry;
  $('verLabel').textContent = T.version;
  $('reloadLatest').textContent = T.reload;
  $('privacyLine').textContent = T.privacy;
  paintOs();
  paintHands();
  paintMode();
  if (!$('map').classList.contains('hide')) paintMap();
}

function paintOs() {
  [...$('oses').children].forEach((c) => {
    c.setAttribute('aria-pressed', String(c.dataset.os === os));
  });
}

function setLang(next) {
  lang = next === 'en' ? 'en' : 'fr';
  save();
  applyI18n();
  if (state.running) paintChallenge();
}

function restorePlayerUI() {
  $('pname').value = player.name;
  paintOs();
  paintHands();
  paintMode();
}

function setHands(next, forced) {
  hands = next === 'touch' ? 'touch' : 'keyboard';
  if (forced) handsForced = true;
  if (hands === 'keyboard') keyboardSeen = true;
  save();
  paintHands();
  if (state.running) paintChallenge();
}

function setMode(next) {
  mode = next === 'typing' ? 'typing' : 'mix';
  save();
  paintMode();
}

/* ---------- map ---------- */
function paintMap() {
  const box = $('mapList');
  box.replaceChildren();
  MISSIONS.forEach((m) => {
    const unlocked = isUnlocked(m.id);
    const done = isBeaten(m.id);
    const stars = m.isBoss ? (bossClear ? 3 : 0) : (beaten[m.id] || 0);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mission' + (m.isBoss ? ' boss' : '') + (done ? ' done' : '') + (!unlocked ? ' lock' : '');
    btn.disabled = !unlocked;
    btn.dataset.id = m.id;
    const num = document.createElement('span');
    num.className = 'm-num';
    num.textContent = m.isBoss ? '👑' : String(m.index);
    const name = document.createElement('span');
    name.className = 'm-name';
    name.textContent = fillOs(m.title[lang] || m.title.fr, os);
    const meta = document.createElement('span');
    meta.className = 'm-meta';
    if (!unlocked) meta.textContent = S().locked;
    else if (done && m.isBoss) meta.textContent = S().bossSub;
    else if (done) meta.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    else meta.textContent = '· · ·';
    btn.append(num, name, meta);
    box.appendChild(btn);
  });
}

function briefBody(m) {
  const raw = m.blurb[lang] || m.blurb.fr;
  const body = fillOs(raw, os).trim();
  const T = S();
  const doLine = mode === 'typing'
    ? (hands === 'touch' ? T.briefDoTypingTouch : T.briefDoTypingKeyboard)
    : (hands === 'touch' ? T.briefDoTouch : T.briefDoKeyboard);
  return body + ' ' + doLine;
}

function openBrief(id) {
  const m = missionById(id);
  if (!m || !isUnlocked(id)) return;
  state.missionId = id;
  $('briefTitle').textContent = fillOs(m.title[lang] || m.title.fr, os);
  $('briefBlurb').textContent = briefBody(m);
  $('briefTag').textContent = m.isBoss ? S().bossTitle : ('Mission ' + m.index);
  show('brief');
}

/* ---------- play state ---------- */
const state = {
  running: false,
  missionId: null,
  queue: [],
  i: 0,
  misses: 0,
  tries: 0,
  left: BOSS_SECS,
  timer: 0,
  picked: new Set(),
  answerBtns: [],
  resolved: false
};

function current() { return state.queue[state.i] || null; }

/** 1..4 from a bare digit press (top row or numpad). No modifiers allowed. */
function digitOf(e) {
  if (e.ctrlKey || e.altKey || e.metaKey) return 0;
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
  const raw = m ? m[1] : (e.key || '');
  const n = Number(raw);
  return n >= 1 && n <= 4 ? n : 0;
}

function genOpts() {
  return { os, lang, name: player.name, now: Date.now(), lastCopy, hands, mode };
}

function begin(id) {
  const m = missionById(id);
  if (!m) return;
  FX.clear();
  state.missionId = id;
  state.i = 0;
  state.misses = 0;
  state.tries = 0;
  state.resolved = false;
  state.running = true;
  state.picked = new Set();
  if (m.isBoss) {
    state.queue = generateBossGauntlet(genOpts());
    state.left = BOSS_SECS;
    $('hud').classList.remove('hide');
    startTimer();
  } else {
    state.queue = generateMissionChallenges(id, genOpts());
    $('hud').classList.add('hide');
    stopTimer();
  }
  const last = state.queue.find((c) => c.copyWord);
  if (last?.copyWord) lastCopy = last.copyWord;
  save();
  show('play');
  paintChallenge();
}

function startTimer() {
  stopTimer();
  $('time').textContent = String(state.left);
  $('time').classList.remove('low');
  state.timer = setInterval(() => {
    state.left -= 1;
    $('time').textContent = String(Math.max(0, state.left));
    $('time').classList.toggle('low', state.left <= 15);
    if (state.left <= 0) {
      stopTimer();
      failBoss();
    }
  }, 1000);
}
function stopTimer() {
  if (state.timer) { clearInterval(state.timer); state.timer = 0; }
}

function paintChallenge() {
  const ch = current();
  const T = S();
  if (!ch) return;
  state.resolved = false;
  state.tries = 0;
  state.picked = new Set();
  paintHands();
  $('qtag').textContent = T.challengeOf(state.i + 1, state.queue.length);
  $('qtext').textContent = ch.prompt;
  $('feedback').textContent = '';
  $('feedback').className = 'feedback';
  $('qcard').classList.remove('good', 'bad', 'in');
  void $('qcard').offsetWidth;
  $('qcard').classList.add('in');

  const isWhat = ch.type === 'what';
  const isTf = ch.type === 'tf';
  const isKeys = ch.type === 'keys';
  const isPress = ch.type === 'press';
  const isMouse = ch.type === 'mouse';

  $('answers').classList.toggle('hide', !isWhat);
  $('tf').classList.toggle('hide', !isTf);
  $('kbWrap').classList.toggle('hide', !(isKeys || isPress));
  $('keysBar').classList.toggle('hide', !isKeys);
  $('mouseBox').classList.toggle('hide', !isMouse);

  const kb = hands === 'keyboard';
  paintTf(kb);
  if (isWhat) {
    $('playHint').textContent = kb ? T.answerKeysHint : '';
    paintAnswers(ch, kb);
  } else if (isTf) {
    $('playHint').textContent = kb ? T.tfKeysHint : '';
  } else if (isKeys) {
    $('playHint').textContent = kb ? T.keysHintKb : T.keysHint;
    paintKeyboard(ch.keys || [], true);
  } else if (isPress) {
    $('playHint').textContent = T.pressHint;
    paintKeyboard(ch.keys || [], false);
  } else if (isMouse) {
    $('playHint').textContent = T.mouseHint;
    paintMouse(ch);
  }
}

function paintAnswers(ch, numbered) {
  const box = $('answers');
  box.replaceChildren();
  state.answerBtns = [];
  (ch.options || []).forEach((opt, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip ans';
    if (numbered) {
      const badge = document.createElement('span');
      badge.className = 'kbd-badge';
      badge.textContent = String(i + 1);
      b.append(badge, document.createTextNode(opt));
    } else {
      b.textContent = opt;
    }
    b.addEventListener('click', () => pickAnswer(i));
    box.appendChild(b);
    state.answerBtns.push(b);
  });
}

/** Vrai/Faux carry their key number when a real keyboard is in play. */
function paintTf(numbered) {
  const T = S();
  const set = (el, n, label) => {
    el.replaceChildren();
    if (numbered) {
      const badge = document.createElement('span');
      badge.className = 'kbd-badge';
      badge.textContent = String(n);
      el.append(badge, document.createTextNode(label));
    } else {
      el.textContent = label;
    }
  };
  set($('tfTrue'), 1, T.tfTrue);
  set($('tfFalse'), 2, T.tfFalse);
}

function pickAnswer(i) {
  const ch = current();
  if (!ch || ch.type !== 'what' || state.resolved) return false;
  const opt = (ch.options || [])[i];
  if (opt === undefined) return false;
  const btn = state.answerBtns?.[i];
  if (btn) {
    btn.classList.add('sel');
    setTimeout(() => btn.classList.remove('sel'), 400);
  }
  grade(opt === ch.answer, ch.answer);
  return true;
}

function pickTf(truth) {
  const ch = current();
  if (!ch || ch.type !== 'tf' || state.resolved) return false;
  grade(ch.truth === truth, ch.truth ? S().tfTrue : S().tfFalse);
  return true;
}

function paintMouse(ch) {
  $('dragStar').classList.toggle('hide', ch.mouse !== 'drag');
  $('dropPad').classList.toggle('hide', ch.mouse !== 'drag');
  $('mouseTarget').classList.toggle('hide', ch.mouse === 'drag');
  $('mouseTarget').textContent = S().target;
  $('dropPad').textContent = S().pad;
  $('dragStar').textContent = '★';
  $('dragStar').classList.remove('home');
}

/* ---------- on-screen keyboard: only this challenge's keys + modifiers ---------- */
const KEY_LAB = {
  esc: 'Esc', tab: 'Tab',
  '1': '1', '2': '2', '3': '3', '4': '4', '0': '0', '-': '−', '=': '+', '+': '+',
  q: 'Q', w: 'W', e: 'E', r: 'R', t: 'T', y: 'Y', a: 'A', s: 'S',
  f: 'F', z: 'Z', x: 'X', c: 'C', v: 'V', l: 'L', p: 'P',
  printscreen: 'PrtSc'
};
const MOD_IDS = new Set(['ctrl', 'cmd', 'win', 'super', 'alt', 'option', 'shift']);

function modKeys() {
  const m = MOD[os] || MOD.win;
  return [
    { id: 'ctrl', lab: 'Ctrl' },
    { id: os === 'mac' ? 'cmd' : os === 'linux' ? 'super' : 'win', lab: m.meta },
    { id: os === 'mac' ? 'option' : 'alt', lab: m.alt },
    { id: 'shift', lab: 'Shift' }
  ];
}

function paintKeyboard(lit, pickable) {
  const kb = $('kb');
  kb.replaceChildren();
  const want = new Set(lit || []);

  function addKey(info, row) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'k' + (info.wide ? ' w-' + info.wide : '');
    b.dataset.k = info.id;
    b.textContent = info.lab;
    if (want.has(info.id)) b.classList.add('lit');
    if (pickable && state.picked.has(info.id)) b.classList.add('picked');
    if (pickable) {
      b.addEventListener('click', () => {
        if (state.resolved) return;
        if (state.picked.has(info.id)) state.picked.delete(info.id);
        else state.picked.add(info.id);
        paintKeyboard(lit, true);
      });
    }
    row.appendChild(b);
  }

  const mods = document.createElement('div');
  mods.className = 'kb-row mods';
  kb.appendChild(mods);
  modKeys().forEach((info) => addKey({ ...info, wide: 'm' }, mods));

  const extras = [...want].filter((id) => !MOD_IDS.has(id));
  if (extras.length) {
    const r = document.createElement('div');
    r.className = 'kb-row';
    kb.appendChild(r);
    extras.forEach((id) => {
      addKey({ id, lab: KEY_LAB[id] || String(id).toUpperCase() }, r);
    });
  }
}

function keysMatch(want) {
  if (!want || !want.length) return false;
  if (state.picked.size !== want.length) return false;
  return want.every((k) => state.picked.has(k));
}

function grade(ok, reveal) {
  if (state.resolved) return;
  const T = S();
  if (ok) {
    state.resolved = true;
    sGood();
    $('qcard').classList.remove('bad');
    $('qcard').classList.add('good');
    $('feedback').textContent = T.good;
    $('feedback').className = 'feedback ok';
    setTimeout(advance, 650);
    return;
  }
  state.tries += 1;
  state.misses += 1;
  sBad();
  $('qcard').classList.remove('good');
  $('qcard').classList.add('bad');
  if (state.tries >= 2) {
    state.resolved = true;
    $('feedback').textContent = T.revealDone(String(reveal));
    $('feedback').className = 'feedback ko';
    setTimeout(advance, 1100);
  } else {
    $('feedback').textContent = reveal != null ? T.reveal(String(reveal)) : T.almost;
    $('feedback').className = 'feedback ko';
  }
}

function advance() {
  state.i += 1;
  if (state.i >= state.queue.length) {
    finish(true);
    return;
  }
  paintChallenge();
}

function starsFrom(misses) {
  if (misses <= 0) return 3;
  if (misses === 1) return 2;
  return 1;
}

function finish(ok) {
  stopTimer();
  state.running = false;
  const m = missionById(state.missionId);
  const T = S();
  if (!ok || !m) {
    failBoss();
    return;
  }
  if (m.isBoss) {
    bossClear = true;
    save();
    FX.play('couronne', 4200);
    sFanfare();
    $('winIcon').textContent = '👑';
    $('winTitle').textContent = T.bossWin(player.name);
    $('winSub').textContent = T.bossSub;
    $('winPraise').textContent = T.winPerfect(player.name);
    $('winStars').textContent = '👑';
    $('winRetry').classList.add('hide');
    $('winContinue').classList.remove('hide');
    show('win');
    return;
  }
  const stars = starsFrom(state.misses);
  beaten[m.id] = Math.max(beaten[m.id] || 0, stars);
  save();
  FX.play(stars === 3 ? 'feu' : stars === 2 ? 'etoiles' : 'confettis', 2600);
  sUp();
  $('winIcon').textContent = '★';
  $('winTitle').textContent = T.winTitle(player.name);
  $('winSub').textContent = T.winSub(m.index);
  $('winPraise').textContent = stars === 3 ? T.winPerfect(player.name) : stars === 2 ? T.winOk(player.name) : T.winPraise(player.name);
  $('winStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('winRetry').classList.add('hide');
  $('winContinue').classList.remove('hide');
  show('win');
}

function failBoss() {
  state.running = false;
  stopTimer();
  sBad();
  FX.clear();
  const T = S();
  $('winIcon').textContent = '⏱';
  $('winTitle').textContent = T.bossFail(player.name);
  $('winSub').textContent = S().bossTitle;
  $('winPraise').textContent = '';
  $('winStars').textContent = '';
  $('winRetry').classList.remove('hide');
  $('winContinue').classList.remove('hide');
  show('win');
}

/* ---------- real keyboard ---------- */
document.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) || '';
  if (isRealKeyboardEvent({ key: e.key, repeat: e.repeat, isComposing: e.isComposing, targetTag: tag })) {
    if (!keyboardSeen || hands !== 'keyboard') {
      keyboardSeen = true;
      hands = 'keyboard';
      save();
      paintHands();
    }
  }
  if (!state.running || state.resolved || e.repeat) return;
  const ch = current();
  if (!ch) return;
  if (ch.type === 'what' || ch.type === 'tf') {
    const n = digitOf(e);
    if (!n) return;
    const took = ch.type === 'what' ? pickAnswer(n - 1) : (n <= 2 && pickTf(n === 1));
    if (took) e.preventDefault();
    return;
  }
  if (ch.type === 'keys') {
    if (e.key === 'Enter') { e.preventDefault(); grade(keysMatch(ch.keys), ch.answer); }
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Escape') {
      e.preventDefault();
      state.picked = new Set();
      paintKeyboard(ch.keys || [], true);
    }
    return;
  }
  if (ch.type !== 'press' || !ch.comboId) return;
  if (matchKeydown(e, ch.comboId, os)) {
    e.preventDefault();
    grade(true, ch.answer);
  } else if (e.ctrlKey || e.metaKey || e.altKey) {
    e.preventDefault();
    const letter = e.key && e.key.length === 1;
    if (letter || e.key === 'Tab' || e.key === '0' || e.key === '-' || e.key === '=' || e.key === '+') {
      grade(false, ch.answer);
    }
  }
});

/* ---------- mouse practice ---------- */
$('mouseTarget').addEventListener('dblclick', (e) => {
  e.preventDefault();
  const ch = current();
  if (!state.running || !ch || ch.mouse !== 'dblclick') return;
  grade(true, ch.answer);
});
$('mouseTarget').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const ch = current();
  if (!state.running || !ch || ch.mouse !== 'contextmenu') return;
  grade(true, ch.answer);
});
$('mouseTarget').addEventListener('click', () => {
  const ch = current();
  if (!state.running || !ch || ch.mouse !== 'dblclick') return;
  /* wait for dblclick */
});

let drag = null;
$('dragStar').addEventListener('pointerdown', (e) => {
  const ch = current();
  if (!state.running || !ch || ch.mouse !== 'drag') return;
  drag = { x: e.clientX, y: e.clientY, moved: false };
  $('dragStar').setPointerCapture(e.pointerId);
});
$('dragStar').addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 8) {
    drag.moved = true;
    $('dragStar').classList.add('away');
  }
});
$('dragStar').addEventListener('pointerup', (e) => {
  if (!drag) return;
  const pad = $('dropPad').getBoundingClientRect();
  const hit = e.clientX >= pad.left && e.clientX <= pad.right && e.clientY >= pad.top && e.clientY <= pad.bottom;
  $('dragStar').classList.remove('away');
  const moved = drag.moved;
  drag = null;
  const ch = current();
  if (!ch || ch.mouse !== 'drag') return;
  grade(hit && moved, ch.answer);
});

$('tfTrue').addEventListener('click', () => pickTf(true));
$('tfFalse').addEventListener('click', () => pickTf(false));
$('keysOk').addEventListener('click', () => {
  const ch = current();
  if (!ch || ch.type !== 'keys') return;
  grade(keysMatch(ch.keys), ch.answer);
});
$('keysClear').addEventListener('click', () => {
  state.picked = new Set();
  const ch = current();
  if (ch) paintKeyboard(ch.keys || [], true);
});

/* ---------- chrome ---------- */
$('oses').addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b) return;
  os = b.dataset.os;
  paintOs();
  paintHands();
  save();
  applyI18n();
});
$('handsPick').addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b) return;
  setHands(b.dataset.hands, true);
});
$('modePick').addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b) return;
  setMode(b.dataset.mode);
});
$('toMap').addEventListener('click', () => {
  const n = $('pname').value.trim();
  player.name = n === '' ? S().champ : n.charAt(0).toUpperCase() + n.slice(1);
  save();
  applyI18n();
  paintMap();
  show('map');
});
$('pname').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('toMap').click(); } });
$('changePlayer').addEventListener('click', () => show('who'));
$('resetQuest').addEventListener('click', () => {
  if (!confirm(S().resetAsk)) return;
  beaten = {};
  bossClear = false;
  save();
  paintMap();
});
$('mapList').addEventListener('click', (e) => {
  const b = e.target.closest('.mission'); if (!b) return;
  openBrief(b.dataset.id);
});
$('briefGo').addEventListener('click', () => begin(state.missionId));
$('briefBack').addEventListener('click', () => { paintMap(); show('map'); });
$('winContinue').addEventListener('click', () => { FX.clear(); paintMap(); show('map'); });
$('winRetry').addEventListener('click', () => { FX.clear(); begin(state.missionId); });

$('langFr').addEventListener('click', () => setLang('fr'));
$('langEn').addEventListener('click', () => setLang('en'));
$('mute').addEventListener('click', function () {
  muted = !muted;
  this.textContent = muted ? '🔇' : '🔊';
  this.setAttribute('aria-label', muted ? S().muteOff : S().muteOn);
  if (!muted) { unlockAudio(); sGood(); }
});

function hardReload() {
  const go = () => location.reload();
  if (!navigator.serviceWorker) return go();
  navigator.serviceWorker.getRegistrations()
    .then((rs) => Promise.all(rs.map((r) => r.unregister())))
    .then(go)
    .catch(go);
}
$('reloadBtn').addEventListener('click', hardReload);
$('reloadLatest').addEventListener('click', hardReload);

async function checkVersion() {
  try {
    const r = await fetch('version.json', { cache: 'no-store' });
    const j = await r.json();
    if (j.version && j.version !== APP_VERSION) $('updateBanner').classList.remove('hide');
  } catch { /* offline */ }
}

$('verNum').textContent = APP_VERSION;
os = detectOS(navigator.userAgent || '', navigator.platform || '');
lang = detectLang();
loadPersisted();
if (!handsForced) hands = detectHandsNow();
restorePlayerUI();
applyI18n();
show('who');
checkVersion();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
