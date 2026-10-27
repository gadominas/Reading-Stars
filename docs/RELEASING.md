# Releasing a new version

`releases.json` is the single source of truth for versions and release notes. The game reads it from GitHub to decide whether to offer an update, and uses it to pitch the update to the family.

## Steps

1. **Bump the version** in `Reading Stars.js`: `const VERSION = '1.2.0';`. Keep the line exactly in that form, with single quotes: the updater finds the version by matching it. Use [semantic versioning](https://semver.org): a new feature bumps the middle number, a fix-only release the last.
2. **Add a release at the top of `releases.json`**, with the same version.
3. **Regenerate the changelog**: `node tools/changelog.js`.
4. **Commit everything to `main` in one push**: the script, `releases.json` and `CHANGELOG.md`.

The game offers the update the next time it opens on the home screen. GitHub can take a few minutes to serve new files; until then *Update now* says to try again in a few minutes instead of reinstalling the same version.

## Release entry format

```json
{
  "version": "1.2.0",
  "date": "2026-11-02",
  "title": { "en": "Short headline", "lt": "Trumpa antraštė", "es": "Titular corto" },
  "highlights": [
    { "icon": "🔔", "title": { "en": "Feature name", "lt": "…", "es": "…" }, "text": { "en": "One sentence on what it does for the user.", "lt": "…", "es": "…" } },
    { "icon": "⬆️", "title": { "en": "…", "lt": "…", "es": "…" }, "text": { "en": "…", "lt": "…", "es": "…" } },
    { "icon": "✨", "title": { "en": "…", "lt": "…", "es": "…" }, "text": { "en": "…", "lt": "…", "es": "…" } }
  ],
  "changes": ["Everything new, one line each"],
  "fixes": ["Every bug fixed, one line each"]
}
```

`title` and highlight `title`/`text` can be a plain string or an object with `en`, `lt` and `es`. The update sheet shows the game's current language and falls back to English. `CHANGELOG.md` uses English.

## Writing good highlights

The three highlights are the update pitch: the first thing the family reads before deciding to update.

- **Exactly three**, ordered by how much a player or parent will care.
- **Title:** two to four words, naming the benefit rather than the implementation.
- **Text:** one sentence, under 100 characters in every language, saying what you can now do.
- **Icon:** one emoji.

If a user skipped several versions, the pitch shows the newest release's highlights first and fills any gaps from older releases they missed.

## Behaviour in the game

- The game checks `releases.json` once per run, in the background, after the first screen is on.
- The sheet appears on the **home screen only**, never during a kid's round. If the check finishes mid-round, it waits until the home screen.
- **Update now** downloads the script over the current one after three checks (a real Reading Stars script, `APP_ID` matches, version is actually newer); the user closes and reopens the game to start the new version. Players, tokens, budgets and the PIN are stored separately and are kept.
- **Later**, or tapping outside the sheet, hides the offer for two days (stored in the iOS Keychain as `reading-stars-update-snooze`).
- Turn checks off with `CHECK_UPDATES: false` in the `CONFIG` block at the top of the script.

## Testing an update

Temporarily set `VERSION` lower than the newest entry in `releases.json` on GitHub, run the game, and check: no sheet when equal; the sheet with three cards when one behind; "and 1 more update" when two behind; Later and tapping outside both snooze; Update now ends on "✓ Done"; flight mode shows nothing. To reset Later, run `Keychain.remove('reading-stars-update-snooze')` in a scratch Scriptable script.
