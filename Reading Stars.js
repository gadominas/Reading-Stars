// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: book-open;

/*
 * READING STARS ⭐ — a picture-and-word reading game for kids (Scriptable, iOS)
 *
 * - Three pictures on top, one big word below split into syllables (na-mas, kar-vė).
 * - Words from books: photograph a page, AI reads it and adds picture words (parent zone).
 * - Learning: smart word order (spaced repetition, no AI) and an AI coach that picks practice words.
 * - Read aloud: each kid can hear the word when it's shown or after answering; iPhone voices or ✦ OpenAI voices
 *   (Settings › Listening: voice, speech model, speed, pitch, how it should sound).
 * - Word length per level (Settings › Rounds): shortest and longest word in syllables.
 * - AI settings (Claude or OpenAI): keys in the iOS Keychain only, models, token usage.
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
 *
 * - Safe start-up (app-blueprints recipe safe-startup 1.0.0): an empty window first, then the page, then the data.
 *   Only settings.json is read before the window; every iCloud read has a 10 s limit, and data.json is never saved
 *   over unless it was read. Settings › Updates › Start-up log shows what happened the last times the app opened.
 */

// ───────────────────────── Settings & version ─────────────────────────


// This build's version. When releasing, bump it and add a matching entry to releases.json.
const VERSION = '1.11.0';
const APP_ID = 'reading-stars';   // unique per app, never changes
const REPO_RAW = 'https://raw.githubusercontent.com/gadominas/Reading-Stars/main/';
const SCRIPT_FILE = 'Reading Stars.js';   // the script's file name in the repository
const UPDATE_SNOOZE_MS = 2 * 24 * 3600 * 1000;   // "Later" = 2 days
const KC_UPDATE_SNOOZE = 'reading-stars-update-snooze';   // Keychain key, unique per app

// ── Anonymous usage counts (opt-in), sent to PostHog (app-blueprints · usage-analytics) ──
// A kids' app: only a parent can say yes, in the PIN-protected parent zone. Nothing is sent until KEY is filled in
// AND the parent agrees. Each event carries a random install ID (made on this iPhone), the app version and counts:
// never names, avatars, tokens, money or words. Events are anonymous (no person profiles).
// The key is PostHog's project key, made to sit in public apps: it can only add events.
// HOST must be the region the project lives in: PostHog's other region answers "accepted" and then drops the events.
const USAGE = { HOST: 'https://us.i.posthog.com', KEY: 'phc_yAi2PxJCRioWEKLF3uockdCf3QvyQdNABivwqpE4NCWR' };   // the shared project
const KC_INSTALL = 'reading-stars-install-id';

// ───────── Blueprints ─────────
// Shared blueprints this app was built with (github.com/gadominas/app-blueprints). One line per blueprint, in this exact shape:
// inventory tools read it without running the script, and Settings › Built with shows it.
const BLUEPRINTS_REPO = 'https://github.com/gadominas/app-blueprints';
const BLUEPRINTS = [
  { id: 'in-app-updates', name: 'In-app updates', version: '1.0.0', since: '1.1.0' },
  { id: 'settings', name: 'Settings', version: '1.1.0', since: '1.6.0' },
  { id: 'ai-configuration', name: 'AI configuration', version: '1.0.0', since: '1.8.0' },
  { id: 'launch-screen', name: 'Launch screen', version: '1.0.0', since: '1.3.0' },
  { id: 'widgets', name: 'Widgets', version: '1.0.0', since: '1.4.0' },
  { id: 'read-aloud', name: 'Read aloud', version: '1.0.1', since: '1.9.0' },
  { id: 'usage-analytics', name: 'Anonymous usage analytics', version: '1.1.0', since: '1.7.0' },
];

// AI providers. Keychain names are unique per app; models are defaults until the user picks one.
const AI = {
  anthropic: { key: "READINGSTARS_ANTHROPIC_KEY", model: "claude-haiku-5-5" },
  openai:    { key: "READINGSTARS_OPENAI_KEY",    model: "gpt-4o-mini" },
};
const PROVIDERS = { anthropic: "Claude", openai: "OpenAI" };

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
const P = (n) => fm.joinPath(folder, n + ".json");   // ReadingStars/<name>.json
const dataPath = P("data");
const backupPath = P("data.backup");

// A short start-up log on the phone (local, not iCloud): Settings › Updates › Start-up log, and on screen if opening stalls.
// Only counts, timings and file names go in it: never money, budgets, payouts or the PIN.
const LOG_PATH = FileManager.local().joinPath(FileManager.local().documentsDirectory(), APP_ID + "-startup.log");
function startLog(msg) {
  try {
    const lfm = FileManager.local(), line = new Date().toISOString().slice(11, 19) + "  " + msg;
    const old = lfm.fileExists(LOG_PATH) ? lfm.readString(LOG_PATH).split("\n").slice(-60) : [];
    lfm.writeString(LOG_PATH, old.concat(line).join("\n"));
  } catch (e) {}
}

// Reads with a time limit (app-blueprints · safe-startup).
const loadIssues = [];    // files that didn't arrive (iCloud too slow, or unreadable): never written this run
const loadRepaired = [];  // files that arrived damaged: kept aside as <name>.broken-<time>.json, then started fresh
async function load(n, def, waitMs = 10000) {
  const p = P(n);
  if (!fm.fileExists(p)) return def;
  let txt;
  try {
    if (fm.isFileStoredIniCloud(p) && !fm.isFileDownloaded(p)) {
      // iCloud can take a long time (or forever, offline): never let start-up hang on it
      await Promise.race([fm.downloadFileFromiCloud(p), new Promise(r => Timer.schedule(waitMs, false, r))]);
      if (!fm.isFileDownloaded(p)) { loadIssues.push(n); startLog(`iCloud didn't deliver ${n}.json in ${waitMs / 1000} s`); return def; }
    }
    txt = fm.readString(p);
  } catch (e) { loadIssues.push(n); startLog(`Couldn't read ${n}.json: ${e}`); return def; }   // not read: never saved over
  try { return JSON.parse(txt); }
  catch (e) { keepBroken(fm, p, n, txt); return def; }
}
// It arrived but is damaged: keep a copy next to it, then start this file fresh so saving can carry on (1.1.0).
// Without this, one damaged file stopped the app from ever saving again. The widget reads the data on every refresh
// and never saves, so a copy that's already there is not made again. The parse error isn't logged: it can quote the file.
function keepBroken(fm, p, n, txt) {
  try {
    const base = p.replace(/\.json$/, ""), dir = p.slice(0, p.lastIndexOf("/")), pre = base.slice(dir.length + 1) + ".broken-";
    let kept = false;
    try { kept = fm.listContents(dir).some(f => f.startsWith(pre) && fm.readString(fm.joinPath(dir, f)) === txt); } catch (_) {}
    if (!kept) fm.writeString(base + ".broken-" + Date.now() + ".json", txt);
    if (!loadRepaired.includes(n)) loadRepaired.push(n);
    startLog(`${n}.json was damaged (not valid JSON); ${kept ? "a copy was already kept" : "kept a copy"} and started it fresh`);
  } catch (e) { loadIssues.push(n); startLog(`${n}.json was damaged and couldn't be copied aside`); }   // no copy, no overwrite
}

// Data is read in loadData(): the app shows its first screen before reading it, because iCloud can be slow.
// data.json holds players, tokens, budgets, the PIN hash and the language; null until read (and for a new family).
let gameData = null;
let dataLoaded = false;   // data.json is only written once it was read, so a slow start can never save an empty game over it
async function loadData() {
  if (!usageRead) loadUsage();   // AI token counts: a local file, so it never waits on iCloud
  loadIssues.length = 0;   // loadRepaired is kept, so a damaged settings.json (read before this) still gets its toast
  gameData = await load("data", null);
  // On the phone but missing, unreadable or damaged (not just late from iCloud): the backup takes its place, as before.
  // A damaged data.json is already copied aside (data.broken-<time>.json). If the backup is damaged too, the game
  // starts fresh and saves again; the damaged data.json stays in its copy.
  const late = loadIssues.includes("data") && fm.fileExists(dataPath) && !fm.isFileDownloaded(dataPath);
  if (!gameData && !late && fm.fileExists(backupPath)) {
    const b = await load("data.backup", null);
    if (b && typeof b === "object") {
      gameData = b;
      if (loadIssues.includes("data")) { loadIssues.splice(loadIssues.indexOf("data"), 1); startLog("data.json couldn't be read: using data.backup.json"); }
      if (loadRepaired.includes("data")) { loadRepaired.splice(loadRepaired.indexOf("data"), 1); startLog("data.json was damaged: using data.backup.json"); }
    }
  }
  if (gameData && typeof gameData !== "object") gameData = null;
  // First run after 1.1: letter style, currency and sounds move over from data.json into settings.json, once.
  if (settingsFresh && settingsOk && !loadIssues.includes("data")) {
    const old = (gameData && gameData.settings) || {};
    for (const k of ["wordCase", "currency", "sound"]) if (old[k] !== undefined) setSetting(k, old[k]);
    settingsFresh = false;
    saveSettings();
  }
  dataLoaded = loadIssues.length === 0;   // anything missing: show what we have, save nothing over it
}

let lastSaved = null;
function saveData(json) {
  if (!dataLoaded) return;   // never save data that was never read
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
const settingsPath = P("settings");
let settingsOk = false;      // settings that were never read are never saved over
let settingsFresh = false;   // no settings.json yet: loadData() moves the 1.1 choices over from data.json
// Defaults first, saved choices on top. The bright Ink look is the default (not Auto): it is the game's own look.
const settings = {
  theme: "ink", density: "comfortable", font: "sans", textSize: 1,
  wordCase: "cap", sound: true, currency: "EUR",
  checkUpdates: true,   // offer new versions from GitHub (asks again 2 days after "Later")
  shareUsage: false, usageAsked: false,  // anonymous usage counts: off until a parent agrees
  smart: true, bookMode: "mix",   // Learning: smart word order; book words Mixed in / First / Off
  speechEngine: "device", ttsModel: "gpt-4o-mini-tts", ttsVoice: "coral", ttsInstructions: "",   // read aloud: iPhone voices or OpenAI
  voiceURIs: {}, voiceRate: 0.85, voicePitch: 1, voiceGender: "all",   // the iPhone voice per game language; kids hear words a little slower
  aiProvider: "anthropic",   // the provider marked "In use" (ai-configuration)
  ai: true,                  // background AI jobs on/off ("What AI does"): the AI coach
  // model:  { anthropic: "…", openai: "…" }   set when the user picks a model
  // models: { anthropic: { at, list: [{ id, name }] }, openai: … }   cached model lists
  cfg: {},
};
const saveSettings = () => { if (!settingsOk) return false; try { fm.writeString(settingsPath, JSON.stringify(settings)); return true; } catch (e) { return false; } };
let usageQueue = [], usageTimer = null;
const usageAvailable = () => !!USAGE.KEY;
const usageOn = () => usageAvailable() && !!settings.shareUsage;
function installId() {
  if (Keychain.contains(KC_INSTALL)) return Keychain.get(KC_INSTALL);
  const id = UUID.string().toLowerCase();
  Keychain.set(KC_INSTALL, id);
  return id;
}
function track(event, props = {}) {
  if (!usageOn()) return;
  try {
    usageQueue.push({ event, timestamp: new Date().toISOString(),
      properties: Object.assign({ distinct_id: installId(), $process_person_profile: false, app: APP_ID, app_version: VERSION, $lib: APP_ID }, props) });
    if (usageQueue.length >= 25) flushUsage();
    else if (!usageTimer) usageTimer = Timer.schedule(3000, false, () => { usageTimer = null; flushUsage(); });
  } catch (e) {}
}
let usageLast = null;   // { at, events, ok, status, host, error }: shown in Settings › Privacy
async function postUsage(host, batch) {
  const r = new Request(host + '/batch/');
  r.method = 'POST'; r.timeoutInterval = 10; r.headers = { 'Content-Type': 'application/json' };
  r.body = JSON.stringify({ api_key: USAGE.KEY, batch });
  let body = '';
  try { body = await r.loadString(); } catch (e) { return { ok: false, status: 0, host, error: String(e.message || e) }; }
  const status = (r.response && r.response.statusCode) || 0;
  return { ok: status >= 200 && status < 300, status, host, error: status >= 200 && status < 300 ? '' : String(body || '').slice(0, 200) };
}
// Sends what's queued in one request. Never slows the app; if it fails, those counts are gone (and the log says why).
async function flushUsage() {
  if (!usageQueue.length) return usageLast;
  if (!usageOn()) { usageQueue = []; return usageLast; }
  const batch = usageQueue.splice(0, usageQueue.length);
  const res = await postUsage(USAGE.HOST, batch);
  usageLast = Object.assign({ at: Date.now(), events: batch.length }, res);
  try { startLog(`usage: ${batch.length} event${batch.length === 1 ? '' : 's'} → ${res.ok ? 'sent to ' + res.host.replace('https://', '') : 'not sent: ' + (res.status ? 'HTTP ' + res.status + ' ' : '') + res.error}`); } catch (e) {}
  return usageLast;
}
function usageStatus() {
  const u = usageLast;
  if (!u) return '';
  const t = new Date(u.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return u.ok ? `Last sent ${t}: ${u.events} event${u.events === 1 ? '' : 's'}, accepted (${u.host.replace('https://', '')})`
              : `Last try ${t} failed: ${u.status ? 'HTTP ' + u.status + ' ' : ''}${u.error}`;
}
function setUsage(on) {
  settings.shareUsage = !!on; settings.usageAsked = true; saveSettings();
  if (on) track('usage_opt_in');
  else { usageQueue = []; if (Keychain.contains(KC_INSTALL)) Keychain.remove(KC_INSTALL); }   // a fresh ID if switched on again
}
const CURRENCY_CODES = ["EUR", "USD", "GBP"];
// Every key the page may change, with its check (all apply at once on the page).
const SET_KEYS = {
  theme: (v) => v === "auto" || !!PALETTES[v], density: (v) => ["comfortable", "compact", "tiny"].includes(v),
  font: (v) => ["sans", "serif"].includes(v), textSize: (v) => [0.92, 1, 1.12, 1.25].includes(+v),
  wordCase: (v) => ["cap", "upper", "lower"].includes(v), currency: (v) => CURRENCY_CODES.includes(v),
  sound: "bool", fun: "bool", tips: "bool", checkUpdates: "bool", shareUsage: "bool",
  smart: "bool", bookMode: (v) => ["mix", "first", "off"].includes(v), ai: "bool",
  speechEngine: (v) => ["device", "ai"].includes(v), voiceGender: (v) => ["all", "f", "m"].includes(v),
  voiceRate: (v) => [0.85, 1, 1.15, 1.3].includes(+v), voicePitch: (v) => [0.85, 1, 1.15].includes(+v),
  ttsModel: (v) => typeof v === "string" && /^[a-z0-9][a-z0-9.\-]{1,60}$/i.test(v), ttsVoice: (v) => typeof v === "string" && /^[a-z]{2,20}$/.test(v),
  ttsInstructions: (v) => typeof v === "string" && v.length <= 500,
};
function setSetting(k, v) {
  const s = SET_KEYS[k];
  if (!s) return false;
  if (s === "bool") v = v === true || v === "true";
  else if (!s(v)) return false;
  if (k === "textSize" || k === "voiceRate" || k === "voicePitch") v = +v;
  settings[k] = v;
  return true;
}
// The only file read before every branch (app, widget), with the same iCloud time limit as the data.
async function loadSettings() {
  const saved = await load("settings", null);
  if (saved && typeof saved === "object") Object.assign(settings, saved);
  else settingsFresh = true;   // first run of 1.2 or later: loadData() moves the old choices over from data.json and saves
  const d = { theme: "ink", density: "comfortable", font: "sans", textSize: 1, wordCase: "cap", currency: "EUR" };
  for (const k of Object.keys(d)) if (!setSetting(k, settings[k])) settings[k] = d[k];
  settings.sound = settings.sound !== false;
  settings.fun = settings.fun !== false;   // funny animations after a right answer (1.10.0)
  settings.tips = settings.tips !== false;   // short tips and cheers while playing (1.11.0)
  settings.smart = settings.smart !== false;
  settings.ai = settings.ai !== false;
  if (!["mix", "first", "off"].includes(settings.bookMode)) settings.bookMode = "mix";
  if (!PROVIDERS[settings.aiProvider]) settings.aiProvider = "anthropic";
  const rd = { speechEngine: "device", voiceGender: "all", voiceRate: 0.85, voicePitch: 1, ttsModel: "gpt-4o-mini-tts", ttsVoice: "coral", ttsInstructions: "" };
  for (const k of Object.keys(rd)) if (!setSetting(k, settings[k])) settings[k] = rd[k];
  settings.voiceURIs = settings.voiceURIs && typeof settings.voiceURIs === "object" ? settings.voiceURIs : {};
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
    { k: "beginnerMinSyl", def: 1, min: 1, max: 6, step: 1,
      en: { label: "Shortest word, Beginner", unit: "syllables" }, lt: { label: "Trumpiausias žodis, pradedantiesiems", unit: "skiem." }, es: { label: "Palabra más corta, Principiante", unit: "sílabas" } },
    { k: "beginnerMaxSyl", def: 2, min: 1, max: 6, step: 1,
      en: { label: "Longest word, Beginner", unit: "syllables" }, lt: { label: "Ilgiausias žodis, pradedantiesiems", unit: "skiem." }, es: { label: "Palabra más larga, Principiante", unit: "sílabas" } },
    { k: "expertMinSyl", def: 3, min: 1, max: 6, step: 1,
      en: { label: "Shortest word, Expert", unit: "syllables" }, lt: { label: "Trumpiausias žodis, ekspertams", unit: "skiem." }, es: { label: "Palabra más corta, Experto", unit: "sílabas" } },
    { k: "expertMaxSyl", def: 6, min: 1, max: 6, step: 1,
      en: { label: "Longest word, Expert", unit: "syllables" }, lt: { label: "Ilgiausias žodis, ekspertams", unit: "skiem." }, es: { label: "Palabra más larga, Experto", unit: "sílabas" } },
    { k: "stickerEvery", def: 5, min: 2, max: 20, step: 1,
      en: { label: "Words for a sticker", help: "Right on the first try", unit: "words" },
      lt: { label: "Žodžių lipdukui gauti", help: "Atspėtų iš pirmo karto", unit: "žodž." },
      es: { label: "Palabras para una pegatina", help: "Acertadas a la primera", unit: "palabras" } },
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
const gameSettings = () => ({ wordCase: settings.wordCase, sound: settings.sound, fun: settings.fun, tips: settings.tips, currency: settings.currency, smart: settings.smart, bookMode: settings.bookMode,
  speechEngine: settings.speechEngine, voiceURIs: settings.voiceURIs, voiceRate: settings.voiceRate, voicePitch: settings.voicePitch,
  ttsModel: settings.ttsModel, ttsVoice: settings.ttsVoice, ttsInstructions: settings.ttsInstructions });
function settingsState() {
  return {
    settings: Object.fromEntries(Object.keys(SET_KEYS).map((k) => [k, settings[k]])),
    cfg: cfgValues(),
    cfgSchema: CONFIG.map(([title, items]) => ({ title, items })),
    palettes: PALETTES, currencies: CURRENCY_CODES, version: VERSION, appName: "Reading Stars",
    usageAvailable: usageAvailable(), usageStatus: usageStatus(),
    blueprints: BLUEPRINTS, blueprintsRepo: BLUEPRINTS_REPO,
    // ai-configuration Step 6: keys only masked
    ai: aiState(),
    hasKey: !!aiKey(), aiProvider: settings.aiProvider,
    hasOpenAI: !!keyFor("openai"), ttsModels: settings.ttsModels || null, voiceURIs: settings.voiceURIs,   // read-aloud Step 1
  };
}

// ───────────────────────── AI configuration ─────────────────────────
// Follows github.com/gadominas/app-blueprints · blueprints/ai-configuration.md (reference: BlogPulse.js).
// Every AI request goes through aiCall. Keys live in the iOS Keychain only; the page sees them masked.

// Token usage lives in its own small file on this iPhone (local, never iCloud), read in loadData() (safe-startup).
const aiFm = FileManager.local();
const usagePath = aiFm.joinPath(aiFm.documentsDirectory(), APP_ID + "-usage.json");
let usage = { since: Date.now(), p: {} }, usageRead = false;
function loadUsage() {
  try { if (aiFm.fileExists(usagePath)) usage = JSON.parse(aiFm.readString(usagePath)); } catch (e) { startLog("usage.json unreadable: " + e); }
  if (!usage || typeof usage !== "object" || !usage.p) usage = { since: Date.now(), p: {} };
  usageRead = true;
}
function writeUsage() {
  if (!usageRead) return;   // never save over counts that were never read
  try { aiFm.writeString(usagePath, JSON.stringify(usage)); } catch (e) {}
}

const keyFor   = (p) => Keychain.contains(AI[p].key) ? Keychain.get(AI[p].key) : null;
const aiKey    = () => keyFor(settings.aiProvider);   // the key of the provider in use
const modelFor = (p) => (settings.model && settings.model[p]) || AI[p].model;
const maskKey  = (k) => k ? (k.length > 14 ? k.slice(0, 7) + "…" + k.slice(-4) : "…" + k.slice(-4)) : null;

async function askKey(p) {
  const cur = keyFor(p);
  const al = new Alert();
  al.title = `${PROVIDERS[p]} API key`;
  al.message = cur ? `The saved key ends in …${cur.slice(-4)}. Paste a new key to replace it.`
                   : "Paste your API key. It's stored in the iOS Keychain on this device only.";
  al.addSecureTextField(p === "openai" ? "sk-…" : "sk-ant-…", "");
  al.addAction("Save key");
  al.addCancelAction("Cancel");
  if (await al.present() !== 0) return false;
  const v = al.textFieldValue(0).trim();
  if (!v) return false;
  Keychain.set(AI[p].key, v);
  if (!aiKey()) settings.aiProvider = p;   // first key saved: use that provider
  return true;
}

function removeKey(p) {
  if (Keychain.contains(AI[p].key)) Keychain.remove(AI[p].key);
}

// The only way the app calls AI. feature: a short tag for the usage table ("books", "coach", "test").
// provider: defaults to the one in use; "Test connection" passes the card's provider.
// images: optional photos sent with the user text, as base64 strings (JPEG) or { data, type } (book pages).
async function aiCall(system, user, maxTokens = 2500, feature = "other", provider = settings.aiProvider, images = []) {
  const key = keyFor(provider);
  if (!key) throw new Error(`No ${PROVIDERS[provider]} key saved`);
  const openai = provider === "openai", model = modelFor(provider);
  const r = new Request(openai ? "https://api.openai.com/v1/chat/completions" : "https://api.anthropic.com/v1/messages");
  r.method = "POST";
  r.timeoutInterval = 90;
  const imgs = images.map((i) => typeof i === "string" ? { data: i } : i);
  const oaUser = imgs.length ? [{ type: "text", text: user }].concat(imgs.map((i) => ({ type: "image_url", image_url: { url: `data:${i.type || "image/jpeg"};base64,${i.data}` } }))) : user;
  const anUser = imgs.length ? imgs.map((i) => ({ type: "image", source: { type: "base64", media_type: i.type || "image/jpeg", data: i.data } })).concat([{ type: "text", text: user }]) : user;
  if (openai) {
    r.headers = { "Authorization": "Bearer " + key, "Content-Type": "application/json" };
    r.body = JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: oaUser }] });
  } else {
    r.headers = { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" };
    r.body = JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: anUser }] });
  }
  const j = await r.loadJSON();
  if (j.error) throw new Error(j.error.message || "AI request failed");
  const u = j.usage || {};
  recordUsage(provider, model, feature,
    openai ? (u.prompt_tokens || 0) : (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0),
    openai ? (u.completion_tokens || 0) : (u.output_tokens || 0));
  return openai ? ((j.choices && j.choices[0] && j.choices[0].message.content) || "")
                : (j.content || []).map((c) => c.text || "").join("");
}

// For prompts that ask for JSON: tolerate code fences and stray text around it.
function parseJSON(txt) {
  const s = String(txt).replace(/```json|```/g, "").trim();
  const a = s.search(/[\[{]/), b = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  return JSON.parse(s.slice(a, b + 1));
}

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function recordUsage(provider, model, feature, tin, tout, chars = 0) {   // chars: text sent for speech (read-aloud)
  const P = usage.p[provider] = usage.p[provider] || { calls: 0, in: 0, out: 0, models: {}, features: {}, days: {} };
  const b = (o, k) => o[k] = o[k] || { calls: 0, in: 0, out: 0 };
  for (const x of [P, b(P.models, model), b(P.features, feature), b(P.days, dayKey())]) {
    x.calls++; x.in += tin; x.out += tout; if (chars) x.chars = (x.chars || 0) + chars;
  }
  const days = Object.keys(P.days).sort();
  while (days.length > 400) delete P.days[days.shift()];   // keep about 13 months of days
  writeUsage();   // save after every call: the app can be closed at any moment
}

function resetUsage() { usage = { since: Date.now(), p: {} }; writeUsage(); }

async function fetchModels(p) {
  const key = keyFor(p);
  if (!key) throw new Error(`Add a ${PROVIDERS[p]} key first`);
  const r = new Request(p === "openai" ? "https://api.openai.com/v1/models" : "https://api.anthropic.com/v1/models?limit=100");
  r.headers = p === "openai" ? { "Authorization": "Bearer " + key } : { "x-api-key": key, "anthropic-version": "2023-06-01" };
  r.timeoutInterval = 20;
  const j = await r.loadJSON();
  if (j.error) throw new Error(j.error.message || "Couldn't load models");
  let list = (j.data || []).map((m) => ({
    id: m.id, name: m.display_name || m.id,
    t: m.created_at ? Date.parse(m.created_at) : (m.created || 0) * 1000,
  }));
  // Read aloud: keep OpenAI's speech models for Settings › Listening, before filtering to the ones that write text.
  if (p === "openai") settings.ttsModels = { at: Date.now(), list: list.filter((m) => /tts/.test(m.id)).sort((a, b) => b.t - a.t).map((m) => ({ id: m.id, name: m.id })) };
  // OpenAI lists every model the key can reach; keep only the ones that write text.
  if (p === "openai") list = list.filter((m) => /^(gpt-|o\d|chatgpt-)/.test(m.id)
    && !/(audio|realtime|tts|transcribe|image|search|embedding|instruct|moderation)/.test(m.id));
  list.sort((a, b) => b.t - a.t);
  settings.models = settings.models || {};
  settings.models[p] = { at: Date.now(), list: list.map((m) => ({ id: m.id, name: m.name })) };
  return list.length;
}

// The state sent to the page: keys only masked.
function aiState() {
  return {
      provider: settings.aiProvider,
      keys: Object.fromEntries(Object.keys(PROVIDERS).map((p) => [p, maskKey(keyFor(p))])),
      model: Object.fromEntries(Object.keys(PROVIDERS).map((p) => [p, modelFor(p)])),
      models: settings.models || {}, usage, today: dayKey(),
  };
}

// ───────────────────────── Words from a book photo · AI coach (native side) ─────────────────────────

const LANG_NAMES = { lt: "Lithuanian", en: "English", es: "Spanish" };

// The book photo is picked by the page itself (<input type=file>, the iPhone's own picker on top of the game) and
// shrunk there to ≤ 1568 px. Scriptable's Photo.fromCamera/fromLibrary can't be used while the game is on screen:
// they open behind a full-screen WebView, out of reach. The page hands the JPEG over through ev(), not the URL.
const BOOK_IMAGE_MAX = 6 * 1024 * 1024;   // base64 characters; a 1568 px JPEG is far below this

// ───────────────────────── Read aloud: the AI voice (app-blueprints · read-aloud 1.0.1, aiSpeech) ─────────────────────────
// One word at a time. The word's language is always named in the instructions (a single Lithuanian word would otherwise
// be read with English sounds), followed by the parent's "How it should sound" or a kid-friendly default.
// Each word's MP3 is kept in Scriptable's local cache, so a word is paid for once per voice, model, speed and style.
const TTS_LEGACY_VOICES = ["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"];   // all tts-1 and tts-1-hd can use
const TTS_DEFAULT_STYLE = "Warm, slow and very clear, like a teacher reading one word to a young child. Say the word once, nothing else.";
const ttsFm = FileManager.local();
function ttsCachePath(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  const dir = ttsFm.joinPath(ttsFm.cacheDirectory(), APP_ID + "-voice");
  if (!ttsFm.fileExists(dir)) ttsFm.createDirectory(dir, true);
  return ttsFm.joinPath(dir, (h >>> 0).toString(16) + "-" + key.length + ".b64");
}
async function aiSpeech(text, lang) {
  const key = keyFor("openai");
  if (!key) throw new Error("AI voices need an OpenAI key");
  const model = settings.ttsModel || "gpt-4o-mini-tts", legacy = /^tts-1/.test(model);
  let voice = settings.ttsVoice || "coral";
  if (legacy && !TTS_LEGACY_VOICES.includes(voice)) voice = "coral";
  const body = { model, voice, input: String(text).slice(0, 400), response_format: "mp3" };
  if (!legacy) body.instructions = `${LANG_NAMES[lang] || "Lithuanian"} word. ` + String(settings.ttsInstructions || TTS_DEFAULT_STYLE).slice(0, 500);
  const speed = Number(settings.voiceRate) || 1;
  if (speed !== 1) body.speed = speed;
  const cachePath = ttsCachePath(JSON.stringify([body.model, body.voice, body.instructions || "", body.speed || 1, body.input]));
  try { if (ttsFm.fileExists(cachePath)) return ttsFm.readString(cachePath); } catch (e) {}
  const r = new Request("https://api.openai.com/v1/audio/speech");
  r.method = "POST"; r.timeoutInterval = 60;
  r.headers = { "Authorization": "Bearer " + key, "Content-Type": "application/json" };
  r.body = JSON.stringify(body);
  const data = await r.load();
  const code = r.response && r.response.statusCode;
  if (code !== 200) {
    let msg = `HTTP ${code}`;
    try { msg = JSON.parse(data.toRawString()).error.message || msg; } catch (e) {}
    throw new Error(msg);
  }
  recordUsage("openai", model, "speech", 0, 0, body.input.length);
  const b64 = data.toBase64String();
  try { ttsFm.writeString(cachePath, b64); } catch (e) {}
  return b64;
}

const BOOK_SYSTEM = "You build vocabulary for a children's picture reading game. Reply with JSON only, no other text.";
function bookPrompt(gameLang) {
  return `Read the text in this photo of a book or page.
Return JSON: {"lang": "lt" | "en" | "es" | "other", "title": "the book or page title if visible, else a 2-4 word description", "text": "the recognised text, at most 1200 characters", "words": [{"word": "na-mas", "emoji": "🏠"}]}
Rules for "words":
- Up to 30 concrete nouns from the text that a child can recognise in a picture (animals, food, objects, places, vehicles, nature, body parts).
- In the language of the text. Dictionary form: Lithuanian nominative singular; Spanish and English singular unless the thing is normally plural.
- Lowercase. Skip names of people and places, abstract words, verbs and adjectives.
- Split into syllables with "-" following that language's hyphenation rules, 1 to 6 syllables.
- Exactly one emoji that clearly shows the thing. Skip a word if no emoji shows it clearly.
- No duplicates.
If the text is not Lithuanian, English or Spanish, set "lang" to "other" and leave "words" empty. The game is currently in ${LANG_NAMES[gameLang] || "Lithuanian"}.`;
}

const COACH_SYSTEM = "You are a reading coach for a children's picture reading game. Reply with JSON only, no other text.";
function coachPrompt(m) {
  const L = LANG_NAMES[m.lang] || "Lithuanian";
  const hard = (m.hard || []).map((h) => `${h.w} (wrong ${h.wrong}×, seen ${h.seen}×)`).join(", ") || "none yet";
  const letters = (m.weakLetters || []).map((x) => `${x.letter}: ${x.wrongRate}% wrong`).join(", ") || "none";
  return `Game language: ${L}. Level: ${m.level} (ages ${m.ages}), words with ${m.syllables} syllables.
Answered words: ${m.answered}; correct on the first try: ${m.firstTryRate}%.
Hardest words: ${hard}.
First letters with most mistakes: ${letters}.
Mastered words: ${m.masteredCount}${(m.masteredSample || []).length ? " (recent: " + m.masteredSample.join(", ") + ")" : ""}.
Words already in the game: ${(m.vocabulary || []).join(", ")}.

Return JSON: {"note": "…", "focus": ["…"], "words": [{"word": "syl-la-bles", "emoji": "🦊"}]}
- note: 2 or 3 short sentences for the parent, in ${LANG_NAMES[m.uiLang] || L}: what is going well and what to practise. Call the child "the child".
- focus: up to 8 words from "Words already in the game" to practise next, hardest first, written exactly as listed.
- words: up to 12 NEW concrete nouns in ${L} that are not in the game yet, in dictionary form, lowercase, with ${m.syllables} syllables split with "-" by ${L} hyphenation rules, each with exactly one emoji that clearly shows it. Prefer words that start with the letters the child finds hard and that sound like the hardest words.`;
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
/* Safe start-up (app-blueprints · safe-startup): the placeholder until the data is handed over, and the start-up log */
.booting{display:flex;align-items:center;justify-content:center;gap:10px;padding:80px 20px;color:var(--muted);font-size:calc(14px * var(--ts))}
.booting.note{flex-direction:column;text-align:center;color:var(--ink-2);padding:60px 24px}
.booting.note b{font-size:calc(18px * var(--ts));color:var(--ink)}
.booting.note pre,.startlog{max-width:100%;overflow:auto;text-align:left;font:12px/1.45 ui-monospace,Menlo,monospace;background:var(--sheet);border:1px solid var(--rule);border-radius:10px;padding:10px;color:var(--ink-2);white-space:pre-wrap;-webkit-user-select:text;user-select:text}
.startlog{margin:8px 0;max-height:260px}
.busy-dot{width:15px;height:15px;flex:none;border-radius:50%;border:2px solid var(--rule);border-top-color:var(--signal);animation:bdspin .8s linear infinite}
@keyframes bdspin{to{transform:rotate(360deg)}}
/* The page's ground is the sky backdrop, so the placeholder sits on a sheet card to stay readable */
#app>.booting{background:var(--sheet);border-radius:26px;margin-top:24px;box-shadow:0 6px 0 rgba(36,38,74,.12)}
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
.feedback{min-height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;font-weight:900;font-size:calc(20px * var(--ts));margin-top:14px;color:#fff;text-shadow:0 2px 0 rgba(36,38,74,.18);line-height:1.25}
.feedback.bad{animation:shake .4s}
.gamefoot{display:flex;justify-content:space-between;align-items:center;margin-top:4px}

/* Funny animations (1.10.0) */
.fun-actor{position:fixed;left:0;top:0;font-size:120px;line-height:1;will-change:transform;filter:drop-shadow(0 8px 6px rgba(36,38,74,.22))}
.fun-bit{position:fixed;left:0;top:0;line-height:1;will-change:transform,opacity}
.fun-say{position:fixed;transform:translate(-50%,-50%) scale(0);background:#fff;color:#24264A;font-weight:900;font-size:26px;padding:8px 16px;border-radius:20px;white-space:nowrap;
  box-shadow:0 5px 0 rgba(36,38,74,.18);animation:funSay 1.3s cubic-bezier(.3,1.6,.5,1) both}
.fun-say::after{content:"";position:absolute;left:50%;bottom:-9px;margin-left:-9px;border:9px solid transparent;border-bottom:0;border-top-color:#fff}
@keyframes funSay{0%{transform:translate(-50%,-50%) scale(0) rotate(-8deg)}18%{transform:translate(-50%,-50%) scale(1.12) rotate(4deg)}30%{transform:translate(-50%,-50%) scale(1) rotate(-2deg)}
  80%{opacity:1;transform:translate(-50%,-60%) scale(1)}100%{opacity:0;transform:translate(-50%,-80%) scale(.9)}}

/* Stickers (1.10.0): a die-cut look from white outlines around the emoji */
.stk{display:inline-block;flex:none;font-size:34px;line-height:1;transform:rotate(var(--rot,0deg));
  filter:drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 3px 3px rgba(36,38,74,.28))}
.stk.shiny{filter:drop-shadow(2px 0 0 #FFD23F) drop-shadow(-2px 0 0 #FFD23F) drop-shadow(0 2px 0 #FFD23F) drop-shadow(0 -2px 0 #FFD23F) drop-shadow(0 0 7px rgba(255,190,40,.95))}
.stk.big{font-size:46px}
.stk.locked{filter:brightness(0);opacity:.13}
.stk.landed{animation:stkLand .5s cubic-bezier(.3,1.7,.5,1)}
.stk.wiggle{animation:stkWig .6s ease}
@keyframes stkLand{0%{transform:scale(.3) rotate(var(--rot))}60%{transform:scale(1.35) rotate(var(--rot))}100%{transform:scale(1) rotate(var(--rot))}}
@keyframes stkWig{0%,100%{transform:rotate(var(--rot)) scale(1)}25%{transform:rotate(-14deg) scale(1.2)}50%{transform:rotate(12deg) scale(1.2)}75%{transform:rotate(-6deg) scale(1.1)}}
body.shelf-on #app{padding-bottom:calc(var(--shelfH, 96px) + 8px)}
/* 1.10.1: the game screen is fixed to the screen; fitGame() sizes the pictures so nothing scrolls */
body.game-fixed{position:fixed;inset:0;overflow:hidden;overscroll-behavior:none}
body.game-fixed #app{height:100%;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column}
body.game-fixed #app>*{flex:none}
.pics.sized .pic{width:var(--tile)}
.pics.sized .emo{font-size:calc(var(--tile) * .62)}
#app.tight .hint{display:none}
#app.tight .wallet{margin-bottom:6px}
#app.tight .wordcard{margin-top:10px;padding-top:16px;padding-bottom:12px}
#app.tight .hearrow{margin-top:6px}
#app.tight .hear{width:48px;height:48px;font-size:24px}
#app.tight .feedback{min-height:44px;margin-top:4px;gap:2px}
body.game-fixed #app.tight .feedback{height:56px}
#app.tight .fb-main{font-size:calc(16px * var(--ts))}
#app.tight .fb-tip{font-size:calc(14px * var(--ts));padding:3px 10px}
#app.tight .pics{margin-top:4px}
.wcol{flex:1;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;overflow:hidden}
.wcol .wn{max-width:100%}
.wcol .badge{font-size:calc(12px * var(--ts));padding:2px 8px;text-shadow:none;max-width:100%;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis}
.gamebar .pill{flex:none}
.skipbtn{flex:none;padding:10px 12px;white-space:nowrap}
body.game-fixed .feedback{height:68px;min-height:0;overflow:visible}
.fb-main{display:block;line-height:1.2}
.fb-tip{display:inline-block;max-width:100%;box-sizing:border-box;background:#fff;color:#24264A;text-shadow:none;font-size:calc(16px * var(--ts));font-weight:800;line-height:1.25;
  padding:5px 14px;border-radius:16px;box-shadow:0 4px 0 rgba(36,38,74,.16);animation:tipIn .35s cubic-bezier(.3,1.6,.5,1)}
.feedback.cheer .fb-tip{background:#FFF3C4;color:#5C3B00}
@keyframes tipIn{from{transform:scale(.6);opacity:0}}
@media (prefers-reduced-motion: reduce){.fb-tip{animation:none}}
.gamebar{gap:6px}
.gamebar .icon{width:44px;height:44px;flex:none}
.gamebar .ava.sm{width:36px;height:36px;font-size:calc(21px * var(--ts))}
.gamebar .who{gap:6px}
.gamebar .pill{padding:7px 10px;font-size:calc(16px * var(--ts))}
@media (max-width:413px){.skipbtn{width:44px;height:44px;padding:0;border-radius:16px;font-size:22px}.skipbtn .sk-t{display:none}}
body.tight-shelf .shelf{padding-top:6px;padding-bottom:calc(env(safe-area-inset-bottom) + 6px)}
body.tight-shelf .sh-prog{width:48px;height:48px}
body.tight-shelf .sh-gift{font-size:22px}
body.tight-shelf .shelf .sh-strip .stk{font-size:28px}
.shelf{position:fixed;z-index:40;left:50%;bottom:0;transform:translateX(-50%);width:min(760px,100%);box-sizing:border-box;display:flex;align-items:center;gap:12px;
  padding:10px 14px calc(env(safe-area-inset-bottom) + 10px);background:var(--sheet);border-radius:26px 26px 0 0;
  box-shadow:0 -5px 0 rgba(36,38,74,.08),0 -12px 30px rgba(36,38,74,.14);cursor:pointer}
.sh-prog{--p:0;position:relative;flex:none;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;
  background:conic-gradient(var(--signal) calc(var(--p) * 1%),var(--rule) 0)}
.sh-prog::before{content:"";position:absolute;inset:6px;border-radius:50%;background:var(--sheet)}
.sh-prog.tick{animation:shTick .5s cubic-bezier(.3,1.7,.5,1)}
@keyframes shTick{50%{transform:scale(1.15)}}
.sh-gift{position:relative;font-size:26px;line-height:1}
.sh-prog b{position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);background:var(--signal);color:#fff;font-size:12px;font-weight:900;padding:1px 7px;border-radius:10px;white-space:nowrap}
.sh-strip{flex:1;min-width:0;display:flex;align-items:center;gap:8px;overflow-x:auto;overflow-y:hidden;padding:8px 6px;scrollbar-width:none;
  -webkit-mask-image:linear-gradient(90deg,#000 85%,transparent);mask-image:linear-gradient(90deg,#000 85%,transparent)}
.sh-strip::-webkit-scrollbar{display:none}
.sh-empty{color:var(--muted);font-weight:800;font-size:calc(15px * var(--ts))}
.kstk{display:flex;align-items:center;gap:3px;margin-top:2px}
.kstk .stk{font-size:20px}
.kstk small{font-weight:900;color:var(--muted);font-size:12px;margin-left:2px}
.stk-rev{position:fixed;width:0;height:0}
.stk-rev .stk.big{position:absolute;left:0;top:0;margin:-70px 0 0 -70px;width:140px;text-align:center;font-size:118px}
.stk-rays{position:absolute;left:-150px;top:-150px;width:300px;height:300px;border-radius:50%;opacity:0;
  background:repeating-conic-gradient(rgba(255,210,63,.55) 0 12deg,transparent 12deg 30deg);-webkit-mask-image:radial-gradient(circle,#000 25%,transparent 70%);mask-image:radial-gradient(circle,#000 25%,transparent 70%);
  animation:raySpin 3s linear infinite}
.stk-rev.shiny .stk-rays{background:repeating-conic-gradient(rgba(255,255,255,.8) 0 8deg,rgba(255,200,40,.5) 8deg 16deg,transparent 16deg 30deg)}
@keyframes raySpin{to{transform:rotate(360deg)}}
.stk-label{position:absolute;left:0;top:-128px;transform:translateX(-50%);opacity:0;white-space:nowrap;font-size:26px;font-weight:900;color:#fff;
  background:var(--signal);padding:6px 18px;border-radius:20px;box-shadow:0 5px 0 rgba(36,38,74,.25)}
.albumov{position:fixed;inset:0;z-index:80;background:rgba(20,22,45,.5);display:flex;align-items:flex-end;justify-content:center;animation:fade .2s}
.albumcard{width:min(760px,100%);max-height:86vh;overflow:auto;box-sizing:border-box;background:var(--sheet);border-radius:28px 28px 0 0;
  padding:16px 16px calc(env(safe-area-inset-bottom) + 24px);animation:alUp .3s cubic-bezier(.2,.9,.3,1.1)}
@keyframes alUp{from{transform:translateY(40%)}}
.al-head{display:flex;align-items:center;gap:10px}
.al-t{flex:1;display:flex;flex-direction:column}
.al-t b{font-size:calc(20px * var(--ts))}
.al-t small{color:var(--muted);font-weight:800}
.al-bar{height:12px;border-radius:8px;background:var(--rule);margin:12px 0 6px;overflow:hidden}
.al-bar i{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,var(--signal),#FF8FC7)}
.al-note{margin:6px 0 12px;font-weight:800;color:var(--ink-2)}
.al-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:10px}
.al-cell{aspect-ratio:1;display:grid;place-items:center;border-radius:18px;background:var(--paper);border:2px dashed var(--rule)}
button.al-cell{border-style:solid;border-color:transparent;background:var(--signal-wash)}
@media (prefers-reduced-motion: reduce){.stk-rays{animation:none}.stk.landed,.stk.wiggle,.sh-prog.tick{animation:none}}

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
  .busy-dot{animation-duration:2.4s}
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
#usageask b{display:block;font-size:calc(18px * var(--ts));font-weight:900}
#usageask p{margin:6px 0 12px;color:var(--muted);font-size:calc(15px * var(--ts));line-height:1.4}
.uabtns{display:flex;gap:10px}
.uabtns .btn{flex:1;margin:0}
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
/* Settings blueprint 1.1.0: sections are cards under small muted capitals */
#cfgsheet h3.sec{font:700 calc(12.5px * var(--ts, 1))/1.2 var(--sans, -apple-system, system-ui, sans-serif);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:28px 4px 8px}
#cfgsheet .grp{background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:0 16px;overflow:hidden}
#cfgsheet .grp>*:last-child{border-bottom:0}
#cfgsheet .grp .lk-row{margin:0;padding:12px 0;border-bottom:1px solid var(--rule)}
#cfgsheet .cfg-foot{margin:10px 4px 0}
#cfgsheet .note{font-size:12.5px;color:var(--muted)}
#cfgsheet .srow.bp{width:100%;text-align:left}
#cfgsheet .chev{flex:none;color:var(--muted);font-size:calc(20px * var(--ts));line-height:1}
#cfgsheet input{-webkit-user-select:text;user-select:text}
#cfgsheet .srow.act{width:100%}
#cfgsheet{font-family:var(--rounded)}
#aisheet{position:fixed;inset:0;z-index:51;background:var(--paper);color:var(--ink);transform:translateY(102%);visibility:hidden;transition:transform .28s ease,visibility 0s linear .28s;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;text-align:left}
#aisheet.open{transform:none;visibility:visible;transition:transform .28s ease}
#aisheet button{font:inherit;color:inherit;background:none;border:0;border-radius:0;padding:0;font-weight:inherit;cursor:pointer;text-align:inherit}
#aisheet .sh-head{position:sticky;top:0;z-index:2;background:var(--paper);display:flex;justify-content:space-between;align-items:center;padding:calc(env(safe-area-inset-top) + 14px) 18px 12px;border-bottom:1px solid var(--rule)}
#aisheet .sh-head h2{font:700 calc(24px * var(--ts))/1 var(--display);margin:0}
#aisheet .sh-body{padding:16px 18px calc(env(safe-area-inset-bottom) + 40px);max-width:680px;margin:0 auto}
#aisheet .link{color:var(--signal);font-weight:600;font-size:16px}
#aisheet .link.small{font-size:calc(14px * var(--ts))}
#aisheet .hint{font-size:calc(13px * var(--ts));color:var(--muted);margin:8px 2px 0}
#aisheet .muted{color:var(--muted)}
#aisheet .sec{display:block;font:700 calc(17px * var(--ts))/1.2 var(--display);color:var(--ink);margin:26px 0 6px}
#aisheet .srow{display:flex;align-items:center;gap:8px;padding:11px 0;border-bottom:1px solid var(--rule)}
#aisheet .grow{flex:1;min-width:0}
#aisheet .grow b{display:block;font-weight:600}
#aisheet .grow small{display:block;font-size:calc(13px * var(--ts));color:var(--ink-2)}
#aisheet .switch{width:46px;height:28px;border-radius:14px;background:var(--rule);position:relative;flex:none;transition:background .2s}
#aisheet .switch::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:11px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .2s}
#aisheet .switch.on{background:var(--signal)}
#aisheet .switch.on::after{transform:translateX(18px)}
#aisheet .sm{font-size:calc(13px * var(--ts));padding:6px 11px;border-radius:8px;border:1px solid var(--rule);background:var(--sheet);white-space:nowrap;flex:none}
#aisheet .danger{color:var(--danger)}
#aisheet .danger.armed{background:var(--danger);color:#fff;border-color:var(--danger)}
#aisheet .seg{display:flex;flex:none;gap:0;padding:0;border:1px solid var(--rule);border-radius:9px;overflow:hidden;background:var(--sheet)}
#aisheet .seg button{font-size:calc(12.5px * var(--ts));padding:6px 10px;color:var(--ink-2);white-space:nowrap}
#aisheet .seg button.on{background:var(--ink);color:var(--paper);font-weight:600}
#aisheet .seg.wide button{flex:1;text-align:center;padding:9px 4px;font-size:calc(13.5px * var(--ts))}
#aisheet .lk-row{margin:10px 0 14px}
#aisheet .lk-l{display:block;font-size:calc(13px * var(--ts));font-weight:600;color:var(--ink-2);margin-bottom:6px}
#aisheet .sws{display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding:3px 3px 2px}
#aisheet .sws::-webkit-scrollbar{display:none}
#aisheet .sw{display:flex;flex-direction:column;align-items:center;gap:5px;flex:none}
#aisheet .sw .prev{position:relative;width:50px;height:50px;border-radius:13px;display:grid;place-items:center;border:1px solid rgba(127,127,127,.35);font:700 18px/1 var(--display)}
#aisheet .sw .prev i{position:absolute;right:6px;bottom:6px;width:9px;height:9px;border-radius:5px}
#aisheet .sw.on .prev{outline:2.5px solid var(--signal);outline-offset:2px}
#aisheet .sw small{font-size:12px;color:var(--ink-2)}
#aisheet .sw.on small{color:var(--ink);font-weight:600}
#aisheet .cfg{padding:12px 0;border-bottom:1px solid var(--rule)}
#aisheet .cfg.ch .cfg-h b::after{content:"";display:inline-block;width:7px;height:7px;border-radius:4px;background:var(--signal);margin-left:7px;vertical-align:2px}
#aisheet .cfg-h{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
#aisheet .cfg-h b{font-weight:600}
#aisheet .cfg small{display:block;font-size:calc(13px * var(--ts));margin-top:2px}
#aisheet .stepper{display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap}
#aisheet .stepper button{width:38px;height:36px;border-radius:9px;border:1px solid var(--rule);background:var(--sheet);font-size:20px;font-weight:600;text-align:center}
#aisheet .stepper button[disabled]{opacity:.35}
#aisheet .stepper input{width:86px;text-align:center;font:600 16px var(--sans);padding:7px 6px;border-radius:9px;border:1px solid var(--rule);background:var(--paper);color:var(--ink)}
#aisheet .stepper .unit{font-size:calc(14px * var(--ts));color:var(--ink-2);min-width:2.5em}
#aisheet .stepper .range{flex-basis:100%;font-size:calc(12px * var(--ts));color:var(--muted)}
#aisheet .cfgin.wide,#aisheet .cfgsel{display:block;width:100%;margin-top:8px;font:16px/1.45 var(--sans);padding:9px 11px;border-radius:9px;border:1px solid var(--rule);background:var(--paper);color:var(--ink);-webkit-appearance:none;appearance:none}
#aisheet textarea.cfgsel{resize:none}
#aisheet .cfgin:focus,#aisheet .cfgsel:focus{outline:2px solid var(--signal);outline-offset:-1px}
#aisheet .cfg-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:18px}
#aisheet h3.sec{font:700 calc(12.5px * var(--ts, 1))/1.2 var(--sans, -apple-system, system-ui, sans-serif);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:28px 4px 8px}
#aisheet .grp{background:var(--sheet);border:1px solid var(--rule);border-radius:16px;padding:0 16px;overflow:hidden}
#aisheet .grp>*:last-child{border-bottom:0}
#aisheet .grp .lk-row{margin:0;padding:12px 0;border-bottom:1px solid var(--rule)}
#aisheet .cfg-foot{margin:10px 4px 0}
#aisheet .note{font-size:12.5px;color:var(--muted)}
#aisheet .srow.bp{width:100%;text-align:left}
#aisheet .chev{flex:none;color:var(--muted);font-size:calc(20px * var(--ts));line-height:1}
#aisheet input{-webkit-user-select:text;user-select:text}
#aisheet .srow.act{width:100%}
#aisheet{font-family:var(--rounded)}
/* AI settings sheet (app-blueprints · ai-configuration Step 7, shared tokens). Above Settings (50), so z-index 51 */
#aisheet .aicard,#aisheet .ucard{background:var(--sheet);border:1px solid var(--rule);border-radius:14px;padding:14px;margin:14px 0}
#aisheet .aicard.active{border-color:var(--signal);box-shadow:0 0 0 1px var(--signal)}
#aisheet .aic-h{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:17px}
#aisheet .aic-row{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:14px}
#aisheet .aic-row.lbl,#aisheet .aic-row .lbl{font-weight:600;color:var(--ink-2)}
#aisheet .aicard code{font:13px ui-monospace,Menlo,monospace;background:var(--paper);border:1px solid var(--rule);border-radius:6px;padding:2px 6px}
#aisheet .aic-btns{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}
#aisheet .sm[disabled]{opacity:.5}
#aisheet .sm.primary{background:var(--signal);color:#fff;border-color:var(--signal)}
#aisheet .modelsel{display:block;width:100%;margin-top:6px;font:16px var(--sans);color:var(--ink);background:var(--paper);border:1px solid var(--rule);border-radius:9px;padding:9px 10px}
.badge-ai{display:inline-block;font-size:12px;font-weight:700;color:var(--signal);background:var(--signal-wash);border-radius:6px;padding:2px 8px}
.badge-ex{display:inline-block;font-size:12px;font-weight:600;color:var(--ink-2);border:1px dashed var(--muted);border-radius:6px;padding:1px 8px}
#aisheet .ustat{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 4px}
#aisheet .ustat div{background:var(--paper);border-radius:10px;padding:8px 10px}
#aisheet .ustat b{display:block;font-size:20px;font-weight:700}
#aisheet .ustat small{color:var(--muted);font-size:12px}
#aisheet .ubars{display:flex;align-items:flex-end;gap:3px;height:56px;margin-top:10px}
#aisheet .ubars span{flex:1;background:var(--signal);border-radius:3px 3px 0 0;min-height:2px}
#aisheet .ubars span.zero{background:var(--rule)}
#aisheet .ubars-l{display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-top:4px}
#aisheet .utab{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
#aisheet .utab th{text-align:left;font-weight:600;color:var(--muted);padding:4px 4px 4px 0;border-bottom:1px solid var(--rule)}
#aisheet .utab td{padding:6px 4px 6px 0;border-bottom:1px solid var(--rule);color:var(--ink-2);word-break:break-word}
#aisheet .utab th:not(:first-child),#aisheet .utab td:not(:first-child){text-align:right;white-space:nowrap}
#aisheet .pad{padding:8px 0}
#aisheet .small{font-size:13px}
#cfgsheet .voicesel{display:block;width:100%;margin-top:8px;font:16px var(--sans);color:var(--ink);background:var(--sheet);border:1px solid var(--rule);border-radius:9px;padding:9px 10px}
#cfgsheet .aic-btns{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0}
#cfgsheet .warnhint{color:var(--danger)}
#cfgsheet .sm.primary{background:var(--signal);color:#fff;border-color:var(--signal)}
/* Learning, read aloud, AI coach, words from books */
.learnbox .setrow{margin-bottom:8px}
.learnbox .mhint{margin:2px 0 0}
.coachbox{margin-top:12px;border-top:1px solid var(--hair);padding-top:10px}
.coachnote p{margin:8px 0 4px;font-weight:700;font-size:15px;line-height:1.4}
.coachnote small{color:var(--muted);font-weight:700;font-size:13px}
.sub3{margin:18px 0 4px;font-size:16px}
.topgap{margin-top:16px}
.bksrc{align-items:center;gap:8px}
.bksrc small{color:var(--muted);font-weight:700}
.hearrow{display:flex;justify-content:center;margin-top:12px}   /* under the word card: never on top of a letter */
.hear{width:58px;height:58px;border-radius:50%;background:var(--sun);font-size:28px;box-shadow:0 4px 0 var(--sunDeep);display:grid;place-items:center}
.hear:active{transform:translateY(2px);box-shadow:none}
.bkw .bklvl{font-size:13px;margin-left:2px}
.bkw.blocked{border-style:dashed}
.bknotes{margin:2px 0 6px}
.bknote{margin:4px 0;font-size:calc(13.5px * var(--ts));font-weight:700;color:var(--ink-2);line-height:1.4}
.bknote.blocked{color:var(--danger)}
.bknote.ok{color:var(--grass)}
.bksrcbox{border-bottom:1px solid var(--hair)}
.bksrcbox .bksrc{border-bottom:0}
.bksrc small.warn{color:var(--danger)}
.bkdetail{margin:0 0 10px}
.bkdetail summary{font-size:calc(14px * var(--ts));font-weight:800;color:var(--signal);cursor:pointer}
.bkwrow{display:grid;grid-template-columns:30px auto 1fr;align-items:center;column-gap:8px;padding:6px 0;border-top:1px dashed var(--hair)}
.bkwrow .bke{font-size:22px}
.bkwrow .bklvl{justify-self:start}
.bkwrow small{grid-column:2 / 4;color:var(--muted);font-weight:700;font-size:calc(12.5px * var(--ts));line-height:1.35}
.bkwrow.blocked small{color:var(--danger)}
.bkpanel.ai{background:linear-gradient(160deg,var(--signal-wash) 0%,var(--sheet) 70%);border:2px solid var(--signal);box-shadow:0 6px 0 rgba(36,38,74,.12),0 0 0 4px color-mix(in srgb,var(--signal) 18%,transparent)}
.bkpanel.ai h3{display:flex;align-items:center;gap:8px}
.bkpanel.ai .badge-ai{font-size:calc(13px * var(--ts))}
#booksheet{position:fixed;inset:0;z-index:52;background:rgba(36,38,74,.55);display:none;align-items:flex-end}
#booksheet.open{display:flex;animation:fade .2s}
.bkp{width:100%;max-width:760px;max-height:92%;overflow-y:auto;margin:0 auto;background:var(--sheet);color:var(--ink);border-radius:26px 26px 0 0;padding:20px 18px calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;animation:updUp .35s cubic-bezier(.2,.8,.3,1)}
.bkhead{display:flex;justify-content:space-between;align-items:center}
.bkflag{font-size:26px}
.bkwords{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
.bkw{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:14px;background:var(--chipbg);border:2px solid var(--hair);font-weight:900;font-size:16px;opacity:.45;text-decoration:line-through}
.bkw.on{opacity:1;text-decoration:none;border-color:var(--grass);background:#E6F8EE}
.bke{font-size:24px}
.bktext{margin:4px 0 8px}
.bktext p{white-space:pre-wrap;color:var(--ink-2);font-size:14px;line-height:1.45}
.bkbusy{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 0;font-size:19px}
.bkspin{font-size:54px;animation:float 1.2s ease-in-out infinite}
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
      funny: "Funny animations",
      tipsSet: "Tips and cheers",
      tipsSetHelp: "Short sentences while playing: how to read better, and praise",
      coachHello: "Let's read! 📖",
      tipGuess: ["Read the whole word first 👀", "Read first, then tap 👀", "No rush, read it all 👀"],
      tipSyl: (s) => `Read slowly: ${s}`,
      tipEnd: (l) => `All start with ${l}. Read to the end!`,
      tipLoud: "Say the word out loud 🗣️",
      tipHear: "Stuck? Tap 🔊 to hear it",
      tipLetters: "Point at each letter ☝️",
      tipBrave: "Have a go! Mistakes are OK 🙂",
      cheerStreak: (n) => `${n} in a row! 🔥`,
      cheerBack: "Great comeback! 💪",
      cheerTricky: "You beat a tricky word! 🧠",
      cheerLong: "A long word, well read! 📏",
      cheerCareful: "Careful reading pays off 🐢",
      cheerFast: "Speedy reader! ⚡",
      cheerGeneral: ["Great reading! 📖", "Sharp eyes! 👀", "Keep going, star! ⭐", "Better and better! 📈", "Reading is your superpower! 🦸"],
      funnyHelp: "The right picture acts out its word",
      stickers: "Stickers",
      newSticker: "New sticker!",
      shinySticker: "Shiny sticker! ✨",
      nextSticker: (n) => (n === 1 ? "1 more word for a sticker!" : `${n} more words for a sticker!`),
      stickerCount: (n, all) => `${n} of ${all} stickers`,
      stickersDone: "All stickers collected! Now they come shiny ✨",
      close: "Close",
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
      learning: "Learning",
      smartOrder: "Smart word order",
      smartOrderHint: "Repeats the words a kid finds hard and shows mastered ones less often. No AI.",
      aiRowTitle: "Keys, models and token usage",
      aiRowNoKey: "Add a Claude or OpenAI key to read words from book photos and use the AI coach",
      aiSettings: "AI settings",
      tokensUsed: (n) => `${n} tokens used`,
      inRounds: (a, n) => `${a} of ${n} words in rounds`,
      showWords: "Show the words",
      allPlay: "All these words will be in rounds.",
      stOk: "in rounds",
      stOff: "book words are Off in Settings › Learning",
      stLang: (l) => `plays when the game is in ${l}`,
      stOnlyExpert: "Expert only, and there is no Expert player",
      stOnlyBeginner: "Beginner only, and there is no Beginner player",
      stNear: (L, m) => `few words start with ${L}, so ${m === 1 ? "1 picture comes" : m + " pictures come"} from nearby letters`,
      sylRange: (a, b) => (a === b ? `${a} syllable${a === 1 ? "" : "s"}` : `${a}–${b} syllables`),
      stNoLevel: "too long or short for both levels (Settings › Rounds)",
      listening: "Listening",
      autoVoice: "Automatic (the best voice for the language)",
      voiceEngine: "Voice engine",
      engDevice: "iPhone voice",
      engAI: "✦ AI voice",
      voice: "Voice",
      voiceFor: (l) => `Voice for ${l} words`,
      gAll: "All", gFemale: "Female", gMale: "Male", gF: " (female)", gM: " (male)", gN: " (neutral)",
      speechModel: "Speech model",
      howSound: "How it should sound",
      howSoundPh: "e.g. Warm, slow and very clear, like a teacher reading to a 5-year-old.",
      legacyNote: "tts-1 models can't take a speaking style, and may read words with English sounds. gpt-4o-mini-tts reads Lithuanian and Spanish best.",
      speed: "Speed", slow: "Slow", normal: "Normal", fast: "Fast", faster: "Faster",
      pitch: "Pitch", lower: "Lower", higher: "Higher",
      testVoice: "Test the voice",
      voicesCount: (n) => `${n} voices on this iPhone`,
      noVoices: "This iPhone reads aloud with its system voice. Choose it in iOS Settings › Accessibility › Spoken Content.",
      moreVoices: "More natural voices: iOS Settings › Accessibility › Spoken Content › Voices. Download an Enhanced or Premium voice and it appears here.",
      aiVoiceTip: "No voice for your language? The ✦ AI voice (OpenAI) can read it.",
      aiVoiceNeedsKey: "AI voices come from OpenAI, so they need an OpenAI key, even when Claude runs the other AI features (Claude's API doesn't offer speech).",
      addOpenAI: "Add an OpenAI key",
      aiVoiceNote: "✦ Spoken by OpenAI with your key, one word at a time; the first time a word is said takes a second. Each word is kept on this iPhone, so it's paid for once. Counted under AI settings › Token usage as “Read aloud”.",
      loadModelsNote: "Load your OpenAI models in AI settings to see every speech model your key can use.",
      aiVoiceFailed: (m) => `AI voice failed (${m}). Used the iPhone voice.`,
      bookWords: "Words from books",
      photoUnreadable: "Couldn\u2019t open that photo. Try another one.",
      bookHint: "Take a photo of a page. AI reads it and picks words a child can recognise in a picture.",
      aiBadge: "✦ AI",
      takePhoto: "Take a photo",
      fromPhotos: "From photos",
      readingPage: "Reading the page…",
      bookMode: "Book words in the game",
      modeMix: "Mixed in",
      modeFirst: "First",
      modeOff: "Off",
      sourceWords: (n) => `${n} words`,
      noBooks: "No book words yet.",
      reviewTitle: "New words from the page",
      reviewHint: "Tap a word to leave it out.",
      addWords: (n) => `Add ${n} words`,
      sourceName: "Name",
      recognized: "Recognised text",
      noNewWords: "No new picture words found on this page.",
      langUnsupported: "This text isn't in Lithuanian, English or Spanish.",
      wordsAdded: (n) => `✅ ${n} words added`,
      alreadyKnown: (n) => `${n} already in the game`,
      readAloud: "Read words aloud",
      speakOff: "Off",
      speakShown: "When shown",
      speakAfter: "After answer",
      hearWord: "Hear the word",
      voiceFound: (l, name) => `${l} voice: ${name}`,
      voiceMissing: (l) => `No ${l} voice on this iPhone. Add one in Settings › Accessibility › Spoken Content › Voices.`,
      langNames: { lt: "Lithuanian", en: "English", es: "Spanish" },
      coach: "AI coach",
      askCoach: "Ask the AI coach",
      coachBusy: "The coach is thinking…",
      coachNeedsWords: "After 10 words the coach can suggest what to practise.",
      coachBy: (prov, date) => `✦ AI coach by ${prov} · ${date}`,
      coachFocus: "Practising next",
      coachAdded: (n) => `+${n} new words`,
      coachSource: (name) => `✦ AI coach · ${name}`,
      wordsStats: (m, l, h) => `Words: ${m} mastered · ${l} learning · ${h} hard`,
      builtWith: "Built with",
      confirm: "Confirm",
      aiFailed: (m) => `AI failed: ${m}`,
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
      funny: "Animaciones divertidas",
      tipsSet: "Consejos y ánimos",
      tipsSetHelp: "Frases cortas al jugar: cómo leer mejor y elogios",
      coachHello: "¡A leer! 📖",
      tipGuess: ["Lee toda la palabra primero 👀", "Lee y luego toca 👀", "Sin prisa, léela entera 👀"],
      tipSyl: (s) => `Lee despacio: ${s}`,
      tipEnd: (l) => `Todas con ${l}. ¡Lee hasta el final!`,
      tipLoud: "Di la palabra en voz alta 🗣️",
      tipHear: "¿Te cuesta? Toca 🔊 para oírla",
      tipLetters: "Señala cada letra con el dedo ☝️",
      tipBrave: "¡Inténtalo sin miedo! 🙂",
      cheerStreak: (n) => `¡${n} seguidas! 🔥`,
      cheerBack: "¡Gran remontada! 💪",
      cheerTricky: "¡Venciste una palabra difícil! 🧠",
      cheerLong: "¡Palabra larga, bien leída! 📏",
      cheerCareful: "¡Leer con calma funciona! 🐢",
      cheerFast: "¡Lector veloz! ⚡",
      cheerGeneral: ["¡Qué bien lees! 📖", "¡Qué ojos tan atentos! 👀", "¡Sigue así, estrella! ⭐", "¡Cada vez mejor! 📈", "¡Leer es tu superpoder! 🦸"],
      funnyHelp: "La imagen correcta representa su palabra",
      stickers: "Pegatinas",
      newSticker: "¡Pegatina nueva!",
      shinySticker: "¡Pegatina brillante! ✨",
      nextSticker: (n) => (n === 1 ? "¡1 palabra más para una pegatina!" : `¡${n} palabras más para una pegatina!`),
      stickerCount: (n, all) => `${n} de ${all} pegatinas`,
      stickersDone: "¡Todas las pegatinas reunidas! Ahora llegan brillantes ✨",
      close: "Cerrar",
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
      learning: "Aprendizaje",
      smartOrder: "Orden inteligente",
      smartOrderHint: "Repite las palabras difíciles y muestra menos las que ya domina. Sin IA.",
      aiRowTitle: "Claves, modelos y uso de tokens",
      aiRowNoKey: "Añade una clave de Claude u OpenAI para leer palabras de fotos de libros y usar el entrenador IA",
      aiSettings: "Ajustes de IA",
      tokensUsed: (n) => `${n} tokens usados`,
      inRounds: (a, n) => `${a} de ${n} palabras en juego`,
      showWords: "Ver las palabras",
      allPlay: "Todas estas palabras estarán en juego.",
      stOk: "en juego",
      stOff: "las palabras de libros están desactivadas en Ajustes › Aprendizaje",
      stLang: (l) => `se juega con el juego en ${l}`,
      stOnlyExpert: "solo Experto, y no hay ningún jugador Experto",
      stOnlyBeginner: "solo Principiante, y no hay ningún jugador Principiante",
      stNear: (L, m) => `pocas palabras empiezan por ${L}, así que ${m === 1 ? "1 dibujo viene" : m + " dibujos vienen"} de letras cercanas`,
      sylRange: (a, b) => (a === b ? `${a} sílaba${a === 1 ? "" : "s"}` : `${a}–${b} sílabas`),
      stNoLevel: "demasiado larga o corta para ambos niveles (Ajustes › Rondas)",
      listening: "Escuchar",
      autoVoice: "Automática (la mejor voz para el idioma)",
      voiceEngine: "Motor de voz",
      engDevice: "Voz del iPhone",
      engAI: "✦ Voz IA",
      voice: "Voz",
      voiceFor: (l) => `Voz para palabras en ${l}`,
      gAll: "Todas", gFemale: "Femeninas", gMale: "Masculinas", gF: " (femenina)", gM: " (masculina)", gN: " (neutra)",
      speechModel: "Modelo de voz",
      howSound: "Cómo debe sonar",
      howSoundPh: "p. ej. Cálida, lenta y muy clara, como una maestra leyendo a un niño de 5 años.",
      legacyNote: "Los modelos tts-1 no aceptan estilo y pueden leer con sonidos en inglés. gpt-4o-mini-tts lee mejor el lituano y el español.",
      speed: "Velocidad", slow: "Lenta", normal: "Normal", fast: "Rápida", faster: "Más rápida",
      pitch: "Tono", lower: "Más grave", higher: "Más agudo",
      testVoice: "Probar la voz",
      voicesCount: (n) => `${n} voces en este iPhone`,
      noVoices: "Este iPhone lee con su voz del sistema. Elígela en Ajustes de iOS › Accesibilidad › Contenido leído.",
      moreVoices: "Voces más naturales: Ajustes de iOS › Accesibilidad › Contenido leído › Voces. Descarga una voz Mejorada o Premium y aparecerá aquí.",
      aiVoiceTip: "¿No hay voz para tu idioma? La ✦ voz IA (OpenAI) puede leerlo.",
      aiVoiceNeedsKey: "Las voces IA vienen de OpenAI, así que necesitan una clave de OpenAI, aunque Claude haga lo demás (la API de Claude no ofrece voz).",
      addOpenAI: "Añadir una clave de OpenAI",
      aiVoiceNote: "✦ Lo dice OpenAI con tu clave, palabra a palabra; la primera vez tarda un segundo. Cada palabra se guarda en este iPhone, así que se paga una vez. Se cuenta en Ajustes de IA › Uso de tokens como “Read aloud”.",
      loadModelsNote: "Carga tus modelos de OpenAI en Ajustes de IA para ver todos los modelos de voz.",
      aiVoiceFailed: (m) => `La voz IA falló (${m}). Se usó la voz del iPhone.`,
      bookWords: "Palabras de libros",
      photoUnreadable: "No se pudo abrir la foto. Prueba con otra.",
      bookHint: "Haz una foto de una página. La IA la lee y elige palabras que un niño reconoce en un dibujo.",
      aiBadge: "✦ IA",
      takePhoto: "Hacer foto",
      fromPhotos: "De fotos",
      readingPage: "Leyendo la página…",
      bookMode: "Palabras de libros en el juego",
      modeMix: "Mezcladas",
      modeFirst: "Primero",
      modeOff: "No",
      sourceWords: (n) => `${n} palabras`,
      noBooks: "Aún no hay palabras de libros.",
      reviewTitle: "Palabras nuevas de la página",
      reviewHint: "Toca una palabra para quitarla.",
      addWords: (n) => `Añadir ${n} palabras`,
      sourceName: "Nombre",
      recognized: "Texto reconocido",
      noNewWords: "No se encontraron palabras nuevas con dibujo en esta página.",
      langUnsupported: "Este texto no está en lituano, inglés ni español.",
      wordsAdded: (n) => `✅ ${n} palabras añadidas`,
      alreadyKnown: (n) => `${n} ya están en el juego`,
      readAloud: "Leer palabras en voz alta",
      speakOff: "No",
      speakShown: "Al mostrar",
      speakAfter: "Tras responder",
      hearWord: "Escuchar la palabra",
      voiceFound: (l, name) => `Voz (${l}): ${name}`,
      voiceMissing: (l) => `No hay voz en ${l} en este iPhone. Añádela en Ajustes › Accesibilidad › Contenido leído › Voces.`,
      langNames: { lt: "lituano", en: "inglés", es: "español" },
      coach: "Entrenador IA",
      askCoach: "Preguntar al entrenador IA",
      coachBusy: "El entrenador está pensando…",
      coachNeedsWords: "Tras 10 palabras el entrenador podrá sugerir qué practicar.",
      coachBy: (prov, date) => `✦ Entrenador IA de ${prov} · ${date}`,
      coachFocus: "Practicará ahora",
      coachAdded: (n) => `+${n} palabras nuevas`,
      coachSource: (name) => `✦ Entrenador IA · ${name}`,
      wordsStats: (m, l, h) => `Palabras: ${m} dominadas · ${l} aprendiendo · ${h} difíciles`,
      builtWith: "Construido con",
      confirm: "Confirmar",
      aiFailed: (m) => `Error de IA: ${m}`,
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
      funny: "Linksmos animacijos",
      tipsSet: "Patarimai ir padrąsinimai",
      tipsSetHelp: "Trumpi sakiniai žaidžiant: kaip skaityti geriau, ir pagyrimai",
      coachHello: "Pirmyn, skaitom! 📖",
      tipGuess: ["Pirma perskaityk visą žodį 👀", "Perskaityk, tada spausk 👀", "Neskubėk, skaityk iki galo 👀"],
      tipSyl: (s) => `Skaityk lėtai: ${s}`,
      tipEnd: (l) => `Visi iš raidės ${l}. Skaityk iki galo!`,
      tipLoud: "Pasakyk žodį garsiai 🗣️",
      tipHear: "Nesiseka? Paspausk 🔊 ir išgirsk",
      tipLetters: "Rodyk pirštu kiekvieną raidę ☝️",
      tipBrave: "Drąsiai bandyk! Klaidos moko 🙂",
      cheerStreak: (n) => `${n} iš eilės! 🔥`,
      cheerBack: "Šaunus sugrįžimas! 💪",
      cheerTricky: "Įveikei sunkų žodį! 🧠",
      cheerLong: "Ilgą žodį perskaitei! 📏",
      cheerCareful: "Neskubėjai – ir pavyko! 🐢",
      cheerFast: "Žaibiškai perskaitei! ⚡",
      cheerGeneral: ["Puikiai skaitai! 📖", "Akylos akys! 👀", "Taip ir toliau, žvaigžde! ⭐", "Vis geriau ir geriau! 📈", "Skaitymas – tavo supergalia! 🦸"],
      funnyHelp: "Teisingas paveikslėlis suvaidina savo žodį",
      stickers: "Lipdukai",
      newSticker: "Naujas lipdukas!",
      shinySticker: "Blizgus lipdukas! ✨",
      nextSticker: (n) => (n === 1 ? "Dar 1 žodis iki lipduko!" : n < 10 ? `Dar ${n} žodžiai iki lipduko!` : `Dar ${n} žodžių iki lipduko!`),
      stickerCount: (n, all) => `${n} iš ${all} lipdukų`,
      stickersDone: "Visi lipdukai surinkti! Dabar jie bus blizgūs ✨",
      close: "Uždaryti",
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
      learning: "Mokymasis",
      smartOrder: "Išmani žodžių tvarka",
      smartOrderHint: "Dažniau kartoja sunkius žodžius, o išmoktus rodo rečiau. Be DI.",
      aiRowTitle: "Raktai, modeliai ir žetonų naudojimas",
      aiRowNoKey: "Pridėkite Claude arba OpenAI raktą, kad galėtumėte skaityti žodžius iš knygų nuotraukų ir naudoti DI trenerį",
      aiSettings: "DI nustatymai",
      tokensUsed: (n) => `panaudota ${n} žetonų`,
      inRounds: (a, n) => `Žaidžiama ${a} iš ${n} žodžių`,
      showWords: "Rodyti žodžius",
      allPlay: "Visi šie žodžiai bus žaidžiami.",
      stOk: "žaidžiama",
      stOff: "knygų žodžiai išjungti: Nustatymai › Mokymasis",
      stLang: (l) => `žaidžiama, kai žaidimas ${l} kalba`,
      stOnlyExpert: "tik ekspertams, o eksperto žaidėjo nėra",
      stOnlyBeginner: "tik pradedantiesiems, o pradedančiojo žaidėjo nėra",
      stNear: (L, m) => `mažai žodžių iš ${L}, todėl paveikslėlių iš gretimų raidžių: ${m}`,
      sylRange: (a, b) => (a === b ? `${a} skiem.` : `${a}–${b} skiemenys`),
      stNoLevel: "per ilgas ar per trumpas abiem lygiams (Nustatymai › Raundai)",
      listening: "Klausymas",
      autoVoice: "Automatiškai (geriausias kalbai balsas)",
      voiceEngine: "Balso variklis",
      engDevice: "iPhone balsas",
      engAI: "✦ DI balsas",
      voice: "Balsas",
      voiceFor: (l) => `Balsas ${l} žodžiams`,
      gAll: "Visi", gFemale: "Moteriški", gMale: "Vyriški", gF: " (moteriškas)", gM: " (vyriškas)", gN: " (neutralus)",
      speechModel: "Kalbos modelis",
      howSound: "Kaip turi skambėti",
      howSoundPh: "pvz., Šiltai, lėtai ir labai aiškiai, kaip mokytoja skaito 5 metų vaikui.",
      legacyNote: "tts-1 modeliai nepriima stiliaus nurodymų ir gali tarti žodžius angliškai. Lietuviškai ir ispaniškai geriausiai skaito gpt-4o-mini-tts.",
      speed: "Greitis", slow: "Lėtai", normal: "Įprastai", fast: "Greitai", faster: "Greičiau",
      pitch: "Aukštis", lower: "Žemiau", higher: "Aukščiau",
      testVoice: "Išbandyti balsą",
      voicesCount: (n) => `Šiame iPhone balsų: ${n}`,
      noVoices: "Šis iPhone skaito sistemos balsu. Jį galite pasirinkti iOS Nustatymai › Prieinamumas › Ištariamas turinys.",
      moreVoices: "Natūralesni balsai: iOS Nustatymai › Prieinamumas › Ištariamas turinys › Balsai. Atsisiųskite patobulintą (Enhanced) ar Premium balsą ir jis atsiras čia.",
      aiVoiceTip: "Nėra balso jūsų kalbai? ✦ DI balsas (OpenAI) gali ją skaityti.",
      aiVoiceNeedsKey: "DI balsai yra iš OpenAI, todėl reikia OpenAI rakto, net jei kitoms DI funkcijoms naudojate Claude (Claude API neturi kalbos sintezės).",
      addOpenAI: "Pridėti OpenAI raktą",
      aiVoiceNote: "✦ Ištaria OpenAI su jūsų raktu, po vieną žodį; pirmą kartą žodis ištariamas per sekundę. Kiekvienas žodis išsaugomas šiame iPhone, todėl mokama tik kartą. Skaičiuojama DI nustatymuose › žetonų naudojimas kaip „Read aloud“.",
      loadModelsNote: "DI nustatymuose įkelkite OpenAI modelius, kad matytumėte visus kalbos modelius.",
      aiVoiceFailed: (m) => `DI balsas nepavyko (${m}). Naudotas iPhone balsas.`,
      bookWords: "Žodžiai iš knygų",
      photoUnreadable: "Nepavyko atidaryti nuotraukos. Pabandykite kitą.",
      bookHint: "Nufotografuokite puslapį. DI jį perskaitys ir atrinks žodžius, kuriuos vaikas atpažins paveikslėlyje.",
      aiBadge: "✦ DI",
      takePhoto: "Fotografuoti",
      fromPhotos: "Iš nuotraukų",
      readingPage: "Skaitomas puslapis…",
      bookMode: "Knygų žodžiai žaidime",
      modeMix: "Kartu",
      modeFirst: "Pirmiausia",
      modeOff: "Išjungta",
      sourceWords: (n) => `žodžiai: ${n}`,
      noBooks: "Knygų žodžių dar nėra.",
      reviewTitle: "Nauji žodžiai iš puslapio",
      reviewHint: "Paspauskite žodį, kad jo nepridėtumėte.",
      addWords: (n) => `Pridėti žodžius (${n})`,
      sourceName: "Pavadinimas",
      recognized: "Atpažintas tekstas",
      noNewWords: "Šiame puslapyje naujų žodžių su paveikslėliais nerasta.",
      langUnsupported: "Šis tekstas ne lietuvių, anglų ar ispanų kalba.",
      wordsAdded: (n) => `✅ Pridėta žodžių: ${n}`,
      alreadyKnown: (n) => `jau žaidime: ${n}`,
      readAloud: "Ištarti žodžius",
      speakOff: "Ne",
      speakShown: "Kai parodomas",
      speakAfter: "Po atsakymo",
      hearWord: "Išklausyti žodį",
      voiceFound: (l, name) => `Balsas (${l}): ${name}`,
      voiceMissing: (l) => `Šiame iPhone nėra balso (${l}). Pridėkite: Nustatymai › Prieinamumas › Ištariamas turinys › Balsai.`,
      langNames: { lt: "lietuvių", en: "anglų", es: "ispanų" },
      coach: "DI treneris",
      askCoach: "Klausti DI trenerio",
      coachBusy: "Treneris galvoja…",
      coachNeedsWords: "Po 10 žodžių treneris galės patarti, ką praktikuoti.",
      coachBy: (prov, date) => `✦ DI treneris (${prov}) · ${date}`,
      coachFocus: "Toliau praktikuos",
      coachAdded: (n) => `+${n} nauji žodžiai`,
      coachSource: (name) => `✦ DI treneris · ${name}`,
      wordsStats: (m, l, h) => `Žodžiai: išmokta ${m} · mokosi ${l} · sunkūs ${h}`,
      builtWith: "Sukurta pagal",
      confirm: "Patvirtinti",
      aiFailed: (m) => `DI klaida: ${m}`,
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
  let usageAsk = !!init.usageAsk;   // the one-time usage question, for a parent only (usage-analytics)
  const usageEvent = (params) => send("usage-event", params);
  const CFG = Object.assign({ beginnerPics: 3, expertPics: 5, beginnerMinSyl: 1, beginnerMaxSyl: 2, expertMinSyl: 3, expertMaxSyl: 6, stickerEvery: 5 }, init.cfg || {});
  const state = {
    version: 1,
    lang: LANGS[init.lang] ? init.lang : detectLang(),
    pinHash: init.pinHash || null,
    settings: Object.assign({ wordCase: "cap", sound: true, fun: true, tips: true, currency: "EUR", smart: true, bookMode: "mix" }, init.settings || {}),
    kids: (Array.isArray(init.kids) ? init.kids : []).filter((k) => k && typeof k === "object").map(normalizeKid),
    // Words added from book photos and by the AI coach: [{ id, lang, title, at, by, coachKid?, words: [{ w, e }] }]
    books: (Array.isArray(init.books) ? init.books : []).filter((b) => b && LANGS[b.lang] && Array.isArray(b.words)),
    speakAfterDefault: true,   // 1.9.1: "After answer" became the default; switched on once for players still on Off
  };
  if (!init.speakAfterDefault) state.kids.forEach((k) => { if (k.speak === "off") k.speak = "after"; });
  // AI flags (ai-configuration): is there a key, and is the background job (AI coach) on. Kept fresh by useState().
  const AIX = { hasKey: !!(init.ai && init.ai.hasKey), on: !(init.ai && init.ai.on === false), hasOpenAI: !!(init.ai && init.ai.hasOpenAI) };
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
      learn: k.learn && typeof k.learn === "object" ? k.learn : {}, // { lang: { word: { s, c, w, b, t } } }
      speak: ["off", "shown", "after"].indexOf(k.speak) >= 0 ? k.speak : "after",   // new players hear the word after answering
      coach: k.coach && typeof k.coach === "object" ? k.coach : null,
      answered: num(k.answered),
      stickers: normStickers(k.stickers),   // { have: [emoji, newest first], shiny: [emoji], pts: steps towards the next }
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
  window.__toast = toast;   // the Scriptable side's toast() (start-up notes)
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

  // ── Learning: per kid and word, spaced repetition (no AI). Boxes 0–5: 0 = hard, 5 = mastered ──
  const BOX_W = [6, 4, 2.5, 1.2, 0.6, 0.25];
  function peekStat(kid, w) {
    const M = (kid.learn || {})[state.lang];
    return M ? M[w] : null;
  }
  function wstat(kid, w) {
    const L = kid.learn || (kid.learn = {});
    const M = L[state.lang] || (L[state.lang] = {});
    return M[w] || (M[w] = { s: 0, c: 0, w: 0, b: 0, t: 0 });
  }
  function learnDone(kid, w, firstTry) {
    const st = wstat(kid, w);
    st.s++;
    st.t = Date.now();
    if (firstTry) {
      st.c++;
      st.b = Math.min(5, st.b + 1);
    }
  }
  function learnMiss(kid, w) {
    const st = wstat(kid, w);
    st.w++;
    st.b = Math.max(0, st.b - 2);
  }
  function learnSkip(kid, w) {
    const st = wstat(kid, w);
    st.s++;
    st.t = Date.now();
    st.b = Math.max(0, st.b - 1);
  }
  // Weighted pick: hard words most often, new words next, mastered words rarely; the AI coach's focus words
  // and (with "First") book words are boosted. Words seen in the last 6 rounds are left out.
  function smartPick(kid, pool) {
    const recent = game.recent || [];
    const coach = kid.coach && kid.coach.lang === state.lang ? kid.coach : null;
    const focus = new Set((coach && coach.focus) || []);
    const hardCount = pool.filter((x) => {
      const st = peekStat(kid, x.w);
      return st && st.s && st.b === 0 && st.w;   // hard = real mistakes, as in the parent zone
    }).length;
    const day = 864e5;
    let total = 0;
    const ws = pool.map((x) => {
      if (recent.indexOf(x.w) >= 0) return 0;
      const st = peekStat(kid, x.w);
      // hard (box 0 with real mistakes) weighs most; a word only skipped so far weighs like a new word
      const fresh = hardCount >= 6 ? 1 : 3;
      let wt = !st || !st.s || (st.b === 0 && !st.w) ? fresh : BOX_W[st.b];
      if (st && st.s && st.b >= 1 && Date.now() - st.t > day) wt *= 1.5;
      if (focus.has(x.w)) wt *= 2.5;
      if (x.src && !x.coachKid && state.settings.bookMode === "first") wt *= 3;
      if (x.coachKid === kid.id) wt *= 2;
      total += wt;
      return wt;
    });
    if (!total) return pickRand(pool);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= ws[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }
  function learnCounts(kid) {
    const M = (kid.learn || {})[state.lang] || {};
    let m = 0, l = 0, h = 0;
    Object.keys(M).forEach((w) => {
      const st = M[w];
      if (!st.s) return;
      if (st.b >= 4) m++;
      else if (st.b === 0 && st.w) h++;
      else l++;
    });
    return { m, l, h, seen: m + l + h };
  }

  // ── Read words aloud (app-blueprints · read-aloud 1.0.1: voices, AI voice, Settings › Listening) ──
  // iPhone voices through Web Speech (the chosen voice per game language, else the best one for it), or ✦ OpenAI
  // voices through the Scriptable side (ttsaudio). Scriptable's Speech is the last fallback.
  const SYN = window.speechSynthesis;
  const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Pipe Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Deranged|Hysterical)\b/i;
  const GENDER = {};
  ("Samantha Karen Moira Tessa Fiona Veena Victoria Allison Ava Susan Zoe Nicky Kate Serena Martha Catherine Isha Agnes Kathy Princess Vicki Joelle Flo Sandy Shelley Grandma " +
   "Amélie Audrey Aurélie Marie Anna Petra Helena Alice Federica Paulina Mónica Monica Marisol Luciana Joana Milena Katya Yuna Kyoko Ting-Ting Tingting Sin-ji Mei-Jia Meijia " +
   "Lekha Sara Nora Ellen Laura Zuzana Ioana Mariska Melina Yelda Damayanti Kanya Lesya Carmit Laila Amira Tünde Linh Montse Ewa Zosia Iveta Lana Satu Klara Alva Kristina Ellen Soumya Vani")
    .split(" ").forEach((n) => (GENDER[n] = "f"));
  ("Daniel Alex Fred Aaron Arthur Rishi Oliver Tom Gordon Lee Evan Nathan Rocko Eddy Reed Ralph Grandpa Thomas Jacques Markus Yannick Luca Diego Jorge Juan Carlos Felipe Xander " +
   "Maged Majed Tarik Otoya Hattori Li-mu Yu-shu Aman Neel Dariush Rodrigo Martin Henrik Magnus Oskar Viktor")
    .split(" ").forEach((n) => (GENDER[n] = "m"));
  const baseName = (v) => v.name.replace(/\s*\((Enhanced|Premium|Compact)\)/i, "").replace(/\s*\(.*\)\s*$/, "").trim();
  const genderOf = (v) => GENDER[baseName(v)] || "";
  const quality = (v) => /premium/i.test(v.name + v.voiceURI) ? "Premium" : /enhanced/i.test(v.name + v.voiceURI) ? "Enhanced" : "";
  const langName = (code) => { try { return new Intl.DisplayNames([LANGS[state.lang].locale], { type: "language" }).of(code) || code; } catch (e) { return code; } };
  const OAI_VOICES = [["alloy", "n"], ["ash", "m"], ["ballad", "m"], ["coral", "f"], ["echo", "m"], ["fable", "m"], ["nova", "f"], ["onyx", "m"], ["sage", "f"], ["shimmer", "f"], ["verse", "m"], ["marin", "f"], ["cedar", "m"]];
  const LEGACY_TTS = new Set(["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"]);
  let voices = [];
  function loadVoices() {
    try {
      voices = SYN ? SYN.getVoices().filter((v) => !NOVELTY.test(v.name)) : [];
    } catch (e) {
      voices = [];
    }
    try { if (cfgIsOpen) renderCfg(); } catch (e) {}   // settings blueprint: re-render Settings if it is open (declared further down)
  }
  if (SYN) {
    loadVoices();
    try {
      if (SYN.addEventListener) SYN.addEventListener("voiceschanged", loadVoices);
      else SYN.onvoiceschanged = loadVoices;
    } catch (e) {}
  }
  const sameLang = (v, locale) => String(v.lang || "").toLowerCase().replace("_", "-").indexOf(locale.slice(0, 2).toLowerCase()) === 0;
  // The voice for a game language: the parent's pick for it, else the best (Premium, Enhanced) voice for that language.
  function voiceFor(locale, lang) {
    const saved = (state.settings.voiceURIs || {})[lang || state.lang];
    const v0 = saved && voices.find((v) => v.voiceURI === saved);
    if (v0) return v0;
    const rank = (v) => (quality(v) === "Premium" ? 3 : quality(v) === "Enhanced" ? 2 : 0) + (String(v.lang).replace("_", "-") === locale ? 0.5 : 0);
    return voices.filter((v) => sameLang(v, locale)).sort((a, b) => rank(b) - rank(a))[0] || null;
  }
  const SILENT = (() => {   // 0.1 s of silence as a WAV, to unlock audio inside the tap
    const n = 800, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer);
    const w = (o, t0) => { for (let i = 0; i < t0.length; i++) buf[o + i] = t0.charCodeAt(i); };
    w(0, "RIFF"); dv.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, "data"); dv.setUint32(40, n, true); buf.fill(128, 44);
    let str = ""; buf.forEach((x) => { str += String.fromCharCode(x); }); return "data:audio/wav;base64," + btoa(str);
  })();
  const au = new Audio(); au.preload = "auto"; au.setAttribute("playsinline", "");
  let audioUnlocked = false;
  function unlockAudio() {   // iOS lets audio start only inside a tap: play silence once, then the same element plays later
    if (audioUnlocked) return;
    try { au.src = SILENT; const pr = au.play(); if (pr && pr.catch) pr.catch(() => {}); audioUnlocked = true; } catch (e) {}
    // and speech: one silent utterance inside the tap lets later words (after the success sound) be spoken
    try { if (SYN && window.SpeechSynthesisUtterance) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; SYN.speak(u); } } catch (e) {}
  }
  const aiAudio = {};   // word → MP3 for this session (the Scriptable side also keeps them on the phone)
  let sayToken = 0;
  function deviceSay(text) {
    const locale = LANGS[state.lang].locale;
    try {
      if (SYN && window.SpeechSynthesisUtterance) {
        SYN.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = locale;
        const v = voiceFor(locale);
        if (v) u.voice = v;
        u.rate = Math.max(0.5, (+state.settings.voiceRate || 0.85) * 0.95);
        u.pitch = +state.settings.voicePitch || 1;
        SYN.speak(u);
        return;
      }
    } catch (e) {}
    send("say", { text, lang: locale });
  }
  function playMp3(b64) {
    au.src = "data:audio/mpeg;base64," + b64;
    const pr = au.play();
    if (pr && pr.catch) pr.catch(() => {});
  }
  // onFail: what to do if the AI voice can't speak (the game falls back to the iPhone voice; the Settings test says why)
  function speakWord(w, onFail) {
    const text = String(w).replace(/-/g, "");
    const my = ++sayToken;
    try { if (SYN) SYN.cancel(); au.pause(); } catch (e) {}
    if (state.settings.speechEngine === "ai" && AIX.hasOpenAI) {
      const key = state.lang + "|" + text;
      if (aiAudio[key]) return playMp3(aiAudio[key]);
      send("ttsaudio", { text, lang: state.lang }, (ok, res) => {
        if (my !== sayToken) return;   // another word came meanwhile
        if (ok && res) {
          aiAudio[key] = res;
          playMp3(res);
        } else {
          deviceSay(text);
          if (onFail) onFail(res);
        }
      });
      return;
    }
    deviceSay(text);
  }

  // Settings › Listening (read-aloud blueprint, listenHTML), in the game's language
  const SPK = "🔊 ";
  function listenSecHTML() {
    const sv = SET.settings, eng = sv.speechEngine === "ai" ? "ai" : "device";
    const vseg = (k, opts) => `<div class="seg wide">${opts.map(([v, l]) => `<button class="${String(sv[k]) === String(v) ? "on" : ""}" data-act="voiceset" data-k="${k}" data-v="${v}">${esc(l)}</button>`).join("")}</div>`;
    return `<h3 class="sec">${esc(t("listening"))}</h3>
      <div class="lk-row"><span class="lk-l">${esc(t("voiceEngine"))}</span>${vseg("speechEngine", [["device", t("engDevice")], ["ai", t("engAI")]])}</div>` +
      (eng === "ai" ? aiListenHTML(vseg) : deviceListenHTML(vseg));
  }
  function aiListenHTML(vseg) {
    const sv = SET.settings;
    if (!SET.hasOpenAI) return `<p class="hint">${esc(t("aiVoiceNeedsKey"))}</p>
      <div class="aic-btns"><button class="sm primary" data-act="aiopen">${esc(t("addOpenAI"))}</button></div>`;
    const model = sv.ttsModel || "gpt-4o-mini-tts", legacy = /^tts-1/.test(model), g = sv.voiceGender || "all";
    const vs = OAI_VOICES.filter(([v, gg]) => (!legacy || LEGACY_TTS.has(v)) && (g === "all" || gg === g || v === sv.ttsVoice));
    const loaded = ((SET.ttsModels || {}).list || []).map((m) => m.id);
    const mlist = [model].concat(loaded.length ? loaded : ["gpt-4o-mini-tts", "tts-1-hd", "tts-1"]).filter((x, i, a) => a.indexOf(x) === i);
    const gl = { f: t("gF"), m: t("gM"), n: t("gN") };
    return `<div class="lk-row"><span class="lk-l">${esc(t("voice"))}</span>${vseg("voiceGender", [["all", t("gAll")], ["f", t("gFemale")], ["m", t("gMale")]])}
        <select class="ttsvoicesel voicesel" aria-label="${esc(t("voice"))}">${vs.map(([v, gg]) => `<option value="${v}" ${v === sv.ttsVoice ? "selected" : ""}>${v[0].toUpperCase() + v.slice(1)}${gl[gg]}</option>`).join("")}</select></div>
      <div class="lk-row"><span class="lk-l">${esc(t("speechModel"))}</span><select class="ttsmodelsel voicesel" aria-label="${esc(t("speechModel"))}">${mlist.map((m) => `<option value="${esc(m)}" ${m === model ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></div>
      ${legacy ? `<p class="hint">${esc(t("legacyNote"))}</p>` : `<div class="lk-row"><span class="lk-l">${esc(t("howSound"))}</span><textarea class="ttsinstr cfgsel" rows="3" maxlength="500" placeholder="${esc(t("howSoundPh"))}">${esc(sv.ttsInstructions || "")}</textarea></div>`}
      <div class="lk-row"><span class="lk-l">${esc(t("speed"))}</span>${vseg("voiceRate", [[0.85, t("slow")], [1, t("normal")], [1.15, t("fast")], [1.3, t("faster")]])}</div>
      <div class="aic-btns"><button class="sm" data-act="voicetest">${SPK}${esc(t("testVoice"))}</button><span class="note" id="voicemsg"></span></div>
      <p class="hint">${esc(t("aiVoiceNote"))}${loaded.length ? "" : " " + esc(t("loadModelsNote"))}</p>`;
  }
  function deviceListenHTML(vseg) {
    const lname = t("langNames")[state.lang], locale = LANGS[state.lang].locale;
    if (!SYN || !voices.length) return `<p class="hint">${esc(t("noVoices"))}</p>`;
    const sv = SET.settings, g = sv.voiceGender || "all";
    const savedURI = (state.settings.voiceURIs || {})[state.lang];
    const cur = savedURI ? voices.find((v) => v.voiceURI === savedURI) || null : null;   // null = Automatic
    const shown = voices.filter((v) => g === "all" || genderOf(v) === g || v === cur);
    const langs = {};
    shown.forEach((v) => (langs[v.lang] = langs[v.lang] || []).push(v));
    const rankLang = (l) => (sameLang({ lang: l }, locale) ? 0 : /^en/i.test(l) ? 50 : 100);
    const order = Object.keys(langs).sort((x, y) => rankLang(x) - rankLang(y) || langName(x).localeCompare(langName(y)));
    const label = (v) => `${baseName(v)}${quality(v) ? " — " + quality(v) : ""}${genderOf(v) ? (genderOf(v) === "f" ? t("gF") : t("gM")) : ""}`;
    const hasLang = voices.some((v) => sameLang(v, locale));
    return `${hasLang ? "" : `<p class="hint warnhint">${esc(t("voiceMissing", lname))}</p>`}
      <div class="lk-row"><span class="lk-l">${esc(t("voiceFor", lname))}</span>${vseg("voiceGender", [["all", t("gAll")], ["f", t("gFemale")], ["m", t("gMale")]])}
      <select class="voicesel devvoicesel" aria-label="${esc(t("voice"))}"><option value="" ${cur ? "" : "selected"}>${esc(t("autoVoice"))}${!cur && voiceFor(locale) ? " — " + esc(baseName(voiceFor(locale))) : ""}</option>${order.map((l) => `<optgroup label="${esc(langName(l))} (${esc(l)})">${langs[l].map((v) => `<option value="${esc(v.voiceURI)}" ${cur && v.voiceURI === cur.voiceURI ? "selected" : ""}>${esc(label(v))}</option>`).join("")}</optgroup>`).join("")}</select></div>
      <div class="lk-row"><span class="lk-l">${esc(t("speed"))}</span>${vseg("voiceRate", [[0.85, t("slow")], [1, t("normal")], [1.15, t("fast")], [1.3, t("faster")]])}</div>
      <div class="lk-row"><span class="lk-l">${esc(t("pitch"))}</span>${vseg("voicePitch", [[0.85, t("lower")], [1, t("normal")], [1.15, t("higher")]])}</div>
      <div class="aic-btns"><button class="sm" data-act="voicetest">${SPK}${esc(t("testVoice"))}</button><span class="note">${esc(t("voicesCount", voices.length))}</span></div>
      <p class="hint">${esc(t("moreVoices"))}${AIX.hasOpenAI ? "" : " " + esc(t("aiVoiceTip"))}</p>`;
  }

  // ── AI state: the Settings state carries it (ai-configuration Step 6); S is what the AI sheet renders ──
  let S = null;
  window.__toast = function (m) {
    toast(m);
  };

  // ── AI settings sheet (ai-configuration blueprint, Step 7) ──
  let aiOpen = false, aiArmed = null;
  const aiLoading = new Set();
  const PN = { anthropic: "Claude", openai: "OpenAI" };
  const FEAT = { books: "Words from book photos", coach: "AI coach", speech: "Read aloud", test: "Connection tests", other: "Other" };
  const fmtN = (n) => n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e4 ? Math.round(n / 1e3) + "k" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n);
  function rel(ts) {
    const m = Math.round((Date.now() - ts) / 60000);
    return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago";
  }
  function arm(key) {
    aiArmed = key;
    renderAI();
    setTimeout(() => {
      if (aiArmed === key) {
        aiArmed = null;
        renderAI();
      }
    }, 3500);
  }
  function usageBlock(p, P) {
    const days = [], now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    const tot = (k) => { const x = P.days[k]; return x ? x.in + x.out : 0; };
    const max = Math.max(1, ...days.map(tot)), month = S.ai.today.slice(0, 7);
    const monthTot = Object.entries(P.days).filter(([k]) => k.startsWith(month)).reduce((n, [, x]) => n + x.in + x.out, 0);
    const rows = (obj, label) => Object.entries(obj).sort((x, y) => (y[1].in + y[1].out) - (x[1].in + x[1].out))
      .map(([k, x]) => `<tr><td>${esc(label(k))}</td><td>${x.calls}</td><td>${fmtN(x.in)}</td><td>${fmtN(x.out)}</td></tr>`).join("");
    return `<div class="ucard"><div class="aic-h"><b>${PN[p]}</b><span class="muted small">${P.calls} request${P.calls === 1 ? "" : "s"}</span></div>
      <div class="ustat"><div><b>${fmtN(P.in + P.out)}</b><small>total tokens</small></div><div><b>${fmtN(P.in)}</b><small>input</small></div><div><b>${fmtN(P.out)}</b><small>output</small></div></div>
      <p class="note">Today ${fmtN(tot(S.ai.today))} tokens — this month ${fmtN(monthTot)} tokens</p>
      <div class="ubars" aria-label="Tokens per day, last 14 days">${days.map((k) => `<span style="height:${Math.max(tot(k) ? 6 : 2, tot(k) / max * 100)}%" class="${tot(k) ? "" : "zero"}" title="${k}: ${tot(k)} tokens"></span>`).join("")}</div>
      <div class="ubars-l"><span>2 weeks ago</span><span>Today</span></div>
      <table class="utab"><tr><th>Feature</th><th>Requests</th><th>In</th><th>Out</th></tr>${rows(P.features, (k) => FEAT[k] || k)}</table>
      <table class="utab"><tr><th>Model</th><th>Requests</th><th>In</th><th>Out</th></tr>${rows(P.models, (k) => k)}</table></div>`;
  }
  const aiSheet = () => {
    let el = document.getElementById("aisheet");
    if (!el) {
      el = document.createElement("div"); el.id = "aisheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "AI");
      document.body.appendChild(el);
      el.addEventListener("click", aiClick);
      el.addEventListener("change", (e) => {
        e.stopPropagation();
        if (e.target.classList.contains("modelsel")) sendAI("aimodel", { p: e.target.dataset.p, v: e.target.value });
      });
    }
    return el;
  };
  // AI sheet actions answer with the fresh Settings state (keys masked)
  const sendAI = (action, params) => send(action, params, (ok, st) => { if (ok && st && st.cfgSchema) useState(st); aiLoading.clear(); renderAI(); renderCfg(); });
  function aiClick(e) {
    e.stopPropagation();   // the sheet's taps never reach the game or Settings
    if (e.target.closest("select, option, input, textarea")) return;
    const t0 = e.target.closest("[data-act]");
    if (!t0 || t0.disabled) return;
    const act = t0.dataset.act, v = t0.dataset.v;
    switch (act) {
      case "aiclose": aiOpen = false; renderAI(); renderCfg(); break;
      case "aikey": case "aitest": case "aiprov": sendAI(act, { v }); break;
      case "aimodels": aiLoading.add(v); renderAI(); sendAI("aimodels", { v }); break;
      case "airm": if (aiArmed === "rm" + v) { aiArmed = null; sendAI("airm", { v }); } else arm("rm" + v); break;
      case "usagereset": if (aiArmed === "reset") { aiArmed = null; sendAI("usagereset", {}); } else arm("reset"); break;
      case "toggle": if (v === "ai") { SET.settings.ai = !SET.settings.ai; renderAI(); sendAI("set", { k: "ai", v: SET.settings.ai }); } break;
    }
  }
  function renderAI() {
    const el = aiSheet();
    const keep = el.scrollTop;
    el.classList.toggle("open", aiOpen && !!(S && S.ai));
    if (!aiOpen || !S || !S.ai) return;
    const A = S.ai;
    const card = (p) => {
      const key = A.keys[p], ml = (A.models[p] || {}).list || [], cur = A.model[p];
      const opts = ml.some((m) => m.id === cur) ? ml : [{ id: cur, name: cur }].concat(ml);   // keep the chosen model visible
      return `<div class="aicard ${A.provider === p ? "active" : ""}">
        <div class="aic-h"><b>${PN[p]}</b>${A.provider === p ? `<span class="badge-ai">In use</span>` : key ? `<button class="sm" data-act="aiprov" data-v="${p}">Use ${PN[p]}</button>` : ""}</div>
        <div class="aic-row"><span class="lbl">API key</span>${key ? `<code>${esc(key)}</code>` : `<span class="muted">Not set</span>`}</div>
        <div class="aic-btns"><button class="sm ${key ? "" : "primary"}" data-act="aikey" data-v="${p}">${key ? "Change key" : "Add key"}</button>
          ${key ? `<button class="sm" data-act="aitest" data-v="${p}">Test connection</button><button class="sm danger ${aiArmed === "rm" + p ? "armed" : ""}" data-act="airm" data-v="${p}">${aiArmed === "rm" + p ? "Confirm" : "Remove"}</button>` : ""}</div>
        <label class="aic-row lbl" for="ms-${p}">Model</label>
        <select id="ms-${p}" class="modelsel" data-p="${p}">${opts.map((m) => `<option value="${esc(m.id)}" ${m.id === cur ? "selected" : ""}>${esc(m.name)}${m.name !== m.id ? " — " + esc(m.id) : ""}</option>`).join("")}</select>
        <div class="aic-btns"><button class="sm" data-act="aimodels" data-v="${p}" ${key && !aiLoading.has(p) ? "" : "disabled"}>${aiLoading.has(p) ? "Loading…" : ml.length ? "Refresh model list" : "Load my models"}</button>
          <span class="note">${ml.length ? `${ml.length} models, updated ${rel(A.models[p].at)}` : key ? "Loads the models your key can use" : "Add a key to load models"}</span></div>
      </div>`;
    };
    const order = A.provider === "openai" ? ["openai", "anthropic"] : ["anthropic", "openai"];
    const used = Object.keys(A.usage.p).filter((p) => A.usage.p[p].calls);
    el.innerHTML = `<div class="sh-head"><h2>AI</h2><button class="link" data-act="aiclose">Done</button></div><div class="sh-body">
      <p class="hint">Keys stay in this iPhone's Keychain. Only the provider marked “In use” is called.</p>
      ${order.map(card).join("")}
      <h3 class="sec">What AI does</h3>
      <div class="srow"><div class="grow"><b>AI coach</b><small class="muted">After every 40 words a kid answers, one request suggests their next practice words and a tip for you. Words from book photos run only when you take a photo.</small></div>
        <button class="switch ${S.settings.ai ? "on" : ""}" data-act="toggle" data-v="ai" aria-label="AI coach"></button></div>
      <h3 class="sec">Token usage</h3>
      ${used.length ? used.map((p) => usageBlock(p, A.usage.p[p])).join("") : `<p class="muted pad">No AI requests yet.</p>`}
      ${used.length ? `<div class="aic-btns"><span class="note">Counting since ${new Date(A.usage.since).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
        <button class="sm danger ${aiArmed === "reset" ? "armed" : ""}" data-act="usagereset">${aiArmed === "reset" ? "Confirm reset" : "Reset counters"}</button></div>` : ""}
    </div>`;
    el.scrollTop = keep;   // re-renders must not jump the user back to the top
  }

  // ── Words from a book photo: AI reads the page, the parent reviews, words join the game ──
  let book = null; // { busy, lang, title, text, by, words: [{ w, e, n, known, on }] }
  let bookArmed = null;
  const EMOJI_RE = /\p{Extended_Pictographic}/u;
  // Checks AI words: letters and "-" only, 1–6 syllables, one emoji; marks words the game already has.
  function cleanAiWords(list, lang) {
    const loc = LANGS[lang] ? LANGS[lang].locale : "en";
    const have = new Set(wordsFor(lang, true).map((x) => x.w.replace(/-/g, "")));
    const seen = new Set(), out = [];
    (Array.isArray(list) ? list : []).forEach((x) => {
      if (!x) return;
      const w = String(x.word || "").trim().toLocaleLowerCase(loc).replace(/[·‧–—]/g, "-").replace(/\s+/g, "");
      const segs = w.split("-");
      if (segs.length < 1 || segs.length > 6 || segs.some((sg) => !/^\p{L}+$/u.test(sg))) return;
      const plain = segs.join("");
      if (plain.length < 2 || seen.has(plain)) return;
      const e = String(x.emoji || "").trim();
      if (!e || !EMOJI_RE.test(e) || /[\p{L}\d]/u.test(e.replace(/[\u20E3\uFE0F]/g, "")) || [...e].length > 8) return;
      seen.add(plain);
      out.push({ w: segs.join("-"), e, n: segs.length, known: have.has(plain) });
    });
    return out;
  }
  // Why a book word is (or isn't) in rounds right now. Blocking: book words Off, another language, no player at its
  // level. Informational: few words share its letter, so some pictures come from nearby letters.
  const levelsOfWord = (x) => ["beginner", "expert"].filter((l) => fitsLevel(l, x));
  const levelOfWord = (x) => { const ls = levelsOfWord(x), kids = ls.filter((l) => state.kids.some((k) => k.level === l)); return kids[0] || ls[0] || "none"; };
  const levelIcons = (x) => levelsOfWord(x).map((l) => (l === "expert" ? "🦉" : "🐣")).join("") || "—";
  function wordNotes(x, lang, extra) {
    const notes = [];
    const lvl = levelOfWord(x);
    if (state.settings.bookMode === "off") notes.push({ k: "off", block: true, text: t("stOff") });
    if (lang !== state.lang) notes.push({ k: "lang", block: true, text: t("stLang", t("langNames")[lang]) });
    if (lvl === "none") notes.push({ k: "level", block: true, text: t("stNoLevel") });
    else if (!state.kids.some((k) => k.level === lvl)) notes.push({ k: "level", block: true, text: t(lvl === "expert" ? "stOnlyExpert" : "stOnlyBeginner") });
    const k = x.k || firstLetter(lang, x.w);
    const partners = wordsFor(lang, true).concat(extra || [])
      .filter((o) => (o.k || firstLetter(lang, o.w)) === k && o.w !== x.w && o.e !== x.e).length;   // pictures may be any level, as in rounds
    const need = (lvl === "expert" ? CFG.expertPics : CFG.beginnerPics) - 1;   // "none": no level fits, partners don't matter
    if (partners < need) notes.push({ k: "near", block: false, text: t("stNear", caseWord(k), need - partners) });
    return notes;
  }
  const noteIcon = { off: "⏸", lang: "🌐", level: "👤", near: "🔤" };
  function bookStats(b) {
    const words = b.words.map((x) => ({ w: x.w, e: x.e, n: x.w.split("-").length, k: firstLetter(b.lang, x.w) }));
    const notes = words.map((x) => wordNotes(x, b.lang));
    return { words, notes, playing: notes.filter((ns) => !ns.some((n) => n.block)).length };
  }
  window.__bookReading = function () {
    if (book) {
      book.busy = "reading";
      renderBook();
    }
  };
  // Under the review chips: which chosen words won't play yet, and which get nearby-letter pictures, with the reason.
  function reviewNotesHTML(list, chosen) {
    const rows = list.map((x) => ({ x, ns: wordNotes(x, book.lang, chosen) })).filter((r) => r.ns.length);
    if (!rows.length) return `<p class="bknote ok">✅ ${esc(t("allPlay"))}</p>`;
    const playing = list.length - rows.filter((r) => r.ns.some((n) => n.block)).length;
    return `<div class="bknotes"><p class="bknote"><b>${esc(t("inRounds", playing, list.length))}</b></p>
      ${rows.map((r) => `<p class="bknote ${r.ns.some((n) => n.block) ? "blocked" : ""}"><b>${r.x.e} ${esc(r.x.w)}</b> — ${r.ns.map((n) => noteIcon[n.k] + " " + esc(n.text)).join("; ")}</p>`).join("")}</div>`;
  }
  function renderBook() {
    let el = document.getElementById("booksheet");
    if (!el) {
      el = document.createElement("div"); el.id = "booksheet"; el.setAttribute("role", "dialog");
      document.body.appendChild(el);
    }
    el.classList.toggle("open", !!book);
    if (!book) {
      el.innerHTML = "";
      return;
    }
    if (book.busy) {
      el.innerHTML = `<div class="bkp"><div class="bkbusy"><div class="bkspin">📖</div><b>${esc(book.busy === "reading" ? t("readingPage") : "📷")}</b></div></div>`;
      return;
    }
    const fresh = book.words.filter((x) => !x.known);
    const on = fresh.filter((x) => x.on).length;
    const chosen = fresh.filter((x) => x.on).map((x) => ({ w: x.w, e: x.e, n: x.n, k: firstLetter(book.lang, x.w) }));
    const known = book.words.length - fresh.length;
    el.innerHTML = `<div class="bkp">
      <div class="bkhead"><span class="badge-ai">✦ AI by ${esc(book.by || "")}</span><span class="bkflag">${LANGS[book.lang].flag}</span></div>
      <h2 class="updt">${esc(t("reviewTitle"))}</h2>
      <label class="lbl" for="bookTitle">${esc(t("sourceName"))}</label>
      <input id="bookTitle" class="input" maxlength="40" value="${esc(book.title || "")}" autocomplete="off">
      ${fresh.length ? `<p class="upds">${esc(t("reviewHint"))}${known ? " · " + esc(t("alreadyKnown", known)) : ""}</p>
      <div class="bkwords">${book.words.map((x, i) => {
        if (x.known) return "";
        const ns = wordNotes(x, book.lang, chosen);
        const icons = ns.map((n) => noteIcon[n.k]).join("");
        return `<button class="bkw ${x.on ? "on" : ""} ${ns.some((n) => n.block) ? "blocked" : ""}" data-action="bookToggle" data-i="${i}"><span class="bke">${x.e}</span><span>${esc(x.w)}</span><span class="bklvl">${levelIcons(x)}${icons}</span></button>`;
      }).join("")}</div>
      ${reviewNotesHTML(fresh.filter((x) => x.on), chosen)}`
        : `<p class="upds">${esc(t("noNewWords"))}</p>`}
      ${book.text ? `<details class="bktext"><summary>${esc(t("recognized"))}</summary><p>${esc(book.text)}</p></details>` : ""}
      <div class="row">
        <button class="btn ghost" data-action="bookCancel">${esc(t("cancel"))}</button>
        <button class="btn go" data-action="bookAdd" ${on ? "" : "disabled"}>✅ ${esc(t("addWords", on))}</button>
      </div></div>`;
  }
  // The iPhone's own picker, opened by the page: Take a photo opens the camera, From photos the library.
  // (Scriptable's picker would open behind the full-screen game.) The photo is shrunk here to ≤ 1568 px.
  let bookImage = "";
  window.__takeBookImage = function () {
    const img = bookImage;
    bookImage = "";
    return img;
  };
  function bookPhoto(source) {
    const old = document.getElementById("bookfile");
    if (old) old.remove();
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.id = "bookfile";
    inp.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;opacity:0";
    if (source === "camera") inp.setAttribute("capture", "environment");
    inp.addEventListener("change", () => {
      const f = inp.files && inp.files[0];
      inp.remove();
      if (f) readBookFile(f);
    });
    document.body.appendChild(inp);
    inp.click(); // inside the tap, so iOS opens the picker
  }
  function readBookFile(f) {
    book = { busy: "reading" };
    renderBook();
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, 1568 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * k));
        c.height = Math.max(1, Math.round(img.naturalHeight * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        bookImage = c.toDataURL("image/jpeg", 0.85).split(",")[1] || "";
      } catch (e) {
        bookImage = "";
      }
      URL.revokeObjectURL(url);
      if (!bookImage) return bookFailed(t("photoUnreadable"));
      sendBook();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      bookFailed(t("photoUnreadable"));
    };
    img.src = url;
  }
  function bookFailed(msg) {
    book = null;
    bookImage = "";
    renderBook();
    toast(msg);
  }
  function sendBook() {
    send("bookphoto", { source: "page", lang: state.lang }, (ok, res) => {
      if (!ok) {
        book = null;
        renderBook();
        if (res !== "cancelled") toast(t("aiFailed", res));
        return;
      }
      const out = res && typeof res === "object" ? res : {};
      const lang = LANGS[out.lang] ? out.lang : null;
      if (!lang) {
        book = null;
        renderBook();
        toast(t("langUnsupported"));
        return;
      }
      const words = cleanAiWords(out.words, lang).map((x) => Object.assign(x, { on: true }));
      book = { lang, title: String(out.title || "").slice(0, 40), text: String(out.text || "").slice(0, 1200), by: out.by, words };
      renderBook();
    });
  }

  // ── AI coach: sends the kid's progress (no names), gets focus words, new words and a tip ──
  const coachBusy = {};
  function coachSummary(kid) {
    const lang = state.lang, M = (kid.learn || {})[lang] || {};
    const entries = Object.keys(M).map((w) => [w, M[w]]).filter(([, st]) => st.s || st.w);
    const plain = (w) => w.replace(/-/g, "");
    const hard = entries.filter(([, st]) => st.b === 0 && st.w).sort((a, b) => b[1].w - a[1].w).slice(0, 15)
      .map(([w, st]) => ({ w: plain(w), wrong: st.w, seen: st.s }));
    const mastered = entries.filter(([, st]) => st.b >= 4).sort((a, b) => a[1].t - b[1].t).map(([w]) => plain(w));
    const byLetter = {};
    entries.forEach(([w, st]) => {
      const k = firstLetter(lang, w);
      const L = byLetter[k] || (byLetter[k] = { seen: 0, wrong: 0 });
      L.seen += st.s;
      L.wrong += st.w;
    });
    const weakLetters = Object.keys(byLetter).filter((k) => byLetter[k].seen >= 3 && byLetter[k].wrong)
      .map((k) => ({ letter: k, wrongRate: Math.round((byLetter[k].wrong / byLetter[k].seen) * 100) }))
      .sort((a, b) => b.wrongRate - a.wrongRate).slice(0, 6);
    const seen = entries.reduce((n, [, st]) => n + st.s, 0);
    const first = entries.reduce((n, [, st]) => n + st.c, 0);
    return {
      lang, uiLang: state.lang, level: kid.level,
      ages: kid.level === "expert" ? "9-11" : "4-6", syllables: sylRange(kid.level).join(" to "),
      answered: seen, firstTryRate: seen ? Math.round((first / seen) * 100) : 0,
      hard, masteredCount: mastered.length, masteredSample: mastered.slice(-12), weakLetters,
      vocabulary: wordsFor(lang, true).filter((x) => fitsLevel(kid.level, x)).map((x) => plain(x.w)),
    };
  }
  function applyCoach(kid, res) {
    const lang = LANGS[res.lang] ? res.lang : state.lang;
    const fits = (x) => fitsLevel(kid.level, x);
    const words = cleanAiWords(res.words, lang).filter((x) => !x.known && fits(x));
    let src = state.books.find((b) => b.coachKid === kid.id && b.lang === lang);
    if (words.length) {
      if (!src) {
        src = { id: uid(), lang, title: t("coachSource", kid.name), at: Date.now(), by: res.by, coachKid: kid.id, words: [] };
        state.books.push(src);
      }
      src.words = src.words.concat(words.map((x) => ({ w: x.w, e: x.e }))).slice(-60);
      src.at = Date.now();
      src.by = res.by;
      booksChanged();
    }
    const byPlain = new Map(wordsFor(lang, true).map((x) => [x.w.replace(/-/g, ""), x.w]));
    const focus = (Array.isArray(res.focus) ? res.focus : []).map((f) => byPlain.get(String(f).replace(/-/g, "").trim().toLocaleLowerCase(LANGS[lang].locale))).filter(Boolean).slice(0, 8);
    kid.coach = { at: Date.now(), by: res.by, lang, note: String(res.note || "").slice(0, 600), focus, added: words.length, n: kid.answered };
    persist();
  }
  function runCoach(kid, auto) {
    if (coachBusy[kid.id]) return;
    coachBusy[kid.id] = true;
    if (view.name === "parent") render();
    send("coach", { summary: coachSummary(kid) }, (ok, res) => {
      coachBusy[kid.id] = false;
      if (ok) {
        try {
          applyCoach(kid, res || {});
        } catch (e) {
          if (!auto) toast(t("aiFailed", e.message));
        }
      } else if (!auto) toast(t("aiFailed", res));
      if (view.name === "parent") render();
    });
  }
  function maybeAutoCoach(kid) {
    if (!AIX.hasKey || !AIX.on || state.settings.smart === false) return;
    if (kid.answered - ((kid.coach && kid.coach.n) || 0) < 40 || learnCounts(kid).seen < 10) return;
    runCoach(kid, true);
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
  let wordCache = {};
  let booksRev = 0;
  function booksChanged() {
    booksRev++;
    wordCache = {};
  }
  // Every word of a language: built-in, then book and AI-coach words (book words leave out when "Off").
  function wordsFor(lang, all) {
    const key = lang + (all ? ":all" : "");
    if (!wordCache[key]) {
      const base = builtinWords(lang);
      const have = new Set(base.map((x) => x.w));
      const extra = [];
      state.books.forEach((b) => {
        if (b.lang !== lang || (!all && !b.coachKid && state.settings.bookMode === "off")) return;
        b.words.forEach((x) => {
          if (!x || !x.w || !x.e || have.has(x.w)) return;
          have.add(x.w);
          extra.push({ w: x.w, e: x.e, n: x.w.split("-").length, k: firstLetter(lang, x.w), src: b.id, coachKid: b.coachKid || null });
        });
      });
      wordCache[key] = base.concat(extra);
    }
    return wordCache[key];
  }
  const builtinCache = {};
  function builtinWords(lang) {
    if (!builtinCache[lang]) {

      const base = WORDS[lang].map((s) => s.split("|"));
      const more = MORE_WORDS.map((s) => {
        const parts = s.split("|");
        return [parts[MORE_COL[lang]], parts[0]];
      }).filter(([w]) => w);
      builtinCache[lang] = base.concat(more).map(([w, e]) => ({ w, e, n: w.split("-").length, k: firstLetter(lang, w) }));
    }
    return builtinCache[lang];
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
  // Word length per level, in syllables (Settings › Rounds); a range set backwards still works.
  function sylRange(level, def) {
    const a = def ? (level === "expert" ? 3 : 1) : +(level === "expert" ? CFG.expertMinSyl : CFG.beginnerMinSyl) || 1;
    const b = def ? (level === "expert" ? 6 : 2) : +(level === "expert" ? CFG.expertMaxSyl : CFG.beginnerMaxSyl) || 6;
    return [Math.min(a, b), Math.max(a, b)];
  }
  const fitsLevel = (level, w, def) => { const [lo, hi] = sylRange(level, def); return w.n >= lo && w.n <= hi; };
  const sylText = (level) => { const [lo, hi] = sylRange(level); return t("sylRange", lo, hi); };
  // Built-in words need enough same-letter partners; words you added from books (and the AI coach) always play:
  // when their letter is short of partners, the other pictures come from the nearest letters.
  function poolForN(kid, n) {
    const pick = (def) => wordsFor(state.lang).filter((w) => fitsLevel(kid.level, w, def) && (w.src || sameLetter(w).length >= n - 1));
    const list = pick(false);
    return list.length ? list : pick(true);   // a range with no words at all falls back to the level's original one
  }
  // The language's letters in alphabetical order, to find a letter's neighbours (z → ž, y, v…).
  const letterOrderCache = {};
  function letterIndex(lang, k) {
    const key = lang + booksRev;
    if (!letterOrderCache[key]) {
      const loc = LANGS[lang].locale;
      letterOrderCache[key] = Array.from(new Set(wordsFor(lang, true).map((x) => x.k))).sort((a, b) => a.localeCompare(b, loc));
    }
    const i = letterOrderCache[key].indexOf(k);
    return i < 0 ? 0 : i;
  }
  // Other pictures for a round: same letter first, then the nearest letters, nearest first.
  function distractorCandidates(word) {
    const same = shuffle(sameLetter(word));
    const at = letterIndex(state.lang, word.k);
    const rest = shuffle(wordsFor(state.lang).filter((o) => o.k !== word.k))
      .map((o) => [Math.abs(letterIndex(state.lang, o.k) - at), o])
      .sort((a, b) => a[0] - b[0])
      .map(([, o]) => o);
    return same.concat(rest);
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
  // The game screen is fixed to the phone's screen (no scrolling): the picture tiles shrink until everything fits
  // above the sticker shelf; on very small screens the hint line goes and the spacing tightens first.
  function fitGame() {
    const app = document.getElementById("app"), pics = app && app.querySelector(".pics");
    if (!pics || !pics.firstElementChild) return;
    const shelf = document.getElementById("shelf"), rows = Math.ceil(pics.children.length / 3), MIN = 52;
    const reset = (tight) => {
      app.classList.toggle("tight", tight);
      document.body.classList.toggle("tight-shelf", tight);
      document.documentElement.style.setProperty("--shelfH", (shelf ? shelf.offsetHeight : 0) + "px");
      pics.classList.remove("sized");
      pics.style.removeProperty("--tile");
    };
    const squeeze = () => {   // shrink the tiles until nothing scrolls; returns the tile size, 0 if even the smallest doesn't fit
      for (let i = 0; i < 5; i++) {
        const over = app.scrollHeight - app.clientHeight;
        if (over <= 0) return pics.firstElementChild.offsetWidth;
        const cur = pics.firstElementChild.offsetWidth;
        if (cur <= MIN) return 0;
        pics.classList.add("sized");
        pics.style.setProperty("--tile", Math.max(MIN, cur - Math.ceil(over / rows) - 1) + "px");
      }
      return app.scrollHeight <= app.clientHeight ? pics.firstElementChild.offsetWidth : 0;
    };
    reset(false);
    const roomy = squeeze();
    if (roomy >= 96) return;   // the normal layout fits with good-sized pictures
    reset(true);
    const tight = squeeze();
    if (roomy > tight) { reset(false); squeeze(); }   // the normal layout gave bigger pictures after all
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

  // ── Sound effects: the same little chimes, rendered once as WAV and played through an <audio> element.
  // Web Audio was unreliable on iPhone: the silent switch mutes it, it can be suspended between taps, and speech
  // starting at the same moment swallowed it. Each sound returns how long it lasts, so speech can wait for it.
  const sfxCache = {};
  function makeWav(freqs, dur, type) {
    const rate = 22050, step = dur * 0.8, total = (freqs.length - 1) * step + dur + 0.05;
    const n = Math.ceil(total * rate), pcm = new Float32Array(n);
    freqs.forEach((f, i) => {
      const s0 = Math.floor(i * step * rate), len = Math.floor(dur * rate);
      for (let j = 0; j < len && s0 + j < n; j++) {
        const tt = j / rate, ph = (f * tt) % 1;
        const wave = type === "sine" ? Math.sin(2 * Math.PI * ph) : 1 - 4 * Math.abs(ph - 0.5);   // triangle
        const env = tt < 0.02 ? tt / 0.02 : Math.pow(0.0004, (tt - 0.02) / Math.max(0.01, dur - 0.02));   // quick attack, exponential fade
        pcm[s0 + j] += wave * env * 0.32;
      }
    });
    const buf = new Uint8Array(44 + n * 2), dv = new DataView(buf.buffer);
    const w = (o, t0) => { for (let i = 0; i < t0.length; i++) buf[o + i] = t0.charCodeAt(i); };
    w(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
    let str = "";
    for (let i = 0; i < buf.length; i += 8192) str += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
    return { src: "data:audio/wav;base64," + btoa(str), ms: Math.round(total * 1000) };
  }
  const SFX = { win: [[523, 659, 784, 1047, 1319], 0.15, "triangle"], soft: [[523, 784], 0.15, "triangle"], bad: [[260, 196], 0.2, "sine"], key: [[880], 0.06, "sine"], sticker: [[784, 988, 1175, 1568, 1976], 0.1, "sine"] };
  const sfxAu = new Audio(); sfxAu.preload = "auto"; sfxAu.setAttribute("playsinline", "");
  let actx = null;
  function webAudioTone(freqs, dur, type) {   // fallback only, if the <audio> element can't play
    try {
      actx = actx && actx.state !== "closed" ? actx : new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state !== "running") actx.resume();
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type || "triangle"; o.frequency.value = f;
        const st = actx.currentTime + 0.02 + i * dur * 0.8;
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.25, st + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        o.connect(g); g.connect(actx.destination); o.start(st); o.stop(st + dur + 0.05);
      });
    } catch (e) {}
  }
  // Plays a sound effect inside the tap and returns its length in ms (0 when sounds are off).
  function sfx(name) {
    if (!state.settings.sound) return 0;
    const def = SFX[name];
    const snd = sfxCache[name] || (sfxCache[name] = makeWav(def[0], def[1], def[2]));
    try {
      sfxAu.pause();
      sfxAu.src = snd.src;
      sfxAu.currentTime = 0;
      const pr = sfxAu.play();
      if (pr && pr.catch) pr.catch(() => webAudioTone(def[0], def[1], def[2]));
    } catch (e) {
      webAudioTone(def[0], def[1], def[2]);
    }
    return snd.ms;
  }
  const sndWin = () => sfx("win");
  const sndSoft = () => sfx("soft");
  const sndBad = () => sfx("bad");
  const sndKey = () => sfx("key");

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
  // The feedback line under the word: an optional main message and an optional coach line (tip or cheer, 1.11.0)
  function feedback(text, kind, tip) {
    const fb = document.getElementById("fb");
    if (!fb) return;
    if (tip && state.settings.tips === false) tip = "";
    fb.className = "feedback";
    void fb.offsetWidth;
    fb.className = "feedback " + (kind || "");
    fb.innerHTML = (text ? `<span class="fb-main">${esc(text)}</span>` : "") + (tip ? `<span class="fb-tip">${esc(tip)}</span>` : "");
    if (tip && game) game.lastTip = tip;
  }
  // ── Coach (1.11.0): one short sentence, chosen from how the kid is playing ──
  const pickTip = (arr) => {
    const all = Array.isArray(arr) ? arr : [arr];
    const a = all.filter((x) => !game || x !== game.lastTip);
    return pickRand(a.length ? a : all);
  };
  const sylSpaced = (w) => caseWord(w).split("-").join(" – ");
  const letterOf = (o) => o.k || firstLetter(state.lang, o.w);   // the round's own first-letter rule
  // After a wrong tap: why it might have gone wrong, and what to do next
  function tipForWrong() {
    const quick = game.wrong.size === 1 && Date.now() - (game.shownAt || 0) < 1500;
    if (quick) game.guessed = true;
    if (game.wrong.size >= 2) return t("tipSyl", sylSpaced(game.cur.w));
    if (quick) return pickTip(t("tipGuess"));
    const l = letterOf(game.cur);
    if (l && game.options.length > 2 && game.options.every((o) => letterOf(o) === l)) return t("tipEnd", String(l).toLocaleUpperCase(LANGS[state.lang].locale));
    return t("tipLoud");
  }
  // After a right first try: the most fitting cheer, or now and then a general one
  function cheerForRight(info) {
    const n = game.streak, syl = caseWord(game.cur.w).split("-").length;
    if (n === 3 || n === 5 || (n >= 10 && n % 5 === 0)) return t("cheerStreak", n);
    if (info.afterMiss) return t("cheerBack");
    if (info.tricky) return t("cheerTricky");
    if (syl >= 4) return t("cheerLong");
    if (info.ms > 6000) return t("cheerCareful");
    if (info.ms < 2500 && syl >= 2) return t("cheerFast");
    return Math.random() < 0.6 ? pickTip(t("cheerGeneral")) : "";
  }
  // Nothing tapped for a while: a gentle nudge, then another
  function armIdle() {
    if (!game || game.idleRound === game.round) return;
    game.idleRound = game.round;
    clearTimeout(game.idleT);
    const r = game.round, still = () => view.name === "game" && game && game.round === r && !game.locked && !game.wrong.size && !document.getElementById("album");
    game.idleT = setTimeout(() => {
      if (!still()) return;
      const kid = getKid(game.kidId);
      feedback("", "", kid && kid.speak !== "off" ? t("tipHear") : t("tipSyl", sylSpaced(game.cur.w)));
      game.idleT = setTimeout(() => { if (still()) feedback("", "", t("tipLetters")); }, 9000);
    }, 9000);
  }

  // ── Funny animations (1.10.0): the right picture jumps out of its tile and acts out its word ──
  // Cars drive off, birds fly away, fish swim, food gets eaten, animals hop, flowers bloom; anything else dances or spins.
  const FUN_KINDS = {
    drive: "🚗🚕🚙🚌🚎🏎🚓🚑🚒🚐🛻🚚🚛🚜🏍🛵🚲🛴🚂🚆🚇🚊🚝🚃🚋🛺🚤⛵🛶🚢⛴🛳🚄🚅🚈🦼🦽🛷",
    fly: "🐦🐤🐥🦅🦆🦢🦉🦜🕊🐝🦋🐞🪲🦟🪰🦗🦇🐉🦚🦩🪶✈🛩🚁🚀🛸🪁🎈☁🌙⭐🌟☀🪂🧚",
    swim: "🐟🐠🐡🦈🐬🐳🐋🐙🦑🦀🦞🦐🐢🦭🪼🐊🦦🐚🦆",
    chomp: "🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶🫑🌽🥕🧄🧅🥔🍠🥐🥯🍞🥖🥨🧀🥚🍳🧈🥞🧇🥓🥩🍗🍖🌭🍔🍟🍕🥪🌮🌯🥗🍝🍜🍲🍛🍣🍱🥟🍤🍙🍚🍘🍥🍦🍧🍨🍩🍪🎂🍰🧁🥧🍫🍬🍭🍮🍯🥛🍼☕🍵🧃🥤🍿🥜🌰🍄🫓🥫",
    bloom: "🌸🌺🌻🌹🌷🌼💐🌱🌿🍀🌳🌲🌴🌵🍁🍂🌾🌈🪴🌍🌎🌏",
    hop: "🐶🐕🐱🐈🐭🐹🐰🐇🦊🐻🐼🐨🐯🦁🐮🐄🐷🐖🐸🐵🐒🦍🐔🐣🐴🐎🦄🦓🦒🐘🦏🦛🐪🐫🦘🦌🐐🐑🐏🐿🦔🦖🦕🐍🐌🦎🐺🐗🦝🦥🐀🐁🦫🦬🐃🐂🐓🦃🦤🐧⚽🏀🎾🏐🏈⚾🥎🎱🏉🥏",
  };
  const FUN_SAY = {
    drive: { en: "Vroom vroom!", lt: "Brum brum!", es: "¡Brum brum!" },
    fly: { en: "Wheee!", lt: "Valio!", es: "¡Uiii!" },
    swim: { en: "Splash!", lt: "Pliumpt!", es: "¡Chof!" },
    chomp: { en: "Nom nom!", lt: "Nam nam!", es: "¡Ñam ñam!" },
    bloom: { en: "Ta-da!", lt: "Ta-dam!", es: "¡Tachán!" },
    hop: { en: "Boing!", lt: "Šokt šokt!", es: "¡Boing!" },
    dance: { en: "La-la-la!", lt: "Tra-la-la!", es: "¡La-la-la!" },
    spin: { en: "Whoa!", lt: "Oho!", es: "¡Guau!" },
  };
  const bare = (e) => String(e || "").replace(/\uFE0F/g, "");
  function funKind(e) {
    const b = bare(e);
    for (const k of Object.keys(FUN_KINDS)) if (b && FUN_KINDS[k].indexOf(b) >= 0) return k;
    return Math.random() < 0.5 ? "dance" : "spin";
  }
  const reducedMotion = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  // one flying bit (puff, bubble, crumb, note, sparkle): from (x, y) by (dx, dy)
  function funBit(ch, x, y, dx, dy, ms, size, delay) {
    const b = document.createElement("div");
    b.className = "fun-bit";
    b.textContent = ch;
    b.style.fontSize = (size || 26) + "px";
    fx.appendChild(b);
    const at = (xx, yy, s, o) => ({ transform: `translate(${xx}px,${yy}px) translate(-50%,-50%) scale(${s})`, opacity: o });
    try {
      b.animate([at(x, y, 0.4, 0), at(x + dx * 0.25, y + dy * 0.25, 1, 1), at(x + dx, y + dy, 0.8, 0)], { duration: ms, delay: delay || 0, easing: "ease-out", fill: "both" });
    } catch (e) {}
    setTimeout(() => b.remove(), ms + (delay || 0) + 50);
  }
  function funSay(text, x, y, delay) {
    const s = document.createElement("div");
    s.className = "fun-say";
    s.textContent = text;
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.animationDelay = (delay || 0) + "ms";
    fx.appendChild(s);
    setTimeout(() => s.remove(), 1500 + (delay || 0));
  }
  // Plays the animation for the picture in `btn`; returns how long it lasts (ms), 0 when switched off.
  function funnyAnim(btn, emoji) {
    if (state.settings.fun === false || !btn) return 0;
    const r = btn.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    const pics = document.querySelector(".pics"), pr = pics ? pics.getBoundingClientRect() : r;
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    const cx = W / 2, cy = Math.min(H * 0.62, Math.max(H * 0.32, pr.top + pr.height / 2 + 10));
    const kind = funKind(emoji), say = (FUN_SAY[kind] || FUN_SAY.dance)[state.lang] || FUN_SAY[kind].en;
    const wal = document.querySelector(".wallet"), sayTop = wal ? wal.getBoundingClientRect().bottom + 26 : 60;
    const funSayAt = (text, x, y, delay) => funSay(text, x, Math.max(y, sayTop), delay);   // never over the wallet
    const emo = btn.querySelector(".emo"), size = 120, s0 = emo ? Math.max(0.4, emo.getBoundingClientRect().height / size) : 0.8;
    const a = document.createElement("div");
    a.className = "fun-actor";
    a.textContent = emoji;
    fx.appendChild(a);
    if (emo) emo.style.visibility = "hidden";
    // key(offset, x, y, scale, rotate, squashX, squashY, opacity)
    const K = (o, x, y, s, rot, sx, sy, op) => ({ offset: o, transform: `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${rot || 0}deg) scale(${s * (sx || 1)},${s * (sy || 1)})`, opacity: op === undefined ? 1 : op });
    let D = 1750, keys;
    if (reducedMotion()) {
      D = 1100;
      keys = [K(0, x0, y0, s0), K(0.3, x0, y0, s0 * 1.35), K(0.6, x0, y0, s0 * 1.2), K(1, x0, y0, s0 * 1.2, 0, 1, 1, 0)];
      funSayAt(say, x0, y0 - r.height * 0.6, 150);
    } else if (kind === "hop") {
      keys = [K(0, x0, y0, s0), K(0.15, cx, cy, 1, 0, 1.25, 0.8), K(0.27, cx - 30, cy - 110, 1, -10, 0.9, 1.15), K(0.38, cx - 50, cy, 1, 0, 1.3, 0.75),
              K(0.5, cx, cy - 130, 1, 10, 0.9, 1.15), K(0.61, cx + 40, cy, 1, 0, 1.3, 0.75), K(0.76, cx + 10, cy - 150, 1.05, -360, 0.95, 1.1),
              K(0.87, cx, cy, 1, -360, 1.2, 0.85), K(1, cx, cy, 0.2, -360, 1, 1, 0)];
      [0.38, 0.61, 0.87].forEach((o, i) => setTimeout(() => { funBit("💨", cx - 70 + i * 40, cy + 48, -50, -10, 600, 24); funBit("💨", cx - 10 + i * 40, cy + 48, 50, -10, 600, 24); }, o * D));
      funSayAt(say, cx, cy - 170, 0.35 * D);
    } else if (kind === "drive") {
      keys = [K(0, x0, y0, s0), K(0.16, cx, cy, 1.1), K(0.22, cx + 4, cy - 3, 1.1, -3), K(0.28, cx - 4, cy + 2, 1.1, 3), K(0.34, cx + 4, cy - 3, 1.1, -3),
              K(0.42, cx + 30, cy, 1.1, 4, 0.9, 1.05), K(0.85, -180, cy - 10, 1.1, -6, 1.3, 0.9), K(1, -260, cy - 10, 1, 0, 1, 1, 0)];
      [0.2, 0.27, 0.34, 0.45, 0.55, 0.65].forEach((o, i) => setTimeout(() => funBit("💨", i < 3 ? cx + 70 : cx + 70 - (i - 2) * 90, cy + 30, 70, -20, 700, 30), o * D));
      funSayAt(say, cx, cy - 110, 0.12 * D);
    } else if (kind === "fly") {
      keys = [K(0, x0, y0, s0), K(0.15, cx, cy, 1), K(0.25, cx, cy - 10, 1, 0, 1.15, 0.85), K(0.33, cx, cy - 20, 1, 0, 0.85, 1.15), K(0.45, cx + 70, cy - 80, 1, 15),
              K(0.6, cx - 70, cy - 170, 0.95, -15), K(0.75, cx + 60, cy - 270, 0.9, 15), K(1, cx - 40, -140, 0.8, -10, 1, 1, 0.9)];
      [0.35, 0.45, 0.55, 0.65, 0.75].forEach((o, i) => setTimeout(() => funBit(i % 2 ? "✨" : "⭐", cx + (i % 2 ? 50 : -50), cy - 60 - i * 55, 0, 40, 700, 22), o * D));
      funSayAt(say, cx, cy - 110, 0.2 * D);
    } else if (kind === "swim") {
      keys = [K(0, x0, y0, s0), K(0.15, cx, cy, 1.05), K(0.3, cx - 50, cy - 40, 1.05, -12), K(0.45, cx - 110, cy + 30, 1.05, 12), K(0.6, cx - 170, cy - 40, 1.05, -12),
              K(0.78, cx - 240, cy + 30, 1.05, 12), K(1, -200, cy - 20, 1, -12, 1, 1, 0)];
      for (let i = 0; i < 8; i++) setTimeout(() => funBit("🫧", cx + 20 - i * 40 + Math.random() * 20, cy - 10, Math.random() * 30 - 15, -160 - Math.random() * 80, 1000, 16 + Math.random() * 14), (0.18 + i * 0.08) * D);
      funSayAt(say, cx, cy - 110, 0.15 * D);
    } else if (kind === "chomp") {
      keys = [K(0, x0, y0, s0), K(0.15, cx, cy, 1.3), K(0.25, cx, cy, 1.3, 0, 1.15, 0.85), K(0.33, cx, cy, 1.05, -8), K(0.43, cx, cy, 1.05, 0, 1.15, 0.85),
              K(0.51, cx, cy, 0.8, 8), K(0.61, cx, cy, 0.8, 0, 1.15, 0.85), K(0.69, cx, cy, 0.5, -8), K(0.8, cx, cy, 0.15, 0, 1, 1, 0), K(1, cx, cy, 0.1, 0, 1, 1, 0)];
      [0.25, 0.43, 0.61].forEach((o) => setTimeout(() => { for (let j = 0; j < 4; j++) funBit(["✨", "·", "•", "✨"][j], cx + 40, cy - 10, 30 + Math.random() * 70, 30 + Math.random() * 80, 600, 22); }, o * D));
      setTimeout(() => {   // all gone: a happy face pops up
        const yum = document.createElement("div");
        yum.className = "fun-actor";
        yum.textContent = "😋";
        fx.appendChild(yum);
        try { yum.animate([K(0, cx, cy, 0.2, -20), K(0.35, cx, cy, 1.25, 10), K(0.6, cx, cy, 1, -6), K(1, cx, cy, 1, 0, 1, 1, 0)], { duration: 0.32 * D + 300, easing: "ease-out", fill: "both" }); } catch (e) {}
        setTimeout(() => yum.remove(), 0.32 * D + 360);
      }, 0.72 * D);
      funSayAt(say, cx, cy - 120, 0.22 * D);
    } else if (kind === "bloom") {
      keys = [K(0, x0, y0, s0), K(0.15, cx, cy, 0.4), K(0.4, cx, cy, 1.45, 12), K(0.5, cx, cy, 1.2, -8), K(0.6, cx, cy, 1.35, 5), K(0.85, cx, cy, 1.3, 0), K(1, cx, cy, 1.5, 0, 1, 1, 0)];
      setTimeout(() => { for (let j = 0; j < 10; j++) { const an = (j / 10) * Math.PI * 2; funBit(j % 2 ? "🌸" : "✨", cx, cy, Math.cos(an) * 150, Math.sin(an) * 150, 900, 24); } }, 0.38 * D);
      funSayAt(say, cx, cy - 130, 0.4 * D);
    } else if (kind === "spin") {
      keys = [K(0, x0, y0, s0), K(0.15, cx, cy, 1), K(0.45, cx, cy, 1.5, 720), K(0.55, cx, cy, 1.5, 720, 1.25, 0.8), K(0.63, cx, cy, 1.5, 720, 0.85, 1.2),
              K(0.71, cx, cy, 1.5, 720, 1.12, 0.9), K(0.79, cx, cy, 1.5, 720, 0.95, 1.05), K(0.88, cx, cy, 1.4, 720), K(1, cx, cy, 0.2, 900, 1, 1, 0)];
      setTimeout(() => { for (let j = 0; j < 8; j++) { const an = (j / 8) * Math.PI * 2; funBit("⭐", cx, cy, Math.cos(an) * 130, Math.sin(an) * 130, 800, 22); } }, 0.45 * D);
      funSayAt(say, cx, cy - 140, 0.48 * D);
    } else {   // dance
      keys = [K(0, x0, y0, s0), K(0.15, cx, cy, 1.1), K(0.25, cx - 35, cy - 30, 1.1, -20), K(0.35, cx, cy, 1.1, 0, 1.15, 0.88), K(0.45, cx + 35, cy - 30, 1.1, 20),
              K(0.55, cx, cy, 1.1, 0, 1.15, 0.88), K(0.65, cx - 35, cy - 30, 1.1, -20), K(0.75, cx, cy, 1.1, 0, 1.15, 0.88), K(0.87, cx, cy - 40, 1.15, 360), K(1, cx, cy - 40, 0.2, 360, 1, 1, 0)];
      [0.2, 0.35, 0.5, 0.65].forEach((o, i) => setTimeout(() => funBit(i % 2 ? "🎶" : "🎵", cx + (i % 2 ? 60 : -60), cy - 40, (i % 2 ? 30 : -30), -110, 900, 28), o * D));
      funSayAt(say, cx, cy - 120, 0.2 * D);
    }
    try {
      a.animate(keys, { duration: D, easing: "ease-in-out", fill: "both" });
    } catch (e) {
      a.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    }
    setTimeout(() => a.remove(), D + 60);
    return D;
  }

  // ── Stickers (1.10.0): every N words right on the first try earn a new sticker for this player's album ──
  // Each sticker's id is its emoji, so the list can grow later. When the album is full, stickers come again as shiny ones.
  const STICKERS = ["🦄", "🐉", "🦖", "🐙", "🦩", "🦥", "🐳", "🦋", "🐞", "🦊", "🐼", "🐨", "🦁", "🐯", "🐸", "🐵", "🦉", "🐧", "🦔", "🦒", "🐢", "🦜",
    "🚀", "🛸", "🌈", "🌙", "🪐", "☄️", "⭐", "⚡", "🌋", "🏰", "🎡", "🎢", "🎠", "🍕", "🍩", "🧁", "🍦", "🍭", "🍉", "🍓",
    "⚽", "🎸", "🥁", "🎨", "🧸", "🪁", "🏆", "👑", "💎", "🔮", "🪄", "🧩", "🛼", "🤖", "👽", "👻", "🎃", "🧚"];
  const stickerEvery = () => Math.min(20, Math.max(2, +CFG.stickerEvery || 5));
  function normStickers(v) {
    const o = v && typeof v === "object" ? v : {};
    const ids = (x) => (Array.isArray(x) ? x.filter((s, i, arr) => typeof s === "string" && s && arr.indexOf(s) === i) : []);
    return { have: ids(o.have), shiny: ids(o.shiny), pts: Math.max(0, Math.floor(+o.pts || 0)) };
  }
  // A right first-try answer: one step towards the next sticker. Returns { id, shiny } when a sticker is earned.
  function stickerStep(kid) {
    const st = (kid.stickers = normStickers(kid.stickers));
    st.pts++;
    if (st.pts < stickerEvery()) return null;
    st.pts = 0;
    const fresh = STICKERS.filter((x) => st.have.indexOf(x) < 0);
    if (fresh.length) {
      const id = pickRand(fresh);
      st.have.unshift(id);
      return { id, shiny: false };
    }
    const dull = st.have.filter((x) => st.shiny.indexOf(x) < 0);
    const id = pickRand(dull.length ? dull : st.have);
    if (st.shiny.indexOf(id) < 0) st.shiny.unshift(id);
    return { id, shiny: true };
  }
  const stkRot = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.codePointAt(0)) % 997; return (h % 17) - 8; };
  const stickerHTML = (id, kid, cls) => `<span class="stk ${cls || ""} ${kid && normStickers(kid.stickers).shiny.indexOf(id) >= 0 ? "shiny" : ""}" style="--rot:${stkRot(id)}deg">${id}</span>`;
  function shelfHTML(kid) {
    const st = normStickers(kid.stickers), every = stickerEvery();
    return `<div class="shelf" id="shelf" data-action="album" role="button" aria-label="${esc(t("stickers"))}">
      <div class="sh-prog" id="shprog" style="--p:${Math.round((st.pts / every) * 100)}"><span class="sh-gift">🎁</span><b>${st.pts}/${every}</b></div>
      <div class="sh-strip" id="shstrip">${st.have.length ? st.have.map((id) => stickerHTML(id, kid)).join("") : `<span class="sh-empty">${esc(t("nextSticker", every - st.pts))}</span>`}</div>
    </div>`;
  }
  function updateShelf(kid) {
    const st = normStickers(kid.stickers), every = stickerEvery(), p = document.getElementById("shprog");
    if (!p) return;
    p.style.setProperty("--p", Math.round((st.pts / every) * 100));
    p.querySelector("b").textContent = st.pts + "/" + every;
    p.classList.remove("tick");
    void p.offsetWidth;
    p.classList.add("tick");
  }
  // The new sticker: it bursts out of a gift in the middle, then flies down to the shelf.
  function stickerReveal(kid, got) {
    const W = window.innerWidth, H = window.innerHeight, cx = W / 2, cy = H * 0.42;
    const wrap = document.createElement("div");
    wrap.className = "stk-rev" + (got.shiny ? " shiny" : "");
    wrap.style.left = cx + "px";
    wrap.style.top = cy + "px";
    wrap.innerHTML = `<div class="stk-rays"></div><span class="stk big ${got.shiny ? "shiny" : ""}" style="--rot:${stkRot(got.id)}deg">${got.id}</span><div class="stk-label">${esc(got.shiny ? t("shinySticker") : t("newSticker"))}</div>`;
    fx.appendChild(wrap);
    sfx("sticker");
    const big = wrap.querySelector(".stk.big"), D = 1750, rot = stkRot(got.id);
    const strip = document.getElementById("shstrip");
    const sr = strip ? strip.getBoundingClientRect() : { left: cx, top: H - 50, height: 40 };
    const tx = sr.left + 24 - cx, ty = sr.top + sr.height / 2 - cy;
    try {
      big.animate([
        { offset: 0, transform: "scale(0) rotate(-40deg)" }, { offset: 0.18, transform: "scale(1.35) rotate(10deg)" }, { offset: 0.28, transform: `scale(1) rotate(${rot}deg)` },
        { offset: 0.62, transform: `scale(1.05) rotate(${rot}deg)` }, { offset: 1, transform: `translate(${tx}px,${ty}px) scale(.28) rotate(${rot}deg)` },
      ], { duration: D, easing: "ease-in-out", fill: "both" });
      wrap.querySelectorAll(".stk-rays,.stk-label").forEach((x) => x.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.6 }, { opacity: 0, offset: 0.75 }, { opacity: 0 }], { duration: D, fill: "both" }));
    } catch (e) {}
    for (let j = 0; j < 12; j++) { const an = (j / 12) * Math.PI * 2; funBit(got.shiny ? "✨" : pickRand(["⭐", "✨", "🌟"]), cx, cy, Math.cos(an) * 170, Math.sin(an) * 170, 900, 22, 200); }
    setTimeout(() => {
      wrap.remove();
      const s2 = document.getElementById("shstrip");
      if (!s2) return;
      const old = s2.querySelector(".sh-empty");
      if (old) old.remove();
      if (got.shiny) { const ex = Array.from(s2.children).find((c) => c.textContent === got.id); if (ex) ex.remove(); }
      s2.insertAdjacentHTML("afterbegin", stickerHTML(got.id, kid, "landed"));
      s2.scrollLeft = 0;
    }, D);
    return D;
  }
  // The album: every sticker, the missing ones as dark shapes to guess
  function openAlbum(kid) {
    closeAlbum();
    const st = normStickers(kid.stickers), all = STICKERS.concat(st.have.filter((x) => STICKERS.indexOf(x) < 0));
    const done = all.every((x) => st.have.indexOf(x) >= 0);
    const ov = document.createElement("div");
    ov.id = "album";
    ov.className = "albumov";
    ov.setAttribute("data-action", "albumClose");
    ov.innerHTML = `<div class="albumcard" data-action="noop" role="dialog" aria-label="${esc(t("stickers"))}">
      <div class="al-head"><span class="ava sm" style="background:${avaBg(kid)}">${kid.avatar}</span><div class="al-t"><b>${esc(kid.name)}</b><small>${esc(t("stickerCount", st.have.length, all.length))}</small></div>
        <button class="icon" data-action="albumClose" aria-label="${esc(t("close"))}">✕</button></div>
      <div class="al-bar"><i style="width:${Math.round((st.have.length / all.length) * 100)}%"></i></div>
      <p class="al-note">${esc(done ? t("stickersDone") : t("nextSticker", stickerEvery() - st.pts))}</p>
      <div class="al-grid">${all.map((id) => (st.have.indexOf(id) >= 0 ? `<button class="al-cell" data-action="stkWiggle">${stickerHTML(id, kid, "big")}</button>` : `<div class="al-cell"><span class="stk big locked" style="--rot:${stkRot(id)}deg">${id}</span></div>`)).join("")}</div>
    </div>`;
    document.body.appendChild(ov);
  }
  function closeAlbum() {
    const ov = document.getElementById("album");
    if (ov) ov.remove();
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
      document.body.classList.toggle("shelf-on", view.name === "game");   // room for the sticker shelf
      document.body.classList.toggle("game-fixed", view.name === "game");   // the game screen never scrolls (1.10.1)
      if (view.name !== "game") { closeAlbum(); document.body.classList.remove("tight-shelf"); }
      if (view.name === "game") {
        fitWord();
        fitGame();
        if (game.pendingTip) { feedback("", "", game.pendingTip); game.pendingTip = ""; }
        armIdle();
        const kid = getKid(game.kidId);
        if (kid && kid.speak === "shown" && game.spoken !== game.round) {
          game.spoken = game.round;
          speakWord(game.cur.w);
        }
      }
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
    if (kid.speak !== "off") unlockAudio();
    game = { kidId: kid.id, deck: [], cur: null, options: [], missed: false, locked: false, streak: 0, last: null, wrong: new Set(), round: 0, recent: [], spoken: 0,
             skips: 0, pendingTip: t("coachHello"), lastTip: "", idleT: 0, idleRound: 0 };
    nextRound();
    go({ name: "game" });
    if (isShort(kid)) setTimeout(() => notice(t("needTopUp")), 400);
  }
  function nextRound() {
    const kid = getKid(game.kidId);
    game.lastMissed = !!(game.cur && game.missed);   // for "Great comeback!"
    game.guessed = false;
    let word;
    if (state.settings.smart !== false) {
      word = smartPick(kid, poolFor(kid));
    } else {
      if (!game.deck.length) {
        const pool = poolFor(kid);
        game.deck = shuffle(pool.filter((w) => w.w !== game.last));
        if (!game.deck.length) game.deck = shuffle(pool);
      }
      word = game.deck.pop();
    }
    game.last = word.w;
    game.recent = [word.w].concat(game.recent || []).slice(0, 6);
    const picks = [];
    const candidates = distractorCandidates(word);
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
    game.shownAt = Date.now();   // how long the kid looked before tapping (tips and cheers)
  }
  function pick(btn) {
    if (!game || game.locked) return;
    unlockAudio();
    const kid = getKid(game.kidId);
    if (!kid) return go({ name: "home" });
    const i = Number(btn.dataset.i);
    const opt = game.options[i];
    game.skips = 0;
    clearTimeout(game.idleT);

    if (opt.w === game.cur.w) {
      game.locked = true;
      const earned = !game.missed;
      const wasShort = isShort(kid);
      kid.correct++;
      kid.answered++;
      const before = peekStat(kid, game.cur.w);
      const coachInfo = { ms: Date.now() - (game.shownAt || 0), afterMiss: game.lastMissed, tricky: !!(before && before.w) };
      learnDone(kid, game.cur.w, earned);
      const saidWord = game.cur.w;
      maybeAutoCoach(kid);
      let got = null;
      if (earned) {
        kid.tokens++;
        kid.total++;
        game.streak++;
        got = stickerStep(kid);   // a step towards the next sticker (a new one every N first-try words)
      }
      persist();
      usageEvent({ e: "round_finished", level: kid.level === "expert" ? "expert" : "beginner", correct: earned ? "1" : "0" });
      btn.classList.add("right");
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const w = document.getElementById("word");
      if (w) w.classList.add("cheer");
      let chime = 0;
      const funMs = funnyAnim(btn, opt.e);   // the picture jumps out and acts out its word
      if (earned) updateShelf(kid);
      if (got) setTimeout(() => stickerReveal(kid, got), Math.max(funMs - 150, 700));
      if (earned) {
        chime = sndWin();
        confetti(cx, cy, 90);
        banner("🎉 " + pickRand(t("praise")));
        flyCoin(cx, cy, kid);
        const st = document.getElementById("streak");
        if (st) st.textContent = "🔥 " + game.streak;
        const cheer = cheerForRight(coachInfo);
        if (cheer) feedback("", "cheer", cheer);
        if (!wasShort && isShort(kid)) setTimeout(() => notice(t("needTopUp")), 1000);
      } else {
        chime = sndSoft();
        confetti(cx, cy, 30);
        feedback(t("correctNoToken"));
      }
      // After answer: the success sound first, then the word, once the sound has finished
      if (kid.speak === "after") setTimeout(() => speakWord(saidWord), chime ? chime + 150 : 0);
      const round = game.round;
      setTimeout(() => {
        if (view.name === "game" && game && game.round === round) {
          nextRound();
          render();
        }
      }, (earned ? 2100 : 2300) + (got ? 1900 : 0));   // a new sticker gets time to fly to the shelf
    } else {
      if (game.wrong.has(i)) return;
      game.wrong.add(i);
      if (!game.missed) learnMiss(kid, game.cur.w);
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
      feedback(lost ? t("tryAgainMinus") : t("tryAgain"), "bad", tipForWrong());
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
      ${k.stickers.have.length ? `<div class="kstk">${k.stickers.have.slice(0, 4).map((id) => stickerHTML(id, k)).join("")}${k.stickers.have.length > 4 ? `<small>+${k.stickers.have.length - 4}</small>` : ""}</div>` : ""}
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
        <small>${esc(t(v + "Ages"))}</small><small>${esc(sylText(v))}</small>
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
        <div class="who"><span class="ava sm" style="background:${avaBg(kid)}">${kid.avatar}</span><span class="wcol"><span class="wn">${esc(kid.name)}</span>${levelBadge(kid.level)}</span></div>
        <div class="pill" id="streak">🔥 ${game.streak}</div>
        <button class="btn small skipbtn" data-action="skip" aria-label="${esc(t("skip"))}"><span class="sk-t">${esc(t("skip"))}</span> ⏭</button>
      </div>
      ${walletHTML(kid)}
      <div class="hint">${esc(t("hint"))}</div>
      <div class="pics">${game.options
        .map((o, i) => `<button class="pic ${game.wrong.has(i) ? "wrong" : ""}" style="background:${PIC_BG[i]}" data-action="pick" data-i="${i}"><span class="emo">${o.e}</span></button>`)
        .join("")}</div>
      <div class="wordcard"><div class="word" id="word">${wordHTML(game.cur.w)}</div></div>
      ${kid.speak !== "off" ? `<div class="hearrow"><button class="hear" data-action="hear" aria-label="${esc(t("hearWord"))}">🔊</button></div>` : ""}
      <div class="feedback" id="fb"></div>
      ${shelfHTML(kid)}`;
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
        ${kidLearningHTML(k)}
        <details><summary>${esc(t("history"))} (${events.length})</summary>${hist}</details>
      </div>`;
  }

  // Per kid: read aloud, word progress and the AI coach (shown only with an AI key).
  function kidLearningHTML(k) {
    const c = learnCounts(k);
    const chip = (v, label) => `<button class="chip ${k.speak === v ? "on" : ""}" data-action="speakMode" data-id="${k.id}" data-v="${v}">${esc(label)}</button>`;
    const coach = k.coach && k.coach.lang === state.lang ? k.coach : null;
    let coachHTML = "";
    if (AIX.hasKey) {
      const busy = coachBusy[k.id];
      coachHTML = `<div class="coachbox">
        <div class="setrow"><span>✦ ${esc(t("coach"))}</span>
          <button class="btn small ghost" data-action="askCoach" data-id="${k.id}" ${busy || c.seen < 10 ? "disabled" : ""}>${esc(busy ? t("coachBusy") : t("askCoach"))}</button></div>
        ${coach ? `<div class="coachnote"><span class="badge-ai">${esc(t("coachBy", coach.by || "", fmtDate(coach.at)))}</span>
          <p>${esc(coach.note)}</p>
          ${coach.focus && coach.focus.length ? `<small>${esc(t("coachFocus"))}: ${coach.focus.map(esc).join(", ")}</small>` : ""}
          ${coach.added ? `<small> · ${esc(t("coachAdded", coach.added))}</small>` : ""}</div>`
          : c.seen < 10 ? `<p class="note">${esc(t("coachNeedsWords"))}</p>` : ""}
      </div>`;
    }
    return `<div class="money learnbox">
      <div class="setrow"><span>🔊 ${esc(t("readAloud"))}</span><div class="seg3">${chip("off", t("speakOff"))}${chip("shown", t("speakShown"))}${chip("after", t("speakAfter"))}</div></div>
      <small class="mhint">🧠 ${esc(t("wordsStats", c.m, c.l, c.h))}</small>
      ${coachHTML}
    </div>`;
  }

  // Parent zone: words from books (photo buttons only with an AI key; sources stay usable without one).
  function booksPanelHTML() {
    if (!AIX.hasKey && !state.books.length) return "";
    const srcs = state.books.slice().sort((a, b) => b.at - a.at).map((b) => {
      const st = bookStats(b);
      const all = st.playing === st.words.length;
      return `<div class="bksrcbox"><div class="hist bksrc">
        <span>${LANGS[b.lang].flag} <b>${esc(b.title || "—")}</b><br><small class="${all ? "" : "warn"}">${esc(t("inRounds", st.playing, st.words.length))} · ${esc(fmtDate(b.at))}${b.by ? " · ✦ " + esc(b.by) : ""}</small></span>
        <button class="btn small ${bookArmed === b.id ? "danger" : "ghost"}" data-action="bookDel" data-id="${b.id}">${bookArmed === b.id ? esc(t("confirm")) : "🗑️"}</button></div>
        <details class="bkdetail"><summary>${esc(t("showWords"))}</summary>
        ${st.words.map((x, i) => {
          const ns = st.notes[i], block = ns.some((n) => n.block);
          return `<div class="bkwrow ${block ? "blocked" : ""}"><span class="bke">${x.e}</span><b>${esc(x.w)}</b><span class="bklvl">${levelIcons(x)}</span>
            <small>${ns.length ? ns.map((n) => noteIcon[n.k] + " " + esc(n.text)).join("; ") : "✅ " + esc(t("stOk"))}</small></div>`;
        }).join("")}</details></div>`;
    }).join("");
    return `<div class="panel bkpanel ${AIX.hasKey ? "ai" : ""}">
      <h3>📷 ${esc(t("bookWords"))}${AIX.hasKey ? ` <span class="badge-ai">${esc(t("aiBadge"))}</span>` : ""}</h3>
      ${AIX.hasKey ? `<p class="note">${esc(t("bookHint"))}</p>
        <div class="row"><button class="btn go" data-action="bookCamera">📷 ${esc(t("takePhoto"))}</button><button class="btn ghost" data-action="bookLibrary">🖼️ ${esc(t("fromPhotos"))}</button></div>` : ""}
      ${srcs || `<p class="note">${esc(t("noBooks"))}</p>`}
    </div>`;
  }
  // Settings › Learning (the app's own section): AI settings row (ai-configuration Step 7), smart order, book words, voice.
  function learningSecHTML() {
    const A = SET.ai, sv = SET.settings;
    const pu = A && A.usage.p[A.provider];
    const line = SET.hasKey
      ? `${PN[A.provider]} — ${esc(A.model[A.provider])}${pu ? " — " + esc(t("tokensUsed", fmtN(pu.in + pu.out))) : ""}`
      : esc(t("aiRowNoKey"));
    const locale = LANGS[state.lang].locale, lname = t("langNames")[state.lang], v = voiceFor(locale);
    return `<h3 class="sec">${esc(t("learning"))}</h3>
      <div class="srow"><div class="grow"><b>${esc(t("aiRowTitle"))}</b><small class="muted">${line}</small></div>
        <button class="sm ${SET.hasKey ? "" : "primary"}" data-act="aiopen">${esc(t("aiSettings"))}</button></div>
      <div class="srow"><div class="grow"><b>${esc(t("smartOrder"))}</b><small>${esc(t("smartOrderHint"))}</small></div>
        <button class="switch ${sv.smart ? "on" : ""}" data-act="toggle" data-v="smart" aria-label="${esc(t("smartOrder"))}"></button></div>
      <div class="lk-row"><span class="lk-l">${esc(t("bookMode"))}</span>${segRow("bookMode", [["mix", t("modeMix")], ["first", t("modeFirst")], ["off", t("modeOff")]], sv.bookMode, "set")}</div>
`;
  }
  VIEWS.parent = () => `
      <div class="bar"><button class="icon" data-action="lockParent" aria-label="${esc(t("parents"))}">⬅</button><h2>👨‍👩‍👧 ${esc(t("parentArea"))}</h2><button class="icon" data-action="openSettings" aria-label="${esc(CT.title)}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg></button></div>
      ${usageAsk ? `<section id="usageask" class="panel" aria-label="${esc(CT.uaTitle)}"><b>${esc(CT.uaTitle)}</b><p>${esc(CT.uaText)}</p><div class="uabtns"><button class="btn" data-action="usageAnswer" data-v="1">${esc(CT.uaYes)}</button><button class="btn ghost" data-action="usageAnswer" data-v="0">${esc(CT.uaNo)}</button></div></section>` : ""}
      ${state.kids.length ? "" : `<p class="empty">${esc(t("noKids"))}</p>`}
      ${booksPanelHTML()}
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
    en: { uaTitle: "Help improve Reading Stars?", uaText: "Share anonymous counts, like rounds played and payouts made. Never names, avatars, tokens or money. You can change this in Settings.", uaYes: "Yes, share", uaNo: "No thanks", uaThanks: "Thank you! Change it any time in Settings.", uaNope: "No problem. Nothing is shared.", privacy: "Privacy", share: "Share anonymous usage", shareHelp: "Counts like rounds played and payouts made, with a random install ID. Never names, avatars, tokens or money. Off removes the ID.", test: "Test the connection", testHelp: "Sends one test event now and shows PostHog’s answer.", testBtn: "Send test", sending: "Sending…",
      title: "Settings", done: "Done", hint: "Changes apply right away and are kept on this iPhone.", appearance: "Appearance", colours: "Colours", layout: "Layout", textSize: "Text size", font: "Headline font",
      themes: { auto: "Auto", ink: "Ink", sepia: "Sepia", mint: "Mint", contrast: "Contrast", slate: "Slate", night: "Night" },
      layouts: ["Comfortable", "Compact", "Tiny"], sizes: ["Small", "Default", "Large", "Larger"], fonts: ["Sans serif", "Serif"],
      game: "Game", money: "Money", parent: "Parent", pinHelp: "Opens the PIN pad to set a new PIN",
      updates: "Updates", offer: "Offer new versions", offerHelp: (v) => `You have Reading Stars ${v}. “Later” waits two days.`, check: "Check for updates now", checkBtn: "Check", checking: "Checking…",
      startLog: "Start-up log", startLogHelp: (a) => `What happened the last times ${a} opened`, show: "Show", hide: "Hide", noLog: "Nothing logged yet.",
      latest: (v) => `You're on the latest version (${v})`, avail: (v) => `Version ${v} is available`,
      reset: "Reset", original: "original", changed: (n) => `${n} setting${n === 1 ? "" : "s"} changed`, none: "All settings are at their original values", resetAll: "Reset all", confirmReset: "Confirm reset",
      builtWith: "Built with", builtHint: (a) => `${a} is built from shared blueprints that the other apps use too. Tap one to read how that part works.`, bp: (v, a, s) => `Blueprint ${v} · since ${a} ${s}`, all: "All blueprints", dec: "Decrease", inc: "Increase" },
    lt: { uaTitle: "Padėti tobulinti Reading Stars?", uaText: "Siųsti anoniminius skaičius, pvz., sužaistus raundus ir išmokėjimus. Niekada vardų, avatarų, žetonų ar pinigų. Tai galite pakeisti nustatymuose.", uaYes: "Taip, siųsti", uaNo: "Ne, ačiū", uaThanks: "Ačiū! Tai galite pakeisti nustatymuose bet kada.", uaNope: "Gerai. Niekas nesiunčiama.", privacy: "Privatumas", share: "Siųsti anoniminę statistiką", shareHelp: "Skaičiai, pvz., sužaisti raundai ir išmokėjimai, su atsitiktiniu įrenginio ID. Niekada vardų, avatarų, žetonų ar pinigų. Išjungus ID ištrinamas.", test: "Patikrinti ryšį", testHelp: "Dabar išsiunčia vieną bandomąjį įvykį ir parodo PostHog atsakymą.", testBtn: "Siųsti bandymą", sending: "Siunčiama…",
      title: "Nustatymai", done: "Baigti", hint: "Pakeitimai įsigalioja iš karto ir saugomi šiame iPhone.", appearance: "Išvaizda", colours: "Spalvos", layout: "Išdėstymas", textSize: "Teksto dydis", font: "Antraščių šriftas",
      themes: { auto: "Automatiškai", ink: "Rašalas", sepia: "Sepija", mint: "Mėtinė", contrast: "Kontrastas", slate: "Skalūnas", night: "Naktis" },
      layouts: ["Erdvus", "Glaustas", "Mažytis"], sizes: ["Mažas", "Įprastas", "Didelis", "Didesnis"], fonts: ["Be serifų", "Su serifais"],
      game: "Žaidimas", money: "Pinigai", parent: "Tėvams", pinHelp: "Atidaro PIN klaviatūrą naujam PIN",
      updates: "Atnaujinimai", offer: "Siūlyti naujas versijas", offerHelp: (v) => `Jūsų versija: Reading Stars ${v}. „Vėliau“ palaukia dvi dienas.`, check: "Tikrinti atnaujinimus dabar", checkBtn: "Tikrinti", checking: "Tikrinama…",
      startLog: "Paleidimo žurnalas", startLogHelp: (a) => `Kas vyko paskutinius kartus atidarant ${a}`, show: "Rodyti", hide: "Slėpti", noLog: "Kol kas nieko neužrašyta.",
      latest: (v) => `Naudojate naujausią versiją (${v})`, avail: (v) => `Yra versija ${v}`,
      reset: "Atstatyti", original: "pradinė", changed: (n) => `Pakeista nustatymų: ${n}`, none: "Visi nustatymai pradiniai", resetAll: "Atstatyti viską", confirmReset: "Patvirtinti",
      builtWith: "Sukurta pagal", builtHint: (a) => `${a} sukurta pagal bendrus šablonus, kuriuos naudoja ir kitos programos. Paspauskite, kad perskaitytumėte, kaip veikia ta dalis.`, bp: (v, a, s) => `Šablonas ${v} · nuo ${a} ${s}`, all: "Visi šablonai", dec: "Mažinti", inc: "Didinti" },
    es: { uaTitle: "¿Ayudar a mejorar Reading Stars?", uaText: "Comparte recuentos anónimos, como rondas jugadas y pagos hechos. Nunca nombres, avatares, fichas ni dinero. Puedes cambiarlo en Ajustes.", uaYes: "Sí, compartir", uaNo: "No, gracias", uaThanks: "¡Gracias! Cámbialo cuando quieras en Ajustes.", uaNope: "De acuerdo. No se comparte nada.", privacy: "Privacidad", share: "Compartir uso anónimo", shareHelp: "Recuentos como rondas jugadas y pagos hechos, con un ID de instalación aleatorio. Nunca nombres, avatares, fichas ni dinero. Al desactivarlo se borra el ID.", test: "Probar la conexión", testHelp: "Envía ahora un evento de prueba y muestra la respuesta de PostHog.", testBtn: "Enviar prueba", sending: "Enviando…",
      title: "Ajustes", done: "Listo", hint: "Los cambios se aplican al momento y se guardan en este iPhone.", appearance: "Apariencia", colours: "Colores", layout: "Diseño", textSize: "Tamaño del texto", font: "Fuente de títulos",
      themes: { auto: "Automático", ink: "Tinta", sepia: "Sepia", mint: "Menta", contrast: "Contraste", slate: "Pizarra", night: "Noche" },
      layouts: ["Amplio", "Compacto", "Mínimo"], sizes: ["Pequeño", "Normal", "Grande", "Más grande"], fonts: ["Sin serifa", "Con serifa"],
      game: "Juego", money: "Dinero", parent: "Padres", pinHelp: "Abre el teclado para poner un PIN nuevo",
      updates: "Actualizaciones", offer: "Ofrecer versiones nuevas", offerHelp: (v) => `Tienes Reading Stars ${v}. «Más tarde» espera dos días.`, check: "Buscar actualizaciones ahora", checkBtn: "Buscar", checking: "Buscando…",
      startLog: "Registro de inicio", startLogHelp: (a) => `Qué pasó las últimas veces que se abrió ${a}`, show: "Mostrar", hide: "Ocultar", noLog: "Aún no hay nada registrado.",
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
  // Settings blueprint 1.1.0: each section's rows in one card (.grp), built right after every render.
  // A heading's explanation (p.hint right under it) and the changed-count footer (.cfg-foot) stay outside.
  function cardSections(body) {
    if (!body) return;
    var inSec = false, grp = null, kids = Array.prototype.slice.call(body.children);
    kids.forEach(function (n) {
      var c = n.classList;
      if (n.tagName === "H3" && c.contains("sec")) { inSec = true; grp = null; return; }
      if (!inSec || c.contains("grp") || c.contains("cfg-foot")) { grp = null; return; }
      if (!grp && n.tagName === "P" && c.contains("hint")) return;
      if (!grp) { grp = document.createElement("div"); grp.className = "grp"; body.insertBefore(grp, n); }
      grp.appendChild(n);
    });
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
      <div class="srow"><div class="grow"><b>${esc(t("funny"))}</b><small>${esc(t("funnyHelp"))}</small></div><button class="switch ${s.fun !== false ? "on" : ""}" data-act="toggle" data-v="fun" aria-label="${esc(t("funny"))}"></button></div>
      <div class="srow"><div class="grow"><b>${esc(t("tipsSet"))}</b><small>${esc(t("tipsSetHelp"))}</small></div><button class="switch ${s.tips !== false ? "on" : ""}" data-act="toggle" data-v="tips" aria-label="${esc(t("tipsSet"))}"></button></div>
      <h3 class="sec">${esc(CT.money)}</h3>
      <div class="lk-row"><span class="lk-l">${esc(t("currency"))}</span>${segRow("currency", SET.currencies.map((c) => [c, c]), s.currency, "set")}</div>
      ${learningSecHTML()}
      ${listenSecHTML()}
      <h3 class="sec">${esc(CT.parent)}</h3>
      <button class="srow act" data-act="changePin"><div class="grow"><b>🔑 ${esc(t("changePin"))}</b><small>${esc(CT.pinHelp)}</small></div><span class="chev" aria-hidden="true">›</span></button>
      <p class="hint">${esc(t("storageNote"))}</p>
      ${SET.usageAvailable ? `<h3 class="sec">${esc(CT.privacy)}</h3>
      <div class="srow"><div class="grow"><b>${esc(CT.share)}</b><small>${esc(CT.shareHelp)}</small></div><button class="switch ${s.shareUsage ? "on" : ""}" data-act="toggle" data-v="shareUsage" aria-label="${esc(CT.share)}"></button></div>
      <div class="srow"><div class="grow"><b>${esc(CT.test)}</b><small id="usagemsg" class="muted" aria-live="polite">${esc(SET.usageStatus || CT.testHelp)}</small></div><button class="sm" data-act="usage-test">${esc(CT.testBtn)}</button></div>` : ""}
      <h3 class="sec">${esc(CT.updates)}</h3>
      <div class="srow"><div class="grow"><b>${esc(CT.offer)}</b><small>${esc(CT.offerHelp(SET.version))}</small></div><button class="switch ${s.checkUpdates ? "on" : ""}" data-act="toggle" data-v="checkUpdates" aria-label="${esc(CT.offer)}"></button></div>
      <div class="srow"><div class="grow"><b>${esc(CT.check)}</b><small id="updmsg" class="muted" aria-live="polite"></small></div><button class="sm" data-act="updcheck">${esc(CT.checkBtn)}</button></div>
      <div class="srow"><div class="grow"><b>${esc(CT.startLog)}</b><small class="muted">${esc(CT.startLogHelp(SET.appName))}</small></div><button class="sm" data-act="startlog">${esc(CT.show)}</button></div>
      <pre id="startlog" class="startlog" hidden></pre>
      ${SET.cfgSchema.map((sec) => `<h3 class="sec">${esc(sec.title[state.lang] || sec.title.en)}</h3>${sec.items.map(fieldHTML).join("")}`).join("")}
      <div class="cfg-foot"><span class="note">${esc(changed ? CT.changed(changed) : CT.none)}</span>
        ${changed ? `<button class="sm danger ${cfgArmed ? "armed" : ""}" data-act="cfgall">${esc(cfgArmed ? CT.confirmReset : CT.resetAll)}</button>` : ""}</div>
      ${builtWithHTML()}</div>`;
    cardSections(el.querySelector(".sh-body"));   // Settings 1.1.0: one card per section
    el.scrollTop = keep;   // re-renders must not jump back to the top
  }
  function useState(st) {   // the game reads its settings from here
    SET = st;
    S = { ai: st.ai, settings: { ai: st.settings.ai !== false, aiProvider: st.aiProvider, hasKey: !!st.hasKey } };   // the AI sheet's view
    const hadKey = AIX.hasKey, prevMode = state.settings.bookMode;
    AIX.hasKey = !!st.hasKey;
    AIX.on = st.settings.ai !== false;
    Object.assign(state.settings, { wordCase: st.settings.wordCase, sound: st.settings.sound, fun: st.settings.fun !== false, tips: st.settings.tips !== false, currency: st.settings.currency, smart: st.settings.smart !== false, bookMode: st.settings.bookMode || "mix" });
    const vk = ["speechEngine", "voiceRate", "voicePitch", "ttsModel", "ttsVoice", "ttsInstructions"];
    const before = JSON.stringify(vk.map((x) => state.settings[x]));
    vk.forEach((x) => { if (st.settings[x] !== undefined) state.settings[x] = st.settings[x]; });
    state.settings.voiceURIs = st.voiceURIs || state.settings.voiceURIs || {};
    if (JSON.stringify(vk.map((x) => state.settings[x])) !== before) Object.keys(aiAudio).forEach((x) => delete aiAudio[x]);
    AIX.hasOpenAI = !!st.hasOpenAI;
    if (st.cfg) Object.assign(CFG, st.cfg);
    if (prevMode !== state.settings.bookMode) booksChanged();
    if (hadKey !== AIX.hasKey && view.name === "parent" && !cfgIsOpen) render();
    Object.assign(CFG, st.cfg);
  }
  const sendCfg = (action, params) => send(action, params, (ok, st) => { if (ok && st && st.cfgSchema) useState(st); else if (!ok) toast(st); renderCfg(); });
  function openSettings() {
    if (cfgIsOpen) return;
    send("settings-get", {}, (ok, st) => { if (!ok) return toast(st); useState(st); cfgIsOpen = true; renderCfg(); cfgSheet().scrollTop = 0; });
  }
  function closeSettings() { cfgIsOpen = false; cfgArmed = false; aiOpen = false; renderAI(); renderCfg(); render(); }
  function cfgClick(e) {
    e.stopPropagation();   // the sheet's taps never reach the game's own click handler
    if (e.target.closest("select, option, input, textarea")) return;
    const el = e.target.closest("[data-act]"); if (!el || el.disabled) return;
    const act = el.dataset.act, v = el.dataset.v, k = el.dataset.k;
    if (act === "cfgclose") return closeSettings();
    if (act === "aiopen") { aiOpen = true; return renderAI(); }
    if (act === "voiceset") { const val = k === "voiceRate" || k === "voicePitch" ? +v : v; SET.settings[k] = val; state.settings[k] = val; renderCfg(); return sendCfg("set", { k, v: val }); }
    if (act === "voicetest") {
      unlockAudio();
      const vm = document.getElementById("voicemsg");
      if (vm) vm.textContent = "";
      return speakWord(t("sample"), (err) => { const m = document.getElementById("voicemsg"); if (m) m.textContent = t("aiVoiceFailed", String(err || "").slice(0, 80)); });
    }
    if (act === "look") { const val = k === "textSize" ? +v : v; LOOK[k] = val; applyLook(); renderCfg(); return sendCfg("set", { k, v: val }); }
    if (act === "set") { SET.settings[k] = v; renderCfg(); return sendCfg("set", { k, v }); }
    if (act === "toggle") { SET.settings[v] = v === "fun" || v === "tips" ? SET.settings[v] === false : !SET.settings[v]; renderCfg(); return sendCfg("set", { k: v, v: SET.settings[v] }); }
    if (act === "cfgreset") return sendCfg("cfg", { k, reset: 1 });
    if (act === "cfgstep") { const d = cfgItem(k), step = d.step || 1; SET.cfg[k] = Math.min(d.max, Math.max(d.min, Number(SET.cfg[k]) + step * +v)); renderCfg(); return sendCfg("cfg", { k, v: SET.cfg[k] }); }
    if (act === "cfgall") {
      if (cfgArmed) { cfgArmed = false; return sendCfg("cfg", { k: "*" }); }
      cfgArmed = true; renderCfg(); setTimeout(() => { if (cfgArmed) { cfgArmed = false; renderCfg(); } }, 3500); return;
    }
    if (act === "changePin") { closeSettings(); return openPin("set1", "parent"); }
    if (act === "openurl") return send("openurl", { v });
    if (act === "usage-test") {
      const um = document.getElementById("usagemsg"); el.disabled = true; if (um) um.textContent = CT.sending;
      return send("usage-test", {}, (ok, msg) => { el.disabled = false; const m = document.getElementById("usagemsg"); if (m) m.textContent = (ok ? "✓ " : "✗ ") + msg; });
    }
    if (act === "updcheck") {
      const um = document.getElementById("updmsg"); el.disabled = true; if (um) um.textContent = CT.checking;
      return send("update-check", {}, (ok, r) => {
        el.disabled = false;
        if (um) um.textContent = !ok ? String(r) : r.available ? CT.avail(r.version) : CT.latest(r.version);
        if (ok && r.available) { closeSettings(); if (window.__showUpdate) window.__showUpdate(r.info); }
      });
    }
    if (act === "startlog") {   // Settings › Updates › Start-up log (app-blueprints · safe-startup)
      const pre = document.getElementById("startlog");
      if (!pre.hidden) { pre.hidden = true; el.textContent = CT.show; return; }
      return send("startlog", {}, (ok, txt) => { pre.textContent = txt || CT.noLog; pre.hidden = false; el.textContent = CT.hide; });
    }
  }
  function cfgChange(e) {
    e.stopPropagation();
    const c = e.target.classList;
    if (c.contains("devvoicesel")) { state.settings.voiceURIs = Object.assign({}, state.settings.voiceURIs, { [state.lang]: e.target.value }); return sendCfg("set", { k: "voiceURI", v: e.target.value, lang: state.lang }); }
    if (c.contains("ttsvoicesel")) { state.settings.ttsVoice = e.target.value; return sendCfg("set", { k: "ttsVoice", v: e.target.value }); }
    if (c.contains("ttsmodelsel")) { state.settings.ttsModel = e.target.value; return sendCfg("set", { k: "ttsModel", v: e.target.value }); }
    if (c.contains("ttsinstr")) { state.settings.ttsInstructions = e.target.value; return sendCfg("set", { k: "ttsInstructions", v: e.target.value.slice(0, 500) }); }
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
        usageEvent({ e: "player_added" });
      }
      persist();
      go({ name: view.from === "parent" && parentUnlocked ? "parent" : "home" });
    },
    pick(b) {
      pick(b);
    },
    album() {
      const kid = game && getKid(game.kidId);
      if (kid) openAlbum(kid);
    },
    albumClose() {
      closeAlbum();
    },
    noop() {},
    stkWiggle(b) {
      const s = b.querySelector(".stk");
      if (!s) return;
      s.classList.remove("wiggle");
      void s.offsetWidth;
      s.classList.add("wiggle");
    },
    skip() {
      if (!game || game.locked) return;
      const kid = getKid(game.kidId);
      if (kid && game.cur) learnSkip(kid, game.cur.w);
      game.streak = 0;
      game.skips = (game.skips || 0) + 1;
      clearTimeout(game.idleT);
      if (game.skips >= 2) { game.skips = 0; game.pendingTip = t("tipBrave"); }   // skipping a lot: courage to try
      persist();
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
      book = null;
      renderBook();
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
      usageEvent({ e: "payout_made" });
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
    usageAnswer(el) {   // the parent's answer to the usage question
      if (!requireParent()) return;
      send("usage-consent", { on: el.dataset.v });
      usageAsk = false; render();
      toast(el.dataset.v === "1" ? CT.uaThanks : CT.uaNope);
    },
    rowToggle(el) {   // Tiny layout: a player's line opens to show the details
      (el.closest(".panel") || el).classList.toggle("open");
    },
    openSettings() {
      if (!requireParent()) return;
      openSettings();
    },
    hear() {
      unlockAudio();
      if (game && game.cur) speakWord(game.cur.w);
    },
    speakMode(b) {
      if (!requireParent()) return;
      const k = getKid(b.dataset.id);
      if (!k) return;
      k.speak = b.dataset.v;
      persist();
      render();
      if (k.speak !== "off") speakWord(t("sample"));
    },
    bookCamera() {
      if (requireParent()) bookPhoto("camera");
    },
    bookLibrary() {
      if (requireParent()) bookPhoto("library");
    },
    bookToggle(b) {
      const x = book && book.words[Number(b.dataset.i)];
      if (!x) return;
      x.on = !x.on;
      const inp = document.getElementById("bookTitle");
      if (inp) book.title = inp.value;
      renderBook();
    },
    bookCancel() {
      book = null;
      renderBook();
    },
    bookAdd() {
      if (!book || !requireParent()) return;
      const inp = document.getElementById("bookTitle");
      const words = book.words.filter((x) => x.on && !x.known);
      if (!words.length) return;
      state.books.push({ id: uid(), lang: book.lang, title: ((inp && inp.value) || book.title || "").trim().slice(0, 40), at: Date.now(), by: book.by, words: words.map((x) => ({ w: x.w, e: x.e })) });
      booksChanged();
      persist();
      toast(t("wordsAdded", words.length));
      book = null;
      renderBook();
      render();
    },
    bookDel(b) {
      if (!requireParent()) return;
      const id = b.dataset.id;
      if (bookArmed !== id) {
        bookArmed = id;
        render();
        setTimeout(() => {
          if (bookArmed === id) {
            bookArmed = null;
            if (view.name === "parent") render();
          }
        }, 3500);
        return;
      }
      bookArmed = null;
      state.books = state.books.filter((x) => x.id !== id);
      booksChanged();
      persist();
      render();
    },
    askCoach(b) {
      if (!requireParent()) return;
      const k = getKid(b.dataset.id);
      if (k) runCoach(k, false);
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
    if (e.target.closest("select, option, input, textarea")) return;
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
    if (view.name === "game") { fitWord(); fitGame(); }
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

// Words shown before the game's own text is running, in the game's language (from the widget snapshot until the data is read).
const BOOT_TEXT = {
  en: { loading: "Loading your players…", still: "Still loading…", cant: "Reading Stars couldn't open",
    again: "Close Reading Stars and open it again. If it keeps happening, run the installer once more.",
    late: "Some of your data is still coming from iCloud. Nothing will be saved until you reopen Reading Stars.",
    fresh: "Some of your data couldn't be read, so Reading Stars kept a copy and started it fresh." },
  lt: { loading: "Įkeliami žaidėjai…", still: "Vis dar įkeliama…", cant: "Reading Stars nepavyko atidaryti",
    again: "Uždarykite Reading Stars ir atidarykite iš naujo. Jei tai kartojasi, dar kartą paleiskite diegimo programą.",
    late: "Dalis duomenų dar keliauja iš iCloud. Kol iš naujo neatidarysite Reading Stars, niekas nebus išsaugota.",
    fresh: "Dalies duomenų nepavyko perskaityti, todėl Reading Stars išsaugojo jų kopiją ir pradėjo iš naujo." },
  es: { loading: "Cargando tus jugadores…", still: "Sigue cargando…", cant: "Reading Stars no se pudo abrir",
    again: "Cierra Reading Stars y ábrelo de nuevo. Si sigue pasando, ejecuta el instalador otra vez.",
    late: "Parte de tus datos aún está llegando desde iCloud. No se guardará nada hasta que vuelvas a abrir Reading Stars.",
    fresh: "Parte de tus datos no se pudo leer, así que Reading Stars guardó una copia y empezó de cero." },
};
const bootText = () => BOOT_TEXT[splashLang(gameData || readWidget())];
const safeJSON = (x) => JSON.stringify(x === undefined ? null : x).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

// The state the page starts from, handed over by bootApp() (never inlined in buildHTML): the game's save plus the settings it reads.
function clientState() {
  return Object.assign({}, gameData || {}, { settings: gameSettings(), look: lookState(), cfg: cfgValues(), usageAsk: usageAvailable() && !settings.usageAsked && !settings.shareUsage,
    ai: { hasKey: !!aiKey(), on: settings.ai !== false, hasOpenAI: !!keyFor("openai") } });
}

// The page, without any data: the launch screen and a "Loading your players…" placeholder. Only settings are read here.
// The language for the launch screen comes from the widget snapshot (local, fast), as data.json isn't read yet.
function buildHTML() {
  const spLang = splashLang(readWidget()), spTag = SPLASH_TAG[spLang], BT = BOOT_TEXT[spLang];
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
<div id="app"><div class="booting" role="status"><span class="busy-dot"></span>${BT.loading}</div></div>
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
window.__APP_VERSION = ${JSON.stringify(VERSION)};
// The page goes on screen first; Scriptable hands over the data once it has read it (app-blueprints · safe-startup).
window.__parts = [];
window.__bootNote = function (title, detail) {
  var b = document.querySelector(".booting"); if (!b) return;
  b.className = "booting note";
  b.innerHTML = "<b></b><span></span>" + (detail ? "<pre></pre>" : "");
  b.querySelector("b").textContent = title;
  b.querySelector("span").textContent = ${safeJSON(BT.again)};
  if (detail) b.querySelector("pre").textContent = detail;
};
setTimeout(function () { if (!window.__booted) window.__bootNote(${safeJSON(BT.still)}); }, 25000);
document.addEventListener("visibilitychange", function () {   // coming back into view: redraw
  if (document.visibilityState !== "visible") return;
  var d = document.documentElement; d.style.transform = "translateZ(0)"; void d.offsetHeight; d.style.transform = "";
});
window.__boot = function (st) {
  if (window.__booted) return;
  if (!st.kids || !st.kids.length) st.kids = [].concat.apply([], window.__parts);
  window.__parts = [];
  window.__booted = true; window.__INITIAL__ = st;
  requestAnimationFrame(function () {   // make WebKit draw again once the data is in (helps if the window came up blank)
    var d = document.documentElement; d.style.transform = "translateZ(0)"; void d.offsetHeight;
    requestAnimationFrame(function () { d.style.transform = ""; });
  });
  (${webApp.toString()})();
};
</script>
</body></html>`;
}

const SAVE_SCHEME = "readingstars://save?d=";

// The app: everything that builds and presents the WebView. Only the app branch below runs it, never a widget.
let wv = null, pendingUpdate = null, updateChecked = false;
const js = (code) => (wv ? ev(code + "; 'ok'") : Promise.reject(new Error("no page"))).catch(() => {});
const toast = (msg) => js(`window.__toast && window.__toast(${safeJSON(msg)})`);
const offerUpdate = () => {
  if (pendingUpdate) js(`window.__showUpdate && window.__showUpdate(${JSON.stringify(pendingUpdate)})`);
};

// Actions sent by the page with send(action, params): readingstars://<action>?p=<json>
async function handleAction(head, p) {
  const answer = (ok, msg) => js(`window.__done(${JSON.stringify(p.req || "")}, ${ok}, ${JSON.stringify(msg)})`);
  const m = p;
  // AI configuration (blueprint Step 6): each action answers with the fresh settings state (keys masked)
  switch (head) {
    case "aikey": {
      const pr = PROVIDERS[m.v] ? m.v : settings.aiProvider;
      if (await askKey(pr)) {
        settings.ai = true; saveSettings();
        try { const n = await fetchModels(pr); toast(`${PROVIDERS[pr]} key saved — ${n} models available`); }
        catch (e) { toast(`Key saved, but checking it failed: ${String(e.message || e).slice(0, 70)}`); }
      }
      saveSettings(); return answer(true, settingsState());
    }
    case "airm": {
      const pr = m.v;
      if (PROVIDERS[pr]) { removeKey(pr); toast(`${PROVIDERS[pr]} key removed`); }
      if (!aiKey()) { const other = Object.keys(PROVIDERS).find((x) => keyFor(x)); if (other) settings.aiProvider = other; }
      saveSettings(); return answer(true, settingsState());
    }
    case "aiprov": if (PROVIDERS[m.v] && keyFor(m.v)) settings.aiProvider = m.v; saveSettings(); return answer(true, settingsState());
    case "aimodels":
      try { const n = await fetchModels(m.v); toast(`${n} ${PROVIDERS[m.v]} models found`); }
      catch (e) { toast(String(e.message || e).slice(0, 90)); }
      saveSettings(); return answer(true, settingsState());
    case "aimodel":
      if (PROVIDERS[m.p] && m.v) { settings.model = settings.model || {}; settings.model[m.p] = m.v; toast(`${PROVIDERS[m.p]} now uses ${m.v}`); }
      saveSettings(); return answer(true, settingsState());
    case "aitest": {
      const pr = m.v, t0 = Date.now();
      try {
        await aiCall("Reply with the single word OK.", "Connection test.", 10, "test", pr);
        toast(`${PROVIDERS[pr]} works — ${modelFor(pr)} answered in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      } catch (e) { toast(`${PROVIDERS[pr]} test failed: ${String(e.message || e).slice(0, 80)}`); }
      return answer(true, settingsState());
    }
    case "usagereset": resetUsage(); toast("Usage counters reset"); return answer(true, settingsState());
    // Words from a book photo: the photo goes to the provider in use, the words come back for the parent to review
    case "bookphoto": {
      try {
        if (!aiKey()) throw new Error("Add a key in Settings › AI settings");
        const img = String((await ev("window.__takeBookImage ? window.__takeBookImage() : ''", 20000)) || "");
        if (img.length < 1000 || img.length > BOOK_IMAGE_MAX || !/^[A-Za-z0-9+/=]+$/.test(img.slice(0, 200))) throw new Error("The photo didn't arrive. Try again.");
        const pr = settings.aiProvider;
        const out = parseJSON(await aiCall(BOOK_SYSTEM, bookPrompt(m.lang), 3000, "books", pr, [img]));
        return answer(true, Object.assign({ by: PROVIDERS[pr] }, out));
      } catch (e) { return answer(false, String((e && e.message) || e)); }
    }
    // AI coach: the page sends a kid's word progress (no names)
    case "coach": {
      try {
        if (!aiKey()) throw new Error("Add a key in Settings › AI settings");
        const pr = settings.aiProvider;
        const out = parseJSON(await aiCall(COACH_SYSTEM, coachPrompt(m.summary || {}), 2000, "coach", pr));
        return answer(true, Object.assign({ by: PROVIDERS[pr], lang: (m.summary || {}).lang }, out));
      } catch (e) { return answer(false, String((e && e.message) || e)); }
    }
    case "ttsaudio":   // one word of AI speech, returned to the page as base64 MP3 (read-aloud)
      try { return answer(true, await aiSpeech(m.text, m.lang)); }
      catch (e) { return answer(false, String((e && e.message) || e)); }
    case "say":   // fallback voice when the page has no Web Speech
      try { Speech.speak(String(m.text || "")); } catch (e) {}
      return;
  }
  // Settings (app-blueprints · settings): each change is applied and saved at once; the answer is the fresh state.
  if (head === "settings-get") return answer(true, settingsState());
  if (head === "set" && p.k === "shareUsage") { setUsage(p.v === true || p.v === "true" || p.v === "1"); return answer(true, settingsState()); }   // off also deletes the install ID
  if (head === "usage-consent") { setUsage(p.on === "1"); flushUsage(); return; }
  if (head === "usage-test") {
    let ok = false, msg = "";
    if (!usageOn()) msg = "Turn on Share anonymous usage first.";
    else { track("usage_test"); const r = await flushUsage(); ok = !!(r && r.ok); msg = usageStatus() || "Nothing was sent."; }
    return answer(ok, msg);
  }
  if (head === "usage-event") {   // what happens in the game: only these events, with fixed values
    if (p.e === "round_finished") track("round_finished", { level: p.level === "expert" ? "expert" : "beginner", correct: p.correct === "1" });
    else if (p.e === "payout_made") track("payout_made");
    else if (p.e === "player_added") track("player_added");
    return;
  }
  if (head === "set" && p.k === "voiceURI") {   // the iPhone voice, one per game language
    const lang = ["lt", "en", "es"].includes(p.lang) ? p.lang : "lt";
    settings.voiceURIs = settings.voiceURIs || {};
    if (p.v) settings.voiceURIs[lang] = String(p.v).slice(0, 300); else delete settings.voiceURIs[lang];
    saveSettings();
    return answer(true, settingsState());
  }
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
  if (head === "startlog") {   // Settings › Updates › Start-up log: the last 40 lines
    let txt = "";
    try { txt = FileManager.local().readString(LOG_PATH).split("\n").slice(-40).join("\n"); } catch (e) {}
    return answer(true, txt);
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
      track("app_updated", { from: VERSION, to: (String(msg).match(/[0-9]+\.[0-9]+\.[0-9]+/) || [""])[0] }); flushUsage();
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
function buildWebView() {
  wv = new WebView();
  wv.shouldAllowRequest = (request) => {
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
}

// ---------- run ----------
// A run marks itself as open while its window is on screen. A new run waits at most 1.5 s for an older
// window to close, then opens anyway: quick taps on the widget don't stack up copies.
const lockFm = FileManager.local();
const RUN_LOCK = lockFm.joinPath(lockFm.temporaryDirectory(), APP_ID + '-running');
let lockTimer = null;
const lockAge = () => { try { return lockFm.fileExists(RUN_LOCK) ? Date.now() - Number(lockFm.readString(RUN_LOCK)) : Infinity; } catch (e) { return Infinity; } };
const pause = ms => new Promise(r => Timer.schedule(ms, false, r));
async function waitForOtherWindow() { for (let waited = 0; lockAge() < 2500 && waited < 1500; waited += 300) await pause(300); }
function holdLock() {
  const beat = () => { try { lockFm.writeString(RUN_LOCK, String(Date.now())); } catch (e) {} };
  beat(); lockTimer = Timer.schedule(1000, true, beat);
}
function releaseLock() {
  if (lockTimer) { lockTimer.invalidate(); lockTimer = null; }
  try { if (lockFm.fileExists(RUN_LOCK)) lockFm.remove(RUN_LOCK); } catch (e) {}
}
// Talks to the page with a time limit, so a stuck page can't stall the app.
const ev = (js, ms = 20000) => Promise.race([wv.evaluateJavaScript(js, false), pause(ms).then(() => { throw new Error("the page didn't respond in " + ms / 1000 + " s"); })]);

async function bootApp(isClosed) {
  const t0 = Date.now();
  startLog(`Reading Stars ${VERSION}: reading data`);
  await loadData();
  const players = gameData && Array.isArray(gameData.kids) ? gameData.kids.length : 0;
  startLog(`data read in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${players} players${loadIssues.length ? "; missing: " + loadIssues.join(", ") : ""}${loadRepaired.length ? "; started fresh: " + loadRepaired.join(", ") : ""}`);
  if (isClosed()) return;
  if (dataLoaded) saveWidget(widgetSnapshot(gameData));   // the widget shows the players as loaded, before the first round
  const st = clientState(), list = Array.isArray(st.kids) ? st.kids : [];
  st.kids = [];
  for (let i = 0; i < list.length; i += 6) await ev(`window.__parts.push(${safeJSON(list.slice(i, i + 6))})`);   // in pieces: one huge message can stall WebKit
  await ev(`window.__boot(${safeJSON(st)})`);
  let seen = "";
  try { seen = await ev(`document.visibilityState + ", " + innerWidth + "x" + innerHeight`, 5000); } catch (e) { seen = String(e.message || e); }
  startLog(`screen ready in ${((Date.now() - t0) / 1000).toFixed(1)} s (page: ${seen})`);
  track("app_open", { layout: settings.density, theme: settings.theme, ai_key: !!aiKey(), language: (gameData && gameData.lang) || "", players });
  if (loadIssues.length) toast(bootText().late);
  else if (loadRepaired.length) toast(bootText().fresh);
  // Deferred work, once the first screen is drawn: updates, then the widget's icon. Reading Stars has no refresh of its own.
  Timer.schedule(3500, false, () => {
    if (isClosed() || updateChecked) return;
    updateChecked = true;
    checkForUpdate().then(u => { pendingUpdate = u; offerUpdate(); });
  });
  Timer.schedule(6000, false, () => { widgetIcon(); });   // caches the logo tile for the widget, in the background
}

async function main() {
  await waitForOtherWindow();
  buildWebView();
  // A page built before its window is on screen can stay blank on some iPhones (the page runs, nothing is drawn),
  // most often when opened from the widget. So: an empty dark window first, then the real page built inside it.
  await wv.loadHTML('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#0E1116"></body></html>');
  const presented = wv.present(true);
  holdLock();
  await pause(300);                          // let the window finish appearing
  startLog("window on screen");
  await Promise.race([wv.loadHTML(buildHTML()), pause(15000)]);   // the launch screen, drawn on screen
  let closed = false;
  presented.then(() => { closed = true; releaseLock(); flushUsage(); });
  bootApp(() => closed).catch(e => {         // runs beside the window: closing it never waits on this
    startLog("start-up failed: " + (e.message || e));
    let log = "";
    try { log = FileManager.local().readString(LOG_PATH).split("\n").slice(-12).join("\n"); } catch (x) {}
    if (!closed) wv.evaluateJavaScript(`window.__bootNote(${safeJSON(bootText().cant)}, ${safeJSON(log)})`, false).catch(() => {});
  });
  await presented;
  closed = true;
  releaseLock();
  // Final save after the game is closed: saveData() skips data that was never read, and keeps the widget's snapshot in step.
  try {
    const finalState = await Promise.race([
      wv.evaluateJavaScript("window.__flush ? window.__flush() : null", false),
      pause(1500).then(() => null),
    ]);
    saveData(finalState);
  } catch (e) {}
}

// ───────────────────────── Start ─────────────────────────
// Settings are loaded before every branch (the only file read before the window); data is read in each branch.
await loadSettings();
settingsOk = !loadIssues.includes("settings");   // settings that were never read are never saved over
if (config.runsInWidget || config.runsInAccessoryWidget) {
  await loadData();
  await runWidget();             // never builds or presents a WebView, Alert or QuickLook
} else {
  await main();
}
Script.complete();
