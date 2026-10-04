// Merkwerk-KI für alle: nimmt Anfragen der Seite (GitHub Pages) entgegen, prüft Anmeldung und Tageslimit
// und fragt Claude über die Claude API. Der API-Schlüssel bleibt hier auf dem Server.
//
// Anfrage (POST, JSON):  { prompt, images?: [{media_type, data(base64)}], tier?: "quick"|"default" }
//   Header: Authorization: Bearer <Zugangs-Token aus Supabase Auth>, apikey: <anon key>
// Antwort: NDJSON-Strom, eine Zeile pro Ereignis:
//   {"t":"text","text":"…bisheriger Gesamttext…"}   (laufend, für die Fortschrittsanzeige)
//   {"t":"done","text":"…","rest":17}                (fertig; rest = verbleibende Anfragen heute)
//   {"t":"error","code":"…","message":"…"}
// Fehler vor dem Start kommen als JSON {code, message} mit passendem HTTP-Status.
//
// Einstellungen (supabase secrets set …), alle außer ANTHROPIC_API_KEY optional:
//   ANTHROPIC_API_KEY        Schlüssel aus console.anthropic.com
//   MERKWERK_MODEL_DEFAULT   Modell für Fragen, Karten, Bewertung (Standard claude-opus-5-5)
//   MERKWERK_MODEL_QUICK     schnelles Modell für Texterkennung und kleine Prüfungen (Standard claude-haiku-4-5)
//   MERKWERK_EFFORT          Denkaufwand des Standardmodells: low|medium|high (Standard medium)
//   MERKWERK_LIMIT_NUTZER    Anfragen pro Nutzer und Tag (Standard 30)
//   MERKWERK_LIMIT_IP        Anfragen pro Internetanschluss und Tag (Standard 100)
//   MERKWERK_LIMIT_GESAMT    Anfragen aller Nutzer zusammen pro Tag (Standard 300) – Kostenbremse
//   MERKWERK_ORIGINS         erlaubte Seiten, kommagetrennt (Standard https://cripplecoding.github.io)
//   MERKWERK_IP_SALT         beliebiger geheimer Text, damit IP-Adressen nur als Hash gespeichert werden
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const num = (k: string, d: number) => Number(env(k)) || d;

const MODEL_DEFAULT = env("MERKWERK_MODEL_DEFAULT", "claude-opus-5-5");
const MODEL_QUICK = env("MERKWERK_MODEL_QUICK", "claude-haiku-4-5");
const EFFORT = env("MERKWERK_EFFORT", "medium");
const LIMIT_NUTZER = num("MERKWERK_LIMIT_NUTZER", 30);
const LIMIT_IP = num("MERKWERK_LIMIT_IP", 100);
const LIMIT_GESAMT = num("MERKWERK_LIMIT_GESAMT", 300);
const ORIGINS = env("MERKWERK_ORIGINS", "https://cripplecoding.github.io").split(",").map((s) => s.trim()).filter(Boolean);
const MAX_PROMPT = 600_000;   // Zeichen; größere Lernsets soll die Seite aufteilen
const MAX_IMAGES = 5;
const MAX_IMAGE_B64 = 6_000_000; // ≈ 4,5 MB pro Bild (die Seite verkleinert vorher)
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const anthropic = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") });
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

function cors(origin: string | null): Record<string, string> {
  const ok = origin && (ORIGINS.includes("*") || ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : ORIGINS[0] || "null",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const fail = (h: Record<string, string>, status: number, code: string, message: string) =>
  new Response(JSON.stringify({ code, message }), { status, headers: { ...h, "Content-Type": "application/json" } });

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return fail(h, 405, "bad_request", "Nur POST");

  // Anmeldung: jedes Gerät hat ein (auch anonymes) Supabase-Konto; das Limit hängt an dieser ID.
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !auth?.user) return fail(h, 401, "session_expired", "Bitte neu anmelden");
  const uid = auth.user.id;

  let body: { prompt?: unknown; images?: unknown; tier?: unknown };
  try { body = await req.json(); } catch { return fail(h, 400, "bad_request", "Ungültige Anfrage"); }
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt.trim()) return fail(h, 400, "bad_request", "Leere Anfrage");
  if (prompt.length > MAX_PROMPT) return fail(h, 413, "prompt_too_large", "Material zu groß");
  const images = Array.isArray(body.images) ? body.images : [];
  if (images.length > MAX_IMAGES) return fail(h, 413, "prompt_too_large", "Zu viele Bilder");
  for (const im of images) {
    if (!im || !IMAGE_TYPES.includes(im.media_type) || typeof im.data !== "string" || im.data.length > MAX_IMAGE_B64)
      return fail(h, 400, "image_rejected", "Bild nicht lesbar");
  }
  const quick = body.tier === "quick";

  // Tageslimit buchen (pro Nutzer, pro Anschluss, insgesamt)
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unbekannt";
  const ipHash = await sha256(env("MERKWERK_IP_SALT", "merkwerk") + ip);
  const { data: q, error: qErr } = await admin.rpc("ki_anfrage_buchen", {
    p_nutzer: uid, p_ip: ipHash, p_limit_nutzer: LIMIT_NUTZER, p_limit_ip: LIMIT_IP, p_limit_gesamt: LIMIT_GESAMT,
  });
  if (qErr) { console.error("Limit-Buchung", qErr); return fail(h, 500, "server_error", "Limit konnte nicht geprüft werden"); }
  if (!q?.ok) return fail(h, 429, "daily_limit", q?.grund === "gesamt" ? "gesamt" : "nutzer");

  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...images.map((im: { media_type: string; data: string }) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: im.media_type as "image/jpeg", data: im.data },
    })),
    { type: "text", text: prompt },
  ];
  // Standardmodell: denkt adaptiv; bei einer Ablehnung durch die Sicherheitsprüfung springt serverseitig ein Ersatzmodell ein.
  const params: Record<string, unknown> = quick
    ? { model: MODEL_QUICK, max_tokens: 16000, messages: [{ role: "user", content }] }
    : {
      model: MODEL_DEFAULT, max_tokens: 32000, messages: [{ role: "user", content }],
      thinking: { type: "adaptive" }, output_config: { effort: EFFORT },
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    };

  const enc = new TextEncoder();
  const out = new ReadableStream({
    async start(ctl) {
      const send = (o: unknown) => ctl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      let text = "", last = 0;
      const stream = anthropic.beta.messages.stream(params as unknown as Anthropic.Beta.MessageCreateParamsStreaming, { signal: req.signal });
      try {
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            text += ev.delta.text;
            if (Date.now() - last > 400) { last = Date.now(); send({ t: "text", text }); }
          }
        }
        const msg = await stream.finalMessage();
        admin.rpc("ki_token_buchen", { p_nutzer: uid, p_ein: msg.usage.input_tokens, p_aus: msg.usage.output_tokens }).then(() => {}, () => {});
        if (msg.stop_reason === "refusal") { send({ t: "error", code: "refused", message: "abgelehnt" }); return; }
        const final = msg.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.Beta.BetaTextBlock).text).join("");
        send({ t: "done", text: final || text, rest: q.rest, truncated: msg.stop_reason === "max_tokens" });
      } catch (e) {
        if (req.signal.aborted) return;
        let code = "server_error";
        if (e instanceof Anthropic.RateLimitError) code = "rate_limited";
        else if (e instanceof Anthropic.BadRequestError) code = /too long|too large|maximum/i.test(e.message) ? "prompt_too_large" : /image/i.test(e.message) ? "image_rejected" : "bad_request";
        else if (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500) code = "overloaded";
        console.error("Claude-Anfrage", e);
        send({ t: "error", code, message: "Anfrage fehlgeschlagen" });
      } finally {
        try { ctl.close(); } catch { /* schon geschlossen */ }
      }
    },
  });
  return new Response(out, { headers: { ...h, "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
});
