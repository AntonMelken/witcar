// Generates the third-party licence notices for all production dependencies
// plus bundled assets (font). MIT/ISC/BSD/Apache require the copyright and
// licence text to ship with copies of the code, which includes the JS we
// serve to browsers.
//   public/third-party-licenses.txt   full texts, linked from /lizenzen
//   src/lib/legal/third-party.json    summary table rendered on /lizenzen
// Usage: node scripts/gen-licenses.mjs [--check]   (--check fails if outdated)
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TXT = "public/third-party-licenses.txt";
const JSON_OUT = "src/lib/legal/third-party.json";

/** Assets that are not npm dependencies but ship with the app. */
const EXTRA = [
  {
    name: "Inter (Schrift)",
    version: "4.001",
    license: "OFL-1.1",
    homepage: "https://rsms.me/inter/",
    files: ["src/app/fonts/Inter-LICENSE.txt"],
  },
];

const LICENSE_FILE = /^(licen[cs]e|copying|notice)([-._].*)?$/i;

function licenseTexts(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => LICENSE_FILE.test(f))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n").trim());
}

// "Copyright (c) X", "Copyright 2016 X", "© 2020 X" – not licence prose or "Copyright [yyyy]" templates.
const COPYRIGHT_LINE = /^\s*(copyright\s+(\(c\)|©|\d{4})|(\(c\)|©)\s*\d{4})/i;

function copyrightOf(texts, author) {
  for (const text of texts) {
    const line = text.split("\n").find((l) => COPYRIGHT_LINE.test(l));
    if (line) return line.trim().replace(/\s+/g, " ").slice(0, 200);
  }
  return author ? `Autor: ${author}` : null;
}

const raw = JSON.parse(execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], { encoding: "utf8" }));
const entries = [];
for (const [license, pkgs] of Object.entries(raw)) {
  for (const p of pkgs) {
    p.versions.forEach((version, i) => {
      const texts = licenseTexts(p.paths[i] ?? p.paths[0]);
      entries.push({ name: p.name, version, license, homepage: p.homepage ?? null, author: p.author ?? null, texts });
    });
  }
}
for (const e of EXTRA) {
  const texts = e.files.map((f) => readFileSync(f, "utf8").replace(/\r\n/g, "\n").trim());
  entries.push({ name: e.name, version: e.version, license: e.license, homepage: e.homepage, author: null, texts });
}
entries.sort((a, b) => a.name.localeCompare(b.name, "en") || a.version.localeCompare(b.version, "en"));

const rule = "=".repeat(78);
const txt =
  [
    "WitCar – Lizenzhinweise für Drittsoftware / Third-party licence notices",
    "",
    "WitCar enthält die folgende Open-Source-Software und Schriften. Die jeweiligen",
    "Urheberrechte liegen bei den genannten Autorinnen und Autoren.",
    "",
    ...entries.flatMap((e) => [
      rule,
      `${e.name} ${e.version} (${e.license})`,
      ...(e.homepage ? [e.homepage] : []),
      rule,
      "",
      e.texts.length
        ? e.texts.join("\n\n")
        : `Lizenz laut Paketangabe: ${e.license}${e.author ? `, Autor: ${e.author}` : ""}. Das Paket enthält keinen eigenen Lizenztext.`,
      "",
    ]),
  ].join("\n") + "\n";

const summary =
  JSON.stringify(
    entries.map((e) => ({
      name: e.name,
      version: e.version,
      license: e.license,
      copyright: copyrightOf(e.texts, e.author),
      homepage: e.homepage,
    })),
    null,
    2,
  ) + "\n";

if (process.argv.includes("--check")) {
  const stale = [
    [TXT, txt],
    [JSON_OUT, summary],
  ].filter(([file, content]) => !existsSync(file) || readFileSync(file, "utf8") !== content);
  if (stale.length) {
    console.error(`outdated: ${stale.map(([f]) => f).join(", ")} → run: pnpm licenses:gen`);
    process.exit(1);
  }
  console.log(`licence notices up to date (${entries.length} entries)`);
} else {
  writeFileSync(TXT, txt);
  writeFileSync(JSON_OUT, summary);
  console.log(`licence notices written (${entries.length} entries)`);
}
