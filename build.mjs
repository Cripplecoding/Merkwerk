// Baut Merkwerk aus src/ zu zwei Dateien:
//   dist/index.html             – eigenständige Seite (Doppelklick im Browser oder GitHub Pages)
//   dist/merkwerk-artifact.html – Inhalt für ein claude.ai-Artifact (ohne doctype/head/body; der Viewer ergänzt das Gerüst)
//   dist/bildungsplaene.js      – Bildungsplan-Daten, lädt index.html erst bei Bedarf (im Artifact sind sie schon eingebaut; die Datei dort trotzdem mit veröffentlichen)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const head = readFileSync(join(src, "01_head.html"), "utf8");
const scripts = readdirSync(src).filter(f => f.endsWith(".js")).sort();
// KI-Server (docs/ki-fuer-alle.md): Adresse und öffentlicher Schlüssel können statt in src/04c_ai.js auch als
// Umgebungsvariablen kommen – der Pages-Workflow nimmt sie aus den Repository-Variablen MERKWERK_AI_URL und MERKWERK_AI_ANON_KEY.
const aiEnv = s => s
  .replace(/(\burl: )""/, (m, a) => process.env.MERKWERK_AI_URL ? a + JSON.stringify(process.env.MERKWERK_AI_URL) : m)
  .replace(/(\banonKey: )""/, (m, a) => process.env.MERKWERK_AI_ANON_KEY ? a + JSON.stringify(process.env.MERKWERK_AI_ANON_KEY) : m);
const js = scripts.map(f => `/* ---- ${f} ---- */\n` + (f === "04c_ai.js" ? aiEnv : String)(readFileSync(join(src, f), "utf8"))).join("\n");
const body = `${head}\n<script>\n${js}\n</script>\n`;
// Im Artifact stehen die Bildungsplan-Daten direkt in der Seite, damit die Fächerauswahl nicht vom Nachladen der Zusatzdatei abhängt.
const plans = readFileSync(join(root, "data", "bildungsplaene.js"), "utf8");
if (/<\/script/i.test(plans)) throw new Error("bildungsplaene.js enthält </script>");

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "merkwerk-artifact.html"), `${head}\n<script>\n${plans}\n</script>\n<script>\n${js}\n</script>\n`);
writeFileSync(join(root, "dist", "index.html"),
  `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${body}</body>
</html>
`);
copyFileSync(join(root, "data", "bildungsplaene.js"), join(root, "dist", "bildungsplaene.js"));
console.log(`Gebaut aus ${scripts.length} Skriptdateien: dist/index.html, dist/merkwerk-artifact.html, dist/bildungsplaene.js`);
