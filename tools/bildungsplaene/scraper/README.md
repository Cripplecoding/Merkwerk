# Sammel-Skripte für die Bildungspläne

Mit diesen Skripten ist `data/Master-Index_Bildungsplaene.json` entstanden. Sie sammeln die aktuell gültigen Bildungs- und Lehrpläne der Sekundarstufen I und II aus den offiziellen Portalen aller 16 Länder, laden die Dokumente herunter und bauen daraus den Master-Index.

**Die heruntergeladenen Dokumente (rund 2.900 PDFs, etwa 2,4 GB) liegen bewusst nicht im Repository.** Der Index verweist für jeden Eintrag auf die offizielle Quelle. Wer die Dokumente lokal braucht, lässt die Skripte laufen.

## Inhalt

| Datei | Zweck |
|---|---|
| `bw.pl`, `bwb.pl`, `by.pl`, `byb.pl`, `bebb.pl`, `hb.pl`, `hh.pl`, `he.pl`, `mv.pl`, `ni.pl`, `nw.pl`, `rp.pl`, `sl.pl`, `sn.pl`, `st.pl`, `sh.pl`, `th.pl` | ein Sammel-Skript je Land (bzw. Ländergruppe), schreibt nach `rows/` |
| `lib.pl` | gemeinsame Hilfsfunktionen (Abruf, Cache, Normalisierung) |
| `plan.pl` | legt die Ablagepfade fest (`plan.tsv`, `jobs.tsv`) |
| `fetch.sh` | lädt die Dokumente herunter, vorhandene Dateien werden übersprungen |
| `build_index.pl` | erzeugt Linkdateien und den Master-Index (CSV, JSON, XLSX) |
| `pdftext.pl`, `readme.pl` | Textauszug aus PDFs, README der Sammlung |
| `README_template.md`, `README_laender.md` | Vorlagen für die README der Sammlung |
| `he_data.txt`, `sn_data.tsv`, `by/h1.tsv` | von Hand im Browser erhobene Eingaben für Hessen, Sachsen und Bayern |

Ablauf und Sonderfälle stehen in [`LIESMICH.md`](LIESMICH.md). Voraussetzung ist Perl und curl (z. B. Git Bash unter Windows). Mit `BP_WORK=/anderer/pfad` lassen sich Cache und Zwischendateien außerhalb dieses Ordners ablegen; `cache/`, `rows/`, `plan.tsv` und `jobs.tsv` gehören nicht ins Repository.
