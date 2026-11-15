# Sprachdaten für die Texterkennung im Browser

`deu.traineddata.gz` ist das schnelle deutsche Modell aus
[tesseract-ocr/tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast) (Apache-2.0), mit gzip gepackt.
Die Website (GitHub Pages) lädt es von `tessdata/` statt des größeren Standardmodells: gemessen etwa 40 % schnellere
Erkennung pro Seite bei gleicher Genauigkeit für Druckschrift. In claude.ai liest Claude die Bilder, dort wird es nicht genutzt.
