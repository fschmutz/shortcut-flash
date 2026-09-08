import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchKeydown, formatCombo, detectOS, eventFromChord, highlightKeys, isOsEaten, isBrowserEaten, isPressable, detectHands, isRealKeyboardEvent } from '../js/keys.js';
import {
  shuffle,
  mulberry32,
  seedFrom,
  generateMissionChallenges,
  generateBossGauntlet,
  decoysFor,
  pickCopyWord,
  missionTemplateCounts,
  regularMissionIds,
  allFacts,
  COPY_WORDS,
  allowedTypes,
  typingTypesFor,
  isTypable,
  normalizeMode,
  TOUCH_TYPES,
  KEYBOARD_TYPES,
  DO_TYPES,
  MODES
} from '../js/challenges.js';
import { MISSIONS, regularMissions, bossPoolCovers } from '../js/missions.js';
import { STR } from '../js/i18n.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

function ev(partial) {
  return {
    key: 'c',
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    ...partial
  };
}

test('combo matcher: Win copy is Ctrl+C, not Cmd+C', () => {
  assert.equal(formatCombo('copy', 'win'), 'Ctrl+C');
  assert.equal(matchKeydown(ev({ key: 'c', ctrlKey: true }), 'copy', 'win'), true);
  assert.equal(matchKeydown(ev({ key: 'C', ctrlKey: true }), 'copy', 'win'), true);
  assert.equal(matchKeydown(ev({ key: 'c', metaKey: true }), 'copy', 'win'), false);
  assert.equal(matchKeydown(ev({ key: 'c' }), 'copy', 'win'), false);
  assert.equal(matchKeydown(ev({ key: 'v', ctrlKey: true }), 'copy', 'win'), false);
});

test('combo matcher: Mac copy is Cmd+C, not Ctrl+C', () => {
  assert.equal(formatCombo('copy', 'mac'), 'Cmd+C');
  assert.equal(matchKeydown(ev({ key: 'c', metaKey: true }), 'copy', 'mac'), true);
  assert.equal(matchKeydown(ev({ key: 'c', ctrlKey: true }), 'copy', 'mac'), false);
  assert.equal(formatCombo('paste', 'mac'), 'Cmd+V');
  assert.equal(formatCombo('cut', 'linux'), 'Ctrl+X');
});

test('combo matcher ignores key repeats', () => {
  assert.equal(matchKeydown(ev({ key: 'c', ctrlKey: true, repeat: true }), 'copy', 'win'), false);
  assert.equal(matchKeydown(ev({ key: 'c', metaKey: true, repeat: true }), 'copy', 'mac'), false);
});

test('combo matcher: redo alts Win Y and Shift+Z, Mac Shift+Z', () => {
  assert.equal(matchKeydown(ev({ key: 'y', ctrlKey: true }), 'redo', 'win'), true);
  assert.equal(matchKeydown(ev({ key: 'z', ctrlKey: true, shiftKey: true }), 'redo', 'win'), true);
  assert.equal(matchKeydown(ev({ key: 'z', metaKey: true, shiftKey: true }), 'redo', 'mac'), true);
  assert.equal(matchKeydown(ev({ key: 'y', metaKey: true }), 'redo', 'mac'), false);
});

test('combo matcher: save / find / zoom differ by OS', () => {
  assert.equal(formatCombo('save', 'win'), 'Ctrl+S');
  assert.equal(formatCombo('save', 'mac'), 'Cmd+S');
  assert.equal(formatCombo('find', 'linux'), 'Ctrl+F');
  assert.equal(matchKeydown(ev({ key: 's', ctrlKey: true }), 'save', 'win'), true);
  assert.equal(matchKeydown(ev({ key: '=', metaKey: true }), 'zoomIn', 'mac'), true);
  assert.equal(matchKeydown(ev({ key: '+', ctrlKey: true }), 'zoomIn', 'win'), true);
  assert.equal(matchKeydown(ev({ key: '0', ctrlKey: true }), 'zoomReset', 'win'), true);
  assert.equal(matchKeydown(ev({ key: '-', metaKey: true }), 'zoomOut', 'mac'), true);
});

test('combo matcher: lock and screenshot are OS-eaten', () => {
  assert.equal(isOsEaten('screenshot'), true);
  assert.equal(isOsEaten('lock'), true);
  assert.equal(isOsEaten('copy'), false);
  assert.equal(formatCombo('lock', 'win'), 'Win+L');
  assert.equal(formatCombo('lock', 'mac'), 'Cmd+Ctrl+Q');
  assert.equal(formatCombo('screenshot', 'win'), 'Win+Shift+S');
  assert.equal(formatCombo('screenshot', 'mac'), 'Cmd+Shift+4');
  assert.ok(highlightKeys('lock', 'mac').includes('cmd'));
  assert.ok(highlightKeys('lock', 'mac').includes('ctrl'));
});

test('detectOS: Mac / Win / Linux', () => {
  assert.equal(detectOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel'), 'mac');
  assert.equal(detectOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32'), 'win');
  assert.equal(detectOS('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64'), 'linux');
  assert.equal(detectOS('Mozilla/5.0 (iPad; CPU OS 17_0)', 'iPad'), 'mac');
});

test('eventFromChord round-trips through the matcher', () => {
  for (const os of ['win', 'mac', 'linux']) {
    for (const id of ['copy', 'paste', 'undo', 'save', 'find', 'selectAll']) {
      assert.equal(matchKeydown(eventFromChord(id, os), id, os), true, id + ' ' + os);
    }
  }
});

test('shuffle is a permutation and not the identity', () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  let differed = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const out = shuffle(src, mulberry32(seed));
    assert.deepEqual([...out].sort((a, b) => a - b), src);
    if (out.some((v, i) => v !== src[i])) differed += 1;
  }
  assert.ok(differed >= 30, 'shuffle stayed identity too often: ' + differed);
});

test('every regular mission has ≥4 challenge templates', () => {
  const counts = missionTemplateCounts();
  for (const m of regularMissions()) {
    assert.ok(m.facts.length >= 4, m.id + ' has ' + m.facts.length);
    assert.ok(counts[m.id] >= 4, m.id);
    const ch = generateMissionChallenges(m.id, { os: 'win', lang: 'fr', now: 1, name: 'Paloma' });
    assert.equal(ch.length, 4, m.id + ' generated');
  }
});

test('boss pool covers missions 1–11', () => {
  const ids = regularMissionIds();
  assert.deepEqual(ids, [
    'copy', 'undo', 'select', 'save', 'tabs', 'find',
    'zoom', 'windows', 'mouse', 'capture', 'safety'
  ]);
  const covered = bossPoolCovers();
  for (const id of ids) {
    assert.ok(covered.includes(id), 'boss pool missing ' + id);
  }
  const gauntlet = generateBossGauntlet({ os: 'mac', lang: 'en', name: 'Paloma', now: 99 });
  assert.equal(gauntlet.length, 10);
  const gauntlet2 = generateBossGauntlet({ os: 'mac', lang: 'en', name: 'Paloma', now: 100 });
  const same = gauntlet.every((c, i) => c.factId === gauntlet2[i].factId && c.type === gauntlet2[i].type);
  assert.equal(same, false, 'two boss seeds should differ');
});

test('decoys never equal the answer', () => {
  const facts = allFacts();
  for (const os of ['win', 'mac', 'linux']) {
    for (const lang of ['fr', 'en']) {
      for (const fact of facts) {
        const d = decoysFor(fact, os, lang, mulberry32(42), 3);
        assert.equal(d.length, 3, fact.id);
        const does = fact.does[lang] || fact.does.fr;
        for (const x of d) {
          assert.notEqual(x, does, 'decoy equals raw does for ' + fact.id);
          assert.ok(x && x.length > 0);
        }
      }
    }
  }
  for (const m of regularMissions()) {
    const chs = generateMissionChallenges(m.id, { os: 'linux', lang: 'en', now: 7, name: 'Léo' });
    for (const ch of chs) {
      if (ch.type === 'what') {
        assert.equal(ch.options.length, 4);
        assert.ok(ch.options.includes(ch.answer));
        const others = ch.options.filter((o) => o !== ch.answer);
        assert.equal(others.length, 3);
        for (const o of others) assert.notEqual(o, ch.answer);
        for (const d of ch.decoys) assert.notEqual(d, ch.answer);
      }
    }
  }
});

test('press challenges never use OS-eaten or browser-eaten combos', () => {
  /* Ctrl+T / Ctrl+W / Ctrl+Tab cannot be preventDefault-ed: a real press
     would open or close the game tab. They stay quiz / on-screen only. */
  assert.equal(isBrowserEaten('closeTab'), true);
  assert.equal(isBrowserEaten('newTab'), true);
  assert.equal(isBrowserEaten('nextTab'), true);
  assert.equal(isPressable('closeTab'), false);
  assert.equal(isPressable('copy'), true);
  assert.equal(isPressable('lock'), false);

  for (const mode of MODES) {
    for (const hands of ['keyboard', 'touch']) {
      for (const m of regularMissions()) {
        for (let n = 1; n <= 8; n++) {
          const chs = generateMissionChallenges(m.id, { os: 'win', lang: 'fr', now: n, name: 'Paloma', hands, mode });
          for (const ch of chs) {
            if (ch.type === 'press') {
              assert.equal(isPressable(ch.comboId), true, m.id + ' ' + mode + ' ' + ch.comboId);
            }
          }
        }
      }
      for (let n = 1; n <= 12; n++) {
        const g = generateBossGauntlet({ os: 'mac', lang: 'fr', name: 'Paloma', now: n * 17, hands, mode });
        for (const ch of g) {
          if (ch.type === 'press') assert.equal(isPressable(ch.comboId), true, ch.comboId);
        }
      }
    }
  }
});

test('keyboard mix mode is press-first, not a quiz show', () => {
  let press = 0, total = 0;
  for (let n = 1; n <= 40; n++) {
    const chs = generateMissionChallenges('copy', { os: 'win', lang: 'fr', now: n * 31, name: 'Paloma', hands: 'keyboard' });
    for (const ch of chs) { total += 1; if (ch.type === 'press') press += 1; }
  }
  assert.equal(total, 160);
  assert.equal(press / total >= 0.7, true, 'press share on a pressable mission: ' + (press / total));
});

test('typing mode never asks a quiz when the fact can be done', () => {
  assert.equal(normalizeMode('typing'), 'typing');
  assert.equal(normalizeMode('nope'), 'mix');
  assert.equal(normalizeMode(undefined), 'mix');

  for (const fact of allFacts()) {
    for (const hands of ['keyboard', 'touch']) {
      const first = typingTypesFor(fact, hands)[0];
      if (isTypable(fact, hands)) assert.ok(DO_TYPES.includes(first), fact.id + ' ' + first);
    }
  }

  for (const hands of ['keyboard', 'touch']) {
    for (const m of regularMissions()) {
      for (let n = 1; n <= 10; n++) {
        const chs = generateMissionChallenges(m.id, { os: 'win', lang: 'fr', now: n * 13, name: 'Paloma', hands, mode: 'typing' });
        assert.equal(chs.length, 4, m.id);
        for (const ch of chs) {
          assert.ok(DO_TYPES.includes(ch.type), m.id + ' ' + hands + ' got ' + ch.type);
        }
      }
    }
    for (let n = 1; n <= 10; n++) {
      const g = generateBossGauntlet({ os: 'linux', lang: 'en', name: 'Mia', now: n * 7, hands, mode: 'typing' });
      assert.equal(g.length, 10);
      for (const ch of g) assert.ok(DO_TYPES.includes(ch.type), 'boss typing ' + ch.type);
    }
  }
});

test('typing mode on a real keyboard prefers real presses over on-screen keys', () => {
  let press = 0, keys = 0, mouse = 0;
  for (let n = 1; n <= 20; n++) {
    const g = generateBossGauntlet({ os: 'win', lang: 'fr', name: 'Paloma', now: n * 101, hands: 'keyboard', mode: 'typing' });
    for (const ch of g) {
      if (ch.type === 'press') press += 1;
      else if (ch.type === 'keys') keys += 1;
      else if (ch.type === 'mouse') mouse += 1;
    }
  }
  assert.ok(press > keys, `press ${press} should beat on-screen keys ${keys}`);
  assert.ok(mouse > 0, 'mouse gestures still show up');
  /* touch cannot press: it taps the on-screen keyboard instead */
  const touch = generateBossGauntlet({ os: 'win', lang: 'fr', name: 'Paloma', now: 5, hands: 'touch', mode: 'typing' });
  for (const ch of touch) assert.notEqual(ch.type, 'press');
});

test('copy words never repeat twice in a row', () => {
  const rng = mulberry32(3);
  let last = null;
  for (let i = 0; i < 30; i++) {
    const w = pickCopyWord(rng, 'fr', last);
    assert.ok(COPY_WORDS.fr.includes(w));
    if (last !== null) assert.notEqual(w, last);
    last = w;
  }
});

test('seedFrom(name, now) changes when the clock moves', () => {
  assert.notEqual(seedFrom('Paloma', 1), seedFrom('Paloma', 2));
  assert.notEqual(seedFrom('Paloma', 10), seedFrom('Léo', 10));
});

test('MISSIONS linear order is 12 long with a boss last', () => {
  assert.equal(MISSIONS.length, 12);
  assert.equal(MISSIONS[0].id, 'copy');
  assert.equal(MISSIONS[11].id, 'boss');
  assert.equal(MISSIONS[11].isBoss, true);
  MISSIONS.forEach((m, i) => assert.equal(m.index, i + 1));
});

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

test('no age leftovers in player-facing sources', () => {
  const files = [
    'js/app.js', 'js/i18n.js', 'js/challenges.js', 'js/missions.js', 'js/keys.js',
    'index.html', 'package.json', 'manifest.webmanifest'
  ];
  for (const rel of files) {
    const t = readFileSync(join(root, rel), 'utf8');
    assert.equal(t.includes('ageEyebrow'), false, rel + ' ageEyebrow');
    assert.equal(t.includes('ageHint'), false, rel + ' ageHint');
    assert.equal(t.includes('data-age'), false, rel + ' data-age');
    assert.equal(/player\.age/.test(t), false, rel + ' player.age');
    assert.equal(/id="ages"/.test(t), false, rel + ' ages picker');
  }
  for (const lang of ['fr', 'en']) {
    assert.equal(STR[lang].ageEyebrow, undefined);
    assert.equal(STR[lang].ageHint, undefined);
  }
});

test('detectHands: touch vs keyboard rules', () => {
  assert.equal(detectHands({ maxTouchPoints: 0, pointerCoarse: false, keyboardSeen: false, viewportWidth: 390 }), 'keyboard');
  assert.equal(detectHands({ maxTouchPoints: 5, pointerCoarse: true, keyboardSeen: false, viewportWidth: 390 }), 'touch');
  assert.equal(detectHands({ maxTouchPoints: 5, pointerCoarse: false, keyboardSeen: false, viewportWidth: 390 }), 'touch');
  assert.equal(detectHands({ maxTouchPoints: 5, pointerCoarse: false, keyboardSeen: false, viewportWidth: 1200 }), 'keyboard');
  assert.equal(detectHands({ maxTouchPoints: 5, pointerCoarse: false, keyboardSeen: true, viewportWidth: 390 }), 'keyboard');
  assert.equal(detectHands({ maxTouchPoints: 5, pointerCoarse: true, keyboardSeen: true, viewportWidth: 390 }), 'touch');
  assert.equal(isRealKeyboardEvent({ key: 'c', repeat: false, targetTag: 'BODY' }), true);
  assert.equal(isRealKeyboardEvent({ key: 'c', repeat: false, targetTag: 'INPUT' }), false);
  assert.equal(isRealKeyboardEvent({ key: 'c', repeat: true, targetTag: 'BODY' }), false);
});

test('touch hands never emit press; keyboard can', () => {
  const facts = allFacts();
  let keyboardPress = 0;
  for (const fact of facts) {
    const touch = allowedTypes(fact, 'touch');
    assert.equal(touch.includes('press'), false, fact.id + ' touch press');
    for (const t of touch) assert.ok(TOUCH_TYPES.includes(t), fact.id + ' ' + t);
    const kb = allowedTypes(fact, 'keyboard');
    for (const t of kb) assert.ok(KEYBOARD_TYPES.includes(t), fact.id + ' ' + t);
    if (kb.includes('press')) keyboardPress += 1;
  }
  assert.ok(keyboardPress >= 8, 'keyboard should still get press challenges: ' + keyboardPress);

  for (let n = 1; n <= 12; n++) {
    const touchQ = generateMissionChallenges('copy', { os: 'win', lang: 'fr', now: n, name: 'Paloma', hands: 'touch' });
    for (const ch of touchQ) assert.notEqual(ch.type, 'press', 'mission1 touch press');
    const bossT = generateBossGauntlet({ os: 'mac', lang: 'en', name: 'Mia', now: n * 11, hands: 'touch' });
    for (const ch of bossT) assert.notEqual(ch.type, 'press', 'boss touch press');
    const kbQ = generateMissionChallenges('copy', { os: 'win', lang: 'fr', now: n, name: 'Paloma', hands: 'keyboard' });
    for (const ch of kbQ) assert.ok(KEYBOARD_TYPES.includes(ch.type), ch.type);
  }
});

test('20 seeded playthroughs of mission 1 + boss', () => {
  const names = ['Paloma', 'Léo', 'Mia', 'Noah', 'Zoé', 'Hugo', 'Inès', 'Jade', 'Louis', 'Nina'];
  let pass = 0;
  for (let i = 0; i < 20; i++) {
    const name = names[i % names.length];
    const now = 1_700_000_000_000 + i * 86_400_000 + i * 17;
    const hands = i % 2 === 0 ? 'touch' : 'keyboard';
    const os = ['win', 'mac', 'linux'][i % 3];
    const lang = i % 2 === 0 ? 'fr' : 'en';
    const mode = i % 3 === 0 ? 'typing' : 'mix';
    const allowed = hands === 'touch' ? TOUCH_TYPES : KEYBOARD_TYPES;
    const m1 = generateMissionChallenges('copy', { os, lang, name, now, hands, mode });
    const boss = generateBossGauntlet({ os, lang, name, now: now + 3, hands, mode });
    assert.equal(m1.length, 4, 'm1 length ' + i);
    assert.equal(boss.length, 10, 'boss length ' + i);
    for (const ch of [...m1, ...boss]) {
      assert.ok(ch.prompt && String(ch.prompt).trim().length > 0, 'prompt ' + ch.type);
      assert.ok(allowed.includes(ch.type), `type ${ch.type} not allowed for ${hands}`);
      assert.ok(ch.answer !== undefined && ch.answer !== null && ch.answer !== '', 'answer');
      if (ch.decoys) {
        for (const d of ch.decoys) assert.notEqual(d, ch.answer, 'decoy equals answer');
      }
      if (ch.type === 'what') {
        assert.ok(ch.options.includes(ch.answer));
        for (const d of ch.decoys) assert.notEqual(d, ch.answer);
      }
      if (hands === 'touch') assert.notEqual(ch.type, 'press');
      if (mode === 'typing') assert.ok(DO_TYPES.includes(ch.type), 'typing ' + ch.type);
    }
    const types = [...m1.map((c) => c.type), '|', ...boss.map((c) => c.type)].join(',');
    console.log(`run ${String(i + 1).padStart(2, '0')} ${name} ${os} ${hands} ${mode} ${lang} ${types} OK`);
    pass += 1;
  }
  assert.equal(pass, 20);
  console.log('20-run result: ' + pass + '/20');
});
