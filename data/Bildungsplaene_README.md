# Bildungspläne der Sekundarstufen I und II – Sammlung aller 16 Länder

**Stand der Recherche: 3. Oktober 2026** (Schuljahr 2026/27)

Diese Sammlung enthält die aktuell gültigen Bildungspläne, Lehrpläne, Rahmenlehrpläne, Kerncurricula, Kernlehrpläne und Fachanforderungen der weiterführenden Schulen ab Klasse 5 in allen 16 Ländern. Primarstufe und Förderschulen sind nicht enthalten. Grundlage sind ausschließlich die offiziellen Portale der Kultusministerien und Landesinstitute.

## Auf einen Blick

| | Anzahl |
|---|---:|
| Einträge im Master-Index | 4496 |
| heruntergeladene Dokumente (PDF, DOCX) | 2835 |
| Linkdateien (`.url`) für Pläne ohne Download-Datei | 1285 |
| Dubletten-Verweise (Dokument gilt für mehrere Schularten/Richtungen, liegt aber nur einmal ab) | 60 |
| Download fehlgeschlagen oder ausstehend (nur Link im Index) | 242 |
| erfasst, aber bewusst nicht abgelegt (außer Kraft, Entwurf) | 74 |
| Speicherbedarf | 2,4 GB |

| Land | Einträge | heruntergeladen | Linkdateien | Dubletten-Verweise | Download offen | nicht abgelegt | davon auslaufend | künftig in Kraft |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Baden-Württemberg | 905 | 843 | 54 | 1 | 0 | 7 | 70 | 0 |
| Bayern | 1297 | 97 | 1196 | 2 | 0 | 2 | 13 | 30 |
| Berlin | 73 | 72 | 1 | 0 | 0 | 0 | 4 | 0 |
| Brandenburg | 75 | 71 | 1 | 0 | 0 | 3 | 5 | 0 |
| Bremen | 93 | 87 | 0 | 5 | 0 | 1 | 6 | 0 |
| Hamburg | 110 | 103 | 1 | 6 | 0 | 0 | 0 | 0 |
| Hessen | 268 | 25 | 1 | 0 | 242 | 0 | 0 | 0 |
| Mecklenburg-Vorpommern | 164 | 157 | 1 | 0 | 0 | 6 | 31 | 9 |
| Niedersachsen | 120 | 119 | 1 | 0 | 0 | 0 | 0 | 0 |
| Nordrhein-Westfalen | 318 | 246 | 1 | 36 | 0 | 35 | 30 | 33 |
| Rheinland-Pfalz | 96 | 90 | 1 | 0 | 0 | 5 | 2 | 0 |
| Saarland | 583 | 571 | 4 | 0 | 0 | 8 | 102 | 0 |
| Sachsen | 141 | 136 | 1 | 4 | 0 | 0 | 0 | 0 |
| Sachsen-Anhalt | 99 | 98 | 1 | 0 | 0 | 0 | 0 | 0 |
| Schleswig-Holstein | 21 | 0 | 20 | 1 | 0 | 0 | 0 | 0 |
| Thüringen | 133 | 120 | 1 | 5 | 0 | 7 | 23 | 0 |


## Ordnerstruktur

```
bildungsplaene/
├── <Bundesland>/
│   └── <Schulart>/
│       └── <Klassenstufe>/
│           └── <Fach>/
│               ├── <offizieller Dateiname>.pdf
│               └── <Titel>.url          (Linkdatei, wenn kein Download möglich)
├── Master-Index_Bildungsplaene.xlsx     (Tabelle mit Filter; 2. Blatt: Übersicht je Land)
├── Master-Index_Bildungsplaene.csv      (UTF-8 mit BOM, Trennzeichen Semikolon)
├── Master-Index_Bildungsplaene.json     (dieselben Daten maschinenlesbar)
├── README.md
└── _werkzeuge/                          (Skripte zum Aktualisieren)
```

**Schulart** folgt der Bezeichnung des jeweiligen Landes, z. B. „Gymnasium“, „Oberschule“, „Gemeinschaftsschule“, „Gymnasiale Oberstufe“. Gilt ein Plan für mehrere Schularten gemeinsam, heißt der Ordner entsprechend, z. B. „Sekundarstufe I (WRS, HS, RS, GMS)“ in Baden-Württemberg oder „Sekundarbereich I (schulformübergreifend)“ in Niedersachsen.

**Klassenstufe** ist der Geltungsbereich des Dokuments. Deckt ein Plan mehrere Jahrgänge ab, liegt er einmal im Ordner der Spanne (z. B. `Klassen 5-10`) und nicht in jedem Jahrgang einzeln. Bayern veröffentlicht Fachlehrpläne je Jahrgangsstufe, daher gibt es dort Ordner wie `Jahrgangsstufe 7`. Für die gymnasiale Oberstufe steht meist `Klassen 11-13`; die genaue Phase (Einführungs-/Qualifikationsphase, G8/G9) steht im Index in der Spalte „Geltungsbereich“.

**Fach** ist das Unterrichtsfach in der Schreibweise des Landes. Übergreifende Teile (Leitgedanken, Grundsatzbände, Teile A/B) liegen im Fach-Ordner „Fächerübergreifend …“.

Lange Namen werden gekürzt, damit Windows-Pfade unter 260 Zeichen bleiben. Der vollständige Titel steht immer im Index.

## Master-Index

Jede Zeile ist ein Dokument. Die wichtigsten Spalten:

| Spalte | Inhalt |
|---|---|
| Bundesland, Schulart, Klassenstufe, Fach | wie in der Ordnerstruktur |
| Titel | offizieller Titel bzw. Linktext der Quelle |
| Geltungsbereich | Klassen-/Jahrgangsstufen, Bildungsgang, Phase |
| Stand / Fassung | Fassung oder Ausgabejahr laut Quelle bzw. Dateiname |
| Gültigkeit | Status in eckigen Klammern plus die Angabe der Quelle (z. B. Inkraftsetzungsverfügung, „gültig ab 01.08.2026, aufwachsend“) |
| Status kurz | normierte Kategorie, siehe unten |
| Herausgeber / Institution, Quellseite | offizielle Stelle und die Seite, auf der das Dokument gelistet ist |
| Offizieller Link | direkte Adresse des Dokuments |
| Ablage, Ablagestatus | relativer Pfad in dieser Sammlung und ob heruntergeladen, Linkdatei oder nicht abgelegt |

**Status-Kategorien**

- **gültig** – geltender Plan laut Quelle.
- **gültig (aufsteigend eingeführt)** – neuer Plan, der jahrgangsweise eingeführt wird.
- **auslaufend gültig** – Vorgängerplan, der für höhere Jahrgänge noch gilt, während ein neuer Plan aufsteigend eingeführt wird. Beide Fassungen sind abgelegt, damit jeder Jahrgang seinen Plan findet.
- **künftig in Kraft** – bereits veröffentlicht, tritt aber erst nach dem 03.10.2026 in Kraft (z. B. NRW-Kernlehrpläne GOSt ab 2027/28, Bremer Pläne mit Umsetzung ab 2027/28, bayerische FOS/BOS-Pläne ab 2027/28). Abgelegt, damit der Übergang nachvollziehbar ist.
- **gültig (Erprobung)** – Erprobungsfassung, die laut Land im Unterricht eingesetzt wird.
- **gültig (subsidiär)** – Hessen: Lehrpläne 2002 gelten neben dem Kerncurriculum fort, solange eine Schule kein Schulcurriculum beschlossen hat.
- **außer Kraft / Entwurf (nicht abgelegt)** – auf den Portalen noch sichtbar, aber nicht mehr bzw. noch nicht gültig. Diese Einträge stehen nur im Index, damit nachvollziehbar ist, warum sie fehlen.
- **nicht verifiziert** – siehe Schleswig-Holstein.
- **Portalübersicht** – Indexeintrag auf eine offizielle Übersichtsseite (berufliche Bildungsgänge, siehe unten).

## Umfang und Abgrenzung

- **Enthalten:** alle allgemeinbildenden weiterführenden Schularten (Sekundarstufe I und gymnasiale Oberstufe) einschließlich Gesamt-, Gemeinschafts-, Ober-, Regel-, Sekundar-, Stadtteil- und Realschulen plus, außerdem die beruflichen Schularten, die zu allgemeinbildenden bzw. studienqualifizierenden Abschlüssen führen (berufliches Gymnasium, Fachoberschule, Berufsoberschule, Berufskolleg, Berufsfachschule), soweit die Länder dafür eigene Pläne veröffentlichen.
- **Als Portalübersicht (Linkdatei) statt Einzeldokumenten:** die berufsbezogenen Lehrpläne der Berufsschule für die einzelnen Ausbildungsberufe. Das sind bundesweit mehrere tausend Dokumente, überwiegend KMK-Rahmenlehrpläne und keine Landeslehrpläne. Je Land gibt es einen Indexeintrag auf die offizielle Übersicht. Wo die Länder allgemeinbildende Fächer an Berufsschulen gesondert regeln (z. B. Baden-Württemberg, Bayern, Hessen), sind diese enthalten.
- **Nicht enthalten:** Primarstufe, Förderschulen/SBBZ, Fachschulen (tertiärer Bereich), KMK-Bildungsstandards und EPA als länderübergreifende Vorgaben, Unterrichtsmaterialien und Aufgabenbeispiele. Offizielle Begleitdokumente, die zum Lehrplanwerk gehören (z. B. Leitfäden in Hessen, Handreichungen, Prüfungsanforderungen im Saarland), sind enthalten und im Index als ergänzendes Dokument gekennzeichnet.
- **Dubletten:** Innerhalb eines Landes wird jedes Dokument nur einmal abgelegt, auch wenn es für mehrere Schularten oder Richtungen gilt. Der Index nennt dann alle Geltungsbereiche, und weitere Zeilen verweisen auf die Erstablage („Dublette – siehe Erstablage“). Der gemeinsame Rahmenlehrplan 1–10 von Berlin und Brandenburg liegt bewusst in beiden Länderordnern, damit jedes Land für sich vollständig ist.

## Sonderfälle je Land

### Baden-Württemberg
Quelle: [bildungsplaene-bw.de](https://www.bildungsplaene-bw.de/) (Kultusministerium/ZSL). Bildungsplan 2016 in den Fassungen V1, V2 (2022–2025) und V3.0 (2026). Die V3.0-Pläne gelten ab 1. August 2026 aufsteigend (in der Regel ab den Klassen 5–7, beim Gymnasium mit Rückkehr zu G9). Sie werden nur als HTML-Online-Fassung angeboten und sind daher Linkdateien. V1/V2-Pläne, die laut Inkrafttretensverfügung noch für höhere Jahrgänge gelten, sind als „auslaufend gültig“ abgelegt. 7 V1-Pläne (Biologie, Chemie, Physik), deren Übergangsfrist abgelaufen ist, sind nicht abgelegt. Zu jedem Plan steht der Wortlaut der Inkrafttretensverfügung im Index. Berufliche Schulen: Berufliches Gymnasium (Eingangsklasse bis J2 sowie sechsjähriges BG), Berufsoberschule, Berufskolleg, Berufsfachschule, berufsvorbereitende Bildungsgänge und allgemeine Fächer der Berufsschule als PDF. Die Erzieherausbildung (Fachschule für Sozialpädagogik, formal Berufskolleg) ist als Fachschulbildungsgang nicht enthalten.

### Bayern
Quelle: [LehrplanPLUS](https://www.lehrplanplus.bayern.de/) (ISB). LehrplanPLUS ist ein reiner Online-Lehrplan. Die Gesamtlehrplan-PDFs werden laut ISB derzeit überarbeitet und sollen im 4. Quartal 2026 wieder erscheinen. Deshalb gibt es für Mittelschule, Realschule, Gymnasium (G9 inkl. Jahrgangsstufe 13), Wirtschaftsschule, FOS und BOS je Fachlehrplan und Jahrgangsstufe eine Linkdatei, außerdem Jahrgangsstufenprofile und den Bildungs- und Erziehungsauftrag. Erfasst wurde über die offizielle Sitemap; das Änderungsdatum jeder Seite steht im Index. FOS/BOS-Pläne „gültig ab SJ 2027/28“ bzw. „2028/29“ sind als künftig in Kraft markiert. Allgemeinbildende Fächer an Berufsschule und Berufsfachschule sowie die Berufsfachschul-Lehrpläne stammen vom ISB als PDF.

### Berlin und Brandenburg
Quellen: [Bildungsserver Berlin-Brandenburg](https://bildungsserver.berlin-brandenburg.de/unterricht/rahmenlehrplaene) und [berlin.de/sen/bildung](https://www.berlin.de/sen/bildung/unterricht/faecher-rahmenlehrplaene/rahmenlehrplaene/). Der Rahmenlehrplan 1–10 (Teile A, B, C) gilt in beiden Ländern und liegt in beiden Länderordnern. Aktualisierte Fachteile: Deutsch und Mathematik 2023, Moderne Fremdsprachen 2024. Berlin verlinkt dafür eigene Fassungen auf berlin.de, Brandenburg die Fassungen auf dem Bildungsserver. Die Brandenburger Fassungen von 2015 für diese drei Fächer sind als ersetzt markiert und nicht abgelegt. Gymnasiale Oberstufe: Brandenburg mit Inkraftsetzungsdaten laut VV Rahmenlehrplan (neue Teile C für Altgriechisch/Latein ab 2025, Geografie, Geschichte, Philosophie und Politische Bildung ab 2026, jeweils beginnend in der Einführungsphase); Berlin mit den Fassungen von berlin.de, inkl. SESB- und Erstsprachenunterricht-Plänen. Berufliche Bildungsgänge: Portalübersicht.

### Bremen
Quelle: [Landesinstitut für Schule](https://www.lis.bremen.de/schulqualitaet/bildungsplaene-21942). Laut Erlass vom 15.06.2026 wurden zum 01.08.2026 neue Bildungspläne erlassen: Deutsch, Englisch und Mathematik (Sek I) sowie Deutsch und Englisch (Einführungsphase) mit Implementierungsjahr 2026/27 und aufsteigender Umsetzung ab 2027/28; Naturwissenschaften (Sek I) und DGS ab 2026/27; Physik GyO. Die bisherigen Pläne sind entsprechend als auslaufend markiert. Der Bildungsplan Englisch Sek I war am Stichtag laut LIS noch in Überarbeitung. Der Informatik-Entwurf (Erprobungsversion) ist nicht abgelegt. Getrennte Ordner für Oberschule und Gymnasium; berufsbildend: allgemeinbildende Fächer, Berufsfachschulen (Assistenzberufe), Werkschule.

### Hamburg
Quelle: [hamburg.de – Bildungspläne](https://www.hamburg.de/politik-und-verwaltung/behoerden/bsfb/veroeffentlichungen/bildungsplaene). Bildungspläne 2022: Allgemeiner Teil sowie Deutsch, Englisch, Mathematik und Religion seit 01.08.2023, alle übrigen seit 01.08.2024. Stadtteilschule (Jg. 5–11), Gymnasium Sek I, Studienstufe (inkl. Fachrichtungen der beruflichen Gymnasien). Berufliche Schulen (HIBB): Portalübersicht.

### Hessen
Quelle: [kultus.hessen.de](https://kultus.hessen.de/unterricht/kerncurricula-und-lehrplaene). Die HTML-Seiten sind durch eine Browserprüfung geschützt; die Listen wurden deshalb im Browser ausgelesen (siehe `_werkzeuge/he_data.txt`), die Dokumente selbst direkt heruntergeladen. **Einschränkung:** Nach den ersten Downloads hat das Schutzsystem weitere Abrufe gesperrt (HTTP 503), auch bei langsamem, sequenziellem Nachladen. Für die betroffenen Hessen-Dokumente steht im Index „Download fehlgeschlagen – siehe Link“ mit dem offiziellen Link; sie lassen sich später mit `fetch.sh` nachholen. Kerncurricula Sek I je Bildungsgang (Hauptschule, Realschule, Gymnasium) mit Leitfäden; KCGO und KCBG (neue Fassung seit dem Halbjahreswechsel 2024/25 in der Einführungsphase, Grundlage des Landesabiturs ab 2027, teils als Ausgabe April 2026); KC Fachoberschule (seit 2023/24). Zusätzlich die Lehrpläne von 2002 (Hauptschule, Realschule, G8, G9, IGS-Handreichungen), die subsidiär fortgelten, solange eine Schule kein Schulcurriculum beschlossen hat.

### Mecklenburg-Vorpommern
Quelle: [Bildungsserver M-V](https://www.bildung-mv.de/unterricht/rahmenplaene/rahmenplaene-fuer-die-allgemein-bildenden-faecher/). Die Fachseiten nennen je Plan Schulart, Jahrgangsstufen und oft eine Gültigkeit („gültig ab …, aufwachsend“, „auslaufend bis …“); diese Angaben wurden übernommen. Pläne mit Gültigkeitsende vor dem Stichtag (31.07.2026) sind nicht abgelegt. Schularten: Orientierungsstufe, Regionale Schule, Gesamtschule, Gymnasium, Fachgymnasium/Abendgymnasium sowie allgemeinbildende Fächer an Berufsschule und FOS.

### Niedersachsen
Quelle: [NiBiS – Curriculare Vorgaben (CuVo)](https://cuvo.nibis.de/). Erfasst sind Kerncurricula, Rahmenrichtlinien und curriculare Vorgaben für den Sekundarbereich I und II mit den Feldern „gültig ab/bis“ und den Hinweisen der Datenbank (z. B. Kerncurriculum Englisch Sek I ab 01.08.2026, verbindlich spätestens im Schuljahr 2028/29). Die Ordner folgen den Schulformen der Datenbank (Hauptschule, Realschule, Oberschule, Gymnasium Sek I, IGS, schulformübergreifend, Gymnasiale Oberstufe). Kerncurricula für den Förderschwerpunkt geistige Entwicklung sind ausgeschlossen. Berufsbildende Schulen (außer beruflichem Gymnasium): Portalübersicht.

### Nordrhein-Westfalen
Quelle: [Lehrplannavigator NRW](https://lehrplannavigator.nrw.de/) (QUA-LiS). Kernlehrpläne für Hauptschule, Realschule, Gesamtschule (auch Sekundarschule, PRIMUS-Schule), Gymnasium G9 Sek I, gymnasiale Oberstufe und Weiterbildungskolleg. Wo ein „NEU ab SJ …“-Kernlehrplan aufsteigend eingeführt wird, ist der bisherige als auslaufend markiert. Die bereits veröffentlichten Kernlehrpläne für die gymnasiale Oberstufe ab 2027/28 sind als künftig in Kraft markiert. Dokumente aus dem Kernlehrplan-Archiv (G8-Fassungen und abgelöste Pläne) sowie die Englisch-Übergangsfassung für 2021/22 und 2022/23 sind als außer Kraft markiert und nicht abgelegt. Berufskolleg: Portalübersicht.

### Rheinland-Pfalz
Quelle: [Lehrplanportal RLP](https://lehrplaene.bildung-rp.de/lehrplaene/). Erfasst über die im Portal hinterlegte Dokumentliste mit Fach- und Schulart-Kategorien. Schularten: Realschule plus, IGS, Gymnasium (Sek I und Mainzer Studienstufe) sowie auslaufende Pläne von Haupt- und Realschule. Die Oberstufen-Lehrpläne Biologie, Chemie und Physik „gültig bis einschließlich Abiturjahrgang 2024“ und die alten Gesellschaftslehre-Pläne für IGS/RS+ sind als außer Kraft markiert und nicht abgelegt. Berufsbildende Schulen: Portalübersicht.

### Saarland
Quelle: [Bildungsserver Saarland](https://www.saarland.de/mbk/DE/portale/bildungsserver/schulen-und-bildungswege/lehrplaene). Sehr feingliedrig nach Klassenstufen. Das neunjährige Gymnasium wird seit 2023/24 aufsteigend eingeführt: G9-Pläne für Klassenstufen, die der erste G9-Jahrgang noch nicht erreicht hat, sind als veröffentlicht vermerkt; G8-Pläne als auslaufend. Für die gymnasiale Oberstufe gibt es Fassungen je Abiturjahrgang; Fassungen nur für die Abiturjahrgänge bis 2026 sind nicht abgelegt. Enthalten sind auch Allgemeine Prüfungsanforderungen (APA), Lehrplanelemente und Lektürevorgaben, jeweils gekennzeichnet. Fachoberschule und gymnasiale Oberstufe mit berufsbezogener Fachrichtung als PDF; übrige berufliche Schulen als Portalübersicht.

### Sachsen
Quelle: [Lehrplandatenbank Sachsen](https://www.schulportal.sachsen.de/lplandb/). Die Datenbank ist eine dynamische Anwendung; die Lehrplan-IDs wurden über ihre Suchfunktion ermittelt (`_werkzeuge/sn_data.tsv`). Jeder Lehrplan liegt als offizieller PDF-Export vor. Gymnasium, Oberschule, berufliches Gymnasium (fachrichtungsübergreifend und je Fachrichtung) und Fachoberschule; Fassung und Inkrafttretensregelung (z. B. „für die Klassenstufen 5 bis 10 am 1. August 2025“) stehen im Index. Berufsschule, Berufsfachschule und die duale Ausbildung mit Abitur (DuBAS): Portalübersicht.

### Sachsen-Anhalt
Quelle: [Bildungsserver Sachsen-Anhalt](https://www.bildung-lsa.de/), verlinkt vom LISA. Grundsatzbände und Fachlehrpläne für Sekundarschule (Fassung 01.08.2019), Gemeinschaftsschule (fachliche Orientierungen) und Gymnasium (Fassung 01.08.2022, einzelne Fächer 01.08.2024), außerdem der Erprobungslehrplan Informatik Sekundarschule ab 01.08.2026. Das Fachgymnasium nutzt die Fachlehrpläne des Gymnasiums; berufsbildende Schulen: Portalübersicht.

### Schleswig-Holstein
Quelle: [Fachportal.SH](https://fachportal.lernnetz.de/sh/fachanforderungen.html) (IQSH), verlinkt von der [IQSH-Seite Lehrpläne](https://www.schleswig-holstein.de/DE/landesregierung/ministerien-behoerden/IQSH/Arbeitsfelder/Schulentwicklung/Lehrplaene/lehrplaene). **Einschränkung:** Der Server fachportal.lernnetz.de (und lernnetz.de insgesamt) war am 03.10.2026 weder direkt noch über externe Abrufe erreichbar (Verbindungs-Timeout). Für Schleswig-Holstein gibt es deshalb nur Linkdateien auf die Übersicht, auf einzelne Fachseiten und auf die Dokumente, deren Adressen über die IQSH-Seite und den Suchindex belegt sind. Sie sind als „nicht verifiziert“ markiert. Die Sammlung ist für dieses Land unvollständig und sollte nachgeholt werden, sobald das Portal wieder erreichbar ist.

### Thüringen
Quelle: [Thüringer Schulportal](https://www.schulportal-thueringen.de/lehrplaene). Für jeden Lehrplan wurde die Detailseite ausgewertet; die dort angegebene Gültigkeit (z. B. „im Schuljahr 2026/27 für die Klassenstufen 6, 8, 9, 10“) steht im Index. Neben den geltenden Plänen sind die weiterentwickelten Erprobungsfassungen 2026 enthalten; Entwurfsfassungen sind nicht abgelegt. Regelschule (inkl. der Rubrik „Lehrpläne 1999–2008“ für Fächer ohne Neufassung), Gymnasium, Thüringer Gemeinschaftsschule. Berufsbildende Schulen: Portalübersicht.


## Aktualisieren

Im Ordner `_werkzeuge` liegen die Perl- und Bash-Skripte, mit denen die Sammlung erzeugt wurde: je Land ein Sammel-Skript (`bw.pl`, `by.pl`, …), `plan.pl` für die Ablagestruktur, `fetch.sh` für die Downloads und `build_index.pl` für Index und Linkdateien. Sie laufen unter Git Bash (Perl und curl sind dort enthalten). Einige Portale verlangen Sonderwege, die in den Skripten kommentiert sind (Hessen und Sachsen: Listen wurden im Browser ausgelesen und liegen als Datendateien bei).

Bei der nächsten Aktualisierung zuerst Schleswig-Holstein nachholen, sobald das Fachportal wieder erreichbar ist.

## Hinweis

Maßgeblich sind immer die Veröffentlichungen der Länder. Gültigkeitsangaben wurden aus den Portalen, Inkraftsetzungsverfügungen und Erlassen übernommen. Wo eine Quelle keine Gültigkeit nennt, gilt ein Plan als gültig, weil das Land ihn in seiner Übersicht der geltenden Pläne führt; das steht dann so in der Spalte „Gültigkeit“. Die Dokumente unterliegen den Nutzungsbedingungen der jeweiligen Herausgeber und sind hier nur zur eigenen Nutzung abgelegt.
