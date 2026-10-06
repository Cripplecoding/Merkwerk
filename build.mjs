// Baut Merkwerk aus src/ zu zwei Dateien:
//   dist/index.html             – eigenständige Seite (Doppelklick im Browser oder GitHub Pages)
//   dist/merkwerk-artifact.html – Inhalt für ein claude.ai-Artifact (ohne doctype/head/body; der Viewer ergänzt das Gerüst)
//   dist/bildungsplaene.js      – Bildungsplan-Daten, lädt die Seite erst bei Bedarf (beim Artifact als zusätzliche Datei veröffentlichen)
// Dazu für die installierbare Web-App auf GitHub Pages: alles aus public/ (Manifest, Symbole, Schriften, Datenschutz, Impressum)
// und dist/sw.js, der Service Worker, der die App für den Offline-Start zwischenspeichert.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, cpSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { createHash } from "node:crypto";
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

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "merkwerk-artifact.html"), body);
// Eigenständige Seite: Schriften vom eigenen Server statt von Google Fonts (Datenschutz), App-Manifest und Symbole im Kopf
const fontLinks = /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\n<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/[^"]*">/;
if (!fontLinks.test(body)) throw new Error("Google-Fonts-Links in src/01_head.html nicht gefunden – build.mjs anpassen");
const pageBody = body.replace(fontLinks, `<link rel="stylesheet" href="fonts/fonts.css">`);
writeFileSync(join(root, "dist", "index.html"),
  `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Belegte Prüfungsfragen und Karteikarten aus deinem eigenen Lernmaterial, dazu Stundenplan, Klausuren und Lernplan.">
<meta name="theme-color" content="#f5f7f4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#11141b" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="icon" href="icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Merkwerk">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${pageBody}</body>
</html>
`);
copyFileSync(join(root, "data", "bildungsplaene.js"), join(root, "dist", "bildungsplaene.js"));
cpSync(join(root, "public"), join(root, "dist"), { recursive: true });

// Service Worker: Dateien der App vorab speichern. Die Version ergibt sich aus dem Inhalt, damit jede Änderung
// den alten Zwischenspeicher ersetzt.
const files = [];
const walk = d => readdirSync(d).forEach(f => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); });
walk(join(root, "dist"));
const precache = files.map(p => relative(join(root, "dist"), p).split("\\").join("/"))
  .filter(f => f !== "sw.js" && f !== "merkwerk-artifact.html" && !f.endsWith(".txt") && !f.endsWith("-italic.woff2")).sort();
const hash = createHash("sha256");
for (const f of precache) hash.update(f).update(readFileSync(join(root, "dist", f)));
const version = hash.digest("hex").slice(0, 12);
writeFileSync(join(root, "dist", "sw.js"),
  readFileSync(join(src, "sw", "service-worker.js"), "utf8").replace("__VERSION__", version).replace("__FILES__", JSON.stringify(["./", ...precache.filter(f => f !== "index.html")])));
console.log(`Gebaut aus ${scripts.length} Skriptdateien: dist/index.html, dist/merkwerk-artifact.html, dist/bildungsplaene.js, dist/sw.js (Version ${version}) mit ${precache.length} Dateien für den Offline-Start`);
