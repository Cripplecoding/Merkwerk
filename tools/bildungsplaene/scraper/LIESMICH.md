# Werkzeuge zur Aktualisierung

Voraussetzung: Git Bash unter Windows (enthält Perl und curl). Für einige Portale wird zusätzlich das Windows-eigene `curl.exe` genutzt.

Ablauf (im Ordner `_werkzeuge`):

1. Länder-Skripte ausführen, z. B. `perl bw.pl`, `perl bwb.pl`, `perl by.pl`, `perl byb.pl`, `perl bebb.pl`, `perl hb.pl`, `perl hh.pl`, `perl he.pl`, `perl mv.pl`, `perl ni.pl`, `perl nw.pl`, `perl rp.pl`, `perl sl.pl`, `perl sn.pl`, `perl st.pl`, `perl sh.pl`, `perl th.pl`. Jedes schreibt eine Datei nach `rows/`.
2. `perl plan.pl ..` legt die Ablagepfade fest (`plan.tsv`, `jobs.tsv`).
3. `./fetch.sh .. < jobs.tsv > fetch_neu.log` lädt die Dokumente (bereits vorhandene Dateien werden übersprungen).
4. `perl build_index.pl ..` erzeugt Linkdateien und den Master-Index.

Sonderfälle:
- **Bayern** (`by.pl`) liest `by/h1.tsv`. Die Datei entsteht aus der Sitemap von LehrplanPLUS (Seitentitel je URL, siehe Kommentar im Protokoll); zum Aktualisieren die Sitemap neu laden und die Titel erneut abrufen (Crawl-Delay der Seite beachten).
- **Hessen** (`he.pl`) liest `he_data.txt`. Die Seiten von kultus.hessen.de sind durch eine Browserprüfung geschützt; die Linklisten wurden im Browser ausgelesen.
- **Sachsen** (`sn.pl`) liest `sn_data.tsv`. Die Lehrplan-IDs stammen aus der Suchfunktion der Lehrplandatenbank (AJAX), die nur im Browser funktioniert.
- **Schleswig-Holstein** (`sh.pl`) enthält nur belegte Adressen, weil das Fachportal bei der Erstellung nicht erreichbar war. Sobald es wieder erreichbar ist, sollte ein echtes Sammel-Skript nach dem Muster der anderen Länder ergänzt werden.

Mit `BP_WORK=/anderer/pfad` lässt sich das Arbeitsverzeichnis (Cache, Zwischendateien) verlegen.
