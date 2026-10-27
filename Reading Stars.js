// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: book-open;

/*
 * READING STARS ⭐ — a picture-and-word reading game for kids (Scriptable, iOS)
 *
 * - Three pictures on top, one big word below split into syllables (na-mas, kar-vė).
 * - In-app updates: checks releases.json on GitHub at start and offers new versions
 *   (Update now / Later = 2 days). See docs/RELEASING.md.
 * - Kid taps the picture that matches the word. First-try correct answer = +1 token,
 *   every wrong tap = −1 token (never below 0). Beginner sees 3 pictures, Expert sees 5.
 * - Languages: Lithuanian, English, Spanish (switch on the home screen).
 * - Levels: Beginner (4–6 y, words with 1–2 syllables) and Expert (9–11 y, 3–6 syllables).
 * - Kid profiles with name, level and avatar. Leaderboard keeps all-time points.
 * - Parent zone (4-digit PIN): pay out (reset) a kid's tokens, edit/delete players,
 *   word letter style, sounds, change PIN. Payouts never reduce leaderboard points.
 *
 * - Money: per-kid token value (e.g. 1 token = 0.10 €) and a hidden per-kid budget the parent
 *   tops up. Kids see what their tokens are worth; if the budget can't cover it they're told
 *   to ask for a top-up. Payouts take money from that kid's budget.
 *
 * Data is saved to: iCloud Drive › Scriptable › ReadingStars › data.json
 * (falls back to local Scriptable storage when iCloud is off).
 */

// ───────────────────────── Settings & version ─────────────────────────

const CONFIG = {
  CHECK_UPDATES: true, // offer new versions from GitHub (asks again 2 days after "Later")
};

// This build's version. When releasing, bump it and add a matching entry to releases.json.
const VERSION = '1.1.0';
const APP_ID = 'reading-stars';   // unique per app, never changes
const REPO_RAW = 'https://raw.githubusercontent.com/gadominas/Reading-Stars/main/';
const SCRIPT_FILE = 'Reading Stars.js';   // the script's file name in the repository
const UPDATE_SNOOZE_MS = 2 * 24 * 3600 * 1000;   // "Later" = 2 days
const KC_UPDATE_SNOOZE = 'reading-stars-update-snooze';   // Keychain key, unique per app

// ───────────────────────── Storage (native side) ─────────────────────────

const APP_FOLDER = "ReadingStars";

function getFileManager() {
  try {
    const f = FileManager.iCloud();
    f.documentsDirectory();
    return f;
  } catch (e) {
    return FileManager.local();
  }
}

const fm = getFileManager();
const folder = fm.joinPath(fm.documentsDirectory(), APP_FOLDER);
if (!fm.fileExists(folder)) fm.createDirectory(folder, true);
const dataPath = fm.joinPath(folder, "data.json");
const backupPath = fm.joinPath(folder, "data.backup.json");

async function ensureDownloaded(path) {
  try {
    if (fm.fileExists(path) && !fm.isFileDownloaded(path)) await fm.downloadFileFromiCloud(path);
  } catch (e) {}
}

async function loadData() {
  await ensureDownloaded(dataPath);
  await ensureDownloaded(backupPath);
  for (const p of [dataPath, backupPath]) {
    if (!fm.fileExists(p)) continue;
    try {
      return JSON.parse(fm.readString(p));
    } catch (e) {}
  }
  return null;
}

let lastSaved = null;
function saveData(json) {
  if (typeof json !== "string" || !json || json === lastSaved) return;
  try {
    JSON.parse(json);
  } catch (e) {
    return;
  }
  try {
    if (fm.fileExists(dataPath)) fm.writeString(backupPath, fm.readString(dataPath));
  } catch (e) {}
  fm.writeString(dataPath, json);
  lastSaved = json;
}

function sleep(ms) {
  return new Promise((resolve) => Timer.schedule(ms, false, resolve));
}

// ───────────────────────── In-app updates (native side) ─────────────────────────

// Compares "1.10.0" and "1.9.2" as numbers: returns 1, 0 or -1.
function cmpVer(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

function updateSnoozed() {
  try {
    return Keychain.contains(KC_UPDATE_SNOOZE) && Date.now() < +Keychain.get(KC_UPDATE_SNOOZE);
  } catch (e) {
    return false;
  }
}

function snoozeUpdate() {
  try {
    Keychain.set(KC_UPDATE_SNOOZE, String(Date.now() + UPDATE_SNOOZE_MS));
  } catch (e) {}
}

function clearUpdateSnooze() {
  try {
    if (Keychain.contains(KC_UPDATE_SNOOZE)) Keychain.remove(KC_UPDATE_SNOOZE);
  } catch (e) {}
}

// Never throws: any failure just means no update is offered this time.
async function checkForUpdate() {
  if (!CONFIG.CHECK_UPDATES || updateSnoozed()) return null;
  try {
    const req = new Request(`${REPO_RAW}releases.json?t=${Date.now()}`);
    req.timeoutInterval = 10;
    const data = await req.loadJSON();
    if (!data || !Array.isArray(data.releases)) return null;
    const newer = data.releases
      .filter((r) => r && r.version && cmpVer(r.version, VERSION) > 0)
      .sort((x, y) => cmpVer(y.version, x.version));
    if (!newer.length) return null;
    // The newest release's highlights first, topped up from older versions the user skipped.
    const highlights = [];
    newer.forEach((r) =>
      (r.highlights || []).forEach((h) => {
        if (highlights.length < 3 && h && h.title) highlights.push(h);
      })
    );
    return {
      current: VERSION, latest: newer[0].version, title: newer[0].title || '',
      skipped: newer.length, highlights, script: data.script || SCRIPT_FILE,
    };
  } catch (e) {
    console.log('Update check skipped: ' + e);
    return null;
  }
}

// Downloads the new script, checks it three ways, then writes it over the running script.
async function applyUpdate(info) {
  const req = new Request(`${REPO_RAW}${encodeURI((info && info.script) || SCRIPT_FILE)}?t=${Date.now()}`);
  req.timeoutInterval = 30;
  const code = await req.loadString();
  const okStatus = req.response && req.response.statusCode === 200;
  const m = code && code.match(/const VERSION = '([^']+)'/);
  // 1. A real script for THIS app, not an error page or another project's file
  if (!okStatus || !m || !code.includes(`const APP_ID = '${APP_ID}'`)) {
    throw new Error("The download didn't look right. Try again later.");
  }
  // 2. Actually newer: GitHub's cache can serve the old file for a few minutes after a release
  if (cmpVer(m[1], VERSION) <= 0) {
    throw new Error('GitHub is still serving the old version. Try again in a few minutes.');
  }
  // 3. Write it where the running script lives (iCloud or on the phone)
  const path = module.filename;
  let sfm = FileManager.local();
  try {
    const ic = FileManager.iCloud();
    if (path.startsWith(ic.documentsDirectory())) sfm = ic;
  } catch (e) {}
  sfm.writeString(path, code);
  return m[1]; // the version now installed
}

// ───────────────────────── Styles ─────────────────────────

const CSS = `
:root{
  --sky:#4FB3F6; --sky2:#7CCBFF; --sun:#FFD23F; --sunDeep:#F5A300; --tomato:#FF6B5B;
  --grass:#2FBF71; --grape:#7C5CFA; --paper:#FFFDF5; --ink:#24264A; --muted:#6B6E91;
  --line:#BFD9F2; --margin:#FF8A8A;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;touch-action:manipulation}
input{-webkit-user-select:text;user-select:text}
html{background:#4FB3F6}
html,body{margin:0;min-height:100%}
body{
  font-family:ui-rounded,"SF Pro Rounded",-apple-system,system-ui,sans-serif;
  color:var(--ink);-webkit-font-smoothing:antialiased;
  background-color:var(--sky);
  background-image:
    radial-gradient(rgba(255,255,255,.22) 2px,transparent 2.5px),
    linear-gradient(180deg,var(--sky) 0%,var(--sky2) 100%);
  background-size:26px 26px,100% 100%;
}
#err{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:999;background:#fff;color:#C92A2A;border:3px solid #C92A2A;border-radius:14px;padding:12px;font:700 14px/1.35 -apple-system,system-ui,sans-serif;white-space:pre-wrap;word-break:break-word}
#app{position:relative;max-width:760px;margin:0 auto;padding:calc(env(safe-area-inset-top) + 14px) 16px calc(env(safe-area-inset-bottom) + 28px)}
button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}
button:disabled{opacity:.4}
:focus-visible{outline:4px solid var(--sun);outline-offset:3px}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 16px;border-radius:18px;font-weight:800;font-size:18px;background:#fff;box-shadow:0 5px 0 rgba(36,38,74,.18);transition:transform .08s,box-shadow .08s}
.btn:active:not(:disabled){transform:translateY(4px);box-shadow:0 1px 0 rgba(36,38,74,.18)}
.btn.primary{background:var(--grape);color:#fff;box-shadow:0 5px 0 #5638C9}
.btn.go{background:var(--grass);color:#fff;box-shadow:0 5px 0 #1E8E52}
.btn.danger{background:var(--tomato);color:#fff;box-shadow:0 5px 0 #D9483A}
.btn.gold{background:var(--sun);color:#5C3B00;box-shadow:0 5px 0 var(--sunDeep)}
.btn.ghost{background:#fff}
.btn.big{font-size:20px;padding:18px 14px;border-radius:22px}
.btn.small{font-size:15px;padding:10px 14px;border-radius:14px}
.btn.wide{width:100%}

/* Home */
.hero{text-align:center;color:#fff;padding:4px 0 2px}
.logo{display:inline-flex;gap:2px;font-size:40px}
.logo span{display:inline-block;animation:float 3.2s ease-in-out infinite}
.logo span:nth-child(2){animation-delay:.4s}
h1{margin:2px 0 14px;font-size:36px;font-weight:900;letter-spacing:.3px;text-shadow:0 3px 0 rgba(36,38,74,.18)}
.langs{display:inline-flex;gap:6px;background:rgba(255,255,255,.25);padding:6px;border-radius:20px}
.lang{border-radius:14px;padding:8px 12px;font-size:16px;font-weight:900;color:#fff;display:flex;gap:6px;align-items:center}
.lang .flag{font-size:22px}
.lang.on{background:#fff;color:var(--ink);box-shadow:0 3px 0 rgba(36,38,74,.15)}
.section{color:#fff;text-align:center;font-size:24px;font-weight:900;margin:24px 0 14px;text-shadow:0 2px 0 rgba(36,38,74,.15)}
.empty{color:#fff;text-align:center;font-size:19px;font-weight:800}
.kids{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
.kid{background:#fff;border-radius:28px;padding:16px 10px 14px;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:0 6px 0 rgba(36,38,74,.14);transition:transform .1s}
.kid:active{transform:scale(.96)}
.kid.add{background:rgba(255,255,255,.28);border:3px dashed #fff;box-shadow:none;color:#fff;justify-content:center}
.ava{width:78px;height:78px;border-radius:50%;display:grid;place-items:center;font-size:46px;line-height:1;flex:none}
.ava.plus{background:rgba(255,255,255,.4);font-size:34px}
.ava.sm{width:40px;height:40px;font-size:23px}
.kname{font-weight:900;font-size:20px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stats{display:flex;gap:12px;font-weight:900;font-size:21px}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:800;white-space:nowrap}
.badge.beginner{background:#D8F5E5;color:#18794A}
.badge.expert{background:#E9E2FF;color:#5232C7}
.bottom{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:28px}

/* Generic bars & panels */
.bar{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;gap:8px;margin-bottom:16px;color:#fff}
.bar h2{margin:0;text-align:center;font-size:23px;font-weight:900;text-shadow:0 2px 0 rgba(36,38,74,.15)}
.icon{width:48px;height:48px;border-radius:16px;background:#fff;color:var(--ink);font-size:22px;box-shadow:0 4px 0 rgba(36,38,74,.15);display:grid;place-items:center}
.icon:active{transform:translateY(3px);box-shadow:none}
.panel{background:#fff;border-radius:26px;padding:18px;margin-bottom:14px;box-shadow:0 6px 0 rgba(36,38,74,.12)}
.panel h3{margin:0 0 14px;font-size:19px}
.lbl{display:block;font-weight:900;font-size:17px;margin:18px 0 8px;color:var(--muted)}
.lbl:first-child{margin-top:0}
.input{width:100%;font:inherit;font-size:24px;font-weight:800;padding:14px 16px;border-radius:16px;border:3px solid #E3E6F0;outline:none;color:var(--ink);background:#fff}
.input:focus{border-color:var(--grape)}
.levels{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.lvl{border:3px solid #E3E6F0;border-radius:20px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;background:#fff}
.lvl.on{border-color:var(--grape);background:#F3EFFF}
.lvlIcon{font-size:38px}
.lvl b{font-size:17px}
.lvl small{color:var(--muted);font-weight:700;font-size:13px}
.avatars{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.avpick{aspect-ratio:1;border-radius:18px;background:#F2F4FA;font-size:34px;display:grid;place-items:center;border:3px solid transparent;transition:transform .12s}
.avpick.on{border-color:var(--grape);background:#F3EFFF;transform:scale(1.08)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.row3{display:grid;grid-template-columns:1.5fr 1.2fr 56px;gap:8px;margin-top:14px}

/* Game */
.gamebar{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.who{flex:1;display:flex;align-items:center;gap:8px;min-width:0;color:#fff;font-weight:900;font-size:19px}
.wn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 2px 0 rgba(36,38,74,.15)}
.pill{background:#fff;border-radius:999px;padding:8px 12px;font-weight:900;font-size:18px;box-shadow:0 4px 0 rgba(36,38,74,.15);white-space:nowrap}
.coins{background:var(--sun);color:#5C3B00;box-shadow:0 4px 0 var(--sunDeep)}
.bump{animation:bump .45s}
.hint{text-align:center;color:#fff;font-weight:800;font-size:17px;margin:6px 0 12px;text-shadow:0 2px 0 rgba(36,38,74,.15)}
.pics{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.pics .pic{width:calc((100% - 24px) / 3)}
.pic{aspect-ratio:1;border-radius:26px;border:5px solid #fff;display:grid;place-items:center;box-shadow:0 7px 0 rgba(36,38,74,.16);position:relative;transition:transform .1s,filter .2s,opacity .2s}
.pic:active{transform:scale(.95)}
.emo{font-size:min(19vw,112px);line-height:1}
.pic.wrong{filter:grayscale(1);opacity:.45}
.pic.wrong::after{content:"✖";position:absolute;top:4px;right:10px;font-size:22px;color:var(--tomato);font-weight:900}
.pic.shake{animation:shake .45s}
.pic.right{border-color:var(--sun);animation:pop .7s cubic-bezier(.3,1.6,.5,1) forwards;box-shadow:0 0 0 6px rgba(255,210,63,.7),0 0 40px 12px rgba(255,240,170,.95);z-index:2}

/* The word: a strip of a school copybook */
.wordcard{
  position:relative;margin-top:20px;border-radius:22px;padding:26px 14px 22px 30px;text-align:center;overflow:hidden;
  background-color:var(--paper);
  background-image:
    linear-gradient(90deg,transparent 18px,var(--margin) 18px,var(--margin) 21px,transparent 21px),
    repeating-linear-gradient(180deg,transparent 0,transparent 31px,var(--line) 31px,var(--line) 33px);
  box-shadow:0 7px 0 rgba(36,38,74,.16);
  transform:rotate(-.6deg);
}
.word{display:inline-block;white-space:nowrap;font-weight:900;line-height:1.15;letter-spacing:.5px}
.dash{color:#A3A8C3;margin:0 .05em}
.seg{display:inline-block}
.word.cheer .seg{animation:hop .62s ease both}
.feedback{min-height:56px;display:grid;place-items:center;text-align:center;font-weight:900;font-size:20px;margin-top:14px;color:#fff;text-shadow:0 2px 0 rgba(36,38,74,.18);line-height:1.25}
.feedback.bad{animation:shake .4s}
.gamefoot{display:flex;justify-content:space-between;align-items:center;margin-top:4px}

/* Effects */
#fx{position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden}
.cf{position:fixed;left:var(--x);top:var(--y);width:var(--s);height:calc(var(--s) * .62);background:var(--c);border-radius:3px;animation:burst var(--d) cubic-bezier(.2,.7,.3,1) forwards}
.cf.round{border-radius:50%;height:var(--s)}
.cf.em{background:none;width:auto;height:auto;font-size:var(--s)}
.banner{position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);font-size:44px;font-weight:900;color:#fff;white-space:nowrap;-webkit-text-stroke:2px rgba(36,38,74,.15);text-shadow:0 5px 0 var(--tomato),0 0 24px rgba(36,38,74,.25);animation:banner 1.9s ease forwards}
.flycoin{position:fixed;margin:-22px 0 0 -48px;width:96px;text-align:center;font-size:30px;font-weight:900;color:#5C3B00;text-shadow:0 2px 0 #fff;transition:transform .8s cubic-bezier(.5,-.3,.7,1),opacity .8s}
.toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 30px);transform:translateX(-50%);background:var(--ink);color:#fff;padding:12px 18px;border-radius:16px;font-weight:800;z-index:90;animation:fade .2s;max-width:90vw;text-align:center}
.modal{position:fixed;inset:0;background:rgba(36,38,74,.5);display:grid;place-items:center;z-index:80;padding:20px;animation:fade .2s}
.sheet{background:#fff;border-radius:26px;padding:22px;max-width:420px;width:100%;animation:pop .35s forwards}
.sheet .msg{font-size:19px;font-weight:800;margin-bottom:18px;line-height:1.35;text-align:center}

/* Leaderboard */
.podium{display:flex;align-items:flex-end;justify-content:center;gap:10px;margin:6px 0 20px}
.pod{flex:1;max-width:150px;display:flex;flex-direction:column;align-items:center;gap:6px;color:#fff;min-width:0}
.pod .kname{font-size:17px;text-shadow:0 2px 0 rgba(36,38,74,.18)}
.pod .ava{box-shadow:0 4px 0 rgba(36,38,74,.15)}
.pod.p1 .ava{width:92px;height:92px;font-size:56px;animation:float 2.4s ease-in-out infinite}
.block{width:100%;border-radius:18px 18px 8px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:#fff}
.block .pts{font-size:16px;text-shadow:0 1px 0 rgba(0,0,0,.2)}
.pod.p1 .block{height:124px;background:linear-gradient(#FFE066,#F5A300)}
.pod.p2 .block{height:94px;background:linear-gradient(#E9ECF5,#A9AFC6)}
.pod.p3 .block{height:74px;background:linear-gradient(#FFC59E,#E8742A)}
.lrow{display:flex;align-items:center;gap:12px;background:#fff;border-radius:20px;padding:10px 14px;margin-bottom:10px;box-shadow:0 4px 0 rgba(36,38,74,.12)}
.rank{width:34px;text-align:center;font-weight:900;font-size:22px;flex:none}
.lmain{flex:1;min-width:0}
.lmain .kname{font-size:18px}
.lscore{text-align:right;font-weight:900;font-size:20px;white-space:nowrap}
.lscore small{display:block;font-size:13px;color:var(--muted);font-weight:800}

/* PIN */
.center{text-align:center}
.pintitle{font-size:21px;font-weight:900;margin-bottom:18px}
.dots{display:flex;justify-content:center;gap:16px;margin-bottom:10px}
.dot{width:22px;height:22px;border-radius:50%;border:3px solid var(--grape)}
.dot.on{background:var(--grape)}
.dots.shake{animation:shake .4s}
.pinmsg{min-height:24px;font-weight:800;color:var(--muted);margin-bottom:12px}
.pinmsg.err{color:var(--tomato)}
.keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:300px;margin:0 auto}
.key{height:66px;border-radius:20px;background:#F2F4FA;font-size:28px;font-weight:900;box-shadow:0 4px 0 rgba(36,38,74,.12)}
.key:active{transform:translateY(3px);box-shadow:none}

/* Parent zone */
.pkhead{display:flex;align-items:center;gap:12px}
.pkhead .kname{font-size:21px}
.pkstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;text-align:center}
.pkstats div{background:#F6F7FB;border-radius:14px;padding:8px 4px}
.pkstats b{display:block;font-size:20px}
.pkstats small{color:var(--muted);font-weight:800;font-size:12px}
details{margin-top:14px}
summary{font-weight:800;color:var(--muted)}
.hist{display:flex;justify-content:space-between;padding:8px 2px;border-bottom:1px solid #EEF0F6;font-weight:700}
.setrow{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;font-weight:800}
.seg3{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.chip{padding:8px 10px;border-radius:12px;background:#F2F4FA;font-weight:900;font-size:15px}
.chip.on{background:var(--grape);color:#fff}
.toggle{font-size:24px;padding:6px 14px;border-radius:14px;background:#F2F4FA}
.toggle.on{background:#D8F5E5}
.note{color:var(--muted);font-size:13px;font-weight:700;margin:16px 0 0;line-height:1.4}

.worth{font-weight:900;font-size:19px;color:#18794A;background:#E6F8EE;border-radius:999px;padding:3px 10px}
.warnchip{font-weight:800;font-size:12px;color:#B42318;background:#FFE4E1;border-radius:999px;padding:4px 10px;text-align:center;line-height:1.25}
.piggy{display:flex;flex-direction:column;align-items:center;gap:2px;background:#fff;border-radius:16px;padding:8px 12px;margin:0 0 6px;font-weight:900;font-size:17px;color:#18794A;box-shadow:0 4px 0 rgba(36,38,74,.12);text-align:center}
.piggy.warn small{color:#B42318;font-size:14px;line-height:1.3;font-weight:800}
.money{margin-top:14px;background:#F6F7FB;border-radius:18px;padding:12px 14px}
.mrow{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;font-weight:800}
.rateBox{display:flex;align-items:center;gap:6px;font-weight:900;font-size:17px;white-space:nowrap}
.input.sm{width:92px;font-size:19px;padding:8px 10px;border-radius:12px;text-align:right}
.mhint{display:block;color:var(--muted);font-weight:700;font-size:12px;margin:-2px 0 12px}
.budget{font-size:20px;font-weight:900}
.budget.neg{color:#B42318}
.warnline{margin-top:10px;color:#B42318;font-weight:800;font-size:14px;line-height:1.35}
.quick{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:12px 0 16px}
.sheet .input{text-align:center}
.sheet .sub{color:var(--muted);font-weight:700;font-size:14px;text-align:center;margin:-8px 0 12px}
.wallet{position:relative;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px;background:#fff;border-radius:24px;padding:12px 14px;margin:0 0 10px;box-shadow:0 6px 0 rgba(36,38,74,.14)}
.wallet.solo{grid-template-columns:1fr}
.wcell{display:flex;flex-direction:column;align-items:center;line-height:1;min-width:0}
.wcell small{font-size:13px;font-weight:800;color:var(--muted);margin-top:6px}
.wbig{font-size:46px;font-weight:900;display:flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums;white-space:nowrap}
.wbig .ic{font-size:34px}
.wtok .wbig{color:#B07800}
.wmon .wbig{color:#18794A}
.weq{font-size:30px;font-weight:900;color:#A3A8C3}
.wwarn{grid-column:1/-1;text-align:center;color:#B42318;background:#FFE4E1;border-radius:14px;padding:6px 10px;margin-top:6px;font-weight:800;font-size:14px;line-height:1.3}
.wallet.up{animation:walletUp .8s}
.wallet.up .wbig{animation:numUp .8s}
.wallet.down{animation:shake .45s}
.wallet.down .wbig{animation:numDown .9s}
.floatTxt{position:fixed;width:150px;margin:-16px 0 0 -75px;text-align:center;font-weight:900;font-size:30px;pointer-events:none;z-index:70;text-shadow:0 2px 0 #fff;white-space:nowrap}
.floatTxt.plus{color:#18794A;animation:floatUp 1.3s ease-out forwards}
.floatTxt.minus{color:#D9483A;animation:floatDown 1.3s ease-out forwards}
@keyframes walletUp{0%{transform:scale(1)}35%{transform:scale(1.05);box-shadow:0 6px 0 rgba(36,38,74,.14),0 0 0 7px rgba(47,191,113,.45)}100%{transform:scale(1)}}
@keyframes numUp{0%{transform:scale(1)}35%{transform:scale(1.22)}100%{transform:scale(1)}}
@keyframes numDown{0%{transform:scale(1)}30%{transform:scale(.88);color:#D9483A}100%{transform:scale(1)}}
@keyframes floatUp{0%{opacity:0;transform:translateY(12px) scale(.8)}20%{opacity:1;transform:translateY(0) scale(1.15)}100%{opacity:0;transform:translateY(-60px) scale(1)}}
@keyframes floatDown{0%{opacity:0;transform:translateY(-6px) scale(1.1)}20%{opacity:1}100%{opacity:0;transform:translateY(56px) scale(.9)}}
.ver{text-align:center;color:rgba(255,255,255,.85);font-weight:800;font-size:13px;margin:22px 0 0}
#upd{position:fixed;inset:0;z-index:85;background:rgba(36,38,74,.55);display:flex;align-items:flex-end;animation:fade .2s}
.updp{width:100%;max-width:760px;margin:0 auto;background:#fff;border-radius:26px 26px 0 0;padding:20px 18px calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;animation:updUp .35s cubic-bezier(.2,.8,.3,1)}
.updtag{align-self:flex-start;background:var(--grape);color:#fff;font-size:13px;font-weight:900;padding:5px 12px;border-radius:999px}
.updt{margin:6px 0 0;font-size:24px;line-height:1.2;font-weight:900}
.upds{color:var(--muted);font-size:15px;font-weight:700}
.updl{display:flex;flex-direction:column;gap:10px;margin:8px 0 6px}
.updi{display:flex;gap:12px;align-items:flex-start;background:#F2F4FA;border-radius:16px;padding:12px}
.updic{font-size:28px;line-height:1.1;flex:none}
.updi b{display:block;font-size:16px;font-weight:900}
.updi span{display:block;color:var(--muted);font-size:14px;line-height:1.35;margin-top:2px;font-weight:700}
.updmsg{font-weight:800;font-size:15px;line-height:1.4}
.updmsg:empty{display:none}
.updgo,.updlater{width:100%}
.updlater{background:#F2F4FA;box-shadow:none}
.updlater[hidden]{display:none}
@keyframes updUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-7px)}80%{transform:translateX(7px)}}
@keyframes pop{0%{transform:scale(.8)}60%{transform:scale(1.12) rotate(-3deg)}100%{transform:scale(1.04)}}
@keyframes hop{0%{transform:translateY(0) scale(1)}40%{transform:translateY(-24px) scale(1.16) rotate(-4deg)}70%{transform:translateY(4px) scale(.97)}100%{transform:translateY(0) scale(1)}}
@keyframes bump{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1)}}
@keyframes burst{
  0%{transform:translate(-50%,-50%) rotate(0) scale(.4);opacity:1}
  35%{transform:translate(calc(-50% + var(--dx) * .75),calc(-50% + var(--dy))) rotate(calc(var(--r) * .4)) scale(1);opacity:1}
  100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy) + 360px)) rotate(var(--r)) scale(.9);opacity:0}
}
@keyframes banner{
  0%{transform:translate(-50%,-50%) scale(.2) rotate(-12deg);opacity:0}
  25%{transform:translate(-50%,-50%) scale(1.15) rotate(3deg);opacity:1}
  40%{transform:translate(-50%,-50%) scale(1) rotate(0)}
  80%{opacity:1;transform:translate(-50%,-56%) scale(1)}
  100%{opacity:0;transform:translate(-50%,-78%) scale(.9)}
}
@keyframes fade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion: reduce){
  .logo span,.pod.p1 .ava{animation:none}
}
`;

// ───────────────────────── Web app (runs inside the WebView) ─────────────────────────

function webApp() {
  "use strict";

  const LANGS = {
    lt: { flag: "🇱🇹", code: "LT", locale: "lt-LT" },
    en: { flag: "🇬🇧", code: "EN", locale: "en-GB" },
    es: { flag: "🇪🇸", code: "ES", locale: "es-ES" },
  };

  const I18N = {
    en: {
      appTitle: "Reading Stars",
      whoPlays: "Who is playing?",
      addKid: "New player",
      newPlayer: "New player",
      editPlayer: "Edit player",
      leaderboard: "Leaderboard",
      parents: "Parents",
      parentArea: "Parent zone",
      name: "Name",
      namePh: "Type your name",
      level: "Level",
      beginner: "Beginner",
      expert: "Expert",
      beginnerAges: "4–6 years",
      expertAges: "9–11 years",
      beginnerDesc: "1–2 syllables",
      expertDesc: "3–6 syllables",
      avatar: "Pick your avatar",
      save: "Save",
      cancel: "Cancel",
      hint: "Read the word and tap its picture!",
      skip: "Skip",
      tryAgain: "Oops! Try again 🙂",
      tryAgainMinus: "Oops! −1 🪙 Try again",
      walletTokens: "Tokens",
      walletMoney: "Money",
      correctNoToken: "Correct! Tokens are for first-try answers 😉",
      praise: ["Great job!", "Super!", "You did it!", "Awesome!", "Fantastic!", "Hooray!"],
      enterPin: "Enter the parent PIN",
      setPin: "Create a 4-digit parent PIN",
      confirmPin: "Repeat the PIN",
      wrongPin: "Wrong PIN",
      pinMismatch: "The PINs don't match. Try again.",
      pinSaved: "PIN saved",
      tooMany: (s) => `Too many tries. Wait ${s} s.`,
      payout: "Pay out",
      payoutConfirm: (name, n) => `Pay out 🪙 ${n} to ${name}? The token balance goes back to 0. Leaderboard points stay.`,
      paidToast: (name, n) => `💸 Paid out ${n} to ${name}`,
      history: "Payout history",
      noHistory: "No payouts yet",
      edit: "Edit",
      deleteConfirm: (name) => `Delete ${name}? All tokens and points will be lost.`,
      deleteBtn: "Delete",
      changePin: "Change PIN",
      settings: "Settings",
      wordStyle: "Word letters",
      sound: "Sounds",
      balance: "Balance",
      allTime: "All-time",
      paidOut: "Paid out",
      noKids: "Add the first player to start! 🎈",
      enterName: "Please type a name 🙂",
      storageNote: "Progress is saved in Files › iCloud Drive › Scriptable › ReadingStars.",
      worthLong: (n, m) => `Your ${n} 🪙 are worth ${m}`,
      needTopUp: "Not enough money left to exchange your tokens. Ask your parents to top up! 💰",
      needTopUpShort: "💰 Ask parents to top up",
      ok: "OK 👍",
      tokenValue: "1 token is worth",
      rateOff: "0 or empty = no money for this kid",
      budget: "Budget (kids can't see it)",
      budgetShort: (m) => `The budget is lower than the token value (${m}). The kid sees a "top up" message.`,
      topUp: "Top up",
      topUpTitle: (name) => `Top up ${name}'s budget`,
      topUpHint: "Amount to add. Use a minus sign to take money out.",
      toppedUp: (name, m) => `💰 ${name}: ${m}`,
      topUpFirst: "Top up the budget to pay out",
      payoutConfirmMoney: (name, n, m, rest) => `Exchange 🪙 ${n} for ${m} with ${name}?` + (rest ? ` The budget doesn't cover all tokens: 🪙 ${rest} will stay.` : "") + " Leaderboard points stay.",
      paidToastMoney: (name, m) => `💸 ${name}: ${m}`,
      currency: "Currency",
      invalidAmount: "Enter a number, e.g. 0.10",
      saved: "Saved ✅",
      updNew: (v) => `New version ${v}`,
      updDefaultTitle: "An update is ready",
      updYouHave: (cur, more) => `You have ${cur}${more}. Here’s what you get:`,
      updMore: (n) => ` (and ${n} more update${n > 1 ? "s" : ""})`,
      updNow: "Update now",
      updLater: "Later, remind me in 2 days",
      updUpdating: "Updating…",
      updatedTo: (v) => `Updated to ${v}`,
      updDone: "✓ Done. Close the app and open it again to start using the new version.",
      updGotIt: "Got it",
      updRetry: "Try again",
      updFailed: "Update failed",
      version: "Version",
      sample: "ap-ple",
    },
    es: {
      appTitle: "Estrellas lectoras",
      whoPlays: "¿Quién juega?",
      addKid: "Nuevo jugador",
      newPlayer: "Nuevo jugador",
      editPlayer: "Editar jugador",
      leaderboard: "Clasificación",
      parents: "Padres",
      parentArea: "Zona de padres",
      name: "Nombre",
      namePh: "Escribe tu nombre",
      level: "Nivel",
      beginner: "Principiante",
      expert: "Experto",
      beginnerAges: "4–6 años",
      expertAges: "9–11 años",
      beginnerDesc: "1–2 sílabas",
      expertDesc: "3–6 sílabas",
      avatar: "Elige tu avatar",
      save: "Guardar",
      cancel: "Cancelar",
      hint: "¡Lee la palabra y toca su dibujo!",
      skip: "Saltar",
      tryAgain: "¡Uy! Inténtalo otra vez 🙂",
      tryAgainMinus: "¡Uy! −1 🪙 Inténtalo otra vez",
      walletTokens: "Fichas",
      walletMoney: "Dinero",
      correctNoToken: "¡Correcto! Las fichas son para aciertos a la primera 😉",
      praise: ["¡Muy bien!", "¡Genial!", "¡Lo lograste!", "¡Increíble!", "¡Fantástico!", "¡Bravo!"],
      enterPin: "Introduce el PIN de padres",
      setPin: "Crea un PIN de padres de 4 dígitos",
      confirmPin: "Repite el PIN",
      wrongPin: "PIN incorrecto",
      pinMismatch: "Los PIN no coinciden. Inténtalo de nuevo.",
      pinSaved: "PIN guardado",
      tooMany: (s) => `Demasiados intentos. Espera ${s} s.`,
      payout: "Canjear",
      payoutConfirm: (name, n) => `¿Canjear 🪙 ${n} de ${name}? El saldo de fichas vuelve a 0. Los puntos de la clasificación se mantienen.`,
      paidToast: (name, n) => `💸 ${name}: ${n} fichas canjeadas`,
      history: "Historial de canjes",
      noHistory: "Aún no hay canjes",
      edit: "Editar",
      deleteConfirm: (name) => `¿Eliminar a ${name}? Se perderán todas sus fichas y puntos.`,
      deleteBtn: "Eliminar",
      changePin: "Cambiar PIN",
      settings: "Ajustes",
      wordStyle: "Letras de la palabra",
      sound: "Sonidos",
      balance: "Saldo",
      allTime: "Total",
      paidOut: "Canjeado",
      noKids: "¡Añade el primer jugador para empezar! 🎈",
      enterName: "Escribe un nombre 🙂",
      storageNote: "El progreso se guarda en Archivos › iCloud Drive › Scriptable › ReadingStars.",
      worthLong: (n, m) => `Tus ${n} 🪙 valen ${m}`,
      needTopUp: "No queda suficiente dinero para canjear tus fichas. ¡Pide a tus padres que recarguen! 💰",
      needTopUpShort: "💰 Pide una recarga",
      ok: "¡Vale! 👍",
      tokenValue: "1 ficha vale",
      rateOff: "0 o vacío = sin dinero para este niño",
      budget: "Presupuesto (los niños no lo ven)",
      budgetShort: (m) => `El presupuesto es menor que el valor de las fichas (${m}). El niño ve un aviso para recargar.`,
      topUp: "Recargar",
      topUpTitle: (name) => `Recargar el presupuesto de ${name}`,
      topUpHint: "Importe a añadir. Usa un signo menos para restar.",
      toppedUp: (name, m) => `💰 ${name}: ${m}`,
      topUpFirst: "Recarga el presupuesto para canjear",
      payoutConfirmMoney: (name, n, m, rest) => `¿Canjear 🪙 ${n} de ${name} por ${m}?` + (rest ? ` El presupuesto no cubre todas: quedarán 🪙 ${rest}.` : "") + " Los puntos de la clasificación se mantienen.",
      paidToastMoney: (name, m) => `💸 ${name}: ${m}`,
      currency: "Moneda",
      invalidAmount: "Escribe un número, p. ej. 0,10",
      saved: "Guardado ✅",
      updNew: (v) => `Nueva versión ${v}`,
      updDefaultTitle: "Hay una actualización",
      updYouHave: (cur, more) => `Tienes la ${cur}${more}. Esto es lo nuevo:`,
      updMore: (n) => ` (y ${n} actualizaci${n > 1 ? "ones" : "ón"} más)`,
      updNow: "Actualizar ahora",
      updLater: "Más tarde, recuérdamelo en 2 días",
      updUpdating: "Actualizando…",
      updatedTo: (v) => `Actualizado a ${v}`,
      updDone: "✓ Listo. Cierra la app y vuelve a abrirla para usar la nueva versión.",
      updGotIt: "Entendido",
      updRetry: "Reintentar",
      updFailed: "Error al actualizar",
      version: "Versión",
      sample: "ga-to",
    },
    lt: {
      appTitle: "Skaitymo žvaigždės",
      whoPlays: "Kas žaidžia?",
      addKid: "Naujas žaidėjas",
      newPlayer: "Naujas žaidėjas",
      editPlayer: "Keisti žaidėją",
      leaderboard: "Lyderiai",
      parents: "Tėvams",
      parentArea: "Tėvų zona",
      name: "Vardas",
      namePh: "Įrašyk vardą",
      level: "Lygis",
      beginner: "Pradedantysis",
      expert: "Ekspertas",
      beginnerAges: "4–6 metų",
      expertAges: "9–11 metų",
      beginnerDesc: "1–2 skiemenys",
      expertDesc: "3–6 skiemenys",
      avatar: "Išsirink veikėją",
      save: "Išsaugoti",
      cancel: "Atšaukti",
      hint: "Perskaityk žodį ir paspausk paveikslėlį!",
      skip: "Praleisti",
      tryAgain: "Oi! Bandyk dar kartą 🙂",
      tryAgainMinus: "Oi! −1 🪙 Bandyk dar kartą",
      walletTokens: "Žetonai",
      walletMoney: "Pinigai",
      correctNoToken: "Teisingai! Žetonas – už atspėjimą iš pirmo karto 😉",
      praise: ["Puiku!", "Šaunu!", "Super!", "Nuostabu!", "Tau pavyko!", "Bravo!"],
      enterPin: "Įveskite tėvų PIN kodą",
      setPin: "Sukurkite 4 skaitmenų tėvų PIN kodą",
      confirmPin: "Pakartokite PIN kodą",
      wrongPin: "Neteisingas PIN kodas",
      pinMismatch: "PIN kodai nesutampa. Bandykite iš naujo.",
      pinSaved: "PIN kodas išsaugotas",
      tooMany: (s) => `Per daug bandymų. Palaukite ${s} s.`,
      payout: "Išmokėti",
      payoutConfirm: (name, n) => `${name}: išmokėti 🪙 ${n}? Žetonų likutis taps 0, o lyderių taškai išliks.`,
      paidToast: (name, n) => `💸 ${name}: išmokėta ${n}`,
      history: "Išmokėjimų istorija",
      noHistory: "Išmokėjimų dar nebuvo",
      edit: "Keisti",
      deleteConfirm: (name) => `Ištrinti žaidėją „${name}“? Visi žetonai ir taškai bus prarasti.`,
      deleteBtn: "Ištrinti",
      changePin: "Keisti PIN kodą",
      settings: "Nustatymai",
      wordStyle: "Žodžio raidės",
      sound: "Garsai",
      balance: "Likutis",
      allTime: "Iš viso",
      paidOut: "Išmokėta",
      noKids: "Pridėk pirmą žaidėją ir pradėkime! 🎈",
      enterName: "Įrašyk vardą 🙂",
      storageNote: "Duomenys saugomi: Files › iCloud Drive › Scriptable › ReadingStars.",
      worthLong: (n, m) => `Tavo ${n} 🪙 vertė: ${m}`,
      needTopUp: "Nebeliko pakankamai pinigų žetonams iškeisti. Paprašyk tėvų papildyti! 💰",
      needTopUpShort: "💰 Paprašyk papildyti",
      ok: "Gerai 👍",
      tokenValue: "1 žetono vertė",
      rateOff: "0 arba tuščia – šiam vaikui pinigai nerodomi",
      budget: "Biudžetas (vaikai nemato)",
      budgetShort: (m) => `Biudžetas mažesnis už žetonų vertę (${m}). Vaikas mato prašymą papildyti.`,
      topUp: "Papildyti",
      topUpTitle: (name) => `${name}: papildyti biudžetą`,
      topUpHint: "Pridedama suma. Su minusu – atimama.",
      toppedUp: (name, m) => `💰 ${name}: ${m}`,
      topUpFirst: "Papildykite biudžetą, kad galėtumėte išmokėti",
      payoutConfirmMoney: (name, n, m, rest) => `${name}: iškeisti 🪙 ${n} į ${m}?` + (rest ? ` Biudžeto užtenka ne visiems: liks 🪙 ${rest}.` : "") + " Lyderių taškai išliks.",
      paidToastMoney: (name, m) => `💸 ${name}: ${m}`,
      currency: "Valiuta",
      invalidAmount: "Įveskite skaičių, pvz., 0,10",
      saved: "Išsaugota ✅",
      updNew: (v) => `Nauja versija ${v}`,
      updDefaultTitle: "Paruoštas atnaujinimas",
      updYouHave: (cur, more) => `Jūs turite ${cur}${more}. Štai kas naujo:`,
      updMore: (n) => ` (ir dar ${n} atnaujinim${n % 10 === 1 && n % 100 !== 11 ? "as" : n % 10 >= 2 && (n % 100 < 10 || n % 100 >= 20) ? "ai" : "ų"})`,
      updNow: "Atnaujinti dabar",
      updLater: "Vėliau, priminti po 2 dienų",
      updUpdating: "Atnaujinama…",
      updatedTo: (v) => `Atnaujinta į ${v}`,
      updDone: "✓ Atlikta. Uždarykite programėlę ir atidarykite iš naujo, kad pradėtumėte naudoti naują versiją.",
      updGotIt: "Supratau",
      updRetry: "Bandyti dar kartą",
      updFailed: "Nepavyko atnaujinti",
      version: "Versija",
      sample: "na-mas",
    },
  };

  // "syl-la-bles|emoji". Beginner uses words with 1–2 syllables, Expert uses 3–6.
  const WORDS = {
    lt: [
      "šuo|🐶", "ka-tė|🐱", "na-mas|🏠", "kar-vė|🐄", "sau-lė|☀️", "žu-vis|🐟", "me-dis|🌳", "gė-lė|🌸",
      "an-tis|🦆", "var-lė|🐸", "meš-ka|🐻", "ar-klys|🐴", "ti-gras|🐯", "pan-da|🐼",
      "pie-nas|🥛", "duo-na|🍞", "tor-tas|🎂", "žvaigž-dė|⭐", "lo-va|🛏️", "lai-vas|🚢", "paukš-tis|🐦",
      "vil-kas|🐺", "ož-ka|🐐", "kiau-lė|🐷", "triu-šis|🐰", "pe-lė|🐭", "sū-ris|🧀", "kriau-šė|🍐",
      "mor-ka|🥕", "bul-vė|🥔", "lie-tus|🌧️", "snie-gas|❄️", "braš-kė|🍓", "skė-tis|☂️", "vėž-lys|🐢",
      "srai-gė|🐌", "rak-tas|🔑", "kny-ga|📖", "bi-tė|🐝", "ba-tas|👟", "pi-ca|🍕", "vikš-ras|🐛", "gry-bas|🍄",
      "dru-ge-lis|🦋", "kro-ko-di-las|🐊", "sraig-tas-par-nis|🚁", "di-no-zau-ras|🦕", "ken-gū-ra|🦘",
      "aš-tuon-ko-jis|🐙", "a-na-na-sas|🍍", "ar-bū-zas|🍉", "po-mi-do-ras|🍅", "kom-piu-te-ris|💻",
      "te-le-fo-nas|☎️", "mik-ros-ko-pas|🔬", "hi-po-po-ta-mas|🦛", "vie-na-ra-gis|🦄", "fla-min-gas|🦩",
      "go-ri-la|🦍", "a-vo-ka-das|🥑", "bro-ko-liai|🥦", "spa-ge-čiai|🍝", "mė-sai-nis|🍔",
      "te-le-vi-zo-rius|📺", "ra-ga-no-sis|🦏", "mo-to-cik-las|🏍️", "dvi-ra-tis|🚲", "šikš-no-spar-nis|🦇",
      "ži-ra-fa|🦒", "mė-nu-lis|🌙", "bez-džio-nė|🐒", "ro-bo-tas|🤖", "o-buo-lys|🍎", "trau-ki-nys|🚆",
      "au-to-mo-bi-lis|🚗", "ba-na-nas|🍌", "ci-tri-na|🍋", "lėk-tu-vas|✈️", "pin-gvi-nas|🐧", "pa-pū-ga|🦜",
      "vo-ve-rė|🐿️", "kiau-ši-nis|🥚", "ra-ke-ta|🚀", "de-be-sis|☁️", "vai-vo-rykš-tė|🌈", "mo-li-gas|🎃",
      "sau-sai-nis|🍪", "gi-ta-ra|🎸", "ti-ra-no-zau-ras|🦖",
      "cir-kas|🎪", "ci-lin-dras|🎩", "fė-ja|🧚", "fut-bo-las|⚽", "ho-ke-jus|🏒", "ho-te-lis|🏨",
      "jau-tis|🐂", "ja-vai|🌾", "nak-tis|🌃", "o-ran-gu-tan-gas|🦧", "u-pė|🏞️", "u-fo-nau-tas|👽",
      "ū-ki-nin-kas|🧑‍🌾", "ū-sai|🥸", "čem-pi-o-nas|🏆",
    ],
    en: [
      "cat|🐱", "dog|🐶", "sun|☀️", "fish|🐟", "bus|🚌", "car|🚗", "cake|🍰", "tree|🌳", "moon|🌙", "star|⭐",
      "duck|🦆", "frog|🐸", "bear|🐻", "house|🏠", "ball|⚽", "shoe|👟", "egg|🥚", "milk|🥛", "pig|🐷",
      "cow|🐄", "bee|🐝", "hat|🎩", "key|🔑", "book|📖", "ap-ple|🍎", "mon-key|🐒", "ti-ger|🐯", "ro-bot|🤖",
      "pan-da|🐼", "ze-bra|🦓", "pen-cil|✏️", "rab-bit|🐰", "ba-by|👶", "rock-et|🚀", "flow-er|🌸",
      "lem-on|🍋", "car-rot|🥕", "cook-ie|🍪", "pen-guin|🐧", "tur-tle|🐢", "chick-en|🐔", "pump-kin|🎃",
      "gui-tar|🎸", "piz-za|🍕", "snow-man|⛄", "rain-bow|🌈", "cup-cake|🧁", "gi-raffe|🦒", "mush-room|🍄",
      "ba-na-na|🍌", "el-e-phant|🐘", "but-ter-fly|🦋", "hel-i-cop-ter|🚁", "di-no-saur|🦕", "croc-o-dile|🐊",
      "kan-ga-roo|🦘", "oc-to-pus|🐙", "pine-ap-ple|🍍", "wa-ter-mel-on|🍉", "straw-ber-ry|🍓",
      "to-ma-to|🍅", "po-ta-to|🥔", "um-brel-la|☂️", "com-put-er|💻", "tel-e-phone|☎️", "mi-cro-scope|🔬",
      "hip-po-pot-a-mus|🦛", "u-ni-corn|🦄", "fla-min-go|🦩", "go-ril-la|🦍", "cat-er-pil-lar|🐛",
      "av-o-ca-do|🥑", "broc-co-li|🥦", "spa-ghet-ti|🍝", "ham-bur-ger|🍔", "tel-e-vi-sion|📺",
      "rhi-noc-er-os|🦏", "sax-o-phone|🎷", "vi-o-lin|🎻", "am-bu-lance|🚑", "mo-tor-cy-cle|🏍️",
      "bi-cy-cle|🚲", "pi-an-o|🎹", "ty-ran-no-sau-rus|🦖",
      "ice|🧊", "ice-cream|🍦", "night|🌃", "nut|🥜", "u-ni-form|🥋", "van|🚐", "yacht|🛥️", "yarn|🧶",
      "ze-ro|0️⃣", "zip-per|🤐",
    ],
    es: [
      "sol|☀️", "pez|🐟", "flor|🌸", "tren|🚆", "pan|🍞", "ga-to|🐱", "pe-rro|🐶", "ca-sa|🏠", "lu-na|🌙",
      "pa-to|🦆", "o-so|🐻", "ra-na|🐸", "ár-bol|🌳", "co-che|🚗", "le-che|🥛", "va-ca|🐄", "mo-no|🐒",
      "ti-gre|🐯", "ce-bra|🦓", "pan-da|🐼", "lá-piz|✏️", "ro-bot|🤖", "man-go|🥭", "pi-ña|🍍", "fre-sa|🍓",
      "nu-be|☁️", "ca-ma|🛏️", "bar-co|🚢", "hue-vo|🥚", "cer-do|🐷", "li-bro|📖", "lla-ve|🔑", "piz-za|🍕",
      "tor-ta|🎂", "se-ta|🍄", "pe-ra|🍐", "bú-ho|🦉",
      "ma-ri-po-sa|🦋", "e-le-fan-te|🐘", "co-co-dri-lo|🐊", "he-li-cóp-te-ro|🚁", "di-no-sau-rio|🦕",
      "can-gu-ro|🦘", "plá-ta-no|🍌", "san-dí-a|🍉", "to-ma-te|🍅", "pa-ra-guas|☂️", "com-pu-ta-do-ra|💻",
      "te-lé-fo-no|☎️", "mi-cros-co-pio|🔬", "hi-po-pó-ta-mo|🦛", "u-ni-cor-nio|🦄", "fla-men-co|🦩",
      "go-ri-la|🦍", "a-gua-ca-te|🥑", "bró-co-li|🥦", "es-pa-gue-tis|🍝", "ham-bur-gue-sa|🍔",
      "te-le-vi-sión|📺", "ri-no-ce-ron-te|🦏", "am-bu-lan-cia|🚑", "mo-to-ci-cle-ta|🏍️", "bi-ci-cle-ta|🚲",
      "ca-ra-col|🐌", "mur-cié-la-go|🦇", "tor-tu-ga|🐢", "ji-ra-fa|🦒", "es-tre-lla|⭐", "a-be-ja|🐝",
      "pin-güi-no|🐧", "za-na-ho-ria|🥕", "ga-lle-ta|🍪", "ca-la-ba-za|🎃", "ti-ra-no-sau-rio|🦖",
      "o-ru-ga|🐛", "gui-ta-rra|🎸", "co-ne-jo|🐰", "ar-co-í-ris|🌈", "ga-lli-na|🐔",
      "i-gle-sia|⛪", "ja-bón|🧼", "ju-go|🧃", "ki-mo-no|👘", "u-ni-for-me|🥋", "ya-te|🛥️", "ye-gua|🐴",
      "za-pa-to|👞",
    ],
  };


  // 100 more words: "emoji|english|spanish|lithuanian"
  const MORE_WORDS = [
    "🦁|li-on|le-ón|liū-tas", "🦊|fox|zo-rro|la-pė", "🐨|ko-a-la|ko-a-la|ko-a-la", "🐹|ham-ster|hám-ster|žiur-kė-nas",
    "🦔|hedge-hog|e-ri-zo|e-žys", "🐑|sheep|o-ve-ja|a-vis", "🐫|cam-el|ca-me-llo|kup-ra-nu-ga-ris", "🦌|deer|cier-vo|el-nias",
    "🐳|whale|ba-lle-na|ban-gi-nis", "🐬|dol-phin|del-fín|del-fi-nas", "🦈|shark|ti-bu-rón|ryk-lys", "🦀|crab|can-gre-jo|kra-bas",
    "🐞|la-dy-bug|ma-ri-qui-ta|bo-ru-žė", "🐜|ant|hor-mi-ga|skruz-dė-lė", "🕷️|spi-der|a-ra-ña|vo-ras", "🦅|ea-gle|á-gui-la|e-re-lis",
    "🦢|swan|cis-ne|gul-bė", "🦃|tur-key|pa-vo|ka-la-ku-tas", "🐍|snake|ser-pien-te|gy-va-tė", "🦎|liz-ard|la-gar-ti-ja|drie-žas",
    "🦗|crick-et|gri-llo|svirp-lys", "🦦|ot-ter|nu-tria|ū-dra", "🦙|lla-ma|lla-ma|la-ma", "🐆|leop-ard|le-o-par-do|le-o-par-das",
    "🐓|roost-er|ga-llo|gai-dys", "🐤|chick|po-lli-to|viš-čiu-kas", "🦑|squid|ca-la-mar|kal-ma-ras", "🍇|grapes|u-vas|vy-nuo-gės",
    "🍒|cher-ries|ce-re-zas|vyš-nios", "🍑|peach|me-lo-co-tón|per-si-kas", "🥝|ki-wi|ki-wi|ki-vis", "🥥|co-co-nut|co-co|ko-ko-sas",
    "🍊|or-ange|na-ran-ja|a-pel-si-nas", "🌽|corn|ma-íz|ku-ku-rū-zas", "🥒|cu-cum-ber|pe-pi-no|a-gur-kas", "🧅|on-ion|ce-bo-lla|svo-gū-nas",
    "🧄|gar-lic|a-jo|čes-na-kas", "🍭|lol-li-pop|pi-ru-lí|čiul-pu-kas", "🍩|do-nut|ros-qui-lla|spur-ga", "🍯|hon-ey|miel|me-dus",
    "🧈|but-ter|man-te-qui-lla|svies-tas", "🍫|choc-o-late|cho-co-la-te|šo-ko-la-das", "🍬|can-dy|ca-ra-me-lo|sal-dai-nis", "🥗|sal-ad|en-sa-la-da|sa-lo-tos",
    "🍜|noo-dles|fi-de-os|ma-ka-ro-nai", "🍚|rice|a-rroz|ry-žiai", "🎈|bal-loon|glo-bo|ba-lio-nas", "🎁|gift|re-ga-lo|do-va-na",
    "🪁|kite|co-me-ta|ait-va-ras", "🧸|ted-dy|pe-lu-che|meš-kiu-kas", "🥁|drum|tam-bor|būg-nas", "🎺|trum-pet|trom-pe-ta|tri-mi-tas",
    "✂️|scis-sors|ti-je-ras|žirk-lės", "🖍️|cray-on|cra-yón|krei-de-lė", "🔨|ham-mer|mar-ti-llo|plak-tu-kas", "🪑|chair|si-lla|kė-dė",
    "🚪|door|puer-ta|du-rys", "🕯️|can-dle|ve-la|žva-kė", "🛁|bath|ba-ñe-ra|vo-nia", "🧦|socks|cal-ce-ti-nes|ko-ji-nės",
    "👑|crown|co-ro-na|ka-rū-na", "👓|glass-es|ga-fas|a-ki-niai", "🎒|back-pack|mo-chi-la|kup-ri-nė", "⏰|clock|re-loj|ža-din-tu-vas",
    "🧲|mag-net|i-mán|mag-ne-tas", "🔦|flash-light|lin-ter-na|ži-bin-tu-vė-lis", "📷|cam-er-a|cá-ma-ra|fo-to-a-pa-ra-tas", "🎧|head-phones|au-ri-cu-la-res|au-si-nės",
    "🧩|puz-zle|rom-pe-ca-be-zas|dė-lio-nė", "🪀|yo-yo|yo-yó|jo-jo", "🛴|scoot-er|pa-ti-ne-te|pa-spir-tu-kas", "🚜|trac-tor|trac-tor|trak-to-rius",
    "🚕|tax-i|ta-xi|tak-si", "⛵|sail-boat|ve-le-ro|bur-lai-vis", "🛶|ca-noe|ca-no-a|ka-no-ja", "🚛|truck|ca-mión|sunk-ve-ži-mis",
    "🌵|cac-tus|cac-tus|kak-tu-sas", "🌻|sun-flow-er|gi-ra-sol|sau-lė-grą-ža", "🍁|leaf|ho-ja|la-pas", "🌊|wave|o-la|ban-ga",
    "⛰️|moun-tain|mon-ta-ña|kal-nas", "🌋|vol-ca-no|vol-cán|ug-ni-kal-nis", "🏝️|is-land|is-la|sa-la", "⚡|light-ning|ra-yo|žai-bas",
    "🌹|rose|ro-sa|ro-žė", "🌷|tu-lip|tu-li-pán|tul-pė", "💧|drop|go-ta|la-šas", "🏰|cas-tle|cas-ti-llo|pi-lis",
    "⛺|tent|tien-da|pa-la-pi-nė", "🏫|school|es-cue-la|mo-kyk-la", "🏥|hos-pi-tal|hos-pi-tal|li-go-ni-nė", "⚓|an-chor|an-cla|",
    "💎|di-a-mond|dia-man-te|dei-man-tas", "🦷|tooth|dien-te|dan-tis", "👂|ear|o-re-ja|au-sis", "👃|nose|na-riz|no-sis",
    "👁️|eye|o-jo|a-kis", "✋|hand|ma-no|ran-ka", "🦶|foot|pie|pė-da", "🪐|plan-et|pla-ne-ta|pla-ne-ta",
  ];
  const MORE_COL = { en: 1, es: 2, lt: 3 };

  const AVATARS = ["🦁", "🐯", "🐼", "🦊", "🐸", "🐵", "🦄", "🐨", "🐰", "🐶", "🐱", "🦖", "🐙", "🦋", "🐧", "🐳", "🦸", "🧚", "🚀", "⚽"];
  const AVA_BG = ["#FFE3B3", "#C9F2D9", "#CDE8FF", "#FFD3CF", "#E2D9FF", "#FFF0A6", "#BFF0E4", "#FFD6EA"];
  const PIC_BG = ["#FFF3C4", "#D8F5E5", "#DCEEFF", "#FFE0EC", "#ECE4FF"];
  const SEG_COLORS = ["#E8590C", "#1C7ED6", "#2B8A3E", "#D6336C", "#7048E8", "#0B7285"];
  const CONFETTI = ["#FF6B5B", "#FFD23F", "#2FBF71", "#4FB3F6", "#7C5CFA", "#FF8FC7", "#FFA94D"];

  // ── State ──
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function detectLang() {
    const l = (navigator.language || "en").slice(0, 2).toLowerCase();
    return LANGS[l] ? l : "en";
  }
  const init = window.__INITIAL__ && typeof window.__INITIAL__ === "object" ? window.__INITIAL__ : {};
  const state = {
    version: 1,
    lang: LANGS[init.lang] ? init.lang : detectLang(),
    pinHash: init.pinHash || null,
    settings: Object.assign({ wordCase: "cap", sound: true, currency: "EUR" }, init.settings || {}),
    kids: (Array.isArray(init.kids) ? init.kids : []).filter((k) => k && typeof k === "object").map(normalizeKid),
  };
  function normalizeKid(k) {
    const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
    const arr = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);
    return {
      id: k.id ? String(k.id) : uid(),
      name: k.name ? String(k.name) : "?",
      avatar: k.avatar || "🦁",
      level: k.level === "expert" ? "expert" : "beginner",
      tokens: Math.max(0, num(k.tokens)),
      total: Math.max(0, num(k.total)),
      correct: num(k.correct),
      wrong: num(k.wrong),
      created: num(k.created) || Date.now(),
      rate: Math.max(0, num(k.rate)),
      budget: Math.max(0, num(k.budget)),
      payouts: arr(k.payouts),
      topups: arr(k.topups),
    };
  }

  // ── Bridge to Scriptable: a cancelled "navigation" carries messages to the native side ──
  // Messages are queued and sent one at a time so two never cancel each other.
  const navQueue = [];
  let navBusy = false;
  function bridge(url) {
    if (url.indexOf("readingstars://save?") === 0) {
      for (let i = navQueue.length - 1; i >= 0; i--) if (navQueue[i].indexOf("readingstars://save?") === 0) navQueue.splice(i, 1);
    }
    navQueue.push(url);
    pumpBridge();
  }
  function pumpBridge() {
    if (navBusy || !navQueue.length) return;
    navBusy = true;
    const url = navQueue.shift();
    try {
      window.location.href = url;
    } catch (e) {}
    setTimeout(() => {
      navBusy = false;
      pumpBridge();
    }, 150);
  }
  // send(action, params, callback): the native side answers through window.__done(req, ok, message)
  let reqSeq = 0;
  const replies = {};
  function send(action, params, cb) {
    const id = "r" + ++reqSeq + "-" + Date.now();
    if (cb) replies[id] = cb;
    bridge("readingstars://" + action + "?p=" + encodeURIComponent(JSON.stringify(Object.assign({ req: id }, params || {}))));
  }
  window.__done = function (id, ok, msg) {
    const cb = replies[id];
    delete replies[id];
    if (cb) cb(ok, msg);
  };
  let saveTimer = null;
  window.__flush = function () {
    return JSON.stringify(state);
  };
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => bridge("readingstars://save?d=" + encodeURIComponent(JSON.stringify(state))), 250);
  }

  // ── Helpers ──
  function t(key, ...args) {
    const dict = I18N[state.lang] || I18N.en;
    let v = dict[key];
    if (v === undefined) v = I18N.en[key];
    if (typeof v === "function") return v(...args);
    return v === undefined ? key : v;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pickRand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function getKid(id) {
    return state.kids.find((k) => k.id === id);
  }
  function avaBg(k) {
    let h = 0;
    for (const ch of String(k.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return AVA_BG[h % AVA_BG.length];
  }
  function levelBadge(level) {
    return `<span class="badge ${level}">${level === "expert" ? "🦉" : "🐣"} ${esc(t(level))}</span>`;
  }
  function hashPin(pin) {
    let h = 2166136261;
    const s = "reading-stars:" + pin;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }
  function fmtDate(ms) {
    try {
      return new Date(ms).toLocaleDateString(LANGS[state.lang].locale, { year: "numeric", month: "short", day: "numeric" });
    } catch (e) {
      return new Date(ms).toDateString();
    }
  }
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
  function ask(msg, okText, danger) {
    return new Promise((resolve) => {
      const m = document.createElement("div");
      m.className = "modal";
      m.innerHTML = `<div class="sheet"><div class="msg">${esc(msg)}</div><div class="row">
        <button class="btn ghost" data-r="0">${esc(t("cancel"))}</button>
        <button class="btn ${danger ? "danger" : "go"}" data-r="1">${esc(okText)}</button></div></div>`;
      m.addEventListener("click", (e) => {
        const b = e.target.closest("[data-r]");
        if (!b) return;
        e.stopPropagation();
        m.remove();
        resolve(b.dataset.r === "1");
      });
      document.body.appendChild(m);
    });
  }

  function notice(msg) {
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<div class="sheet"><div class="msg">${esc(msg)}</div><button class="btn go wide" data-r="1">${esc(t("ok"))}</button></div>`;
    m.addEventListener("click", (e) => {
      if (!e.target.closest("[data-r]")) return;
      e.stopPropagation();
      m.remove();
    });
    document.body.appendChild(m);
  }

  // ── In-app update sheet (shown on the home screen only, never during a round) ──
  const APP_VERSION = window.__APP_VERSION || "";
  let pendingUpd = null;
  function locText(v) {
    if (v && typeof v === "object") return v[state.lang] || v.en || Object.values(v)[0] || "";
    return v == null ? "" : String(v);
  }
  window.__showUpdate = function (u) {
    if (!u || !u.latest) return;
    pendingUpd = u;
    maybeShowUpdate();
  };
  function maybeShowUpdate() {
    const u = pendingUpd;
    if (!u || view.name !== "home" || document.getElementById("upd") || document.querySelector(".modal")) return;
    const ov = document.createElement("div");
    ov.id = "upd";
    const cards = (u.highlights || [])
      .slice(0, 3)
      .map((h) => `<div class="updi"><span class="updic">${esc(locText(h.icon) || "✨")}</span><div><b>${esc(locText(h.title))}</b><span>${esc(locText(h.text))}</span></div></div>`)
      .join("");
    const more = u.skipped > 1 ? t("updMore", u.skipped - 1) : "";
    ov.innerHTML = `<div class="updp" role="dialog" aria-label="${esc(t("updDefaultTitle"))}">
      <div class="updtag">${esc(t("updNew", u.latest))}</div>
      <h2 class="updt">${esc(locText(u.title) || t("updDefaultTitle"))}</h2>
      <div class="upds">${esc(t("updYouHave", u.current, more))}</div>
      <div class="updl">${cards}</div>
      <div class="updmsg" aria-live="polite"></div>
      <button class="btn go big updgo" data-action="updNow">⬆️ ${esc(t("updNow"))}</button>
      <button class="btn updlater" data-action="updLater">${esc(t("updLater"))}</button></div>`;
    ov.addEventListener("click", (e) => {
      if (e.target === ov) updLater(); // outside = Later
    });
    document.body.appendChild(ov);
  }
  function updLater() {
    const ov = document.getElementById("upd");
    if (!ov) return;
    ov.remove();
    pendingUpd = null;
    send("update-later", {});
  }
  function updNow(btn) {
    const ov = document.getElementById("upd");
    if (!ov || btn.disabled) return;
    const msg = ov.querySelector(".updmsg");
    const later = ov.querySelector(".updlater");
    btn.disabled = true;
    btn.textContent = t("updUpdating");
    later.hidden = true;
    msg.textContent = "";
    send("update-now", {}, (ok, res) => {
      if (ok) {
        pendingUpd = null;
        ov.querySelector(".updtag").textContent = t("updatedTo", res);
        msg.textContent = t("updDone");
        btn.disabled = false;
        btn.textContent = t("updGotIt");
        btn.dataset.action = "updClose";
        sndWin();
      } else {
        msg.textContent = t("updFailed") + ": " + (res || "");
        btn.disabled = false;
        btn.textContent = t("updRetry");
        later.hidden = false;
      }
    });
  }

  // ── Money (all amounts stored in cents; rate = cents per token) ──
  const CURRENCIES = ["EUR", "USD", "GBP"];
  function money(cents) {
    const cur = state.settings.currency || "EUR";
    try {
      return new Intl.NumberFormat(LANGS[state.lang].locale, { style: "currency", currency: cur }).format(cents / 100);
    } catch (e) {
      return (cents / 100).toFixed(2) + " " + cur;
    }
  }
  function currencySymbol() {
    const cur = state.settings.currency || "EUR";
    try {
      const part = new Intl.NumberFormat(LANGS[state.lang].locale, { style: "currency", currency: cur }).formatToParts(1).find((x) => x.type === "currency");
      return part ? part.value : cur;
    } catch (e) {
      return cur;
    }
  }
  function valueCents(k) {
    return Math.round((k.tokens || 0) * (k.rate || 0));
  }
  function isShort(k) {
    return k.rate > 0 && k.tokens > 0 && valueCents(k) > k.budget;
  }
  function rateInput(k) {
    if (!(k.rate > 0)) return "";
    return (k.rate / 100).toLocaleString(LANGS[state.lang].locale, { minimumFractionDigits: 2, maximumFractionDigits: 3, useGrouping: false });
  }
  function parseAmount(str) {
    const v = String(str || "").replace(/\s/g, "").replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(v) && !/^-?\.\d+$/.test(v)) return null;
    return parseFloat(v);
  }
  function askAmount(title, sub) {
    return new Promise((resolve) => {
      const m = document.createElement("div");
      m.className = "modal";
      const sym = currencySymbol();
      m.innerHTML = `<div class="sheet"><div class="msg">${esc(title)}</div><div class="sub">${esc(sub)}</div>
        <input class="input" id="amt" inputmode="decimal" placeholder="0" autocomplete="off">
        <div class="quick">${[5, 10, 20, 50].map((v) => `<button class="chip" data-q="${v}">+${v} ${esc(sym)}</button>`).join("")}</div>
        <div class="row"><button class="btn ghost" data-r="0">${esc(t("cancel"))}</button><button class="btn go" data-r="1">💰 ${esc(t("topUp"))}</button></div></div>`;
      const inp = () => m.querySelector("#amt");
      m.addEventListener("click", (e) => {
        const q = e.target.closest("[data-q]");
        if (q) {
          e.stopPropagation();
          const cur = parseAmount(inp().value) || 0;
          inp().value = String(Math.round((cur + Number(q.dataset.q)) * 100) / 100);
          return;
        }
        const b = e.target.closest("[data-r]");
        if (!b) return;
        e.stopPropagation();
        if (b.dataset.r === "0") {
          m.remove();
          resolve(null);
          return;
        }
        const v = parseAmount(inp().value);
        if (v === null) {
          toast(t("invalidAmount"));
          return;
        }
        m.remove();
        resolve(Math.round(v * 100));
      });
      document.body.appendChild(m);
    });
  }
  function piggyHTML(k) {
    if (!(k.rate > 0)) return "";
    const warn = isShort(k);
    return `<div class="piggy ${warn ? "warn" : ""}" id="piggy">🐷 ${esc(t("worthLong", k.tokens, money(valueCents(k))))}${warn ? `<small>${esc(t("needTopUp"))}</small>` : ""}</div>`;
  }
  function updatePiggy(k) {
    const el = document.getElementById("piggy");
    if (el) el.outerHTML = piggyHTML(k);
  }
  function walletHTML(k) {
    const moneyOn = k.rate > 0;
    return `<div class="wallet ${moneyOn ? "" : "solo"}" id="wallet">
      <div class="wcell wtok" id="coins"><div class="wbig"><span class="ic">🪙</span><span id="coinNum" data-v="${k.tokens}">${k.tokens}</span></div><small>${esc(t("walletTokens"))}</small></div>
      ${moneyOn ? `<div class="weq">=</div>
      <div class="wcell wmon" id="moneyCell"><div class="wbig"><span id="moneyNum" data-v="${valueCents(k)}">${esc(money(valueCents(k)))}</span></div><small>${esc(t("walletMoney"))}</small></div>` : ""}
      ${isShort(k) ? `<div class="wwarn" id="wwarn">${esc(t("needTopUp"))}</div>` : ""}
    </div>`;
  }
  function tween(el, to, fmt, ms) {
    if (!el) return;
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    if (el._raf) cancelAnimationFrame(el._raf);
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) el._raf = requestAnimationFrame(step);
      else el.textContent = fmt(to);
    };
    el._raf = requestAnimationFrame(step);
  }
  function floatText(anchor, text, cls) {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const f = document.createElement("div");
    f.className = "floatTxt " + cls;
    f.textContent = text;
    f.style.left = r.left + r.width / 2 + "px";
    f.style.top = r.top + r.height / 2 + "px";
    fx.appendChild(f);
    setTimeout(() => f.remove(), 1400);
  }
  function updateWallet(k, dir) {
    const tok = document.getElementById("coinNum");
    const mon = document.getElementById("moneyNum");
    const box = document.getElementById("wallet");
    if (!box) return;
    const prevCents = mon ? Number(mon.dataset.v || 0) : 0;
    tween(tok, k.tokens, (v) => String(Math.round(v)), 600);
    if (mon) {
      const diff = valueCents(k) - prevCents;
      tween(mon, valueCents(k), (v) => money(Math.round(v)), 1000);
      if (diff) floatText(document.getElementById("moneyCell"), (diff > 0 ? "+" : "−") + money(Math.abs(diff)), diff > 0 ? "plus" : "minus");
    }
    box.classList.remove("up", "down");
    void box.offsetWidth;
    box.classList.add(dir);
    const warn = document.getElementById("wwarn");
    if (isShort(k) && !warn) box.insertAdjacentHTML("beforeend", `<div class="wwarn" id="wwarn">${esc(t("needTopUp"))}</div>`);
    else if (!isShort(k) && warn) warn.remove();
  }

  // ── Words ──
  const wordCache = {};
  function wordsFor(lang) {
    if (!wordCache[lang]) {
      const base = WORDS[lang].map((s) => s.split("|"));
      const more = MORE_WORDS.map((s) => {
        const parts = s.split("|");
        return [parts[MORE_COL[lang]], parts[0]];
      }).filter(([w]) => w);
      wordCache[lang] = base.concat(more).map(([w, e]) => ({ w, e, n: w.split("-").length, k: firstLetter(lang, w) }));
    }
    return wordCache[lang];
  }
  // First letter used to pick look-alike pictures. Spanish accents (á→a) count as the same letter;
  // Lithuanian letters with marks (š, ž, č, ū…) are their own letters, as kids learn them.
  function firstLetter(lang, w) {
    let c = w.replace(/-/g, "").charAt(0).toLocaleLowerCase(LANGS[lang].locale);
    if (lang === "es" && c !== "ñ") c = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return c;
  }
  function sameLetter(word) {
    return wordsFor(state.lang).filter((o) => o.k === word.k && o.w !== word.w && o.e !== word.e);
  }
  // Beginner: 3 pictures. Expert: 5 pictures. All pictures share the word's first letter.
  function picCount(kid) {
    return kid.level === "expert" ? 5 : 3;
  }
  function poolFor(kid) {
    const need = picCount(kid) - 1;
    return wordsFor(state.lang).filter(
      (w) => (kid.level === "expert" ? w.n >= 3 && w.n <= 6 : w.n <= 2) && sameLetter(w).length >= need
    );
  }
  function caseWord(s) {
    const loc = LANGS[state.lang].locale;
    const c = state.settings.wordCase;
    if (c === "upper") return s.toLocaleUpperCase(loc);
    if (c === "lower") return s.toLocaleLowerCase(loc);
    return s.charAt(0).toLocaleUpperCase(loc) + s.slice(1);
  }
  function wordHTML(w) {
    return caseWord(w)
      .split("-")
      .map((s, i) => `<span class="seg" style="color:${SEG_COLORS[i % SEG_COLORS.length]};animation-delay:${i * 90}ms">${esc(s)}</span>`)
      .join('<span class="dash">-</span>');
  }
  function fitWord() {
    const el = document.getElementById("word");
    if (!el) return;
    const max = el.parentElement.clientWidth - 48;
    let size = Math.min(124, Math.max(56, window.innerWidth * 0.2));
    el.style.fontSize = size + "px";
    while (el.getBoundingClientRect().width > max && size > 24) {
      size -= 2;
      el.style.fontSize = size + "px";
    }
  }

  // ── Sound (tiny Web Audio chimes, no files needed) ──
  let actx = null;
  function tone(freqs, dur, type) {
    if (!state.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      freqs.forEach((f, i) => {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = type || "triangle";
        o.frequency.value = f;
        const st = actx.currentTime + i * dur * 0.8;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.25, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        o.connect(g);
        g.connect(actx.destination);
        o.start(st);
        o.stop(st + dur + 0.05);
      });
    } catch (e) {}
  }
  const sndWin = () => tone([523, 659, 784, 1047, 1319], 0.15, "triangle");
  const sndSoft = () => tone([523, 784], 0.15, "triangle");
  const sndBad = () => tone([260, 196], 0.2, "sine");
  const sndKey = () => tone([880], 0.06, "sine");

  // ── Effects ──
  const fx = document.getElementById("fx");
  function confetti(x, y, n) {
    const emojis = ["⭐", "✨", "🎉", "🌟", "🪙"];
    for (let i = 0; i < n; i++) {
      const p = document.createElement("div");
      const isEm = i % 7 === 0;
      p.className = "cf" + (isEm ? " em" : i % 3 === 0 ? " round" : "");
      if (isEm) p.textContent = emojis[i % emojis.length];
      const ang = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 230;
      p.style.setProperty("--x", x + "px");
      p.style.setProperty("--y", y + "px");
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", Math.sin(ang) * dist - 140 + "px");
      p.style.setProperty("--r", Math.random() * 900 - 450 + "deg");
      p.style.setProperty("--s", (isEm ? 20 + Math.random() * 14 : 8 + Math.random() * 9) + "px");
      p.style.setProperty("--c", pickRand(CONFETTI));
      p.style.setProperty("--d", 1.1 + Math.random() * 0.8 + "s");
      fx.appendChild(p);
      setTimeout(() => p.remove(), 2100);
    }
  }
  function banner(text) {
    const b = document.createElement("div");
    b.className = "banner";
    b.textContent = text;
    fx.appendChild(b);
    setTimeout(() => b.remove(), 1950);
  }
  function flyCoin(x, y, kid) {
    const target = document.getElementById("coins");
    if (!target) return;
    const tr = target.getBoundingClientRect();
    const c = document.createElement("div");
    c.className = "flycoin";
    c.textContent = "+1 🪙";
    c.style.left = x + "px";
    c.style.top = y + "px";
    fx.appendChild(c);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        c.style.transform = `translate(${tr.left + tr.width / 2 - x}px, ${tr.top + tr.height / 2 - y}px) scale(.6)`;
        c.style.opacity = "0.2";
      })
    );
    setTimeout(() => {
      c.remove();
      updateWallet(kid, "up");
    }, 850);
  }
  function feedback(text, kind) {
    const fb = document.getElementById("fb");
    if (!fb) return;
    fb.className = "feedback";
    void fb.offsetWidth;
    fb.className = "feedback " + (kind || "");
    fb.textContent = text;
  }

  // ── Navigation ──
  const app = document.getElementById("app");
  let view = { name: "home" };
  let draft = null;
  let game = null;
  let pinPad = null;
  let parentUnlocked = false;
  let failedPins = 0;
  let lockUntil = 0;

  function go(v) {
    view = v;
    render();
    window.scrollTo(0, 0);
  }
  function showError(e) {
    let box = document.getElementById("err");
    if (!box) {
      box = document.createElement("div");
      box.id = "err";
      document.body.appendChild(box);
    }
    box.textContent = "⚠️ " + (e && e.message ? e.message : String(e)) + (e && e.stack ? "\n" + String(e.stack).split("\n").slice(0, 3).join("\n") : "");
    setTimeout(() => box.remove(), 12000);
  }
  function render() {
    try {
      app.innerHTML = VIEWS[view.name]();
      if (view.name === "game") fitWord();
      if (view.name === "home") setTimeout(maybeShowUpdate, 250);
    } catch (e) {
      showError(e);
      if (view.name !== "home") {
        view = { name: "home" };
        try {
          app.innerHTML = VIEWS.home();
        } catch (e2) {}
      }
    }
  }

  // ── Game logic ──
  function startGame(kid) {
    game = { kidId: kid.id, deck: [], cur: null, options: [], missed: false, locked: false, streak: 0, last: null, wrong: new Set(), round: 0 };
    nextRound();
    go({ name: "game" });
    if (isShort(kid)) setTimeout(() => notice(t("needTopUp")), 400);
  }
  function nextRound() {
    const kid = getKid(game.kidId);
    if (!game.deck.length) {
      const pool = poolFor(kid);
      game.deck = shuffle(pool.filter((w) => w.w !== game.last));
      if (!game.deck.length) game.deck = shuffle(pool);
    }
    const word = game.deck.pop();
    game.last = word.w;
    const picks = [];
    const candidates = shuffle(sameLetter(word)).concat(shuffle(wordsFor(state.lang)));
    const need = picCount(kid) - 1;
    for (const o of candidates) {
      if (picks.length === need) break;
      if (o.e !== word.e && !picks.some((p) => p.e === o.e)) picks.push(o);
    }
    game.cur = word;
    game.options = shuffle([word].concat(picks));
    game.missed = false;
    game.locked = false;
    game.wrong = new Set();
    game.round++;
  }
  function pick(btn) {
    if (!game || game.locked) return;
    const kid = getKid(game.kidId);
    if (!kid) return go({ name: "home" });
    const i = Number(btn.dataset.i);
    const opt = game.options[i];

    if (opt.w === game.cur.w) {
      game.locked = true;
      const earned = !game.missed;
      const wasShort = isShort(kid);
      kid.correct++;
      if (earned) {
        kid.tokens++;
        kid.total++;
        game.streak++;
      }
      persist();
      btn.classList.add("right");
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const w = document.getElementById("word");
      if (w) w.classList.add("cheer");
      if (earned) {
        sndWin();
        confetti(cx, cy, 90);
        banner("🎉 " + pickRand(t("praise")));
        flyCoin(cx, cy, kid);
        const st = document.getElementById("streak");
        if (st) st.textContent = "🔥 " + game.streak;
        if (!wasShort && isShort(kid)) setTimeout(() => notice(t("needTopUp")), 1000);
      } else {
        sndSoft();
        confetti(cx, cy, 30);
        feedback(t("correctNoToken"));
      }
      const round = game.round;
      setTimeout(() => {
        if (view.name === "game" && game && game.round === round) {
          nextRound();
          render();
        }
      }, earned ? 2100 : 2300);
    } else {
      if (game.wrong.has(i)) return;
      game.wrong.add(i);
      game.missed = true;
      game.streak = 0;
      kid.wrong++;
      const lost = kid.tokens > 0;
      if (lost) {
        kid.tokens--;
        kid.total = Math.max(0, kid.total - 1);
      }
      persist();
      sndBad();
      btn.classList.remove("shake");
      void btn.offsetWidth;
      btn.classList.add("wrong", "shake");
      feedback(lost ? t("tryAgainMinus") : t("tryAgain"), "bad");
      if (lost) {
        floatText(document.getElementById("coins"), "−1 🪙", "minus");
        updateWallet(kid, "down");
      }
      const st = document.getElementById("streak");
      if (st) st.textContent = "🔥 0";
    }
  }

  // ── Views ──
  const VIEWS = {};

  function kidCard(k) {
    return `<button class="kid" data-action="play" data-id="${k.id}">
      <div class="ava" style="background:${avaBg(k)}">${k.avatar}</div>
      <div class="kname">${esc(k.name)}</div>
      ${levelBadge(k.level)}
      <div class="stats"><span>🪙 ${k.tokens}</span><span>⭐ ${k.total}</span></div>
      ${k.rate > 0 ? `<div class="worth">= ${esc(money(valueCents(k)))}</div>` : ""}
      ${isShort(k) ? `<div class="warnchip">${esc(t("needTopUpShort"))}</div>` : ""}
    </button>`;
  }

  VIEWS.home = () => `
    <header class="hero">
      <div class="logo"><span>📚</span><span>⭐</span></div>
      <h1>${esc(t("appTitle"))}</h1>
      <div class="langs">${Object.entries(LANGS)
        .map(([k, l]) => `<button class="lang ${state.lang === k ? "on" : ""}" data-action="lang" data-v="${k}"><span class="flag">${l.flag}</span>${l.code}</button>`)
        .join("")}</div>
    </header>
    <div class="section">${esc(t("whoPlays"))}</div>
    ${state.kids.length ? "" : `<p class="empty">${esc(t("noKids"))}</p>`}
    <div class="kids">
      ${state.kids.map(kidCard).join("")}
      <button class="kid add" data-action="newKid"><div class="ava plus">➕</div><div class="kname">${esc(t("addKid"))}</div></button>
    </div>
    <nav class="bottom">
      <button class="btn big gold" data-action="board">🏆 ${esc(t("leaderboard"))}</button>
      <button class="btn big ghost" data-action="parents">🔒 ${esc(t("parents"))}</button>
    </nav>
    <p class="ver">Reading Stars v${esc(APP_VERSION)}</p>`;

  VIEWS.edit = () => {
    const d = draft;
    const canChangeLevel = !d.id || parentUnlocked;
    const lvl = (v, icon) => `
      <button class="lvl ${d.level === v ? "on" : ""}" data-action="setLevel" data-v="${v}" ${canChangeLevel ? "" : "disabled"}>
        <div class="lvlIcon">${icon}</div><b>${esc(t(v))}</b>
        <small>${esc(t(v + "Ages"))}</small><small>${esc(t(v + "Desc"))}</small>
      </button>`;
    return `
      <div class="bar"><button class="icon" data-action="cancelEdit">⬅</button><h2>${esc(d.id ? t("editPlayer") : t("newPlayer"))}</h2><span></span></div>
      <div class="panel">
        <label class="lbl" for="nameInput">${esc(t("name"))}</label>
        <input id="nameInput" class="input" maxlength="16" value="${esc(d.name)}" placeholder="${esc(t("namePh"))}" autocomplete="off" autocorrect="off">
        <label class="lbl">${esc(t("level"))}</label>
        <div class="levels">${lvl("beginner", "🐣")}${lvl("expert", "🦉")}</div>
        <label class="lbl">${esc(t("avatar"))}</label>
        <div class="avatars">${AVATARS.map((a) => `<button class="avpick ${d.avatar === a ? "on" : ""}" data-action="setAvatar" data-v="${a}">${a}</button>`).join("")}</div>
      </div>
      <div class="row">
        <button class="btn ghost" data-action="cancelEdit">${esc(t("cancel"))}</button>
        <button class="btn go" data-action="saveKid">✅ ${esc(t("save"))}</button>
      </div>`;
  };

  VIEWS.game = () => {
    const kid = getKid(game.kidId);
    return `
      <div class="gamebar">
        <button class="icon" data-action="home">⬅</button>
        <div class="who"><span class="ava sm" style="background:${avaBg(kid)}">${kid.avatar}</span><span class="wn">${esc(kid.name)}</span></div>
        <div class="pill" id="streak">🔥 ${game.streak}</div>
      </div>
      ${walletHTML(kid)}
      <div class="hint">${esc(t("hint"))}</div>
      <div class="pics">${game.options
        .map((o, i) => `<button class="pic ${game.wrong.has(i) ? "wrong" : ""}" style="background:${PIC_BG[i]}" data-action="pick" data-i="${i}"><span class="emo">${o.e}</span></button>`)
        .join("")}</div>
      <div class="wordcard"><div class="word" id="word">${wordHTML(game.cur.w)}</div></div>
      <div class="feedback" id="fb"></div>
      <div class="gamefoot">${levelBadge(kid.level)}<button class="btn small ghost" data-action="skip">${esc(t("skip"))} ⏭</button></div>`;
  };

  VIEWS.board = () => {
    const ranked = state.kids.slice().sort((a, b) => b.total - a.total || b.tokens - a.tokens || a.name.localeCompare(b.name));
    const medals = ["🥇", "🥈", "🥉"];
    const podium = `<div class="podium">${[1, 0, 2]
      .filter((i) => ranked[i])
      .map((i) => {
        const k = ranked[i];
        return `<div class="pod p${i + 1}">
          <span class="ava" style="background:${avaBg(k)}">${k.avatar}</span>
          <div class="kname">${esc(k.name)}</div>
          <div class="block">${medals[i]}<span class="pts">⭐ ${k.total}</span></div>
        </div>`;
      })
      .join("")}</div>`;
    const rows = ranked
      .map(
        (k, i) => `<div class="lrow">
          <div class="rank">${i < 3 ? medals[i] : i + 1}</div>
          <span class="ava sm" style="background:${avaBg(k)}">${k.avatar}</span>
          <div class="lmain"><div class="kname">${esc(k.name)}</div>${levelBadge(k.level)}</div>
          <div class="lscore">⭐ ${k.total}<small>${esc(t("balance"))}: 🪙 ${k.tokens}</small></div>
        </div>`
      )
      .join("");
    return `
      <div class="bar"><button class="icon" data-action="home">⬅</button><h2>🏆 ${esc(t("leaderboard"))}</h2><span></span></div>
      ${ranked.length ? podium + rows : `<p class="empty">${esc(t("noKids"))}</p>`}`;
  };

  VIEWS.pin = () => {
    const p = pinPad;
    const title = p.mode === "enter" ? t("enterPin") : p.mode === "set1" ? t("setPin") : t("confirmPin");
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
    return `
      <div class="bar"><button class="icon" data-action="pinBack">⬅</button><h2>🔒 ${esc(t("parents"))}</h2><span></span></div>
      <div class="panel center">
        <div class="pintitle">${esc(title)}</div>
        <div class="dots" id="dots">${[0, 1, 2, 3].map((i) => `<span class="dot ${i < p.buf.length ? "on" : ""}"></span>`).join("")}</div>
        <div class="pinmsg ${p.err ? "err" : ""}">${esc(p.msg || "")}</div>
        <div class="keypad">${keys.map((k) => (k === "" ? "<span></span>" : `<button class="key" data-action="pinKey" data-v="${k}">${k}</button>`)).join("")}</div>
      </div>`;
  };

  function parentKid(k) {
    const paidTok = k.payouts.reduce((sum, p) => sum + (p.n || 0), 0);
    const paidMoney = k.payouts.reduce((sum, p) => sum + (p.m || 0), 0);
    const events = k.payouts
      .map((p) => ({ d: p.d, html: `<span>💸 ${p.n} 🪙${p.m ? " → " + esc(money(p.m)) : ""}</span>` }))
      .concat(k.topups.map((x) => ({ d: x.d, html: `<span>💰 ${x.m > 0 ? "+" : ""}${esc(money(x.m))}</span>` })))
      .sort((a, b) => b.d - a.d);
    const hist = events.length
      ? events.map((ev) => `<div class="hist"><span>${esc(fmtDate(ev.d))}</span>${ev.html}</div>`).join("")
      : `<div class="hist"><span>${esc(t("noHistory"))}</span></div>`;
    const moneyOn = k.rate > 0;
    const short = isShort(k);
    const cantPay = moneyOn && k.budget < k.rate;
    return `
      <div class="panel">
        <div class="pkhead">
          <span class="ava" style="background:${avaBg(k)}">${k.avatar}</span>
          <div style="min-width:0"><div class="kname">${esc(k.name)}</div>${levelBadge(k.level)}</div>
        </div>
        <div class="pkstats">
          <div><b>🪙 ${k.tokens}</b><small>${esc(moneyOn ? money(valueCents(k)) : t("balance"))}</small></div>
          <div><b>⭐ ${k.total}</b><small>${esc(t("allTime"))}</small></div>
          <div><b>💸 ${paidTok}</b><small>${esc(paidMoney ? money(paidMoney) : t("paidOut"))}</small></div>
        </div>
        <div class="money">
          <div class="mrow"><span>💶 ${esc(t("tokenValue"))}</span>
            <span class="rateBox">1 🪙 = <input class="input sm" data-change="rate" data-id="${k.id}" inputmode="decimal" value="${esc(rateInput(k))}" placeholder="0,10" autocomplete="off"> ${esc(currencySymbol())}</span></div>
          <small class="mhint">${esc(moneyOn ? `10 🪙 = ${money(k.rate * 10)}` : t("rateOff"))}</small>
          <div class="mrow"><span>🔒 ${esc(t("budget"))}</span><span class="budget ${short ? "neg" : ""}">${esc(money(k.budget))}</span></div>
          <button class="btn gold wide" data-action="topUp" data-id="${k.id}">💰 ${esc(t("topUp"))}</button>
          ${short ? `<div class="warnline">⚠️ ${esc(t("budgetShort", money(valueCents(k))))}</div>` : ""}
        </div>
        <div class="row3">
          <button class="btn go" data-action="payout" data-id="${k.id}" ${k.tokens && !cantPay ? "" : "disabled"}>💸 ${esc(t("payout"))}</button>
          <button class="btn ghost" data-action="editKid" data-id="${k.id}">✏️ ${esc(t("edit"))}</button>
          <button class="btn danger" data-action="deleteKid" data-id="${k.id}" aria-label="${esc(t("deleteBtn"))}">🗑️</button>
        </div>
        ${k.tokens && cantPay ? `<div class="warnline">${esc(t("topUpFirst"))}</div>` : ""}
        <details><summary>${esc(t("history"))} (${events.length})</summary>${hist}</details>
      </div>`;
  }

  VIEWS.parent = () => {
    const sample = t("sample");
    const styles = [["cap"], ["upper"], ["lower"]].map(([v]) => {
      const prev = state.settings.wordCase;
      state.settings.wordCase = v;
      const label = caseWord(sample);
      state.settings.wordCase = prev;
      return `<button class="chip ${state.settings.wordCase === v ? "on" : ""}" data-action="wordCase" data-v="${v}">${esc(label)}</button>`;
    });
    return `
      <div class="bar"><button class="icon" data-action="lockParent">⬅</button><h2>👨‍👩‍👧 ${esc(t("parentArea"))}</h2><button class="icon" data-action="lockParent">🔒</button></div>
      ${state.kids.length ? "" : `<p class="empty">${esc(t("noKids"))}</p>`}
      ${state.kids.map(parentKid).join("")}
      <div class="panel">
        <h3>⚙️ ${esc(t("settings"))}</h3>
        <div class="setrow"><span>${esc(t("wordStyle"))}</span><div class="seg3">${styles.join("")}</div></div>
        <div class="setrow"><span>${esc(t("currency"))}</span><div class="seg3">${CURRENCIES.map(
          (c) => `<button class="chip ${state.settings.currency === c ? "on" : ""}" data-action="currency" data-v="${c}">${c}</button>`
        ).join("")}</div></div>
        <div class="setrow"><span>${esc(t("sound"))}</span><button class="toggle ${state.settings.sound ? "on" : ""}" data-action="toggleSound">${state.settings.sound ? "🔊" : "🔇"}</button></div>
        <button class="btn ghost wide" data-action="changePin">🔑 ${esc(t("changePin"))}</button>
        <p class="note">${esc(t("storageNote"))}<br>${esc(t("version"))}: ${esc(APP_VERSION)}</p>
      </div>`;
  };

  // ── PIN handling ──
  function openPin(mode, from) {
    pinPad = { mode, buf: "", first: "", msg: "", err: false, from };
    go({ name: "pin" });
  }
  function pinFail(msg) {
    pinPad.buf = "";
    pinPad.msg = msg;
    pinPad.err = true;
    render();
    const d = document.getElementById("dots");
    if (d) d.classList.add("shake");
    sndBad();
  }
  function submitPin() {
    const p = pinPad;
    if (p.mode === "enter") {
      if (hashPin(p.buf) === state.pinHash) {
        failedPins = 0;
        parentUnlocked = true;
        go({ name: "parent" });
      } else {
        failedPins++;
        if (failedPins >= 5) {
          failedPins = 0;
          lockUntil = Date.now() + 60000;
          pinFail(t("tooMany", 60));
        } else pinFail(t("wrongPin"));
      }
    } else if (p.mode === "set1") {
      p.first = p.buf;
      p.buf = "";
      p.mode = "set2";
      p.msg = "";
      p.err = false;
      render();
    } else if (p.mode === "set2") {
      if (p.buf === p.first) {
        state.pinHash = hashPin(p.buf);
        persist();
        parentUnlocked = true;
        toast("🔑 " + t("pinSaved"));
        go({ name: "parent" });
      } else {
        p.mode = "set1";
        p.first = "";
        pinFail(t("pinMismatch"));
      }
    }
  }

  // ── Actions ──
  function requireParent() {
    if (!parentUnlocked) {
      go({ name: "home" });
      return false;
    }
    return true;
  }

  const A = {
    lang(b) {
      state.lang = b.dataset.v;
      persist();
      render();
    },
    newKid() {
      draft = { id: null, name: "", level: "beginner", avatar: pickRand(AVATARS) };
      go({ name: "edit", from: "home" });
    },
    play(b) {
      const k = getKid(b.dataset.id);
      if (k) startGame(k);
    },
    board() {
      go({ name: "board" });
    },
    parents() {
      openPin(state.pinHash ? "enter" : "set1", "home");
    },
    home() {
      game = null;
      go({ name: "home" });
    },
    setLevel(b) {
      draft.level = b.dataset.v;
      document.querySelectorAll(".lvl").forEach((x) => x.classList.toggle("on", x.dataset.v === draft.level));
    },
    setAvatar(b) {
      draft.avatar = b.dataset.v;
      document.querySelectorAll(".avpick").forEach((x) => x.classList.toggle("on", x.dataset.v === draft.avatar));
    },
    cancelEdit() {
      go({ name: view.from === "parent" && parentUnlocked ? "parent" : "home" });
    },
    saveKid() {
      const input = document.getElementById("nameInput");
      const name = (input ? input.value : "").trim().slice(0, 16);
      if (!name) {
        toast(t("enterName"));
        if (input) input.focus();
        return;
      }
      if (draft.id) {
        const k = getKid(draft.id);
        if (k) Object.assign(k, { name, avatar: draft.avatar, level: parentUnlocked ? draft.level : k.level });
      } else {
        state.kids.push(normalizeKid({ name, avatar: draft.avatar, level: draft.level }));
      }
      persist();
      go({ name: view.from === "parent" && parentUnlocked ? "parent" : "home" });
    },
    pick(b) {
      pick(b);
    },
    skip() {
      if (!game || game.locked) return;
      game.streak = 0;
      nextRound();
      render();
    },
    pinKey(b) {
      const p = pinPad;
      if (Date.now() < lockUntil) {
        p.msg = t("tooMany", Math.ceil((lockUntil - Date.now()) / 1000));
        p.err = true;
        render();
        return;
      }
      const v = b.dataset.v;
      if (v === "⌫") p.buf = p.buf.slice(0, -1);
      else if (p.buf.length < 4) p.buf += v;
      p.err = false;
      if (p.mode !== "enter" || p.buf.length) p.msg = p.msg && p.buf.length ? "" : p.msg;
      sndKey();
      render();
      if (p.buf.length === 4)
        setTimeout(() => {
          try {
            submitPin();
          } catch (err) {
            showError(err);
          }
        }, 160);
    },
    pinBack() {
      go({ name: pinPad && pinPad.from === "parent" && parentUnlocked ? "parent" : "home" });
    },
    lockParent() {
      parentUnlocked = false;
      go({ name: "home" });
    },
    async payout(b) {
      if (!requireParent()) return;
      const k = getKid(b.dataset.id);
      if (!k || !k.tokens) return;
      let n = k.tokens;
      let cents = 0;
      let rest = 0;
      if (k.rate > 0) {
        n = Math.min(k.tokens, Math.floor((k.budget + 1e-6) / k.rate));
        if (n <= 0) {
          toast(t("topUpFirst"));
          return;
        }
        cents = Math.min(k.budget, Math.round(n * k.rate));
        rest = k.tokens - n;
      }
      const msg = k.rate > 0 ? t("payoutConfirmMoney", k.name, n, money(cents), rest) : t("payoutConfirm", k.name, n);
      if (!(await ask(msg, "💸 " + t("payout")))) return;
      k.tokens -= n;
      k.budget -= cents;
      k.payouts.push({ d: Date.now(), n, m: cents });
      persist();
      render();
      confetti(window.innerWidth / 2, window.innerHeight / 3, 60);
      sndWin();
      toast(k.rate > 0 ? t("paidToastMoney", k.name, money(cents)) : t("paidToast", k.name, n));
    },
    async topUp(b) {
      if (!requireParent()) return;
      const k = getKid(b.dataset.id);
      if (!k) return;
      const cents = await askAmount(t("topUpTitle", k.name), t("topUpHint"));
      if (cents === null || cents === 0) return;
      const before = k.budget;
      k.budget = Math.max(0, k.budget + cents);
      const change = k.budget - before;
      if (change) k.topups.push({ d: Date.now(), m: change });
      persist();
      render();
      toast(t("toppedUp", k.name, (change > 0 ? "+" : "") + money(change)));
    },
    currency(b) {
      if (!requireParent()) return;
      state.settings.currency = b.dataset.v;
      persist();
      render();
    },
    editKid(b) {
      if (!requireParent()) return;
      const k = getKid(b.dataset.id);
      if (!k) return;
      draft = { id: k.id, name: k.name, level: k.level, avatar: k.avatar };
      go({ name: "edit", from: "parent" });
    },
    async deleteKid(b) {
      if (!requireParent()) return;
      const k = getKid(b.dataset.id);
      if (!k) return;
      if (!(await ask(t("deleteConfirm", k.name), "🗑️ " + t("deleteBtn"), true))) return;
      state.kids = state.kids.filter((x) => x.id !== k.id);
      persist();
      render();
    },
    wordCase(b) {
      if (!requireParent()) return;
      state.settings.wordCase = b.dataset.v;
      persist();
      render();
    },
    toggleSound() {
      if (!requireParent()) return;
      state.settings.sound = !state.settings.sound;
      persist();
      render();
    },
    changePin() {
      if (!requireParent()) return;
      openPin("set1", "parent");
    },
    updNow(b) {
      updNow(b);
    },
    updLater() {
      updLater();
    },
    updClose() {
      const ov = document.getElementById("upd");
      if (ov) ov.remove();
    },
  };

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const fn = A[el.dataset.action];
    if (!fn) return;
    try {
      const r = fn(el, e);
      if (r && typeof r.catch === "function") r.catch(showError);
    } catch (err) {
      showError(err);
    }
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (!el || !el.dataset || el.dataset.change !== "rate" || !parentUnlocked) return;
    const k = getKid(el.dataset.id);
    if (!k) return;
    const v = el.value.trim() === "" ? 0 : parseAmount(el.value);
    if (v === null || v < 0) {
      toast(t("invalidAmount"));
      render();
      return;
    }
    k.rate = Math.round(v * 100 * 1000) / 1000;
    persist();
    render();
    toast(t("saved"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target && e.target.id === "nameInput") e.target.blur();
  });
  window.addEventListener("resize", () => {
    if (view.name === "game") fitWord();
  });

  render();
}

// ───────────────────────── Boot ─────────────────────────

function buildHTML(data) {
  const initJSON = JSON.stringify(data || null).replace(/</g, "\\u003c");
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<style>${CSS}</style>
</head><body style="background-color:#4FB3F6">
<div id="app"></div>
<div id="fx"></div>
<script>
window.onerror = function (msg, src, line, col) {
  var box = document.getElementById("err");
  if (!box) { box = document.createElement("div"); box.id = "err"; document.body.appendChild(box); }
  box.textContent = "⚠️ " + msg + " (line " + line + ":" + col + ")";
};
</script>
<script>
window.__INITIAL__ = ${initJSON};
window.__APP_VERSION = ${JSON.stringify(VERSION)};
(${webApp.toString()})();
</script>
</body></html>`;
}

const SAVE_SCHEME = "readingstars://save?d=";

const initialData = await loadData();
const webView = new WebView();

let pendingUpdate = null;
const js = (code) => webView.evaluateJavaScript(code + "; 'ok'").catch(() => {});
const offerUpdate = () => {
  if (pendingUpdate) js(`window.__showUpdate && window.__showUpdate(${JSON.stringify(pendingUpdate)})`);
};

// Actions sent by the page with send(action, params): readingstars://<action>?p=<json>
async function handleAction(head, p) {
  if (head === "update-later") {
    snoozeUpdate();
    pendingUpdate = null;
    return;
  }
  if (head === "update-now") {
    let ok = false;
    let msg = "";
    try {
      msg = await applyUpdate(pendingUpdate);
      ok = true;
      pendingUpdate = null;
      clearUpdateSnooze();
    } catch (e) {
      msg = String((e && e.message) || e);
    }
    await js(`window.__done(${JSON.stringify(p.req || "")}, ${ok}, ${JSON.stringify(msg)})`);
  }
}

// The page "navigates" to readingstars://… to talk to this side. We catch the request,
// act on it and cancel the navigation. readingstars://save?d=<json> writes the progress file.
webView.shouldAllowRequest = (request) => {
  const url = String((request && request.url) || "");
  if (url.indexOf(SAVE_SCHEME) === 0) {
    const raw = url.slice(SAVE_SCHEME.length);
    let json = raw;
    try { json = decodeURIComponent(raw); } catch (e) {}
    try { saveData(json); } catch (e) {}
    return false;
  }
  const m = url.match(/^readingstars:\/\/([a-z-]+)(?:\?p=(.*))?$/);
  if (m) {
    let p = {};
    try { p = JSON.parse(decodeURIComponent(m[2] || "") || "{}"); } catch (e) {}
    handleAction(m[1], p);
    return false;
  }
  return true;
};

await webView.loadHTML(buildHTML(initialData));
const presenting = webView.present(true);

// Once per run, after the first screen is on: never slows the start, never throws.
checkForUpdate().then((u) => {
  pendingUpdate = u;
  offerUpdate();
});

await presenting;

// Final save after the game is closed.
try {
  const finalState = await Promise.race([
    webView.evaluateJavaScript("window.__flush ? window.__flush() : null", false),
    sleep(1500).then(() => null),
  ]);
  saveData(finalState);
} catch (e) {}

Script.complete();
