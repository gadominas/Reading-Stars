#!/usr/bin/env node
// Runs every scenario in tests/cases against the real "Reading Stars.js" (see docs/TESTING.md).
//   node run.js              all scenarios, one line each
//   node run.js updates      only those whose name contains "updates"
//   node run.js -v updates   and print everything they print
// A scenario passes when it exits normally and its last line says "errors: none" with no ✗ checks.
const { spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");
const args = process.argv.slice(2), verbose = args.includes("-v");
const filter = args.filter((a) => !a.startsWith("-"));
const dir = path.join(__dirname, "cases");
const cases = fs.readdirSync(dir).filter((f) => f.endsWith(".test.js")).sort().filter((f) => !filter.length || filter.some((q) => f.includes(q)));
if (!cases.length) { console.log("No tests match " + filter.join(" ")); process.exit(1); }
let failed = 0;
const started = Date.now();
for (const f of cases) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: "utf8", timeout: 120e3, cwd: __dirname });
  const lines = ((r.stdout || "") + (r.stderr || "")).split("\n").filter((l) => l && !/^\s+at |Not implemented/.test(l));
  const bad = lines.filter((l) => /^✗|\bCRASH\b/.test(l) || (/^errors:/.test(l) && !/^errors: none$/.test(l)));
  const ok = r.status === 0 && !r.error && !bad.length && lines.some((l) => l === "errors: none");
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${f.replace(".test.js", "")}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (!ok) for (const l of (bad.length ? bad : lines.slice(-6))) console.log("    " + l.slice(0, 300));
  if (verbose) for (const l of lines) console.log("    " + l.slice(0, 400));
}
console.log(`\n${cases.length - failed} of ${cases.length} passed in ${((Date.now() - started) / 1000).toFixed(0)}s`);
process.exit(failed ? 1 : 0);
