// Erzeugt data/bildungsplaene.js (build.mjs kopiert sie nach dist/; Merkwerk lädt sie erst bei Bedarf) aus dem Master-Index der Bildungspläne (data/Master-Index_Bildungsplaene.json).
//   node tools/bildungsplaene.mjs [Pfad zum Master-Index]
// Übernimmt nur, was Merkwerk braucht: Land, Schulart (als Merkwerk-Schularten), Klassen, Fach, Titel, Link, Status.
// Außer Kraft gesetzte Pläne und Entwürfe fallen weg.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2] || join(root, "data", "Master-Index_Bildungsplaene.json");
const { eintraege: E, stand } = JSON.parse(readFileSync(src, "utf8"));

const LAND = { "Baden-Württemberg":"BW","Bayern":"BY","Berlin":"BE","Brandenburg":"BB","Bremen":"HB","Hamburg":"HH","Hessen":"HE","Mecklenburg-Vorpommern":"MV","Niedersachsen":"NI","Nordrhein-Westfalen":"NW","Rheinland-Pfalz":"RP","Saarland":"SL","Sachsen":"SN","Sachsen-Anhalt":"ST","Schleswig-Holstein":"SH","Thüringen":"TH" };
const STATUS = { "gültig":"g","gültig (aufsteigend eingeführt)":"a","auslaufend gültig":"x","gültig (subsidiär)":"s","künftig in Kraft":"k","gültig (Erprobung)":"e","nicht verifiziert":"n","Portalübersicht":"p" };

// Schulart des Landes -> Merkwerk-Schularten (siehe SCHOOL_TYPES in 02_data.js)
function types(schulart, land) {
  const s = schulart.toLowerCase(); const t = new Set();
  const has = w => s.includes(w);
  if (has("weiterbildungskolleg")) return [];
  const beruf = /beruf|fachrichtung/.test(s);
  if (!beruf && has("übergreifend") || has("alle schularten") || has("alle bildungsgänge") || has("orientierungsstufe") || /sekund[a-z]* i\b(?! und)/.test(s) && !has("(") || has("sekundarstufe i und ii") || has("sekundarbereich i und ii")) {
    ["haupt", "real", "gms", "gym"].forEach(x => t.add(x));
  }
  if ((has("gymnasiale oberstufe") || has("studienstufe")) && !has("berufsbezogener fachrichtung")) { t.add("gym"); t.add("gms"); if (has("berufliches gymnasium")) t.add("bg"); }
  if (has("berufliches gymnasium") || has("fachgymnasium") || has("berufliches oberstufengymnasium") || has("berufsbezogener fachrichtung")) t.add("bg");
  if (has("fachoberschule") || has("berufsoberschule") || has("berufskolleg")) t.add("fos");
  if (has("berufsschule") || has("berufsfachschule") || has("berufliche schulen") || has("berufsbildende") || has("berufsvorbereit") || has("werkschule") || has("osz") || has("bzb")) t.add("bs");
  const plain = s.replace(/berufliches gymnasium|fachgymnasium|oberstufengymnasium|fachoberschule|berufsoberschule|abendgymnasium/g, "");
  if (plain.includes("gymnasium") && !has("gymnasiale oberstufe") && !has("studienstufe")) t.add("gym");
  if (has("realschule")) t.add("real");
  if (has("hauptschule") || has("werkrealschule") || has("mittelschule")) t.add("haupt");
  if (has("gesamtschule") || has("gemeinschaftsschule") || has("igs")) t.add("gms");
  if (/(^|[^a-z])oberschule/.test(plain) || has("regelschule") || has("sekundarschule") || has("regionale schule") || has("realschule plus")) { t.add("haupt"); t.add("real"); }
  if (has("stadtteilschule") || has("integrierte sekundarschule")) { t.add("haupt"); t.add("real"); t.add("gms"); }
  if (has("sekundarstufe i (") || has("sekundarbereich i (")) {
    // Klammer nennt die Schularten selbst; ohne Gymnasium gilt es nur für die übrigen
    ["haupt", "real", "gms"].forEach(x => t.add(x));
    if (has("gymnasium") || has("alle")) t.add("gym");
  }
  if (has("wirtschaftsschule")) t.add("ws");
  // Saarland und Schleswig-Holstein: Gemeinschaftsschule ist die Schulart neben dem Gymnasium
  if ((land === "SL" || land === "SH") && t.has("gms")) { t.add("haupt"); t.add("real"); }
  return [...t];
}

// Klassen-/Jahrgangsangabe -> [von, bis]
function grades(k) {
  const m = k.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/); if (m) return [Number(m[1]), Number(m[2])];
  const one = k.match(/(?:Klasse|Jahrgangsstufe)\s+(\d{1,2})/); if (one) return [Number(one[1]), Number(one[1])];
  if (/^Sekundarstufe II/.test(k)) return [11, 13];
  if (/^Sekundarstufe I\b/.test(k)) return [5, 10];
  if (k === "Einführungsphase") return [10, 11];
  if (k === "Hauptphase") return [11, 13];
  return [5, 13]; // "Alle Jahrgangsstufen", "Sekundarstufe", "Einführungs- und Hauptphase"
}

// Fachbezeichnung -> gemeinsamer Fachname; null für übergreifende Dokumente
const GENERAL = /^(vorwort|inkraftsetzung|übersicht|kernlehrplan-archiv|jahrgangsstufenprofil|bildungs- und erziehungsauftrag|fächerübergreifend|leitgedanken|grundsatzband|teil [abc]\b|allgemeiner teil|aufgabengebiete|sexualerziehung)/i;
function subject(f) {
  let n = f.replace(/\s*\((Lehrplan 2002|Schulversuch)\)/g, "").replace(/\s+–\s+.*$/, "").replace(/^WP\s+/, "")
    .replace(/\s+als\s+(erste|zweite|dritte|spät ?beginnende)\s+Fremdsprache.*$/i, "").replace(/\s+(Sek I|Sek II)$/i, "").trim();
  if (GENERAL.test(n)) return null;
  if (n === "Lateinisch") n = "Latein";
  if (n.startsWith("Englisch in 20")) n = "Englisch";
  return n;
}

const out = []; const seen = new Set(); let skipped = 0;
for (const e of E) {
  const st = STATUS[e.status]; const land = LAND[e.land];
  if (!st || !land) { skipped++; continue; }
  const ty = types(e.schulart, land);
  if (!ty.length) { skipped++; continue; }
  const key = land + "|" + e.schulart + "|" + e.url + "|" + e.klassenstufe;
  if (seen.has(key)) continue; seen.add(key);
  const [lo, hi] = grades(e.klassenstufe);
  const subj = subject(e.fach);
  const row = { l: land, t: ty.join(","), a: e.schulart, g: [lo, hi], f: subj || "", n: e.titel, u: e.url, s: st };
  if (!subj) row.x = 1; // übergreifend (Leitgedanken, Profile, Grundsatzbände)
  if ("axke".includes(st)) row.v = e.gueltigkeit.replace(/^\[[^\]]*\]\s*/, "").slice(0, 220);
  out.push(row);
}

// Kompakt: Wiederkehrende Texte (Schulart, Fach, Link-Anfänge) als Tabellen
const tab = arr => { const m = new Map(); return { id: v => { if (!m.has(v)) m.set(v, m.size); return m.get(v); }, list: () => [...m.keys()] }; };
const A = tab(), F = tab(), T = tab(), P = tab();
const rows = out.map(r => {
  const cut = r.u.lastIndexOf("/", r.u.length - 2);
  return [r.l, T.id(r.t), A.id(r.a), r.g[0], r.g[1], F.id(r.f), r.n, P.id(r.u.slice(0, cut + 1)), r.u.slice(cut + 1), r.s, r.x || 0, r.v || ""];
});
const js = `/* ===================== Bildungspläne (erzeugt mit tools/bildungsplaene.mjs, nicht von Hand bearbeiten) =====================
   Quelle: Master-Index der Bildungspläne der Sekundarstufen I und II aller 16 Länder, Stand ${stand}. ${rows.length} Dokumente.
   Zeile: [Land, Schularten, Schulart des Landes, Klasse von, Klasse bis, Fach, Titel, Link-Anfang, Link-Ende, Status, übergreifend, Gültigkeit] */
window.PLAN_DB = {stand:${JSON.stringify(stand)},
types:${JSON.stringify(T.list())},
arten:${JSON.stringify(A.list())},
faecher:${JSON.stringify(F.list())},
pre:${JSON.stringify(P.list())},
rows:${JSON.stringify(rows)}};
`;
writeFileSync(join(root, "data", "bildungsplaene.js"), js);
console.log(`${rows.length} Dokumente übernommen, ${skipped} ausgelassen (außer Kraft, Entwurf, Weiterbildungskolleg) – ${(js.length / 1024).toFixed(0)} KB`);
