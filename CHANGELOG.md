# Changelog

All notable changes to Reading Stars. Generated from `releases.json`; edit that file, not this one.

## 1.4.0 (2026-10-29): Stars on your Home Screen

- 🏆 **Leaderboard widget**: See the top reader and everyone's stars on the Home Screen without opening the game.
- 🪙 **One player's tokens**: Type a player's name in the widget's Parameter to show just their tokens.
- 🔒 **Safe for kids**: Works offline and on the Lock Screen, and never shows money, budgets or the PIN.

**Changes**

- Home Screen and Lock Screen widget in the shared frame of the other apps (widgets blueprint 1.0.0): the Reading Stars star and name, the top reader with ⭐ points and 🪙 tokens to spend, the other players ranked as on the leaderboard (medium and large) and the number of players
- Widget Parameter: a player's name shows only that player, with their tokens as the big number and their place on the leaderboard
- Lock Screen: "⭐ Ema leads with 120" inline, the leader's points in the circle, the leaderboard line in the rectangle
- The widget follows the game's language (Lithuanian, English, Spanish) and shows only names, avatars, points and tokens: never token values, budgets, payouts or the PIN
- The widget reads a small snapshot saved after every round, payout and player change, so it works offline; data older than 12 hours shows "⟳ Updated …" in amber
- Parent zone › Settings › Widget: how often iOS is asked to refresh it (30 min) and when it counts as out of date (720 min)
- Built with lists the widgets blueprint

**Fixes**

- A widget pointing at Reading Stars no longer shows Scriptable's error ("Presenting a configured web view is not supported"): the game's start-up now runs only when the game is opened

## 1.3.0 (2026-10-29): Read. Match. Shine.

- ⭐ **A logo of its own**: A big yellow star with a sparkle and a teal reading line.
- 🎬 **Launch screen**: The star pops in and the tagline appears for about 2 seconds; tap to skip.
- ✨ **Branded everywhere**: The star sits on top of the home screen and in the README.

**Changes**

- New Reading Stars logo (the big star): docs/logo.svg and a 1024 px app icon, docs/icon-1024.png
- Launch screen shown for 2.4 s with a short animation and the tagline in the game's language (Read. Match. Shine. / Skaityk. Rask. Spindėk. / Lee. Elige. Brilla.); tap to skip; still with Reduce Motion; follows the shared launch-screen blueprint 1.0.0
- The logo replaces the book and star emoji at the top of the home screen, and heads the README
- Built with lists the launch-screen blueprint

## 1.2.0 (2026-10-28): Make it yours

- 🎨 **Colours and a night sky**: Six colour themes for parents to choose, including a calm night sky.
- 🔠 **Bigger or smaller text**: Text size and layout to fit every reader; the game word still fills the card.
- 🎛 **Parent settings in one place**: Letter style, sounds, money, PIN, round sizes and updates, behind the PIN.

**Changes**

- New Settings sheet in the parent zone (sliders icon, behind the PIN): Appearance, Game, Money, Parent, Updates with Check now, Rounds and Built with; changes apply at once, in Lithuanian, English or Spanish
- Appearance shared with the other apps: six palettes plus Auto (the bright Ink look stays the default), Comfortable, Compact or Tiny layout, four text sizes, rounded or serif headings
- Night and Slate palettes give the game a night sky; picture tiles, syllable colours and the copybook word card stay the same in every palette
- Tiny layout: one line per player on the leaderboard and in the parent zone; tap a player for the details. The game screen is unchanged
- Pictures per round can be set: Beginner 2–4 (3), Expert 3–5 (5)
- Letter style, currency and sounds move from data.json to settings.json in the same folder, automatically; players, tokens, budgets and the PIN stay in data.json
- Built with: the blueprints this app follows, with links to read them

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
