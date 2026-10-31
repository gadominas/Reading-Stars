<div align="center">

<img src="docs/logo.svg" width="96" alt="Reading Stars logo: a big yellow star with a white sparkle over a teal reading line">

# Reading Stars

**Read. Match. Shine.**

A picture-and-word reading game for kids, where first-try answers earn tokens a parent can exchange for real pocket money.<br>An iPhone and iPad app for [Scriptable](https://scriptable.app). One file, no server, no sign-up.

[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fgadominas%2FReading-Stars%2Fmain%2Freleases.json&query=%24.releases%5B0%5D.version&label=version&color=FACC15&labelColor=0E1116&style=flat-square)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/iOS-Scriptable-171B22?style=flat-square&labelColor=0E1116)](https://apps.apple.com/app/scriptable/id1405459188)
[![AI](https://img.shields.io/badge/AI-optional%20(Claude%20%C2%B7%20OpenAI)-171B22?style=flat-square&labelColor=0E1116)](#ai)
[![Blueprints](https://img.shields.io/badge/built%20with-app--blueprints-171B22?style=flat-square&labelColor=0E1116)](docs/BLUEPRINTS.md)
[![Last commit](https://img.shields.io/github/last-commit/gadominas/Reading-Stars?style=flat-square&labelColor=0E1116&color=171B22&label=updated)](https://github.com/gadominas/Reading-Stars/commits)
[![License](https://img.shields.io/badge/license-MIT-171B22?style=flat-square&labelColor=0E1116)](LICENSE)

</div>

<p align="center">
  <img src="docs/screenshots/01-home.png" width="31%" alt="Home screen: four player cards with avatars, levels, tokens, stars and what the tokens are worth, under the language switch.">
  <img src="docs/screenshots/02-beginner-round.png" width="31%" alt="Beginner round: the word Pen-guin in coloured syllables under three pictures that all start with P, with the wallet showing 23 tokens = €1.15.">
  <img src="docs/screenshots/03-parent-zone.png" width="31%" alt="Parent zone: Ema's tokens, stars and payouts, her token value of €0.05, a hidden budget of €9.00 and the Top up, Pay out and Edit buttons.">
</p>

> [!NOTE]
> Screenshots are rendered from the app's real interface with invented sample data. The players (Ema, Jonas, Ona, Leo), their money and the parent PIN are made up. They come from an emulator, so emoji and the rounded font look slightly different from an iPhone. The photos under [Tested at home](#tested-at-home) are real; kids' names are blurred in the photos.

> [!IMPORTANT]
> **Money and kids.** Tokens turn into money only when a parent pays out from a budget the kids never see; the app keeps the numbers, the parent hands over the money or treat. See [Disclaimer](#disclaimer).

## Highlights

- **Read the word, tap the picture.** One big word split into coloured syllables (**Na-mas**, **Kar-vė**, **He-li-cop-ter**), with pictures above it that all start with the same letter, so the kid has to read the whole word.
- **Two levels.** 🐣 Beginner (ages 4–6, 1–2 syllables, 3 pictures) and 🦉 Expert (ages 9–11, 3–6 syllables, 5 pictures).
- **Tokens for first tries.** A correct first try earns +1 🪙 with confetti and a cheer; each wrong tap costs −1 🪙 (never below 0). The big wallet counts up or down as it happens.
- **Real pocket money, set per kid.** Each kid has their own token value and a hidden budget. When the budget can't cover the tokens, the kid is asked to get a top-up, and nothing earned is lost.
- **Parent zone behind a PIN.** Top up budgets, pay out tokens, edit or delete players and see every payout and top-up with its date.
- **Leaderboard.** All-time stars with a podium for the top three. Payouts never lower it.
- **📷 Words from your books.** Photograph a page and AI suggests the words a child can recognise in a picture, ready to play: dictionary form, syllables and an emoji. You review them first.
- **🧠 Learns what to practise.** Smart word order brings hard words back more often and mastered ones rarely (no AI). An optional ✦ AI coach picks the next words for each kid and gives you a short tip.
- **🔊 Hear the word.** Per kid: off, when the word appears, or after answering, with a replay button.
- **Three languages.** Lithuanian 🇱🇹, English 🇬🇧 and Spanish 🇪🇸, with about 190–200 picture words in each.
- **Home Screen widget.** The top reader and everyone's stars and tokens, or one player's tokens. Never money, budgets or the PIN.
- **Launch screen, Settings and updates** shared with the other apps: six colour palettes and three layouts, and new versions offered in the game.

## Screenshots

<p align="center">
  <img src="docs/screenshots/04-correct.png" width="31%" alt="Correct first try: confetti, the Awesome! banner and a +1 coin leaving the glowing cupcake picture for the wallet.">
  <img src="docs/screenshots/05-wrong.png" width="31%" alt="Expert round for Straw-ber-ry with five S pictures: the sailboat is greyed out after a wrong tap, the wallet drops to 37 tokens and Oops! −1 Try again shows.">
  <img src="docs/screenshots/06-top-up-needed.png" width="31%" alt="Ona's round opens with a message: Not enough money left to exchange your tokens. Ask your parents to top up!">
</p>
<p align="center">
  <img src="docs/screenshots/07-leaderboard.png" width="31%" alt="Leaderboard: a podium with Jonas first on 112 stars, Ema second and Leo third, then every player's stars and token balance.">
  <img src="docs/screenshots/08-payout.png" width="31%" alt="Payout confirmation for Ona: exchange 8 tokens for €0.40; the budget doesn't cover all tokens, so 6 stay.">
  <img src="docs/screenshots/09-lithuanian.png" width="31%" alt="Beginner round in Lithuanian: the word Na-mas with a house, a night city and a nose, and the wallet showing 23 žetonai = 1,15 €.">
</p>
<p align="center">
  <img src="docs/screenshots/10-launch.png" width="31%" alt="Launch screen: the yellow star with its sparkle and teal reading line, the name Reading Stars and the tagline Read. Match. Shine.">
  <img src="docs/screenshots/11-settings.png" width="31%" alt="Settings sheet: Appearance with colour palettes, layout, text size and headline font, then Game and Money.">
  <img src="docs/screenshots/12-update.png" width="31%" alt="Update sheet over the home screen: a new version with three highlights, Update now and Later, remind me in 2 days.">
</p>
<p align="center">
  <img src="docs/screenshots/13-dark.png" width="31%" alt="Home screen in the Night palette: the player cards on a dark night sky.">
  <img src="docs/screenshots/14-widget.png" width="31%" alt="Medium widget: Jonas as top reader with 112 points and 38 tokens to spend, then Ema, Leo and Ona with their stars and tokens.">
</p>
<p align="center">
  <img src="docs/screenshots/17-book-words.png" width="31%" alt="New words from a book page: AI by Claude found ka-ra-liu-kas, ba-o-ba-bas and ro-žy-nas on a page named Mažasis princas, ready to add.">
  <img src="docs/screenshots/18-ai-coach.png" width="31%" alt="Parent zone: Ema's read-aloud choice, word progress (9 mastered, 3 hard) and the AI coach tip with the words she practises next.">
  <img src="docs/screenshots/15-learning-settings.png" width="31%" alt="Settings › Learning: the AI settings row, smart word order switch, book words Mixed in, First or Off, and the voice status.">
</p>
<p align="center">
  <img src="docs/screenshots/16-ai-settings.png" width="31%" alt="AI settings: the Claude card in use with a masked key, Change key, Test connection, Remove and the model menu, then OpenAI and What AI does.">
</p>

### Tested at home

These are photos from the first evenings of play.

<p align="center">
  <img src="docs/photos/expert-es-broccoli-correct.jpg" width="48%" alt="Expert round in Spanish, correct answer">
  <img src="docs/photos/expert-es-abeja-wrong.jpg" width="48%" alt="Expert round in Spanish, wrong tap">
</p>

- **Bró-co-li, Expert, Spanish.** Five pictures that all start with B: ballena, brócoli, bañera, bicicleta, búho. A correct first try sets off confetti and *¡Genial!*, and the coin flies into the wallet: 38 fichas = 1,90 €.
- **A-be-ja, Expert, Spanish.** Every picture starts with A, so a quick guess goes wrong. The greyed-out picture was the wrong tap: *¡Uy! −1 🪙*, the wallet drops to 37 fichas = 1,85 € and a red *−0,05 €* floats away.

<p align="center">
  <img src="docs/photos/expert-es-mariquita.jpg" width="48%" alt="Expert round in Spanish, ladybug">
  <img src="docs/photos/beginner-lt-cirkas.jpg" width="48%" alt="Beginner round in Lithuanian">
</p>

- **Ma-ri-qui-ta, Expert, Spanish.** Mariposa, maíz, mariquita, motocicleta, martillo: the ladybug glows gold as the correct answer. A streak of 🔥 6 first-try answers, worth 0,30 € so far.
- **Cir-kas, Beginner, Lithuanian.** Three C-words: cilindras, citrina, cirkas. The lemon was tapped by mistake and greyed out. This was an earlier build with a small token badge; the big wallet came after this first test.

## Install

1. Get **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)** (free) on your iPhone or iPad.
2. In Scriptable, tap **+**, paste these two lines, name the script *Reading Stars Installer*, and tap **▶**:
   ```js
   const code = await new Request("https://raw.githubusercontent.com/gadominas/Reading-Stars/main/install.js").loadString();
   await eval("(async () => {" + code + "\n})()");
   ```
3. Tap **Open Reading Stars**. On the first open, add a player, then open **🔒 Parents** to create the 4-digit parent PIN.

To update, tap **Update now** when Reading Stars offers a new version, or run *Reading Stars Installer* again. Players, tokens, budgets and the PIN are kept.

<details>
<summary><b>Install by hand</b></summary>

Rather not use the loader? Paste [`install.js`](install.js) or [`Reading Stars.js`](Reading%20Stars.js) into a new script in Scriptable yourself.

</details>

What else you need:

- **Optional: a Home Screen icon.** In Scriptable, tap *⋯* on *Reading Stars*, then *Add to Home Screen*. [docs/icon-1024.png](docs/icon-1024.png) is the 1024 px icon for it.
- **Optional: iCloud Drive.** Without it, progress is saved in local Scriptable storage.

## How to use it

### Players

Tap **New player** on the home screen, type a name, pick a level (🐣 Beginner or 🦉 Expert) and an avatar. Tap a player's card to start a round. The language switch at the top of the home screen (LT, EN, ES) changes both the menus and the words.

### How a round works

A word is shown big, split into syllables with dashes and a different colour per syllable: **Na-mas**, **Kar-vė**, **He-li-cop-ter**. Above it are pictures, and the kid taps the one that matches.

Every picture in a round **starts with the same letter as the word**. For *Na-mas* the choices are *namas*, *nosis* and *naktis*, so the kid can't guess from the first letter and has to read the whole word.

| Level | Ages | Word length | Pictures |
|---|---|---|---|
| 🐣 Beginner | 4–6 | 1–2 syllables | 3 |
| 🦉 Expert | 9–11 | 3–6 syllables | 5 |

| What happens | Tokens | Leaderboard |
|---|---|---|
| Correct on the first try | **+1 🪙** | +1 ⭐ |
| Each wrong tap | **−1 🪙** (never below 0) | −1 ⭐ |
| Correct after a mistake | 0 | 0 |
| Skip | 0 | 0 |

The big wallet at the top always shows the kid's tokens and what they are worth. When it changes, the numbers count up or down, the panel pulses green or shakes red, and the difference floats over it (*+0,05 €*, *−1 🪙*).

The number of pictures per round can be changed in **Settings › Rounds** (Beginner 2–4, Expert 3–5). If there aren't enough words with the same first letter for the chosen number, the round uses the original number instead.

### Tokens, money, budget and payouts

The game separates three things: **tokens** the kid earns, **money** those tokens are worth, and a **budget** that only the parent sees.

```mermaid
flowchart LR
    A[Kid reads correctly] -->|+1 per word| T[🪙 Tokens]
    T -->|× token value set per kid| V[Money the kid sees]
    P[Parent tops up] --> B[🔒 Hidden budget per kid]
    V --> X{Parent pays out}
    B --> X
    X -->|tokens → 0, budget − amount| C[💶 Real money / a treat]
    V -.->|value > budget| N[Kid sees: ask your parents to top up]
```

**1. Token value, per kid.** In the parent zone each kid gets their own rate, e.g. *1 🪙 = 0,05 €* for a younger kid and *1 🪙 = 0,10 €* for an older one. The kid sees the result in big numbers: *🪙 23 = 1,15 €*. Leave it at 0 and that kid only plays for tokens.

**2. Hidden budget, per kid.** The parent decides how much money is set aside for each kid and tops it up whenever they like, with quick +5 / +10 / +20 / +50 buttons or a typed amount. Kids never see the budget.

**3. Running low.** If a kid's tokens are worth more than their budget, the kid is told *"Not enough money left to exchange your tokens. Ask your parents to top up! 💰"*. The message pops up when the game starts and the moment it happens during play, and stays on the wallet and on their player card. Tokens keep counting, so nothing earned is lost.

**4. Payout.** When the kid asks to exchange, the parent opens the parent zone and taps *Pay out*. The tokens are converted into money, the money is taken from that kid's budget, and the payout is logged with the date. If the budget only covers part of the tokens, it pays what it can and the rest of the tokens stay. **Leaderboard points never go down on a payout**, so all-time progress is kept.

<details>
<summary><b>Worked example</b></summary>

| | Ema | Ona |
|---|---|---|
| Token value | 0,05 € | 0,05 € |
| Tokens | 23 | 14 |
| Worth (what the kid sees) | 1,15 € | 0,70 € |
| Hidden budget | 9,00 € | 0,40 € |
| Kid is told to ask for a top-up | no | **yes** |
| Payout | 23 🪙 → 1,15 € | 8 🪙 → 0,40 € (6 🪙 stay) |
| Budget after | 7,85 € | 0,00 € |

</details>

### Parent zone

Tap **🔒 Parents** on the home screen. It is protected by a 4-digit PIN (5 wrong tries lock it for a minute). For each kid:

- token balance with its money value, all-time points, and total paid out
- token value (*1 🪙 = …*) and the hidden budget, with a top-up button (a minus sign takes money out)
- *Pay out*, *Edit* (name, level, avatar) and *Delete*
- a history of payouts and top-ups with dates

The sliders icon at the top right opens [Settings](#settings), so only parents can reach it.

### Leaderboard

The leaderboard ranks kids by all-time points with a podium for the top three, and also shows each kid's current tokens. Payouts never lower it.

### Languages

The game speaks **Lithuanian 🇱🇹, English 🇬🇧 and Spanish 🇪🇸** (*Skaitymo žvaigždės · Reading Stars · Estrellas lectoras*), with about 190–200 picture words in each. The language switch on the home screen changes both the menus and the words. Settings, the update sheet, the launch screen's tagline and the widget follow the same language.

## Widget

Add a Scriptable widget to the Home Screen or Lock Screen and choose *Reading Stars* as the script. It shows the top reader with their ⭐ points and 🪙 tokens to spend, and on medium and large the other players ranked as on the leaderboard. Type a player's name in **Parameter** to show only that player, with their tokens as the big number. It never shows money, budgets or the PIN, because kids see the Home Screen. It is the shared [widgets](https://github.com/gadominas/app-blueprints/blob/main/blueprints/widgets.md) blueprint, so all the apps' widgets look alike.

1. Long-press the Home Screen, tap **Edit › Add Widget**, choose **Scriptable** and a size.
2. Long-press the widget, tap **Edit Widget**, set **Script** to *Reading Stars* and **When Interacting** to *Run Script*.

Lock Screen widgets are added the same way under **Customize › Lock Screen**: inline shows a line like *⭐ Ema leads with 120*, the circle shows the leader's points, and the rectangle shows the leaderboard line. With a player's name as Parameter, the Lock Screen shows 🪙 and that player's tokens.

The widget shows what the game saved last, so it works offline and updates after every round, payout and player change; if nobody has played for a while, its footer says when it was last updated. **Parent zone › Settings › Widget** sets how often iOS is asked to refresh it and when it counts as out of date.

## AI

AI is optional. Without a key Reading Stars works exactly as before, and the AI parts are hidden. With your own **Claude** or **OpenAI** key (**Parent zone › Settings › Learning › AI settings**) you get:

- **📷 Words from books.** In the parent zone, tap **Take a photo** (or **From photos**). The page goes to the AI provider you chose, which reads it and suggests concrete nouns a child can recognise in a picture: in dictionary form (*lapė* even if the page says *lapės*), split into syllables by that language's rules, each with an emoji. Tap away any you don't want, name the source and add them. Book words follow the game's rules (same-letter pictures, Beginner 1–2 syllables, Expert 3–6) and are listed in the parent zone, where you can delete a source (two taps). **Settings › Learning › Book words in the game** mixes them in, puts them first, or turns them off.
- **✦ AI coach.** For each kid, from their word progress (never their name): a short tip for you, up to 8 words to practise next, and up to 12 new words that start with the letters they find hard, sized for their level. It runs by itself after every 40 answered words (switch: **AI settings › What AI does**), or when you tap **Ask the AI coach** on a kid in the parent zone.

The AI settings are the shared [ai-configuration](https://github.com/gadominas/app-blueprints/blob/main/blueprints/ai-configuration.md) blueprint: the key is typed into an iOS prompt and stored only in the iPhone's Keychain (the page sees `sk-ant-…9f2c`), you can pick any model your key can use, test the connection, and see the tokens used per feature, model and day. Everything AI wrote is labelled ✦ with the provider.

Two learning features need no AI and no key:

- **🧠 Smart word order** (**Settings › Learning**, on by default) tracks each kid's progress per word. Words they got wrong come back often, new words are introduced steadily, mastered words appear rarely.
- **🔊 Read words aloud** is set per kid in the parent zone: **Off**, **When shown** (good for the youngest) or **After answer** (read first, then hear it). A 🔊 button on the word card repeats it. It uses the iPhone's voices; **Settings › Learning** says whether one is installed for the game's language and where to add it.

## Settings

Open the parent zone (PIN) and tap the sliders icon at the top right. Changes apply at once and are saved in `settings.json` in iCloud Drive › Scriptable › ReadingStars, so updates never reset them. The sheet follows the game's language.

| Section | What you can change |
| --- | --- |
| Appearance | Colours (Auto or six palettes: Ink, the game's bright look and the default, Sepia, Mint, Contrast, Slate, Night; Slate and Night give a night sky), layout (Comfortable, Compact, Tiny: one line per player on the leaderboard and in the parent zone), text size, headline font. The game screen looks the same in every layout |
| Game | Word letters (*Ap-ple*, *AP-PLE*, *ap-ple*; *Na-mas*, *NA-MAS*, *na-mas* in Lithuanian), sounds |
| Money | Currency (EUR, USD, GBP) |
| Learning | **AI settings** (Claude or OpenAI key, model, token usage, the AI coach switch), smart word order, book words in the game (Mixed in, First, Off), which voice reads the words |
| Parent | Change PIN |
| Updates | Offer new versions, check now |
| Rounds | Pictures per round for Beginner (2–4, original 3) and Expert (3–5, original 5), each with Reset |
| Widget | Ask iOS to refresh every 15–240 min (original 30), mark the widget as out of date after 60–2880 min (original 720), each with Reset |
| Built with | The [shared blueprints](https://github.com/gadominas/app-blueprints) this app follows, with links (read-only) |

## Updates and what's new

Reading Stars checks this repository for a new version each time it opens. When one is out, a sheet shows its three best features with **Update now** and **Later**; Later hides the offer for two days. Your data and settings are kept. Every release is in [CHANGELOG.md](CHANGELOG.md).

The sheet appears only on the home screen and never interrupts a round, in the game's language. Updating keeps all players, tokens, budgets and the PIN. Close and reopen the game afterwards. To turn the checks off, switch off **Parent zone › Settings › Updates › Offer new versions**; **Check for updates now** checks at once.

## Privacy and security

- **Anonymous usage, only if a parent agrees.** A one-time question in the PIN-protected parent zone (and **Settings › Privacy › Share anonymous usage**, also behind the PIN) decides whether Reading Stars sends anonymous counts to PostHog's US cloud: app opens with the number of players and whether an AI key is set, rounds played (the level and whether the first try was right), payouts made and players added, the app version and a few display settings (including the language). Each event carries a random install ID made on your phone. Never sent: names, avatars, words, tokens, money or the PIN. Turning it off stops sending and deletes the install ID. The kids never see the question.

- Progress is saved to `iCloud Drive › Scriptable › ReadingStars › data.json`, with `data.backup.json` and the parent's choices (`settings.json`) next to it, or to local Scriptable storage if iCloud is off. Kids' names, tokens, budgets and the PIN hash live only in that file, never in this repository.
- The widget reads a small copy with only names, avatars, points and tokens, kept in Scriptable's local storage on this device (`reading-stars-widget.json`).
- Nothing about the players leaves the phone. Apart from the update check, the app downloads only from this repository: the new script when you tap **Update now**, and the app icon the widget caches once per version.
- **AI only with your own key.** A book photo is sent to the AI provider you chose, only when you take it. The AI coach sends word statistics (words, how often they were right or wrong, the level, the language), never names, avatars, tokens or money. API keys stay in the iPhone's Keychain, never in files, the page or this repository. No accounts.
- The update check only downloads `releases.json` from this repository.

## How it works

- **One script, one page.** *Reading Stars.js* builds the game as an HTML page in a Scriptable `WebView`. The page talks to the script through `readingstars://` links: `save` writes the progress file after every change, and the other actions read and change settings and run the update.
- **Launch screen.** Reading Stars opens on its logo for 2.4 seconds: the star traces its outline and pops in, the sparkle and the reading line follow, then "Read. Match. Shine." (*Skaityk. Rask. Spindėk.*, *Lee. Elige. Brilla.* in the game's language). Tap to skip; with Reduce Motion it appears without movement. It is the shared [launch-screen](https://github.com/gadominas/app-blueprints/blob/main/blueprints/launch-screen.md) blueprint, so all the apps start the same way. The same star sits on top of the home screen.
- **Rounds** pick the next word with smart word order (each kid's progress per word, kept in `data.json`), or from a shuffled deck when it's off, and fill the other pictures with words that start with the same letter. Book and AI-coach words join the same pool.
- **AI** requests all go through one function on the Scriptable side (`aiCall`), which also counts tokens; the page never holds a key.
- **The widget branch** runs without the page: it reads the saved snapshot and draws the widget natively.

## Troubleshooting

| Problem | Try this |
| --- | --- |
| Forgot the parent PIN | Remove the `pinHash` value from `data.json` and set a new PIN on the next launch. |
| A kid sees "Ask your parents to top up" | Their tokens are worth more than their budget. Top up in the parent zone, or pay out what the budget covers. |
| *Pay out* is greyed out | The budget is below one token's value: *Top up the budget to pay out*. |
| No update offer | **Later** hides it for two days, and **Offer new versions** may be off. Use **Settings › Updates › Check for updates now**. |
| "GitHub is still serving the old version" | GitHub can take a few minutes to serve a new release. Try again in a few minutes. |
| No voice when a word should be read aloud | Add a voice for the game's language in iOS Settings › Accessibility › Spoken Content › Voices (Settings › Learning shows whether one is found), and check the silent switch. |
| No **Take a photo** or **Ask the AI coach** | They appear once an AI key is saved in **Settings › Learning › AI settings**. |
| The AI coach button is greyed out | The kid needs about 10 answered words in the game's language first. |
| The widget's footer shows "⟳ Updated …" in amber | Nobody has played for a while (12 hours by default). Open the game once; the widget follows. |

## Built with

- **[Scriptable](https://scriptable.app)** by Simon Støvring: one JavaScript file, a WebView for the interface.
- **[app-blueprints](https://github.com/gadominas/app-blueprints)**: the shared in-app updates, settings, AI configuration, launch screen and widgets that every one of these apps uses, so they look and behave alike. **Settings › Built with** lists the versions; [docs/BLUEPRINTS.md](docs/BLUEPRINTS.md) adds the deviations. Reading Stars follows six of them: in-app updates, settings, AI configuration, launch screen, widgets and anonymous usage analytics.
- **Pictures** are the iPhone's own emoji, so the game needs no image files and works offline.

Maintainers: release notes live in [`releases.json`](releases.json); see [docs/RELEASING.md](docs/RELEASING.md). Screenshots are regenerated with [repo-site](https://github.com/gadominas/app-blueprints/tree/main/repo-site) from [`docs/site/scenario.js`](docs/site/scenario.js).

## Disclaimer

**Money and kids.** The game separates three things: **tokens** the kid earns, **money** those tokens are worth, and a **budget** that only the parent sees. Kids never see the budget. The widget never shows money, budgets or the PIN, because kids see the Home Screen. **Leaderboard points never go down on a payout**, so all-time progress is kept. Progress is saved to `data.json` in iCloud Drive or local Scriptable storage. Kids' names, tokens, budgets and the PIN hash live only in that file, never in this repository. Reading Stars only keeps the numbers: it never moves real money, and the parent decides when to pay out and hands over the money or treat.

A personal project, provided as is, without warranty. Not affiliated with Scriptable or Apple.

## More apps like this

<p>
  <a href="https://github.com/gadominas/StravaFeed"><img src="https://raw.githubusercontent.com/gadominas/StravaFeed/main/docs/icon-1024.png" width="44" alt="Strava Daily Digest"></a>&nbsp;
  <a href="https://github.com/gadominas/BlogPulse"><img src="https://raw.githubusercontent.com/gadominas/BlogPulse/main/docs/icon-1024.png" width="44" alt="BlogPulse"></a>&nbsp;
  <a href="https://github.com/gadominas/VisionX"><img src="https://raw.githubusercontent.com/gadominas/VisionX/main/docs/icon-1024.png" width="44" alt="VisionX"></a>&nbsp;
  <a href="https://github.com/gadominas/Go2FGym"><img src="https://raw.githubusercontent.com/gadominas/Go2FGym/main/docs/icon-1024.png" width="44" alt="Go2FGym"></a>&nbsp;
  <a href="https://github.com/gadominas/Tamo-"><img src="https://raw.githubusercontent.com/gadominas/Tamo-/master/docs/icon-1024.png" width="44" alt="Dienynas+"></a>&nbsp;
  <a href="https://github.com/gadominas/Reading-Stars"><img src="https://raw.githubusercontent.com/gadominas/Reading-Stars/main/docs/icon-1024.png" width="44" alt="Reading Stars"></a>
</p>

<sub>Strava Daily Digest · BlogPulse · VisionX · Go2FGym · Dienynas+ · Reading Stars, all single-file Scriptable apps built on the same blueprints.</sub>

## License

[MIT](LICENSE) © 2026 Gediminas Siutilas. Issues and pull requests are welcome: keep everything in a single Scriptable file, with no build step, and test on a real device. To release, follow [docs/RELEASING.md](docs/RELEASING.md).
