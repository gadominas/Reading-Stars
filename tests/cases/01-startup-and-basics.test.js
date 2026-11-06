const { run, wait, page, enterParents, errors, VERSION } = require("../harness");
const check = (c, msg) => console.log((c ? "✓ " : "✗ ") + msg);
(async () => {
  // A. A fresh install: the home screen, the version, settings saved
  let { E, p } = await run();
  await wait(1200);
  let { text } = page(E);
  check(/Who is playing\?/.test(text("#app")) && text("#app").includes("Reading Stars v" + VERSION), `A fresh start: home screen with "Reading Stars v${VERSION}"`);
  check("/docs/ReadingStars/settings.json" in E.files, "A settings saved to ReadingStars/settings.json");
  E.finish(); await Promise.race([p, wait(500)]);
  const errA = errors(E);

  // B. A family's saved data: players on the home screen, a round, Settings › Built with
  const data = { lang: "en", pinHash: null, kids: [{ id: "ema", name: "Ema", avatar: "🦋", level: "beginner", tokens: 12, total: 40 }], books: [], speakAfterDefault: true };
  ({ E, p } = await run({ files: { "/docs/ReadingStars/data.json": JSON.stringify(data) } }));
  await wait(1200);
  let pg = page(E);
  check(pg.text(".kid") && pg.text(".kid").includes("Ema"), "B saved player Ema on the home screen");
  pg.tap(".kid"); await wait(400);
  check(pg.d.querySelectorAll(".pic").length === 3 && !!pg.text("#word"), `B Ema's round: 3 pictures and the word "${pg.text("#word")}"`);
  pg.tap('[data-action="home"]'); await wait(300);
  await enterParents(E);
  pg.tap('[data-action="openSettings"]'); await wait(700);
  const sheet = pg.text("#cfgsheet") || "";
  const m = sheet.match(/In-app updates\s*Blueprint ([0-9.]+) · since Reading Stars ([0-9.]+)/);
  // expected: the script's own BLUEPRINTS line (its since moves on when the blueprint is upgraded, not with every release)
  const src = require("fs").readFileSync(process.env.RS_SCRIPT || require("path").join(__dirname, "..", "..", "Reading Stars.js"), "utf8");
  const bp = src.match(/\{ id: 'in-app-updates', name: 'In-app updates', version: '([^']+)', since: '([^']+)' \}/);
  check(m && bp && m[1] === bp[1] && m[2] === bp[2], `B Settings › Built with: In-app updates, Blueprint ${m && m[1]} · since Reading Stars ${m && m[2]}`);
  E.finish(); await Promise.race([p, wait(500)]);
  const bad = [errA, errors(E)].filter((x) => x !== "none");
  console.log("errors: " + (bad.length ? bad.join(" | ") : "none"));
  process.exit(0);
})();
