const { run, wait, page, enterParents, errors, VERSION } = require("../harness");
const check = (c, msg) => console.log((c ? "✓ " : "✗ ") + msg);
const NEWER = { script: "Reading Stars.js", releases: [
  { version: "9.0.0", title: { en: "Big new things" }, highlights: [{ icon: "🏆", title: { en: "One" }, text: { en: "a" } }, { icon: "🎁", title: { en: "Two" }, text: { en: "b" } }, { icon: "✨", title: { en: "Three" }, text: { en: "c" } }] },
  { version: VERSION } ] };
const all = [];
(async () => {
  // A. In Scriptable a newer version is offered on the home screen
  let { E, p } = await run({ releases: NEWER });
  await wait(1200);
  let pg = page(E);
  const rel = E.log.requests.filter((u) => u.includes("releases.json")).length;
  check(rel === 1 && !!pg.d.getElementById("upd") && /9\.0\.0/.test(pg.text("#upd")) && /One.*Two.*Three/.test(pg.text("#upd")), `A releases.json checked once; the sheet offers 9.0.0 with its three highlights`);
  // B. Update now downloads, verifies and writes the new script
  pg.tap('[data-action="updNow"]'); await wait(400);
  check(E.log.scriptFetched === 1 && /const VERSION = '9\.0\.0'/.test(E.files["/docs/Reading Stars.js"] || ""), "B Update now: the script downloaded and written over Reading Stars.js (9.0.0)");
  check(/9\.0\.0/.test(pg.text("#upd .updtag")), `B the sheet says it's done: "${pg.text("#upd .updtag")}"`);
  E.finish(); await Promise.race([p, wait(500)]); all.push(errors(E));

  // C. Later: no offer for two days, not even a request
  ({ E, p } = await run({ releases: NEWER }));
  await wait(1200); pg = page(E);
  pg.tap('[data-action="updLater"]'); await wait(300);
  const kc = JSON.parse(JSON.stringify(E.kc));
  check(Object.keys(kc).some((k) => /snooze/i.test(k)), "C Later: snoozed (Keychain)");
  E.finish(); await Promise.race([p, wait(500)]); all.push(errors(E));
  ({ E, p } = await run({ releases: NEWER, kc }));
  await wait(1200); pg = page(E);
  check(!pg.d.getElementById("upd") && !E.log.requests.some((u) => u.includes("releases.json")), "C next start within two days: no sheet, no request");
  // D. Settings › Updates in Scriptable: the switch and Check now, no App Store note
  await enterParents(E);
  pg.tap('[data-action="openSettings"]'); await wait(700);
  const sheet = pg.text("#cfgsheet") || "";
  check(!!pg.d.querySelector('#cfgsheet [data-v="checkUpdates"]') && !!pg.d.querySelector('#cfgsheet [data-act="updcheck"]') && !/App Store/.test(sheet), "D Settings › Updates: Offer new versions and Check for updates now, no App Store note");
  E.finish(); await Promise.race([p, wait(500)]); all.push(errors(E));
  const bad = all.filter((x) => x !== "none");
  console.log("errors: " + (bad.length ? bad.join(" | ") : "none"));
  process.exit(0);
})();
