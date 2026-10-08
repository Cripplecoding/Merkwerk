// Testmaterial für „Audio & Podcast“: zwei Dokumente, deren Inhalte zusammenhängen, und Claude-Antworten dazu.
// Genutzt von tests/run.mjs (Logik) und tests/e2e-audio.mjs (ganzer Ablauf im Browser).
export const DOCS = [
  { name: "Inflation.txt", text: "Inflation\n\nInflation beschreibt einen anhaltenden Anstieg des allgemeinen Preisniveaus. Dadurch sinkt die Kaufkraft des Geldes.\n\nDie Europäische Zentralbank strebt mittelfristig eine Inflationsrate von 2 Prozent an." },
  { name: "Geldpolitik.txt", text: "Leitzins\n\nWenn die Zentralbank den Leitzins erhöht, werden Kredite teurer. Steigende Kreditkosten dämpfen die Nachfrage und damit den Preisauftrieb.\n\nIm Jahr 2022 stieg die Inflationsrate im Euroraum zeitweise auf über 10 Prozent." },
];
// Claude zerlegt das Material; zwei Einheiten sind absichtlich falsch (erfundenes Zitat, falsche Zahl) und müssen wegfallen.
export const UNITS_RESPONSE = {
  titel: "Inflation und Geldpolitik",
  themen: ["Inflation", "Geldpolitik"],
  einheiten: [
    { thema: "Inflation", art: "definition", rang: 1, aussage: "Inflation beschreibt einen anhaltenden Anstieg des allgemeinen Preisniveaus.", quelle: ["S1"], zitat: "Inflation beschreibt einen anhaltenden Anstieg des allgemeinen Preisniveaus." },
    { thema: "Inflation", art: "ursache", rang: 1, aussage: "Durch Inflation sinkt die Kaufkraft des Geldes.", quelle: ["S1"], zitat: "Dadurch sinkt die Kaufkraft des Geldes." },
    { thema: "Geldpolitik", art: "ursache", rang: 1, aussage: "Erhöht die Zentralbank den Leitzins, werden Kredite teurer.", quelle: ["S2"], zitat: "Wenn die Zentralbank den Leitzins erhöht, werden Kredite teurer." },
    { thema: "Inflation", art: "zahl", rang: 2, aussage: "Die Europäische Zentralbank strebt mittelfristig eine Inflationsrate von 2 Prozent an.", quelle: ["S1"], zitat: "Die Europäische Zentralbank strebt mittelfristig eine Inflationsrate von 2 Prozent an." },
    { thema: "Geldpolitik", art: "zusammenhang", rang: 2, aussage: "Steigende Kreditkosten dämpfen die Nachfrage und damit den Preisauftrieb.", quelle: ["S2"], zitat: "Steigende Kreditkosten dämpfen die Nachfrage und damit den Preisauftrieb." },
    { thema: "Inflation", art: "zahl", rang: 3, aussage: "Im Jahr 2022 stieg die Inflationsrate im Euroraum zeitweise auf über 10 Prozent.", quelle: ["S2"], zitat: "Im Jahr 2022 stieg die Inflationsrate im Euroraum zeitweise auf über 10 Prozent." },
    { thema: "Inflation", art: "ursache", rang: 1, aussage: "Inflation entsteht durch Gelddrucken.", quelle: ["S1"], zitat: "Gelddrucken führt immer zu Inflation, sagen viele Ökonomen." },
    { thema: "Inflation", art: "zahl", rang: 2, aussage: "Die EZB strebt 3 Prozent Inflation an.", quelle: ["S1"], zitat: "Die Europäische Zentralbank strebt mittelfristig eine Inflationsrate von 2 Prozent an." },
  ],
  hinweise: [],
};
// Nach dem Zusammenführen: E1 Definition, E2 Kaufkraft, E3 Ziel 2 %, E4 2022 (Rang 3), E5 Leitzins, E6 Kreditkosten.
// Standard (Rang 1–2) = E1, E2, E3, E5, E6. Das Monologskript hat absichtlich eine falsche Zahl in Segment 2.
export const MONOLOG_RESPONSE = {
  titel: "Inflation und Geldpolitik",
  segmente: [
    { teil: "einleitung", text: "In dieser Zusammenfassung geht es um Inflation und um die Rolle des Leitzinses.", einheiten: [] },
    { teil: "haupt", text: "Inflation beschreibt einen anhaltenden Anstieg des allgemeinen Preisniveaus. Dadurch sinkt die Kaufkraft des Geldes.", einheiten: ["E1", "E2"] },
    { teil: "haupt", text: "Die Europäische Zentralbank strebt mittelfristig eine Inflationsrate von 3 Prozent an.", einheiten: ["E3"] },
    { teil: "haupt", text: "Erhöht die Zentralbank den Leitzins, werden Kredite teurer. Steigende Kreditkosten dämpfen die Nachfrage und damit den Preisauftrieb.", einheiten: ["E5", "E6"] },
    { teil: "abschluss", text: "Kurz gesagt: Inflation lässt die Kaufkraft sinken, und ein höherer Leitzins verteuert Kredite.", einheiten: ["E2", "E5"] },
  ],
};
export const MONOLOG_REPAIR = { korrekturen: [{ segment: 2, neu: [{ teil: "haupt", text: "Die Europäische Zentralbank strebt mittelfristig eine Inflationsrate von 2 Prozent an.", einheiten: ["E3"] }] }] };
export const PODCAST_RESPONSE = {
  titel: "Inflation und Geldpolitik – Podcast",
  segmente: [
    { teil: "einleitung", sprecher: "A", text: "Willkommen! Heute sprechen wir über Inflation und den Leitzins.", einheiten: [] },
    { teil: "haupt", sprecher: "A", text: "Was versteht man eigentlich unter Inflation?", einheiten: [] },
    { teil: "haupt", sprecher: "B", text: "Inflation beschreibt einen anhaltenden Anstieg des allgemeinen Preisniveaus.", einheiten: ["E1"] },
    { teil: "haupt", sprecher: "A", text: "Und was bedeutet das für unser Geld?", einheiten: [] },
    { teil: "haupt", sprecher: "B", text: "Dadurch sinkt die Kaufkraft des Geldes. Die Europäische Zentralbank strebt mittelfristig eine Inflationsrate von 2 Prozent an.", einheiten: ["E2", "E3"] },
    { teil: "haupt", sprecher: "A", text: "Was passiert, wenn die Zentralbank den Leitzins erhöht?", einheiten: [] },
    { teil: "haupt", sprecher: "B", text: "Dann werden Kredite teurer. Steigende Kreditkosten dämpfen die Nachfrage und damit den Preisauftrieb.", einheiten: ["E5", "E6"] },
    { teil: "abschluss", sprecher: "A", text: "Halten wir fest: Inflation lässt die Kaufkraft sinken, ein höherer Leitzins verteuert Kredite.", einheiten: ["E2", "E5"] },
  ],
};
// Antwort einer gespielten Claude-Instanz je nach Art der Anfrage
export function fakeClaude(prompt, state = {}) {
  if (prompt.includes("Zerlege es in fachliche Informationseinheiten")) { state.units = (state.units || 0) + 1; return UNITS_RESPONSE; }
  if (prompt.includes("korrigiere nur die betroffenen") || prompt.includes("Korrigiere nur die betroffenen Stellen")) { state.repairs = (state.repairs || 0) + 1; return MONOLOG_REPAIR; }
  if (prompt.includes("Du prüfst das Sprechskript")) { state.checks = (state.checks || 0) + 1; return { probleme: [] }; }
  if (prompt.includes("Lernpodcasts mit zwei Stimmen")) { state.podcast = (state.podcast || 0) + 1; return PODCAST_RESPONSE; }
  if (prompt.includes("Sprechskript einer Audiozusammenfassung")) { state.monolog = (state.monolog || 0) + 1; return MONOLOG_RESPONSE; }
  throw new Error("Unerwartete Anfrage: " + prompt.slice(0, 80));
}
