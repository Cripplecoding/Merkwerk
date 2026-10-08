// Merkwerk-Sprachausgabe: wandelt die geprüften Sprechskripte von „Audio & Podcast“ in Sprache um.
// Der Schlüssel des Sprachdienstes bleibt hier auf dem Server. Die Seite schickt nur Text (nie Dateien des Lernsets)
// und setzt die Audioteile selbst zu einer Datei zusammen; gespeichert wird hier nichts außer dem Zeichenzähler.
//
// Anfrage (POST, JSON):
//   { probe: true }                                   → ist ein Sprachdienst eingerichtet? (verbraucht nichts)
//   { lang: "de", segments: [{ text, role }] }        → role: "erzaehler" | "moderation" | "experte"
//   Header wie bei merkwerk-ai: Authorization: Bearer <Zugangs-Token aus Supabase Auth>, apikey: <öffentlicher Schlüssel>
// Antwort: { audio: [{ mime, data(base64) }], voices: { role: Stimme }, provider, rest }   (rest = Zeichen, die heute noch gehen)
//          Fehler als JSON { code, message } mit passendem HTTP-Status.
//
// Einstellungen (supabase secrets set …):
//   GOOGLE_TTS_API_KEY           Schlüssel für Google Cloud Text-to-Speech (Standard-Anbieter, Stimmen „Chirp 3: HD“)
//   OPENAI_API_KEY               alternativ: OpenAI (gpt-4o-mini-tts)
//   MERKWERK_TTS_ANBIETER        google | openai (Standard: der, dessen Schlüssel gesetzt ist; Google zuerst)
//   MERKWERK_TTS_STIMMEN         eigene Stimmen, z. B. "erzaehler=Kore,moderation=Aoede,experte=Charon"
//   MERKWERK_TTS_ZEICHEN_NUTZER  Zeichen pro Nutzer und Tag (Standard 40000, etwa 45 Minuten Audio)
//   MERKWERK_TTS_ZEICHEN_IP      Zeichen pro Internetanschluss und Tag (Standard 120000)
//   MERKWERK_TTS_ZEICHEN_GESAMT  Zeichen aller Nutzer zusammen pro Tag (Standard 300000) – Kostenbremse
//   MERKWERK_ORIGINS, MERKWERK_IP_SALT wie bei merkwerk-ai
import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const num = (k: string, d: number) => Number(env(k)) || d;

const LIMIT_NUTZER = num("MERKWERK_TTS_ZEICHEN_NUTZER", 40_000);
const LIMIT_IP = num("MERKWERK_TTS_ZEICHEN_IP", 120_000);
const LIMIT_GESAMT = num("MERKWERK_TTS_ZEICHEN_GESAMT", 300_000);
const ORIGINS = env("MERKWERK_ORIGINS", "https://cripplecoding.github.io").split(",").map((s) => s.trim()).filter(Boolean);
const MAX_SEGMENTS = 16;
const MAX_SEGMENT_CHARS = 1500;  // Google erlaubt 5000 Byte je Anfrage
const MAX_REQUEST_CHARS = 6000;
const ROLES = ["erzaehler", "moderation", "experte"] as const;
type Role = typeof ROLES[number];
const LOCALES: Record<string, string> = { de: "de-DE", en: "en-US", fr: "fr-FR", es: "es-ES", it: "it-IT" };
const LANG_NAMES: Record<string, string> = { de: "Deutsch", en: "Englisch", fr: "Französisch", es: "Spanisch", it: "Italienisch" };

// Geheimer Schlüssel: neue Projekte haben „secret keys“ (SUPABASE_SECRET_KEYS, JSON), ältere den service_role-Schlüssel
function secretKey() {
  try { const k = Object.values(JSON.parse(env("SUPABASE_SECRET_KEYS", "{}")))[0]; if (typeof k === "string" && k) return k; } catch { /* nicht gesetzt */ }
  return env("SUPABASE_SERVICE_ROLE_KEY");
}
const admin = createClient(env("SUPABASE_URL"), secretKey(), { auth: { persistSession: false } });

/* ---------- Anbieter: austauschbar, jeder liefert MP3 für (Text, Rolle, Sprache) ---------- */
class TtsError extends Error { constructor(public code: string, msg = code) { super(msg); } }
interface Provider {
  id: string; label: string;
  voices(lang: string): Record<Role, string>;
  synth(text: string, role: Role, lang: string, signal: AbortSignal): Promise<Uint8Array>;
}
function customVoices(): Partial<Record<Role, string>> {
  const out: Partial<Record<Role, string>> = {};
  for (const p of env("MERKWERK_TTS_STIMMEN").split(",")) { const [r, v] = p.split("=").map((s) => s.trim()); if (ROLES.includes(r as Role) && v) out[r as Role] = v; }
  return out;
}
const statusError = (status: number) => new TtsError(status === 401 || status === 403 ? "tts_key_invalid" : status === 429 ? "rate_limited" : "tts_failed");

// Google Cloud Text-to-Speech, Stimmen „Chirp 3: HD“ (natürlich klingend, viele Sprachen). Zwei klar unterscheidbare Stimmen:
// Moderatorin (Aoede, weiblich) und Experte (Charon, männlich); die Zusammenfassung spricht Kore.
const google: Provider = {
  id: "google", label: "Google Cloud Text-to-Speech",
  voices(lang) {
    const v = { erzaehler: "Kore", moderation: "Aoede", experte: "Charon", ...customVoices() };
    const loc = LOCALES[lang];
    return Object.fromEntries(ROLES.map((r) => [r, v[r].includes("-") ? v[r] : `${loc}-Chirp3-HD-${v[r]}`])) as Record<Role, string>;
  },
  async synth(text, role, lang, signal) {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(env("GOOGLE_TTS_API_KEY"))}`, {
      method: "POST", signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: LOCALES[lang], name: this.voices(lang)[role] },
        audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 },
      }),
    });
    if (!res.ok) { console.error("Google TTS", res.status, await res.text().catch(() => "")); throw statusError(res.status); }
    const j = await res.json();
    if (typeof j.audioContent !== "string") throw new TtsError("tts_failed");
    return Uint8Array.from(atob(j.audioContent), (c) => c.charCodeAt(0));
  },
};

// OpenAI gpt-4o-mini-tts: Sprechweise per Anweisung steuerbar
const openai: Provider = {
  id: "openai", label: "OpenAI",
  voices() { return { erzaehler: "sage", moderation: "coral", experte: "onyx", ...customVoices() } as Record<Role, string>; },
  async synth(text, role, lang, signal) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST", signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("OPENAI_API_KEY")}` },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts", voice: this.voices(lang)[role], input: text, response_format: "mp3",
        instructions: `Sprich ${LANG_NAMES[lang]} als Muttersprache, natürlich betont, ruhig und klar wie in einem professionellen Bildungspodcast. Fachbegriffe deutlich und korrekt aussprechen. ${role === "moderation" ? "Interessiert und freundlich, nicht übertrieben begeistert." : "Sachlich und verständlich erklärend."}`,
      }),
    });
    if (!res.ok) { console.error("OpenAI TTS", res.status, await res.text().catch(() => "")); throw statusError(res.status); }
    return new Uint8Array(await res.arrayBuffer());
  },
};

function provider(): Provider | null {
  const wanted = env("MERKWERK_TTS_ANBIETER").toLowerCase();
  const has = { google: !!env("GOOGLE_TTS_API_KEY"), openai: !!env("OPENAI_API_KEY") };
  if (wanted === "google") return has.google ? google : null;
  if (wanted === "openai") return has.openai ? openai : null;
  return has.google ? google : has.openai ? openai : null;
}

/* ---------- HTTP ---------- */
function cors(origin: string | null): Record<string, string> {
  const ok = origin && (ORIGINS.includes("*") || ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : ORIGINS[0] || "null",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (h: Record<string, string>, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...h, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const fail = (h: Record<string, string>, status: number, code: string, message: string) => json(h, status, { code, message });

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
// Höchstens n Aufrufe gleichzeitig, Reihenfolge der Ergebnisse bleibt
async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } }));
  return out;
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return fail(h, 405, "bad_request", "Nur POST");

  // Anmeldung wie bei merkwerk-ai: jedes Gerät hat ein (auch anonymes) Supabase-Konto; das Limit hängt an dieser ID
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !auth?.user) return fail(h, 401, "session_expired", "Bitte neu anmelden");
  const uid = auth.user.id;

  let body: { probe?: unknown; lang?: unknown; segments?: unknown };
  try { body = await req.json(); } catch { return fail(h, 400, "bad_request", "Ungültige Anfrage"); }
  const p = provider();
  if (!p) return fail(h, 503, "tts_not_configured", "Kein Sprachdienst eingerichtet");
  if (body.probe === true) return json(h, 200, { ok: true, provider: p.id, label: p.label });

  const lang = typeof body.lang === "string" && LOCALES[body.lang] ? body.lang : "de";
  const segs = Array.isArray(body.segments) ? body.segments : [];
  if (!segs.length || segs.length > MAX_SEGMENTS) return fail(h, 400, "bad_request", "Ungültige Anzahl Abschnitte");
  const items: { text: string; role: Role }[] = [];
  for (const s of segs) {
    const text = typeof s?.text === "string" ? s.text.trim() : "";
    if (!text || text.length > MAX_SEGMENT_CHARS || !ROLES.includes(s.role)) return fail(h, 400, "bad_request", "Ungültiger Abschnitt");
    items.push({ text, role: s.role });
  }
  const chars = items.reduce((a, x) => a + x.text.length, 0);
  if (chars > MAX_REQUEST_CHARS) return fail(h, 413, "prompt_too_large", "Zu viel Text auf einmal");

  // Zeichen buchen (pro Nutzer, pro Anschluss, insgesamt)
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unbekannt";
  const ipHash = await sha256(env("MERKWERK_IP_SALT", "merkwerk") + ip);
  const book = (n: number) => admin.rpc("tts_zeichen_buchen", {
    p_nutzer: uid, p_ip: ipHash, p_zeichen: n, p_limit_nutzer: LIMIT_NUTZER, p_limit_ip: LIMIT_IP, p_limit_gesamt: LIMIT_GESAMT,
  });
  const { data: q, error: qErr } = await book(chars);
  if (qErr) { console.error("Zeichen-Buchung", qErr); return fail(h, 500, "server_error", "Limit konnte nicht geprüft werden"); }
  if (!q?.ok) return fail(h, 429, "daily_limit", q?.grund === "gesamt" ? "zeichen_gesamt" : "zeichen");

  try {
    const audio = await pool(items, 4, async (x) => ({ mime: "audio/mpeg", data: encodeBase64(await p.synth(x.text, x.role, lang, req.signal)) }));
    const v = p.voices(lang);
    const voices = Object.fromEntries([...new Set(items.map((x) => x.role))].map((r) => [r, v[r]]));
    return json(h, 200, { audio, voices, provider: p.id, rest: q.rest });
  } catch (e) {
    // Fehlgeschlagen: gebuchte Zeichen zurückgeben
    await book(-chars).then(() => {}, () => {});
    if (req.signal.aborted) return fail(h, 499, "cancelled", "Abgebrochen");
    const code = e instanceof TtsError ? e.code : "tts_failed";
    console.error("Sprachausgabe", e);
    return fail(h, code === "rate_limited" ? 429 : 502, code, "Sprachausgabe fehlgeschlagen");
  }
});
