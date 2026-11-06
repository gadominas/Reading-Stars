// Reading Stars test harness: runs the real "Reading Stars.js" in Node with Scriptable's APIs stubbed (see docs/TESTING.md).
// Modelled on Stockit's (github.com/gadominas/StockIt, tests/). The page runs in jsdom; its readingstars:// messages
// reach the script's shouldAllowRequest through window.__hostBridge, as in a native shell (portable-bridge recipe).
const fs = require("fs"), path = require("path");
const { JSDOM } = require("jsdom");
const SRC = fs.readFileSync(process.env.RS_SCRIPT || path.join(__dirname, "..", "Reading Stars.js"), "utf8");
const VERSION = (SRC.match(/const VERSION = '([^']+)'/) || [])[1];

function makeEnv(opts = {}) {
  const files = opts.files || {};
  const kc = opts.kc || {};
  const log = { requests: [], opened: [], toasts: [], alerts: [], spoken: [], jsErrors: [], consoleErrors: [] };
  const fmObj = {
    documentsDirectory: () => "/docs", libraryDirectory: () => "/lib", cacheDirectory: () => "/cache", temporaryDirectory: () => "/tmp",
    joinPath: (a, b) => (a + "/" + b).replace(/\/+/g, "/"),
    fileExists: (p) => p in files || Object.keys(files).some((k) => k.startsWith(p + "/")),
    isDirectory: (p) => Object.keys(files).some((k) => k.startsWith(p + "/")),
    createDirectory: () => {},
    readString: (p) => { if (!(p in files)) throw new Error("nofile " + p); return files[p]; },
    writeString: (p, s) => { files[p] = String(s); },
    remove: (p) => { for (const k of Object.keys(files)) if (k === p || k.startsWith(p + "/")) delete files[k]; },
    listContents: (d) => [...new Set(Object.keys(files).filter((k) => k.startsWith(d + "/")).map((k) => k.slice(d.length + 1).split("/")[0]))],
    isFileStoredIniCloud: () => false, isFileDownloaded: () => true, downloadFileFromiCloud: () => Promise.resolve(),
    readImage: () => null, writeImage: (p) => { files[p] = "IMG"; },
    modificationDate: () => new Date(), fileName: (p) => String(p).split("/").pop(),
  };
  function route(url, req) {
    log.requests.push(url);
    if (url.includes("releases.json")) return [200, JSON.stringify(opts.releases || { releases: [{ version: VERSION }] })];
    if (url.includes("Reading%20Stars.js") || url.includes("Reading Stars.js")) {   // the update download
      log.scriptFetched = (log.scriptFetched || 0) + 1;
      return [200, `const VERSION = '${opts.newVersion || "9.0.0"}';\nconst APP_ID = 'reading-stars';\n// the new script`];
    }
    if (/posthog|i\.posthog|us\.i\./.test(url)) return [200, "{}"];
    return [404, "not mocked: " + url];
  }
  class Request {
    constructor(url) { this.url = url; this.headers = {}; this.method = "GET"; }
    async _go() { const [code, body] = route(this.url, this); this.response = { statusCode: code }; return body; }
    async loadString() { return this._go(); }
    async loadJSON() { return JSON.parse(await this._go()); }
    async load() { const b = await this._go(); return { toBase64String: () => Buffer.from(String(b)).toString("base64"), toRawString: () => String(b) }; }
    async loadImage() { throw new Error("no images in tests"); }
  }
  const alertValues = opts.alertValues || [];
  log.pushAlert = (v) => alertValues.push(v);
  class Alert {
    constructor() { this.fields = []; }
    addSecureTextField() { this.fields.push(null); } addTextField() { this.fields.push(null); return {}; }
    addAction() {} addCancelAction() {} addDestructiveAction() {}
    async present() { log.alerts.push(this.title); this.vals = alertValues.shift() || []; return this.vals.cancel ? -1 : this.vals.action || 0; }
    async presentAlert() { return this.present(); } async presentSheet() { return this.present(); }
    textFieldValue(i) { return this.vals[i] || ""; }
  }
  let dom = null, wvRef = null, resolvePresent;
  const presented = new Promise((r) => (resolvePresent = r));
  class WebView {
    constructor() { wvRef = this; }
    async loadHTML(html) {
      dom = new JSDOM(html, {
        runScripts: "dangerously", pretendToBeVisual: true, url: "https://local.test/",
        beforeParse(w) {
          // what a native shell (BuildIt) and the emulator give every page: messages go to shouldAllowRequest after the current task
          w.__hostBridge = (u) => setTimeout(() => { try { wvRef.shouldAllowRequest && wvRef.shouldAllowRequest({ url: String(u), method: "GET" }); } catch (e) { log.jsErrors.push("bridge: " + e); } }, 0);
          w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
          w.scrollTo = () => {};
          w.SpeechSynthesisUtterance = function (t) { this.text = t; };
          w.speechSynthesis = { getVoices: () => [], cancel() {}, speak(u) { log.spoken.push(u.text); }, addEventListener() {} };
          w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
          w.HTMLMediaElement.prototype.pause = function () {};
          w.addEventListener("error", (e) => log.jsErrors.push(String(e.message || e.error)));
        },
      });
      return;
    }
    async present() { return presented; }
    async evaluateJavaScript(code) { try { return dom.window.eval(code); } catch (e) { log.jsErrors.push(String(e.stack || e)); throw e; } }
  }
  const noop = () => {};
  const Unused = class { constructor() {} };
  const env = {
    FileManager: { iCloud: () => fmObj, local: () => fmObj },
    Keychain: { contains: (k) => k in kc, get: (k) => { if (!(k in kc)) throw new Error("no item " + k); return kc[k]; }, set: (k, v) => { kc[k] = String(v); }, remove: (k) => { delete kc[k]; } },
    Request, Alert, WebView,
    Safari: { openInApp: async (u) => log.opened.push(u), open: (u) => log.opened.push(u) },
    QuickLook: { present: async () => {} }, Pasteboard: { copy: noop, paste: () => "" },
    Speech: { speak: (t) => log.spoken.push(String(t)) },
    // Scriptable's JavaScriptCore has none of these browser APIs: shadow them so script-side code that uses one fails here too
    URL: undefined, URLSearchParams: undefined, setTimeout: undefined, setInterval: undefined, clearTimeout: undefined, clearInterval: undefined,
    fetch: undefined, structuredClone: undefined, queueMicrotask: undefined,
    Photo: { fromCamera: async () => null, fromLibrary: async () => null },
    Data: { fromString: (s) => ({ toBase64String: () => Buffer.from(String(s)).toString("base64"), toRawString: () => String(s) }), fromBase64String: (b) => ({ toRawString: () => Buffer.from(String(b), "base64").toString("latin1") }) },
    UUID: { string: () => "UUID-" + Math.random().toString(16).slice(2).toUpperCase() },
    Device: { isUsingDarkAppearance: () => false, language: () => opts.lang || "en", locale: () => (opts.lang || "en") + "_US", preferredLanguages: () => [opts.lang || "en"] },
    // drawing (the widget's icon) and widgets: accept any call; getImage() gives an image
    DrawContext: class { constructor() { return new Proxy(this, { get: (t, k) => (k in t ? t[k] : k === "getImage" ? () => ({ size: { width: 96, height: 96 } }) : () => {}) }); } },
    Size: class { constructor(w, h) { this.width = w; this.height = h; } }, Rect: class { constructor(x, y, w, h) { Object.assign(this, { x, y, width: w, height: h }); } }, Point: class { constructor(x, y) { this.x = x; this.y = y; } },
    Color: class { constructor(h, a) { this.hex = h; this.alpha = a == null ? 1 : a; } static dynamic(a) { return a; } }, LinearGradient: class {},
    Notification: Unused, ListWidget: Unused, Image: { fromData: () => ({}) },
    Font: new Proxy({}, { get: () => () => ({}) }), CallbackURL: Unused,
    config: Object.assign({ runsInWidget: !!opts.widget, runsInAccessoryWidget: false, widgetFamily: opts.family || "medium" }, opts.nativeShell ? { runsInNativeShell: true } : {}),
    args: { widgetParameter: "", queryParameters: {} },
    Script: { complete: noop, setWidget: noop, name: () => "Reading Stars" },
    Timer: { schedule: (ms, rep, fn) => { const id = (rep ? setInterval : setTimeout)(fn, Math.min(ms, opts.timerCap || 50)); return { invalidate: () => (rep ? clearInterval : clearTimeout)(id) }; } },
    module: { filename: "/docs/Reading Stars.js" },
  };
  return { env, files, kc, log, getDom: () => dom, finish: () => resolvePresent(), wv: () => wvRef };
}

async function run(opts = {}) {
  const E = makeEnv(opts);
  const names = Object.keys(E.env);
  const fn = new Function(...names, "console", `return (async () => {\n${SRC}\n})();`);
  const quiet = { log: () => {}, warn: () => {}, error: (...a) => E.log.consoleErrors.push(a.join(" ")) };
  const p = fn(...names.map((n) => E.env[n]), quiet).catch((e) => { E.log.crash = String((e && e.stack) || e); });
  return { E, p };
}
// helpers for scenarios
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function page(E) {
  const w = E.getDom().window, d = w.document;
  const tap = (sel) => { const el = typeof sel === "string" ? d.querySelector(sel) : sel; if (!el) throw new Error("nothing to tap: " + sel); el.dispatchEvent(new w.MouseEvent("click", { bubbles: true })); };
  return { w, d, tap, text: (sel) => { const el = d.querySelector(sel); return el ? el.textContent.replace(/\s+/g, " ").trim() : null; } };
}
async function enterParents(E) {   // home → Parents; sets PIN 1234 the first time, enters it after
  let { d, tap } = page(E);
  tap('[data-action="parents"]'); await wait(300);
  for (let i = 0; i < 2 && d.querySelector('[data-action="pinKey"]'); i++) { for (const k of "1234") { tap(`[data-action="pinKey"][data-v="${k}"]`); await wait(20); } await wait(300); }
}
function errors(E) {
  const all = [].concat(E.log.crash ? ["CRASH " + E.log.crash] : [], E.log.jsErrors, E.log.consoleErrors.filter((x) => !/Not implemented/.test(x)));
  return all.length ? all.map((x) => String(x).split("\n")[0]).join(" | ") : "none";
}
module.exports = { run, makeEnv, wait, page, enterParents, errors, VERSION };
