// Startet die echte Edge Function merkwerk-tts lokal für den Browser-Test (tests/e2e-audio.mjs).
// Nur der Aufruf an Google wird ersetzt: Statt Sprache liefert ein lokales ffmpeg einen Ton als MP3
// (Tonhöhe je Stimme, Länge je nach Text, mit Stille am Anfang und Ende). Jeder Aufruf wird in E2E_TTS_LOG protokolliert.
const realFetch = globalThis.fetch;
const HZ: Record<string, number> = { Kore: 330, Aoede: 440, Charon: 220 };
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!url.startsWith("https://texttospeech.googleapis.com/")) return realFetch(input, init);
  const body = JSON.parse(String(init?.body));
  const key = new URL(url).searchParams.get("key");
  if (key !== "test-google-key") return new Response("{}", { status: 403 });
  const voice = String(body.voice.name).split("-").pop()!;
  const secs = Math.min(4, Math.max(0.6, body.input.text.length / 40));
  const out = await new Deno.Command("ffmpeg", { args: ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
    `sine=frequency=${HZ[voice] || 600}:duration=${secs}:sample_rate=24000`, "-af", "adelay=200,apad=pad_dur=0.25,volume=0.5",
    "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", "-f", "mp3", "pipe:1"], stdout: "piped" }).output();
  await Deno.writeTextFile(Deno.env.get("E2E_TTS_LOG")!, JSON.stringify({ voice: body.voice.name, lang: body.voice.languageCode, chars: body.input.text.length }) + "\n", { append: true });
  let bin = ""; for (const b of out.stdout) bin += String.fromCharCode(b);
  return new Response(JSON.stringify({ audioContent: btoa(bin) }), { headers: { "Content-Type": "application/json" } });
};
await import("../../supabase/functions/merkwerk-tts/index.ts");
