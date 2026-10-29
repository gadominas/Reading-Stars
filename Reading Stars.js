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
 * - Settings (sliders icon in the parent zone, behind the PIN): appearance, game, money,
 *   updates, round sizes and Built with (github.com/gadominas/app-blueprints · settings).
 * - Opens on a 2.4 s launch screen with the Reading Stars star (app-blueprints · launch-screen).
 * - Home Screen and Lock Screen widget: the top reader and the leaderboard, or one player's tokens
 *   when the widget's Parameter is that player's name (app-blueprints · widgets). Never money, budgets or the PIN.
 *   The BLUEPRINTS block below lists every shared blueprint this app follows (Settings › Built with).
 *
 * - Money: per-kid token value (e.g. 1 token = 0.10 €) and a hidden per-kid budget the parent
 *   tops up. Kids see what their tokens are worth; if the budget can't cover it they're told
 *   to ask for a top-up. Payouts take money from that kid's budget.
 *
 * Data is saved to: iCloud Drive › Scriptable › ReadingStars › data.json, and choices to settings.json
 * next to it (falls back to local Scriptable storage when iCloud is off).
 */

// ───────────────────────── Settings & version ─────────────────────────


// This build's version. When releasing, bump it and add a matching entry to releases.json.
const VERSION = '1.4.0';
const APP_ID = 'reading-stars';   // unique per app, never changes
const REPO_RAW = 'https://raw.githubusercontent.com/gadominas/Reading-Stars/main/';
const SCRIPT_FILE = 'Reading Stars.js';   // the script's file name in the repository
const UPDATE_SNOOZE_MS = 2 * 24 * 3600 * 1000;   // "Later" = 2 days
const KC_UPDATE_SNOOZE = 'reading-stars-update-snooze';   // Keychain key, unique per app

// ───────── Blueprints ─────────
// Shared blueprints this app was built with (github.com/gadominas/app-blueprints). One line per blueprint, in this exact shape:
// inventory tools read it without running the script, and Settings › Built with shows it.
const BLUEPRINTS_REPO = 'https://github.com/gadominas/app-blueprints';
const BLUEPRINTS = [
  { id: 'in-app-updates', name: 'In-app updates', version: '1.0.0', since: '1.1.0' },
  { id: 'settings', name: 'Settings', version: '1.0.0', since: '1.2.0' },
  { id: 'launch-screen', name: 'Launch screen', version: '1.0.0', since: '1.3.0' },
  { id: 'widgets', name: 'Widgets', version: '1.0.0', since: '1.4.0' },
];

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
  const seen = json;
  let d;
  try {
    d = JSON.parse(json);
    if (d && typeof d === "object") { delete d.settings; json = JSON.stringify(d); }   // settings live in settings.json
  } catch (e) {
    return;
  }
  try {
    if (fm.fileExists(dataPath)) fm.writeString(backupPath, fm.readString(dataPath));
  } catch (e) {}
  fm.writeString(dataPath, json);
  lastSaved = seen;
  // Every round, payout and player change reaches this save, so the widget's snapshot follows it (names, points, tokens only).
  saveWidget(widgetSnapshot(d));
}

// ───────────────────────── Settings (app-blueprints · settings) ─────────────────────────
// settings.json sits next to data.json (iCloud Drive › Scriptable › ReadingStars). Players, tokens,
// budgets and the PIN stay in data.json. Changed only from the Settings sheet in the parent zone.
const settingsPath = fm.joinPath(folder, "settings.json");
// Defaults first, saved choices on top. The bright Ink look is the default (not Auto): it is the game's own look.
const settings = {
  theme: "ink", density: "comfortable", font: "sans", textSize: 1,
  wordCase: "cap", sound: true, currency: "EUR",
  checkUpdates: true,   // offer new versions from GitHub (asks again 2 days after "Later")
  cfg: {},
};
const saveSettings = () => { try { fm.writeString(settingsPath, JSON.stringify(settings)); return true; } catch (e) { return false; } };
const CURRENCY_CODES = ["EUR", "USD", "GBP"];
// Every key the page may change, with its check (all apply at once on the page).
const SET_KEYS = {
  theme: (v) => v === "auto" || !!PALETTES[v], density: (v) => ["comfortable", "compact", "tiny"].includes(v),
  font: (v) => ["sans", "serif"].includes(v), textSize: (v) => [0.92, 1, 1.12, 1.25].includes(+v),
  wordCase: (v) => ["cap", "upper", "lower"].includes(v), currency: (v) => CURRENCY_CODES.includes(v),
  sound: "bool", checkUpdates: "bool",
};
function setSetting(k, v) {
  const s = SET_KEYS[k];
  if (!s) return false;
  if (s === "bool") v = v === true || v === "true";
  else if (!s(v)) return false;
  if (k === "textSize") v = +v;
  settings[k] = v;
  return true;
}
async function loadSettings(data) {
  await ensureDownloaded(settingsPath);
  let saved = null;
  try { if (fm.fileExists(settingsPath)) saved = JSON.parse(fm.readString(settingsPath)); } catch (e) {}
  if (saved && typeof saved === "object") Object.assign(settings, saved);
  else {   // first run of 1.2: letter style, currency and sounds move over from data.json
    const old = (data && data.settings) || {};
    for (const k of ["wordCase", "currency", "sound"]) if (old[k] !== undefined) settings[k] = old[k];
    saveSettings();
  }
  const d = { theme: "ink", density: "comfortable", font: "sans", textSize: 1, wordCase: "cap", currency: "EUR" };
  for (const k of Object.keys(d)) if (!setSetting(k, settings[k])) settings[k] = d[k];
  settings.sound = settings.sound !== false;
  settings.cfg = settings.cfg && typeof settings.cfg === "object" ? settings.cfg : {};
}
// Everything tunable lives here; the Settings screen edits these (stored in settings.cfg, defaults below).
// Labels come in each app language.
const CONFIG = [
  [{ en: "Rounds", lt: "Raundai", es: "Rondas" }, [
    { k: "beginnerPics", def: 3, min: 2, max: 4, step: 1,
      en: { label: "Pictures per round, Beginner", unit: "pictures" }, lt: { label: "Paveikslėlių raunde, pradedantiesiems", unit: "pav." }, es: { label: "Imágenes por ronda, Principiante", unit: "imágenes" } },
    { k: "expertPics", def: 5, min: 3, max: 5, step: 1,
      en: { label: "Pictures per round, Expert", unit: "pictures" }, lt: { label: "Paveikslėlių raunde, ekspertams", unit: "pav." }, es: { label: "Imágenes por ronda, Experto", unit: "imágenes" } },
  ]],
  [{ en: "Widget", lt: "Valdiklis", es: "Widget" }, [
    { k: "widgetRefreshMin", def: 30, min: 15, max: 240, step: 15,
      en: { label: "Ask iOS to refresh every", help: "iOS decides the exact timing", unit: "min" },
      lt: { label: "Prašyti iOS atnaujinti kas", help: "Tikslų laiką nusprendžia iOS", unit: "min." },
      es: { label: "Pedir a iOS que actualice cada", help: "iOS decide el momento exacto", unit: "min" } },
    { k: "widgetStaleMin", def: 720, min: 60, max: 2880, step: 60,
      en: { label: "Mark the widget as out of date after", help: "Older data shows \"Updated …\" in amber", unit: "min" },
      lt: { label: "Laikyti valdiklį pasenusiu po", help: "Senesni duomenys rodo „Atnaujinta …“ gintaro spalva", unit: "min." },
      es: { label: "Marcar el widget como desactualizado tras", help: "Los datos antiguos muestran «Actualizado …» en ámbar", unit: "min" } },
  ]],
];
const CFG_FLAT = CONFIG.flatMap(([, items]) => items);
const cfgDef = (k) => CFG_FLAT.find((x) => x.k === k);
const cfg = (k) => { const v = settings.cfg && settings.cfg[k]; return v === undefined ? cfgDef(k).def : v; };
const cfgValues = () => Object.fromEntries(CFG_FLAT.map((d) => [d.k, cfg(d.k)]));
function setCfg(k, v) {
  const d = cfgDef(k);
  if (!d) return "Unknown setting";
  settings.cfg = settings.cfg || {};
  if (v === null) { delete settings.cfg[k]; return ""; }   // Reset
  v = Number(String(v).replace(",", "."));   // accept a decimal comma
  if (!isFinite(v)) v = d.def;
  v = Math.min(d.max, Math.max(d.min, v));
  v = d.step < 1 ? Math.round(v / d.step) * d.step : Math.round(v);
  v = Number(v.toFixed(2));
  if (v === d.def) delete settings.cfg[k]; else settings.cfg[k] = v;   // store only what differs
  return "";
}
// Six palettes on the shared colour tokens. The game's purple is the accent in all of them; sky and sky2 are this
// app's own extra colours (the backdrop: day sky in the light palettes, night sky in Slate and Night). Picture tiles,
// syllable colours, the copybook word card, avatars and confetti are fixed artwork.
const PALETTES = {
  ink:      { paper: "#FFFDF5", sheet: "#FFFFFF", ink: "#24264A", ink2: "#3D4070", muted: "#6B6E91", rule: "#E3E6F0", signal: "#7C5CFA", signalWash: "#ECE6FF", amber: "#9A6200", amberWash: "#FFF3C4", danger: "#D9483A", sky: "#4FB3F6", sky2: "#7CCBFF", scheme: "light" },
  sepia:    { paper: "#F7EEDB", sheet: "#FBF5E6", ink: "#2A1F14", ink2: "#4B3B2A", muted: "#73604A", rule: "#E1D3B5", signal: "#6E4FD8", signalWash: "#E8E0F5", amber: "#A16207", amberWash: "#F6E5BF", danger: "#B4372B", sky: "#E2A85C", sky2: "#F0C88A", scheme: "light" },
  mint:     { paper: "#F4FBF7", sheet: "#FFFFFF", ink: "#0D2318", ink2: "#2C4A3B", muted: "#556D60", rule: "#D3E2D9", signal: "#7C5CFA", signalWash: "#ECE6FF", amber: "#B45309", amberWash: "#FBEED8", danger: "#C2412D", sky: "#3CC48C", sky2: "#7EDDB4", scheme: "light" },
  contrast: { paper: "#FFFFFF", sheet: "#FFFFFF", ink: "#000000", ink2: "#111111", muted: "#333333", rule: "#9A9A9A", signal: "#4B1FD1", signalWash: "#E6DEFF", amber: "#7A4B00", amberWash: "#FFEEC2", danger: "#A30000", sky: "#1565C0", sky2: "#1E88E5", scheme: "light" },
  slate:    { paper: "#22272E", sheet: "#2A3038", ink: "#E6EDF3", ink2: "#C5CED8", muted: "#9AA5B1", rule: "#3B434D", signal: "#A08CFF", signalWash: "#2E2850", amber: "#E3B341", amberWash: "#3A2F12", danger: "#FF8A7A", sky: "#26323F", sky2: "#3A4A5C", scheme: "dark" },
  night:    { paper: "#161A33", sheet: "#1E2342", ink: "#EEF0FF", ink2: "#CDD1F0", muted: "#A3A8C9", rule: "#30365C", signal: "#A08CFF", signalWash: "#2C2560", amber: "#FFD23F", amberWash: "#3A300C", danger: "#FF7B6E", sky: "#0B1E3F", sky2: "#1B2F5C", scheme: "dark" },
};
const PALETTE_CSS = Object.entries(PALETTES).map(([k, p]) => `[data-theme=${k}]{--paper:${p.paper};--sheet:${p.sheet};--ink:${p.ink};--ink-2:${p.ink2};--muted:${p.muted};--rule:${p.rule};--signal:${p.signal};--signal-wash:${p.signalWash};--amber:${p.amber};--amber-wash:${p.amberWash};--danger:${p.danger};--sky:${p.sky};--sky2:${p.sky2};color-scheme:${p.scheme}}`).join("\n");
// The look for the first paint, so the page never flashes the default palette (the page keeps Auto live afterwards).
function lookState() {
  return { theme: settings.theme, density: settings.density, font: settings.font, textSize: settings.textSize,
           shown: settings.theme === "auto" ? (Device.isUsingDarkAppearance() ? "night" : "ink") : settings.theme };
}
// What the game reads from settings, and what the Settings sheet shows.
const gameSettings = () => ({ wordCase: settings.wordCase, sound: settings.sound, currency: settings.currency });
function settingsState() {
  return {
    settings: Object.fromEntries(Object.keys(SET_KEYS).map((k) => [k, settings[k]])),
    cfg: cfgValues(),
    cfgSchema: CONFIG.map(([title, items]) => ({ title, items })),
    palettes: PALETTES, currencies: CURRENCY_CODES, version: VERSION, appName: "Reading Stars",
    blueprints: BLUEPRINTS, blueprintsRepo: BLUEPRINTS_REPO,
  };
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
  if (!settings.checkUpdates || updateSnoozed()) return null;
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
  --sun:#FFD23F; --sunDeep:#F5A300; --tomato:#FF6B5B; --grass:#2FBF71;
  --line:#BFD9F2; --margin:#FF8A8A; --copybook:#FFFDF5;
  --ts:1; --serif: ui-serif, "New York", Georgia, serif; --rounded: ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif;
  --display: var(--rounded); --pad:18px; --gap:14px;
}
html[data-font=serif]{--display:var(--serif)}
${PALETTE_CSS}
:root{--grape:var(--signal);--chipbg:color-mix(in srgb,var(--ink) 7%,var(--sheet));--hair:color-mix(in srgb,var(--ink) 12%,var(--sheet))}
body.d-compact{--pad:13px;--gap:10px}
body.d-tiny{--pad:10px;--gap:8px}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;touch-action:manipulation}
input{-webkit-user-select:text;user-select:text}
html{background:var(--sky)}
html,body{margin:0;min-height:100%}
body{
  font-family:var(--rounded);
  color:var(--ink);-webkit-font-smoothing:antialiased;
  background-color:var(--sky);
  background-image:
    radial-gradient(rgba(255,255,255,.22) 2px,transparent 2.5px),
    linear-gradient(180deg,var(--sky) 0%,var(--sky2) 100%);
  background-size:26px 26px,100% 100%;
}
#err{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:999;background:var(--sheet);color:#C92A2A;border:3px solid #C92A2A;border-radius:14px;padding:12px;font:700 calc(14px * var(--ts))/1.35 -apple-system,system-ui,sans-serif;white-space:pre-wrap;word-break:break-word}
#app{position:relative;max-width:760px;margin:0 auto;padding:calc(env(safe-area-inset-top) + 14px) 16px calc(env(safe-area-inset-bottom) + 28px)}
button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}
button:disabled{opacity:.4}
:focus-visible{outline:4px solid var(--sun);outline-offset:3px}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 16px;border-radius:18px;font-weight:800;font-size:calc(18px * var(--ts));background:var(--sheet);box-shadow:0 5px 0 rgba(36,38,74,.18);transition:transform .08s,box-shadow .08s}
.btn:active:not(:disabled){transform:translateY(4px);box-shadow:0 1px 0 rgba(36,38,74,.18)}
.btn.primary{background:var(--grape);color:#fff;box-shadow:0 5px 0 #5638C9}
.btn.go{background:var(--grass);color:#fff;box-shadow:0 5px 0 #1E8E52}
.btn.danger{background:var(--tomato);color:#fff;box-shadow:0 5px 0 #D9483A}
.btn.gold{background:var(--sun);color:#5C3B00;box-shadow:0 5px 0 var(--sunDeep)}
.btn.ghost{background:var(--sheet)}
.btn.big{font-size:calc(20px * var(--ts));padding:18px 14px;border-radius:22px}
.btn.small{font-size:calc(15px * var(--ts));padding:10px 14px;border-radius:14px}
.btn.wide{width:100%}

/* Home */
.hero{text-align:center;color:#fff;padding:4px 0 2px}
.logo{display:inline-flex;gap:2px;font-size:calc(40px * var(--ts))}
/* Reading Stars logo: the big star (home header mark and launch screen) */
.brand-mark{display:block;width:64px;height:64px;border-radius:15px;background:#0E1116;box-shadow:0 4px 0 rgba(36,38,74,.22),inset 0 0 0 1px rgba(246,247,249,.14);animation:float 3.2s ease-in-out infinite}
h1{margin:2px 0 14px;font-family:var(--display);font-size:calc(36px * var(--ts));font-weight:900;letter-spacing:.3px;text-shadow:0 3px 0 rgba(36,38,74,.18)}
.langs{display:inline-flex;gap:6px;background:rgba(255,255,255,.25);padding:6px;border-radius:20px}
.lang{border-radius:14px;padding:8px 12px;font-size:calc(16px * var(--ts));font-weight:900;color:#fff;display:flex;gap:6px;align-items:center}
.lang .flag{font-size:calc(22px * var(--ts))}
.lang.on{background:var(--sheet);color:var(--ink);box-shadow:0 3px 0 rgba(36,38,74,.15)}
.section{color:#fff;text-align:center;font-family:var(--display);font-size:calc(24px * var(--ts));font-weight:900;margin:24px 0 14px;text-shadow:0 2px 0 rgba(36,38,74,.15)}
.empty{color:#fff;text-align:center;font-size:calc(19px * var(--ts));font-weight:800}
.kids{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
.kid{background:var(--sheet);border-radius:28px;padding:16px 10px 14px;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:0 6px 0 rgba(36,38,74,.14);transition:transform .1s}
.kid:active{transform:scale(.96)}
.kid.add{background:rgba(255,255,255,.28);border:3px dashed #fff;box-shadow:none;color:#fff;justify-content:center}
.ava{width:78px;height:78px;border-radius:50%;display:grid;place-items:center;font-size:calc(46px * var(--ts));line-height:1;flex:none}
.ava.plus{background:rgba(255,255,255,.4);font-size:calc(34px * var(--ts))}
.ava.sm{width:40px;height:40px;font-size:calc(23px * var(--ts))}
.kname{font-weight:900;font-size:calc(20px * var(--ts));max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stats{display:flex;gap:12px;font-weight:900;font-size:calc(21px * var(--ts))}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:calc(13px * var(--ts));font-weight:800;white-space:nowrap}
.badge.beginner{background:#D8F5E5;color:#18794A}
.badge.expert{background:#E9E2FF;color:#5232C7}
.bottom{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:28px}

/* Generic bars & panels */
.bar{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;gap:8px;margin-bottom:16px;color:#fff}
.bar h2{margin:0;text-align:center;font-family:var(--display);font-size:calc(23px * var(--ts));font-weight:900;text-shadow:0 2px 0 rgba(36,38,74,.15)}
.icon{width:48px;height:48px;border-radius:16px;background:var(--sheet);color:var(--ink);font-size:calc(22px * var(--ts));box-shadow:0 4px 0 rgba(36,38,74,.15);display:grid;place-items:center}
.icon:active{transform:translateY(3px);box-shadow:none}
.panel{background:var(--sheet);border-radius:26px;padding:var(--pad);margin-bottom:var(--gap);box-shadow:0 6px 0 rgba(36,38,74,.12)}
.panel h3{margin:0 0 14px;font-family:var(--display);font-size:calc(19px * var(--ts))}
.lbl{display:block;font-weight:900;font-size:calc(17px * var(--ts));margin:18px 0 8px;color:var(--muted)}
.lbl:first-child{margin-top:0}
.input{width:100%;font:inherit;font-size:24px;font-weight:800;padding:14px 16px;border-radius:16px;border:3px solid var(--hair);outline:none;color:var(--ink);background:var(--sheet)}
.input:focus{border-color:var(--grape)}
.levels{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.lvl{border:3px solid var(--hair);border-radius:20px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;background:var(--sheet)}
.lvl.on{border-color:var(--grape);background:#F3EFFF}
.lvlIcon{font-size:calc(38px * var(--ts))}
.lvl b{font-size:calc(17px * var(--ts))}
.lvl small{color:var(--muted);font-weight:700;font-size:calc(13px * var(--ts))}
.avatars{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.avpick{aspect-ratio:1;border-radius:18px;background:var(--chipbg);font-size:calc(34px * var(--ts));display:grid;place-items:center;border:3px solid transparent;transition:transform .12s}
.avpick.on{border-color:var(--grape);background:#F3EFFF;transform:scale(1.08)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.row3{display:grid;grid-template-columns:1.5fr 1.2fr 56px;gap:8px;margin-top:14px}

/* Game */
.gamebar{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.who{flex:1;display:flex;align-items:center;gap:8px;min-width:0;color:#fff;font-weight:900;font-size:calc(19px * var(--ts))}
.wn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 2px 0 rgba(36,38,74,.15)}
.pill{background:var(--sheet);border-radius:999px;padding:8px 12px;font-weight:900;font-size:calc(18px * var(--ts));box-shadow:0 4px 0 rgba(36,38,74,.15);white-space:nowrap}
.coins{background:var(--sun);color:#5C3B00;box-shadow:0 4px 0 var(--sunDeep)}
.bump{animation:bump .45s}
.hint{text-align:center;color:#fff;font-weight:800;font-size:calc(17px * var(--ts));margin:6px 0 12px;text-shadow:0 2px 0 rgba(36,38,74,.15)}
.pics{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.pics .pic{width:calc((100% - 24px) / 3)}
.pic{aspect-ratio:1;border-radius:26px;border:5px solid #fff;display:grid;place-items:center;box-shadow:0 7px 0 rgba(36,38,74,.16);position:relative;transition:transform .1s,filter .2s,opacity .2s}
.pic:active{transform:scale(.95)}
.emo{font-size:min(19vw,112px);line-height:1}
.pic.wrong{filter:grayscale(1);opacity:.45}
.pic.wrong::after{content:"✖";position:absolute;top:4px;right:10px;font-size:calc(22px * var(--ts));color:var(--tomato);font-weight:900}
.pic.shake{animation:shake .45s}
.pic.right{border-color:var(--sun);animation:pop .7s cubic-bezier(.3,1.6,.5,1) forwards;box-shadow:0 0 0 6px rgba(255,210,63,.7),0 0 40px 12px rgba(255,240,170,.95);z-index:2}

/* The word: a strip of a school copybook */
.wordcard{
  position:relative;margin-top:20px;border-radius:22px;padding:26px 14px 22px 30px;text-align:center;overflow:hidden;
  background-color:var(--copybook);
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
.feedback{min-height:56px;display:grid;place-items:center;text-align:center;font-weight:900;font-size:calc(20px * var(--ts));margin-top:14px;color:#fff;text-shadow:0 2px 0 rgba(36,38,74,.18);line-height:1.25}
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
.sheet{background:var(--sheet);border-radius:26px;padding:22px;max-width:420px;width:100%;animation:pop .35s forwards}
.sheet .msg{font-size:calc(19px * var(--ts));font-weight:800;margin-bottom:18px;line-height:1.35;text-align:center}

/* Leaderboard */
.podium{display:flex;align-items:flex-end;justify-content:center;gap:10px;margin:6px 0 20px}
.pod{flex:1;max-width:150px;display:flex;flex-direction:column;align-items:center;gap:6px;color:#fff;min-width:0}
.pod .kname{font-size:calc(17px * var(--ts));text-shadow:0 2px 0 rgba(36,38,74,.18)}
.pod .ava{box-shadow:0 4px 0 rgba(36,38,74,.15)}
.pod.p1 .ava{width:92px;height:92px;font-size:calc(56px * var(--ts));animation:float 2.4s ease-in-out infinite}
.block{width:100%;border-radius:18px 18px 8px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:calc(30px * var(--ts));font-weight:900;color:#fff}
.block .pts{font-size:calc(16px * var(--ts));text-shadow:0 1px 0 rgba(0,0,0,.2)}
.pod.p1 .block{height:124px;background:linear-gradient(#FFE066,#F5A300)}
.pod.p2 .block{height:94px;background:linear-gradient(#E9ECF5,#A9AFC6)}
.pod.p3 .block{height:74px;background:linear-gradient(#FFC59E,#E8742A)}
.lrow{display:flex;align-items:center;gap:12px;background:var(--sheet);border-radius:20px;padding:10px 14px;margin-bottom:var(--gap);box-shadow:0 4px 0 rgba(36,38,74,.12)}
.rank{width:34px;text-align:center;font-weight:900;font-size:calc(22px * var(--ts));flex:none}
.lmain{flex:1;min-width:0}
.lmain .kname{font-size:calc(18px * var(--ts))}
.lscore{text-align:right;font-weight:900;font-size:calc(20px * var(--ts));white-space:nowrap}
.lscore small{display:block;font-size:calc(13px * var(--ts));color:var(--muted);font-weight:800}

/* PIN */
.center{text-align:center}
.pintitle{font-size:calc(21px * var(--ts));font-weight:900;margin-bottom:18px}
.dots{display:flex;justify-content:center;gap:16px;margin-bottom:10px}
.dot{width:22px;height:22px;border-radius:50%;border:3px solid var(--grape)}
.dot.on{background:var(--grape)}
.dots.shake{animation:shake .4s}
.pinmsg{min-height:24px;font-weight:800;color:var(--muted);margin-bottom:12px}
.pinmsg.err{color:var(--tomato)}
.keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:300px;margin:0 auto}
.key{height:66px;border-radius:20px;background:var(--chipbg);font-size:calc(28px * var(--ts));font-weight:900;box-shadow:0 4px 0 rgba(36,38,74,.12)}
.key:active{transform:translateY(3px);box-shadow:none}

/* Parent zone */
.pkhead{display:flex;align-items:center;gap:12px}
.pkhead .kname{font-size:calc(21px * var(--ts))}
.pkstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;text-align:center}
.pkstats div{background:#F6F7FB;border-radius:14px;padding:8px 4px}
.pkstats b{display:block;font-size:calc(20px * var(--ts))}
.pkstats small{color:var(--muted);font-weight:800;font-size:calc(12px * var(--ts))}
details{margin-top:14px}
summary{font-weight:800;color:var(--muted)}
.hist{display:flex;justify-content:space-between;padding:8px 2px;border-bottom:1px solid var(--hair);font-weight:700}
.setrow{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;font-weight:800}
.seg3{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.chip{padding:8px 10px;border-radius:12px;background:var(--chipbg);font-weight:900;font-size:calc(15px * var(--ts))}
.chip.on{background:var(--grape);color:#fff}
.toggle{font-size:calc(24px * var(--ts));padding:6px 14px;border-radius:14px;background:var(--chipbg)}
.toggle.on{background:#D8F5E5}
.note{color:var(--muted);font-size:calc(13px * var(--ts));font-weight:700;margin:16px 0 0;line-height:1.4}

.worth{font-weight:900;font-size:calc(19px * var(--ts));color:#18794A;background:#E6F8EE;border-radius:999px;padding:3px 10px}
.warnchip{font-weight:800;font-size:calc(12px * var(--ts));color:#B42318;background:#FFE4E1;border-radius:999px;padding:4px 10px;text-align:center;line-height:1.25}
.piggy{display:flex;flex-direction:column;align-items:center;gap:2px;background:var(--sheet);border-radius:16px;padding:8px 12px;margin:0 0 6px;font-weight:900;font-size:calc(17px * var(--ts));color:#18794A;box-shadow:0 4px 0 rgba(36,38,74,.12);text-align:center}
.piggy.warn small{color:#B42318;font-size:calc(14px * var(--ts));line-height:1.3;font-weight:800}
.money{margin-top:14px;background:#F6F7FB;border-radius:18px;padding:12px 14px}
.mrow{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;font-weight:800}
.rateBox{display:flex;align-items:center;gap:6px;font-weight:900;font-size:calc(17px * var(--ts));white-space:nowrap}
.input.sm{width:92px;font-size:19px;padding:8px 10px;border-radius:12px;text-align:right}
.mhint{display:block;color:var(--muted);font-weight:700;font-size:calc(12px * var(--ts));margin:-2px 0 12px}
.budget{font-size:calc(20px * var(--ts));font-weight:900}
.budget.neg{color:#B42318}
.warnline{margin-top:10px;color:#B42318;font-weight:800;font-size:calc(14px * var(--ts));line-height:1.35}
.quick{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:12px 0 16px}
.sheet .input{text-align:center}
.sheet .sub{color:var(--muted);font-weight:700;font-size:calc(14px * var(--ts));text-align:center;margin:-8px 0 12px}
.wallet{position:relative;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px;background:var(--sheet);border-radius:24px;padding:12px 14px;margin:0 0 10px;box-shadow:0 6px 0 rgba(36,38,74,.14)}
.wallet.solo{grid-template-columns:1fr}
.wcell{display:flex;flex-direction:column;align-items:center;line-height:1;min-width:0}
.wcell small{font-size:calc(13px * var(--ts));font-weight:800;color:var(--muted);margin-top:6px}
.wbig{font-size:calc(46px * var(--ts));font-weight:900;display:flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums;white-space:nowrap}
.wbig .ic{font-size:calc(34px * var(--ts))}
.wtok .wbig{color:#B07800}
.wmon .wbig{color:#18794A}
.weq{font-size:calc(30px * var(--ts));font-weight:900;color:#A3A8C3}
.wwarn{grid-column:1/-1;text-align:center;color:#B42318;background:#FFE4E1;border-radius:14px;padding:6px 10px;margin-top:6px;font-weight:800;font-size:calc(14px * var(--ts));line-height:1.3}
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
.ver{text-align:center;color:rgba(255,255,255,.85);font-weight:800;font-size:calc(13px * var(--ts));margin:22px 0 0}
#upd{position:fixed;inset:0;z-index:85;background:rgba(36,38,74,.55);display:flex;align-items:flex-end;animation:fade .2s}
.updp{width:100%;max-width:760px;margin:0 auto;background:var(--sheet);border-radius:26px 26px 0 0;padding:20px 18px calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;animation:updUp .35s cubic-bezier(.2,.8,.3,1)}
.updtag{align-self:flex-start;background:var(--grape);color:#fff;font-size:calc(13px * var(--ts));font-weight:900;padding:5px 12px;border-radius:999px}
.updt{margin:6px 0 0;font-size:calc(24px * var(--ts));line-height:1.2;font-weight:900}
.upds{color:var(--muted);font-size:calc(15px * var(--ts));font-weight:700}
.updl{display:flex;flex-direction:column;gap:10px;margin:8px 0 6px}
.updi{display:flex;gap:12px;align-items:flex-start;background:var(--chipbg);border-radius:16px;padding:12px}
.updic{font-size:calc(28px * var(--ts));line-height:1.1;flex:none}
.updi b{display:block;font-size:calc(16px * var(--ts));font-weight:900}
.updi span{display:block;color:var(--muted);font-size:calc(14px * var(--ts));line-height:1.35;margin-top:2px;font-weight:700}
.updmsg{font-weight:800;font-size:calc(15px * var(--ts));line-height:1.4}
.updmsg:empty{display:none}
.updgo,.updlater{width:100%}
.updlater{background:var(--chipbg);box-shadow:none}
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
  .brand-mark,.pod.p1 .ava{animation:none}
}

/* Launch screen (app-blueprints · launch-screen 1.0.0) */
.splash{--sp-bg:#0E1116;--sp-ink:#F6F7F9;--sp-accent:#FACC15;--sp-accent2:#2DD4BF;--sp-muted:#9AA3AE;--sp-font:var(--display);
  position:fixed;inset:0;z-index:1000;background:var(--sp-bg);color:var(--sp-ink);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;cursor:pointer;
  animation:spOut .4s ease 2.4s forwards}
.splash.gone{display:none}
.spIcon{width:148px;height:148px;opacity:0;transform:scale(.86);animation:spIn .5s cubic-bezier(.2,.9,.3,1.2) .05s forwards}
.spIcon svg{width:100%;height:100%;display:block;overflow:visible}
.spFrame{fill:none;stroke:var(--sp-ink);stroke-opacity:.35;stroke-width:7;stroke-linecap:round;stroke-linejoin:round;opacity:0;animation:spFade .4s ease .25s forwards}
.spDraw{fill:none;stroke:var(--sp-ink);stroke-width:13;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100;stroke-dashoffset:100;animation:spDraw .8s ease-in-out .15s forwards}
.spPop{fill:var(--sp-accent);transform-box:fill-box;transform-origin:center;transform:scale(0);animation:spPop .45s cubic-bezier(.3,1.7,.5,1) .75s forwards}
.spDetail{fill:var(--sp-ink);opacity:0;animation:spFade .3s ease 1.05s forwards}
.spSweep{fill:none;stroke:var(--sp-accent2);stroke-width:7;stroke-linecap:round;opacity:0;transform:translateX(var(--sp-sweep-from,-120px));animation:spSweep 1s ease-in-out .95s forwards}
.spWord{font:800 40px/1 var(--sp-font,ui-rounded,-apple-system,system-ui,sans-serif);letter-spacing:-.02em;opacity:0;transform:translateY(10px);animation:spUp .45s ease 1.05s forwards}
.spWord span{color:var(--sp-accent)}
.spTag{font:600 15px/1.3 -apple-system,system-ui,sans-serif;letter-spacing:.06em;color:var(--sp-muted);opacity:0;transform:translateY(8px);animation:spUp .45s ease 1.4s forwards}
/* Reading Stars logo: the star's rounded edge is drawn in the accent (it has no white outline), the sparkle keeps its soft edge */
.spDraw{stroke:var(--sp-accent);stroke-width:12}
.spDetail{stroke:var(--sp-ink);stroke-width:3;stroke-linejoin:round}
@keyframes spIn{to{opacity:1;transform:scale(1)}}
@keyframes spFade{to{opacity:1}}
@keyframes spDraw{to{stroke-dashoffset:0}}
@keyframes spPop{to{transform:scale(1)}}
@keyframes spSweep{0%{opacity:0}15%{opacity:1}100%{opacity:1;transform:translateX(0)}}
@keyframes spUp{to{opacity:1;transform:none}}
@keyframes spOut{to{opacity:0;visibility:hidden}}
@media (prefers-reduced-motion:reduce){
  .splash *{animation:none!important;opacity:1!important;transform:none!important;stroke-dashoffset:0!important}
  .splash{animation:spOut .3s ease 1.6s forwards!important}
}

/* Tiny: one line per player on the leaderboard and in the parent zone; tap for the details */
body.d-tiny .podium{display:none}
body.d-tiny .lrow{padding:7px 12px;cursor:pointer}
body.d-tiny .lrow .ava.sm{width:30px;height:30px;font-size:calc(17px * var(--ts))}
body.d-tiny .lrow:not(.open) .badge,body.d-tiny .lrow:not(.open) .lscore small{display:none}
body.d-tiny .lrow .lmain{display:flex;align-items:center;gap:8px}
body.d-compact .lrow{padding:8px 12px}
.pkmini{display:none;margin-left:auto;font-weight:900;white-space:nowrap}
body.d-tiny .panel.pk:not(.open)>:not(.pkhead){display:none}
body.d-tiny .panel.pk .pkhead{cursor:pointer;margin:0}
body.d-tiny .panel.pk .pkhead .ava{width:40px;height:40px;font-size:calc(23px * var(--ts))}
body.d-tiny .panel.pk:not(.open) .pkhead .badge{display:none}
body.d-tiny .panel.pk:not(.open) .pkmini{display:block}
body.d-tiny .panel.pk.open .pkhead{margin-bottom:14px}
/* Settings sheet (scoped: the app already uses .sheet, .chip, .toggle and .icon) */
#cfgsheet{position:fixed;inset:0;z-index:50;background:var(--paper);color:var(--ink);transform:translateY(102%);visibility:hidden;transition:transform .28s ease,visibility 0s linear .28s;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;text-align:left}
#cfgsheet.open{transform:none;visibility:visible;transition:transform .28s ease}
#cfgsheet button{font:inherit;color:inherit;background:none;border:0;border-radius:0;padding:0;font-weight:inherit;cursor:pointer;text-align:inherit}
#cfgsheet .sh-head{position:sticky;top:0;z-index:2;background:var(--paper);display:flex;justify-content:space-between;align-items:center;padding:calc(env(safe-area-inset-top) + 14px) 18px 12px;border-bottom:1px solid var(--rule)}
#cfgsheet .sh-head h2{font:700 calc(24px * var(--ts))/1 var(--display);margin:0}
#cfgsheet .sh-body{padding:16px 18px calc(env(safe-area-inset-bottom) + 40px);max-width:680px;margin:0 auto}
#cfgsheet .link{color:var(--signal);font-weight:600;font-size:16px}
#cfgsheet .link.small{font-size:calc(14px * var(--ts))}
#cfgsheet .hint{font-size:calc(13px * var(--ts));color:var(--muted);margin:8px 2px 0}
#cfgsheet .muted{color:var(--muted)}
#cfgsheet .sec{display:block;font:700 calc(17px * var(--ts))/1.2 var(--display);color:var(--ink);margin:26px 0 6px}
#cfgsheet .srow{display:flex;align-items:center;gap:8px;padding:11px 0;border-bottom:1px solid var(--rule)}
#cfgsheet .grow{flex:1;min-width:0}
#cfgsheet .grow b{display:block;font-weight:600}
#cfgsheet .grow small{display:block;font-size:calc(13px * var(--ts));color:var(--ink-2)}
#cfgsheet .switch{width:46px;height:28px;border-radius:14px;background:var(--rule);position:relative;flex:none;transition:background .2s}
#cfgsheet .switch::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:11px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .2s}
#cfgsheet .switch.on{background:var(--signal)}
#cfgsheet .switch.on::after{transform:translateX(18px)}
#cfgsheet .sm{font-size:calc(13px * var(--ts));padding:6px 11px;border-radius:8px;border:1px solid var(--rule);background:var(--sheet);white-space:nowrap;flex:none}
#cfgsheet .danger{color:var(--danger)}
#cfgsheet .danger.armed{background:var(--danger);color:#fff;border-color:var(--danger)}
#cfgsheet .seg{display:flex;flex:none;gap:0;padding:0;border:1px solid var(--rule);border-radius:9px;overflow:hidden;background:var(--sheet)}
#cfgsheet .seg button{font-size:calc(12.5px * var(--ts));padding:6px 10px;color:var(--ink-2);white-space:nowrap}
#cfgsheet .seg button.on{background:var(--ink);color:var(--paper);font-weight:600}
#cfgsheet .seg.wide button{flex:1;text-align:center;padding:9px 4px;font-size:calc(13.5px * var(--ts))}
#cfgsheet .lk-row{margin:10px 0 14px}
#cfgsheet .lk-l{display:block;font-size:calc(13px * var(--ts));font-weight:600;color:var(--ink-2);margin-bottom:6px}
#cfgsheet .sws{display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding:3px 3px 2px}
#cfgsheet .sws::-webkit-scrollbar{display:none}
#cfgsheet .sw{display:flex;flex-direction:column;align-items:center;gap:5px;flex:none}
#cfgsheet .sw .prev{position:relative;width:50px;height:50px;border-radius:13px;display:grid;place-items:center;border:1px solid rgba(127,127,127,.35);font:700 18px/1 var(--display)}
#cfgsheet .sw .prev i{position:absolute;right:6px;bottom:6px;width:9px;height:9px;border-radius:5px}
#cfgsheet .sw.on .prev{outline:2.5px solid var(--signal);outline-offset:2px}
#cfgsheet .sw small{font-size:12px;color:var(--ink-2)}
#cfgsheet .sw.on small{color:var(--ink);font-weight:600}
#cfgsheet .cfg{padding:12px 0;border-bottom:1px solid var(--rule)}
#cfgsheet .cfg.ch .cfg-h b::after{content:"";display:inline-block;width:7px;height:7px;border-radius:4px;background:var(--signal);margin-left:7px;vertical-align:2px}
#cfgsheet .cfg-h{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
#cfgsheet .cfg-h b{font-weight:600}
#cfgsheet .cfg small{display:block;font-size:calc(13px * var(--ts));margin-top:2px}
#cfgsheet .stepper{display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap}
#cfgsheet .stepper button{width:38px;height:36px;border-radius:9px;border:1px solid var(--rule);background:var(--sheet);font-size:20px;font-weight:600;text-align:center}
#cfgsheet .stepper button[disabled]{opacity:.35}
#cfgsheet .stepper input{width:86px;text-align:center;font:600 16px var(--sans);padding:7px 6px;border-radius:9px;border:1px solid var(--rule);background:var(--paper);color:var(--ink)}
#cfgsheet .stepper .unit{font-size:calc(14px * var(--ts));color:var(--ink-2);min-width:2.5em}
#cfgsheet .stepper .range{flex-basis:100%;font-size:calc(12px * var(--ts));color:var(--muted)}
#cfgsheet .cfgin.wide,#cfgsheet .cfgsel{display:block;width:100%;margin-top:8px;font:16px/1.45 var(--sans);padding:9px 11px;border-radius:9px;border:1px solid var(--rule);background:var(--paper);color:var(--ink);-webkit-appearance:none;appearance:none}
#cfgsheet textarea.cfgsel{resize:none}
#cfgsheet .cfgin:focus,#cfgsheet .cfgsel:focus{outline:2px solid var(--signal);outline-offset:-1px}
#cfgsheet .cfg-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:18px}
#cfgsheet .note{font-size:12.5px;color:var(--muted)}
#cfgsheet .srow.bp{width:100%;text-align:left}
#cfgsheet .chev{flex:none;color:var(--muted);font-size:calc(20px * var(--ts));line-height:1}
#cfgsheet input{-webkit-user-select:text;user-select:text}
#cfgsheet .srow.act{width:100%}
#cfgsheet{font-family:var(--rounded)}
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
  // Settings (app-blueprints · settings) come from settings.json through the Scriptable side.
  const LOOK = Object.assign({ theme: "ink", density: "comfortable", font: "sans", textSize: 1 }, init.look || {});
  const CFG = Object.assign({ beginnerPics: 3, expertPics: 5 }, init.cfg || {});
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
  // Beginner: 3 pictures. Expert: 5 pictures (both set in Settings › Rounds). All pictures share the word's
  // first letter; if the words can't fill the chosen number, the round uses the original number instead.
  function poolForN(kid, n) {
    return wordsFor(state.lang).filter(
      (w) => (kid.level === "expert" ? w.n >= 3 && w.n <= 6 : w.n <= 2) && sameLetter(w).length >= n - 1
    );
  }
  function picCount(kid) {
    const want = kid.level === "expert" ? CFG.expertPics : CFG.beginnerPics, def = kid.level === "expert" ? 5 : 3;
    return want === def || poolForN(kid, want).length ? want : def;
  }
  function poolFor(kid) {
    return poolForN(kid, picCount(kid));
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
      <div class="logo"><svg class="brand-mark" viewBox="0 0 240 240" aria-hidden="true"><path d="M120.0 52.0 L138.8 100.1 L190.4 103.1 L150.4 135.9 L163.5 185.9 L120.0 158.0 L76.5 185.9 L89.6 135.9 L49.6 103.1 L101.2 100.1 Z" fill="#FACC15" stroke="#FACC15" stroke-width="12" stroke-linejoin="round"></path><path d="M186 40 Q186 58 204 58 Q186 58 186 76 Q186 58 168 58 Q186 58 186 40 Z" fill="#F6F7F9" stroke="#F6F7F9" stroke-width="3" stroke-linejoin="round"></path><path d="M84 210 H156" stroke="#2DD4BF" stroke-width="7" stroke-linecap="round"></path></svg></div>
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
        (k, i) => `<div class="lrow" data-action="rowToggle">
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
      <div class="panel pk">
        <div class="pkhead" data-action="rowToggle">
          <span class="ava" style="background:${avaBg(k)}">${k.avatar}</span>
          <div style="min-width:0"><div class="kname">${esc(k.name)}</div>${levelBadge(k.level)}</div>
          <span class="pkmini">🪙 ${k.tokens} · ⭐ ${k.total}</span>
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

  VIEWS.parent = () => `
      <div class="bar"><button class="icon" data-action="lockParent" aria-label="${esc(t("parents"))}">⬅</button><h2>👨‍👩‍👧 ${esc(t("parentArea"))}</h2><button class="icon" data-action="openSettings" aria-label="${esc(CT.title)}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg></button></div>
      ${state.kids.length ? "" : `<p class="empty">${esc(t("noKids"))}</p>`}
      ${state.kids.map(parentKid).join("")}`;

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

  // ── Settings (app-blueprints · settings): every change applies at once and is saved; Done closes ──
  const CT_ALL = {
    en: { title: "Settings", done: "Done", hint: "Changes apply right away and are kept on this iPhone.", appearance: "Appearance", colours: "Colours", layout: "Layout", textSize: "Text size", font: "Headline font",
      themes: { auto: "Auto", ink: "Ink", sepia: "Sepia", mint: "Mint", contrast: "Contrast", slate: "Slate", night: "Night" },
      layouts: ["Comfortable", "Compact", "Tiny"], sizes: ["Small", "Default", "Large", "Larger"], fonts: ["Sans serif", "Serif"],
      game: "Game", money: "Money", parent: "Parent", pinHelp: "Opens the PIN pad to set a new PIN",
      updates: "Updates", offer: "Offer new versions", offerHelp: (v) => `You have Reading Stars ${v}. “Later” waits two days.`, check: "Check for updates now", checkBtn: "Check", checking: "Checking…",
      latest: (v) => `You're on the latest version (${v})`, avail: (v) => `Version ${v} is available`,
      reset: "Reset", original: "original", changed: (n) => `${n} setting${n === 1 ? "" : "s"} changed`, none: "All settings are at their original values", resetAll: "Reset all", confirmReset: "Confirm reset",
      builtWith: "Built with", builtHint: (a) => `${a} is built from shared blueprints that the other apps use too. Tap one to read how that part works.`, bp: (v, a, s) => `Blueprint ${v} · since ${a} ${s}`, all: "All blueprints", dec: "Decrease", inc: "Increase" },
    lt: { title: "Nustatymai", done: "Baigti", hint: "Pakeitimai įsigalioja iš karto ir saugomi šiame iPhone.", appearance: "Išvaizda", colours: "Spalvos", layout: "Išdėstymas", textSize: "Teksto dydis", font: "Antraščių šriftas",
      themes: { auto: "Automatiškai", ink: "Rašalas", sepia: "Sepija", mint: "Mėtinė", contrast: "Kontrastas", slate: "Skalūnas", night: "Naktis" },
      layouts: ["Erdvus", "Glaustas", "Mažytis"], sizes: ["Mažas", "Įprastas", "Didelis", "Didesnis"], fonts: ["Be serifų", "Su serifais"],
      game: "Žaidimas", money: "Pinigai", parent: "Tėvams", pinHelp: "Atidaro PIN klaviatūrą naujam PIN",
      updates: "Atnaujinimai", offer: "Siūlyti naujas versijas", offerHelp: (v) => `Jūsų versija: Reading Stars ${v}. „Vėliau“ palaukia dvi dienas.`, check: "Tikrinti atnaujinimus dabar", checkBtn: "Tikrinti", checking: "Tikrinama…",
      latest: (v) => `Naudojate naujausią versiją (${v})`, avail: (v) => `Yra versija ${v}`,
      reset: "Atstatyti", original: "pradinė", changed: (n) => `Pakeista nustatymų: ${n}`, none: "Visi nustatymai pradiniai", resetAll: "Atstatyti viską", confirmReset: "Patvirtinti",
      builtWith: "Sukurta pagal", builtHint: (a) => `${a} sukurta pagal bendrus šablonus, kuriuos naudoja ir kitos programos. Paspauskite, kad perskaitytumėte, kaip veikia ta dalis.`, bp: (v, a, s) => `Šablonas ${v} · nuo ${a} ${s}`, all: "Visi šablonai", dec: "Mažinti", inc: "Didinti" },
    es: { title: "Ajustes", done: "Listo", hint: "Los cambios se aplican al momento y se guardan en este iPhone.", appearance: "Apariencia", colours: "Colores", layout: "Diseño", textSize: "Tamaño del texto", font: "Fuente de títulos",
      themes: { auto: "Automático", ink: "Tinta", sepia: "Sepia", mint: "Menta", contrast: "Contraste", slate: "Pizarra", night: "Noche" },
      layouts: ["Amplio", "Compacto", "Mínimo"], sizes: ["Pequeño", "Normal", "Grande", "Más grande"], fonts: ["Sin serifa", "Con serifa"],
      game: "Juego", money: "Dinero", parent: "Padres", pinHelp: "Abre el teclado para poner un PIN nuevo",
      updates: "Actualizaciones", offer: "Ofrecer versiones nuevas", offerHelp: (v) => `Tienes Reading Stars ${v}. «Más tarde» espera dos días.`, check: "Buscar actualizaciones ahora", checkBtn: "Buscar", checking: "Buscando…",
      latest: (v) => `Tienes la última versión (${v})`, avail: (v) => `Hay una versión ${v}`,
      reset: "Restablecer", original: "original", changed: (n) => `${n} ajuste${n === 1 ? "" : "s"} cambiado${n === 1 ? "" : "s"}`, none: "Todos los ajustes están en sus valores originales", resetAll: "Restablecer todo", confirmReset: "Confirmar",
      builtWith: "Hecho con", builtHint: (a) => `${a} está hecho con plantillas compartidas que también usan las otras apps. Toca una para leer cómo funciona esa parte.`, bp: (v, a, s) => `Plantilla ${v} · desde ${a} ${s}`, all: "Todas las plantillas", dec: "Menos", inc: "Más" },
  };
  const CT = new Proxy({}, { get: (_, k) => (CT_ALL[state.lang] || CT_ALL.en)[k] });
  let SET = null, cfgIsOpen = false, cfgArmed = false;
  const darkMQ = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : { matches: false };
  function applyLook() {
    const root = document.documentElement;
    root.dataset.theme = LOOK.theme === "auto" ? (darkMQ.matches ? "night" : "ink") : LOOK.theme;
    root.dataset.font = LOOK.font;
    root.style.setProperty("--ts", LOOK.textSize);
    document.body.classList.remove("d-comfortable", "d-compact", "d-tiny");
    document.body.classList.add("d-" + LOOK.density);
    document.body.style.backgroundColor = "";
  }
  const onDark = () => { if (LOOK.theme === "auto") applyLook(); };
  if (darkMQ.addEventListener) darkMQ.addEventListener("change", onDark); else if (darkMQ.addListener) darkMQ.addListener(onDark);
  const cfgSheet = () => {
    let el = document.getElementById("cfgsheet");
    if (!el) {
      el = document.createElement("div"); el.id = "cfgsheet"; el.setAttribute("role", "dialog");
      document.body.appendChild(el);
      el.addEventListener("click", cfgClick);
      el.addEventListener("change", cfgChange);
    }
    el.setAttribute("aria-label", CT.title);
    return el;
  };
  const loc = (d) => Object.assign({}, d, d[state.lang] || d.en);
  const cfgItem = (k) => { for (const sec of SET.cfgSchema) for (const d of sec.items) if (d.k === k) return loc(d); return null; };
  const cfgChanged = (k) => { const d = cfgItem(k); return !!d && JSON.stringify(SET.cfg[k]) !== JSON.stringify(d.def); };
  const fmtCfg = (d, v) => (d.step && d.step < 1 ? Number(v).toFixed(String(d.step).split(".")[1].length) : String(v));
  const segRow = (k, opts, cur, act) => `<div class="seg wide">${opts.map(([v, l]) => `<button class="${String(cur) === String(v) ? "on" : ""}" data-act="${act || "look"}" data-k="${k}" data-v="${v}">${esc(l)}</button>`).join("")}</div>`;
  function lookHTML() {
    const P = SET.palettes, themes = ["auto"].concat(Object.keys(P));
    return `<div class="lk-row"><span class="lk-l">${esc(CT.colours)}</span><div class="sws">${themes.map((k) => {
        const st = k === "auto" ? `background:linear-gradient(135deg,${P.ink.sky} 50%,${P.night.sky} 50%);color:#fff` : `background:${P[k].sky};color:#fff`;
        return `<button class="sw ${LOOK.theme === k ? "on" : ""}" data-act="look" data-k="theme" data-v="${k}" aria-label="${esc(CT.themes[k])}"><span class="prev" style="${st}">Aa<i style="background:${(P[k] || P.night).signal}"></i></span><small>${esc(CT.themes[k])}</small></button>`;
      }).join("")}</div></div>
      <div class="lk-row"><span class="lk-l">${esc(CT.layout)}</span>${segRow("density", [["comfortable", CT.layouts[0]], ["compact", CT.layouts[1]], ["tiny", CT.layouts[2]]], LOOK.density)}</div>
      <div class="lk-row"><span class="lk-l">${esc(CT.textSize)}</span>${segRow("textSize", [[0.92, CT.sizes[0]], [1, CT.sizes[1]], [1.12, CT.sizes[2]], [1.25, CT.sizes[3]]], LOOK.textSize)}</div>
      <div class="lk-row"><span class="lk-l">${esc(CT.font)}</span>${segRow("font", [["sans", CT.fonts[0]], ["serif", CT.fonts[1]]], LOOK.font)}</div>`;
  }
  function fieldHTML(d0) {
    const d = loc(d0), v = SET.cfg[d.k], ch = cfgChanged(d.k);
    const reset = ch ? `<button class="link small" data-act="cfgreset" data-k="${d.k}">${esc(CT.reset)}</button>` : "";
    return `<div class="cfg ${ch ? "ch" : ""}"><div class="cfg-h"><b>${esc(d.label)}</b>${reset}</div>
      <div class="stepper"><button data-act="cfgstep" data-k="${d.k}" data-v="-1" aria-label="${esc(CT.dec)}" ${v <= d.min ? "disabled" : ""}>−</button>
      <input class="cfgin" data-k="${d.k}" value="${fmtCfg(d, v)}" inputmode="numeric" aria-label="${esc(d.label)}">
      <button data-act="cfgstep" data-k="${d.k}" data-v="1" aria-label="${esc(CT.inc)}" ${v >= d.max ? "disabled" : ""}>+</button>
      <span class="unit">${esc(d.unit || "")}</span><span class="range">${fmtCfg(d, d.min)}–${fmtCfg(d, d.max)}${ch ? ` — ${esc(CT.original)} ${fmtCfg(d, d.def)}` : ""}</span></div></div>`;
  }
  const bpLink = (b) => `${SET.blueprintsRepo}/blob/${b.id}-v${b.version}/blueprints/${b.id}.md`;
  function builtWithHTML() {
    return `<h3 class="sec">${esc(CT.builtWith)}</h3><p class="hint">${esc(CT.builtHint(SET.appName))}</p>
      ${SET.blueprints.map((b) => `<button class="srow bp" data-act="openurl" data-v="${esc(bpLink(b))}"><div class="grow"><b>${esc(b.name)}</b><small class="muted">${esc(CT.bp(b.version, SET.appName, b.since))}</small></div><span class="chev" aria-hidden="true">›</span></button>`).join("")}
      <button class="srow bp" data-act="openurl" data-v="${esc(SET.blueprintsRepo)}"><div class="grow"><b>${esc(CT.all)}</b><small class="muted">${esc(SET.blueprintsRepo.replace("https://", ""))}</small></div><span class="chev" aria-hidden="true">›</span></button>`;
  }
  function renderCfg() {
    const el = cfgSheet(), keep = el.scrollTop;
    el.classList.toggle("open", cfgIsOpen);
    document.body.style.overflow = cfgIsOpen ? "hidden" : "";
    if (!cfgIsOpen || !SET) return;
    const s = SET.settings, changed = Object.keys(SET.cfg).filter(cfgChanged).length;
    const sample = t("sample"), caseLabel = (v) => { const prev = state.settings.wordCase; state.settings.wordCase = v; const l = caseWord(sample); state.settings.wordCase = prev; return l; };
    el.innerHTML = `<div class="sh-head"><h2>${esc(CT.title)}</h2><button class="link" data-act="cfgclose">${esc(CT.done)}</button></div><div class="sh-body">
      <p class="hint">${esc(CT.hint)}</p>
      <h3 class="sec">${esc(CT.appearance)}</h3>${lookHTML()}
      <h3 class="sec">${esc(CT.game)}</h3>
      <div class="lk-row"><span class="lk-l">${esc(t("wordStyle"))}</span>${segRow("wordCase", [["cap", caseLabel("cap")], ["upper", caseLabel("upper")], ["lower", caseLabel("lower")]], s.wordCase, "set")}</div>
      <div class="srow"><div class="grow"><b>${esc(t("sound"))}</b></div><button class="switch ${s.sound ? "on" : ""}" data-act="toggle" data-v="sound" aria-label="${esc(t("sound"))}"></button></div>
      <h3 class="sec">${esc(CT.money)}</h3>
      <div class="lk-row"><span class="lk-l">${esc(t("currency"))}</span>${segRow("currency", SET.currencies.map((c) => [c, c]), s.currency, "set")}</div>
      <h3 class="sec">${esc(CT.parent)}</h3>
      <button class="srow act" data-act="changePin"><div class="grow"><b>🔑 ${esc(t("changePin"))}</b><small>${esc(CT.pinHelp)}</small></div><span class="chev" aria-hidden="true">›</span></button>
      <p class="hint">${esc(t("storageNote"))}</p>
      <h3 class="sec">${esc(CT.updates)}</h3>
      <div class="srow"><div class="grow"><b>${esc(CT.offer)}</b><small>${esc(CT.offerHelp(SET.version))}</small></div><button class="switch ${s.checkUpdates ? "on" : ""}" data-act="toggle" data-v="checkUpdates" aria-label="${esc(CT.offer)}"></button></div>
      <div class="srow"><div class="grow"><b>${esc(CT.check)}</b><small id="updmsg" class="muted" aria-live="polite"></small></div><button class="sm" data-act="updcheck">${esc(CT.checkBtn)}</button></div>
      ${SET.cfgSchema.map((sec) => `<h3 class="sec">${esc(sec.title[state.lang] || sec.title.en)}</h3>${sec.items.map(fieldHTML).join("")}`).join("")}
      <div class="cfg-foot"><span class="note">${esc(changed ? CT.changed(changed) : CT.none)}</span>
        ${changed ? `<button class="sm danger ${cfgArmed ? "armed" : ""}" data-act="cfgall">${esc(cfgArmed ? CT.confirmReset : CT.resetAll)}</button>` : ""}</div>
      ${builtWithHTML()}</div>`;
    el.scrollTop = keep;   // re-renders must not jump back to the top
  }
  function useState(st) {   // the game reads its settings from here
    SET = st;
    Object.assign(state.settings, { wordCase: st.settings.wordCase, sound: st.settings.sound, currency: st.settings.currency });
    Object.assign(CFG, st.cfg);
  }
  const sendCfg = (action, params) => send(action, params, (ok, st) => { if (ok && st && st.cfgSchema) useState(st); else if (!ok) toast(st); renderCfg(); });
  function openSettings() {
    if (cfgIsOpen) return;
    send("settings-get", {}, (ok, st) => { if (!ok) return toast(st); useState(st); cfgIsOpen = true; renderCfg(); cfgSheet().scrollTop = 0; });
  }
  function closeSettings() { cfgIsOpen = false; cfgArmed = false; renderCfg(); render(); }
  function cfgClick(e) {
    e.stopPropagation();   // the sheet's taps never reach the game's own click handler
    if (e.target.closest("select, option, input, textarea")) return;
    const el = e.target.closest("[data-act]"); if (!el || el.disabled) return;
    const act = el.dataset.act, v = el.dataset.v, k = el.dataset.k;
    if (act === "cfgclose") return closeSettings();
    if (act === "look") { const val = k === "textSize" ? +v : v; LOOK[k] = val; applyLook(); renderCfg(); return sendCfg("set", { k, v: val }); }
    if (act === "set") { SET.settings[k] = v; renderCfg(); return sendCfg("set", { k, v }); }
    if (act === "toggle") { SET.settings[v] = !SET.settings[v]; renderCfg(); return sendCfg("set", { k: v, v: SET.settings[v] }); }
    if (act === "cfgreset") return sendCfg("cfg", { k, reset: 1 });
    if (act === "cfgstep") { const d = cfgItem(k), step = d.step || 1; SET.cfg[k] = Math.min(d.max, Math.max(d.min, Number(SET.cfg[k]) + step * +v)); renderCfg(); return sendCfg("cfg", { k, v: SET.cfg[k] }); }
    if (act === "cfgall") {
      if (cfgArmed) { cfgArmed = false; return sendCfg("cfg", { k: "*" }); }
      cfgArmed = true; renderCfg(); setTimeout(() => { if (cfgArmed) { cfgArmed = false; renderCfg(); } }, 3500); return;
    }
    if (act === "changePin") { closeSettings(); return openPin("set1", "parent"); }
    if (act === "openurl") return send("openurl", { v });
    if (act === "updcheck") {
      const um = document.getElementById("updmsg"); el.disabled = true; if (um) um.textContent = CT.checking;
      return send("update-check", {}, (ok, r) => {
        el.disabled = false;
        if (um) um.textContent = !ok ? String(r) : r.available ? CT.avail(r.version) : CT.latest(r.version);
        if (ok && r.available) { closeSettings(); if (window.__showUpdate) window.__showUpdate(r.info); }
      });
    }
  }
  function cfgChange(e) {
    e.stopPropagation();
    if (e.target.classList.contains("cfgin")) sendCfg("cfg", { k: e.target.dataset.k, v: e.target.value });
  }
  applyLook();

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
    rowToggle(el) {   // Tiny layout: a player's line opens to show the details
      (el.closest(".panel") || el).classList.toggle("open");
    },
    openSettings() {
      if (!requireParent()) return;
      openSettings();
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

// ───────────────────────── Widget content (app-blueprints · widgets) ─────────────────────────
// The leaderboard at a glance, in the game's language. Never money, budgets or the PIN: kids see the Home Screen.
// Plural forms: English and Spanish one/other; Lithuanian 1, 21… / 2–9, 22… / 0, 10–20, 30….
const plOne = (n, one, other) => (n === 1 ? one : other);
const plLt = (n, one, few, many) => (n % 10 === 0 || (n % 100 > 10 && n % 100 < 20) ? many : n % 10 === 1 ? one : few);
const WIDGET_TEXT = {
  en: { open: 'Tap to open', nothing: 'Nothing to show yet.', updated: 'Updated', yesterday: 'yesterday',
    top: 'Top reader', empty: 'Add a player to start',
    caption: (p, t) => `⭐ ${p} ${plOne(p, 'point', 'points')} and 🪙 ${t} ${plOne(t, 'token', 'tokens')} to spend`,
    toSpend: (t) => `🪙 ${plOne(t, 'token', 'tokens')} to spend`,
    players: (n) => `${n} ${plOne(n, 'player', 'players')}`,
    place: (p, i, n) => `⭐ ${p} · #${i} of ${n}`,
    leads: (name, p) => `⭐ ${name} leads with ${p}` },
  lt: { open: 'Paspausk, kad atidarytum', nothing: 'Kol kas nėra ką rodyti.', updated: 'Atnaujinta', yesterday: 'vakar',
    top: 'Pirmauja', empty: 'Pridėk žaidėją ir pradėk',
    caption: (p, t) => `⭐ ${p} ${plLt(p, 'taškas', 'taškai', 'taškų')} ir 🪙 ${t} ${plLt(t, 'žetonas', 'žetonai', 'žetonų')} išleisti`,
    toSpend: (t) => `🪙 ${plLt(t, 'žetonas', 'žetonai', 'žetonų')} išleisti`,
    players: (n) => `${n} ${plLt(n, 'žaidėjas', 'žaidėjai', 'žaidėjų')}`,
    place: (p, i, n) => `⭐ ${p} · #${i} iš ${n}`,
    leads: (name, p) => `⭐ ${name} pirmauja: ${p}` },
  es: { open: 'Toca para abrir', nothing: 'Aún no hay nada que mostrar.', updated: 'Actualizado', yesterday: 'ayer',
    top: 'Líder de lectura', empty: 'Añade un jugador para empezar',
    caption: (p, t) => `⭐ ${p} ${plOne(p, 'punto', 'puntos')} y 🪙 ${t} ${plOne(t, 'ficha', 'fichas')} para gastar`,
    toSpend: (t) => `🪙 ${plOne(t, 'ficha', 'fichas')} para gastar`,
    players: (n) => `${n} ${plOne(n, 'jugador', 'jugadores')}`,
    place: (p, i, n) => `⭐ ${p} · #${i} de ${n}`,
    leads: (name, p) => `⭐ ${name} lidera con ${p}` },
};

// What the widget may see, taken from the game's own save: names, avatars, points and tokens, and the language.
// Never token values, budgets, payouts, top-ups or the PIN hash.
function widgetSnapshot(d) {
  const num = (v) => (typeof v === 'number' && isFinite(v) ? Math.max(0, v) : 0);
  const kids = d && Array.isArray(d.kids) ? d.kids.filter((k) => k && typeof k === 'object') : [];
  return {
    lang: (d && d.lang) || null,
    kids: kids.map((k) => ({ name: String(k.name || '?'), avatar: String(k.avatar || ''), points: num(k.total), tokens: num(k.tokens) })),
  };
}

// Top reader, then the others ranked as on the leaderboard (points, then tokens, then name).
// Parameter = a player's name: that player only, with the tokens they can spend as the big value.
async function widgetModel(param) {
  const s = readWidget();
  const T = WIDGET_TEXT[splashLang(s)];
  const kids = (s && Array.isArray(s.kids) ? s.kids : []).slice()
    .sort((a, b) => b.points - a.points || b.tokens - a.tokens || String(a.name).localeCompare(String(b.name)));
  if (!kids.length) return { empty: T.empty };
  const who = (k) => (k.avatar ? k.avatar + ' ' : '') + k.name;
  const q = String(param || '').trim().toLowerCase();
  const i = q ? kids.findIndex((k) => String(k.name).trim().toLowerCase() === q) : -1;
  if (i >= 0) {
    const k = kids[i];
    return {
      kicker: who(k), value: k.tokens, caption: T.toSpend(k.tokens),
      footer: T.place(k.points, i + 1, kids.length), at: s.at,
      accessory: { glyph: '🪙', inline: '🪙 ' + k.tokens + ' · ' + k.name },
    };
  }
  const lead = kids[0];
  return {
    kicker: T.top,
    title: who(lead),
    caption: T.caption(lead.points, lead.tokens),
    rows: kids.slice(1).map((k, n) => ({ icon: k.avatar, text: (n + 2) + '. ' + k.name, sub: '⭐ ' + k.points + ' · 🪙 ' + k.tokens })),
    footer: T.players(kids.length),
    at: s.at,
    accessory: { glyph: '⭐', inline: T.leads(lead.name, lead.points), value: lead.points },
  };
}

// ───────── Widget ─────────
// Shared widget frame (github.com/gadominas/app-blueprints › blueprints/widgets.md).
// An app changes only WIDGET and widgetModel(); everything below WB is the same in every app.
const WIDGET = {
  name: ['Reading ', 'Stars'],            // as on the launch screen: plain part, highlighted part, optional rest
  accent: '#FACC15',                      // the logo's focal colour (the launch screen's --sp-accent)
  icon: REPO_RAW + 'docs/icon-1024.png',  // the app icon, cached on the phone after the first fetch
  get words() { return WIDGET_TEXT[splashLang(readWidget())]; },   // in the app's language (the game's, saved with the snapshot)
};
// Brand colours, the same in every app and in light and dark mode: the logo tile's ground and lines.
const WB = { ground: '#0E1116', raised: '#171B22', ink: '#F6F7F9', ink2: '#C9CED6', muted: '#9AA3AE', good: '#2DD4BF', warn: '#FBBF24' };
const wfm = FileManager.local();
const wPath = (n) => wfm.joinPath(wfm.documentsDirectory(), APP_ID + '-' + n);

// What the widget shows is saved by the app and only read by the widget: fast, offline, no sign-in.
function saveWidget(data) {
  try { wfm.writeString(wPath('widget.json'), JSON.stringify(Object.assign({}, data, { at: Date.now() }))); }
  catch (e) { console.log('Widget: not saved: ' + e); }
}
function readWidget() {
  try { const p = wPath('widget.json'); return wfm.fileExists(p) ? JSON.parse(wfm.readString(p)) : null; }
  catch (e) { return null; }
}

// Tones: ink, soft, muted, accent, good, warn, or a hex colour.
const wColor = (c, a = 1) => {
  const k = c === 'soft' ? 'ink2' : c;
  return new Color(k === 'accent' ? WIDGET.accent : (WB[k] || k), a);
};
// Rounded system fonts, falling back to the plain system font on older Scriptable versions.
function wFont(weight, size) {
  const name = { bold: 'boldRoundedSystemFont', semi: 'semiboldRoundedSystemFont', med: 'mediumRoundedSystemFont' }[weight] || 'regularRoundedSystemFont';
  if (typeof Font[name] === 'function') return Font[name](size);
  return weight === 'bold' ? Font.boldSystemFont(size) : weight === 'semi' ? Font.semiboldSystemFont(size) : weight === 'med' ? Font.mediumSystemFont(size) : Font.systemFont(size);
}
function wText(stack, s, size, weight, tone, lines = 1) {
  const t = stack.addText(String(s));
  t.font = wFont(weight, size);
  t.textColor = wColor(tone);
  t.lineLimit = lines;
  if (lines === 1) t.minimumScaleFactor = 0.75;
  return t;
}
function wWhen(ts) {
  const d = new Date(ts), now = new Date(), f = new DateFormatter();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ago = Math.round((day(now) - day(d)) / 864e5);
  if (ago === 1) return WIDGET.words.yesterday;
  f.dateFormat = ago === 0 ? 'HH:mm' : 'd MMM';
  return f.string(d);
}

// The app's logo tile, from the repository's icon, cached per app version; a monogram until then.
async function widgetIcon() {
  const p = wPath('widget-icon-' + VERSION + '.png');
  try {
    if (wfm.fileExists(p)) return wfm.readImage(p);
    const r = new Request(WIDGET.icon);
    r.timeoutInterval = 8;
    const dc = new DrawContext();
    dc.size = new Size(96, 96); dc.opaque = false; dc.respectScreenScale = false;
    dc.drawImageInRect(await r.loadImage(), new Rect(0, 0, 96, 96));
    const img = dc.getImage();
    const dir = wfm.documentsDirectory();
    wfm.listContents(dir).filter((f) => f.startsWith(APP_ID + '-widget-icon-')).forEach((f) => { try { wfm.remove(wfm.joinPath(dir, f)); } catch (e) {} });
    wfm.writeImage(p, img);
    return img;
  } catch (e) {
    return widgetMonogram();
  }
}
function widgetMonogram() {
  const dc = new DrawContext();
  dc.size = new Size(96, 96); dc.opaque = false; dc.respectScreenScale = false;
  dc.setFillColor(wColor('raised')); dc.fillRect(new Rect(0, 0, 96, 96));
  dc.setFont(wFont('bold', 54)); dc.setTextColor(wColor('accent')); dc.setTextAlignedCenter();
  dc.drawTextInRect(WIDGET.name.join('').charAt(0), new Rect(0, 14, 96, 70));
  return dc.getImage();
}

// Rows that fit: a line counts 1, a sub line 0.8; medium holds 5.5 (3 rows at most), large 12 (6 at most).
function wFit(rows, budget, max) {
  const out = [];
  let used = 0;
  for (const r of rows || []) {
    const n = (r.lines || 1) + (r.sub ? 0.8 : 0);
    if (out.length >= max || used + n > budget + 1e-9) break;   // 1e-9: 3 + 5 × 1.8 must still fit in 12
    used += n;
    out.push(r);
  }
  return out;
}
function wRows(stack, rows) {
  rows.forEach((r, i) => {
    if (i) stack.addSpacer(5);
    const row = stack.addStack();
    row.topAlignContent(); row.spacing = 6;
    if (r.url) row.url = r.url;
    if (r.icon) { const ic = row.addStack(); ic.size = new Size(15, 0); wText(ic, r.icon, 11.5, 'reg', 'ink'); }
    const tx = row.addStack();
    tx.layoutVertically();
    wText(tx, r.text, 12.5, r.lines ? 'reg' : 'med', r.tone || (r.lines ? 'soft' : 'ink'), r.lines || 1);
    if (r.sub) wText(tx, r.sub, 11, 'reg', 'muted');
  });
}

async function renderWidget(m) {
  const fam = config.widgetFamily || 'medium';
  const w = new ListWidget();
  w.url = m.url || URLScheme.forRunningScript();
  w.refreshAfterDate = new Date(Date.now() + cfg('widgetRefreshMin') * 60e3);
  if (fam.startsWith('accessory')) return renderAccessory(w, fam, m);
  const small = fam === 'small', medium = fam === 'medium', large = !small && !medium;
  const g = new LinearGradient();
  g.colors = [wColor('raised'), wColor('ground')]; g.locations = [0, 1];
  g.startPoint = new Point(0, 0); g.endPoint = new Point(0, 1);
  w.backgroundGradient = g;
  w.setPadding(14, 14, 14, 14);

  // 1. Header: logo tile, name (highlighted part in the accent), badge
  const hd = w.addStack();
  hd.centerAlignContent();
  const icon = hd.addImage(await widgetIcon());
  const is = small ? 18 : 20;
  icon.imageSize = new Size(is, is); icon.cornerRadius = is * 0.225;
  hd.addSpacer(6);
  WIDGET.name.forEach((part, i) => {
    if (!part) return;
    const t = hd.addText(part);
    t.font = wFont('bold', small ? 13 : 14); t.textColor = wColor(i === 1 ? 'accent' : 'ink'); t.lineLimit = 1;
  });
  hd.addSpacer();
  if (m.badge && !small) {
    const b = hd.addStack();
    b.setPadding(2, 7, 2, 7); b.cornerRadius = 8;
    b.backgroundColor = wColor(m.badgeTone || 'accent', 0.16);
    wText(b, m.badge, 11.5, 'semi', m.badgeTone || 'accent');
  }
  w.addSpacer(small ? 8 : 10);

  // Empty state: what to do next, never an error
  if (m.empty) {
    wText(w, m.empty, 13, 'semi', 'soft', 3);
    w.addSpacer();
    wText(w, m.footer || WIDGET.words.open, 11, 'reg', 'muted');
    Script.setWidget(w);
    return;
  }

  // 2. Hero: kicker, then a big value with its caption, or a title with its caption
  const body = w.addStack();
  body.topAlignContent();
  const left = body.addStack();
  left.layoutVertically();
  if (medium) left.size = new Size(136, 0);
  if (m.kicker) wText(left, m.kicker, 11, 'semi', m.kickerTone || 'accent');
  if (m.value != null && m.value !== '') {
    wText(left, m.value, small ? 40 : 42, 'bold', m.valueTone || 'ink');
    if (m.caption) wText(left, m.caption, 13, 'semi', 'ink');
  } else {
    if (m.title) wText(left, m.title, small ? 16 : 18, 'bold', 'ink', 2);
    if (m.caption) { left.addSpacer(2); wText(left, m.caption, 12, 'reg', 'soft', 2); }
  }

  // 3. Rows: beside the hero on medium, under it on large, none on small
  const rows = m.rows || [];
  if (medium && wFit(rows, 5.5, 3).length) {
    body.addSpacer(12);
    const right = body.addStack();
    right.layoutVertically();
    wRows(right, wFit(rows, 5.5, 3));
  }
  body.addSpacer();
  if (large && wFit(rows, 12, 6).length) { w.addSpacer(14); wRows(w, wFit(rows, 12, 6)); }

  // 4. Footer: one muted line; amber when the data is stale. Small shows the badge here if there's no footer.
  w.addSpacer();
  const ft = small ? (m.footer || m.badge) : m.footer;
  if (ft) wText(w, (m.stale ? '⟳ ' : '') + ft, 11, 'reg', m.stale ? 'warn' : 'muted');
  Script.setWidget(w);
}

// Lock Screen: iOS tints these, so text only, no colours or logo.
function renderAccessory(w, fam, m) {
  const name = WIDGET.name.join('');
  const a = m.accessory || {};
  const hasValue = m.value != null && m.value !== '';
  const hero = m.empty || (hasValue ? (m.value + ' ' + (m.caption || '')).trim() : (m.title || ''));
  if (fam === 'accessoryInline') {
    w.addText(a.inline || (hero ? name + ': ' + hero : name));
  } else if (fam === 'accessoryCircular') {
    w.addAccessoryWidgetBackground = true;
    const c = w.addStack();
    c.layoutVertically(); c.centerAlignContent();
    const gl = c.addText(a.glyph || name.charAt(0)); gl.font = Font.systemFont(11); gl.centerAlignText();
    const v = c.addText(String(a.value != null ? a.value : hasValue ? m.value : '–'));
    v.font = wFont('bold', 20); v.minimumScaleFactor = 0.5; v.centerAlignText();
  } else {
    const lines = [
      [[name, m.badge || m.kicker].filter(Boolean).join(' · '), 'semi', 12],
      [hero, 'bold', 15],
      [m.empty ? '' : hasValue ? (m.footer || '') : (m.caption || m.footer || ''), 'reg', 12],
    ];
    lines.forEach(([s, wt, size]) => { if (!s) return; const t = w.addText(s); t.font = wFont(wt, size); t.lineLimit = 1; t.minimumScaleFactor = 0.7; });
  }
  Script.setWidget(w);
}

// Widget runs come here and only here: no WebView, Alert or QuickLook may be built or presented.
async function runWidget() {
  const name = WIDGET.name.join('');
  let m = null;
  try { m = await widgetModel(args.widgetParameter || '', config.widgetFamily || 'medium'); }
  catch (e) { console.error('Widget model: ' + e); }
  if (!m) m = { empty: WIDGET.words.nothing };
  try {
    if (m.at && !m.empty && Date.now() - m.at > cfg('widgetStaleMin') * 60e3) {
      m.stale = true;
      m.footer = WIDGET.words.updated + ' ' + wWhen(m.at);
    }
    await renderWidget(m);
  } catch (e) {
    console.error('Widget render: ' + e);
    const w = new ListWidget();
    w.backgroundColor = wColor('ground');
    w.url = URLScheme.forRunningScript();
    wText(w, name, 14, 'bold', 'ink');
    w.addSpacer(4);
    wText(w, WIDGET.words.open, 12, 'reg', 'muted');
    Script.setWidget(w);
  }
}
// ───────── end of Widget ─────────

// ───────────────────────── Boot ─────────────────────────

// Launch screen (app-blueprints · launch-screen 1.0.0): the tagline follows the game's language
const SPLASH_TAG = { en: "Read. Match. Shine.", lt: "Skaityk. Rask. Spindėk.", es: "Lee. Elige. Brilla." };
function splashLang(data) {
  let l = data && data.lang;
  if (!SPLASH_TAG[l]) { try { l = String(Device.language() || "en").slice(0, 2).toLowerCase(); } catch (e) { l = "en"; } }
  return SPLASH_TAG[l] ? l : "en";
}

function buildHTML(data) {
  const spLang = splashLang(data), spTag = SPLASH_TAG[spLang];
  const initJSON = JSON.stringify(data || null).replace(/</g, "\\u003c");
  const look = lookState(), sky = PALETTES[look.shown].sky;
  return `<!doctype html>
<html data-theme="${look.shown}" data-font="${look.font}" style="--ts:${look.textSize}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<style>${CSS}</style>
</head><body class="d-${look.density}" style="background-color:${sky}">
<div class="splash" id="splash" role="img" lang="${spLang}" aria-label="Reading Stars. ${spTag}">
  <div class="spIcon"><svg viewBox="0 0 240 240" aria-hidden="true">
    <path class="spDraw" pathLength="100" d="M120.0 52.0 L138.8 100.1 L190.4 103.1 L150.4 135.9 L163.5 185.9 L120.0 158.0 L76.5 185.9 L89.6 135.9 L49.6 103.1 L101.2 100.1 Z"></path>
    <path class="spPop" d="M120.0 52.0 L138.8 100.1 L190.4 103.1 L150.4 135.9 L163.5 185.9 L120.0 158.0 L76.5 185.9 L89.6 135.9 L49.6 103.1 L101.2 100.1 Z"></path>
    <path class="spDetail" d="M186 40 Q186 58 204 58 Q186 58 186 76 Q186 58 168 58 Q186 58 186 40 Z"></path>
    <path class="spSweep" d="M84 210 H156"></path>
  </svg></div>
  <div class="spWord">Reading <span>Stars</span></div>
  <div class="spTag">${spTag}</div>
</div>
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
// Launch screen (app-blueprints · launch-screen 1.0.0): first, self-contained
(function () {
  var sp = document.getElementById("splash");
  if (!sp) return;
  function gone() { sp.classList.add("gone"); sp.setAttribute("aria-hidden", "true"); }
  sp.addEventListener("click", gone);   // tap to skip
  setTimeout(gone, 2900);               // out of the page once the CSS fade is done
})();
window.__INITIAL__ = ${initJSON};
window.__APP_VERSION = ${JSON.stringify(VERSION)};
(${webApp.toString()})();
</script>
</body></html>`;
}

const SAVE_SCHEME = "readingstars://save?d=";

// The app: everything that builds and presents the WebView. Only the app branch below runs it, never a widget.
async function main() {
  saveWidget(widgetSnapshot(initialData));   // the widget shows the players as loaded, before the first round
  const webView = new WebView();

  let pendingUpdate = null;
  const js = (code) => webView.evaluateJavaScript(code + "; 'ok'").catch(() => {});
  const offerUpdate = () => {
    if (pendingUpdate) js(`window.__showUpdate && window.__showUpdate(${JSON.stringify(pendingUpdate)})`);
  };

  // Actions sent by the page with send(action, params): readingstars://<action>?p=<json>
  async function handleAction(head, p) {
    const answer = (ok, msg) => js(`window.__done(${JSON.stringify(p.req || "")}, ${ok}, ${JSON.stringify(msg)})`);
    // Settings (app-blueprints · settings): each change is applied and saved at once; the answer is the fresh state.
    if (head === "settings-get") return answer(true, settingsState());
    if (head === "set") {
      if (!setSetting(p.k, p.v)) return answer(false, "That setting can't be changed here.");
      saveSettings();
      return answer(true, settingsState());
    }
    if (head === "cfg") {
      if (p.k === "*") settings.cfg = {}; else setCfg(p.k, p.reset ? null : p.v);
      saveSettings();
      return answer(true, settingsState());
    }
    if (head === "update-check") {   // Settings › Check for updates now: clears "Later" and checks at once
      clearUpdateSnooze();
      const was = settings.checkUpdates; settings.checkUpdates = true;
      const u = await checkForUpdate(); settings.checkUpdates = was;
      if (u) pendingUpdate = u;
      return answer(true, { available: !!u, info: u, version: u ? u.latest : VERSION });
    }
    if (head === "openurl") {   // Built with: only the blueprints repository opens from here
      const v = String(p.v || "");
      if (v === BLUEPRINTS_REPO || v.startsWith(BLUEPRINTS_REPO + "/")) await Safari.openInApp(v, false);
      return;
    }
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

  await webView.loadHTML(buildHTML(Object.assign({}, initialData || {}, { settings: gameSettings(), look: lookState(), cfg: cfgValues() })));
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
}

// ───────────────────────── Start ─────────────────────────
// Settings load before every branch; loadSettings reads data.json first for its one-time 1.2 migration.
const initialData = await loadData();
await loadSettings(initialData);
if (config.runsInWidget || config.runsInAccessoryWidget) {
  await runWidget();             // never builds or presents a WebView, Alert or QuickLook
} else {
  widgetIcon();                  // caches the logo tile for the widget, in the background
  await main();
}
Script.complete();
