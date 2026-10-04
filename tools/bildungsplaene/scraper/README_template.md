# Bildungspläne der Sekundarstufen I und II – Sammlung aller 16 Länder

**Stand der Recherche: 3. Oktober 2026** (Schuljahr 2026/27)

Diese Sammlung enthält die aktuell gültigen Bildungspläne, Lehrpläne, Rahmenlehrpläne, Kerncurricula, Kernlehrpläne und Fachanforderungen der weiterführenden Schulen ab Klasse 5 in allen 16 Ländern. Primarstufe und Förderschulen sind nicht enthalten. Grundlage sind ausschließlich die offiziellen Portale der Kultusministerien und Landesinstitute.

## Auf einen Blick

| | Anzahl |
|---|---:|
| Einträge im Master-Index | {{N_ALL}} |
| heruntergeladene Dokumente (PDF, DOCX) | {{N_PDF}} |
| Linkdateien (`.url`) für Pläne ohne Download-Datei | {{N_LINK}} |
| Dubletten-Verweise (Dokument gilt für mehrere Schularten/Richtungen, liegt aber nur einmal ab) | {{N_DUP}} |
| Download fehlgeschlagen oder ausstehend (nur Link im Index) | {{N_FAIL}} |
| erfasst, aber bewusst nicht abgelegt (außer Kraft, Entwurf) | {{N_EXCL}} |
| Speicherbedarf | {{SIZE}} |

{{LANDTABELLE}}

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

{{LANDNOTIZEN}}

## Aktualisieren

Im Ordner `_werkzeuge` liegen die Perl- und Bash-Skripte, mit denen die Sammlung erzeugt wurde: je Land ein Sammel-Skript (`bw.pl`, `by.pl`, …), `plan.pl` für die Ablagestruktur, `fetch.sh` für die Downloads und `build_index.pl` für Index und Linkdateien. Sie laufen unter Git Bash (Perl und curl sind dort enthalten). Einige Portale verlangen Sonderwege, die in den Skripten kommentiert sind (Hessen und Sachsen: Listen wurden im Browser ausgelesen und liegen als Datendateien bei).

Bei der nächsten Aktualisierung zuerst Schleswig-Holstein nachholen, sobald das Fachportal wieder erreichbar ist.

## Hinweis

Maßgeblich sind immer die Veröffentlichungen der Länder. Gültigkeitsangaben wurden aus den Portalen, Inkraftsetzungsverfügungen und Erlassen übernommen. Wo eine Quelle keine Gültigkeit nennt, gilt ein Plan als gültig, weil das Land ihn in seiner Übersicht der geltenden Pläne führt; das steht dann so in der Spalte „Gültigkeit“. Die Dokumente unterliegen den Nutzungsbedingungen der jeweiligen Herausgeber und sind hier nur zur eigenen Nutzung abgelegt.
