# Changelog

All notable changes to Reading Stars. Generated from `releases.json`; edit that file, not this one.

## 1.9.0 (2026-11-01): Choose the voice

- 🗣️ **Choose the voice**: Any iPhone voice, or an ✦ OpenAI voice that also reads Lithuanian, with model and style.
- 🔤 **Words as long as you like**: Set the shortest and longest word for each level, in syllables.
- 🔊 **The word stays clear**: The listen button now sits under the word, never on top of a letter.

**Changes**

- Settings › Listening (app-blueprints · read-aloud 1.0.1): iPhone voice or ✦ AI voice. iPhone: a voice per game language (Automatic picks the best one), the game language's voices first, Female/Male filter, speed and pitch. AI (OpenAI key): speech model (gpt-4o-mini-tts, tts-1-hd, tts-1 or any your key can use), voice with Female/Male filter, How it should sound, speed; Test the voice
- The AI voice names the word's language in its instructions, so Lithuanian and Spanish words are pronounced as such; each word's audio is kept on the phone and paid for once per voice, model, speed and style; usage counted as Read aloud
- If the AI voice fails, the word is read by the iPhone voice
- Settings › Rounds: shortest and longest word for Beginner (1–2) and Expert (3–6), 1–6 syllables; level cards, book-word status and the AI coach follow the ranges
- The 🔊 button is in its own row under the word card, larger

**Fixes**

- The 🔊 button covered the last letters of the word

## 1.8.2 (2026-11-01): Every book word gets played

- 🔤 **No word left out**: Book words with a rare first letter play too, with pictures from nearby letters.
- 🔍 **See why**: Before adding, each word says if it will play, and if not, why.
- 📚 **Words in rounds**: Each book shows how many of its words are in rounds; tap to see every word.

**Changes**

- Words from books and the AI coach always play: when few words share their first letter, the other pictures come from the nearest letters (Z → Ž…), same letter first. Built-in words keep the strict same-letter rule
- Review sheet: each word shows its level (🐣/🦉) and, under the list, "3 of 4 words in rounds" with the reason for every word that won't play yet (book words Off, another language, no player at that level) or gets nearby-letter pictures
- Parent zone › Words from books: "12 of 15 words in rounds" per book, and Show the words lists every word with its status

**Fixes**

- Book words starting with a letter that has few game words (Lithuanian Z, I, H, Ū…) were saved but never shown in a round

## 1.8.1 (2026-11-01): Book photos, fixed

- 📷 **Photos open again**: Take a photo and From photos open the iPhone's picker on top of the game.
- ⭐ **Books on top**: Words from books is the first card in the parent zone, highlighted with AI on.
- 🧠 **Fairer word order**: Skipped words no longer count as hard, so new words keep coming.

**Changes**

- Words from books is the first card in the parent zone; with an AI key it has an accent border and a ✦ AI badge
- The book photo is now picked by the game page with the iPhone's own picker (camera for Take a photo, library for From photos), shrunk on the phone to 1568 px and handed to the Scriptable side directly instead of through Scriptable's photo picker

**Fixes**

- Take a photo and From photos did nothing: Scriptable's photo picker opened behind the full-screen game, out of reach
- Smart word order: a word that was only skipped counts as a new word, not a hard one, so skipping doesn't crowd out new words or the really hard ones

## 1.8.0 (2026-10-31): Learns with your kid

- 📷 **Words from your books**: Snap a page and AI turns its words into new picture rounds.
- 🧠 **Practises what's hard**: Hard words come back more often, and an AI coach picks what to practise next.
- 🔊 **Hear the word**: Each kid can hear the word when it appears or after answering.

**Changes**

- Words from books (parent zone): take a photo of a page or pick one from Photos; AI reads it and suggests picturable nouns in dictionary form, split into syllables, each with an emoji; the parent reviews and names the source before the words join the game
- Book word sources listed in the parent zone with two-tap delete; Settings › Learning › Book words in the game: Mixed in, First or Off
- Smart word order (Settings › Learning, on by default, no AI): per-kid, per-word spaced repetition; hard words come back more often, mastered ones rarely
- AI coach per kid: a short tip for the parent, up to 8 focus words and up to 12 new words aimed at the letters the kid finds hard; runs after every 40 answered words (What AI does) or on Ask the AI coach; sends word progress only, never names
- Read words aloud per kid (Off, When shown, After answer) with a 🔊 replay button on the word card; the iPhone's voices, Scriptable Speech as a fallback; Settings › Learning says whether a voice for the game's language is installed
- AI settings (app-blueprints · ai-configuration 1.0.0) in Settings › Learning: Claude or OpenAI, keys only in the iOS Keychain, model menu, Test connection, token usage by feature, model and day
- Anonymous usage (if on): app_open now says whether an AI key is set (ai_key)

**Fixes**

- Hard words are counted from real mistakes only, so skipping words doesn't slow down new words

## 1.7.0 (2026-10-31): Anonymous usage, if you agree

- 📊 **Help shape Reading Stars**: If you agree, Reading Stars sends anonymous counts of the features you use. Nothing else.
- 🔒 **Anonymous by design**: A random ID made on your phone, never your content, names or accounts.
- 🎛️ **Your choice, any time**: Settings › Privacy turns it on or off, and Send test shows what happened.

**Changes**

- Anonymous usage analytics (app-blueprints · usage-analytics 1.1.0): opt-in, anonymous counts to PostHog's US cloud, with a one-time question and Settings › Privacy (switch and Send test)
- Events: app_open (layout, theme, language, players), round_finished (level, correct on first try), payout_made, player_added, app_updated
- Never sent: names, avatars, words, tokens, money or the PIN

## 1.6.0 (2026-10-31): Clearer Settings

- 🗂️ **Sections you can see**: Each Settings section now sits in its own card, so you can tell where it starts and ends.
- 🔤 **Quieter headings**: Section names are small grey capitals, so they no longer look like settings.
- 🎨 **In every palette**: The cards follow your colours, text size and layout, light or dark.

**Changes**

- Settings (app-blueprints · settings 1.1.0): each section's rows sit in one card, with a thin border and a slightly lighter background, under a small muted uppercase heading
- The changed-count line and a section's explanation sit outside the cards; Built with is a card too

## 1.5.0 (2026-10-30): Opens every time

- 🚀 **No more blank screen**: Reading Stars opens straight to its star, even from the widget or after a few quick taps.
- 🛡️ **Stars stay safe**: If iCloud is slow, the game waits for your players and never saves an empty game over them.
- 📝 **Start-up log for parents**: Settings › Updates › Start-up log shows what happened the last times the game opened.

**Changes**

- Safe start-up (app-blueprints recipe safe-startup 1.1.0): an empty window in the launch screen colour comes up first, the launch screen is built inside it, and the players are read and handed over after that, with a "Loading your players…" placeholder until they arrive
- Only settings.json is read before the window; data.json (and its backup) is read in loadData(), and every iCloud read gives up after 10 s instead of waiting forever
- The players reach the page in pieces (window.__parts, then window.__boot) instead of inside the page itself, and every message to the page has a time limit
- One window at a time: quick taps on the widget wait at most 1.5 s for an earlier window, then open anyway
- The update check starts 3.5 s after the first screen and the widget icon download 6 s after it, so neither competes with opening
- If opening stalls for 25 s or fails, the page says so in the game's language and shows the last lines of the start-up log
- Settings › Updates › Start-up log (behind the parent PIN) shows the last 40 lines: timings, the number of players and the names of late or started-fresh files only, never money, budgets or the PIN
- The one-time move of letter style, currency and sounds from data.json into settings.json now happens after the data is read, and only if it was read
- A data.json that arrived damaged no longer stops the game from saving: it is copied aside as data.broken-<time>.json, the backup takes its place as before, and if the backup is damaged too the game starts fresh, says so in the game's language and saves again (safe-startup 1.1.0)
- Only a file that iCloud didn't deliver (or that couldn't be read at all) is left unsaved for the run

**Fixes**

- Opening Reading Stars from its widget, after several quick taps, or with slow or offline iCloud could leave a blank screen
- If iCloud hadn't delivered data.json in time, closing the game could save an empty game over the players' tokens and points; now nothing is saved until the data has been read

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
