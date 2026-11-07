# Changelog

All notable changes to Reading Stars. Generated from `releases.json`; edit that file, not this one.

## 1.19.0 (2026-11-07): Built with, explained

- 🧩 **Know what's inside**: Tap any blueprint in Settings › Built with to see what it is, what it does, what it drives and why it matters.
- 📴 **Works offline**: The descriptions come with Reading Stars, so they open instantly, with or without a connection.
- 🔗 **No dead links**: Built with no longer sends you to web pages you can't open.

**Changes**

- Settings 2.0.1: Settings › Built with opens an About sheet for each blueprint (What it is, What it does, What it drives, Why it matters) from text bundled in the script (BLUEPRINT_ABOUT), plus an About blueprints row; the links to the private blueprints repository are gone
- About text in Lithuanian and Spanish as well, following the game's language
- Blueprint trace: Stability patterns 1.0.2, In-app updates 1.1.1, AI configuration 1.0.2, Launch screen 1.0.2, Widgets 1.2.1, Sound in silent mode 1.0.2, Anonymous usage analytics 1.1.1 (About sections, no code change)
- Tests: the testkit opens Settings through the parent PIN (tests/app.config.js)

**Fixes**

- Tapping a blueprint in Settings › Built with opened a page that no longer exists (404)

## 1.18.7 (2026-11-07): A widget for the iPhone app

- ⭐ **Leaderboard on the Home Screen**: The iPhone app's own widget shows the top reader and everyone's stars, like here.
- 🔒 **Still nothing private**: Widgets show names, stars and tokens only: never money, budgets or the PIN.
- ✅ **Same game**: In Scriptable the widget and the game work exactly as before.

**Changes**

- Widgets 1.2.0: in a native shell (config.runsInNativeShell), runWidget() hands the model, name, accent, words and the two widget tunables to Script.setWidget() as plain JSON and draws nothing; BuildIt's native widget draws the same frame from it. Scriptable is unchanged
- Tests: testkit 1.1.0 (testing-v1.1.0), whose widgets pack checks the native-shell hand-over

## 1.18.6 (2026-11-07): Checked behind the scenes

- ✅ **Checked on every change**: Every change now runs the shared app tests: start-up, widget, updates and usage counts.
- 🧩 **Up-to-date building blocks**: Settings › Built with shows the newest versions of the shared parts Reading Stars is made of.
- ⭐ **Same game**: Players, stars and tokens stay just as they were; kids play exactly as before.

**Changes**

- Testing recipe: the app-blueprints testkit (lint and five conformance packs, plus the three tests/cases in legacyCases mode) runs on every push (.github/workflows/tests.yml); docs/TESTING.md says how to run it
- Portable bridge recipe 1.0.0 (since 1.18.4, reference implementation): docs/BLUEPRINTS.md now links its tag
- Blueprint trace: Stability patterns 1.0.1, AI configuration 1.0.1, Launch screen 1.0.1, Widgets 1.1.1 (the optional 1.1.0 parts aren't adopted), Sound in silent mode 1.0.1

## 1.18.5 (2026-11-07): Ready for the App Store

- 📱 **Updates the right way**: As an App Store app, Reading Stars gets new versions from the App Store only.
- ⚙️ **Settings say where**: There, Settings › Updates says new versions come through the App Store or TestFlight.
- 🔄 **Scriptable unchanged**: In Scriptable, updates are offered and installed just as before.

**Changes**

- In-app updates 1.1.0 (Step 8): in a native shell (config.runsInNativeShell, BuildIt) there's no update check, the installer refuses before downloading anything, and Settings › Updates says new versions come through the App Store (or TestFlight) instead of Offer new versions and Check for updates now; the Start-up log stays
- In Scriptable nothing changes
- Records: the BLUEPRINTS block and Settings › Built with show In-app updates 1.1.0; docs/BLUEPRINTS.md lists the portable-bridge recipe (since 1.18.4)
- A test harness (tests/, modelled on Stockit's) runs the real script with Scriptable stubbed: start-up, updates in Scriptable, and updates in a native shell; see docs/TESTING.md

**Fixes**

- In a native shell the app would have offered, downloaded and installed updates from GitHub, which App Store apps must not do

## 1.18.4 (2026-11-06): Ready for the iPhone app

- 📲 **Ready for the iPhone app**: The same game can now also run as its own iPhone app.
- 💾 **Saves as before**: Players, tokens and budgets save exactly as they did.
- ✨ **Nothing to relearn**: Every screen looks and works the same as in 1.18.3.

**Changes**

- The page sends messages to Scriptable through the portable-bridge recipe, so the same script also runs in BuildIt's native shell; in Scriptable nothing changes

## 1.18.3 (2026-11-04): Opens on any iPhone

- 📱 **Opens on any iPhone**: Reading Stars opens on iPhones that aren't signed in to iCloud, every time.
- 📥 **Installs on new phones**: The installer works on a brand-new iPhone without iCloud too.
- 🛡 **Updates safely**: Updating can no longer stop on a phone without iCloud.

**Changes**

- iCloud is used only when Scriptable keeps its scripts in iCloud Drive; otherwise everything stays on the phone
- Settings › Built with lists Stability patterns 1.0.0, Settings 1.1.2 and In-app updates 1.0.1

**Fixes**

- On an iPhone not signed in to iCloud, Reading Stars or its installer could still stop with "iCloud is not supported"

## 1.18.2 (2026-11-03): Heard in silent mode

- 🔔 **Plays in silent mode**: Words and game sounds play with the Ring/Silent switch on.
- 🎵 **Music comes back**: A minute and a half after the last sound, other apps' music can play again.
- 🧩 **Shared with your apps**: Settings › Built with lists Sound in silent mode.

**Changes**

- While the game makes sound, it tells iOS it's playing media, so spoken words and sound effects play with the Ring/Silent switch on

**Fixes**

- Spoken words and sound effects were silent with the Ring/Silent switch on

## 1.18.1 (2026-11-01): Readable in every theme

- 🌙 **Dark themes fixed**: Slate and Night: the player cards' boxes are dark now, their text clear.
- 🔍 **Contrast checked**: Every text on the main screens meets the WCAG contrast minimum in all 6 themes.

**Changes**

- The player card's stats, money, read-aloud and coach boxes, the selected level and avatar, and ticked review words use the theme's own surfaces (they were fixed light colours, so dark themes showed light text on light boxes)
- Dark themes: text on the accent purple is dark (selected chips, segments, the AI badge, the sticker counter, primary buttons); money is a light green; warnings use the theme's red
- Green buttons are a deeper green (white text 4.6:1 instead of 2.4:1); the trophy counter is darker
- Ink and Mint's accent purple is a shade deeper (4.7:1), small grey text a touch darker in Ink and lighter in Slate; small purple labels and links are darker in light themes
- A contrast check (WCAG 4.5:1, large text 3:1) of home, PIN, parent zone, Settings, leaderboard, game and album passes in all six themes

**Fixes**

- In the Slate and Night themes, white text on light boxes in the parent zone was nearly invisible

## 1.18.0 (2026-11-01): A trophy for a golden album

- 🏆 **Golden album, big trophy**: Make every sticker gold to win a trophy, with a big celebration.
- 📒 **Then a new album**: Trophies stay forever; a fresh album starts so collecting never ends.

**Changes**

- When the last sticker turns gold, a trophy celebration follows its reveal: rays, gold confetti, 'Golden album complete!', 'Trophy #N', and a spoken cheer with the kid's name (Lithuanian vocative); a tap closes it, the next word waits for it
- Trophies (dates) are kept per player (stickers.trophies); the album then starts afresh as Album #N+1
- 🏆 count on the sticker shelf, a trophy row in the album, 🏆 on the home card
- A full album shows gold progress (30 of 60 gold, a gold bar) and the goal: make them all gold for a trophy

## 1.17.1 (2026-11-01): Bubbles stay with their sticker

- 💬 **Follows when you scroll**: A sticker's speech bubble now moves with it when the album or shelf scrolls.

**Changes**

- A sticker's speech bubble (and the AI thinking bubble) is re-placed on every scroll of the album, the sticker shelf or the page, and on resize
- While its sticker is scrolled out of view the bubble hides, and it comes back when the sticker does
- The bubble's listeners are removed with it

**Fixes**

- The speech bubble stayed where the sticker was when the album was scrolled

## 1.17.0 (2026-11-01): Words in Settings, a shortcut up front

- 📚 **New words, one tap away**: The parent zone opens with a card to scan a page or type words.
- ⚙️ **Collections in Settings**: All word collections now live in Settings › Learning.
- ✦ **AI badge in full view**: The ✦ AI badge now sits on top of the word card, never cut off.

**Changes**

- The Words from books section (scan buttons, collections with In the game and By level, word lists, ✏️ and ➕) moved to Settings › Learning, under Only my words
- The parent zone starts with a call to action: New words to read! with 📷 Take a photo, 🖼️ From photos (with an AI key) and ✍️ Add words yourself, plus Word collections & settings › (with a summary) that opens Settings at the collections
- The ✦ AI badge sits on a wrapper above the word card (the card clips its lined paper), straddling its top edge: whole, on top, clear of the word
- Taps in the Settings sheet's word collections run the game's own actions; the review and word editor open above the sheet, and the sheet keeps its place

**Fixes**

- The ✦ AI badge was cut off by the word card

## 1.16.0 (2026-11-01): Learn exactly these words

- 📚 **Only my words: a switch**: Its own switch now, off until you turn it on.
- 📏 **By level, per collection**: Off: every word plays for every child. On: each level's word length.

**Changes**

- Only my words is a switch of its own (settings.onlyMine), off by default, in the Words from books card and Settings › Learning; Book words in the game is back to Mixed in, First, Off. Families on 1.15's Only mine keep it on
- Each collection has a By level switch next to In the game: off = every word plays for every player at any length; on = the level's syllable range from Settings › Rounds. Your scans and lists start off, AI-coach lists start on
- With Only my words on, the card lists how many of each player's words fit, and the mode choice steps aside

## 1.15.0 (2026-11-01): Your words only

- 📚 **Only your words**: Read only your scanned and added words; built-in words just fill the pictures.
- ⏸ **Pause any book**: A switch on each book takes its words out of the game and back.
- ✦ **See when AI chose**: A small ✦ AI badge on the word when the AI coach picked it.

**Changes**

- A fourth choice for book words, Only mine (Tik mano, Solo míos): rounds read only words from your books, your own list and this kid's AI coach; built-in words only fill the other pictures; when none of a kid's words fit their level, built-in words are read with a one-time note
- The Words from books card has the choice too (Skaitomi žodžiai), with how many of each player's words fit; also in Settings › Learning
- Each book has an In the game switch: a paused book's words leave rounds and pictures, and it shows paused · 0 of N
- ✦ AI badge on the word card when the AI coach chose the word (a focus word it asked to practise, or a word it added); tap it to see why
- The PIN screen is locked in place (no scrolling) and fits small iPhones
- The Words from books card's buttons sit in one grid with room for their shadows (✍️ no longer overlaps the photo buttons)

**Fixes**

- ✍️ Add words yourself overlapped the photo buttons
- The PIN screen could scroll

## 1.14.0 (2026-11-01): Every word, your way

- 🦉 **Expert: no length limit**: Expert words can now be as long as they come.
- 📷 **Scans keep every word**: A book photo now brings every word; ones without a picture wait for one.
- ✏️ **Fix or add words**: Correct any word or its picture, or add your own words, AI or not.

**Changes**

- Settings › Rounds › Longest word, Expert: a new top step, No limit (Be ribos, Sin límite), now the default; Expert level cards read 3+ syllables
- Book scans: the AI is asked for every word a child could read (nouns, verbs, adjectives; no cap, any length), with the closest emoji or none; the page keeps all of them (up to 12 syllables), and words without a picture are shown unticked until one is chosen
- Word editor (✏️) in the scan review and in the parent zone's word lists: fix the spelling, the syllables (type - between them, or they are split automatically for Lithuanian, English and Spanish), the picture, or remove the word; duplicates and non-letters are refused
- ➕ Add a word in the review and in each book's list; ✍️ Add words yourself in the parent zone, without AI or a photo (a My words source)
- The Words from books card is always in the parent zone; without an AI key it offers adding words by hand
- Book photo answers get 8000 tokens (room for every word) and keep up to 2500 characters of the page text

## 1.13.0 (2026-11-01): Stickers talk with AI

- ✦ **Fresh lines from AI**: With an AI key, AI writes what each sticker says, new every couple of days.
- 🔊 **Said in the AI voice**: With an OpenAI key the AI voice says it; otherwise the iPhone voice.
- 🔒 **No names to AI**: Lines are written without the kid's name; it is added on the iPhone.

**Changes**

- Talking stickers: with an AI key and the new AI › What AI does › Talking stickers switch (on by default), a tapped sticker asks AI for 6 lines in the game's language (one request per sticker and language, kept on the iPhone for 2 days, shared by all kids) and takes them in turn
- Lines use a {NAME} placeholder that the page fills in (Lithuanian vocative); the AI never gets the kid's name; links, empty and long lines are dropped
- Voice: with an OpenAI key the line is said in the AI character voice (even when words use the iPhone voice); otherwise the iPhone voice
- Falls back to the built-in line when AI is off, has no key, fails, or takes longer than 8 s (a late answer is kept for the next tap); a thinking bubble shows while the line is written
- Token usage lists the new feature as Talking stickers

## 1.12.0 (2026-11-01): Stickers say hello

- 🐸 **Tap a sticker**: It greets the kid by name and makes its sound: Hi, Ema! Ribbit ribbit!
- 🌈 **Funny lines too**: Stickers without a sound say something funny: I'm every color at once!

**Changes**

- Every sticker on the shelf and in the album can be tapped: it bounces, shows a speech bubble and says it out loud (sounds on) in the game's voice
- 60 sticker lines in EN, LT and ES: animal and object sounds (Kva kva!, RAWR!, Ba-dum-tss!) or a short funny line (🌈, 🏰, 🧩); the parrot repeats the kid's name
- Lithuanian greetings use the vocative: Gediminas → Gediminai, Paulius → Pauliau, Gytis → Gyti, Eglė → Egle
- AI voice: sticker lines get a cheerful character voice (ttsaudio kind "sticker"), each line fetched once and cached
- The gift ring and the rest of the shelf still open the album; the album says that stickers talk

## 1.11.1 (2026-11-01): Nothing under the stickers

- 📐 **Tips always visible**: Tips and cheers no longer slip under the sticker shelf.

**Changes**

- The sticker shelf is now the last row of the game screen instead of floating over it, so nothing can sit under it
- The game screen takes the phone's visible height, and fits again whenever the screen or the shelf changes size (safe areas that arrive late, rotation)
- Nothing pokes out of the shelf any more, so the fitting no longer shrinks the pictures for nothing (iPhone SE: Expert pictures back to 100 px)

**Fixes**

- On iPhone, the coach line under the word could slip under the sticker shelf

## 1.11.0 (2026-11-01): A little reading coach

- 👀 **Read, don't guess**: A quick wrong tap gets a tip: read the whole word first.
- 💪 **Cheers that fit**: Praise for streaks, comebacks, long words and tricky ones.
- 🧩 **Help when stuck**: Two misses or a long pause show the word in parts: Na – mas.

**Changes**

- Coach line under the word, one short sentence at a time (EN, LT, ES), never repeating the last one
- Wrong tap: within 1.5 s of the word → read the whole word first; second wrong tap → the word in parts (Na – mas); otherwise → all pictures start with the same letter, read to the end (or say it out loud)
- Right first try: 3, 5, 10, 15… in a row; Great comeback after a missed word; a word missed before; a long word (4+ syllables); careful (6 s+) or speedy reading; otherwise sometimes a general cheer
- Nothing tapped for 9 s: tap 🔊 to hear it (or the word in parts when read-aloud is off); after 18 s: point at each letter
- Two skips in a row: have a go, mistakes are OK; Let's read! at the start
- Settings › Game › Tips and cheers (on by default; settings.tips)

## 1.10.1 (2026-11-01): Everything on one screen

- ⏭ **Skip and level on top**: The level and Skip moved to the top bar, so stickers never cover them.
- 📱 **No scrolling**: The game screen stays put and fits every iPhone, the pictures adjust.

**Changes**

- The level badge sits under the player's name and Skip is in the top bar; the footer row under the pictures is gone
- The game screen is fixed to the screen (no scrolling, no bounce); fitGame() shrinks the picture tiles until everything fits above the sticker shelf, and on small screens hides the hint line and tightens spacing when that gives bigger pictures
- Compact top bar: long names end with …; Skip is a round ⏭ button on phones narrower than 414 px

**Fixes**

- The sticker shelf covered the level badge and the Skip button, and the game screen could scroll

## 1.10.0 (2026-11-01): Funny pictures and stickers

- 🎉 **Pictures come alive**: After each right answer the picture acts out its word: cars drive, fish swim.
- 🎁 **Collect stickers**: Every 5 words right on the first try earn a new sticker.
- 📒 **Always on the shelf**: Each kid's stickers stay at the bottom of the game. Tap for the album.

**Changes**

- Funny animations: the right picture leaves its tile and acts out its word (drive, fly, swim, chomp, hop, bloom; dance or spin otherwise) with a speech bubble in the game language; Web Animations, cleaned up after each round; a gentle pop with Reduce Motion
- Settings › Game › Funny animations (on by default; settings.fun)
- Stickers per player (kid.stickers = { have, shiny, pts }): every N first-try words earn a new sticker from 60; a full album gives shiny ones
- Sticker shelf fixed at the bottom of the game with a progress ring; album with the missing stickers as silhouettes; the latest four on each home-screen card
- Settings › Rounds › Words for a sticker (2–20, default 5; cfg.stickerEvery)
- A new sticker bursts out, flies to the shelf with its own sound, and the next word waits until it has landed

## 1.9.1 (2026-11-01): Cheer first, then the word

- 🎉 **The cheer always plays**: The success sound now plays every time, even with the silent switch on.
- 🔊 **Then the word**: After a right answer the word is read once the success sound has finished.
- 👂 **On by default**: Every player hears the word after answering, unless you choose Off.

**Changes**

- Sound effects (success, right after a miss, wrong, PIN keys) are rendered once as WAV and played through an <audio> element instead of Web Audio, which iOS mutes with the silent switch and can suspend
- After answer: the word is spoken 150 ms after the success sound ends (with sounds off, straight away); the AI voice is requested only then too
- Read aloud is After answer by default for new players; players still on Off are switched to After answer once (a parent's later choice of Off is kept)
- Speech is primed silently inside the Play tap, so words spoken after the success sound aren't blocked by iOS

**Fixes**

- The success sound sometimes didn't play, and speech starting at the same moment could cut it off

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
