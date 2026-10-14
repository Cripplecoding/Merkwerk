# Hinweise für Claude

## Terminal statt Datei-Werkzeuge (Token sparen)

Joshi möchte, dass Claude in Merkwerk-Sitzungen möglichst alles über
Terminal-Befehle erledigt, damit RTK (siehe `.claude/hooks/rtk-einrichten.sh`)
die Ausgaben kürzt.

- Dateien ansehen: `cat`, `head`, `tail` oder `sed -n 'von,bisp'` statt des Read-Werkzeugs.
- Suchen: `grep -rn`, `rg`, `find`, `ls` statt der Grep- und Glob-Werkzeuge.
- Read nur, wenn es nicht anders geht: Bilder, PDFs und direkt vor einer
  Änderung mit dem Edit-Werkzeug (dann nur den nötigen Ausschnitt mit offset/limit).
- Tests, Build und Git wie gewohnt im Terminal (`npm test`, `npm run build`, `git …`).
