// Screenshot scenario for Reading Stars (repo-site, see app-blueprints/repo-site/REBUILD.md).
//
//   node ../app-blueprints/repo-site/tools/capture.js .            # every card
//   node ../app-blueprints/repo-site/tools/capture.js . --only=01-home
//
// Invented players (Ema, Jonas, Ona, Leo), invented money and an invented parent PIN (2468).
// Rounds are random in the app, so every page gets a seeded Math.random: the same shot
// always deals the same words. The rounded iOS font is stood in for by Nunito (SIL OFL,
// docs/site/fixtures/Nunito-OFL.txt), served from the fixtures like everything else.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT = 'Reading Stars.js';
const NOW = Date.UTC(2026, 9, 29, 6, 12);   // Thursday 29 October 2026, 08:12 Vilnius
const DAY = 864e5;
const ago = (d, h = 0) => NOW - d * DAY - h * 3600e3;

const DOCS = '/var/mobile/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents';
const LOCAL = '/var/mobile/Containers/Data/Application/SCRIPTABLE/Documents';
const PIN = '2468';

// The app's own PIN hash (FNV-1a over "reading-stars:<pin>"), so the parent zone opens with PIN.
function hashPin(pin) {
  let h = 2166136261;
  const s = 'reading-stars:' + pin;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}

// ── Players: Ema and Ona are the README's worked example ──
function kids() {
  return [
    { id: 'ema', name: 'Ema', avatar: '🦋', level: 'beginner', tokens: 23, total: 83, correct: 96, wrong: 13, created: ago(41),
      rate: 5, budget: 900,
      payouts: [{ d: ago(26, 3), n: 22, m: 110 }, { d: ago(12, 2), n: 38, m: 190 }],
      topups: [{ d: ago(40, 5), m: 700 }, { d: ago(12, 2), m: 500 }] },
    { id: 'jonas', name: 'Jonas', avatar: '🦖', level: 'expert', tokens: 38, total: 112, correct: 131, wrong: 19, created: ago(41),
      rate: 10, budget: 1500,
      payouts: [{ d: ago(24, 4), n: 34, m: 340 }, { d: ago(10, 1), n: 40, m: 400 }],
      topups: [{ d: ago(40, 5), m: 1000 }, { d: ago(10, 1), m: 1240 }] },
    { id: 'ona', name: 'Ona', avatar: '🐰', level: 'beginner', tokens: 14, total: 34, correct: 41, wrong: 7, created: ago(33),
      rate: 5, budget: 40,
      payouts: [{ d: ago(15, 2), n: 20, m: 100 }],
      topups: [{ d: ago(30, 6), m: 140 }] },
    { id: 'leo', name: 'Leo', avatar: '🚀', level: 'expert', tokens: 19, total: 49, correct: 58, wrong: 9, created: ago(20),
      rate: 0, budget: 0,
      payouts: [{ d: ago(18, 3), n: 30, m: 0 }],
      topups: [] },
  ];
}

const data = (lang) => ({ version: 1, lang: lang || 'en', pinHash: hashPin(PIN), kids: kids() });
const settings = (over) => Object.assign({ theme: 'ink', density: 'comfortable', font: 'sans', textSize: 1, wordCase: 'cap', sound: true, currency: 'EUR', checkUpdates: true, cfg: {} }, over || {});

// What the widget reads: the app's own snapshot (names, avatars, points, tokens; never money).
const widgetSnap = () => ({ lang: 'en', kids: kids().map((k) => ({ name: k.name, avatar: k.avatar, points: k.total, tokens: k.tokens })), at: NOW - 25 * 60e3 });

// The repository's own releases.json; the update shot adds one newer release on top.
const releases = JSON.parse(fs.readFileSync(path.join(ROOT, 'releases.json'), 'utf8'));
function releasesWithUpdate() {
  const r = JSON.parse(JSON.stringify(releases));
  const top = r.releases[0];
  r.releases.unshift(Object.assign({}, top, { version: '1.5.0', date: '2026-10-29' }));
  return r;
}

// word → picture, per language, read from the script itself, so a shot can tap the right picture.
const PICS = (() => {
  const src = fs.readFileSync(path.join(ROOT, SCRIPT), 'utf8');
  const map = { en: {}, es: {}, lt: {} };
  const block = (name) => src.slice(src.indexOf('const ' + name + ' = '), src.indexOf('];', src.indexOf('const ' + name + ' = ')));
  const words = block('WORDS');
  for (const lang of ['lt', 'en', 'es']) {
    const start = words.indexOf('\n    ' + lang + ': [');
    const body = words.slice(start, words.indexOf('],', start));
    for (const m of body.matchAll(/"([^"|]+)\|([^"|]+)"/g)) map[lang][m[1].toLowerCase()] = m[2];
  }
  for (const m of block('MORE_WORDS').matchAll(/"([^"|]+)\|([^"|]*)\|([^"|]*)\|([^"|]*)"/g)) {
    if (m[2]) map.en[m[2].toLowerCase()] = m[1];
    if (m[3]) map.es[m[3].toLowerCase()] = m[1];
    if (m[4]) map.lt[m[4].toLowerCase()] = m[1];
  }
  return map;
})();

// Seeded Math.random (mulberry32) and the stand-in rounded font, in every page.
const pageInit = (seed) => `(() => {
  let s = ${seed >>> 0};
  Math.random = function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { const f = new FontFace('SF Pro Rounded', 'url(https://fixtures.scriptable.local/Nunito.ttf)', { weight: '200 1000' }); document.fonts.add(f); f.load(); } catch (e) {}
})();`;

// ── Shot helpers ──
async function play(h, kidId) { await h.tap(`.kid[data-id="${kidId}"]`, { after: 700 }); }
// Skip until the round's word is one of `want` (rounds are seeded, so this is deterministic).
async function dealWord(h, want) {
  for (let i = 0; i < 250; i++) {
    const w = await h.eval(() => (document.getElementById('word') || {}).textContent || '');
    if (want.includes(w.toLowerCase())) return w;
    await h.tap('[data-action="skip"]', { after: 120 });
  }
  return null;
}
async function pictureIndex(h, lang, right) {
  return h.eval(({ map, right }) => {
    const w = (document.getElementById('word') || {}).textContent.toLowerCase();
    const e = map[w];
    const pics = [...document.querySelectorAll('.pic')];
    return right ? pics.findIndex((b) => b.querySelector('.emo').textContent === e) : pics.findIndex((b) => b.querySelector('.emo').textContent !== e);
  }, { map: PICS[lang], right });
}
async function openParent(h) {
  await h.tap('[data-action="parents"]', { after: 500 });
  for (const d of PIN) await h.tap(`.key[data-v="${d}"]`, { after: 180 });
  await h.wait(600);
}

module.exports = {
  app: { name: 'Reading Stars', script: SCRIPT, accent: '#FACC15' },
  now: NOW,
  locale: 'en_US', timezone: 'Europe/Vilnius',
  settle: 3000,
  fixtures: (shot) => {
    const lang = shot.lang || 'en';
    const files = {
      [DOCS + '/ReadingStars/data.json']: data(lang),
      [DOCS + '/ReadingStars/settings.json']: settings(shot.settings),
      [LOCAL + '/reading-stars-widget.json']: widgetSnap(),
    };
    return {
      files,
      keychain: {},
      routes: [
        { match: /releases\.json/, respond: () => ({ json: shot.update ? releasesWithUpdate() : releases }) },
        { match: /icon-1024\.png/, respond: { file: path.join(ROOT, 'docs', 'icon-1024.png') } },
        { match: /fixtures\.scriptable\.local\/Nunito\.ttf/, respond: { file: path.join(__dirname, 'fixtures', 'Nunito.ttf'), contentType: 'font/ttf' } },
      ],
      pageInit: pageInit(shot.seed || 7),
      // The emulator draws widget text in flex items, which drops a trailing space ("Reading " + "Stars"
      // would read "ReadingStars"). Keep edge spaces as no-break spaces, as iOS shows them.
      globals: (ctx) => {
        const proto = Object.getPrototypeOf(ctx.ListWidget.prototype);
        const addText = proto.addText;
        if (!addText._keepsSpaces) {
          proto.addText = function (t) { return addText.call(this, String(t).replace(/^ +| +$/g, (m) => ' '.repeat(m.length))); };
          proto.addText._keepsSpaces = true;
        }
        return {};
      },
    };
  },
  shots: [
    { id: '01-home', label: 'Who is playing?', caption: 'Each kid has a card with tokens to spend, all-time stars and what the tokens are worth.' },
    { id: '02-beginner-round', label: 'Read and tap the picture', caption: 'The word is split into coloured syllables; every picture starts with the same letter.',
      seed: 11,
      run: async (h) => { await play(h, 'ema'); await dealWord(h, ['car-rot', 'pan-da', 'pen-guin', 'mon-key', 'ti-ger', 'rab-bit', 'ap-ple', 'duck', 'bear', 'cat']); await h.wait(700); } },
    { id: '03-parent-zone', label: 'Parent zone behind a PIN', caption: 'Set what a token is worth per kid and keep a budget the kids never see.',
      run: async (h) => { await openParent(h); } },
    { id: '04-correct', label: 'Right on the first try', caption: 'Confetti and a cheer, and the coin flies into the wallet: +1 token, +€0.05.',
      seed: 23,
      run: async (h) => {
        await play(h, 'ema');
        await dealWord(h, ['pen-guin', 'rock-et', 'pump-kin', 'lem-on', 'flow-er', 'tur-tle', 'cup-cake', 'gui-tar']);
        await h.wait(500);
        const i = await pictureIndex(h, 'en', true);
        await h.tap(`.pic[data-i="${i}"]`, { after: 300 });
      }, after: 0 },
    { id: '05-wrong', label: 'Wrong taps cost a token', caption: 'Expert rounds show five pictures with the same first letter, so a guess often fails.',
      seed: 5,
      run: async (h) => {
        await play(h, 'jonas');
        await dealWord(h, ['but-ter-fly', 'croc-o-dile', 'kan-ga-roo', 'di-no-saur', 'el-e-phant', 'oc-to-pus', 'straw-ber-ry', 'pine-ap-ple', 'ba-na-na']);
        await h.wait(500);
        const i = await pictureIndex(h, 'en', false);
        await h.tap(`.pic[data-i="${i}"]`, { after: 450 });
      }, after: 0 },
    { id: '06-top-up-needed', label: 'Asks for a top-up', caption: 'When tokens are worth more than the hidden budget, the kid is told to ask a parent.',
      run: async (h) => { await play(h, 'ona'); await h.wait(700); } },
    { id: '07-leaderboard', label: 'All-time leaderboard', caption: 'A podium for the top three; payouts never take stars away.',
      run: async (h) => { await h.tap('[data-action="board"]', { after: 700 }); } },
    { id: '08-payout', label: 'Pay out from the budget', caption: 'Tokens become money from that kid’s budget; what it can’t cover stays as tokens.',
      run: async (h) => {
        await openParent(h);
        await h.eval(() => { const c = document.querySelector('[data-action="payout"][data-id="ona"]').closest('.pk'); window.scrollBy(0, c.getBoundingClientRect().top - 12); });
        await h.wait(300);
        await h.tap('[data-action="payout"][data-id="ona"]', { after: 600 });
      } },
    { id: '09-lithuanian', label: 'Lithuanian, English, Spanish', caption: 'Menus and about 200 picture words in each language, switched on the home screen.',
      lang: 'lt', seed: 3,
      run: async (h) => { await play(h, 'ema'); await dealWord(h, ['na-mas']); await h.wait(700); } },
    { id: '10-launch', label: 'Launch screen', caption: 'The star traces its outline and pops in, then “Read. Match. Shine.”', settle: 1500, after: 0 },
    { id: '11-settings', label: 'Settings for parents', caption: 'Behind the PIN: colours, layout, word letters, sounds, currency and round sizes.',
      run: async (h) => { await openParent(h); await h.tap('[data-action="openSettings"]', { after: 800 }); } },
    { id: '12-update', label: 'Update when you are ready', caption: 'A new version shows its three best features; Later asks again in two days.',
      update: true, settle: 3600 },
    { id: '13-dark', label: 'Night palette in dark mode', caption: 'Auto follows the iPhone; Slate and Night turn the sky dark.',
      dark: true, settings: { theme: 'auto' } },
    { id: '14-widget', label: 'Home Screen widget', caption: 'The top reader and everyone’s stars and tokens. Never money, budgets or the PIN.', widget: 'medium' },
  ],
};
