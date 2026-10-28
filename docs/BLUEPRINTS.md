# Blueprints

Reading Stars follows the shared blueprints in https://github.com/gadominas/app-blueprints.
The script's `BLUEPRINTS` block is the source of truth; this table mirrors it and adds deviations. It has no AI features, so AI configuration does not apply.

| Blueprint | Version | Since app version | Deviations |
| --- | --- | --- | --- |
| [in-app-updates](https://github.com/gadominas/app-blueprints/blob/in-app-updates-v1.0.0/blueprints/in-app-updates.md) | 1.0.0 | 1.1.0 | Release notes carry Lithuanian, English and Spanish text, shown in the game's language |
| [settings](https://github.com/gadominas/app-blueprints/blob/settings-v1.0.0/blueprints/settings.md) | 1.0.0 | 1.2.0 | Settings sit behind the parent PIN (sliders icon in the parent zone), not in the main header; the default palette is Ink, the game's bright look, not Auto; the sheet follows the game language (Lithuanian, English, Spanish); the sky backdrop is an app colour per palette (night sky in Slate and Night), while picture tiles, syllable colours, the copybook word card, avatars and confetti are fixed artwork; the game screen is the same in every layout, and Tiny applies to the leaderboard and parent zone; Text size leaves the game word and picture emoji alone (they size to the screen); the language switch stays on the home screen for kids; sheet CSS is scoped under `#cfgsheet` because the app already uses `.sheet`, `.chip`, `.toggle` and `.icon` |
