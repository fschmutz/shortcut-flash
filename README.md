<div align="center">

# Raccourcis Flash

**Une quête. Des missions. Un boss. Les raccourcis clavier, expliqués comme tu as 12 ans.**
**One quest. Several missions. A boss. Keyboard shortcuts, explained like you are 12.**

[![Live](https://img.shields.io/badge/live-fschmutz.github.io-6C3BFF?style=for-the-badge)](https://fschmutz.github.io/shortcut-flash/)
[![License: MIT](https://img.shields.io/badge/license-MIT-FFE566?style=for-the-badge)](LICENSE)
[![Privacy](https://img.shields.io/badge/privacy-nothing_uploaded-0D0624?style=for-the-badge)](https://github.com/fschmutz/shortcut-flash/wiki/Privacy)
[![Wiki](https://img.shields.io/badge/wiki-how_it_works-C8FF2E?style=for-the-badge)](https://github.com/fschmutz/shortcut-flash/wiki)

<img src="assets/hero.png" alt="Raccourcis Flash — prénom Paloma, situation téléphone ou clavier, C'EST PARTI" width="920">

<img src="assets/mascot.png" alt="Raccourcis Flash — keycap hero with a cape" width="360">

**[Ouvrir le jeu / Open the live app →](https://fschmutz.github.io/shortcut-flash/)**
· [wiki](https://github.com/fschmutz/shortcut-flash/wiki)

</div>

Borne d’arcade. Prénom Paloma, Windows / Mac / Linux, téléphone ou vrai clavier (on détecte, tu corriges). Campagne linéaire, quatre défis mélangés, un boss chronométré. Mode « que des touches » : plus de QCM, tu fais le raccourci pour de vrai. Sur téléphone tu tapes les touches à l’écran. Rien n’est envoyé.

Arcade cabinet. First name Paloma, Windows / Mac / Linux, phone or real keyboard (we detect, you override). Linear campaign, four shuffled challenges, a timed boss. On a phone you tap the keys on the screen. Nothing is uploaded.

Le français est la langue par défaut (et si `navigator.language` commence par `fr`). L’anglais s’allume si le navigateur est en `en`, et c’est un bouton. Seuls la langue, le joueur, l’OS et les missions battues vont dans `localStorage`.

French is the default (and if `navigator.language` starts with `fr`). English turns on if the browser is `en`, and it is a toggle. Only language, player, OS, and beaten missions go to `localStorage`.

## Why this one

Most “learn shortcuts” pages are adult cheat-sheets, pull Google Fonts, and never let a kid *press* the combo. This one is a quest: missions you cannot skip, a drawn keyboard that lights up, a boss that shuffles the whole pool, and **no upload**. Fonts are self-hosted woff2. CSP is `default-src 'self'`.

## What it does not

- Install shortcuts into the operating system.
- Read your files, or take a real screenshot.
- Force the real right-click menu (we detect the events we can, and explain the rest).
- Teach adult threat-modeling. Safety express is kid-serious, not scary.

## Missions

| # | FR | EN |
| --- | --- | --- |
| 1 | Copier-coller | Copy-paste |
| 2 | La machine à remonter le temps | The time machine |
| 3 | Tout prendre | Take it all |
| 4 | La pierre de sauvegarde | The save stone |
| 5 | Les onglets | The tabs |
| 6 | La loupe | The magnifier |
| 7 | Les yeux zoom | Zoom eyes |
| 8 | Changer de fenêtre | Switch window |
| 9 | Astuces de souris | Mouse tricks |
| 10 | Capture | Screenshot |
| 11 | Sécurité express | Safety express |
| 12 | BOSS — Le Grand Mélange | BOSS — The Grand Mix |

Four randomized challenges per mission (press / what-does / which-keys / true-false). Two modes: **Mixed** (on a real keyboard, 3 of 4 are a real press) and **Keys only** (no multiple choice at all — you do the move every time). Quiz answers are keyboard-driven too: 1–4 pick an answer, Enter submits a which-keys challenge. Decoys from other missions. Copy words never repeat twice in a row. Screenshots and lock stay quiz — the OS would steal the keys; so do Ctrl+T / Ctrl+W / Ctrl+Tab, which the browser refuses to let go of. The boss is 10 items from missions 1–11, seed `Date.now()+name`.

## Privacy

No analytics, cookies, Sentry, Google, or CDN at runtime. Fonts are self-hosted woff2 (Bungee, Fredoka, DM Mono — OFL). CSP is `default-src 'self'` with `connect-src 'self'` (service worker). Details: [wiki/Privacy](https://github.com/fschmutz/shortcut-flash/wiki/Privacy).

## Run it locally

```bash
python3 -m http.server 8080
# http://localhost:8080
```

```bash
node --test test/challenges.test.mjs
```

If the live page looks stale after a new push, tap **Reload latest version** in the footer (or hard-refresh). The service worker otherwise keeps an old build.

## License

MIT. Copyright (c) 2026 [Falco Schmutz](https://github.com/fschmutz).
