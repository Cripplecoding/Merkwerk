# Merkwerk

Merkwerk ist eine Lernseite: Du lädst dein Material hoch (PDF, DOCX, TXT, GoodNotes, Fotos, auch handschriftliche Mitschriften) und lernst es entweder als interaktive Abfrage mit 15 Prüfungsfragen pro Durchgang, jede mit einem wörtlichen Beleg aus deinen Dateien, oder mit Karteikarten. Dazu kommen eine Fächer-Bibliothek, ein Stundenplan mit Kalender, Abgaben und Klausuren mit Erinnerungen sowie ein Lernplan, der dein Material bis zum Termin aufteilt. Nach der Anmeldung stimmt sich Merkwerk auf deine Schule ab, schlägt Fächer und Themen aus deinem Bildungsplan vor und kann Lerninhalte zu einem Thema selbst zusammenstellen.

## Schnellstart

```sh
npm test        # Logik-Prüfungen
npm run build   # baut dist/
```

Danach `dist/index.html` per Doppelklick in Chrome, Edge oder Firefox öffnen. Node.js 18 oder neuer, keine Abhängigkeiten.

**GitHub Pages:** Der Workflow in `.github/workflows/pages.yml` testet, baut und veröffentlicht `dist/` bei jedem Push auf `main`. Einmalig im Repository unter *Settings → Pages → Source* „GitHub Actions“ auswählen.

## Zwei Betriebsarten

Die vollen Funktionen mit Claude (Fragen erstellen, Fotos lesen, Antworten bewerten) und die gemeinsame Bibliothek gibt es nur, wenn die Seite als **claude.ai-Artifact** läuft. Dafür den Inhalt von `dist/merkwerk-artifact.html` als Artifact veröffentlichen, `dist/bildungsplaene.js` als zusätzliche Datei unter demselben Namen, mit diesen Fähigkeiten:

```json
{
  "sample": {},
  "db": { "rules": [
    { "path": "votes", "read": "view", "write": "owner" },
    { "path": "votes/{self}", "write": "interact" }
  ] },
  "user": { "scopes": ["profile"] },
  "downloads": true
}
```

| Funktion | Artifact | Lokal / GitHub Pages |
|---|---|---|
| Beispiel-Durchgang und Beispiel-Karteikarten (Photosynthese) | ja | ja |
| Karteikarten aus eigenem Material | ja (Claude) | ja, einfache Erkennung von Definitionssätzen |
| Fragen aus eigenem Material, schriftliche Antworten bewerten | ja (Claude) | nein |
| PDF- und DOCX-Dateien einlesen | ja | ja, mit Internet |
| Handschrift lesen (Fotos, Scans, handschriftliche PDF-Seiten) | ja (Claude) | eingeschränkt: Texterkennung im Browser (Tesseract), gut bei Druckschrift, schwach bei Handschrift |
| GoodNotes-Dateien (.goodnotes) | ja | ja (übernimmt die Handschrifterkennung von GoodNotes) |
| Begrüßung, Konto, Abstimmung auf Schule oder Studium | ja (Claude-Konto) | ja (Google, Apple, Microsoft, sobald eingerichtet; sonst Konto auf diesem Gerät) |
| Fächer aus dem Bildungsplan (4376 Pläne aller 16 Länder), Themenvorschläge beim Lernset | ja | ja, Themen aus der Themenliste |
| Lerninhalte generieren | ja (Claude schreibt den Lerntext aus Wikipedia, gleicht mit dem Bildungsplan ab) | ja, Wikipedia-Text als Material, Abgleich nur mit der Themenliste |
| Bibliothek: Einträge anderer ansehen und hochladen | ja (gemeinsame Datenbank) | nein |
| Stundenplan von Hand und aus .ics (WebUntis, Uni-Portale) | ja | ja |
| Stundenplan aus Screenshot | ja (Claude) | nein |
| Kalender mit Unterricht, Klausuren, Abgaben, Lerneinheiten, Terminen, Ferien | ja | ja, mit Internet |
| Erinnerungen beim Öffnen, Links zu Google Kalender und Outlook | ja | ja |
| Lernplan bis zur Klausur | ja | ja |
| Daten auf mehreren Geräten | ja | nein, nur dieser Browser |

## Funktionen

**Begrüßung und Konto.** Wer die Seite ohne Anmeldung öffnet, sieht „Herzlich Willkommen bei Merkwerk“ mit zwei Wegen: „Ich habe schon ein Konto“ (Anmelden mit Google, Apple oder Microsoft) und „Verändere mein Lernen“ (Registrieren). Nach dem Registrieren folgt „Lass uns Merkwerk auf deine Bedürfnisse abstimmen“: Schüler (links) oder Student (rechts), bei Schülern Bundesland, Schulart und Klassenstufe, dann die Fächer laut Bildungsplan. Jedes Konto hat auf dem Gerät eigene Lernsets und Termine; die Daten von vor der Kontofunktion übernimmt das erste Konto. Über den Namen oben rechts: Schule oder Studium ändern, Konto wechseln, abmelden, Konto vom Gerät entfernen.

**Bildungspläne und neues Lernset.** `data/Master-Index_Bildungsplaene.json` ist der Index aller geltenden Bildungspläne der Sekundarstufen I und II (Stand 3. Oktober 2026, siehe `data/Bildungsplaene_README.md`). `node tools/bildungsplaene.mjs` macht daraus `data/bildungsplaene.js` (ca. 1 MB, gzip 120 KB), das die Seite erst lädt, wenn sie es braucht. Beim neuen Lernset schlägt Merkwerk die Fächer aus dem Profil und dem Bildungsplan vor, zeigt die passenden Pläne (zum Beispiel „LehrplanPLUS Realschule – Fachlehrplan Mathematik 7“) und typische Themen; mit Claude kommen Themen aus dem Plan dazu. Fach und Thema lassen sich auch frei eingeben.

**Lerninhalte generieren.** Statt eigener Dateien: Merkwerk gleicht Fach und Thema mit dem Bildungsplan ab (mit Claude: passt es, was soll man auf dieser Stufe können), lädt passende Wikipedia-Artikel und legt Links zu Erklärvideos (YouTube-Suche) und Serlo an. In claude.ai schreibt Claude daraus einen Lerntext für die Klassenstufe; ohne Claude wird der Wikipedia-Text selbst das Material. Danach geht es wie gewohnt mit Karteikarten oder der interaktiven Abfrage weiter.

**Lernen.** Nach dem Anlegen eines Lernsets gibt es zwei Lernmodi.

*Interaktive Abfrage:* 15 Fragen pro Durchgang: 5 Multiple Choice, 4 schriftlich, 3 Zuordnung, 3 Lückentext, jeweils einem Anforderungsbereich (I Wiedergeben, II Zusammenhänge herstellen, III Anwenden und Beurteilen) zugeordnet. Jede Antwort wird sofort geprüft; bei Fehlern bleiben Lösung und Beleg stehen. Am Ende: Prozentwert, Aufschlüsselung nach Format, Liste der Fehler, dann dieselben Fragen neu gemischt oder 15 neue. Eine Abdeckungsanzeige zeigt, welche Abschnitte schon abgefragt wurden; neue Fragen nehmen zuerst die Lücken dran.

*Karteikarten:* Aus dem Material entstehen Karten mit dem Begriff vorne und der Definition hinten, jede mit Beleg. Ein Klick dreht die Karte um. Ziehen nach links ordnet sie „weiß ich“ zu, nach rechts „muss ich noch üben“ (alternativ Klick auf die Seite oder Pfeiltasten). Beide Seiten zählen mit (grün und orange), oben stehen die durchgearbeiteten Karten (z. B. 17/30) mit Fortschrittsbalken. Am Ende zeigt ein Säulendiagramm den Anteil gewusster Karten; danach alle Karten noch einmal, nur die nicht gewussten oder zurück zum Hauptmenü. Mit Claude erstellt Claude die Karten und jeder Beleg wird wie bei den Fragen geprüft; ohne Claude erkennt Merkwerk Sätze wie „X ist …“ oder „… nennt man X“.

**Handschrift und GoodNotes.** Fotos, Scans und PDF-Seiten ohne Textebene liest in claude.ai Claude, ausdrücklich auch Handschrift; PDF-Seiten mit gedrucktem Text und vielen Stiftstrichen (z. B. kommentierte Folien aus GoodNotes oder Notability) gibt Merkwerk dann ebenfalls als Bild an Claude, damit die Randnotizen nicht fehlen. Ohne Claude übernimmt Tesseract.js im Browser (Deutsch und Englisch). `.goodnotes`-Dateien sind ZIP-Archive: Merkwerk übernimmt daraus die Handschrifterkennung, die GoodNotes selbst pro Seite für die Suche speichert (`search/<Seite>`), dazu den Text eingebetteter PDFs und die Bilder. Gelesener Text ist als „bitte prüfen“ markiert und lässt sich unter „Gelesenen Text ansehen“ korrigieren.

**Bibliothek.** Beim ersten Öffnen fragt die Seite nach Schule oder Studium, bei Schülern nach Bundesland, Schulart und Klasse. Danach Fächer bzw. Module wählen, ein Thema eingeben und Einträge anderer ansehen oder selbst hochladen. Jeder Eintrag lässt sich als Lernset übernehmen.

**Kalender und Stundenplan.** FullCalendar mit Monats-, Wochen-, Tages- und Listenansicht. Unterricht wiederholt sich wöchentlich, mit A/B-Wochen, einzelnen Ausfällen und verlegten Stunden. Klausuren, Abgaben und Lerneinheiten erscheinen automatisch und lassen sich verschieben; der Lernplan passt sich an. Frei/Ferien blendet den Unterricht aus. Import per Screenshot oder .ics-Datei.

**Abgaben, Klausuren, Lernplan.** Termine mit einstellbaren Erinnerungen. Für jeden Termin lässt sich Material einpflegen; Merkwerk verteilt die Abschnitte auf die Lerntage davor und hält Wiederholungstage frei. Jede Lerneinheit startet einen Durchgang zu genau diesen Abschnitten.

## Wie die Fragen am Material bleiben

- Jede von Claude erzeugte Frage braucht ein wörtliches Zitat. `validateQ` in `src/05_learn.js` prüft nach Normalisierung, ob es im Material vorkommt, und verwirft die Frage sonst.
- Jede Rückmeldung zeigt die Belegstelle mit Dateinamen. Unter „Gelesenen Text ansehen“ lässt sich prüfen und korrigieren, was gelesen wurde.
- Die Prüfung garantiert eine echte Stelle zu jeder Frage. Dass falsche Antwortmöglichkeiten ohne neue Begriffe auskommen, verlangt nur die Anweisung an Claude.

## Aufbau

```
src/
  01_head.html     Titel, Schriften, Styles (Hell/Dunkel), Kopfzeile mit Reitern
  02_data.js       Bundesländer, Schularten, Fächer, Themen, Studiengänge, Links zu Bildungsplänen
  02b_plans.js     passende Bildungspläne zu Land, Schulart, Klasse und Fach
  03b_account.js   Konten auf dem Gerät, Client-IDs der Anmeldedienste (AUTH_CONFIG)
  03_example.js    Beispieltext Photosynthese, 15 Beispielfragen und 12 Beispiel-Karteikarten
  04_core.js       Hilfsfunktionen, Speicher (localStorage + IndexedDB), Claude-Fähigkeiten, Navigation
  04b_handwriting.js  Texterkennung im Browser (Tesseract), ZIP- und GoodNotes-Leser
  05_learn.js      Lernsets, Dateien lesen, Abschnitte, Fragen erzeugen und prüfen, Durchgang
  05b_cards.js     Karteikarten: erstellen, umdrehen, ziehen, zählen, Auswertung
  06_library.js    Profil-Abfrage, Bibliothek, Einträge
  07_timetable.js  Stundenplan-Raster, Screenshot- und ICS-Import
  08_due.js        Abgaben, Klausuren, Erinnerungen, Lernplan
  09_calendar.js   Kalender mit FullCalendar
  05c_generate.js  neues Lernset mit Vorschlägen, „Lerninhalte generieren“
  10_home.js       Ansicht „Heute“
  11_account.js    Begrüßung, Anmeldung, Abstimmung, Kontomenü
  99_start.js      Start
data/              Master-Index der Bildungspläne und daraus erzeugtes bildungsplaene.js
tools/             bildungsplaene.mjs: erzeugt data/bildungsplaene.js aus dem Index
build.mjs          setzt src/ in Dateireihenfolge zu dist/ zusammen
dist/              fertige Seiten (index.html lokal, merkwerk-artifact.html für claude.ai, bildungsplaene.js)
tests/run.mjs      Logik-Prüfungen ohne Browser
```

Externe Bibliotheken werden nur bei Bedarf von jsDelivr geladen: FullCalendar 6.1.21, pdf.js 3.11.174, mammoth 1.8.0, Tesseract.js 6.0.1 (nur ohne Claude, mit Sprachdaten für Deutsch und Englisch, ca. 10 MB beim ersten Mal). Schriften kommen von Google Fonts.

## Anmeldung einrichten

Die Anmeldung läuft ganz im Browser; die Client-IDs stehen in `AUTH_CONFIG` in `src/03b_account.js`. Solange ein Eintrag leer ist, legt Merkwerk beim Klick auf diesen Dienst ein Konto auf dem Gerät an und sagt das auch so. Als erlaubte Adresse jeweils `https://cripplecoding.github.io/Merkwerk/` eintragen.

- **Google:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Anmeldedaten → OAuth-Client-ID, Typ „Webanwendung“, autorisierter JavaScript-Ursprung `https://cripplecoding.github.io`. Die Client-ID unter `google.clientId` eintragen.
- **Microsoft:** [Microsoft Entra](https://entra.microsoft.com/) → App-Registrierungen → Neu, Kontotypen „beliebiges Organisationsverzeichnis und persönliche Microsoft-Konten“, Plattform „Single-Page-Anwendung“ mit Umleitungs-URI `https://cripplecoding.github.io/Merkwerk/`. Die Anwendungs-ID unter `microsoft.clientId` eintragen.
- **Apple:** braucht ein kostenpflichtiges Apple-Developer-Konto. Identifiers → Services ID anlegen, „Sign in with Apple“ aktivieren, Domain `cripplecoding.github.io` und Return-URL `https://cripplecoding.github.io/Merkwerk/` eintragen. Services ID unter `apple.clientId`, Return-URL unter `apple.redirectURI`.

In claude.ai meldet Merkwerk dich über dein Claude-Konto an (Anmeldefenster fremder Dienste sind dort nicht möglich).

## Grenzen

- **Konten:** Ohne eigenen Server erkennt die Anmeldung dich wieder, die Lernsets bleiben aber im jeweiligen Browser. Geräteübergreifend gibt es die Daten nur in claude.ai.
- **Lerninhalte generieren:** YouTube lässt sich ohne eigenen API-Schlüssel nicht durchsuchen; Merkwerk legt deshalb einen Suchlink an, statt Videos auszuwählen. Ob die Wikipedia-Abfrage in claude.ai erlaubt ist, hängt von claude.ai ab; klappt sie nicht, schreibt Claude den Lerntext aus eigenem Wissen und sagt das dazu. Die Inhalte der Bildungspläne selbst (PDFs) liest Merkwerk nicht, sondern nutzt Titel, Geltungsbereich und Links aus dem Index.

- **WebUntis:** keine direkte Anmeldung (WebUntis lässt fremde Webseiten nicht zu, und Passwörter gehören nicht in diese App). Stattdessen Screenshot- oder .ics-Import.
- **Erinnerungen:** keine Push-Nachrichten. Fällige Erinnerungen erscheinen beim Öffnen; für Benachrichtigungen aufs Handy gibt es Links zu Google Kalender und Outlook. Keine Synchronisation in beide Richtungen.
- **Bibliothek:** Mit einem privaten Claude-Konto können Personen über einen geteilten Link nur lesen; schreiben dürfen Mitglieder der Organisation bzw. als Mitwirkende Eingeladene. Für eine offene Bibliothek wäre ein eigener Server nötig.
- **Lehrpläne:** Fächer und direkte Links zu den geltenden Plänen für alle 16 Länder ab Klasse 5 aus dem Master-Index; Schleswig-Holstein ist dort unvollständig (Portal war beim Erstellen nicht erreichbar), Grundschulen fehlen im Index (dort gilt die bisherige Fächerliste). Themenlisten für Kernfächer sind eine Orientierung, kein vollständiger Auszug.
- **Studium:** typische Module für 17 Studiengänge; maßgeblich ist das Modulhandbuch der Hochschule.
- **Handschrift ohne Claude:** Tesseract ist für Druckschrift gebaut. Saubere Druckbuchstaben klappen teilweise, Schreibschrift und Formeln kaum. Für Mitschriften Merkwerk in claude.ai nutzen.
- **GoodNotes:** Das Dateiformat ist nicht offen dokumentiert. Merkwerk liest die Handschrifterkennung, die GoodNotes gespeichert hat; ist die Erkennung in GoodNotes aus oder noch nicht gelaufen, fehlt die Handschrift. Die Striche selbst zeichnet Merkwerk nicht nach, Claude sieht in .goodnotes-Dateien also nur den erkannten Text. Am zuverlässigsten ist der PDF-Export aus GoodNotes (Teilen → Exportieren → PDF): Dann liest Claude jede Seite selbst.
- **Speicher:** Material und Lernstand liegen im Browser (IndexedDB). Sehr große Dateien müssen nach dem Leeren der Browserdaten neu hochgeladen werden.
