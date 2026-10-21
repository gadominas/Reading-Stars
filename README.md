# Reading Stars ⭐ (Skaitymo žvaigždės)

A picture-and-word reading game for kids, built as a single [Scriptable](https://scriptable.app) script for iPhone/iPad.

A word is shown big and split into syllables (**Na-mas**, **Kar-vė**, **He-li-cop-ter**). The kid reads it and taps the matching picture. All pictures start with the same letter as the word, so the kid has to actually read it.

## Features

- **Languages:** Lithuanian 🇱🇹, English 🇬🇧, Spanish 🇪🇸 (~190–200 words each)
- **Levels**
  - Beginner (4–6 years): words with 1–2 syllables, 3 pictures
  - Expert (9–11 years): words with 3–6 syllables, 5 pictures
- **Tokens:** +1 for a correct first try, −1 for every wrong tap (never below 0)
- **Kid profiles:** name, level and avatar
- **Leaderboard:** podium and all-time points, kept even after tokens are paid out
- **Money:** per-kid token value (e.g. 1 🪙 = 0,10 €). Kids see a big animated wallet showing tokens and what they are worth
- **Parent zone (4-digit PIN)**
  - Pay out tokens (per kid) from a hidden per-kid budget
  - Top up budgets; kids are told to ask for a top-up when the budget runs low
  - Edit / delete players, set word letter style (Na-mas / NA-MAS / na-mas), sounds, currency, change PIN
- Confetti, chimes and animations for correct answers

## Install

1. Install **Scriptable** from the App Store.
2. Create a new script, paste the contents of [`Reading Stars.js`](Reading%20Stars.js) and name it *Reading Stars*.
3. Run it. Optionally add it to the Home Screen from the script's settings.

## Data

Progress is saved to `iCloud Drive › Scriptable › ReadingStars › data.json` (with `data.backup.json` next to it), or to local Scriptable storage if iCloud is off.

Forgot the parent PIN? Remove the `pinHash` value from `data.json` and set a new PIN on next launch.
