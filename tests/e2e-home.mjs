// Browser-Test für Startseite und Menü (nicht Teil von npm test, weil er Chromium braucht):
//   Gast ohne Lernsets → Einführung → jede Lernoption-Kachel öffnet die richtige Funktion → Lernset wählen, erstellen, wechseln
//   → Fortschritt bleibt beim Wechsel zwischen den Funktionen → Weiterlernen → Bibliothek, Stundenplan, Lernplan
//   → angemeldetes Konto mit älterem gespeichertem Zustand → Tastaturbedienung. Ohne KI (wie GitHub Pages ohne Server).
//
// Start:  npm i --no-save playwright && node build.mjs && node tests/e2e-home.mjs
// Bildschirmfotos landen in tests/screens/ (Ordner mit SHOTS=pfad ändern).
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(join(process.env.E2E_NODE_MODULES || root, "noop.js"));
const { chromium } = req("playwright");
const url = pathToFileURL(join(root, "dist", "index.html")).href;
const shots = process.env.SHOTS || join(root, "tests", "screens"); mkdirSync(shots, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "merkwerk-home-"));
const material = join(tmp, "Zellbiologie.txt");
writeFileSync(material, "Die Zelle ist die kleinste Einheit des Lebens.\n\nDer Zellkern ist der Ort, an dem die Erbinformation liegt.\n\nMitochondrien sind die Kraftwerke der Zelle, in denen Energie gewonnen wird.\n\nDie Zellmembran ist eine Hülle, die die Zelle von ihrer Umgebung abgrenzt.\n\nRibosomen sind Orte der Proteinbiosynthese im Zellplasma.\n");

let n = 0; const step = (name) => { n++; console.log("✓", name); };
const browser = await chromium.launch();
const errors = [];
async function newPage(viewport, init) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(url);
  return page;
}
const home = async p => { await p.click("#tab-home"); await p.waitForSelector(".tiles"); };
const tile = (p, k) => p.click(`.tile[data-mode="${k}"]`);
const current = p => p.getAttribute(".modebar-modes [aria-current='page']", "data-mb");

// 1. Gast ohne Lernsets
const p = await newPage({ width: 1280, height: 900 });
await p.click("#wGuest"); await p.click("#wSkip"); await p.waitForSelector(".tiles");
assert.equal(await p.locator(".tile").count(), 6);
assert.ok(await p.isVisible("#hFirst"), "Einführung mit „Erstes Lernset erstellen“");
assert.match(await p.textContent(".hero"), /ohne Konto/);
for (const t of ["Interaktive Abfrage", "Karteikarten", "Audiozusammenfassung", "Podcast", "Lerninhalte generieren"]) assert.match(await p.textContent(".tiles"), new RegExp(t));
for (const t of ["Bibliothek", "Stundenplan", "Lernplan"]) assert.match(await p.textContent(".org"), new RegExp(t));
await p.screenshot({ path: join(shots, "start-neu-desktop.png"), fullPage: true });
step("Neuer Gast sieht Einführung, sechs Lernoptionen und Lernorganisation");

// 2. Kachel ohne Lernset → Auswahl → Beispiel → Abfrage startet
await tile(p, "quiz"); await p.waitForSelector("#pkNew");
assert.match(await p.textContent(".modal"), /Neues Lernset erstellen/);
await p.click("#pkEx"); await p.waitForSelector(".q-prompt");
assert.equal(await current(p), "quiz");
assert.match(await p.textContent(".modebar"), /Beispiel: Photosynthese/);
step("Ohne ausgewähltes Lernset fragt die Kachel nach dem Lernset, dann startet die Abfrage");

// 3. Karteikarten: eine Karte einsortieren, zur Abfrage wechseln und zurück – Fortschritt bleibt
await p.click('[data-mb="cards"]'); await p.waitForSelector("#fcCard");
assert.equal(await current(p), "cards");
await p.click("#zKnow"); await p.waitForTimeout(400);
assert.match(await p.textContent(".fc-progress"), /1\s*\/\s*\d+/);
await p.click('[data-mb="quiz"]'); await p.waitForSelector(".q-prompt");
assert.match(await p.textContent(".q-head"), /Frage 1 \/ 15/);
await p.click('[data-mb="cards"]'); await p.waitForSelector("#fcCard");
assert.match(await p.textContent(".fc-progress"), /1\s*\/\s*\d+/);
step("Wechsel zwischen Abfrage und Karteikarten behält beide Fortschritte");

// 4. Startseite: Weiterlernen und Kacheln mit Zustand
await home(p);
assert.match(await p.textContent(".set-card"), /Karteikarten angefangen: 1 von/);
assert.match(await p.textContent('.tile[data-mode="quiz"]'), /Angefangen: Frage 1 von 15/);
assert.match(await p.textContent(".cur-set"), /Beispiel: Photosynthese/);
await p.screenshot({ path: join(shots, "start-desktop.png"), fullPage: true });
await p.click("[data-resume]"); await p.waitForSelector("#fcCard");
step("„Weiterlernen“ setzt die zuletzt genutzte Funktion fort");

// 5. Audiozusammenfassung und Podcast öffnen die Audioansicht im passenden Format
await home(p); await tile(p, "monolog"); await p.waitForSelector("#audSel");
assert.equal(await p.textContent("h1"), "Audiozusammenfassung");
assert.equal(await p.getAttribute('[data-fmt="monolog"]', "aria-checked"), "true");
assert.equal(await current(p), "monolog");
await home(p); await tile(p, "podcast"); await p.waitForSelector("#audSel");
assert.equal(await p.textContent("h1"), "Podcast");
assert.equal(await p.getAttribute('[data-fmt="podcast"]', "aria-checked"), "true");
step("Audiozusammenfassung und Podcast öffnen jeweils ihr Format");

// 6. Probeklausur ohne KI: Hinweis mit nächstem Schritt; Lerninhalte generieren beim Beispiel: neues Lernset
await home(p); await tile(p, "exam"); await p.waitForSelector("#naCards");
assert.match(await p.textContent(".modal"), /braucht KI/);
await p.click("#naCards"); await p.waitForSelector("#fcCard");
await home(p); await tile(p, "generate"); await p.waitForSelector("#nsSubj");
await p.click(".modal [data-close]");
step("Fehlende KI wird erklärt und bietet Karteikarten an; Generieren beim Beispiel legt ein Lernset an");

// 7. Neues Lernset erstellen, Lernoption ohne Material → Hinweis → Hochladen → direkt weiter
await p.click("#hNew, #hFirst"); await p.fill("#nsSubj", "Biologie"); await p.fill("#nsTopic", "Zellbiologie"); await p.click("#nsOwn");
await p.waitForSelector("#dz");
await home(p);
assert.match(await p.textContent(".cur-set"), /Zellbiologie/);
assert.match(await p.textContent('.tile[data-mode="cards"]'), /Lade zuerst Lernmaterial hoch/);
await tile(p, "cards"); await p.waitForSelector("#pendNote");
assert.match(await p.textContent("#pendNote"), /Nächster Schritt/);
await home(p); await tile(p, "monolog"); await p.waitForSelector("#audUpload");
assert.match(await p.textContent("#audUpload"), /Lernmaterial hochladen/);
await p.click("#audUpload"); await p.waitForSelector("#pendNote");
await home(p); await tile(p, "cards"); await p.waitForSelector("#pendNote");
await p.setInputFiles("#fileIn", material); await p.waitForSelector("#pendGo");
await p.click("#pendGo"); await p.waitForSelector("#fcCard");
assert.match(await p.textContent(".modebar"), /Zellbiologie/);
step("Fehlendes Material: Hinweis, „Lernmaterial hochladen“, danach startet die gewählte Lernoption");

// 8. Lernset wechseln (Startseite und Lernansicht)
await p.click("#mbSwitch"); await p.waitForSelector(".pick");
await p.click('.pick:has-text("Beispiel")'); await p.waitForFunction(() => /Photosynthese/.test(document.querySelector(".modebar")?.textContent || ""));
assert.match(await p.textContent(".modebar"), /Beispiel: Photosynthese/);
assert.match(await p.textContent(".fc-progress"), /1\s*\/\s*\d+/);
await home(p); await p.click("#hSwitch"); await p.click('.pick:has-text("Zellbiologie")');
await p.waitForTimeout(200);
assert.match(await p.textContent(".cur-set"), /Zellbiologie/);
step("Lernset wechseln in der Lernansicht und auf der Startseite");

// 9. Lernorganisation
await p.click('.org-tile[data-org="lib"]'); await p.waitForSelector("h1"); assert.equal(await p.textContent("h1"), "Bibliothek");
await home(p); await p.click('.org-tile[data-org="tt"]'); await p.waitForSelector("h1"); assert.match(await p.textContent("h1"), /Stundenplan/);
await home(p); await p.click('.org-tile[data-org="plan"]'); await p.waitForSelector("#plansSec"); assert.match(await p.textContent("#plansSec"), /Lernpläne/);
step("Bibliothek, Stundenplan und Lernplan öffnen sich von der Startseite");

// 10. Geplante Lerneinheit startet direkt
await p.evaluate(() => { const ex = SETS.find(s => s.example); const d = isoDate(today0()); const k = new Date(Date.now() + 9 * 864e5);
  S.items.push({ id: "it_t", type: "klausur", title: "Bio-Klausur", subject: "Biologie", date: isoDate(k), time: "", notes: "", remindDays: null, done: false,
    plan: { setId: ex.id, days: [{ date: d, kind: "wiederholung", sectionIds: [], done: false }] } }); save(); });
await home(p);
assert.match(await p.textContent(".home"), /Bio-Klausur/);
await p.screenshot({ path: join(shots, "start-mit-plan-desktop.png"), fullPage: true });
await p.click("[data-pl]"); await p.waitForSelector(".q-prompt");
assert.match(await p.textContent(".view"), /Lernplan Bio-Klausur/);
step("Anstehende Lerneinheit startet mit einem Klick");

// 11. Neu laden: alles noch da
await p.reload(); await p.waitForSelector(".tiles, .q-prompt");
await home(p);
assert.equal(await p.locator(".set-card").count(), 2);
step("Nach dem Neuladen sind Lernsets, Auswahl und Fortschritt erhalten");

// 12. Smartphone: Kacheln untereinander, alles erreichbar, keine waagerechte Scrollleiste
const m = await newPage({ width: 390, height: 844 });
await m.click("#wGuest"); await m.click("#wSkip"); await m.waitForSelector(".tiles");
const boxes = await m.$$eval(".tile", els => els.map(e => e.getBoundingClientRect()).map(r => ({ x: Math.round(r.x), w: Math.round(r.width) })));
assert.ok(boxes.every(b => b.x === boxes[0].x), "Kacheln untereinander");
assert.equal(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "keine waagerechte Scrollleiste");
await m.screenshot({ path: join(shots, "start-mobil.png"), fullPage: true });
await m.click(".tile[data-mode='cards']"); await m.waitForSelector("#pkNew");
await m.click("#pkEx"); await m.waitForSelector("#fcCard");
await m.screenshot({ path: join(shots, "karteikarten-mobil.png") });
await m.click("#tab-home"); await m.waitForSelector(".tiles");
await m.screenshot({ path: join(shots, "start-mobil-mit-lernset.png"), fullPage: true });
step("Smartphone: Kacheln untereinander und direkt erreichbar");

// 13. Angemeldetes Konto mit älterem gespeichertem Zustand (ohne „zuletzt verwendet“), Tastatur
const acc = { list: [{ id: "k1", provider: "local", sub: "local_1", name: "Joshi Beispiel", email: "", picture: "", createdAt: 1, ls: "merkwerk.v2", db: "merkwerk" }], current: "k1" };
const state = { v: 2, updatedAt: 1, profile: { track: "uni", uni: "Uni Freiburg", program: "Biologie", semester: 3 }, mySubjects: ["Biologie"], activeSet: null,
  timetable: { days: 5, slots: null, entries: [] }, items: [], events: [], ttMode: "cal", remind: { klausur: true, abgabe: true, klausurDays: [14, 7, 1], abgabeDays: [3, 1, 0] }, dismissed: {}, lastView: "home" };
const k = await newPage({ width: 1280, height: 900 }, `if(!sessionStorage.getItem("init")){ localStorage.setItem("merkwerk.accounts", ${JSON.stringify(JSON.stringify(acc))}); localStorage.setItem("merkwerk.v2", ${JSON.stringify(JSON.stringify(state))}); sessionStorage.setItem("init","1"); }`);
await k.reload(); await k.waitForSelector(".tiles");
assert.match(await k.textContent(".hero h1"), /Hallo, Joshi!/);
assert.match(await k.textContent("#accountChip"), /Joshi Beispiel/);
await k.focus(".tile[data-mode='quiz']"); await k.keyboard.press("Enter"); await k.waitForSelector("#pkNew");
await k.keyboard.press("Escape").catch(() => {}); await k.click(".modal [data-close]");
await k.focus("#tab-learn"); await k.keyboard.press("Enter"); await k.waitForSelector("#setChips");
step("Angemeldet: Begrüßung mit Namen, Konto oben rechts, Bedienung per Tastatur");

// 14. Dunkles Farbschema
const d = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" }); const dp = await d.newPage();
await dp.goto(url); await dp.click("#wGuest"); await dp.click("#wSkip"); await dp.waitForSelector(".tiles");
await dp.screenshot({ path: join(shots, "start-dunkel.png"), fullPage: true });
step("Dunkles Farbschema");

await browser.close();
assert.deepEqual(errors, [], "Fehler im Browser: " + errors.join(" | "));
console.log(`\n${n} Prüfungen bestanden – Bildschirmfotos in ${shots}`);
