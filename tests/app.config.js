// Reading Stars's per-app values for the app-blueprints testkit (recipes/testing.md › Per-app values). Starting point: packs only.
module.exports = {
  name: 'Reading Stars',
  script: '../Reading Stars.js',
  folder: 'ReadingStars',
  settings: { usageAsked: true, shareUsage: false, aiInvite: { off: true } },
  offline: ['https://'],   // the app's own hosts aren't faked yet: they fail like a phone without a connection
  legacyCases: true,
};
