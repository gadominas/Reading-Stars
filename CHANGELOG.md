# Changelog

All notable changes to Reading Stars. Generated from `releases.json`; edit that file, not this one.

## 1.1.0 (2026-10-27): Never miss an update

- 🔔 **Update reminders**: The game tells you when a new version is out, and waits two days if you tap Later.
- ⬆️ **One-tap update**: Update right from the game. No need to run the installer again.
- ✨ **See what's new first**: Every update shows its three best features before you install it.

**Changes**

- Update check on start, with an update sheet in Lithuanian, English and Spanish
- Update now downloads the new script over the running one; Later hides the offer for 2 days
- The update sheet appears only on the home screen, never during a round
- Version number on the home screen and in the parent zone
- CONFIG.CHECK_UPDATES switch to turn update checks off
- releases.json, CHANGELOG.md, tools/changelog.js and docs/RELEASING.md

## 1.0.0 (2026-10-21): Reading Stars is here

- 📚 **Read and tap**: Big syllable-split words with 3 or 5 pictures that all start with the same letter.
- 🪙 **Tokens worth real money**: +1 for a correct read, −1 for a wrong tap, shown as pocket money in a big wallet.
- 🔒 **Parent zone**: Set each kid's token value and hidden budget, top up and pay out behind a PIN.

**Changes**

- Picture-and-word reading game for Scriptable with Lithuanian, English and Spanish (about 190–200 words each)
- Beginner (ages 4–6): 1–2 syllables, 3 pictures; Expert (ages 9–11): 3–6 syllables, 5 pictures
- All pictures in a round start with the word's first letter
- Kid profiles with name, level and avatar; leaderboard with podium and all-time points
- +1 token for a correct first try, −1 for each wrong tap (never below 0)
- Big animated wallet showing tokens and their money value
- Parent zone behind a 4-digit PIN: per-kid token value, hidden budget, top-ups, payouts and history
- Kids are told to ask for a top-up when the budget can't cover their tokens
- Word letter style, currency and sound settings
- One-line installer (install.js)

**Fixes**

- Black screen on start caused by the old save loop
- Parent zone could not open after adding a player in the same session
