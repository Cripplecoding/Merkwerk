# Merkwerk

Merkwerk ist eine Lernseite: Du lädst dein Material hoch (PDF, DOCX, TXT, GoodNotes, Fotos, auch handschriftliche Mitschriften) und lernst es entweder als interaktive Abfrage mit 15 Prüfungsfragen pro Durchgang, jede mit einem wörtlichen Beleg aus deinen Dateien, oder mit Karteikarten. Dazu kommen eine Fächer-Bibliothek, ein Stundenplan mit Kalender, Abgaben und Klausuren mit Erinnerungen sowie ein Lernplan, der dein Material bis zum Termin aufteilt.

## Schnellstart

```sh
npm test        # Logik-Prüfungen
npm run build   # baut dist/
```

Danach `dist/index.html` per Doppelklick in Chrome, Edge oder Firefox öffnen. Node.js 18 oder neuer, keine Abhängigkeiten.

**GitHub Pages:** Der Workflow in `.github/workflows/pages.yml` testet, baut und veröffentlicht `dist/` bei jedem Push auf `main`. Einmalig im Repository unter *Settings → Pages → Source* „GitHub Actions“ auswählen.

## Zwei Betriebsarten

Die vollen Funktionen mit Claude (Fragen erstellen, Fotos lesen, Antworten bewerten) und die gemeinsame Bibliothek gibt es nur, wenn die Seite als **claude.ai-Artifact** läuft. Dafür den Inhalt von `dist/merkwerk-artifact.html` als Artifact veröffentlichen, mit diesen Fähigkeiten:

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
| Profil, Fächer je Bundesland/Schulart/Klasse, Themen, Links zu Bildungsplänen | ja | ja |
| Bibliothek: Einträge anderer ansehen und hochladen | ja (gemeinsame Datenbank) | nein |
| Stundenplan von Hand und aus .ics (WebUntis, Uni-Portale) | ja | ja |
| Stundenplan aus Screenshot | ja (Claude) | nein |
| Kalender mit Unterricht, Klausuren, Abgaben, Lerneinheiten, Terminen, Ferien | ja | ja, mit Internet |
| Erinnerungen beim Öffnen, Links zu Google Kalender und Outlook | ja | ja |
| Lernplan bis zur Klausur | ja | ja |
| Daten auf mehreren Geräten | ja | nein, nur dieser Browser |

## Funktionen

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
  03_example.js    Beispieltext Photosynthese, 15 Beispielfragen und 12 Beispiel-Karteikarten
  04_core.js       Hilfsfunktionen, Speicher (localStorage + IndexedDB), Claude-Fähigkeiten, Navigation
  04b_handwriting.js  Texterkennung im Browser (Tesseract), ZIP- und GoodNotes-Leser
  05_learn.js      Lernsets, Dateien lesen, Abschnitte, Fragen erzeugen und prüfen, Durchgang
  05b_cards.js     Karteikarten: erstellen, umdrehen, ziehen, zählen, Auswertung
  06_library.js    Profil-Abfrage, Bibliothek, Einträge
  07_timetable.js  Stundenplan-Raster, Screenshot- und ICS-Import
  08_due.js        Abgaben, Klausuren, Erinnerungen, Lernplan
  09_calendar.js   Kalender mit FullCalendar
  10_home.js       Ansicht „Heute“ und Start
build.mjs          setzt src/ in Dateireihenfolge zu dist/ zusammen
dist/              fertige Seiten (index.html lokal, merkwerk-artifact.html für claude.ai)
tests/run.mjs      Logik-Prüfungen ohne Browser
```

Externe Bibliotheken werden nur bei Bedarf von jsDelivr geladen: FullCalendar 6.1.21, pdf.js 3.11.174, mammoth 1.8.0, Tesseract.js 6.0.1 (nur ohne Claude, mit Sprachdaten für Deutsch und Englisch, ca. 10 MB beim ersten Mal). Schriften kommen von Google Fonts.

## Grenzen

- **WebUntis:** keine direkte Anmeldung (WebUntis lässt fremde Webseiten nicht zu, und Passwörter gehören nicht in diese App). Stattdessen Screenshot- oder .ics-Import.
- **Erinnerungen:** keine Push-Nachrichten. Fällige Erinnerungen erscheinen beim Öffnen; für Benachrichtigungen aufs Handy gibt es Links zu Google Kalender und Outlook. Keine Synchronisation in beide Richtungen.
- **Bibliothek:** Mit einem privaten Claude-Konto können Personen über einen geteilten Link nur lesen; schreiben dürfen Mitglieder der Organisation bzw. als Mitwirkende Eingeladene. Für eine offene Bibliothek wäre ein eigener Server nötig.
- **Lehrpläne:** Fächer für alle 16 Bundesländer; Themenlisten für Kernfächer sind eine Orientierung, kein vollständiger Auszug. Direkte Links zu den Plänen für Baden-Württemberg, Bayern, Hessen und Nordrhein-Westfalen, sonst zu den Portalen der Länder.
- **Studium:** typische Module für 17 Studiengänge; maßgeblich ist das Modulhandbuch der Hochschule.
- **Handschrift ohne Claude:** Tesseract ist für Druckschrift gebaut. Saubere Druckbuchstaben klappen teilweise, Schreibschrift und Formeln kaum. Für Mitschriften Merkwerk in claude.ai nutzen.
- **GoodNotes:** Das Dateiformat ist nicht offen dokumentiert. Merkwerk liest die Handschrifterkennung, die GoodNotes gespeichert hat; ist die Erkennung in GoodNotes aus oder noch nicht gelaufen, fehlt die Handschrift. Die Striche selbst zeichnet Merkwerk nicht nach, Claude sieht in .goodnotes-Dateien also nur den erkannten Text. Am zuverlässigsten ist der PDF-Export aus GoodNotes (Teilen → Exportieren → PDF): Dann liest Claude jede Seite selbst.
- **Speicher:** Material und Lernstand liegen im Browser (IndexedDB). Sehr große Dateien müssen nach dem Leeren der Browserdaten neu hochgeladen werden.
