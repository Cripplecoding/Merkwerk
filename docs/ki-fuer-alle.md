# KI für alle: Merkwerk mit Claude außerhalb von claude.ai

Bisher gibt es die KI-Funktionen (Fragen und Karteikarten erstellen, Fotos und Handschrift lesen, Antworten nach Sinn bewerten, Lerntexte schreiben, Stundenplan aus Screenshot) nur in der claude.ai-Version. Damit sie auch auf https://cripplecoding.github.io/Merkwerk/ für alle laufen, braucht Merkwerk einen kleinen eigenen Server, der Claude im Namen der Seite fragt. Der Code dafür liegt im Repository; was noch fehlt, sind zwei Konten und ein paar Einträge in GitHub.

## So funktioniert es

```
Browser (GitHub Pages)  ──►  Supabase Edge Function „merkwerk-ai“  ──►  Claude API (Anthropic)
   src/04c_ai.js              supabase/functions/merkwerk-ai/          dein API-Schlüssel
                              prüft Anmeldung und Tageslimit
                              Tabelle ki_nutzung (supabase/migrations/)
```

- **Anmeldung:** Jedes Gerät bekommt beim ersten KI-Aufruf automatisch ein anonymes Supabase-Konto, ohne Formular. Daran hängt das Tageslimit. Die bestehende Merkwerk-Anmeldung (Google, Apple, Microsoft) bleibt, wie sie ist.
- **Tageslimit:** pro Gerät 30 Anfragen, pro Internetanschluss 100 und für alle zusammen 300 am Tag. Danach sagt die Seite „Tageslimit erreicht, morgen geht es weiter“. Alle drei Zahlen lassen sich ändern (unten).
- **Modelle:** Fragen, Karteikarten, Bewertung und Lerntexte macht Claude Opus 5.5, die Texterkennung und kleine Prüfungen das schnelle Claude Haiku 4.5, genau wie bisher „Standard“ und „schnell“ in claude.ai.
- **Einwilligung:** Beim ersten KI-Aufruf fragt die Seite einmal, ob das Material an Claude geschickt werden darf.
- **claude.ai-Version:** ändert sich nicht. Dort nutzt Merkwerk weiter das Claude-Konto der Person.
- Solange nichts eingerichtet ist, verhält sich die Seite genau wie heute (ohne KI).

## Was du einrichten musst

### 1. Claude-API-Schlüssel

1. Auf https://console.anthropic.com ein Konto anlegen, unter *Billing* Guthaben aufladen oder eine Zahlungsart hinterlegen.
2. **Unter *Limits* ein monatliches Ausgabenlimit setzen** (zum Beispiel 50 $). Das ist die eigentliche Kostenbremse, falls jemand das Tageslimit umgeht.
3. Unter *API Keys* einen Schlüssel erstellen (beginnt mit `sk-ant-`). Nur einmal sichtbar, also gleich kopieren.

### 2. Supabase-Projekt

1. Auf https://supabase.com mit GitHub anmelden, *New project*, Name „merkwerk“, Region *Frankfurt (eu-central-1)*. Das Datenbank-Passwort notieren.
2. *Authentication → Sign In / Providers →* „Allow anonymous sign-ins“ einschalten.
3. Diese Werte notieren:
   - *Project Settings → General →* **Project ID** (die Projekt-Kennung, z. B. `abcd1234efgh5678`)
   - **Project URL** `https://<Project ID>.supabase.co` (steht auch im Fenster *Connect* oben im Dashboard)
   - *Project Settings → API Keys →* **Publishable key** (beginnt mit `sb_publishable_`; bei älteren Projekten geht auch der „anon“-Schlüssel unter *Legacy API Keys*)
4. Unter https://supabase.com/dashboard/account/tokens einen **Access Token** erstellen.

Der kostenlose Supabase-Tarif reicht für den Anfang.

### 3. Einträge in GitHub

Im Repository unter *Settings → Secrets and variables → Actions*:

**Secrets** (geheim):

| Name | Wert |
|---|---|
| `ANTHROPIC_API_KEY` | der Claude-API-Schlüssel |
| `SUPABASE_ACCESS_TOKEN` | der Supabase Access Token |
| `SUPABASE_PROJECT_REF` | die Project ID |
| `SUPABASE_DB_PASSWORD` | das Datenbank-Passwort |

**Variables** (öffentlich, landen in der Seite):

| Name | Wert |
|---|---|
| `MERKWERK_AI_URL` | die Project URL |
| `MERKWERK_AI_ANON_KEY` | der Publishable key |

### 4. Starten

1. *Actions → „KI-Server (Supabase) einrichten“ → Run workflow*. Das legt die Tabelle an, hinterlegt den Schlüssel und veröffentlicht die Funktion.
2. *Actions → „Test und GitHub Pages“ → Run workflow* (oder der nächste Merge auf `main`). Danach hat die Seite die KI-Funktionen.

Alternativ geht das alles auch ohne GitHub Actions mit der Supabase-CLI: `supabase link`, `supabase db push`, `supabase secrets set ANTHROPIC_API_KEY=…`, `supabase functions deploy merkwerk-ai`, und die zwei Werte in `AI_CONFIG` in `src/04c_ai.js` eintragen.

## Einstellungen ändern

Als Repository-Variablen eintragen und den Workflow „KI-Server (Supabase) einrichten“ erneut starten:

| Variable | Bedeutung | Standard |
|---|---|---|
| `MERKWERK_LIMIT_NUTZER` | Anfragen pro Gerät und Tag | 30 |
| `MERKWERK_LIMIT_IP` | Anfragen pro Internetanschluss und Tag (Schulen teilen sich oft einen) | 100 |
| `MERKWERK_LIMIT_GESAMT` | Anfragen aller zusammen pro Tag | 300 |
| `MERKWERK_MODEL_DEFAULT` | Modell für Fragen, Karten, Bewertung, z. B. `claude-sonnet-5-5` (günstiger) | `claude-opus-5-5` |

Die Nutzung siehst du im Supabase-Dashboard unter *SQL Editor* mit `select * from ki_tagesuebersicht;` (Anfragen, Token und Zahl der Geräte pro Tag), die Kosten in der Anthropic Console unter *Usage*.

## Kosten (grobe Schätzung)

Preise der Claude API: Opus 5.5 4 $ pro Million Eingabe-Token und 20 $ pro Million Ausgabe-Token, Haiku 4.5 1 $ und 5 $. Geschätzt, nicht gemessen:

- Eine Abfragerunde mit 15 Fragen sind 2 bis 4 Anfragen (Fragen erstellen, gegen das Material prüfen, schriftliche Antworten bewerten). Je nach Menge des Materials etwa 0,20 bis 0,60 $ mit Opus 5.5, ungefähr die Hälfte mit Sonnet 5.5.
- Fünf Seiten Handschrift lesen (Haiku 4.5): etwa 2 Cent.
- KI-Tutor: „Warum ist das falsch?“ etwa 3 bis 4 Cent pro Erklärung oder Nachfrage, eine Probeklausur (erstellen und korrigieren, 2 Anfragen) etwa 0,40 $, weil sie das Material aller Lernsets eines Fachs bekommt.
- Bei 100 aktiven Nutzern im Monat (50 gelegentlich, 40 normal, 10 intensiv, mit KI-Tutor und Prompt-Caching) rechne ich mit etwa 400 $ mit Opus 5.5 und etwa 200 $ mit Sonnet 5.5. Dann sollte `MERKWERK_LIMIT_GESAMT` auf etwa 600 stehen.
- Laufzeit: Supabase begrenzt, wie lange eine Funktion laufen darf (im kostenlosen Tarif deutlich kürzer als im bezahlten). Eine Probeklausur aus sehr viel Material kann mit Opus an diese Grenze kommen; dann hilft `MERKWERK_EFFORT=low` oder der bezahlte Supabase-Tarif.
- Prompt-Caching: Fragen erstellen, Fragen prüfen und Karteikarten schicken das Material als denselben Block, den die Claude API 5 Minuten zwischenspeichert. Ab der zweiten Anfrage mit demselben Material kostet es nur noch ein Zehntel. Das spart grob 10 bis 20 % der Kosten einer Abfragerunde, bei großem Material mehr, und noch mehr, wenn direkt danach Karteikarten oder eine weitere Runde folgen (geschätzt). In `ki_tagesuebersicht` zeigt die Spalte `token_cache`, wie viel aus dem Zwischenspeicher kam.
- Bei 300 Anfragen am Tag (Standard-Obergrenze) und überwiegend Opus-Anfragen sind das im ungünstigsten Fall rund 30 bis 50 $ am Tag. Deshalb Schritt 1.2, das Monatslimit in der Anthropic Console.

Entschieden am 4. Oktober 2026: Die KI-Kosten externer Nutzer laufen über deinen Claude-API-Schlüssel, und jedes Gerät hat ein Tageslimit.

## Vor dem Start für Fremde

- **Datenschutzerklärung und Impressum:** Sobald Fremde Material an deinen Server schicken, braucht die Seite beides (DSGVO). Darin nennen: Supabase (Hosting in Frankfurt) und Anthropic (USA) als Auftragsverarbeiter, was gespeichert wird (nur Zähler pro Tag und gehashte IP-Adresse; das Material selbst speichert Merkwerk nicht) und dass Anthropic API-Daten nicht zum Training verwendet. Bei Schülern unter 16 ist die Einwilligung der Eltern ein Thema.
- **Missbrauch:** Anonyme Konten kann man sich immer neu holen; das Limit pro Internetanschluss und das Gesamtlimit fangen das ab. Wenn das nicht reicht: in Supabase unter *Authentication → Attack Protection* ein Captcha (Cloudflare Turnstile) für die Anmeldung einschalten, oder die KI nur für angemeldete Google-/Microsoft-Konten freigeben.
- **Geräteübergreifende Daten und die gemeinsame Bibliothek** laufen weiterhin nur in claude.ai. Supabase kann beides später übernehmen (siehe Roadmap), das ist ein eigener Schritt.
