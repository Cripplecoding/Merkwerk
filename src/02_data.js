/* ===================== Kataloge: Bundesländer, Schularten, Fächer, Themen, Studiengänge ===================== */
const STATES = [
  {k:"BW",n:"Baden-Württemberg",url:"https://www.bildungsplaene-bw.de/",src:"Bildungsplan 2016 (KM / ZSL Baden-Württemberg)",deep:true},
  {k:"BY",n:"Bayern",url:"https://www.lehrplanplus.bayern.de/",src:"LehrplanPLUS (ISB Bayern)",deep:true},
  {k:"BE",n:"Berlin",url:"https://bildungsserver.berlin-brandenburg.de/rlp-online/",src:"Rahmenlehrplan Berlin-Brandenburg"},
  {k:"BB",n:"Brandenburg",url:"https://bildungsserver.berlin-brandenburg.de/rlp-online/",src:"Rahmenlehrplan Berlin-Brandenburg"},
  {k:"HB",n:"Bremen",url:"https://www.lis.bremen.de/schulqualitaet/curriculumentwicklung/bildungsplaene-15219",src:"Bildungspläne Bremen (LIS)"},
  {k:"HH",n:"Hamburg",url:"https://www.hamburg.de/bsfb/bildungsplaene",src:"Bildungspläne Hamburg"},
  {k:"HE",n:"Hessen",url:"https://kultus.hessen.de/unterricht/kerncurricula-und-lehrplaene/kerncurricula",src:"Kerncurricula Hessen (Kultusministerium)",deep:true},
  {k:"MV",n:"Mecklenburg-Vorpommern",url:"https://www.bildung-mv.de/",src:"Rahmenpläne MV (Bildungsserver)"},
  {k:"NI",n:"Niedersachsen",url:"https://cuvo.nibis.de/",src:"Kerncurricula Niedersachsen (NiBiS)"},
  {k:"NW",n:"Nordrhein-Westfalen",url:"https://lehrplannavigator.nrw.de/",src:"Kernlehrpläne NRW (QUA-LiS, Lehrplannavigator)",deep:true},
  {k:"RP",n:"Rheinland-Pfalz",url:"https://lehrplaene.bildung-rp.de/",src:"Lehrpläne Rheinland-Pfalz"},
  {k:"SL",n:"Saarland",url:"https://www.saarland.de/mbk/DE/portale/bildungsserver/home/home_node.html",src:"Lehrpläne Saarland (Bildungsserver)"},
  {k:"SN",n:"Sachsen",url:"https://www.schulportal.sachsen.de/lplandb/",src:"Lehrplandatenbank Sachsen"},
  {k:"ST",n:"Sachsen-Anhalt",url:"https://lisa.sachsen-anhalt.de/unterricht/lehrplaene-rahmenrichtlinien",src:"Lehrpläne Sachsen-Anhalt (LISA)"},
  {k:"SH",n:"Schleswig-Holstein",url:"https://fachportal.lernnetz.de/",src:"Fachanforderungen Schleswig-Holstein"},
  {k:"TH",n:"Thüringen",url:"https://www.schulportal-thueringen.de/lehrplaene",src:"Lehrpläne Thüringen (Schulportal)"},
];
const stateByK = k => STATES.find(s=>s.k===k);

/* Offizielle Einstiegsseiten je Land + Schulart (wo bekannt) */
const PLAN_LINKS = {
  BW:{grund:"https://www.bildungsplaene-bw.de/,Lde/LS/BP2016BW/ALLG/GS",haupt:"https://www.bildungsplaene-bw.de/,Lde/LS/BP2016BW/ALLG/SEK1",real:"https://www.bildungsplaene-bw.de/,Lde/LS/BP2016BW/ALLG/SEK1",gms:"https://www.bildungsplaene-bw.de/,Lde/LS/BP2016BW/ALLG/SEK1",gym:"https://www.bildungsplaene-bw.de/,Lde/LS/BP2016BW/ALLG/GYM",bg:"https://www.ls-bw.de/,Lde/Startseite/schulartuebergreifend/bildungsplaene-berufliche-schulen"},
  BY:{grund:"https://www.lehrplanplus.bayern.de/schulart/grundschule",haupt:"https://www.lehrplanplus.bayern.de/schulart/mittelschule",real:"https://www.lehrplanplus.bayern.de/schulart/realschule",gym:"https://www.lehrplanplus.bayern.de/schulart/gymnasium",fos:"https://www.lehrplanplus.bayern.de/schulart/fachoberschule",bs:"https://www.lehrplanplus.bayern.de/schulart/berufsschule"},
  NW:{grund:"https://lehrplannavigator.nrw.de/grundschule",haupt:"https://lehrplannavigator.nrw.de/sekundarstufe-i",real:"https://lehrplannavigator.nrw.de/sekundarstufe-i",gms:"https://lehrplannavigator.nrw.de/sekundarstufe-i",gym:"https://lehrplannavigator.nrw.de/sekundarstufe-i",os:"https://lehrplannavigator.nrw.de/sekundarstufe-ii",bs:"https://www.berufsbildung.nrw.de/"},
  HE:{grund:"https://kultusministerium.hessen.de/Unterricht/Kerncurricula-Primarstufe",haupt:"https://kultusministerium.hessen.de/Unterricht/Sekundarstufe-I-Kerncurricula",real:"https://kultusministerium.hessen.de/Unterricht/Sekundarstufe-I-Kerncurricula",gms:"https://kultusministerium.hessen.de/Unterricht/Sekundarstufe-I-Kerncurricula",gym:"https://kultusministerium.hessen.de/Unterricht/Sekundarstufe-I-Kerncurricula",os:"https://kultus.hessen.de/unterricht/kerncurricula-und-lehrplaene/kerncurricula/gymnasiale-oberstufe-ab-schuljahr-20242025-kerncurricula",bg:"https://kultus.hessen.de/unterricht/kerncurricula-und-lehrplaene/kerncurricula/berufliches-gymnasium-ab-schuljahr-202425-kerncurricula",fos:"https://kultusministerium.hessen.de/unterricht/kerncurricula-und-lehrplaene/kerncurricula/fachoberschule"},
};

/* Schularten; Bezeichnungen je Land */
const SCHOOL_TYPES = [
  {k:"grund",n:"Grundschule",grades:[1,2,3,4]},
  {k:"haupt",n:"Hauptschule",grades:[5,6,7,8,9,10]},
  {k:"real",n:"Realschule",grades:[5,6,7,8,9,10]},
  {k:"gms",n:"Gesamt- / Gemeinschaftsschule",grades:[5,6,7,8,9,10,11,12,13]},
  {k:"gym",n:"Gymnasium",grades:[5,6,7,8,9,10,11,12,13]},
  {k:"bg",n:"Berufliches Gymnasium",grades:[11,12,13]},
  {k:"fos",n:"Fachoberschule / Berufsoberschule",grades:[11,12,13]},
  {k:"bs",n:"Berufsschule (Ausbildung)",grades:[1,2,3,4],gradeLabel:"Ausbildungsjahr"},
];
function schoolTypeName(k,state){
  const L={
    haupt:{BW:"Werkrealschule / Hauptschule",BY:"Mittelschule",NW:"Hauptschule",HE:"Hauptschule",SN:"Oberschule",TH:"Regelschule",BE:"Integrierte Sekundarschule",HH:"Stadtteilschule"},
    real:{SN:"Oberschule",TH:"Regelschule",BE:"Integrierte Sekundarschule",HH:"Stadtteilschule",RP:"Realschule plus",SL:"Gemeinschaftsschule"},
    gms:{BW:"Gemeinschaftsschule",NW:"Gesamtschule / Sekundarschule",HE:"Integrierte Gesamtschule",BY:"Gesamtschule (Schulversuch)",NI:"Integrierte Gesamtschule",SH:"Gemeinschaftsschule",HH:"Stadtteilschule",BE:"Integrierte Sekundarschule"},
    fos:{BY:"FOS / BOS",BW:"Berufskolleg / Berufsoberschule",NW:"Berufskolleg (Fachoberschule)"},
    bg:{BY:"Berufliches Gymnasium (nicht in Bayern – siehe FOS/BOS)",NW:"Berufliches Gymnasium (Berufskolleg)"},
  };
  return (L[k]&&L[k][state]) || (SCHOOL_TYPES.find(t=>t.k===k)||{}).n || k;
}
function gradesFor(type,state){
  const t=SCHOOL_TYPES.find(x=>x.k===type); if(!t) return [];
  if(type==="grund" && (state==="BE"||state==="BB")) return [1,2,3,4,5,6];
  if(type==="gym" && (state==="SN"||state==="TH"||state==="ST"||state==="MV"||state==="SL"||state==="HB"||state==="HH"||state==="BE"||state==="BB")) return [5,6,7,8,9,10,11,12].filter(g=>!(g<7&&(state==="BE"||state==="BB")));
  if(type==="haupt" && state==="BY") return [5,6,7,8,9,10];
  if(type==="real" && state==="BY") return [5,6,7,8,9,10];
  return t.grades;
}
function planLink(p){
  const s=stateByK(p.state); const l=PLAN_LINKS[p.state]||{};
  const os = (p.type==="gym"||p.type==="gms") && p.grade>=11;
  return {url:(os&&l.os)||l[p.type]||(s&&s.url)||"https://www.kmk.org/themen/qualitaetssicherung-in-schulen/bildungsstandards.html", src:s?s.src:"Bildungsstandards der KMK"};
}

/* Fächer-Normalisierung (gemeinsamer Schlüssel in der Bibliothek) */
function subjKey(name){return String(name||"").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g,"").replace(/ß/g,"ss").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"fach";}

/* Fächer je Land, Schulart, Stufe. core = vorausgewählt */
function subjectsFor(p){
  const st=p.state, t=p.type, g=Number(p.grade)||0;
  const out=[]; const add=(n,core=false,topic=null)=>{ if(!out.find(x=>x.n===n)) out.push({n,core,topicKey:topic||n}); };
  const relig = st==="BY"?["Katholische Religionslehre","Evangelische Religionslehre","Ethik"]: st==="NW"?["Katholische Religionslehre","Evangelische Religionslehre","Praktische Philosophie"]: ["Katholische Religion","Evangelische Religion","Ethik"];
  const geo = (st==="NW"||st==="HE"||st==="RP"||st==="SL"||st==="NI"||st==="HB")?"Erdkunde":"Geographie";
  const pol = {BW:"Gemeinschaftskunde",BY:"Politik und Gesellschaft",NW:"Wirtschaft-Politik",HE:"Politik und Wirtschaft",NI:"Politik-Wirtschaft",SN:"Gemeinschaftskunde/Rechtserziehung/Wirtschaft",TH:"Sozialkunde",ST:"Sozialkunde",RP:"Sozialkunde",SL:"Politik",BE:"Politische Bildung",BB:"Politische Bildung",HH:"PGW (Politik/Gesellschaft/Wirtschaft)",HB:"Politik",SH:"Wirtschaft/Politik",MV:"Sozialkunde"}[st]||"Politik";
  if(t==="grund"){
    add("Deutsch",true); add("Mathematik",true);
    add(st==="BY"?"Heimat- und Sachunterricht":"Sachunterricht",true,"Sachunterricht");
    if(g>=3 || st==="NW" || st==="HE" || st==="BW") add("Englisch",g>=3);
    add("Kunst"); add("Musik"); add("Sport"); relig.forEach(r=>add(r)); if(st==="BY") add("Werken und Gestalten");
    return out;
  }
  const os = ["gym","gms","bg","fos"].includes(t) && g>=11;
  if(t==="bs"){
    ["Deutsch","Englisch","Wirtschafts- und Sozialkunde","Politik / Gemeinschaftskunde","Lernfelder (Fachtheorie)","Fachpraxis","Mathematik / Fachrechnen","Religion / Ethik","Sport"].forEach((n,i)=>add(n,i<4));
    return out;
  }
  add("Deutsch",true); add("Mathematik",true); add("Englisch",true);
  if(t==="gym"||(t==="gms"&&g>=6)||t==="bg"){ add("Französisch",g>=6&&t==="gym"&&!os); add("Latein"); add("Spanisch"); }
  if(t==="real"&&st==="BW"&&g>=6) add("Französisch");
  if(t==="real"&&st==="BY"&&g>=6) add("Französisch");
  if(os){
    ["Biologie","Chemie","Physik","Informatik","Geschichte",geo,pol,"Wirtschaft","Philosophie","Psychologie","Pädagogik","Kunst","Musik","Sport"].forEach(n=>add(n, ["Biologie","Geschichte"].includes(n)));
    if(st==="BW") { add("Literatur und Theater"); add("NwT (Naturwissenschaft und Technik)"); }
    if(st==="BY") { add("Wirtschaft und Recht"); }
    if(t==="bg"){ add("Profilfach (z. B. Wirtschaft, Technik, Ernährung, Soziales)",true); add("Volks- und Betriebswirtschaftslehre"); add("Technik"); }
    if(t==="fos"){ add("Profilfach / Fachrichtung (z. B. Technik, Wirtschaft, Sozialwesen)",true); add("Betriebswirtschaftslehre mit Rechnungswesen"); add("Technologie"); }
    relig.forEach(r=>add(r)); return out;
  }
  // Sekundarstufe I
  if(g<=6 || (st==="BY" && g<=7)){
    if(st==="BW") add("BNT (Biologie, Naturphänomene und Technik)",true,"Biologie");
    else if(st==="BY") add("Natur und Technik",true,"Biologie");
    else add(t==="gms"&&st==="NW"?"Naturwissenschaften":"Biologie",true,"Biologie");
  }
  const msBY = st==="BY"&&t==="haupt";
  if(!msBY){
    if(g>=7 || st!=="BW") add("Biologie",g>=7);
    if(g>=7) add("Physik",true);
    if(g>=8 || (st==="NW"&&g>=7)) add("Chemie",true);
  } else if(g>=8) add("Natur und Technik",true,"Biologie");
  const nwGe = t==="gms"&&st==="NW";
  if(nwGe){ add("Gesellschaftslehre",true,"Geschichte"); add("Arbeitslehre"); }
  if(st==="BY"&&t==="haupt"){ add("Geschichte/Politik/Geographie",true,"Geschichte"); add("Wirtschaft und Beruf",true); add("Technik"); add("Ernährung und Soziales"); add("Wirtschaft und Kommunikation"); }
  else if(!nwGe) { add("Geschichte",g>=6); add(geo,true,"Geographie"); if(g>=7||st==="NW"||st==="HE") add(pol,g>=8,"Politik"); }
  if(st==="BW"&&g>=7) add("Wirtschaft / Berufs- und Studienorientierung (WBS)",g>=8,"Wirtschaft");
  if(st==="BY"&&(t==="gym"||t==="real")&&g>=8) add(t==="real"?"Betriebswirtschaftslehre/Rechnungswesen (BwR)":"Wirtschaft und Recht",g>=9,"Wirtschaft");
  if(st==="BW"&&t==="gym"&&g>=8) { add("Profilfach NwT",false,"Physik"); add("Profilfach IMP (Informatik, Mathematik, Physik)",false,"Informatik"); }
  if(st==="HE"&&t!=="gym") add("Arbeitslehre");
  if(st==="BW"&&(t==="real"||t==="gms"||t==="haupt")&&g>=7){ add("Technik"); add("AES (Alltagskultur, Ernährung, Soziales)"); }
  add("Informatik",(st==="NW"&&g<=6)||(st==="BY"&&t==="gym"&&g>=6&&g<=7)); add("Kunst"); add("Musik"); add("Sport");
  relig.forEach(r=>add(r));
  return out;
}

/* Typische Themen (Orientierung an den Bildungsplänen; Bänder 5-6, 7-8, 9-10, Oberstufe, Grundschule) */
const TOPICS = {
  "Mathematik":{
    gs:["Zahlenraum bis 100 / 1000 / 1 Million","Addition und Subtraktion","Einmaleins","Schriftliche Rechenverfahren","Geometrische Formen und Körper","Größen: Geld, Längen, Zeit, Gewichte","Daten, Häufigkeit und Wahrscheinlichkeit","Muster und Strukturen"],
    "5-6":["Natürliche Zahlen und Stellenwertsystem","Rechengesetze und Terme","Teilbarkeit, Primzahlen, ggT und kgV","Brüche und Bruchrechnung","Dezimalzahlen","Negative Zahlen","Geometrische Grundbegriffe, Winkel","Achsen- und Punktsymmetrie","Umfang und Flächeninhalt (Rechteck, Dreieck, Parallelogramm)","Quader und Würfel: Oberfläche und Volumen","Größen und Einheiten","Daten erfassen und darstellen"],
    "7-8":["Terme und Termumformungen","Lineare Gleichungen und Ungleichungen","Prozent- und Zinsrechnung","Proportionale und antiproportionale Zuordnungen","Lineare Funktionen","Lineare Gleichungssysteme","Kongruenz und Dreieckskonstruktionen","Besondere Linien im Dreieck","Kreis: Umfang und Fläche","Prismen und Zylinder","Binomische Formeln","Wahrscheinlichkeit: Laplace-Experimente, Baumdiagramme"],
    "9-10":["Reelle Zahlen, Wurzeln","Quadratische Funktionen und Gleichungen","Satz des Pythagoras, Satzgruppe","Ähnlichkeit und Strahlensätze","Potenzen und Potenzfunktionen","Exponentialfunktionen und Wachstum","Logarithmus","Trigonometrie (Sinus, Kosinus, Tangens)","Trigonometrische Funktionen","Pyramide, Kegel, Kugel","Mehrstufige Zufallsexperimente, bedingte Wahrscheinlichkeit","Ganzrationale Funktionen"],
    os:["Grenzwerte und Ableitung","Ableitungsregeln (Produkt-, Ketten-, Quotientenregel)","Kurvendiskussion","Extremwertprobleme","Integralrechnung, Hauptsatz","Flächen zwischen Graphen, Rotationskörper","Exponential- und Logarithmusfunktionen (e-Funktion)","Funktionenscharen","Vektoren, Geraden und Ebenen","Lagebeziehungen, Abstände und Winkel","Matrizen und Übergangsprozesse","Binomialverteilung","Normalverteilung","Hypothesentests"]},
  "Deutsch":{
    gs:["Lesen und Leseverstehen","Rechtschreibstrategien","Wortarten: Nomen, Verb, Adjektiv","Satzglieder","Texte planen und schreiben","Erzählen","Gedichte"],
    "5-6":["Erzählen (Erlebnis-, Fantasieerzählung)","Beschreiben (Vorgang, Gegenstand, Person)","Märchen und Sagen","Fabeln","Gedichte: Reim, Strophe, Metrum","Jugendbuch","Wortarten und Satzglieder","Zeitformen","Rechtschreibung: Groß-/Kleinschreibung, s-Laute","Kommasetzung"],
    "7-8":["Inhaltsangabe","Argumentieren und Erörtern (einfach)","Bericht","Balladen","Kurzgeschichten","Novellen und Jugendroman","Sachtexte analysieren","Aktiv und Passiv","Konjunktiv I und II, indirekte Rede","Satzgefüge und Nebensätze","Zeitung und Medien"],
    "9-10":["Textgebundene Erörterung","Interpretation epischer Texte","Gedichtanalyse","Dramenanalyse (z. B. klassisches Drama)","Sachtextanalyse","Rhetorische Mittel","Literaturepochen: Aufklärung bis Romantik","Bewerbung und Lebenslauf","Sprachwandel und Medien"],
    os:["Interpretation epischer Texte","Gedichtvergleich","Dramenanalyse","Erörterung literarischer Texte","Sachtextanalyse und Erörterung","Literaturepochen (Barock bis Gegenwart)","Sprachreflexion: Spracherwerb, Sprachwandel, Kommunikation","Pflichtlektüren des Abiturs","Rhetorik und politische Rede"]},
  "Englisch":{
    gs:["Begrüßung und Vorstellung","Farben, Zahlen, Familie","Schule und Freizeit","Tiere und Natur","Feste im Jahreslauf"],
    "5-6":["Simple Present","Present Progressive","Simple Past","Going-to-Future und will-Future","Plural und Possessivbegleiter","Adjektive und Steigerung","Fragen mit Fragewörtern","Wortschatz: Schule, Familie, Freizeit","UK: London und Alltag"],
    "7-8":["Present Perfect vs. Simple Past","Past Progressive","Conditional Clauses I und II","Relative Clauses","Passive","Reported Speech","Gerund und Infinitive","Adverbs","Landeskunde: USA, Schottland, Irland"],
    "9-10":["Conditional III","Participle Constructions","Past Perfect","Mediation","Comment und Argumentative Essay","Analysing fiction","Landeskunde: Australien, Indien, Kanada","Jugend und Medien"],
    os:["Globalisierung","The American Dream","Großbritannien: Identity and Brexit","Post-colonial Englishes (z. B. Indien, Nigeria)","Science and Technology / Ethics","Shakespeare","Dystopian Fiction","Text Analysis and Comment","Mediation","Film Analysis"]},
  "Biologie":{
    gs:["Pflanzen und Tiere","Körper und Gesundheit","Wasser"],
    "5-6":["Kennzeichen des Lebendigen","Bau und Funktion von Blütenpflanzen","Fotosynthese (einfach)","Säugetiere und Haustiere","Wirbeltierklassen","Vögel und Fliegen","Ernährung und Verdauung","Atmung und Blutkreislauf","Sinnesorgane","Pubertät und Entwicklung","Ökosystem Wald / Wiese"],
    "7-8":["Zelle und Mikroskopieren","Einzeller und Vielzeller","Wirbellose: Insekten","Ökosystem See","Nahrungsketten und -netze","Bakterien und Viren","Immunsystem","Sexualität und Verhütung"],
    "9-10":["Nervensystem und Hormone","Sinnesorgane: Auge und Ohr","Genetik: DNA, Mitose, Meiose","Mendelsche Regeln","Evolution: Darwin, Selektion","Ökologie: Populationen","Stoffwechsel: Enzyme"],
    os:["Zellbiologie und Biomembranen","Enzyme","Zellatmung","Fotosynthese","Molekulargenetik: Proteinbiosynthese, Genregulation","Gentechnik","Klassische Genetik und Stammbäume","Neurobiologie: Ruhe- und Aktionspotenzial, Synapse","Hormone","Immunbiologie","Ökologie","Evolution und Artbildung"]},
  "Chemie":{
    "7-8":["Stoffe und ihre Eigenschaften","Reinstoffe und Gemische, Trennverfahren","Chemische Reaktion und Energie","Verbrennung und Oxidation","Atombau (Dalton, Kern-Hülle-Modell)","Elemente und Periodensystem"],
    "9-10":["Atombau und Periodensystem","Ionenbindung und Salze","Elektronenpaarbindung und Moleküle","Polarität und Wasserstoffbrücken","Säuren und Basen, pH-Wert","Redoxreaktionen","Kohlenwasserstoffe (Alkane, Alkene)","Alkohole und Carbonsäuren","Stöchiometrie: Stoffmenge und Molare Masse"],
    os:["Reaktionsgeschwindigkeit","Chemisches Gleichgewicht, Massenwirkungsgesetz","Säure-Base-Gleichgewichte, Titration, Puffer","Elektrochemie: Galvanische Zellen, Elektrolyse","Organische Chemie: Stoffklassen und Reaktionsmechanismen","Aromaten","Kunststoffe","Fette, Kohlenhydrate, Proteine","Energetik: Enthalpie, Entropie"]},
  "Physik":{
    "5-6":["Magnetismus","Einfache Stromkreise","Wärme und Temperatur","Licht und Schatten","Schall"],
    "7-8":["Optik: Reflexion, Brechung, Linsen","Elektrischer Stromkreis: Stromstärke, Spannung","Widerstand und ohmsches Gesetz","Mechanik: Geschwindigkeit","Kraft und Masse","Dichte","Druck","Energie und Energieerhaltung"],
    "9-10":["Gleichförmige und beschleunigte Bewegung","Newtonsche Gesetze","Arbeit, Energie, Leistung","Elektromagnetismus und Induktion","Kernphysik: Radioaktivität","Thermodynamik: Wärme und innere Energie","Schwingungen und Wellen"],
    os:["Kinematik und Dynamik","Impuls und Stoßprozesse","Kreisbewegung und Gravitation","Elektrisches Feld, Kondensator","Magnetisches Feld, Lorentzkraft","Induktion","Mechanische und elektromagnetische Schwingungen","Wellen, Interferenz","Quantenobjekte: Photoeffekt, Doppelspalt","Atomphysik","Kernphysik","Spezielle Relativitätstheorie"]},
  "Geschichte":{
    "5-6":["Was ist Geschichte? Quellen und Zeitrechnung","Ur- und Frühgeschichte","Ägypten als Hochkultur","Antikes Griechenland","Römisches Reich"],
    "7-8":["Frühes Mittelalter und Frankenreich","Lehnswesen und Grundherrschaft","Stadt im Mittelalter","Kreuzzüge","Renaissance und Humanismus","Entdeckungen und Eroberungen","Reformation","Dreißigjähriger Krieg","Absolutismus","Aufklärung","Amerikanische Revolution","Französische Revolution"],
    "9-10":["Napoleon und Wiener Kongress","Revolution 1848/49","Industrialisierung und soziale Frage","Reichsgründung 1871 und Kaiserreich","Imperialismus","Erster Weltkrieg","Weimarer Republik","Nationalsozialismus","Zweiter Weltkrieg und Holocaust","Kalter Krieg","Deutsche Teilung und Wiedervereinigung"],
    os:["Modernisierung im 19. Jahrhundert","Nationalismus und Nationalstaatsbildung","Weimarer Republik: Krisen und Scheitern","NS-Herrschaft und Holocaust","Bipolare Welt nach 1945","Bundesrepublik und DDR","Europäische Einigung","Erinnerungskultur","Antike und Mittelalter als Grundlagen Europas"]},
  "Geographie":{
    "5-6":["Orientierung: Gradnetz, Karten, Atlas","Deutschland: Landschaften","Leben in der Stadt und auf dem Land","Landwirtschaft","Wetter und Klima (Grundlagen)","Tourismus"],
    "7-8":["Klima- und Vegetationszonen","Plattentektonik, Vulkanismus und Erdbeben","Tropischer Regenwald","Wüsten und Desertifikation","Polargebiete","Europa: Räume und Wirtschaft"],
    "9-10":["Bevölkerungsentwicklung und Migration","Globalisierung und Welthandel","Entwicklungsländer und Entwicklungszusammenarbeit","Klimawandel","Stadtentwicklung","Ressourcen und Energie"],
    os:["Endogene und exogene Kräfte","Klimasystem und Klimawandel","Wirtschaftsräume im Wandel","Globalisierung","Stadtgeographie","Bevölkerung und Migration","Nachhaltige Raumnutzung","Entwicklungstheorien"]},
  "Politik":{
    "7-8":["Zusammenleben in der Familie und Schule","Kinderrechte","Gemeinde und kommunale Politik","Medien und Meinungsbildung"],
    "9-10":["Grundgesetz und Grundrechte","Politisches System der Bundesrepublik","Wahlen und Parteien","Gesetzgebung","Rechtsstaat und Rechtsprechung","Sozialstaat","Europäische Union","Internationale Konflikte"],
    os:["Verfassungsorgane und Gewaltenteilung","Demokratietheorien","Parteien und Wahlen","Föderalismus","Europäische Union: Institutionen und Politik","Internationale Beziehungen, UNO, NATO","Soziale Marktwirtschaft","Wirtschaftspolitik und Konjunktur","Sozialstruktur und soziale Ungleichheit"]},
  "Wirtschaft":{
    "7-8":["Bedürfnisse und Güter","Verbraucher und Konsum","Taschengeld und Budget"],
    "9-10":["Markt und Preisbildung","Wirtschaftskreislauf","Unternehmen und Betriebe","Berufsorientierung und Arbeitswelt","Geld und Banken","Verträge und Recht"],
    os:["Marktformen und Preisbildung","Konjunktur und Wirtschaftspolitik","Geldpolitik der EZB","Außenhandel und Globalisierung","Unternehmensgründung und Rechtsformen","Investition und Finanzierung","Rechnungswesen"]},
  "Informatik":{
    "5-6":["Daten und Codierung","Algorithmen im Alltag","Einführung in Scratch / blockbasiertes Programmieren","Sicherer Umgang mit dem Internet","Dateien und Ordner"],
    "7-8":["Variablen, Verzweigungen, Schleifen","Objekte und Klassen (Grundlagen)","Tabellenkalkulation","Datenschutz","Netzwerke und Internet"],
    "9-10":["Programmieren mit Python","Datenbanken und SQL","Verschlüsselung","Rechneraufbau und Binärzahlen","Automaten"],
    os:["Objektorientierte Modellierung (UML)","Datenstrukturen: Listen, Bäume, Graphen","Sortier- und Suchalgorithmen","Rekursion","Relationale Datenbanken und SQL","Formale Sprachen und Automaten","Kryptologie","Rechnernetze und Protokolle","Theoretische Informatik: Berechenbarkeit"]},
  "Sachunterricht":{gs:["Körper und Gesundheit","Pflanzen und Tiere","Wetter und Jahreszeiten","Wasser","Strom und Magnetismus","Verkehrserziehung","Heimat, Orientierung und Karten","Früher und heute"]},
  "Französisch":{"5-6":["Présent: être, avoir, -er-Verben","Artikel und Plural","Zahlen, Uhrzeit, Datum","Wortschatz: Familie, Schule, Freizeit"],"7-8":["Passé composé","Imparfait","Futur composé und simple","Objektpronomen","Relativsätze"],"9-10":["Subjonctif","Conditionnel","Passiv","Landeskunde: Frankreich und Frankophonie"],os:["Vivre ensemble / Banlieues","Relations franco-allemandes","La Francophonie","Analyse de texte","Médiation"]},
  "Latein":{"5-6":["a- und o-Deklination","Präsens und Imperfekt","Kasuslehre"],"7-8":["Perfekt und Plusquamperfekt","Partizipien und PC","Ablativus absolutus","AcI"],"9-10":["Konjunktiv und Gliedsätze","nd-Formen (Gerundium, Gerundiv)","Ovid, Caesar"],os:["Cicero","Seneca","Vergil: Aeneis","Rhetorik und Philosophie in Rom"]},
};
/* Schlüssel für Themenbänder */
function topicBand(p){
  if(!p||p.track!=="schule") return null;
  if(p.type==="grund") return "gs";
  const g=Number(p.grade)||0;
  if(p.type==="bs") return "os";
  if(g>=11) return "os"; if(g>=9) return "9-10"; if(g>=7) return "7-8"; return "5-6";
}
function topicAlias(subject){
  const s=subject.toLowerCase();
  if(s.includes("mathe")) return "Mathematik";
  if(s.startsWith("deutsch")) return "Deutsch";
  if(s.startsWith("englisch")) return "Englisch";
  if(s.includes("biolog")||s.startsWith("bnt")||s.includes("natur und technik")||s==="naturwissenschaften") return "Biologie";
  if(s.startsWith("chemie")) return "Chemie";
  if(s.startsWith("physik")||s.includes("nwt")) return "Physik";
  if(s.startsWith("geschicht")||s.startsWith("gesellschaftslehre")) return "Geschichte";
  if(s.startsWith("geograph")||s.startsWith("erdkunde")) return "Geographie";
  if(s.includes("politik")||s.includes("gemeinschaftskunde")||s.includes("sozialkunde")||s.startsWith("pgw")) return "Politik";
  if(s.includes("wirtschaft")||s.includes("wbs")||s.includes("bwr")) return "Wirtschaft";
  if(s.includes("informatik")||s.startsWith("profilfach imp")) return "Informatik";
  if(s.includes("sachunterricht")) return "Sachunterricht";
  if(s.startsWith("franz")) return "Französisch";
  if(s.startsWith("latein")) return "Latein";
  return null;
}

/* Studium: typische Module (Orientierung; das Modulhandbuch deiner Hochschule ist maßgeblich) */
const PROGRAMS = {
  "Informatik":["Grundlagen der Programmierung","Algorithmen und Datenstrukturen","Analysis","Lineare Algebra","Diskrete Mathematik / Logik","Theoretische Informatik: Automaten und formale Sprachen","Berechenbarkeit und Komplexität","Rechnerarchitektur und Digitaltechnik","Betriebssysteme","Rechnernetze","Datenbanksysteme","Softwaretechnik","IT-Sicherheit","Wahrscheinlichkeitstheorie und Statistik","Künstliche Intelligenz","Programmierparadigmen"],
  "Wirtschaftsinformatik":["Einführung in die Wirtschaftsinformatik","Programmierung","Datenbanken","Geschäftsprozessmanagement","Einführung in die BWL","Volkswirtschaftslehre","Mathematik für Wirtschaftswissenschaften","Statistik","Externes Rechnungswesen","Informationsmanagement","Softwareentwicklung","ERP-Systeme","IT-Projektmanagement"],
  "Betriebswirtschaftslehre":["Einführung in die BWL","Buchführung / Externes Rechnungswesen","Kosten- und Leistungsrechnung","Mikroökonomik","Makroökonomik","Wirtschaftsmathematik","Statistik","Marketing","Investition und Finanzierung","Personal und Organisation","Wirtschaftsprivatrecht","Produktion und Logistik","Controlling","Betriebliche Steuerlehre"],
  "Volkswirtschaftslehre":["Mikroökonomik","Makroökonomik","Mathematik für Ökonomen","Statistik","Ökonometrie","Finanzwissenschaft","Geld und Währung","Internationale Wirtschaft","Spieltheorie","Wirtschaftspolitik"],
  "Maschinenbau":["Höhere Mathematik I–III","Technische Mechanik: Statik","Technische Mechanik: Elastostatik","Technische Mechanik: Dynamik","Konstruktionslehre / Maschinenelemente","Werkstoffkunde","Technische Thermodynamik","Strömungslehre","Elektrotechnik für Maschinenbauer","Fertigungstechnik","Regelungstechnik","Messtechnik","Informatik für Ingenieure"],
  "Elektrotechnik":["Höhere Mathematik","Grundlagen der Elektrotechnik I–III","Physik","Digitaltechnik","Elektronische Bauelemente","Signale und Systeme","Elektromagnetische Felder","Regelungstechnik","Messtechnik","Nachrichtentechnik","Programmieren in C","Leistungselektronik"],
  "Mathematik":["Analysis I","Analysis II","Lineare Algebra I","Lineare Algebra II","Algebra","Stochastik","Numerik","Funktionentheorie","Gewöhnliche Differentialgleichungen","Topologie","Maß- und Integrationstheorie","Programmieren für Mathematiker"],
  "Physik":["Experimentalphysik I: Mechanik","Experimentalphysik II: Elektrodynamik und Optik","Experimentalphysik III: Atom- und Quantenphysik","Theoretische Mechanik","Theoretische Elektrodynamik","Quantenmechanik","Thermodynamik und Statistische Physik","Mathematische Methoden der Physik","Festkörperphysik","Kern- und Teilchenphysik","Physikalisches Praktikum"],
  "Chemie":["Allgemeine und Anorganische Chemie","Organische Chemie","Physikalische Chemie","Analytische Chemie","Mathematik für Chemiker","Physik für Chemiker","Biochemie","Theoretische Chemie","Makromolekulare Chemie","Toxikologie und Rechtskunde"],
  "Biologie":["Zellbiologie","Genetik","Botanik","Zoologie","Mikrobiologie","Biochemie","Ökologie","Evolutionsbiologie","Tier- und Pflanzenphysiologie","Molekularbiologie","Allgemeine Chemie","Organische Chemie","Physik für Biologen","Statistik für Biologen"],
  "Psychologie":["Einführung in die Psychologie","Allgemeine Psychologie I: Wahrnehmung und Kognition","Allgemeine Psychologie II: Lernen, Emotion, Motivation","Biologische Psychologie","Entwicklungspsychologie","Sozialpsychologie","Differentielle und Persönlichkeitspsychologie","Statistik I","Statistik II","Forschungsmethoden","Psychologische Diagnostik","Klinische Psychologie","Arbeits- und Organisationspsychologie","Pädagogische Psychologie"],
  "Rechtswissenschaft":["BGB Allgemeiner Teil","Schuldrecht AT","Schuldrecht BT","Sachenrecht","Familien- und Erbrecht","Handels- und Gesellschaftsrecht","Arbeitsrecht","Zivilprozessrecht","Strafrecht AT","Strafrecht BT","Strafprozessrecht","Staatsorganisationsrecht","Grundrechte","Allgemeines Verwaltungsrecht","Verwaltungsprozessrecht","Europarecht","Rechtsgeschichte"],
  "Medizin":["Anatomie","Histologie","Physiologie","Biochemie / Molekularbiologie","Medizinische Psychologie und Soziologie","Physik für Mediziner","Chemie für Mediziner","Biologie für Mediziner","Pathologie","Pharmakologie","Mikrobiologie","Innere Medizin","Chirurgie","Neurologie"],
  "Lehramt (Bildungswissenschaften)":["Einführung in die Bildungswissenschaften","Schulpädagogik","Pädagogische Psychologie","Entwicklungspsychologie","Diagnostik und Förderung","Inklusion und Heterogenität","Fachdidaktik","Deutsch als Zweitsprache","Schulpraktikum (Reflexion)"],
  "Soziale Arbeit":["Theorien der Sozialen Arbeit","Recht in der Sozialen Arbeit","Psychologie","Soziologie","Methoden der Sozialen Arbeit","Sozialpolitik","Kinder- und Jugendhilfe","Empirische Sozialforschung"],
  "Germanistik":["Einführung in die Literaturwissenschaft","Einführung in die Sprachwissenschaft","Ältere deutsche Literatur","Neuere deutsche Literatur","Grammatik des Deutschen","Literaturgeschichte"],
  "Pflege / Gesundheit":["Anatomie und Physiologie","Pflegewissenschaft","Krankheitslehre","Pharmakologie","Hygiene","Kommunikation und Beratung","Gesundheitsökonomie","Ethik"],
};
