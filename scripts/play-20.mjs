/** Play 20 missions by answering correctly from the generated queue. */
import { generateMissionChallenges, generateBossGauntlet, TOUCH_TYPES, KEYBOARD_TYPES, DO_TYPES } from '../js/challenges.js';

function play(ch, hands, mode) {
  const allowed = hands === 'touch' ? TOUCH_TYPES : KEYBOARD_TYPES;
  if (mode === 'typing' && !DO_TYPES.includes(ch.type)) return false;
  if (!ch.prompt || !String(ch.prompt).trim()) return false;
  if (!allowed.includes(ch.type)) return false;
  if (ch.answer === undefined || ch.answer === null || ch.answer === '') return false;
  if (ch.decoys) {
    for (const d of ch.decoys) if (d === ch.answer) return false;
  }
  if (ch.type === 'what') {
    if (!ch.options?.includes(ch.answer)) return false;
    const pick = ch.options.find((o) => o === ch.answer);
    return pick === ch.answer;
  }
  if (ch.type === 'tf') return ch.truth === true || ch.truth === false;
  if (ch.type === 'keys') return Array.isArray(ch.keys) && ch.keys.length > 0;
  if (ch.type === 'press') return hands === 'keyboard' && !!ch.comboId;
  if (ch.type === 'mouse') return !!ch.mouse;
  return false;
}

const names = ['Paloma', 'Léo', 'Mia', 'Noah', 'Zoé', 'Hugo', 'Inès', 'Jade', 'Louis', 'Nina'];
let pass = 0;
for (let i = 0; i < 20; i++) {
  const name = names[i % names.length];
  const now = 1_700_000_000_000 + i * 97_331;
  const hands = i % 2 === 0 ? 'touch' : 'keyboard';
  const mode = i % 3 === 0 ? 'typing' : 'mix';
  const os = ['win', 'mac', 'linux'][i % 3];
  const lang = i % 2 === 0 ? 'fr' : 'en';
  const m1 = generateMissionChallenges('copy', { os, lang, name, now, hands, mode });
  const boss = generateBossGauntlet({ os, lang, name, now: now + 1, hands, mode });
  const queue = [...m1, ...boss];
  const ok = queue.every((ch) => play(ch, hands, mode));
  const types = [...m1.map((c) => c.type), '|', ...boss.map((c) => c.type)].join(',');
  console.log(`sim ${String(i + 1).padStart(2, '0')} ${ok ? 'PASS' : 'FAIL'} ${name} ${os} ${hands} ${mode} ${lang} ${types}`);
  if (ok) pass += 1;
}
console.log(`RESULT ${pass}/20`);
process.exit(pass === 20 ? 0 : 1);
