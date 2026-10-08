/* ===================== Audio & Podcast ===================== */
// Aus dem Material eines Lernsets entstehen eine gesprochene Zusammenfassung (eine Stimme) und ein Podcast (zwei Stimmen).
// Ablauf, jeder Schritt wird gespeichert und wiederverwendet:
//   1. Informationseinheiten: Claude zerlegt die bereits gelesenen Abschnitte in fachliche Aussagen, jede mit wörtlichem Beleg.
//      Merkwerk prüft jeden Beleg und jede Zahl selbst gegen das Material; Einheiten ohne Beleg fallen weg.
//   2. Inhaltsgrundlage: je Ausführlichkeit eine feste Auswahl dieser Einheiten (Kurz = Rang 1, Standard = Rang 1–2, Ausführlich = alle).
//   3. Skript: Zusammenfassung und Podcast entstehen aus derselben Grundlage; jedes Segment nennt die Einheiten, die es vermittelt.
//   4. Prüfung: lokal (jede Einheit enthalten, keine fremden Zahlen) und durch Claude (nichts erfunden, nichts verfälscht);
//      beanstandete Segmente korrigiert Claude, danach wird erneut geprüft (höchstens zwei Runden).
//   5. Sprachausgabe über die Edge Function merkwerk-tts (Schlüssel nur dort), Zusammensetzen im Browser zu einer MP3-Datei.
// Gespeichert wird auf dem Gerät (IndexedDB, Speicher „audio“): „m|<Lernset>“ = Einheiten, Grundlagen, Skripte, Prüfungen;
// „a|<Lernset>|<Länge>|<Format>|<Sprache>“ = Audiodatei. Nichts davon liegt auf einem Server.

const AUD_LENGTHS={
  kurz:{n:"Kurz",d:"Nur die wichtigsten Kernaussagen",rang:1},
  standard:{n:"Standard",d:"Die wesentlichen Inhalte und Zusammenhänge",rang:2},
  ausfuehrlich:{n:"Ausführlich",d:"Möglichst alle fachlich relevanten Inhalte",rang:3},
};
const AUD_FORMATS={
  monolog:{n:"Audiozusammenfassung",short:"Zusammenfassung",d:"Lass dir deinen Lernstoff verständlich von einer KI-Stimme erklären."},
  podcast:{n:"KI-Podcast",short:"Podcast",d:"Höre dir deinen Lernstoff als spannendes Gespräch zwischen zwei KI-Sprechern an."},
};
const AUD_LANGS={de:"Deutsch",en:"Englisch",fr:"Französisch",es:"Spanisch",it:"Italienisch"};
const AUD_SPEAKER={A:"Moderatorin",B:"Experte"};
const AUD_RATES=[0.75,1,1.25,1.5,1.75,2];
const AUD_STEPS=["Deine Lernmaterialien werden analysiert …","Die wichtigsten Inhalte werden aufbereitet …","Dein Audioskript wird erstellt …","Die Inhalte werden überprüft …","Deine Audiodatei wird generiert …","Fertig! Dein Lernstoff ist bereit zum Anhören."];
const LAME="https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js";
const AUD_RATE_HZ=24000;

/* ---------- Beispiel (Photosynthese): Einheiten und Skripte selbst geschrieben, damit das Beispiel ohne Claude funktioniert ---------- */
const EXAMPLE_UNITS={titel:"Photosynthese",themen:["Grundlagen","Ort der Photosynthese","Lichtabhängige Reaktionen","Calvin-Zyklus","Einflussfaktoren","Bedeutung"],einheiten:[
 {thema:"Grundlagen",art:"definition",rang:1,aussage:"Die Photosynthese ist der Prozess, bei dem grüne Pflanzen, Algen und Cyanobakterien Lichtenergie in chemische Energie umwandeln.",zitat:"Die Photosynthese ist der Prozess, bei dem grüne Pflanzen, Algen und Cyanobakterien Lichtenergie in chemische Energie umwandeln."},
 {thema:"Grundlagen",art:"fakt",rang:1,aussage:"Aus Kohlenstoffdioxid und Wasser entstehen dabei Glucose und Sauerstoff.",zitat:"Aus Kohlenstoffdioxid und Wasser entstehen dabei Glucose und Sauerstoff."},
 {thema:"Grundlagen",art:"formel",rang:3,aussage:"Die vereinfachte Summengleichung lautet: 6 CO2 + 6 H2O ergibt C6H12O6 + 6 O2.",zitat:"Die vereinfachte Summengleichung lautet: 6 CO2 + 6 H2O → C6H12O6 + 6 O2."},
 {thema:"Ort der Photosynthese",art:"fakt",rang:1,aussage:"Die Photosynthese findet in den Chloroplasten statt.",zitat:"Die Photosynthese findet in den Chloroplasten statt."},
 {thema:"Ort der Photosynthese",art:"fakt",rang:3,aussage:"Chloroplasten haben eine Doppelmembran; innen liegen gestapelte Membransäckchen, die Thylakoide, umgeben vom Stroma.",zitat:"Im Inneren liegen gestapelte Membransäckchen, die Thylakoide, umgeben von einer Grundsubstanz, dem Stroma."},
 {thema:"Ort der Photosynthese",art:"fakt",rang:2,aussage:"Der grüne Farbstoff Chlorophyll sitzt in den Thylakoidmembranen und absorbiert vor allem rotes und blaues Licht.",zitat:"Der grüne Farbstoff Chlorophyll sitzt in den Thylakoidmembranen und absorbiert vor allem rotes und blaues Licht."},
 {thema:"Ort der Photosynthese",art:"ursache",rang:3,aussage:"Grünes Licht wird größtenteils reflektiert, deshalb erscheinen Blätter grün.",zitat:"Grünes Licht wird größtenteils reflektiert, deshalb erscheinen Blätter grün."},
 {thema:"Lichtabhängige Reaktionen",art:"definition",rang:1,aussage:"Die lichtabhängigen Reaktionen laufen an den Thylakoidmembranen ab; dort wird Wasser unter Lichteinwirkung gespalten, diesen Vorgang nennt man Fotolyse.",zitat:"Dort wird Wasser unter Lichteinwirkung gespalten; diesen Vorgang nennt man Fotolyse."},
 {thema:"Lichtabhängige Reaktionen",art:"fakt",rang:2,aussage:"Der frei werdende Sauerstoff stammt aus dem Wasser und nicht aus dem Kohlenstoffdioxid.",zitat:"Der dabei frei werdende Sauerstoff stammt also aus dem Wasser und nicht aus dem Kohlenstoffdioxid."},
 {thema:"Lichtabhängige Reaktionen",art:"fakt",rang:1,aussage:"Die Energie des Lichts wird in Form von ATP und NADPH gespeichert, die anschließend für den Aufbau von Zucker gebraucht werden.",zitat:"Die Energie des Lichts wird in Form von ATP und NADPH gespeichert, die anschließend für den Aufbau von Zucker gebraucht werden."},
 {thema:"Calvin-Zyklus",art:"ablauf",rang:1,aussage:"Im Stroma läuft der Calvin-Zyklus ab; das Enzym Rubisco bindet dabei Kohlenstoffdioxid an ein Akzeptormolekül.",zitat:"Das Enzym Rubisco bindet dabei Kohlenstoffdioxid an ein Akzeptormolekül."},
 {thema:"Calvin-Zyklus",art:"ablauf",rang:2,aussage:"Mithilfe von ATP und NADPH aus den lichtabhängigen Reaktionen wird daraus schrittweise Zucker aufgebaut.",zitat:"Mithilfe von ATP und NADPH aus den lichtabhängigen Reaktionen wird daraus schrittweise Zucker aufgebaut."},
 {thema:"Calvin-Zyklus",art:"ursache",rang:2,aussage:"Der Calvin-Zyklus braucht kein Licht direkt, ist aber auf die Produkte der lichtabhängigen Reaktionen angewiesen und kommt im Dunkeln deshalb bald zum Erliegen.",zitat:"Der Calvin-Zyklus braucht kein Licht direkt, ist aber auf die Produkte der lichtabhängigen Reaktionen angewiesen und kommt im Dunkeln deshalb bald zum Erliegen."},
 {thema:"Einflussfaktoren",art:"fakt",rang:1,aussage:"Die Photosyntheserate hängt von der Lichtintensität, der Kohlenstoffdioxid-Konzentration und der Temperatur ab.",zitat:"Die Photosyntheserate hängt von der Lichtintensität, der Kohlenstoffdioxid-Konzentration und der Temperatur ab."},
 {thema:"Einflussfaktoren",art:"zusammenhang",rang:2,aussage:"Steigt die Lichtintensität, nimmt die Rate zunächst zu, bis ein anderer Faktor begrenzt; dieser Faktor wird als begrenzender Faktor bezeichnet.",zitat:"Steigt die Lichtintensität, nimmt die Rate zunächst zu, bis ein anderer Faktor begrenzt."},
 {thema:"Einflussfaktoren",art:"ursache",rang:3,aussage:"Bei zu hohen Temperaturen sinkt die Rate wieder, weil Enzyme wie Rubisco ihre Struktur verlieren.",zitat:"Bei zu hohen Temperaturen sinkt die Rate wieder, weil Enzyme wie Rubisco ihre Struktur verlieren."},
 {thema:"Bedeutung",art:"fakt",rang:1,aussage:"Die Photosynthese liefert den Sauerstoff, den die meisten Lebewesen zur Zellatmung brauchen.",zitat:"Die Photosynthese liefert den Sauerstoff, den die meisten Lebewesen zur Zellatmung brauchen."},
 {thema:"Bedeutung",art:"fakt",rang:2,aussage:"Die produzierte Glucose bildet die Grundlage fast aller Nahrungsketten.",zitat:"Gleichzeitig bildet die produzierte Glucose die Grundlage fast aller Nahrungsketten."},
 {thema:"Bedeutung",art:"zusammenhang",rang:3,aussage:"Die Zellatmung kehrt die Summengleichung der Photosynthese im Prinzip um: Glucose und Sauerstoff werden zu Kohlenstoffdioxid und Wasser abgebaut, wobei Energie frei wird.",zitat:"Glucose und Sauerstoff werden zu Kohlenstoffdioxid und Wasser abgebaut, wobei Energie frei wird."},
],hinweise:[]};
// Beispielskripte für „Standard“ (Rang 1–2 = E1, E2, E4, E6, E8, E9, E10, E11, E12, E13, E14, E15, E17, E18)
const EXAMPLE_SCRIPTS={
 monolog:{titel:"Photosynthese – Zusammenfassung",segmente:[
  {teil:"einleitung",text:"In dieser Zusammenfassung geht es um die Photosynthese. Du erfährst, wo sie stattfindet, welche Reaktionen dabei ablaufen, wovon sie abhängt und welche Bedeutung sie hat.",einheiten:[]},
  {teil:"haupt",text:"Die Photosynthese ist der Prozess, bei dem grüne Pflanzen, Algen und Cyanobakterien Lichtenergie in chemische Energie umwandeln. Aus Kohlenstoffdioxid und Wasser entstehen dabei Glucose und Sauerstoff.",einheiten:["E1","E2"]},
  {teil:"haupt",text:"Ort des Geschehens sind die Chloroplasten. Dort sitzt der grüne Farbstoff Chlorophyll in den Thylakoidmembranen. Er absorbiert vor allem rotes und blaues Licht.",einheiten:["E4","E6"]},
  {teil:"haupt",text:"An den Thylakoidmembranen laufen die lichtabhängigen Reaktionen ab. Unter Lichteinwirkung wird dort Wasser gespalten. Diesen Vorgang nennt man Fotolyse. Wichtig dabei: Der frei werdende Sauerstoff stammt aus dem Wasser und nicht aus dem Kohlenstoffdioxid.",einheiten:["E8","E9"]},
  {teil:"haupt",text:"Die Energie des Lichts wird in Form von ATP und NADPH gespeichert. Diese beiden Stoffe werden anschließend für den Aufbau von Zucker gebraucht.",einheiten:["E10"]},
  {teil:"haupt",text:"Dieser Aufbau geschieht im Stroma, im Calvin-Zyklus. Das Enzym Rubisco bindet dabei Kohlenstoffdioxid an ein Akzeptormolekül. Mithilfe von ATP und NADPH aus den lichtabhängigen Reaktionen wird daraus schrittweise Zucker aufgebaut.",einheiten:["E11","E12"]},
  {teil:"haupt",text:"Der Calvin-Zyklus braucht kein Licht direkt. Weil er aber auf die Produkte der lichtabhängigen Reaktionen angewiesen ist, kommt er im Dunkeln bald zum Erliegen.",einheiten:["E13"]},
  {teil:"haupt",text:"Die Photosyntheserate hängt von der Lichtintensität, der Kohlenstoffdioxid-Konzentration und der Temperatur ab. Steigt die Lichtintensität, nimmt die Rate zunächst zu, bis ein anderer Faktor begrenzt. Diesen Faktor nennt man begrenzenden Faktor.",einheiten:["E14","E15"]},
  {teil:"haupt",text:"Zur Bedeutung: Die Photosynthese liefert den Sauerstoff, den die meisten Lebewesen zur Zellatmung brauchen. Und die produzierte Glucose bildet die Grundlage fast aller Nahrungsketten.",einheiten:["E17","E18"]},
  {teil:"abschluss",text:"Zum Schluss das Wichtigste: Bei der Photosynthese wird Lichtenergie in chemische Energie umgewandelt. An den Thylakoidmembranen wird Wasser gespalten, im Stroma baut der Calvin-Zyklus Zucker auf. Und die Rate hängt von Licht, Kohlenstoffdioxid und Temperatur ab.",einheiten:["E1","E8","E11","E14"]},
 ]},
 podcast:{titel:"Photosynthese – Podcast",segmente:[
  {teil:"einleitung",sprecher:"A",text:"Hallo und willkommen! Heute geht es um die Photosynthese. Ich habe dazu einige Fragen mitgebracht.",einheiten:[]},
  {teil:"einleitung",sprecher:"B",text:"Gerne, dann legen wir los.",einheiten:[]},
  {teil:"haupt",sprecher:"A",text:"Was versteht man eigentlich unter Photosynthese?",einheiten:[]},
  {teil:"haupt",sprecher:"B",text:"Das ist der Prozess, bei dem grüne Pflanzen, Algen und Cyanobakterien Lichtenergie in chemische Energie umwandeln. Aus Kohlenstoffdioxid und Wasser entstehen dabei Glucose und Sauerstoff.",einheiten:["E1","E2"]},
  {teil:"haupt",sprecher:"A",text:"Und wo in der Pflanze passiert das?",einheiten:[]},
  {teil:"haupt",sprecher:"B",text:"In den Chloroplasten. Dort sitzt der grüne Farbstoff Chlorophyll in den Thylakoidmembranen, und er absorbiert vor allem rotes und blaues Licht.",einheiten:["E4","E6"]},
  {teil:"haupt",sprecher:"A",text:"Was läuft an diesen Thylakoidmembranen ab?",einheiten:[]},
  {teil:"haupt",sprecher:"B",text:"Die lichtabhängigen Reaktionen. Unter Lichteinwirkung wird dort Wasser gespalten. Diesen Vorgang nennt man Fotolyse.",einheiten:["E8"]},
  {teil:"haupt",sprecher:"A",text:"Dann kommt der Sauerstoff also aus dem Wasser?",einheiten:[]},
  {teil:"haupt",sprecher:"B",text:"Genau. Der frei werdende Sauerstoff stammt aus dem Wasser und nicht aus dem Kohlenstoffdioxid.",einheiten:["E9"]},
  {teil:"haupt",sprecher:"A",text:"Und was passiert mit der Energie des Lichts?",einheiten:[]},
  {teil:"haupt",sprecher:"B",text:"Sie wird in Form von ATP und NADPH gespeichert. Diese beiden Stoffe werden anschließend für den Aufbau von Zucker gebraucht.",einheiten:["E10"]},
  {teil:"haupt",sprecher:"A",text:"Wo wird der Zucker denn aufgebaut?",einheiten:[]},
  {teil:"haupt",sprecher:"B",text:"Im Stroma, im Calvin-Zyklus. Das Enzym Rubisco bindet dort Kohlenstoffdioxid an ein Akzeptormolekül. Mithilfe von ATP und NADPH aus den lichtabhängigen Reaktionen wird daraus schrittweise Zucker aufgebaut.",einheiten:["E11","E12"]},
  {teil:"haupt",sprecher:"A",text:"Braucht der Calvin-Zyklus selbst auch Licht?",einheiten:[]},
  {teil:"haupt",sprecher:"B",text:"Nicht direkt. Er ist aber auf die Produkte der lichtabhängigen Reaktionen angewiesen und kommt im Dunkeln deshalb bald zum Erliegen.",einheiten:["E13"]},
  {teil:"haupt",sprecher:"A",text:"Wovon hängt ab, wie schnell die Photosynthese läuft?",einheiten:[]},
  {teil:"haupt",sprecher:"B",text:"Die Photosyntheserate hängt von der Lichtintensität, der Kohlenstoffdioxid-Konzentration und der Temperatur ab.",einheiten:["E14"]},
  {teil:"haupt",sprecher:"A",text:"Mehr Licht heißt also immer mehr Photosynthese?",einheiten:[]},
  {teil:"haupt",sprecher:"B",text:"Nur zunächst. Steigt die Lichtintensität, nimmt die Rate zu, bis ein anderer Faktor begrenzt. Diesen Faktor nennt man begrenzenden Faktor.",einheiten:["E15"]},
  {teil:"haupt",sprecher:"A",text:"Zum Schluss: Warum ist die Photosynthese so wichtig?",einheiten:[]},
  {teil:"haupt",sprecher:"B",text:"Sie liefert den Sauerstoff, den die meisten Lebewesen zur Zellatmung brauchen. Und die produzierte Glucose bildet die Grundlage fast aller Nahrungsketten.",einheiten:["E17","E18"]},
  {teil:"abschluss",sprecher:"A",text:"Dann fasse ich zusammen: Lichtenergie wird in chemische Energie umgewandelt, an den Thylakoidmembranen wird Wasser gespalten, und im Stroma baut der Calvin-Zyklus Zucker auf.",einheiten:["E1","E8","E11"]},
  {teil:"abschluss",sprecher:"B",text:"Und die Rate hängt von Licht, Kohlenstoffdioxid und Temperatur ab. Danke fürs Zuhören!",einheiten:["E14"]},
 ]},
};

/* ---------- Kleine Helfer ---------- */
function audHash(s){ let h1=0xdeadbeef^s.length, h2=0x41c6ce57^s.length;
  for(let i=0;i<s.length;i++){ const c=s.charCodeAt(i); h1=Math.imul(h1^c,2654435761); h2=Math.imul(h2^c,1597334677); }
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909); h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (4294967296*(2097151&h2)+(h1>>>0)).toString(36); }
// Dokumentenstand: ändert sich, sobald eine Datei hinzukommt, wegfällt oder ihr Text korrigiert wird
const materialHash=set=>audHash((set.files||[]).map(f=>f.name+"\u0000"+f.text).join("\u0001"));
// Zahlen als Ziffern (nicht Teil von Formeln wie CO2): „1.000“ = „1000“, „1,5“ = „1.5“
function numbersOf(s){
  return (String(s||"").match(/(?<![\p{L}\d.,])\d+(?:[.,]\d+)*(?![\p{L}])/gu)||[]).map(n=>/^\d{1,3}(\.\d{3})+$/.test(n)?n.replace(/\./g,""):n.replace(",",".")).map(n=>n.replace(/[.,]$/,""));
}
const fmtTime=t=>{ t=Math.max(0,Math.floor(t||0)); const h=Math.floor(t/3600), m=Math.floor(t%3600/60), s=t%60; return (h?h+":"+pad(m):m)+":"+pad(s); };
const audVariantKey=(fmt,lang)=>fmt+"|"+lang;
const audBlobKey=(setId,len,fmt,lang)=>`a|${setId}|${len}|${fmt}|${lang}`;
function audErr(e){
  const c=e&&e.code;
  if(c==="tts_not_configured") return "Auf dem Merkwerk-Server ist noch keine Sprachausgabe eingerichtet. Das Skript ist fertig; für die Audiodatei muss der Schlüssel des Sprachdienstes hinterlegt werden (docs/audio-podcast.md).";
  if(c==="tts_key_invalid") return "Der Sprachdienst lehnt den hinterlegten Schlüssel ab. Bitte den Schlüssel auf dem Merkwerk-Server prüfen.";
  if(c==="tts_failed") return "Der Sprachdienst konnte das Audio gerade nicht erzeugen. Versuch es noch einmal.";
  if(c==="daily_limit"&&e.message==="zeichen") return "Dein Tageslimit für die Sprachausgabe ist erreicht. Morgen geht es weiter; das geprüfte Skript bleibt gespeichert.";
  if(c==="daily_limit"&&e.message==="zeichen_gesamt") return "Die Sprachausgabe für heute ist für alle aufgebraucht. Morgen geht es weiter; das geprüfte Skript bleibt gespeichert.";
  if(c==="no_units") return "Im Material wurden keine belegbaren Inhalte gefunden. Prüfe unter „Gelesenen Text ansehen“, ob der Text richtig gelesen wurde.";
  if(c==="decode_failed") return "Die Audioteile konnten auf diesem Gerät nicht zusammengesetzt werden. Versuch es in einem aktuellen Browser noch einmal.";
  return sampleErr(e);
}

/* ---------- Schritt 1: Informationseinheiten ---------- */
// Abschnitte in Pakete von höchstens ~100 000 Zeichen; bei großem Material eine Anfrage je Paket, nichts wird abgeschnitten
function unitChunks(set,budget=100000){
  const out=[]; let cur=[], n=0;
  for(const s of set.sections){ if(cur.length&&n+s.text.length>budget){ out.push(cur); cur=[]; n=0; } cur.push(s); n+=s.text.length; }
  if(cur.length) out.push(cur);
  return out;
}
function unitPrompt(chunkNo,chunks){
  return `Du bereitest Lernmaterial für eine gesprochene Zusammenfassung und einen Lernpodcast vor. Grundlage ist AUSSCHLIESSLICH das MATERIAL${chunks>1?` (Teil ${chunkNo} von ${chunks})`:""}.
Zerlege es in fachliche Informationseinheiten.

REGELN
1. Nur was im Material steht. Ergänze nichts: keine eigenen Beispiele, Zahlen, Definitionen, Ereignisse oder Erklärungen, auch kein Allgemeinwissen.
2. Eine Einheit ist genau eine fachliche Aussage: eine Definition, ein Fakt, eine Zahl oder ein Datum, eine Ursache und ihre Wirkung, ein Schritt eines Ablaufs, eine Formel oder ein Rechenweg, ein Beispiel aus dem Material oder ein Zusammenhang zwischen Abschnitten oder Dokumenten.
3. "aussage": 1 bis 2 Sätze, Bedeutung exakt wie im Material. Einschränkungen wie „meist“, „vereinfacht“, „unter bestimmten Bedingungen“ bleiben erhalten. Zahlen, Einheiten und Fachbegriffe genau wie im Material, Zahlen als Ziffern.
4. "zitat": ein wörtliches, zusammenhängendes Zitat aus dem Material (20 bis 300 Zeichen), das die Aussage belegt. Exakt so geschrieben wie im Material, ohne Auslassungen, ohne "…". "quelle": die Abschnitts-IDs.
5. "thema": kurze Themenbezeichnung. Gleiche Themen gleich benennen, auch wenn sie in verschiedenen Dokumenten stehen. "themen": alle Themen in einer didaktisch sinnvollen Reihenfolge (Grundlagen vor Details, Ursachen vor Folgen).
6. "rang": 1 = Kernaussage, die in jede Kurzfassung gehört; 2 = wesentlicher Inhalt oder Zusammenhang; 3 = Detail. Etwa ein Viertel der Einheiten hat Rang 1.
7. "art": "definition" | "fakt" | "zahl" | "ursache" | "ablauf" | "formel" | "beispiel" | "zusammenhang" | "einschraenkung".
8. Erfasse alle fachlich relevanten Inhalte, auch Zahlen, Daten, Formeln, zeitliche Abläufe und Beispiele aus dem Material. Keine Dopplungen.
9. Unleserliche, widersprüchliche oder unvollständige Stellen nicht reparieren oder raten, sondern unter "hinweise" melden: {"art":"unleserlich"|"widerspruch"|"unvollstaendig","quelle":"Abschnitts-ID","text":"kurz, was betroffen ist"}.

Antworte nur mit JSON: {"titel":"kurzer Titel des Lernstoffs","themen":["…"],"einheiten":[{"thema","aussage","art","rang","quelle":["S1"],"zitat"}],"hinweise":[]}`;
}
function validateUnit(set,u){
  if(!u||!u.aussage||!u.zitat) return null;
  const aussage=String(u.aussage).trim(); if(aussage.length<8||aussage.length>700) return null;
  const loc=locateQuote(set,u.zitat); if(!loc) return null;
  const ids=new Set([...(loc.sectionIds||[]),...(Array.isArray(u.quelle)?u.quelle:[u.quelle]).filter(id=>set.sections.some(s=>s.id===id))]);
  // Jede Zahl der Aussage muss im Zitat oder in den angegebenen Abschnitten stehen
  const src=new Set(numbersOf([u.zitat,...set.sections.filter(s=>ids.has(s.id)).map(s=>s.text)].join(" ")));
  if(numbersOf(aussage).some(n=>!src.has(n))) return null;
  const art=["definition","fakt","zahl","ursache","ablauf","formel","beispiel","zusammenhang","einschraenkung"].includes(u.art)?u.art:"fakt";
  return {thema:String(u.thema||"Allgemein").trim().slice(0,80),aussage,art,rang:clamp(Math.round(Number(u.rang))||2,1,3),zitat:String(u.zitat),fileName:loc.fileName,sections:[...ids]};
}
// Einheiten mehrerer Pakete zusammenführen: Themenreihenfolge bleibt, Dubletten fallen weg, IDs E1 … En
function mergeUnits(parts){
  const themen=[], seen=new Set(), units=[];
  for(const p of parts) for(const t of p.themen||[]) if(!themen.some(x=>relax(x)===relax(t))) themen.push(String(t));
  for(const p of parts) for(const u of p.units){ const k=relax(u.aussage); if(seen.has(k)) continue; seen.add(k);
    if(!themen.some(x=>relax(x)===relax(u.thema))) themen.push(u.thema); units.push(u); }
  const order=t=>themen.findIndex(x=>relax(x)===relax(t));
  units.sort((a,b)=>order(a.thema)-order(b.thema)); // stabil: innerhalb eines Themas Reihenfolge des Materials
  units.forEach((u,i)=>u.id="E"+(i+1));
  return {themen:themen.filter(t=>units.some(u=>relax(u.thema)===relax(t))),units};
}
async function buildUnits(set,{signal}={}){
  if(set.example){ const v=EXAMPLE_UNITS.einheiten.map(u=>validateUnit(set,u)); if(v.some(x=>!x)) throw aiErr("no_units");
    const m=mergeUnits([{themen:EXAMPLE_UNITS.themen,units:v}]); return {...m,titel:EXAMPLE_UNITS.titel,hinweise:[],dropped:0}; }
  if(!CAP.sample) throw aiErr("not_granted");
  const chunks=unitChunks(set); const parts=[]; let dropped=0, titel="", hinweise=[];
  for(let i=0;i<chunks.length;i++){
    const r=await askWithMaterial(unitPrompt(i+1,chunks.length),materialText(chunks[i]),{modelTier:"default",cache:false,signal});
    const raw=(r&&r.einheiten)||[]; const units=raw.map(u=>validateUnit(set,u)).filter(Boolean);
    dropped+=raw.length-units.length; titel||=String(r&&r.titel||"");
    hinweise.push(...((r&&r.hinweise)||[]).filter(h=>h&&h.text).map(h=>({art:String(h.art||"unvollstaendig"),quelle:String(h.quelle||""),text:String(h.text).slice(0,300)})));
    parts.push({themen:(r&&r.themen)||[],units});
  }
  const m=mergeUnits(parts);
  if(!m.units.length) throw aiErr("no_units");
  return {...m,titel:titel||set.name,hinweise,dropped};
}

/* ---------- Schritt 2: Inhaltsgrundlage je Ausführlichkeit ---------- */
function selectBasis(units,len){ const max=(AUD_LENGTHS[len]||AUD_LENGTHS.standard).rang; return units.filter(u=>u.rang<=max).map(u=>u.id); }

/* ---------- Schritt 3: Skripte aus derselben Grundlage ---------- */
function basisText(meta,ids){ const set=new Set(ids); return meta.units.filter(u=>set.has(u.id)).map(u=>`${u.id} [${u.thema} · Rang ${u.rang}] ${u.aussage}\n   Beleg: „${u.zitat}“`).join("\n"); }
function scriptPrompt(meta,ids,fmt,lang){
  const langRule=lang==="de"?"Sprache: Deutsch.":`Sprache: ${AUD_LANGS[lang]}. Übertrage die Inhalte sinngemäß genau in diese Sprache, ohne etwas hinzuzufügen; nenne Fachbegriffe beim ersten Mal zusätzlich auf Deutsch, wenn das beim Lernen hilft.`;
  const common=`Grundlage ist AUSSCHLIESSLICH die INHALTSGRUNDLAGE unten: nummerierte Informationseinheiten aus dem Lernmaterial, je mit Beleg.

VERBINDLICHE REGELN
1. Jede Einheit der Grundlage kommt im Hauptteil mindestens einmal vor, vollständig und mit unveränderter Bedeutung: Zahlen, Einheiten, Fachbegriffe, Einschränkungen und Ursache-Wirkung-Richtung exakt wie in der Einheit.
2. Keine fachliche Aussage, die nicht durch eine Einheit gedeckt ist: keine eigenen Beispiele, Vergleiche, Zahlen, Definitionen, Hintergründe oder Folgerungen. Rein sprachliche Überleitungen sind erlaubt.
3. Jedes Segment nennt in "einheiten" die IDs aller Einheiten, deren Inhalt es ausspricht. Segmente ohne fachlichen Inhalt haben "einheiten": [].
4. Aufbau: "einleitung" (nennt nur, worum es geht, ohne Fachinhalt), "haupt" (alle Einheiten in der Reihenfolge der Themen, Grundlagen vor Details, Zusammenhänge an der passenden Stelle), "abschluss" (wiederholt kurz die wichtigsten Kernaussagen aus Rang 1, nichts Neues).
5. Für das Ohr schreiben: kurze, klare Sätze, abwechslungsreich, ohne Füllwörter und ohne unnötige Wiederholungen. Keine Aufzählungszeichen, Klammern, Tabellen oder Markdown. Abkürzungen beim ersten Mal ausschreiben. Formeln und Gleichungen so formulieren, dass man sie vorlesen kann (Zahlen als Ziffern lassen). Fachbegriffe einführen und mit dem Inhalt der Einheiten erklären. Niveau und Fachsprache des Materials beibehalten.
6. Ein Segment hat höchstens 600 Zeichen.
${langRule}`;
  const spec=fmt==="podcast"?`Du schreibst das Skript eines Lernpodcasts mit zwei Stimmen, der wie ein professionell produzierter Bildungspodcast klingt.
Sprecher "A" (Moderatorin): führt durch das Thema, stellt sinnvolle Verständnisfragen, leitet zwischen Themen über und fasst gelegentlich wichtige Zusammenhänge zusammen.
Sprecher "B" (Experte): beantwortet die Fragen und erklärt die Inhalte der Einheiten fachlich korrekt und verständlich.
Gelegentlich darf auch A etwas erklären und B nachfragen, damit das Gespräch natürlich wirkt. Kurze Reaktionen („Genau.“, „Verstehe.“) sind erlaubt, aber sparsam und abwechslungsreich. Keine übertriebene Begeisterung, keine Floskeln, keine Abschweifungen. Fragen enthalten keine fachlichen Behauptungen, die nicht durch eine Einheit gedeckt sind; wer eine Einheit ausspricht oder zusammenfasst, nennt sie in "einheiten".

${common}

Antworte nur mit JSON: {"titel":"…","segmente":[{"teil":"einleitung"|"haupt"|"abschluss","sprecher":"A"|"B","text":"…","einheiten":["E1"]}]}`
  :`Du schreibst das Sprechskript einer Audiozusammenfassung für eine einzelne Stimme. Sie soll wie eine professionelle, gut strukturierte mündliche Erklärung klingen, nicht wie vorgelesener Text.

${common}

Antworte nur mit JSON: {"titel":"…","segmente":[{"teil":"einleitung"|"haupt"|"abschluss","text":"…","einheiten":["E1"]}]}`;
  return `${spec}\n\nINHALTSGRUNDLAGE\n${basisText(meta,ids)}`;
}
function cleanSegments(list,fmt){
  return (Array.isArray(list)?list:[]).filter(s=>s&&String(s.text||"").trim()).map(s=>({
    teil:["einleitung","haupt","abschluss"].includes(s.teil)?s.teil:"haupt",
    ...(fmt==="podcast"?{sprecher:s.sprecher==="B"?"B":"A"}:{}),
    text:String(s.text).replace(/\s+/g," ").trim(),
    einheiten:[...new Set((Array.isArray(s.einheiten)?s.einheiten:[]).map(String))],
  }));
}
async function writeScript(set,meta,ids,fmt,lang,{signal}={}){
  if(set.example) return {titel:EXAMPLE_SCRIPTS[fmt].titel,segments:cleanSegments(EXAMPLE_SCRIPTS[fmt].segmente,fmt)};
  const r=await CAP.sample.json(scriptPrompt(meta,ids,fmt,lang),{modelTier:"default",cache:false,signal});
  const segments=cleanSegments(r&&r.segmente,fmt);
  if(!segments.length) throw aiErr("invalid_json");
  return {titel:String(r.titel||meta.titel||set.name).slice(0,120),segments};
}

/* ---------- Schritt 4: Prüfung und Korrektur ---------- */
// Lokale Prüfung: Abdeckung jeder Einheit im Hauptteil, keine Verweise auf fremde Einheiten, keine Zahlen außerhalb der Grundlage
function localCheck(meta,ids,segments){
  const basis=new Set(ids), problems=[];
  const allowed=new Set(numbersOf(meta.units.filter(u=>basis.has(u.id)).map(u=>u.aussage+" "+u.zitat).join(" ")));
  segments.forEach((s,i)=>{
    const foreign=s.einheiten.filter(id=>!basis.has(id));
    if(foreign.length){ s.einheiten=s.einheiten.filter(id=>basis.has(id)); }
    const nums=[...new Set(numbersOf(s.text).filter(n=>!allowed.has(n)))];
    if(nums.length) problems.push({segment:i,einheit:null,art:"erfunden",detail:`Zahl${nums.length>1?"en":""} ${nums.join(", ")} steht in keiner Einheit der Grundlage`,quelle:"lokal"});
  });
  const covered=new Set(segments.filter(s=>s.teil==="haupt").flatMap(s=>s.einheiten));
  for(const id of ids) if(!covered.has(id)) problems.push({segment:null,einheit:id,art:"fehlend",detail:"Einheit kommt im Hauptteil nicht vor",quelle:"lokal"});
  return {problems,covered:ids.filter(id=>covered.has(id)).length};
}
function segmentList(segments,fmt){ return segments.map((s,i)=>`#${i} [${s.teil}${fmt==="podcast"?" · "+s.sprecher:""} · Einheiten: ${s.einheiten.join(", ")||"keine"}] ${s.text}`).join("\n"); }
function checkPrompt(meta,ids,segments,fmt,lang){
  return `Du prüfst das Sprechskript einer ${fmt==="podcast"?"Podcast-Folge mit zwei Sprechern":"Audiozusammenfassung"} für eine Lernplattform, bevor daraus Audio wird. Maßstab ist ausschließlich die INHALTSGRUNDLAGE (Einheiten mit wörtlichem Beleg aus dem Material). Prüfe streng und nach Bedeutung, nicht nach Wortgleichheit${lang!=="de"?` (das Skript ist auf ${AUD_LANGS[lang]}, die Grundlage auf Deutsch)`:""}:
1. "fehlend": Eine Einheit fehlt oder ist nur unvollständig enthalten (zum Beispiel ohne ihre Einschränkung oder ohne eine ihrer Zahlen).
2. "erfunden": Ein Segment enthält eine fachliche Aussage, die durch keine Einheit gedeckt ist: eigene Beispiele, Zahlen, Definitionen, Ereignisse, Erklärungen oder Folgerungen.
3. "verfaelscht": Eine Aussage weicht in der Bedeutung ab: Zahl oder Einheit falsch, Begriff vertauscht, Einschränkung weggelassen oder verändert, Ursache und Wirkung vertauscht, Verallgemeinerung.
Rein sprachliche Überleitungen, Fragen ohne fachliche Behauptung und kurze Reaktionen sind erlaubt und kein Problem.

Antworte nur mit JSON: {"probleme":[{"segment":Nummer oder null,"einheit":"E3" oder null,"art":"fehlend"|"erfunden"|"verfaelscht","detail":"kurz, was genau"}]}. Keine Probleme: {"probleme":[]}.

INHALTSGRUNDLAGE
${basisText(meta,ids)}

SKRIPT
${segmentList(segments,fmt)}`;
}
function repairPrompt(meta,ids,segments,fmt,lang,problems){
  return `Ein Sprechskript für eine ${fmt==="podcast"?"Podcast-Folge (Sprecher A = Moderatorin, B = Experte)":"Audiozusammenfassung (eine Stimme)"} hat bei der Prüfung gegen die INHALTSGRUNDLAGE diese PROBLEME. Korrigiere nur die betroffenen Stellen.
- "erfunden" oder "verfaelscht": ersetze das Segment so, dass es nur noch Inhalte der Einheiten mit unveränderter Bedeutung enthält.
- "fehlend": füge die Einheit an der inhaltlich passenden Stelle im Hauptteil ein (neues Segment nach einem bestehenden), vollständig und unverändert.
Gleiche Regeln wie beim Schreiben: nur Inhalte der Einheiten, für das Ohr geschrieben, höchstens 600 Zeichen je Segment, "einheiten" nennt die ausgesprochenen Einheiten${fmt==="podcast"?", passender Sprecher, das Gespräch bleibt flüssig":""}. Sprache: ${AUD_LANGS[lang]}.

Antworte nur mit JSON: {"korrekturen":[{"segment":Nummer,"neu":[Segmente]} | {"nach":Nummer,"neu":[Segmente]}]}
"segment" ersetzt dieses Segment ("neu": [] löscht es), "nach" fügt hinter diesem Segment ein (-1 = ganz vorne). Segmente: {"teil","${fmt==="podcast"?"sprecher\",\"":""}text","einheiten"}.

PROBLEME
${problems.map(p=>`- ${p.art}${p.segment!=null?` in #${p.segment}`:""}${p.einheit?` (${p.einheit})`:""}: ${p.detail}`).join("\n")}

INHALTSGRUNDLAGE
${basisText(meta,ids)}

SKRIPT
${segmentList(segments,fmt)}`;
}
// Korrekturen anwenden: von hinten nach vorne, damit die Nummern stimmen
function applyRepairs(segments,korrekturen,fmt){
  const out=[...segments];
  const list=(Array.isArray(korrekturen)?korrekturen:[]).filter(k=>k&&(Number.isInteger(k.segment)||Number.isInteger(k.nach)));
  list.sort((a,b)=>(b.segment??b.nach+0.5)-(a.segment??a.nach+0.5));
  for(const k of list){ const neu=cleanSegments(k.neu,fmt);
    if(Number.isInteger(k.segment)){ if(k.segment>=0&&k.segment<out.length) out.splice(k.segment,1,...neu); }
    else if(k.nach>=-1&&k.nach<out.length) out.splice(k.nach+1,0,...neu); }
  return out;
}
async function claudeCheck(meta,ids,segments,fmt,lang,signal){
  const r=await CAP.sample.json(checkPrompt(meta,ids,segments,fmt,lang),{modelTier:"default",cache:false,signal});
  return ((r&&r.probleme)||[]).filter(p=>p&&["fehlend","erfunden","verfaelscht"].includes(p.art)).map(p=>({segment:Number.isInteger(p.segment)?p.segment:null,einheit:p.einheit?String(p.einheit):null,art:p.art,detail:String(p.detail||"").slice(0,300),quelle:"claude"}));
}
async function checkAndRepair(set,meta,ids,script,fmt,lang,{signal,onStatus}={}){
  let segments=script.segments, rounds=0, semantic=!!CAP.sample&&!set.example, problems=[], covered=0;
  for(;;){
    const loc=localCheck(meta,ids,segments); covered=loc.covered; problems=loc.problems;
    if(semantic){
      try{ problems=[...problems,...await claudeCheck(meta,ids,segments,fmt,lang,signal)]; }
      catch(e){ if(e&&e.code==="cancelled") throw e; semantic=false; }
    }
    if(!problems.length||rounds>=2||!CAP.sample||set.example) break;
    rounds++; onStatus&&onStatus(`Die Inhalte werden überprüft … ${problems.length} ${problems.length===1?"Stelle wird":"Stellen werden"} korrigiert (Runde ${rounds})`);
    try{ const r=await CAP.sample.json(repairPrompt(meta,ids,segments,fmt,lang,problems),{modelTier:"default",cache:false,signal}); segments=applyRepairs(segments,r&&r.korrekturen,fmt); }
    catch(e){ if(e&&e.code==="cancelled") throw e; break; }
  }
  const check={ok:!problems.length,semantic,rounds,problems,covered,total:ids.length,at:Date.now()};
  return {...script,segments,check};
}

/* ---------- Schritt 5: Sprachausgabe (Server) ---------- */
// Teile für die Sprachausgabe: lange Segmente an Satzgrenzen teilen, Pausen nach Art des Übergangs
function splitSpeech(text,max=900){
  const out=[]; let buf="";
  const sents=String(text).split(/(?<=[.!?…])\s+/);
  for(let s of sents){
    while(s.length>max){ const cut=Math.max(s.lastIndexOf(", ",max),s.lastIndexOf(" ",max)); const i=cut>max/3?cut+1:max; if(buf){out.push(buf);buf="";} out.push(s.slice(0,i).trim()); s=s.slice(i).trim(); }
    if(buf&&(buf+" "+s).length>max){ out.push(buf); buf=""; }
    buf+=(buf?" ":"")+s;
  }
  if(buf.trim()) out.push(buf.trim());
  return out;
}
const ttsRole=(fmt,seg)=>fmt==="podcast"?(seg.sprecher==="B"?"experte":"moderation"):"erzaehler";
function ttsPlan(segments,fmt){
  const pieces=[];
  segments.forEach((s,i)=>{
    const parts=splitSpeech(s.text), next=segments[i+1];
    parts.forEach((text,j)=>{
      let gap=200; // innerhalb eines Segments
      if(j===parts.length-1){ if(!next) gap=0; else if(next.teil!==s.teil) gap=750; else if(fmt==="podcast") gap=next.sprecher!==s.sprecher?300:250; else gap=450; }
      pieces.push({seg:i,text,role:ttsRole(fmt,s),gap});
    });
  });
  return pieces;
}
function ttsBatches(pieces,maxChars=4500,maxCount=12){
  const out=[]; let cur=[], n=0;
  for(const p of pieces){ if(cur.length&&(n+p.text.length>maxChars||cur.length>=maxCount)){ out.push(cur); cur=[]; n=0; } cur.push(p); n+=p.text.length; }
  if(cur.length) out.push(cur);
  return out;
}
const TTS_CONSENT_KEY="merkwerk.tts.einwilligung";
const TTS={checked:false,ok:false,reason:"",label:"",provider:"",rest:null,promise:null};
async function ttsFetch(body,signal){
  let res;
  for(let attempt=0;attempt<2;attempt++){
    const token=await aiToken(attempt>0);
    try{ res=await fetch(AI_CONFIG.url.replace(/\/+$/,"")+"/functions/v1/merkwerk-tts",{method:"POST",signal,
      headers:{apikey:AI_CONFIG.anonKey,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body)}); }
    catch(e){ throw aiErr(e&&e.name==="AbortError"?"cancelled":"network"); }
    if(res.status!==401) break;
  }
  let j={}; try{ j=await res.json(); }catch{}
  if(!res.ok) throw aiErr(j.code||(res.status===429?"rate_limited":"tts_failed"),j.message);
  return j;
}
// Ist die Sprachausgabe eingerichtet? (fragt den Server einmal pro Sitzung, ohne etwas zu verbrauchen)
function ttsStatus(force){
  if(TTS.promise&&!force) return TTS.promise;
  TTS.promise=(async()=>{
    if(!aiReady()) Object.assign(TTS,{ok:false,reason:"no_server"});
    else try{ const j=await ttsFetch({probe:true}); Object.assign(TTS,{ok:!!j.ok,reason:j.ok?"":"tts_not_configured",label:j.label||"",provider:j.provider||"",rest:j.rest??null}); }
    catch(e){ Object.assign(TTS,{ok:false,reason:e.code||"network"}); }
    TTS.checked=true; return TTS;
  })();
  return TTS.promise;
}
async function ttsConsent(){
  if(lsGet(TTS_CONSENT_KEY,false)) return;
  const ok=await new Promise(res=>modal(`<h3>Sprachausgabe nutzen</h3>
    <p>Für die Audiodatei schickt Merkwerk das geprüfte Sprechskript (nicht deine Dateien) an ${esc(TTS.label||"den Sprachdienst")}. Der Dienst wandelt den Text in Sprache um; die fertige Audiodatei wird nur auf diesem Gerät gespeichert. Pro Tag gibt es ein begrenztes Kontingent.</p>
    <div class="row"><button class="btn primary" id="ttsOk">Einverstanden</button><button class="btn" data-close>Abbrechen</button></div>`,
    (m,close)=>{ $("#ttsOk",m).onclick=()=>{close();res(true);}; m.querySelector("[data-close]").addEventListener("click",()=>res(false)); }));
  if(!ok) throw aiErr("cancelled");
  lsSet(TTS_CONSENT_KEY,true);
}
const b64bytes=b64=>{ const bin=atob(b64); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; };
async function synthesize(pieces,lang,{signal,onProgress}={}){
  const batches=ttsBatches(pieces), clips=new Array(pieces.length); let voices={}, provider="", done=0;
  // Höchstens zwei Anfragen gleichzeitig
  let next=0;
  const worker=async()=>{ while(next<batches.length){ const b=batches[next++]; const start=pieces.indexOf(b[0]);
    const j=await ttsFetch({lang,segments:b.map(p=>({text:p.text,role:p.role}))},signal);
    if(!Array.isArray(j.audio)||j.audio.length!==b.length) throw aiErr("tts_failed");
    j.audio.forEach((a,k)=>{ clips[start+k]={bytes:b64bytes(a.data),mime:a.mime||"audio/mpeg"}; });
    Object.assign(voices,j.voices||{}); provider=j.provider||provider; if(j.rest!=null) TTS.rest=j.rest;
    done+=b.length; onProgress&&onProgress(done,pieces.length); } };
  await Promise.all(Array.from({length:Math.min(2,batches.length)},worker));
  return {clips,voices,provider};
}

/* ---------- Audio zusammensetzen (im Browser) ---------- */
// Stille am Anfang und Ende entfernen (Schwelle etwa -42 dBFS), ein kurzer Rand bleibt, damit kein Wort abgeschnitten wird
function trimSilence(x,rate,thr=0.008,keepMs=60){
  let a=0, b=x.length-1; while(a<x.length&&Math.abs(x[a])<thr) a++; while(b>a&&Math.abs(x[b])<thr) b--;
  if(a>=x.length) return x.slice(0,0);
  const k=Math.round(rate*keepMs/1000); return x.slice(Math.max(0,a-k),Math.min(x.length,b+k+1));
}
// Gleiche Lautheit für alle Teile: RMS der hörbaren Stellen auf Zielwert, Spitzen höchstens 0,97
function normalizeGain(x,target=0.1){
  let s=0, n=0, peak=0; for(let i=0;i<x.length;i++){ const v=Math.abs(x[i]); if(v>peak) peak=v; if(v>0.01){ s+=v*v; n++; } }
  if(!n||!peak) return x;
  const g=Math.min(target/Math.sqrt(s/n),0.97/peak), y=new Float32Array(x.length);
  for(let i=0;i<x.length;i++) y[i]=x[i]*g; return y;
}
// Teile mit festen Pausen und kurzen Blenden (gegen Knacken) aneinanderhängen; liefert auch die Startzeit jedes Teils
function assemblePcm(clips,rate){
  const fade=Math.round(rate*0.008); let total=0;
  for(const c of clips) total+=c.pcm.length+Math.round(rate*(c.gap||0)/1000);
  const out=new Float32Array(total), starts=[]; let p=0;
  for(const c of clips){
    starts.push(p/rate); const x=c.pcm, f=Math.min(fade,Math.floor(x.length/2));
    for(let i=0;i<x.length;i++){ let v=x[i]; if(i<f) v*=i/f; else if(i>=x.length-f) v*=(x.length-1-i)/f; out[p+i]=v; }
    p+=x.length+Math.round(rate*(c.gap||0)/1000);
  }
  return {pcm:out,starts,duration:total/rate};
}
const toInt16=pcm=>{ const o=new Int16Array(pcm.length); for(let i=0;i<pcm.length;i++){ const v=clamp(pcm[i],-1,1); o[i]=v<0?v*0x8000:v*0x7fff; } return o; };
function encodeWav(pcm,rate){
  const d=toInt16(pcm), buf=new ArrayBuffer(44+d.length*2), v=new DataView(buf);
  const w=(o,s)=>{ for(let i=0;i<s.length;i++) v.setUint8(o+i,s.charCodeAt(i)); };
  w(0,"RIFF"); v.setUint32(4,36+d.length*2,true); w(8,"WAVE"); w(12,"fmt "); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,rate,true); v.setUint32(28,rate*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,"data"); v.setUint32(40,d.length*2,true);
  new Int16Array(buf,44).set(d); return new Uint8Array(buf);
}
async function encodeMp3(pcm,rate){
  await loadScript(LAME);
  const enc=new window.lamejs.Mp3Encoder(1,rate,64), d=toInt16(pcm), parts=[];
  for(let i=0;i<d.length;i+=1152){ const b=enc.encodeBuffer(d.subarray(i,i+1152)); if(b.length) parts.push(new Uint8Array(b)); if(i%(1152*400)===0) await new Promise(r=>setTimeout(r,0)); }
  const e=enc.flush(); if(e.length) parts.push(new Uint8Array(e));
  return new Blob(parts,{type:"audio/mpeg"});
}
async function decodeClip(bytes,rate){
  const C=window.OfflineAudioContext||window.webkitOfflineAudioContext; if(!C) throw aiErr("decode_failed");
  const ctx=new C(1,1,rate);
  let buf; try{ buf=await ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)); }catch{ throw aiErr("decode_failed"); }
  if(buf.numberOfChannels===1) return buf.getChannelData(0).slice();
  const out=new Float32Array(buf.length); for(let c=0;c<buf.numberOfChannels;c++){ const x=buf.getChannelData(c); for(let i=0;i<x.length;i++) out[i]+=x[i]/buf.numberOfChannels; } return out;
}
async function buildAudioFile(pieces,clips){
  const prepared=[];
  for(let i=0;i<pieces.length;i++){ const pcm=normalizeGain(trimSilence(await decodeClip(clips[i].bytes,AUD_RATE_HZ),AUD_RATE_HZ)); prepared.push({pcm,gap:pieces[i].gap}); }
  const {pcm,starts,duration}=assemblePcm(prepared,AUD_RATE_HZ);
  let blob; try{ blob=await encodeMp3(pcm,AUD_RATE_HZ); }catch{ blob=new Blob([encodeWav(pcm,AUD_RATE_HZ)],{type:"audio/wav"}); }
  // Startzeit je Skript-Segment (für das mitlaufende Transkript)
  const segStarts=[]; pieces.forEach((p,i)=>{ if(segStarts[p.seg]==null) segStarts[p.seg]=Math.round(starts[i]*100)/100; });
  return {blob,duration,segStarts};
}

/* ---------- Speicher ---------- */
async function audMeta(setId){ return await idb.aGet("m|"+setId); }
async function audSaveMeta(meta){ meta.updatedAt=Date.now(); await idb.aPut(meta); }
async function audDeleteSet(setId){ await idb.aDelPrefix("m|"+setId); await idb.aDelPrefix("a|"+setId+"|"); }
async function audBlob(setId,len,fmt,lang){ const r=await idb.aGet(audBlobKey(setId,len,fmt,lang)); return r&&r.blob||null; }

/* ---------- Generierungsaufträge (laufen im Hintergrund weiter, auch wenn die Ansicht wechselt) ---------- */
const AUD_JOBS={};
const audJobKey=(setId,len,fmt,lang)=>`${setId}|${len}|${fmt}|${lang}`;
function audJob(setId,len,fmt,lang){ return AUD_JOBS[audJobKey(setId,len,fmt,lang)]||null; }
// Gleicher Auftrag läuft schon → denselben zurückgeben (kein doppeltes Erzeugen durch mehrfaches Klicken)
function audStart(set,o){
  const k=audJobKey(set.id,o.len,o.fmt,o.lang);
  if(AUD_JOBS[k]&&AUD_JOBS[k].running) return AUD_JOBS[k];
  const job=AUD_JOBS[k]={key:k,setId:set.id,...o,running:true,step:0,done:[],detail:"",error:null,result:null,ctl:new AbortController(),onChange:null};
  const emit=()=>{ try{ job.onChange&&job.onChange(job); }catch{} };
  const step=(i,detail="")=>{ for(let x=0;x<i;x++) if(!job.done.includes(x)) job.done.push(x); job.step=i; job.detail=detail; emit(); };
  job.promise=audPipeline(set,o,{signal:job.ctl.signal,step}).then(r=>{ job.result=r; if(!r.noAudio) step(5); },e=>{ job.error=e; })
    .finally(()=>{ job.running=false; emit(); });
  return job;
}
async function audPipeline(set,{len,fmt,lang,force},{signal,step}){
  const hash=materialHash(set);
  let meta=await audMeta(set.id);
  if(!meta||meta.hash!==hash||force==="all"){
    step(0); const u=await buildUnits(set,{signal});
    await idb.aDelPrefix("a|"+set.id+"|"); // alte Audiodateien gehören zum alten Materialstand
    meta={key:"m|"+set.id,setId:set.id,account:(currentAccount()||{}).id||null,hash,titel:u.titel,themen:u.themen,units:u.units,hinweise:u.hinweise,dropped:u.dropped,createdAt:Date.now(),variants:{}};
    await audSaveMeta(meta);
  }
  step(1);
  const v=meta.variants[len]||(meta.variants[len]={unitIds:selectBasis(meta.units,len),scripts:{},audio:{},createdAt:Date.now()});
  if(!v.unitIds.length) throw aiErr("no_units");
  await audSaveMeta(meta);
  const vk=audVariantKey(fmt,lang);
  if(!v.scripts[vk]||force==="script"){
    step(2); const sc=await writeScript(set,meta,v.unitIds,fmt,lang,{signal});
    step(3); const checked=await checkAndRepair(set,meta,v.unitIds,sc,fmt,lang,{signal,onStatus:t=>step(3,t)});
    v.scripts[vk]={...checked,fmt,lang,createdAt:Date.now()}; delete v.audio[vk];
    await idb.aDelPrefix(audBlobKey(set.id,len,fmt,lang)); await audSaveMeta(meta);
  }
  if(v.audio[vk]) return {meta};
  const st=await ttsStatus(true);
  if(!st.ok) return {meta,noAudio:st.reason};
  await ttsConsent();
  step(4); const sc=v.scripts[vk], pieces=ttsPlan(sc.segments,fmt);
  const syn=await synthesize(pieces,lang,{signal,onProgress:(d,n)=>step(4,`Deine Audiodatei wird generiert … (Teil ${d} von ${n})`)});
  step(4,"Die Audioteile werden zusammengesetzt …");
  const file=await buildAudioFile(pieces,syn.clips);
  await idb.aPut({key:audBlobKey(set.id,len,fmt,lang),setId:set.id,blob:file.blob,createdAt:Date.now()});
  v.audio[vk]={status:"fertig",hash,provider:syn.provider,voices:syn.voices,duration:file.duration,segStarts:file.segStarts,mime:file.blob.type,size:file.blob.size,storage:"Dieses Gerät (IndexedDB)",createdAt:Date.now()};
  await audSaveMeta(meta);
  return {meta};
}

/* ---------- Ansicht ---------- */
const AUD_UI={}; // je Lernset: {fmt,len,lang}
function audPrefs(set){
  const p=AUD_UI[set.id]||(AUD_UI[set.id]={fmt:(S.audio||{}).fmt||"monolog",len:(S.audio||{}).len||"standard",lang:(S.audio||{}).lang||"de"});
  if(set.example){ p.len="standard"; p.lang="de"; }
  return p;
}
function openAudio(set){
  if(!set.files.length){ toast("Lade zuerst Material hoch"); return; }
  S.activeSet=set.id; save(); go("learn",{setId:set.id,audio:true});
}
let audEl=null; // aktuelles <audio>, damit ein Neuzeichnen die laufende Wiedergabe nicht abbricht
function audPlaying(){ return audEl&&!audEl.paused&&document.body.contains(audEl); }
// Vor jedem Neuzeichnen: Wiedergabe und Vorlesen beenden, Blob-Adresse freigeben
let audTeardown=[];
function audStop(){ audTeardown.forEach(f=>{ try{f();}catch{} }); audTeardown=[]; }

async function renderAudio(m,set){
  const P=audPrefs(set);
  const meta=await audMeta(set.id);
  if(ROUTE.v!=="learn"||!ROUTE.arg||!ROUTE.arg.audio) return; // inzwischen weggeklickt
  audStop(); if(!cleanup.includes(audStop)) cleanup.push(audStop);
  const stale=meta&&meta.hash!==materialHash(set);
  const v=meta&&meta.variants[P.len];
  const vk=audVariantKey(P.fmt,P.lang);
  const sc=v&&v.scripts[vk], au=v&&v.audio[vk];
  const other=P.fmt==="monolog"?"podcast":"monolog";
  const scOther=v&&v.scripts[audVariantKey(other,P.lang)];
  const job=audJob(set.id,P.len,P.fmt,P.lang);
  const canAI=!!CAP.sample||set.example;
  if(!TTS.checked) ttsStatus().then(()=>{ if(ROUTE.arg&&ROUTE.arg.audio&&!audPlaying()) renderAudio(m,set); });
  m.innerHTML=`<div class="view">
   <div class="row"><button class="btn ghost sm" id="backSets">← ${esc(set.name)}</button><span class="spacer"></span>${set.example?'<span class="pill mark">Beispiel</span>':""}</div>
   <div class="stack" style="gap:4px"><h1>Audio &amp; Podcast</h1><p class="muted">Dein Lernstoff zum Anhören – nur mit Inhalten aus deinem Material. Zusammenfassung und Podcast beruhen auf derselben geprüften Inhaltsgrundlage.</p></div>
   <section class="sheet stack" style="gap:16px">
     <div class="aud-seg" role="radiogroup" aria-label="Audioformat">${Object.entries(AUD_FORMATS).map(([k,f])=>`<button type="button" role="radio" class="aud-opt" data-fmt="${k}" aria-checked="${k===P.fmt}"><b>${esc(f.short)}</b><span class="small">${esc(f.d)}</span></button>`).join("")}</div>
     <div class="stack" style="gap:6px"><span class="label" id="lenLbl">Ausführlichkeit</span>
       <div class="row" role="radiogroup" aria-labelledby="lenLbl">${Object.entries(AUD_LENGTHS).map(([k,l])=>`<button type="button" class="chip" role="radio" data-len="${k}" aria-checked="${k===P.len}" aria-pressed="${k===P.len}" ${set.example&&k!=="standard"?"disabled":""}>${esc(l.n)}</button>`).join("")}</div>
       <p class="small muted">${esc(AUD_LENGTHS[P.len].d)}. Die Dauer richtet sich nach der Menge deines Materials; es wird nichts abgeschnitten, um eine Zeit einzuhalten.${set.example?" Beim Beispiel gibt es nur „Standard“.":""}</p>
     </div>
     ${set.example?"":`<details class="small"><summary>Sprache: ${esc(AUD_LANGS[P.lang])}</summary><div class="row" style="margin-top:8px">${Object.entries(AUD_LANGS).map(([k,n])=>`<button type="button" class="chip" data-lang="${k}" aria-pressed="${k===P.lang}">${esc(n)}</button>`).join("")}</div><p class="small muted" style="margin-top:6px">Bei einer anderen Sprache als dem Material werden die Inhalte sinngemäß übertragen und genauso geprüft.</p></details>`}
     ${stale?`<div class="note warn">Dein Material wurde geändert, seit diese Fassung erstellt wurde. Sie ist möglicherweise nicht mehr aktuell. <button class="btn sm" id="audRefresh">Aktualisierte Fassung erstellen</button></div>`:""}
     <div id="audStatus" aria-live="polite"></div>
     <div id="audMain"></div>
   </section>
   ${meta&&meta.hinweise&&meta.hinweise.length?`<section class="sheet stack"><h3>Hinweise zum Material</h3><p class="small muted">Diese Stellen waren unleserlich, widersprüchlich oder unvollständig. Merkwerk hat dort nichts ergänzt.</p><ul class="small">${meta.hinweise.map(h=>`<li><b>${esc({unleserlich:"Unleserlich",widerspruch:"Widerspruch",unvollstaendig:"Unvollständig"}[h.art]||h.art)}</b>${h.quelle?` (${esc(h.quelle)})`:""}: ${esc(h.text)}</li>`).join("")}</ul></section>`:""}
  </div>`;
  $("#backSets").onclick=()=>go("learn",{manage:true});
  const rer=()=>{ S.audio={...P}; save(false); renderAudio(m,set); };
  $$("[data-fmt]",m).forEach(b=>b.onclick=()=>{ if(P.fmt===b.dataset.fmt) return; P.fmt=b.dataset.fmt; rer(); });
  // Pfeiltasten im Formatumschalter wie bei Radiobuttons
  $(".aud-seg",m).onkeydown=e=>{ if(["ArrowLeft","ArrowRight"].includes(e.key)){ e.preventDefault(); P.fmt=P.fmt==="monolog"?"podcast":"monolog"; rer(); setTimeout(()=>{ const b=$(`[data-fmt="${P.fmt}"]`); b&&b.focus(); },0); } };
  $$("[data-len]",m).forEach(b=>b.onclick=()=>{ P.len=b.dataset.len; rer(); });
  $$("[data-lang]",m).forEach(b=>b.onclick=()=>{ P.lang=b.dataset.lang; rer(); });
  const start=force=>{ const j=audStart(set,{len:P.len,fmt:P.fmt,lang:P.lang,force}); watchJob(m,set,j); };
  const rf=$("#audRefresh"); if(rf) rf.onclick=()=>start("all");

  const main=$("#audMain");
  if(job&&job.running){ watchJob(m,set,job); main.innerHTML=""; return; }
  if(job&&job.error&&!(job.error.code==="cancelled")){ $("#audStatus").innerHTML=`<div class="note bad">${esc(audErr(job.error))}</div>`; }
  if(!sc){
    main.innerHTML=`${canAI?"":needClaude()}
      ${scOther?`<p class="small">Die ${esc(AUD_FORMATS[other].short)} gibt es schon. Der ${P.fmt==="podcast"?"Podcast":"Monolog"} entsteht aus derselben Inhaltsgrundlage, die Inhalte werden nicht neu ausgewählt.</p>`:""}
      <div><button class="btn primary" id="audGo" ${canAI?"":"disabled"}>${P.fmt==="podcast"?"Podcast generieren":"Audio generieren"}</button></div>
      ${audSetupNote()}`;
    const g=$("#audGo"); if(g) g.onclick=()=>start(); return;
  }
  // Skript vorhanden: Player oder Hinweis + Ersatzwiedergabe, darunter Transkript
  const titleTxt=sc.titel||meta.titel||set.name;
  main.innerHTML=`<div class="stack" style="gap:12px">
     <div class="stack" style="gap:2px"><h2>${esc(titleTxt)}</h2>
       <p class="small muted">${esc(set.name)} · ${esc(AUD_FORMATS[P.fmt].n)} · ${esc(AUD_LENGTHS[P.len].n)} · ${esc(AUD_LANGS[P.lang])}${au&&au.voices&&Object.keys(au.voices).length?` · Stimme${Object.keys(au.voices).length>1?"n":""}: ${esc(Object.values(au.voices).map(v=>String(v).split("-").pop()).join(", "))}`:""}</p></div>
     ${checkBadge(sc.check,v,P)}
     <div id="audPlayer"></div>
     <div class="row"><button class="btn sm" id="audRegen">Neu generieren</button>${au?`<button class="btn ghost sm danger" id="audDel">Audio löschen</button>`:""}</div>
     <details id="audTx"><summary>Transkript anzeigen</summary><div class="stack" style="margin-top:10px;gap:8px"><div><button class="btn sm" id="txCopy">Transkript kopieren</button></div><ol class="aud-tx" id="txList">${sc.segments.map((s,i)=>`<li data-i="${i}"${au&&au.segStarts&&au.segStarts[i]!=null?` data-t="${au.segStarts[i]}" tabindex="0" role="button" aria-label="Ab hier abspielen"`:""}>${P.fmt==="podcast"?`<b>${esc(AUD_SPEAKER[s.sprecher])}:</b> `:""}${esc(s.text)}</li>`).join("")}</ol></div></details>
   </div>`;
  $("#txCopy").onclick=()=>copyText(transcriptText(sc,P.fmt,titleTxt));
  $("#audRegen").onclick=async()=>{ if(await confirmBox("Skript und Audio neu erstellen? Die Inhaltsgrundlage bleibt gleich.","Neu generieren")) start("script"); };
  const dl=$("#audDel"); if(dl) dl.onclick=async()=>{ if(!await confirmBox("Diese Audiodatei vom Gerät löschen? Das geprüfte Skript bleibt erhalten.")) return; await idb.aDelPrefix(audBlobKey(set.id,P.len,P.fmt,P.lang)); delete v.audio[vk]; await audSaveMeta(meta); renderAudio(m,set); };
  const box=$("#audPlayer");
  const blob=au&&await audBlob(set.id,P.len,P.fmt,P.lang);
  if(blob) mountPlayer(box,{blob,set,fmt:P.fmt,title:titleTxt,au,segments:sc.segments});
  else{
    box.innerHTML=`${au?`<div class="note warn">Die Audiodatei ist auf diesem Gerät nicht mehr vorhanden.</div>`:""}
      ${TTS.ok?`<div><button class="btn primary" id="audMake">Audiodatei erzeugen</button></div>`:audSetupNote(true)}
      <div id="devBox"></div>`;
    const mk=$("#audMake"); if(mk) mk.onclick=()=>start();
    if(!TTS.ok) mountDeviceReader($("#devBox"),sc,P.fmt,P.lang);
  }
}
function audSetupNote(scriptReady){
  if(!TTS.checked||TTS.ok) return "";
  const r=TTS.reason;
  const why=r==="no_server"?"Für echte Audiodateien braucht Merkwerk die Sprachausgabe auf dem Merkwerk-Server, und die ist hier noch nicht eingerichtet."
    :r==="tts_not_configured"?"Auf dem Merkwerk-Server ist noch kein Sprachdienst hinterlegt."
    :"Der Merkwerk-Server ist gerade nicht erreichbar.";
  return `<div class="note warn small">${why} ${scriptReady?"Das geprüfte Skript kannst du lesen oder dir als Ersatz mit der Stimme deines Geräts vorlesen lassen.":"Skript und Prüfung funktionieren trotzdem; als Ersatz liest die Stimme deines Geräts vor."} <span class="muted">(Einrichtung: docs/audio-podcast.md)</span></div>`;
}
function checkBadge(c,v,P){
  if(!c) return "";
  const other=v&&v.scripts[audVariantKey(P.fmt==="monolog"?"podcast":"monolog",P.lang)];
  const same=other&&other.check&&other.check.ok&&c.ok;
  if(c.ok) return `<div class="note small"><b>Geprüft:</b> alle ${c.total} Inhalte der Grundlage enthalten, nichts hinzugefügt${c.semantic?" (automatisch gegen dein Material geprüft"+(c.rounds?`, ${c.rounds} Korrekturrunde${c.rounds>1?"n":""}`:"")+")":" (lokale Prüfung; die inhaltliche Prüfung durch Claude war nicht möglich)"}.${same?" Zusammenfassung und Podcast vermitteln dieselben Inhalte.":""}</div>`;
  return `<details class="note warn small"><summary>Nicht vollständig geprüft: ${c.problems.length} offene ${c.problems.length===1?"Stelle":"Stellen"} – bitte mit dem Material vergleichen</summary><ul>${c.problems.map(p=>`<li>${esc({fehlend:"Fehlt",erfunden:"Nicht belegt",verfaelscht:"Abweichend"}[p.art]||p.art)}${p.segment!=null?` (Abschnitt ${p.segment+1})`:""}${p.einheit?` (${esc(p.einheit)})`:""}: ${esc(p.detail)}</li>`).join("")}</ul></details>`;
}
function transcriptText(sc,fmt,title){ return title+"\n\n"+sc.segments.map(s=>(fmt==="podcast"?AUD_SPEAKER[s.sprecher]+": ":"")+s.text).join("\n\n"); }
function watchJob(m,set,job){
  const draw=()=>{
    const el=$("#audStatus"); if(!el||!ROUTE.arg||!ROUTE.arg.audio||S.activeSet!==set.id) return;
    if(job.running){
      el.innerHTML=`<div class="aud-steps"><ol>${AUD_STEPS.slice(0,5).map((t,i)=>`<li class="${job.done.includes(i)&&i!==job.step?"ok":i===job.step?"on":""}">${i===job.step?'<span class="spin" aria-hidden="true"></span>':job.done.includes(i)?"✓":"○"} ${esc(i===job.step&&job.detail?job.detail:t)}</li>`).join("")}</ol>
        <div class="row"><span class="small muted">Du kannst Merkwerk währenddessen weiter benutzen.</span><span class="spacer"></span><button class="btn sm" id="audStop">Abbrechen</button></div></div>`;
      $("#audStop").onclick=()=>job.ctl.abort();
    } else if(!audPlaying()) renderAudio(m,set).then(()=>{ if(!job.error&&!(job.result&&job.result.noAudio)){ const s=$("#audStatus"); if(s) s.innerHTML=`<div class="note">${esc(AUD_STEPS[5])}</div>`; } });
    else el.innerHTML=`<div class="note small">${esc(job.error?audErr(job.error):AUD_STEPS[5])}</div>`;
  };
  job.onChange=draw; cleanup.push(()=>{ if(job.onChange===draw) job.onChange=null; }); draw();
}

/* ---------- Player ---------- */
function mountPlayer(box,{blob,set,fmt,title,au,segments}){
  const url=URL.createObjectURL(blob); audTeardown.push(()=>{ try{ audEl&&audEl.pause(); }catch{} URL.revokeObjectURL(url); audEl=null; });
  const ext=blob.type==="audio/wav"?"wav":"mp3";
  const fname=`Merkwerk – ${set.name} – ${AUD_FORMATS[fmt].short}.${ext}`.replace(/[\\/:*?"<>|]+/g,"-");
  const rate=S.audioRate||1;
  box.innerHTML=`<div class="aud-player">
    <audio id="aud" preload="metadata" src="${url}"></audio>
    <input type="range" id="audSeek" class="aud-seek" min="0" max="${Math.max(1,Math.round(au.duration||1))}" step="1" value="0" aria-label="Position im Audio">
    <div class="row mono small"><span id="audCur">0:00</span><span class="spacer"></span><span id="audDur">${fmtTime(au.duration)}</span></div>
    <div class="aud-ctrl">
      <button class="btn" id="audBack" aria-label="10 Sekunden zurück">⟲ 10</button>
      <button class="btn primary aud-play" id="audPlay" aria-label="Abspielen">▶</button>
      <button class="btn" id="audFwd" aria-label="10 Sekunden vor">10 ⟳</button>
    </div>
    <div class="row aud-sub">
      <div class="row" role="group" aria-label="Wiedergabegeschwindigkeit" style="gap:6px">${AUD_RATES.map(r=>`<button type="button" class="chip" data-rate="${r}" aria-pressed="${r===rate}">${String(r).replace(".",",")}×</button>`).join("")}</div>
      <span class="spacer"></span>
      <label class="row small" style="gap:6px;flex-wrap:nowrap">Lautstärke<input type="range" id="audVol" min="0" max="1" step="0.05" value="${S.audioVol??1}" style="width:110px"></label>
    </div>
    <div class="row"><a class="btn sm" id="audDl" href="${url}" download="${esc(fname)}">Herunterladen (${ext.toUpperCase()}, ${(blob.size/1048576).toFixed(1).replace(".",",")} MB)</a><span class="small muted">Gespeichert auf diesem Gerät${au.provider?` · Stimmen von ${esc(au.provider==="google"?"Google Cloud Text-to-Speech":au.provider==="openai"?"OpenAI":au.provider)}`:""}</span></div>
  </div>`;
  const a=$("#aud",box); audEl=a; a.playbackRate=rate; a.volume=S.audioVol??1;
  const seek=$("#audSeek",box), cur=$("#audCur",box), dur=$("#audDur",box), play=$("#audPlay",box);
  let dragging=false;
  const lis=$$("#txList li");
  let lastSeg=-1;
  const sync=()=>{
    if(!dragging){ seek.value=Math.floor(a.currentTime); } cur.textContent=fmtTime(a.currentTime);
    if(au.segStarts){ let k=-1; au.segStarts.forEach((t,i)=>{ if(t!=null&&a.currentTime+0.05>=t) k=i; });
      if(k!==lastSeg){ lis.forEach(li=>li.classList.toggle("on",Number(li.dataset.i)===k)); lastSeg=k; } }
  };
  a.onloadedmetadata=()=>{ if(isFinite(a.duration)){ seek.max=Math.max(1,Math.floor(a.duration)); dur.textContent=fmtTime(a.duration); } a.playbackRate=S.audioRate||1; };
  a.ontimeupdate=sync;
  a.onplay=()=>{ play.textContent="❚❚"; play.setAttribute("aria-label","Pausieren"); };
  a.onpause=a.onended=()=>{ play.textContent="▶"; play.setAttribute("aria-label","Abspielen"); };
  play.onclick=()=>{ if(a.paused) a.play().catch(()=>toast("Wiedergabe nicht möglich")); else a.pause(); };
  const jump=d=>{ a.currentTime=clamp(a.currentTime+d,0,isFinite(a.duration)?a.duration:au.duration||0); sync(); };
  $("#audBack",box).onclick=()=>jump(-10); $("#audFwd",box).onclick=()=>jump(10);
  seek.oninput=()=>{ dragging=true; cur.textContent=fmtTime(seek.value); };
  seek.onchange=()=>{ a.currentTime=Number(seek.value); dragging=false; sync(); };
  $$("[data-rate]",box).forEach(b=>b.onclick=()=>{ S.audioRate=Number(b.dataset.rate); a.playbackRate=S.audioRate; save(false); $$("[data-rate]",box).forEach(x=>x.setAttribute("aria-pressed",String(x===b))); });
  $("#audVol",box).oninput=e=>{ a.volume=Number(e.target.value); S.audioVol=a.volume; save(false); };
  lis.forEach(li=>{ if(li.dataset.t==null) return; const go=()=>{ a.currentTime=Number(li.dataset.t); a.play().catch(()=>{}); };
    li.onclick=go; li.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } }; });
  // Steuerung auf dem Sperrbildschirm und mit Medientasten
  if(navigator.mediaSession){ try{
    navigator.mediaSession.metadata=new MediaMetadata({title,artist:"Merkwerk · "+AUD_FORMATS[fmt].short,album:set.name});
    navigator.mediaSession.setActionHandler("play",()=>a.play()); navigator.mediaSession.setActionHandler("pause",()=>a.pause());
    navigator.mediaSession.setActionHandler("seekbackward",()=>jump(-10)); navigator.mediaSession.setActionHandler("seekforward",()=>jump(10));
  }catch{} }
}

/* ---------- Ersatz ohne Audiodatei: Gerätestimme liest das geprüfte Skript ---------- */
function mountDeviceReader(box,sc,fmt,lang){
  if(!box) return;
  const synth=window.speechSynthesis;
  if(!synth||!window.SpeechSynthesisUtterance){ box.innerHTML=""; return; }
  const loc={de:"de",en:"en",fr:"fr",es:"es",it:"it"}[lang];
  box.innerHTML=`<div class="aud-player stack" style="gap:10px">
    <div class="row"><b>Ersatz: Gerätestimme</b><span class="pill warn">keine Audiodatei</span></div>
    <p class="small muted">Liest das geprüfte Skript mit der Stimme deines Geräts vor. Klingt weniger natürlich und lässt sich nicht herunterladen.</p>
    <div class="aud-ctrl"><button class="btn" id="dvPrev" aria-label="Vorheriger Abschnitt">⏮</button><button class="btn primary aud-play" id="dvPlay" aria-label="Vorlesen">▶</button><button class="btn" id="dvNext" aria-label="Nächster Abschnitt">⏭</button></div>
    <p class="small mono" id="dvPos" style="text-align:center">Abschnitt 1 von ${sc.segments.length}</p>
  </div>`;
  let i=0, on=false;
  const voices=()=>synth.getVoices().filter(v=>(v.lang||"").toLowerCase().startsWith(loc));
  const lis=$$("#txList li");
  const mark=()=>{ $("#dvPos",box).textContent=`Abschnitt ${i+1} von ${sc.segments.length}`; lis.forEach(li=>li.classList.toggle("on",on&&Number(li.dataset.i)===i)); };
  const speak=()=>{
    synth.cancel(); if(!on) return mark();
    const s=sc.segments[i]; const u=new SpeechSynthesisUtterance(s.text); const vs=voices();
    u.lang=vs[0]?vs[0].lang:loc; u.rate=S.audioRate||1;
    if(fmt==="podcast"){ const v=vs[s.sprecher==="B"?Math.min(1,vs.length-1):0]; if(v) u.voice=v; if(vs.length<2) u.pitch=s.sprecher==="B"?0.8:1.2; } else if(vs[0]) u.voice=vs[0];
    u.onend=()=>{ if(!on) return; if(i<sc.segments.length-1){ i++; speak(); } else { on=false; upd(); } };
    synth.speak(u); mark();
  };
  const upd=()=>{ const p=$("#dvPlay",box); p.textContent=on?"❚❚":"▶"; p.setAttribute("aria-label",on?"Anhalten":"Vorlesen"); mark(); };
  $("#dvPlay",box).onclick=()=>{ on=!on; upd(); if(on) speak(); else synth.cancel(); };
  $("#dvPrev",box).onclick=()=>{ i=Math.max(0,i-1); speak(); };
  $("#dvNext",box).onclick=()=>{ i=Math.min(sc.segments.length-1,i+1); speak(); };
  audTeardown.push(()=>{ on=false; try{synth.cancel();}catch{} });
}
