# How it works · Comment ça marche

<div align="center">

<img src="https://raw.githubusercontent.com/fschmutz/shortcut-flash/main/assets/mascot.png" alt="Raccourcis Flash" width="200">

</div>

### Français

Une quête linéaire. Mission 2 reste fermée tant que la 1 n’est pas clear. Chaque mission : un texte comme tu as 12 ans, puis 4 défis piochés dans un plus grand tas.

**Types de défis.** (a) Appuie sur le vrai combo (keydown, les répétitions sont ignorées) — jamais sur téléphone : là tu tapes les touches allumées. (b) « Que fait ce combo ? » — 4 réponses. (c) « Quelles touches ? » — tu les choisis sur le clavier dessiné. (d) Vrai / faux. Les leurres viennent des autres missions. Les phrases de copie changent (jamais le même mot deux fois de suite).

**Deux modes.** *Mélange* : sur un vrai clavier, 3 défis sur 4 sont un vrai appui, le dernier est une question. *Que des touches* : plus aucune question à choix — tu fais le geste à chaque fois (vrai appui, ou clavier dessiné quand l’ordi vole les touches, ou souris). Sur téléphone, « que des touches » = tu tapes le combo sur le clavier dessiné.

**Le clavier répond aussi aux questions.** Sur un vrai clavier, les réponses sont numérotées : 1, 2, 3 ou 4 (1 = Vrai, 2 = Faux). Sur un défi « quelles touches ? », Entrée valide et Retour arrière efface. Le pavé numérique et l’AZERTY marchent : on lit `event.code`, pas la lettre imprimée.

**Captures et verrou.** On ne te demande pas d’appuyer : l’ordi vole Win+Shift+S, Cmd+Shift+4, Win+L, Cmd+Ctrl+Q. Ces-là restent des questions.

**Onglets.** Pareil pour Ctrl+T, Ctrl+W et Ctrl+Tab : le navigateur les garde pour lui et refuse `preventDefault`. Un vrai appui fermerait le jeu. On les enseigne, on ne les fait pas appuyer.

**Souris.** Double-clic, clic droit, glisser : on détecte les événements dans la page. On ne peut pas forcer le vrai menu de l’ordi.

**Boss.** 90 secondes, 10 épreuves mélangées depuis les missions 1–11. Graine = `Date.now() + prénom`. Deux parties ne se ressemblent pas. Couronne si tu dégages.

**Son et feu d’artifice.** Bips Web Audio (débloqués au premier tap, iOS). Canvas indigo / lime / banana. `prefers-reduced-motion` coupe les particules.

**Sauvegarde.** Un seul `localStorage` : prénom, OS, mains (téléphone ou clavier), mode (mélange ou que des touches), langue, missions battues, étoiles.

### English

A linear quest. Mission 2 stays locked until 1 is clear. Each mission: copy as if you are 12, then 4 challenges drawn from a larger pool.

**Challenge types.** (a) Press the real combo (keydown, repeats ignored) — never on a phone: there you tap the glowing keys. (b) “What does this combo do?” — 4 answers. (c) “Which keys?” — pick them on the drawn keyboard. (d) True / false. Decoys come from other missions. Copy words change (never the same word twice in a row).

**Two modes.** *Mixed*: on a real keyboard, 3 challenges out of 4 are a real press, the last one is a question. *Keys only*: no multiple choice at all — you do the move every time (real press, or the drawn keyboard when the computer steals the combo, or the mouse). On a phone, “keys only” means you tap the combo on the drawn keyboard.

**The keyboard answers questions too.** On a real keyboard the answers are numbered: 1, 2, 3 or 4 (1 = True, 2 = False). On a “which keys?” challenge, Enter submits and Backspace clears. Numpad and AZERTY both work: we read `event.code`, not the printed letter.

**Screenshots and lock.** We do not ask you to press them: the computer steals Win+Shift+S, Cmd+Shift+4, Win+L, Cmd+Ctrl+Q. Those stay questions.

**Tabs.** Same for Ctrl+T, Ctrl+W and Ctrl+Tab: the browser keeps them and refuses `preventDefault`. A real press would close the game. We teach them, we never make you press them.

**Mouse.** Double-click, right-click, drag: we detect the events in the page. We cannot force the real OS menu.

**Boss.** 90 seconds, 10 trials shuffled from missions 1–11. Seed = `Date.now() + name`. No two runs look the same. Crown if you clear it.

**Sound and fireworks.** Web Audio beeps (unlocked on first tap, iOS). Canvas indigo / lime / banana. `prefers-reduced-motion` skips particles.

**Save.** One `localStorage` key: name, OS, hands (phone or keyboard), mode (mixed or keys only), language, beaten missions, stars.
