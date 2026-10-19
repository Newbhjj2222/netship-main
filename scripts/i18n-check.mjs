// scripts/i18n-check.mjs
// Kugenzura inkoranyamagambo zawe (src/i18n/locales/*.json):
//   npm run i18n:check
// - Isoma code yose ishaka t("...") zose
// - Ikubwira amagambo ataraboneka muri buri rurimi, ikayabika muri i18n-todo/<ururimi>.json
//   (wuzuza ubuhinduzi aho handitse "" hanyuma ukabushyira muri src/i18n/locales/<ururimi>.json)
// - Igenzura ko {placeholders} zingana n'iz'umwimerere

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const LOCALES = path.join(SRC, "i18n", "locales");
const OUT = path.join(ROOT, "i18n-todo");
const LANGS = ["en", "sw", "fr"];

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".js")) out.push(p);
  }
  return out;
}

// t("..."), tr("..."), tl("..."), tx("...")
const CALL = /\b(?:t|tr|tl|tx)\(\s*("(?:[^"\\\n]|\\.)*")/g;
const used = new Set();
for (const file of walk(SRC)) {
  if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(CALL)) {
    try {
      used.add(JSON.parse(m[1]));
    } catch {
      /* ignore */
    }
  }
}

const load = (lang) => JSON.parse(fs.readFileSync(path.join(LOCALES, `${lang}.json`), "utf8"));
const dict = Object.fromEntries(["rw", ...LANGS].map((l) => [l, load(l)]));
const placeholders = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(",");

// Amagambo y'Ikinyarwanda/Igifaransa ni yo akeneye ubuhinduzi mu Cyongereza (ayandi asanzwe ari Icyongereza).
const NON_ENGLISH =
  /\b(na|ni|mu|ku|ko|ya|wa|ba|kandi|ariko|nta|ntabwo|inkuru|igice|andika|hitamo|gusoma|kwandika|ongera|kuri|kugira|amafaranga|konti|iyi|iyo|aya|ubu|none|gusiba|kubika|bika|shyiraho|reba|soma|kanda|ikibazo|habaye|ntibyashoboye|ubutumwa|igihe|gura|kugura|ohereza|le|la|les|des|est|une|dans|pour|avec|vous|votre)\b/i;

fs.mkdirSync(OUT, { recursive: true });
let problems = 0;

console.log(`Amagambo akoreshwa mu code: ${used.size}\n`);
for (const lang of LANGS) {
  const d = dict[lang];
  let missing = [...used].filter((k) => !(k in d) && !(k in dict.rw));
  if (lang === "en") missing = missing.filter((k) => NON_ENGLISH.test(k));
  missing.sort((a, b) => a.localeCompare(b));

  const todo = Object.fromEntries(missing.map((k) => [k, ""]));
  fs.writeFileSync(path.join(OUT, `${lang}.json`), JSON.stringify(todo, null, 2) + "\n");

  const bad = Object.entries(d).filter(([k, v]) => placeholders(k) !== placeholders(v) && !k.includes("."));
  problems += bad.length;

  console.log(`${lang}: ${Object.keys(d).length} byahinduwe · ${missing.length} bisigaye (i18n-todo/${lang}.json)` + (bad.length ? ` · ⚠ ${bad.length} placeholders zidahura` : ""));
  bad.slice(0, 10).forEach(([k]) => console.log("   ⚠", k));
}

if (process.argv.includes("--strict") && problems) process.exit(1);
