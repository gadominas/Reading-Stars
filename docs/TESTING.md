# Testing Reading Stars

Reading Stars is one Scriptable script, so it can't run in a normal test runner. The `tests/` folder runs the **real `Reading Stars.js`** in Node instead, with Scriptable's APIs replaced by stand-ins, and taps through the app the way a person would. It is modelled on [Stockit's](https://github.com/gadominas/StockIt/blob/main/docs/TESTING.md).

## Run the tests

```sh
cd tests
npm install          # jsdom
node run.js          # every scenario, one line each
node run.js updates  # only those whose name contains "updates"
node run.js -v       # and print every check
```

A scenario **passes** when it finishes, none of its checks is marked ✗, and its last line is `errors: none` (no error from the script, from the page, or a crash). Run them all before every release (see [RELEASING.md](RELEASING.md)).

To run the scenarios against another copy of the script (for example an older version, to see a test catch a bug), set `RS_SCRIPT=/path/to/Reading Stars.js`.

## How it works

**`tests/harness.js`** loads `Reading Stars.js` into a function with stand-ins for everything Scriptable provides:

| Scriptable | Stand-in |
|---|---|
| `WebView` | a [jsdom](https://github.com/jsdom/jsdom) page per `loadHTML`; `evaluateJavaScript` runs in it. The page gets `window.__hostBridge`, as in a native shell (portable-bridge recipe), so its `readingstars://` messages reach the script's `shouldAllowRequest` after the current task |
| `Request` | answers by URL: `releases.json` (`opts.releases`) and the update download (`opts.newVersion`). Nothing reaches the network |
| `FileManager` | files in memory (`E.files`); start from saved data with `opts.files` |
| `Keychain` | in memory (`E.kc`) |
| `Alert` | answers queued with `E.log.pushAlert([...])` |
| `Timer` | real timers, shortened to at most 50 ms (`opts.timerCap`), so the 3.5 s update check runs at once |
| `config` | `opts.nativeShell` sets `config.runsInNativeShell`, as BuildIt does |
| `Speech`, `Safari`, `DrawContext`, `Device`… | record what happened in `E.log`, or accept any call |

Browser APIs Scriptable doesn't have on the script side (`setTimeout`, `URL`, `fetch`…) are shadowed, so script code that uses one fails here too.

`run(opts)` starts the script and returns `{ E, p }`: `E.getDom()` is the page, `E.files` and `E.kc` the stored data, `E.log` what the script did (requests, alerts, errors), `E.finish()` closes the app. `page(E)` gives `tap(selector)` and `text(selector)`; `enterParents(E)` opens the parent zone (setting PIN 1234 the first time).

## The scenarios

| Scenario | What it checks |
|---|---|
| `01-startup-and-basics` | A fresh install opens on the home screen with its version and saves its settings; saved data shows its players; a round shows three pictures and a word; Settings › Built with lists In-app updates with its version |
| `02-updates-scriptable` | In Scriptable a newer `releases.json` version is offered with its highlights; Update now downloads, checks and writes the new script; Later snoozes the offer (no request for two days); Settings › Updates has Offer new versions and Check for updates now |
| `03-updates-native-shell` | In a native shell (in-app-updates Step 8): no request to GitHub, no sheet; a forced Update now downloads and writes nothing and says why; Settings › Updates says new versions come through the App Store (or TestFlight), without the switch or Check now; the Start-up log stays; the note in Lithuanian |

## Add a test

Copy a scenario in `tests/cases/`, name it `NN-what-it-covers.test.js`, print one `✓`/`✗` line per check, and end with `console.log("errors: " + …)` using `errors(E)` from the harness. `run.js` picks it up.

## What it doesn't cover

How it looks (jsdom doesn't lay out or paint), real iCloud, the widget, speech and sounds, and anything that needs a real network or AI.
