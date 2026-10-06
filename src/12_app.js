/* ===================== Als App: installieren, offline starten, Daten sichern, Rechtliches ===================== */
/* Auf GitHub Pages ist Merkwerk eine installierbare Web-App (manifest.webmanifest + sw.js aus public/ und build.mjs).
   In claude.ai läuft die Seite in einem Artifact; dort gibt es keine Installation und keinen Service Worker. */
const SITE_URL="https://cripplecoding.github.io/Merkwerk/";
const inClaude=()=>!!(window.claude&&window.claude.use);
const legalUrl=p=>(inClaude()||location.protocol==="file:"?SITE_URL:"")+p;
const isStandalone=()=>{ try{ return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true; }catch{ return false; } };
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const canInstall=()=>!inClaude()&&!isStandalone()&&location.protocol!=="file:";

let installEvt=null; // Chrome, Edge, Samsung Internet: eigener Installationsdialog
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); installEvt=e; renderInstallSlot(); });
window.addEventListener("appinstalled",()=>{ installEvt=null; renderInstallSlot(); toast("Merkwerk ist jetzt als App installiert"); });

if("serviceWorker" in navigator&&!inClaude()&&location.protocol==="https:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}

async function installApp(){
  if(installEvt){
    const e=installEvt; installEvt=null;
    try{ await e.prompt(); await e.userChoice; }catch{}
    renderInstallSlot(); return;
  }
  const ua=navigator.userAgent;
  const steps=isIOS()
    ? `<ol><li>Öffne Merkwerk in <b>Safari</b>.</li><li>Tippe unten auf <b>Teilen</b> (Quadrat mit Pfeil nach oben).</li><li>Wähle <b>Zum Home-Bildschirm</b> und tippe auf <b>Hinzufügen</b>.</li></ol>`
    : /Android/i.test(ua)
    ? `<ol><li>Öffne Merkwerk in <b>Chrome</b>.</li><li>Tippe oben rechts auf <b>⋮</b>.</li><li>Wähle <b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b>.</li></ol>`
    : /Firefox/i.test(ua)
    ? `<p>Firefox kann Web-Apps am Computer nicht installieren. Öffne ${esc(SITE_URL)} in <b>Chrome</b> oder <b>Edge</b> und klicke rechts in der Adressleiste auf das Symbol <b>App installieren</b>.</p>`
    : /Safari/i.test(ua)&&!/Chrome|Edg/i.test(ua)
    ? `<p>Klicke in Safari auf <b>Ablage → Zum Dock hinzufügen</b>.</p>`
    : `<p>Klicke rechts in der Adressleiste auf das Symbol <b>App installieren</b> (Bildschirm mit Pfeil) oder öffne das Browsermenü und wähle <b>Merkwerk installieren</b>.</p>`;
  modal(`<h2>Merkwerk als App</h2>
    <p>Merkwerk lässt sich ohne App Store installieren. Danach startet es mit eigenem Symbol, im eigenen Fenster und auch ohne Internet.</p>
    ${steps}
    <p class="small muted">Deine Lernsets und Termine bleiben auf dem Gerät, auf dem du sie angelegt hast. Mit „Daten sichern“ im Kontomenü nimmst du sie auf ein anderes Gerät mit.</p>
    <div class="row"><span class="spacer"></span><button class="btn" data-close>Schließen</button></div>`);
}

// Hinweis auf der Startseite, solange Merkwerk noch nicht installiert ist und der Browser es anbietet
function renderInstallSlot(){
  const el=$("#installSlot"); if(!el) return;
  const show=canInstall()&&(installEvt||isIOS())&&!S.dismissed.install;
  el.innerHTML=show?`<section class="sheet row install-card"><img src="icons/icon-192.png" alt="" width="44" height="44"><div class="grow stack" style="gap:2px;flex:1;min-width:0"><b>Merkwerk als App installieren</b><span class="small muted">Eigenes Symbol auf dem Startbildschirm, startet auch offline.</span></div><button class="btn primary" id="instGo">Installieren</button><button class="btn ghost sm" id="instNo" aria-label="Hinweis ausblenden">Später</button></section>`:"";
  if(!show) return;
  $("#instGo",el).onclick=installApp;
  $("#instNo",el).onclick=()=>{ S.dismissed.install=true; save(); renderInstallSlot(); };
}

function renderFooter(){
  const f=$("#appFoot"); if(!f) return;
  f.innerHTML=`<div class="foot-in">${canInstall()?`<button class="linkbtn" id="footInstall" type="button">App installieren</button><span aria-hidden="true">·</span>`:""}<a href="${legalUrl("datenschutz.html")}" target="${inClaude()?"_blank":"_self"}" rel="noopener">Datenschutz</a><span aria-hidden="true">·</span><a href="${legalUrl("impressum.html")}" target="${inClaude()?"_blank":"_self"}" rel="noopener">Impressum</a></div>`;
  const b=$("#footInstall",f); if(b) b.onclick=installApp;
}

/* ---------- Alle Daten sichern und auf einem anderen Gerät laden ---------- */
// Merkwerk speichert nur im Browser. Die Sicherung enthält Profil, Termine, Stundenplan und alle Lernsets mit Material.
function backupData(state,sets){ return {app:"merkwerk",format:1,exportedAt:new Date().toISOString(),state,sets}; }
function parseBackup(text){
  let d; try{ d=JSON.parse(text); }catch{ throw new Error("Die Datei ist keine Merkwerk-Sicherung."); }
  if(!d||d.app!=="merkwerk"||typeof d.state!=="object"||!Array.isArray(d.sets)) throw new Error("Die Datei ist keine Merkwerk-Sicherung.");
  if(d.format>1) throw new Error("Diese Sicherung stammt aus einer neueren Merkwerk-Version. Lade die Seite neu und versuch es noch einmal.");
  return {state:d.state, sets:d.sets.filter(s=>s&&s.id&&Array.isArray(s.files))};
}
async function exportAll(){
  const sets=await idb.all();
  const data=JSON.stringify(backupData(S,sets));
  const filename=`merkwerk-sicherung-${isoDate(new Date())}.json`;
  if(CAP.downloads){ try{ await CAP.downloads.save({filename,data}); }catch(e){ if(e&&e.code!=="declined") toast("Speichern nicht möglich"); } return; }
  const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));
  const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  toast(`Gesichert: ${sets.filter(s=>!s.example).length} Lernsets, ${S.items.length} Termine`);
}
function importAll(){
  const inp=document.createElement("input"); inp.type="file"; inp.accept=".json,application/json";
  inp.onchange=async()=>{
    const file=inp.files&&inp.files[0]; if(!file) return;
    let b; try{ b=parseBackup(await file.text()); }catch(e){ toast(e.message,4000); return; }
    if(!await confirmBox(`Sicherung mit ${b.sets.length} Lernsets laden? Profil, Termine und Stundenplan auf diesem Gerät werden ersetzt, vorhandene Lernsets bleiben.`,"Laden")) return;
    S=Object.assign(DEFAULT_STATE(),b.state); save();
    for(const s of b.sets) await putSet(s);
    await loadSets(); render(); toast("Sicherung geladen");
  };
  inp.click();
}
