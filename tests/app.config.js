// Reading Stars's per-app values for the app-blueprints testkit (recipes/testing.md › Per-app values). Starting point: packs only.
module.exports = {
  name: 'Reading Stars',
  script: '../Reading Stars.js',
  folder: 'ReadingStars',
  settings: { usageAsked: true, shareUsage: false, aiInvite: { off: true } },
  offline: ['https://'],   // the app's own hosts aren't faked yet: they fail like a phone without a connection
  legacyCases: true,
  // Settings sit in the parent zone: Parents, the PIN (set to 1234 the first time, entered after), then Settings
  openSettings: async (app) => {
    app.tap('[data-action="parents"]'); await app.wait(300);
    for (let i = 0; i < 2 && app.$('[data-action="pinKey"]'); i++) { for (const k of '1234') { app.tap(`[data-action="pinKey"][data-v="${k}"]`); await app.wait(20); } await app.wait(300); }
    app.tap('[data-action="openSettings"]');
  },
};
