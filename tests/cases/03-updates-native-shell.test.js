// in-app-updates 1.1.0, Step 8: in a native shell (BuildIt: config.runsInNativeShell), new versions come from the
// App Store or TestFlight. No check, no installer, and Settings › Updates says so.
const { run, wait, page, enterParents, errors, VERSION } = require("../harness");
const check = (c, msg) => console.log((c ? "✓ " : "✗ ") + msg);
const NEWER = { script: "Reading Stars.js", releases: [{ version: "9.0.0", title: { en: "Big new things" }, highlights: [] }, { version: VERSION }] };
const all = [];
(async () => {
  // A. A newer release exists, but the shell never asks GitHub and never offers it
  let { E, p } = await run({ nativeShell: true, releases: NEWER });
  await wait(1500);
  let pg = page(E);
  check(!E.log.requests.some((u) => /github|releases\.json/.test(u)), `A no request to GitHub at all (${E.log.requests.length} requests)`);
  check(!pg.d.getElementById("upd"), "A no update sheet");
  // B. Even a stray Update now (the sheet forced open) downloads and writes nothing
  pg.w.__showUpdate({ latest: "9.0.0", current: VERSION, title: { en: "Big new things" }, highlights: [] }); await wait(100);
  pg.tap('[data-action="updNow"]'); await wait(500);
  check(!E.log.scriptFetched && !("/docs/Reading Stars.js" in E.files), "B a stray Update now: nothing downloaded, nothing written");
  check(/updated through the App Store/.test(pg.text("#upd .updmsg") || ""), `B …and the sheet says why: "${pg.text("#upd .updmsg")}"`);
  pg.tap('[data-action="updLater"]'); await wait(200);
  // C. Settings › Updates: where updates come from, no switch, no Check now; the start-up log stays
  await enterParents(E);
  pg.tap('[data-action="openSettings"]'); await wait(700);
  const sheet = pg.text("#cfgsheet") || "";
  check(sheet.includes(`You have Reading Stars ${VERSION}. New versions come through the App Store (or TestFlight).`), "C Settings › Updates: “New versions come through the App Store (or TestFlight).”");
  check(!pg.d.querySelector('#cfgsheet [data-v="checkUpdates"]') && !pg.d.querySelector('#cfgsheet [data-act="updcheck"]'), "C no Offer new versions switch, no Check for updates now");
  pg.tap('#cfgsheet [data-act="startlog"]'); await wait(300);
  check(!!pg.d.querySelector('#cfgsheet [data-act="startlog"]') && (pg.text("#startlog") || "").length > 0, "C the Start-up log row stays, and shows the log");
  check(!E.log.requests.some((u) => /github|releases\.json/.test(u)), "C still no request to GitHub");
  E.finish(); await Promise.race([p, wait(500)]); all.push(errors(E));

  // D. In Lithuanian
  ({ E, p } = await run({ nativeShell: true, files: { "/docs/ReadingStars/data.json": JSON.stringify({ lang: "lt", pinHash: null, kids: [], books: [] }) } }));
  await wait(1200); pg = page(E);
  await enterParents(E);
  pg.tap('[data-action="openSettings"]'); await wait(700);
  check((pg.text("#cfgsheet") || "").includes(`Jūsų versija: Reading Stars ${VERSION}. Naujos versijos ateina per App Store (arba TestFlight).`), "D in Lithuanian: “Naujos versijos ateina per App Store (arba TestFlight).”");
  E.finish(); await Promise.race([p, wait(500)]); all.push(errors(E));
  const bad = all.filter((x) => x !== "none");
  console.log("errors: " + (bad.length ? bad.join(" | ") : "none"));
  process.exit(0);
})();
