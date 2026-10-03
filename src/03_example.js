/* ===================== Beispiel: Photosynthese (selbst geschrieben, als Beispiel gekennzeichnet) ===================== */
const EXAMPLE_TEXT = `Photosynthese – Grundlagen

Die Photosynthese ist der Prozess, bei dem grüne Pflanzen, Algen und Cyanobakterien Lichtenergie in chemische Energie umwandeln. Aus Kohlenstoffdioxid und Wasser entstehen dabei Glucose und Sauerstoff. Die vereinfachte Summengleichung lautet: 6 CO2 + 6 H2O → C6H12O6 + 6 O2.

Ort der Photosynthese

Die Photosynthese findet in den Chloroplasten statt. Chloroplasten sind von einer Doppelmembran umgeben. Im Inneren liegen gestapelte Membransäckchen, die Thylakoide, umgeben von einer Grundsubstanz, dem Stroma. Der grüne Farbstoff Chlorophyll sitzt in den Thylakoidmembranen und absorbiert vor allem rotes und blaues Licht. Grünes Licht wird größtenteils reflektiert, deshalb erscheinen Blätter grün.

Lichtabhängige Reaktionen

Die lichtabhängigen Reaktionen laufen an den Thylakoidmembranen ab. Dort wird Wasser unter Lichteinwirkung gespalten; diesen Vorgang nennt man Fotolyse. Der dabei frei werdende Sauerstoff stammt also aus dem Wasser und nicht aus dem Kohlenstoffdioxid. Die Energie des Lichts wird in Form von ATP und NADPH gespeichert, die anschließend für den Aufbau von Zucker gebraucht werden.

Lichtunabhängige Reaktionen (Calvin-Zyklus)

Im Stroma läuft der Calvin-Zyklus ab. Das Enzym Rubisco bindet dabei Kohlenstoffdioxid an ein Akzeptormolekül. Mithilfe von ATP und NADPH aus den lichtabhängigen Reaktionen wird daraus schrittweise Zucker aufgebaut. Der Calvin-Zyklus braucht kein Licht direkt, ist aber auf die Produkte der lichtabhängigen Reaktionen angewiesen und kommt im Dunkeln deshalb bald zum Erliegen.

Einflussfaktoren

Die Photosyntheserate hängt von der Lichtintensität, der Kohlenstoffdioxid-Konzentration und der Temperatur ab. Steigt die Lichtintensität, nimmt die Rate zunächst zu, bis ein anderer Faktor begrenzt. Dieser Faktor wird als begrenzender Faktor bezeichnet. Bei zu hohen Temperaturen sinkt die Rate wieder, weil Enzyme wie Rubisco ihre Struktur verlieren.

Bedeutung

Die Photosynthese liefert den Sauerstoff, den die meisten Lebewesen zur Zellatmung brauchen. Gleichzeitig bildet die produzierte Glucose die Grundlage fast aller Nahrungsketten. Die Zellatmung kehrt die Summengleichung der Photosynthese im Prinzip um: Glucose und Sauerstoff werden zu Kohlenstoffdioxid und Wasser abgebaut, wobei Energie frei wird.`;

const EXAMPLE_QUESTIONS = [
 {type:"mc",afb:"I",prompt:"Wo genau sitzt das Chlorophyll in der Pflanzenzelle?",options:["In den Thylakoidmembranen","Im Stroma","In der äußeren Doppelmembran","Im Zellkern"],answer:0,quote:"Der grüne Farbstoff Chlorophyll sitzt in den Thylakoidmembranen",explain:"Chlorophyll ist in die Thylakoidmembranen eingelagert."},
 {type:"mc",afb:"I",prompt:"Welche Produkte entstehen laut Summengleichung bei der Photosynthese?",options:["Glucose und Sauerstoff","Kohlenstoffdioxid und Wasser","ATP und Wasser","Sauerstoff und Kohlenstoffdioxid"],answer:0,quote:"Aus Kohlenstoffdioxid und Wasser entstehen dabei Glucose und Sauerstoff.",explain:"Edukte sind CO2 und H2O, Produkte Glucose und O2."},
 {type:"mc",afb:"II",prompt:"Woher stammt der bei der Photosynthese frei werdende Sauerstoff?",options:["Aus dem Wasser","Aus dem Kohlenstoffdioxid","Aus der Glucose","Aus dem Chlorophyll"],answer:0,quote:"Der dabei frei werdende Sauerstoff stammt also aus dem Wasser und nicht aus dem Kohlenstoffdioxid.",explain:"Bei der Fotolyse wird Wasser gespalten."},
 {type:"mc",afb:"II",prompt:"Warum kommt der Calvin-Zyklus im Dunkeln bald zum Erliegen?",options:["Weil ihm ATP und NADPH aus den lichtabhängigen Reaktionen fehlen","Weil Rubisco nur bei Licht gebildet wird","Weil im Dunkeln kein Kohlenstoffdioxid vorhanden ist","Weil das Stroma im Dunkeln zerfällt"],answer:0,quote:"ist aber auf die Produkte der lichtabhängigen Reaktionen angewiesen und kommt im Dunkeln deshalb bald zum Erliegen",explain:"Der Zyklus braucht ATP und NADPH, die nur bei Licht entstehen."},
 {type:"mc",afb:"III",prompt:"Eine Pflanze steht bei optimalem Licht und optimaler Temperatur, aber wenig Kohlenstoffdioxid. Was beschreibt die Situation am besten?",options:["Kohlenstoffdioxid ist der begrenzende Faktor","Licht ist der begrenzende Faktor","Die Temperatur ist der begrenzende Faktor","Es gibt keinen begrenzenden Faktor"],answer:0,quote:"Dieser Faktor wird als begrenzender Faktor bezeichnet.",explain:"Der Faktor, der knapp ist, begrenzt die Rate."},
 {type:"text",afb:"I",prompt:"Nenne die drei Faktoren, von denen die Photosyntheserate abhängt.",model_answer:"Lichtintensität, Kohlenstoffdioxid-Konzentration und Temperatur.",key_points:["Lichtintensität","Kohlenstoffdioxid-Konzentration","Temperatur"],quote:"Die Photosyntheserate hängt von der Lichtintensität, der Kohlenstoffdioxid-Konzentration und der Temperatur ab."},
 {type:"text",afb:"II",prompt:"Erkläre, warum Blätter grün erscheinen.",model_answer:"Chlorophyll absorbiert vor allem rotes und blaues Licht; grünes Licht wird größtenteils reflektiert und gelangt so ins Auge.",key_points:["Chlorophyll absorbiert rot und blau","grünes Licht wird reflektiert"],quote:"Grünes Licht wird größtenteils reflektiert, deshalb erscheinen Blätter grün."},
 {type:"text",afb:"II",prompt:"Beschreibe den Zusammenhang zwischen lichtabhängigen Reaktionen und Calvin-Zyklus.",model_answer:"Die lichtabhängigen Reaktionen speichern Lichtenergie in ATP und NADPH. Der Calvin-Zyklus nutzt diese Stoffe, um aus Kohlenstoffdioxid Zucker aufzubauen.",key_points:["ATP und NADPH entstehen in den lichtabhängigen Reaktionen","Calvin-Zyklus verbraucht ATP und NADPH zum Zuckeraufbau"],quote:"Mithilfe von ATP und NADPH aus den lichtabhängigen Reaktionen wird daraus schrittweise Zucker aufgebaut."},
 {type:"text",afb:"III",prompt:"Beurteile die Aussage: „Bei sehr hohen Temperaturen betreiben Pflanzen besonders viel Photosynthese.“",model_answer:"Die Aussage ist falsch. Bei zu hohen Temperaturen sinkt die Rate, weil Enzyme wie Rubisco ihre Struktur verlieren.",key_points:["Aussage ist falsch","Rate sinkt bei zu hohen Temperaturen","Enzyme wie Rubisco verlieren ihre Struktur"],quote:"Bei zu hohen Temperaturen sinkt die Rate wieder, weil Enzyme wie Rubisco ihre Struktur verlieren."},
 {type:"match",afb:"I",prompt:"Ordne jedem Begriff die passende Beschreibung zu.",pairs:[{left:"Thylakoide",right:"gestapelte Membransäckchen im Chloroplasten"},{left:"Stroma",right:"Grundsubstanz, in der der Calvin-Zyklus abläuft"},{left:"Fotolyse",right:"Spaltung von Wasser unter Lichteinwirkung"},{left:"Rubisco",right:"Enzym, das Kohlenstoffdioxid bindet"}],quote:"Im Inneren liegen gestapelte Membransäckchen, die Thylakoide, umgeben von einer Grundsubstanz, dem Stroma."},
 {type:"match",afb:"II",prompt:"Ordne jedem Vorgang den Ort zu, an dem er abläuft.",pairs:[{left:"Lichtabhängige Reaktionen",right:"Thylakoidmembranen"},{left:"Calvin-Zyklus",right:"Stroma"},{left:"Photosynthese insgesamt",right:"Chloroplasten"}],quote:"Die lichtabhängigen Reaktionen laufen an den Thylakoidmembranen ab."},
 {type:"match",afb:"II",prompt:"Ordne zu: Was wird verbraucht, was entsteht?",pairs:[{left:"Photosynthese verbraucht",right:"Kohlenstoffdioxid und Wasser"},{left:"Photosynthese erzeugt",right:"Glucose und Sauerstoff"},{left:"Zellatmung erzeugt",right:"Kohlenstoffdioxid, Wasser und Energie"}],quote:"Glucose und Sauerstoff werden zu Kohlenstoffdioxid und Wasser abgebaut, wobei Energie frei wird."},
 {type:"cloze",afb:"I",prompt:"Die Photosynthese findet in den ___ statt. Diese sind von einer ___ umgeben.",blanks:[["Chloroplasten"],["Doppelmembran"]],quote:"Die Photosynthese findet in den Chloroplasten statt. Chloroplasten sind von einer Doppelmembran umgeben."},
 {type:"cloze",afb:"I",prompt:"Die Energie des Lichts wird in Form von ___ und ___ gespeichert.",blanks:[["ATP"],["NADPH"]],quote:"Die Energie des Lichts wird in Form von ATP und NADPH gespeichert"},
 {type:"cloze",afb:"II",prompt:"Die ___ kehrt die Summengleichung der Photosynthese im Prinzip um. Die produzierte ___ bildet die Grundlage fast aller Nahrungsketten.",blanks:[["Zellatmung"],["Glucose","Glukose"]],quote:"Die Zellatmung kehrt die Summengleichung der Photosynthese im Prinzip um"},
];
