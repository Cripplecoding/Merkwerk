// Browser-Test für „Audio & Podcast“ von Anfang bis Ende (nicht Teil von npm test, weil er Chromium, Deno und ffmpeg braucht):
//   Lernset mit zwei Dokumenten hochladen → Audiozusammenfassung erzeugen (mit Korrekturrunde) → abspielen, springen,
//   Geschwindigkeit, Download → Podcast mit zwei Stimmen → Formatwechsel ohne Neuerzeugung → Neuladen → Material ändern.
// Echt sind dabei: die ganze Seite (dist/index.html) und die Edge Function merkwerk-tts. Gespielt sind: Claude (feste Antworten
// aus tests/audio-fixture.mjs), Supabase-Anmeldung und Zeichenzähler, und Google (liefert per ffmpeg Töne statt Sprache).
//
// Start:  npm i --no-save playwright lamejs@1.2.1 && node tests/e2e-audio.mjs
// Braucht: Chromium für Playwright, ffmpeg mit libmp3lame, npx (lädt Deno).
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { DOCS, fakeClaude } from "./audio-fixture.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(join(process.env.E2E_NODE_MODULES || root, "noop.js"));
const { chromium } = req("playwright");
const lamePath = req.resolve("lamejs/lame.min.js");
const GW = 54321, tmp = mkdtempSync(join(tmpdir(), "merkwerk-e2e-")), ttsLog = join(tmp, "tts.log");
writeFileSync(ttsLog, "");

// 1. Seite mit Server-Adresse bauen, danach dist/ wieder ohne Adresse herstellen
const build = env => { const r = spawnSync("node", ["build.mjs"], { cwd: root, env: { ...process.env, ...env } }); assert.equal(r.status, 0, String(r.stderr)); };
build({ MERKWERK_AI_URL: `http://127.0.0.1:${GW}`, MERKWERK_AI_ANON_KEY: "anon-test" });
const page_html = readFileSync(join(root, "dist", "index.html"), "utf8");
build({ MERKWERK_AI_URL: "", MERKWERK_AI_ANON_KEY: "" });
const plain_html = readFileSync(join(root, "dist", "index.html"), "utf8"); // so wie auf GitHub Pages ohne eingerichteten Server

// 2. Echte Edge Function merkwerk-tts mit Deno
writeFileSync(join(tmp, "deno.json"), JSON.stringify({ nodeModulesDir: "auto" }));
const deno = spawn("npx", ["--yes", "deno", "run", "--quiet", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "--allow-run=ffmpeg", "--config", join(tmp, "deno.json"), join(root, "tests", "e2e", "tts-runner.ts")],
  { cwd: tmp, env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${GW}`, SUPABASE_SERVICE_ROLE_KEY: "service-test", GOOGLE_TTS_API_KEY: "test-google-key", E2E_TTS_LOG: ttsLog, MERKWERK_ORIGINS: `http://127.0.0.1:${GW}` }, stdio: ["ignore", "inherit", "inherit"] });

// 3. Gespielter Supabase-Server: Anmeldung, Zeichenzähler, merkwerk-ai (Claude), Weiterleitung an merkwerk-tts, Seite
const claude = {}; const quota = { nutzer: 0 };
const body = r => new Promise(res => { let b = ""; r.on("data", c => b += c); r.on("end", () => res(b)); });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const gw = createServer(async (rq, rs) => {
  const url = new URL(rq.url, "http://x");
  if (rq.method === "OPTIONS") { rs.writeHead(200, cors); return rs.end(); }
  if (url.pathname === "/app/" || url.pathname === "/app/index.html") { rs.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return rs.end(page_html); }
  if (url.pathname === "/plain/") { rs.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return rs.end(plain_html); }
  if (url.pathname === "/auth/v1/signup") { await body(rq); rs.writeHead(200, { ...cors, "Content-Type": "application/json" }); return rs.end(JSON.stringify({ access_token: "user-token", refresh_token: "r", expires_in: 3600 })); }
  if (url.pathname === "/auth/v1/user") { // supabase-js admin.auth.getUser
    const ok = rq.headers.authorization === "Bearer user-token";
    rs.writeHead(ok ? 200 : 401, { "Content-Type": "application/json" });
    return rs.end(JSON.stringify(ok ? { id: "u-1", aud: "authenticated", role: "authenticated", is_anonymous: true } : { code: 401, msg: "invalid JWT" }));
  }
  if (url.pathname === "/rest/v1/rpc/tts_zeichen_buchen") {
    const a = JSON.parse(await body(rq)); assert.equal(rq.headers.authorization, "Bearer service-test");
    if (a.p_zeichen > 0 && quota.nutzer + a.p_zeichen > a.p_limit_nutzer) { rs.writeHead(200, { "Content-Type": "application/json" }); return rs.end(JSON.stringify({ ok: false, grund: "nutzer", rest: 0 })); }
    quota.nutzer = Math.max(0, quota.nutzer + a.p_zeichen);
    rs.writeHead(200, { "Content-Type": "application/json" }); return rs.end(JSON.stringify({ ok: true, grund: null, rest: a.p_limit_nutzer - quota.nutzer }));
  }
  if (url.pathname === "/functions/v1/merkwerk-ai") {
    const j = JSON.parse(await body(rq));
    const text = JSON.stringify(fakeClaude(j.prompt, claude));
    await new Promise(r => setTimeout(r, 150));
    rs.writeHead(200, { ...cors, "Content-Type": "application/x-ndjson" });
    return rs.end(JSON.stringify({ t: "done", text, rest: 20 }) + "\n");
  }
  if (url.pathname === "/functions/v1/merkwerk-tts") {
    const b = await body(rq);
    const r = await fetch("http://127.0.0.1:8000/", { method: "POST", body: b, headers: { "Content-Type": "application/json", Authorization: rq.headers.authorization || "", Origin: rq.headers.origin || "" } });
    rs.writeHead(r.status, { ...cors, "Content-Type": "application/json" }); return rs.end(Buffer.from(await r.arrayBuffer()));
  }
  rs.writeHead(404); rs.end();
}).listen(GW);
for (let i = 0; i < 120; i++) { try { await fetch("http://127.0.0.1:8000/", { method: "OPTIONS" }); break; } catch { await new Promise(r => setTimeout(r, 500)); } }

let n = 0; const step = (name) => { n++; console.log("✓", name); };
const ttsCalls = () => readFileSync(ttsLog, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const browser = await chromium.launch({ executablePath: existsSync("/opt/pw-browsers/chromium") ? undefined : undefined, args: ["--autoplay-policy=no-user-gesture-required"] });
try {
  // Rechte: ohne gültige Anmeldung liefert die Funktion nichts
  let r = await fetch(`http://127.0.0.1:${GW}/functions/v1/merkwerk-tts`, { method: "POST", body: JSON.stringify({ probe: true }) });
  assert.equal(r.status, 401);
  r = await fetch(`http://127.0.0.1:${GW}/functions/v1/merkwerk-tts`, { method: "POST", headers: { Authorization: "Bearer user-token" }, body: JSON.stringify({ lang: "de", segments: [{ text: "x".repeat(2000), role: "erzaehler" }] }) });
  assert.equal(r.status, 400);
  step("Sprachausgabe-Server: ohne Anmeldung 401, zu langer Abschnitt abgelehnt");

  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });
  await ctx.route("https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js", rt => rt.fulfill({ body: readFileSync(lamePath, "utf8"), contentType: "text/javascript" }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, rt => rt.abort());
  await ctx.addInitScript(() => {
    if (localStorage.getItem("merkwerk.accounts")) return;
    localStorage.setItem("merkwerk.accounts", JSON.stringify({ list: [{ id: "t1", provider: "local", sub: "x", name: "Test", ls: "merkwerk.v2", db: "merkwerk" }], current: "t1" }));
    localStorage.setItem("merkwerk.v2", JSON.stringify({ v: 2, profile: { track: "schule", state: "BY", type: "gym", grade: 10 }, lastView: "learn" }));
    localStorage.setItem("merkwerk.ki.einwilligung", "true");
  });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${GW}/app/`);

  // Lernset mit zwei Dokumenten anlegen
  await page.click("#tab-learn"); await page.click("#e2");
  await page.fill("#ns input >> nth=0", "Wirtschaft").catch(() => {});
  await page.click("#nsOwn");
  await page.setInputFiles("#fileIn", DOCS.map(d => ({ name: d.name, mimeType: "text/plain", buffer: Buffer.from(d.text) })));
  await page.waitForSelector("text=Inflation.txt"); await page.waitForSelector("text=Geldpolitik.txt");
  assert.ok(await page.isVisible("#startBtn") && await page.isVisible("#cardsBtn") && await page.isVisible("#examBtn"), "bisherige Lernmodi bleiben");
  step("Lernset mit zwei Dokumenten hochgeladen, bisherige Lernmodi vorhanden");

  // Audiozusammenfassung
  await page.click("#audioBtn");
  await page.waitForSelector(".aud-seg");
  assert.equal(await page.getAttribute('[data-fmt="monolog"]', "aria-checked"), "true");
  assert.ok(await page.isVisible("text=Lass dir deinen Lernstoff verständlich von einer KI-Stimme erklären."));
  await page.click('[data-len="standard"]');
  await page.waitForSelector("#audGo");
  await page.waitForFunction(() => !document.querySelector("#audMain .note.warn"), null, { timeout: 15000 }); // Sprachausgabe eingerichtet
  await page.click("#audGo");
  await page.waitForSelector(".aud-steps");
  await page.waitForSelector("#ttsOk", { timeout: 60000 }); await page.click("#ttsOk");
  await page.waitForSelector("#aud", { state: "attached", timeout: 120000 });
  assert.ok(await page.isVisible("text=Fertig! Dein Lernstoff ist bereit zum Anhören."));
  assert.equal(claude.units, 1); assert.equal(claude.monolog, 1); assert.equal(claude.repairs, 1, "falsche Zahl wurde korrigiert");
  assert.match(await page.textContent("#audMain .note"), /Geprüft: alle 5 Inhalte/);
  const tx = await page.textContent("#txList");
  assert.ok(tx.includes("2 Prozent") && !tx.includes("3 Prozent"));
  const mono = ttsCalls(); assert.ok(mono.length >= 5 && mono.every(c => c.voice === "de-DE-Chirp3-HD-Kore"), JSON.stringify(mono));
  step("Audiozusammenfassung erzeugt: Analyse, Korrekturrunde, Prüfung, eine Stimme");

  // Abspielen, springen, Geschwindigkeit, Lautstärke
  const dur = await page.evaluate(() => new Promise(res => { const a = document.querySelector("#aud"); if (a.readyState >= 1) res(a.duration); else a.onloadedmetadata = () => res(a.duration); }));
  assert.ok(dur > 5, "Dauer " + dur);
  await page.click("#audPlay");
  await page.waitForFunction(() => document.querySelector("#aud").currentTime > 0.5, null, { timeout: 15000 });
  assert.equal(await page.getAttribute("#audPlay", "aria-label"), "Pausieren");
  await page.click("#audPlay"); const t0 = await page.evaluate(() => document.querySelector("#aud").currentTime);
  await page.click("#audFwd"); const t1 = await page.evaluate(() => document.querySelector("#aud").currentTime);
  assert.ok(Math.abs(t1 - Math.min(dur, t0 + 10)) < 0.6, `${t0} → ${t1}`);
  await page.click("#audBack"); const t2 = await page.evaluate(() => document.querySelector("#aud").currentTime);
  assert.ok(Math.abs(t2 - Math.max(0, t1 - 10)) < 0.6);
  await page.fill("#audSeek", "3"); await page.dispatchEvent("#audSeek", "change");
  assert.ok(Math.abs(await page.evaluate(() => document.querySelector("#aud").currentTime) - 3) < 0.6);
  assert.equal(await page.$$eval("[data-rate]", b => b.map(x => x.textContent).join(" ")), "0,75× 1× 1,25× 1,5× 1,75× 2×");
  await page.click('[data-rate="1.5"]'); assert.equal(await page.evaluate(() => document.querySelector("#aud").playbackRate), 1.5);
  await page.fill("#audVol", "0.5"); assert.equal(await page.evaluate(() => document.querySelector("#aud").volume), 0.5);
  assert.equal(await page.textContent("#audDur"), (await page.evaluate(() => { const t = Math.floor(document.querySelector("#aud").duration); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); })));
  step("Player: Abspielen/Pausieren, ±10 s, Springen, Geschwindigkeit 0,75–2×, Lautstärke, Dauer");

  // Transkript springt an die Stelle
  await page.click("#audTx summary");
  await page.click("#txList li[data-i='3']");
  const seg3 = Number(await page.getAttribute("#txList li[data-i='3']", "data-t"));
  await page.waitForFunction(t => document.querySelector("#aud").currentTime >= t, seg3);
  await page.waitForSelector("#txList li.on");
  await page.click("#audPlay");
  // Download
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#audDl")]);
  const file = readFileSync(await dl.path());
  const dlName = await page.getAttribute("#audDl", "download");
  assert.ok(dlName.endsWith(".mp3") && dlName.includes("Zusammenfassung"), dlName);
  assert.ok(file.length > 10000 && (file[0] === 0xff || file.slice(0, 3).toString() === "ID3"), "MP3-Datei");
  writeFileSync(join(tmp, "zusammenfassung.mp3"), file);
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_name,sample_rate,channels", "-of", "json", join(tmp, "zusammenfassung.mp3")]);
  const info = JSON.parse(String(probe.stdout));
  assert.equal(info.streams[0].codec_name, "mp3"); assert.ok(Math.abs(Number(info.format.duration) - dur) < 1.5);
  step(`Transkript mit Sprungmarken, Download als MP3 (${(file.length / 1024).toFixed(0)} KB, ${Number(info.format.duration).toFixed(1)} s)`);

  // Podcast aus derselben Grundlage, Doppelklick erzeugt nur einen Auftrag
  const before = ttsCalls().length;
  await page.click('[data-fmt="podcast"]');
  await page.waitForSelector("#audGo");
  assert.match(await page.textContent("#audMain"), /entsteht aus derselben Inhaltsgrundlage/);
  await page.dblclick("#audGo").catch(() => {});
  await page.waitForSelector("#aud", { state: "attached", timeout: 120000 });
  assert.equal(claude.podcast, 1); assert.equal(claude.units, 1, "keine neue Analyse");
  const pod = ttsCalls().slice(before);
  assert.deepEqual([...new Set(pod.map(c => c.voice))].sort(), ["de-DE-Chirp3-HD-Aoede", "de-DE-Chirp3-HD-Charon"]);
  const ptx = await page.textContent("#txList");
  assert.ok(ptx.includes("Moderatorin:") && ptx.includes("Experte:"));
  assert.match(await page.textContent("#audMain .note"), /Zusammenfassung und Podcast vermitteln dieselben Inhalte/);
  assert.match(await page.textContent("#audMain"), /Aoede/);
  step("KI-Podcast mit zwei Stimmen aus derselben Grundlage; Doppelklick startet nur einen Auftrag");

  // Zurück zur Zusammenfassung: sofort da, nichts neu erzeugt
  const callsNow = ttsCalls().length;
  await page.click('[data-fmt="monolog"]'); await page.waitForSelector("#aud", { state: "attached" });
  assert.equal(ttsCalls().length, callsNow); assert.equal(claude.monolog, 1);
  await page.keyboard.press("Tab");
  step("Formatwechsel spielt gespeicherte Fassung ohne Neuerzeugung");

  // Neu laden: Audio ist noch da
  await page.reload(); await page.click("#tab-learn"); await page.click("#audioBtn");
  await page.waitForSelector("#aud", { state: "attached" });
  assert.ok(await page.evaluate(() => new Promise(res => { const a = document.querySelector("#aud"); if (a.readyState >= 1) res(a.duration > 5); else a.onloadedmetadata = () => res(a.duration > 5); })));
  assert.equal(ttsCalls().length, callsNow);
  step("Nach dem Neuladen wieder verfügbar (gespeichert auf dem Gerät)");

  // Handy-Breite: kein seitliches Scrollen
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(200);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "kein horizontales Scrollen");
  await page.screenshot({ path: join(tmp, "audio-mobil.png"), fullPage: true });
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.screenshot({ path: join(tmp, "audio-desktop.png"), fullPage: true });
  step("Mobil (375 px) ohne seitliches Scrollen");

  // Material ändern → Hinweis „nicht mehr aktuell“
  await page.click("#backSets");
  await page.click("#readText summary");
  const ta = await page.$("textarea[id^='tx_']"); await ta.fill(DOCS[0].text + "\n\nNeuer Absatz zur Deflation.");
  await page.click("[data-savetx]");
  await page.click("#audioBtn");
  await page.waitForSelector("#audRefresh");
  assert.equal(await page.locator("#aud").count(), 1, "alte Fassung bleibt abspielbar");
  step("Geändertes Material wird erkannt, alte Fassung bleibt bis zur Aktualisierung");

  // Ohne Server und ohne Claude (GitHub Pages heute): Beispiel liefert geprüftes Skript, klarer Hinweis, keine vorgetäuschte Audiodatei
  const ctx2 = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  await ctx2.route(/fonts\.(googleapis|gstatic)\.com/, rt => rt.abort());
  await ctx2.addInitScript(() => {
    if (localStorage.getItem("merkwerk.accounts")) return;
    localStorage.setItem("merkwerk.accounts", JSON.stringify({ list: [{ id: "t1", provider: "local", sub: "x", name: "Test", ls: "merkwerk.v2", db: "merkwerk" }], current: "t1" }));
    localStorage.setItem("merkwerk.v2", JSON.stringify({ v: 2, profile: { track: "schule", state: "BY", type: "gym", grade: 10 }, lastView: "learn" }));
  });
  const p2 = await ctx2.newPage(); p2.on("pageerror", e => errors.push(String(e)));
  await p2.goto(`http://127.0.0.1:${GW}/plain/`);
  await p2.click("#tab-learn"); await p2.click("#e1"); await p2.click("#audioBtn");
  await p2.click('[data-fmt="podcast"]'); await p2.click("#audGo");
  await p2.waitForSelector("#dvPlay");
  assert.equal(await p2.locator("#aud").count(), 0, "keine Audiodatei ohne Sprachausgabe");
  assert.match(await p2.textContent("#audMain"), /noch nicht eingerichtet/);
  assert.match(await p2.textContent("#audMain .note"), /Geprüft: alle 14 Inhalte/);
  await p2.click("#audTx summary"); assert.match(await p2.textContent("#txList"), /Moderatorin: Hallo/);
  await p2.screenshot({ path: join(tmp, "audio-ohne-server.png"), fullPage: true });
  step("Ohne Server: Beispiel-Podcast mit geprüftem Skript, Hinweis zur Einrichtung, Gerätestimme als Ersatz");

  assert.deepEqual(errors, []);
  console.log(`\n${n} Schritte bestanden · Bildschirmfotos und MP3 in ${tmp}`);
} finally {
  await browser.close(); gw.close(); deno.kill();
}
