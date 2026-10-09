/* ===================== Lernoptionen: Kacheln, Lernset-Auswahl, Wechsel zwischen Funktionen ===================== */
// Symbole (24er-Raster, Strich in Textfarbe)
const ICON={
  quiz:`<path d="M4 4.5h16v11.5H9.5L4 20z"/><path d="M9.8 8.6a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.4v.4"/><path d="M12 14.6v.1"/>`,
  cards:`<rect x="3" y="7.5" width="14" height="12" rx="2"/><path d="M7 7.5V5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/>`,
  audio:`<path d="M4 15.5v-3.5a8 8 0 0 1 16 0v3.5"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.6"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6"/>`,
  podcast:`<path d="M3 4.5h11v8.5H7.5L3 16.5z"/><path d="M17 8.5h4v9l-3.2-2.3H11.5V13"/>`,
  spark:`<path d="M11 3.5l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>`,
  exam:`<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="M9 12.5l2.2 2.2 4-4.2"/>`,
  lib:`<path d="M4.5 4h4v16h-4zM10.5 4h4v16h-4z"/><path d="M16.6 5.2l3.4.9-3.6 14.1-3.4-.9"/>`,
  cal:`<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>`,
  plan:`<path d="M10.5 6.5H20M10.5 12H20M10.5 17.5H20"/><path d="M3.5 6.5l1.6 1.6 2.6-2.8M3.5 12l1.6 1.6 2.6-2.8"/><circle cx="5.3" cy="17.5" r="1.3"/>`,
  due:`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`,
  plus:`<path d="M12 5v14M5 12h14"/>`,
  arrow:`<path d="M5 12h14M13 6l6 6-6 6"/>`,
  swap:`<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>`,
  upload:`<path d="M12 15.5V4M7 8.5L12 4l5 4.5"/><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/>`,
  play:`<path d="M8 5.5v13l10.5-6.5z"/>`,
};
const ic=(k,cls="")=>`<svg class="ic${cls?" "+cls:""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[k]||""}</svg>`;

// Die Lernoptionen in fester Reihenfolge (Startseite, Lernset-Leiste)
const MODES=[
  {k:"quiz",t:"Interaktive Abfrage",d:"Teste dein Wissen mit abwechslungsreichen Fragen.",icon:"quiz"},
  {k:"cards",t:"Karteikarten",d:"Wiederhole Begriffe und Definitionen in deinem Tempo.",icon:"cards"},
  {k:"monolog",t:"Audiozusammenfassung",d:"Höre eine Zusammenfassung deiner hochgeladenen Lernmaterialien.",icon:"audio"},
  {k:"podcast",t:"Podcast",d:"Lerne dieselben Inhalte als Gespräch zwischen zwei Stimmen.",icon:"podcast"},
  {k:"generate",t:"Lerninhalte generieren",d:"Erstelle passende Lerninhalte zu deinem Fach und Thema.",icon:"spark"},
  {k:"exam",t:"Probeklausur",d:"Schreib eine Klausur mit Zeitlimit und lass sie korrigieren.",icon:"exam"},
];
const modeByK=k=>MODES.find(x=>x.k===k)||null;

/* ---------- Zuletzt verwendet ---------- */
// S.recent: Lernset-ID → {at, mode}; liegt im App-Zustand des Kontos, die Lernsets selbst bleiben unverändert
function touchSet(id,mode){
  if(!id) return; const r=S.recent||(S.recent={}); const old=r[id]||{};
  r[id]={at:Date.now(),mode:mode||old.mode||null}; save(false);
}
const usedAt=s=>((S.recent||{})[s.id]||{}).at||s.createdAt||0;
const recentSets=()=>[...SETS].sort((a,b)=>usedAt(b)-usedAt(a));
const activeSetOrNull=()=>setById(S.activeSet)||null;
function agoLabel(t){
  if(!t) return ""; const d=daysBetween(new Date(t),today0());
  if(d<=0) return "heute"; if(d===1) return "gestern"; if(d<7) return `vor ${d} Tagen`;
  return new Date(t).toLocaleDateString("de-DE",{day:"numeric",month:"short"});
}
const runningExam=set=>(S.exams||[]).find(e=>e.phase!=="done"&&e.setIds.includes(set.id))||null;
// Womit „Weiterlernen“ fortsetzt: angefangene Abfrage, angefangene Karteikarten, sonst die zuletzt genutzte Lernoption
function resumeInfo(s){
  const R=s.round, F=s.fc, last=((S.recent||{})[s.id]||{}).mode;
  const quiz=R&&R.phase==="q"&&R.qs?{mode:"quiz",info:`Abfrage angefangen: Frage ${R.idx+1} von ${R.qs.length}`}:null;
  const cards=F&&F.phase==="card"&&F.idx>0&&s.cards?{mode:"cards",info:`Karteikarten angefangen: ${F.idx} von ${F.ids.length}`}:null;
  if(last==="cards"&&cards) return cards;
  if(quiz) return quiz;
  if(cards) return cards;
  if(last&&last!=="generate"&&modeByK(last)) return {mode:last,info:`Zuletzt: ${modeByK(last).t}`};
  return {mode:null,info:s.files.length?"Lernoption wählen":"Noch kein Material"};
}
function resumeSet(s){ const r=resumeInfo(s); S.activeSet=s.id; save(false); if(!r.mode) return go("learn",{setId:s.id,manage:true}); launchMode(s,r.mode); }

/* ---------- Lernoption für ein Lernset öffnen ---------- */
// Gewählte Lernoption, die nach dem Hochladen weitergeht (Hinweis im Lernset), nur bis zum Neuladen
let PENDING=null;
async function launchMode(set,mode){
  if(!set) return pickSetFor(mode);
  S.activeSet=set.id; save(false);
  const hasFiles=!!(set.files&&set.files.length);
  if(mode==="quiz"){
    if(set.round&&set.round.phase==="q"&&set.round.qs) return go("learn",{setId:set.id});
    if(!hasFiles) return needMaterial(set,mode);
    if(!CAP.sample&&!set.example) return needAI(set,mode);
    touchSet(set.id,"quiz"); go("learn",{setId:set.id,manage:true}); setTimeout(()=>startRound(set,{n:15}),30); return;
  }
  if(mode==="cards"){
    if(!hasFiles) return needMaterial(set,mode);
    if(set.cards&&set.cards.length) return openCards(set);
    go("learn",{setId:set.id,manage:true}); setTimeout(()=>openCards(set),30); return;
  }
  if(mode==="monolog"||mode==="podcast"){
    let open=null; try{ const meta=await audMeta(set.id); const r=((meta&&meta.recs)||[]).find(x=>x.fmt===mode); if(r) open=r.id; }catch{}
    return openAudio(set,{fmt:mode,...(open?{open}:{})});
  }
  if(mode==="generate"){
    if(set.example) return openNewSetDialog();
    touchSet(set.id); go("learn",{setId:set.id,manage:true});
    return set.topic?openGenModes(set):askTopic(set);
  }
  if(mode==="exam"){
    if(!hasFiles) return needMaterial(set,mode);
    const open=runningExam(set); if(open) return go("exam",{id:open.id});
    if(!CAP.sample) return needAI(set,mode);
    touchSet(set.id,"exam"); return openExamDialog(set);
  }
}
// Fehlt Material: ins Lernset, dort steht der nächste Schritt
function needMaterial(set,mode){
  PENDING={setId:set.id,mode}; go("learn",{setId:set.id,manage:true});
  setTimeout(()=>{ const d=$("#dz"); if(d){ d.scrollIntoView({block:"center"}); d.focus(); } },60);
}
// Fehlt die KI: erklären und eine Lernoption anbieten, die auch ohne funktioniert
function needAI(set,mode){
  const M=modeByK(mode);
  modal(`<h2>${esc(M.t)} braucht KI</h2>
    <p>${mode==="exam"?"Bei der Probeklausur stellt Claude die Aufgaben zusammen und korrigiert sie.":"Bei der interaktiven Abfrage erstellt Claude die Fragen aus deinem Material und bewertet deine Antworten."} Auf dieser Seite ist die KI noch nicht eingerichtet. In Merkwerk in claude.ai funktioniert es.</p>
    <p class="small muted">Ohne KI kannst du mit Karteikarten lernen oder die Abfrage am Beispiel zur Photosynthese ausprobieren.</p>
    <div class="row"><button class="btn primary" id="naCards">${ic("cards")} Karteikarten öffnen</button><button class="btn" id="naEx">Beispiel ausprobieren</button><span class="spacer"></span><button class="btn ghost" data-close>Schließen</button></div>`,(m,close)=>{
    $("#naCards",m).onclick=()=>{ close(); launchMode(set,"cards"); };
    $("#naEx",m).onclick=async()=>{ close(); const s=await makeExampleSet(); launchMode(s,mode==="exam"?"quiz":mode); };
  });
}
// Lerninhalte generieren braucht ein Thema
function askTopic(set){
  const topics=curatedTopics(set.subject);
  modal(`<h2>Lerninhalte generieren</h2><p class="small muted">Für das Lernset „${esc(set.name)}“${set.subject?` · ${esc(set.subject)}`:""}</p>
    <label class="f">Zu welchem Thema?<input type="text" id="atT" list="atList" placeholder="z. B. Lineare Funktionen" autocomplete="off"><datalist id="atList">${topics.map(t=>`<option value="${esc(t)}">`).join("")}</datalist></label>
    <div class="row"><button class="btn primary" id="atOk">Weiter</button><button class="btn ghost" data-close>Abbrechen</button></div>`,(m,close)=>{
    const i=$("#atT",m); i.focus();
    const ok=async()=>{ const t=i.value.trim(); if(!t){ toast("Gib zuerst ein Thema ein"); i.focus(); return; }
      set.topic=t; if(/^Lernset \d+$/.test(set.name)||set.name==="Neues Lernset") set.name=t; await putSet(set); close(); go("learn",{setId:set.id,manage:true}); openGenModes(set); };
    $("#atOk",m).onclick=ok; i.onkeydown=e=>{ if(e.key==="Enter") ok(); };
  });
}

/* ---------- Lernset auswählen oder neu erstellen ---------- */
// mode: Lernoption, die danach startet (null = nur auswählen)
function setInfoLine(s,mode){
  const n=s.files.length, own=audEligible(s).length;
  const parts=[s.subject||"", n?`${n} Datei${n===1?"":"en"}`:"noch kein Material"];
  if((mode==="monolog"||mode==="podcast")&&n&&!own) parts.push("keine hochgeladenen Dateien");
  return parts.filter(Boolean).join(" · ");
}
function pickSetFor(mode,{title}={}){
  const M=modeByK(mode), list=recentSets(), cur=activeSetOrNull();
  modal(`<div class="stack" style="gap:4px"><h2>${esc(title||(M?`${M.t}: Lernset wählen`:"Lernset wählen"))}</h2>
      <p class="small muted">${M?`Wähle, mit welchem Lernset du ${mode==="generate"?"Lerninhalte generieren":"„"+esc(M.t)+"“ öffnen"} willst, oder erstelle ein neues.`:"Das ausgewählte Lernset nutzen alle Lernoptionen."}</p></div>
    ${list.length?`<div class="pick-list" role="list">${list.map(s=>`<button type="button" class="pick" role="listitem" data-pick="${s.id}" ${cur&&cur.id===s.id?'aria-current="true"':""}>
        <span class="grow stack" style="gap:2px;min-width:0"><b>${esc(s.name)}${s.example?' <span class="pill mark">Beispiel</span>':""}</b><span class="small muted">${esc(setInfoLine(s,mode))}</span></span>
        ${cur&&cur.id===s.id?'<span class="pill">ausgewählt</span>':""}${ic("arrow")}</button>`).join("")}</div>`
      :`<div class="empty">Du hast noch kein Lernset.</div>`}
    <div class="row"><button class="btn primary" id="pkNew">${ic("plus")} Neues Lernset erstellen</button>${SETS.some(s=>s.example)?"":`<button class="btn" id="pkEx">Beispiel ausprobieren</button>`}<span class="spacer"></span><button class="btn ghost" data-close>Abbrechen</button></div>`,(m,close)=>{
    $$("[data-pick]",m).forEach(b=>b.onclick=()=>{ const s=setById(b.dataset.pick); close(); S.activeSet=s.id; save(false);
      if(mode) launchMode(s,mode); else { touchSet(s.id); render(); toast(`Lernset „${s.name}“ ausgewählt`); } });
    $("#pkNew",m).onclick=()=>{ close(); openNewSetDialog(mode&&mode!=="generate"?{then:mode}:{}); };
    const ex=$("#pkEx",m); if(ex) ex.onclick=async()=>{ close(); const s=await makeExampleSet(); S.activeSet=s.id; save();
      if(mode&&mode!=="generate") launchMode(s,mode); else go("learn",{setId:s.id,manage:true}); };
    const first=$("[aria-current='true']",m)||$("[data-pick]",m)||$("#pkNew",m); if(first) first.focus();
  });
}

/* ---------- Lernset-Leiste in den Lernansichten ---------- */
// Zeigt, welches Lernset gerade läuft, und wechselt Lernset oder Lernoption; Fortschritte bleiben am Lernset gespeichert
function modeBarHTML(set,cur){
  return `<div class="modebar">
    <div class="modebar-set"><span class="modebar-k">Lernset</span><b class="modebar-n">${esc(set.name)}</b>${set.subject?`<span class="small muted">${esc(set.subject)}</span>`:""}${set.example?'<span class="pill mark">Beispiel</span>':""}
      <span class="spacer"></span><button class="btn sm" id="mbSwitch" type="button">${ic("swap")} Lernset wechseln</button><button class="btn ghost sm" id="backSets" type="button">Material &amp; Einstellungen</button></div>
    <nav class="modebar-modes" aria-label="Lernoptionen für dieses Lernset">${MODES.filter(x=>x.k!=="generate").map(x=>`<button type="button" class="chip" data-mb="${x.k}" aria-pressed="${x.k===cur}"${x.k===cur?' aria-current="page"':""}>${ic(x.icon)}<span>${esc(x.t)}</span></button>`).join("")}</nav>
  </div>`;
}
function bindModeBar(set,cur){
  const sw=$("#mbSwitch"); if(sw) sw.onclick=()=>pickSetFor(cur,{title:"Lernset wechseln"});
  const bk=$("#backSets"); if(bk) bk.onclick=()=>go("learn",{setId:set.id,manage:true});
  $$("[data-mb]").forEach(b=>b.onclick=()=>{ if(b.dataset.mb===cur) return; launchMode(set,b.dataset.mb); });
}

/* ---------- Kacheln ---------- */
// Zustand einer Lernoption für das ausgewählte Lernset: Hinweiszeile, Warnung (fehlende Voraussetzung), Beschriftung der Schaltfläche
function modeState(set,k){
  if(!set) return {s:"Lernset wählen oder neu erstellen",warn:false,cta:"Auswählen"};
  const files=set.files.length, ai=!!CAP.sample||set.example;
  if(k==="quiz"){
    const R=set.round;
    if(R&&R.phase==="q"&&R.qs) return {s:`Angefangen: Frage ${R.idx+1} von ${R.qs.length}`,cta:"Weiterlernen"};
    if(!files) return {s:"Lade zuerst Lernmaterial hoch",warn:true,cta:"Material hochladen"};
    if(!ai) return {s:"Braucht KI (in claude.ai verfügbar)",warn:true,cta:"Mehr erfahren"};
    const last=(set.history||[]).slice(-1)[0];
    return {s:last?`Letzter Durchgang: ${last.pct} %`:"15 belegte Prüfungsfragen",cta:"Starten"};
  }
  if(k==="cards"){
    const F=set.fc;
    if(!files) return {s:"Lade zuerst Lernmaterial hoch",warn:true,cta:"Material hochladen"};
    if(F&&F.phase==="card"&&F.idx>0&&set.cards) return {s:`Angefangen: ${F.idx} von ${F.ids.length} Karten`,cta:"Weiterlernen"};
    if(set.cards&&set.cards.length) return {s:`${set.cards.length} Karten`,cta:"Üben"};
    return {s:"Karten entstehen aus deinem Material",cta:"Starten"};
  }
  if(k==="monolog"||k==="podcast"){
    if(!audEligible(set).length) return {s:"Braucht hochgeladene Dateien",warn:true,cta:"Material hochladen"};
    return {s:"Noch keine Aufnahme",cta:"Erstellen"};
  }
  if(k==="generate"){
    if(set.example) return {s:"Für ein neues Lernset",cta:"Generieren"};
    return {s:set.topic?`Thema: ${set.topic}`:"Thema wählen",cta:"Generieren"};
  }
  if(k==="exam"){
    const open=runningExam(set);
    if(open) return {s:`Angefangen: ${open.title}`,cta:"Fortsetzen"};
    if(!files) return {s:"Lade zuerst Lernmaterial hoch",warn:true,cta:"Material hochladen"};
    if(!CAP.sample) return {s:"Braucht KI (in claude.ai verfügbar)",warn:true,cta:"Mehr erfahren"};
    return {s:"Aus allen Lernsets des Fachs",cta:"Starten"};
  }
  return {s:"",cta:"Öffnen"};
}
function tileHTML(M,set){
  const st=modeState(set,M.k);
  return `<button type="button" class="tile" data-mode="${M.k}" aria-describedby="td_${M.k} ts_${M.k}">
    <span class="tile-ic">${ic(M.icon)}</span>
    <span class="tile-t">${esc(M.t)}</span>
    <span class="tile-d" id="td_${M.k}">${esc(M.d)}</span>
    <span class="tile-s${st.warn?" warn":""}" id="ts_${M.k}">${esc(st.s)}</span>
    <span class="tile-cta"><span class="tile-cta-t">${esc(st.cta)}</span>${ic("arrow")}</span>
  </button>`;
}
function bindTiles(root){
  $$(".tile[data-mode]",root).forEach(b=>b.onclick=async()=>{
    if(b.getAttribute("aria-busy")==="true") return;
    const k=b.dataset.mode, set=activeSetOrNull();
    if(!set) return pickSetFor(k);
    const t=$(".tile-cta-t",b), was=t.textContent; b.setAttribute("aria-busy","true"); t.textContent="Wird geöffnet …";
    try{ await launchMode(set,k); }finally{ if(document.body.contains(b)){ b.removeAttribute("aria-busy"); t.textContent=was; } }
  });
}
// Aufnahmen nachladen (IndexedDB): „2 Aufnahmen“ und „Anhören“
async function fillAudioTiles(root,set){
  if(!set||!audEligible(set).length) return;
  let recs=[]; try{ const meta=await audMeta(set.id); recs=(meta&&meta.recs)||[]; }catch{ return; }
  for(const k of ["monolog","podcast"]){
    const n=recs.filter(r=>r.fmt===k).length, b=$(`.tile[data-mode="${k}"]`,root); if(!b||!n) continue;
    $(".tile-s",b).textContent=`${n} Aufnahme${n===1?"":"n"} vorhanden`; $(".tile-cta-t",b).textContent="Anhören";
  }
}
