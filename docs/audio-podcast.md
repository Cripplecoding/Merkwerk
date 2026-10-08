# Audio & Podcast

Lernmodus „Audiozusammenfassung / Podcast“ in jedem Lernset: der Lernstoff als **Einzelstimme** oder als **Podcastdialog** (Moderatorin und Experte im Gespräch). Beide Formate enthalten dieselben fachlichen Aussagen, nur anders erzählt, und jede Aussage stammt aus den Dateien, die man vor dem Erzeugen auswählt. Merkwerk recherchiert nichts dazu: kein Internet, kein YouTube, kein Bildungsplan, kein Allgemeinwissen.

## Ablauf

```
Lernset (bereits gelesene Abschnitte aus PDF, DOCX, Bildern, GoodNotes …)
  │ 0. Dateien prüfen             nur ausgewählte Dateien; leer, < 60 Zeichen, viele „[?]“ → blockiert, Browser-OCR → Warnung
  │                               Auswahl: ohne diese Dateien fortfahren · Datei austauschen · Auswahl ändern
  │ 1. Informationseinheiten      Claude: je Aussage Thema, Rang 1–3, Abschnitt, wörtliches Zitat; Widersprüche mit zwei Zitaten
  │                               Merkwerk prüft selbst: Zitat steht im Material, jede Zahl steht im Beleg → sonst verworfen
  │                               Fundstelle: PDF-Seite, DOCX-Überschrift und Absatz, Fotozeile, sonst Absatz (oder „nicht bestimmbar“)
  │                               Anweisungen im Material („ignoriere …“) werden nicht befolgt
  │ 2. Inhaltsgrundlage           je Ausführlichkeit feste Auswahl: Kurz = Rang 1, Standard = Rang 1–2, Ausführlich = alle,
  │                               optional nur die gewählten Teilthemen
  │ 3. Skript                     Zusammenfassung oder Podcast aus DERSELBEN Grundlage, jedes Segment nennt seine Einheiten
  │ 4. Prüfung                    lokal: jede Einheit im Hauptteil, keine Zahl außerhalb der Grundlage
  │                               Claude: fehlt etwas, ist etwas erfunden oder verfälscht? (nach Bedeutung, nicht Wortlaut)
  │                               Probleme → Claude korrigiert nur diese Segmente → erneute Prüfung (höchstens 2 Runden)
  │                               Segmente ohne Beleg werden entfernt; fehlen danach Einheiten → Rückfrage statt stilles Weglassen
  │ 5. Sprachausgabe              Edge Function merkwerk-tts → Google Cloud Text-to-Speech (Schlüssel nur auf dem Server)
  │ 6. Audiodatei                 im Browser: Stille kürzen, Lautstärke angleichen, feste Pausen, MP3 (64 kbit/s)
  │ 7. Kontrolle und Speichern    fertige Datei dekodieren, Dauer vergleichen, dann als Aufnahme speichern
  ▼
Player · Transkript · Download     gespeichert auf dem Gerät (IndexedDB), mehrere Aufnahmen je Lernset
```

- Die Statusanzeige zeigt genau diese Schritte („Dateien werden geprüft …“ bis „Fertig!“), mit „Abbrechen“. Die Erzeugung läuft im Hintergrund weiter, auch wenn man in Merkwerk woanders hingeht. Ein zweiter Klick startet keinen zweiten Auftrag; ein erneuter Versuch nach einem Fehler speichert nicht doppelt.
- Vorab zeigt die Seite die geschätzte Dauer und, wenn das Material für die gewählte Länge zu wenig oder sehr viel hergibt, einen Hinweis.
- Fehler nennen die Ursache und passende Knöpfe: erneut versuchen, Dateien auswählen, Datei austauschen, andere Stimme. Ein Podcast wird nie still durch eine Einzelstimme ersetzt.
- Wird ein Format gewechselt, entsteht das andere Skript aus der vorhandenen Grundlage, ohne neue Analyse. Fertige Fassungen werden nie neu erzeugt, außer man klickt „Neu generieren“ (neues Skript, gleiche Grundlage).
- Ändert sich das Material (Datei hinzu, entfernt, Text korrigiert), erkennt Merkwerk das am Dokumentenstand (Prüfsumme über alle Texte). Die alte Fassung bleibt abspielbar, mit dem Hinweis „möglicherweise nicht mehr aktuell“ und dem Knopf „Aktualisierte Fassung erstellen“.
- Unleserliche, widersprüchliche oder unvollständige Stellen meldet Claude als Hinweis, statt sie zu ergänzen. Die Hinweise stehen unter dem Player.
- Lässt sich ein Problem nach zwei Korrekturrunden nicht beheben, steht über dem Player „Nicht vollständig geprüft“ mit den offenen Stellen. Fällt die inhaltliche Prüfung durch Claude aus (Netz, Limit), steht das ebenfalls dort.
- **Aufnahmen:** Jede erzeugte Datei ist eine eigene Aufnahme mit Titel, Format, Länge, Teilthemen, Stimmen, Quelldateien und Zeitpunkt. Sie lässt sich umbenennen, löschen, als Transkript mit Quellenangaben (Datei und Fundstelle je Abschnitt) herunterladen, als Hörphase in den Lernplan legen oder aus der aktuellen Auswahl neu erstellen. Der Player merkt sich die Position, startet aber nie von selbst. Tastatur: Leertaste/k Start und Pause, ←/→ bzw. j/l ±10 Sekunden, ↑/↓ Lautstärke.
- Schlägt das Speichern fehl (Speicher voll, privater Modus), bleibt die Aufnahme bis zum Schließen der Seite erhalten, mit „Nicht gespeichert“ und „Erneut speichern“.
- **Speicherformat** (IndexedDB-Speicher `audio`, Schlüssel `m|<Lernset-ID>`, Version 3): je Dateiauswahl eine Grundlage (`bases[<Prüfsumme>]` mit Dateien, Einheiten, Hinweisen) und darin Varianten je Länge und Teilthemen mit den Skripten je Format und Sprache; daneben die Liste `recs` der Aufnahmen. Ältere Speicherstände werden beim ersten Öffnen umgewandelt, alte Aufnahmen bleiben abspielbar. Beim Löschen des Lernsets oder des Kontos wird alles mitgelöscht.
- Ohne Konto (Gastbereich) und bei Konten ohne eigenen Server liegen Aufnahmen nur in diesem Browser; die Seite sagt das neben dem Knopf.

## Was funktioniert schon ohne Einrichtung

| | ohne Sprachausgabe-Schlüssel | mit Schlüssel |
|---|---|---|
| Inhaltsgrundlage, Skripte, Prüfung, Transkript | ja (braucht Claude: in claude.ai oder über den KI-Server) | ja |
| echte Audiodatei, Player, Download | nein, die Seite sagt das deutlich | ja |
| Ersatz: Gerätestimme liest das Skript vor | ja (klar als Ersatz gekennzeichnet, kein Download) | – |
| Beispiel „Photosynthese“ | ja, auch ganz ohne Claude (Einheiten und Skripte liegen bei) | ja |

Claude selbst kann keine Sprache erzeugen, deshalb braucht die Audiodatei einen eigenen Sprachdienst.

## Was du einrichten musst

Voraussetzung ist der KI-Server aus [ki-fuer-alle.md](ki-fuer-alle.md) (Supabase-Projekt und GitHub-Secrets). Die Sprachausgabe hängt sich dort an.

### Google Cloud Text-to-Speech (empfohlen)

Gewählt, weil die „Chirp 3: HD“-Stimmen auf Deutsch sehr natürlich klingen, es viele klar unterscheidbare Stimmen gibt und der Preis niedrig ist.

1. Auf https://console.cloud.google.com ein Projekt anlegen (z. B. „merkwerk“) und ein Rechnungskonto verknüpfen.
2. *APIs & Dienste → Bibliothek →* „Cloud Text-to-Speech API“ aktivieren.
3. *APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → API-Schlüssel.* Danach den Schlüssel bearbeiten: *API-Einschränkungen →* nur „Cloud Text-to-Speech API“ erlauben. (Keine Website-Einschränkung setzen, der Schlüssel wird nur vom Server benutzt.)
4. *Abrechnung → Budgets und Benachrichtigungen:* ein Budget mit Warnung anlegen (z. B. 10 €).
5. In GitHub unter *Settings → Secrets and variables → Actions → Secrets* das Secret **`GOOGLE_TTS_API_KEY`** mit dem Schlüssel anlegen.
6. *Actions → „KI-Server (Supabase) einrichten“ → Run workflow.* Der Workflow legt die Tabelle für das Zeichenlimit an, hinterlegt den Schlüssel und veröffentlicht die Funktion `merkwerk-tts`.

Danach zeigt der Lernmodus „Audio erzeugen“ ohne Hinweis und erzeugt echte MP3-Dateien.

### Alternative: OpenAI

Statt Google geht auch OpenAI (`gpt-4o-mini-tts`): Secret **`OPENAI_API_KEY`** anlegen und Workflow starten. Sind beide Schlüssel gesetzt, nimmt Merkwerk Google; mit der Repository-Variable `MERKWERK_TTS_ANBIETER` = `openai` wird umgestellt. Weitere Anbieter lassen sich in `supabase/functions/merkwerk-tts/index.ts` ergänzen: ein Objekt mit `catalog`, `defaults()`, `voices(lang, pick)` und `synth(text, role, lang, voice)`, die Seite bleibt unverändert.

### Stimmen auswählen

Die Funktion antwortet auf `{"probe": true}` mit dem Anbieter, der Stimmenliste (`voices`, z. B. bei Google die „Chirp 3: HD“-Stimmen Kore, Aoede, Leda, Zephyr, Charon, Puck, Fenrir, Orus) und den Standardstimmen (`defaults`). Die Seite zeigt daraus die Auswahl für Erzähler bzw. Moderation und Experte. Eine Anfrage darf `"voices": {"erzaehler": "…", "moderation": "…", "experte": "…"}` mitschicken; unbekannte Stimmen und dieselbe Stimme für Moderation und Experte lehnt die Funktion mit `400 voice_unavailable` ab, ebenso wenn der Anbieter eine Stimme nicht kennt. Die Seite bietet dann an, eine andere Stimme zu wählen.

### Einstellungen (optional, als Repository-Variablen)

| Variable | Standard | Bedeutung |
|---|---|---|
| `MERKWERK_TTS_ZEICHEN_NUTZER` | 40000 | Zeichen pro Gerät und Tag (etwa 45 Minuten Audio) |
| `MERKWERK_TTS_ZEICHEN_GESAMT` | 300000 | Zeichen aller zusammen pro Tag – Kostenbremse |
| `MERKWERK_TTS_ANBIETER` | – | `google` oder `openai` erzwingen |

Pro Internetanschluss gilt zusätzlich ein Limit von 120000 Zeichen. Eigene Stimmen gehen über das Supabase-Secret `MERKWERK_TTS_STIMMEN`, z. B. `erzaehler=Kore,moderation=Aoede,experte=Charon` (Standard; bei Google sind das „Chirp 3: HD“-Stimmen).

## Kosten (Schätzung, nicht gemessen)

- **Sprachausgabe:** Ein gesprochener Podcast von 10 Minuten hat etwa 9000 bis 10000 Zeichen. Google „Chirp 3: HD“ kostet laut Preisliste 30 US$ je 1 Million Zeichen, die erste Million pro Monat ist frei. Das sind rund 0,30 US$ pro 10 Minuten, die ersten etwa 100 solcher Folgen im Monat kostenlos. Mit dem Standard-Gesamtlimit (300000 Zeichen am Tag) liegt die Obergrenze bei etwa 9 US$ am Tag.
- **Claude:** pro Format 3 bis 7 Anfragen (Analyse einmal pro Materialstand und je 100000 Zeichen, Skript, Prüfung, bis zu zwei Korrekturen mit erneuter Prüfung). Sie zählen zum normalen Tageslimit des KI-Servers (30 Anfragen pro Gerät). Das zweite Format braucht keine neue Analyse.
- Gespeicherte Fassungen kosten beim erneuten Anhören nichts.

## Datenschutz

- Der Schlüssel des Sprachdienstes liegt nur als Supabase-Secret auf dem Server, nie in der Seite oder im Repository.
- An den Sprachdienst geht nur das geprüfte Sprechskript, nicht die Dateien. Vor der ersten Nutzung fragt die Seite einmal um Einverständnis und nennt den Dienst.
- Der Server speichert weder Text noch Audio, nur den Zeichenzähler pro Tag (Nutzer-ID des anonymen Geräte-Kontos, IP-Adresse nur als Hash). Audio und Skripte liegen nur im Browser der Person. Andere Nutzer kommen an fremde Lernsets nicht heran, weil es sie auf keinem Server gibt.
- Vor einem öffentlichen Start gehört der Sprachdienst (Google bzw. OpenAI) in die Datenschutzerklärung.

## Tests

- `npm test` prüft die Logik ohne Browser: Dateiauswahl und Lesbarkeitsprüfung, Fundstellen, Widersprüche, Teilthemen und Dauer, Entfernen unbelegter Abschnitte, Aufnahmen (Speichern, Fehler beim Speichern, veraltete Aufnahmen, Stimmenwahl), Umwandeln alter Speicherstände, Belege und Zahlen der Einheiten, Zusammenführen mehrerer Dokumente, Auswahl je Länge, lokale Prüfung, Korrekturrunden, gleiche Grundlage für beide Formate, Speichern und Wiederverwenden, Erkennen von Materialänderungen, Doppelklick, Aufteilen für die Sprachausgabe, Stille, Lautstärke, Zusammensetzen, Anbindung an den Server mit Tageslimit.
- `tests/e2e-audio.mjs` testet den ganzen Ablauf im Browser mit der echten Edge Function `merkwerk-tts` (lokal mit Deno). Gespielt sind dabei Claude (feste Antworten), die Supabase-Anmeldung und Google (liefert Töne statt Sprache). Start: `npm i --no-save playwright lamejs@1.2.1 && node tests/e2e-audio.mjs` (braucht Chromium, ffmpeg und npx). Achtung: Dieser Test stammt noch aus der Zeit vor Dateiauswahl, Aufnahmen und Stimmenwahl und muss an die neue Oberfläche angepasst werden, bevor er wieder durchläuft.
- **Nicht getestet:** echte Aufrufe an Google oder OpenAI (noch kein Schlüssel), wie natürlich die Stimmen klingen, die Qualität echter Claude-Skripte und -Prüfungen, und ob claude.ai der Seite Verbindungen zum eigenen Server erlaubt (sonst gibt es dort Skript und Gerätestimme).

## Grenzen

- Die Länge richtet sich nach dem Material; bei sehr viel Material und „Ausführlich“ kann eine Folge lang werden. Es wird nichts abgeschnitten.
- Die automatische Prüfung findet Abweichungen zuverlässig bei Zahlen (lokal) und sehr wahrscheinlich bei Bedeutungen (Claude), eine Garantie wie bei wörtlichen Zitaten ist sie nicht.
- Andere Sprachen als Deutsch: Das Skript wird sinngemäß übertragen und genauso geprüft; die Stimmen gibt es für Deutsch, Englisch, Französisch, Spanisch und Italienisch.
- Die Gerätestimme (Ersatz) hängt vom Gerät ab und kann weder springen noch herunterladen.
