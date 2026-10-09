/* ===================== Startseite ===================== */
// Aufbau: Begrüßung mit Hauptaktion → (neu: kurze Einführung) → zuletzt verwendete Lernsets → alle Lernoptionen als Kacheln
// → Bibliothek, Stundenplan, Lernplan → anstehende Lerneinheiten, Abgaben und Klausuren → heutiger Stundenplan
const firstName=n=>String(n||"").trim().split(/\s+/)[0]||"";
function setCardHTML(s,active){
  const cov=coverageOf(s), last=(s.history||[]).slice(-1)[0], r=resumeInfo(s), F=s.fc;
  const known=F&&F.phase==="end"?fcResult(F).known:null;
  return `<article class="set-card${active?" on":""}">
    <div class="stack" style="gap:3px;min-width:0">${s.example||active?`<div class="row" style="gap:6px">${active?'<span class="pill">ausgewählt</span>':""}${s.example?'<span class="pill mark">Beispiel</span>':""}</div>`:""}
      <h3 class="set-name">${esc(s.name)}</h3>
      <span class="small muted">${esc([s.subject,`${s.files.length} Datei${s.files.length===1?"":"en"}`,usedAt(s)?"genutzt "+agoLabel(usedAt(s)):""].filter(Boolean).join(" · "))}</span></div>
    <div class="stack" style="gap:4px"><div class="bar mark" role="img" aria-label="${cov.pct} % der Abschnitte abgefragt"><i style="width:${cov.pct}%"></i></div>
      <span class="small muted">${cov.n?`${cov.pct} % abgefragt`:"Noch keine Abschnitte"}${last?` · letzter Durchgang ${last.pct} %`:""}${known!=null?` · ${known} Karten gewusst`:""}</span></div>
    <p class="small set-next">${esc(r.info)}</p>
    <div class="row" style="gap:6px;margin-top:auto"><button class="btn primary" data-resume="${s.id}">${s.files.length?`${ic("play")} Weiterlernen`:`${ic("upload")} Material hochladen`}</button>${active?"":`<button class="btn ghost sm" data-select="${s.id}">Auswählen</button>`}</div>
  </article>`;
}
// Lerneinheiten aus allen Lernplänen ab heute (heute zuerst), mit direkter Aktion
function upcomingSessions(days=7){
  const t0=today0(), tISO=isoDate(t0), end=isoDate(new Date(t0.getTime()+days*864e5));
  return S.items.filter(it=>!it.done&&it.plan).flatMap(it=>it.plan.days.filter(d=>!d.done&&d.date>=tISO&&d.date<=end).map(d=>({it,d})))
    .sort((a,b)=>a.d.date.localeCompare(b.d.date)).slice(0,6);
}
function sessionHTML({it,d}){
  const t0=today0(), left=daysBetween(t0,parseISO(d.date));
  const when=left===0?"Heute":left===1?"Morgen":fmtDate(d.date,{weekday:"long"});
  const what=d.kind==="wiederholung"?"Wiederholung":d.kind==="hoeren"?`Hörphase: ${(AUD_FORMATS[d.fmt]||AUD_FORMATS.monolog).n}, ca. ${Math.round(d.minutes||0)} Min.`:`Neue Abschnitte: ${d.sectionIds.length}`;
  return `<div class="li"><span class="pill ${left===0?"mark":""}">${esc(when)}</span><div class="grow"><b>${esc(it.title)}</b><div class="small muted">${esc(what)} · ${TYPE_NAME[it.type]} ${leftLabel(daysBetween(t0,parseISO(it.date)))}</div></div>
    <button class="btn sm ${left===0?"primary":""}" data-pl="${it.id}|${d.date}|${d.kind}">${d.kind==="hoeren"?"Anhören":"Starten"}</button></div>`;
}
VIEWS.home = async function(m){
  if(!SETS.length) await loadSets();
  const acc=currentAccount(), guest=!!acc&&acc.provider==="guest";
  const now=new Date(), t0=today0(), tISO=isoDate(t0);
  const own=SETS.filter(s=>!s.example), active=activeSetOrNull(), recent=recentSets().slice(0,4);
  const intro=!own.length;
  const name=guest||!acc||acc.provider==="claude"?"":firstName(accountLabel(acc));
  const rem=dueReminders(), sessions=upcomingSessions();
  const soon=S.items.filter(it=>!it.done).map(it=>({it,left:daysBetween(t0,parseISO(it.date))})).filter(x=>x.left>=0&&x.left<=21&&!rem.some(r=>r.it.id===x.it.id)).sort((a,b)=>a.left-b.left).slice(0,5);
  const lessons=lessonsOn(now), nowM=now.getHours()*60+now.getMinutes(), next=lessons.find(l=>!l.cancelled&&toMin(l.end)>nowM);
  const evToday=(S.events||[]).filter(e=>e.kind!=="frei"&&e.start.slice(0,10)===tISO).sort((a,b)=>a.start.localeCompare(b.start));
  m.innerHTML=`<div class="view home">
   <section class="hero">
     <div class="stack" style="gap:6px;min-width:0">
       <span class="label">${now.toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}</span>
       <h1>Hallo<span id="hiName">${name?", "+esc(name):""}</span>!</h1>
       <p class="muted">${guest?`Du lernst ohne Konto, deine Inhalte bleiben nur in diesem Browser. <button class="linkbtn" id="hGuest">Konto anlegen</button>`
         :intro?"Schön, dass du da bist. Leg los mit deinem ersten Lernset.":"Schön, dass du wieder da bist. Mach weiter, wo du aufgehört hast."}</p>
     </div>
     ${intro?"":`<button class="btn primary btn-lg" id="hNew">${ic("plus")} Neues Lernset erstellen</button>`}
   </section>
   ${intro?`<section class="sheet intro stack">
     <h2>So startest du mit Merkwerk</h2>
     <ol class="steps">
       <li><b>Lernset anlegen</b><span class="small muted">Fach und Thema wählen, Merkwerk schlägt Themen aus deinem Bildungsplan vor.</span></li>
       <li><b>Material hinzufügen</b><span class="small muted">PDF, Word, Fotos oder GoodNotes hochladen oder Lerninhalte generieren lassen.</span></li>
       <li><b>Lernoption wählen</b><span class="small muted">Abfrage, Karteikarten, Audiozusammenfassung, Podcast oder Probeklausur.</span></li>
     </ol>
     <div class="row"><button class="btn primary btn-lg" id="hFirst">${ic("plus")} Erstes Lernset erstellen</button>${SETS.some(s=>s.example)?"":`<button class="btn btn-lg" id="hEx">Beispiel ausprobieren</button>`}${S.profile?"":`<button class="btn ghost" id="hProf">Schule oder Studium angeben</button>`}</div>
   </section>`:""}
   <div id="installSlot"></div>
   ${recent.length?`<section class="stack" aria-labelledby="hRecent">
     <div class="sec-head"><h2 id="hRecent">Zuletzt verwendet</h2><span class="spacer"></span>${SETS.length>recent.length?`<button class="btn ghost sm" id="hAll">Alle Lernsets (${SETS.length})</button>`:`<button class="btn ghost sm" id="hAll">Lernsets verwalten</button>`}</div>
     <div class="set-grid">${recent.map(s=>setCardHTML(s,active&&active.id===s.id)).join("")}</div>
   </section>`:""}
   <section class="stack" aria-labelledby="hModes">
     <div class="sec-head"><h2 id="hModes">Lernoptionen</h2><span class="spacer"></span>
       <div class="cur-set">${active?`<span class="small muted">für</span> <b>${esc(active.name)}</b> <button class="btn sm" id="hSwitch">${ic("swap")} Wechseln</button>`
         :`<span class="small muted">${SETS.length?"Noch kein Lernset ausgewählt":"Wähle eine Lernoption und erstelle dabei dein Lernset"}</span>${SETS.length?` <button class="btn sm" id="hSwitch">Lernset wählen</button>`:""}`}</div></div>
     <div class="tiles" id="tiles">${MODES.map(M=>tileHTML(M,active)).join("")}</div>
   </section>
   <section class="stack" aria-labelledby="hOrg">
     <div class="sec-head"><h2 id="hOrg">Lernorganisation</h2></div>
     <div class="org">
       <button type="button" class="org-tile" data-org="lib">${ic("lib")}<span class="stack" style="gap:1px"><b>Bibliothek</b><span class="small muted">Material anderer zu deinen Fächern</span></span></button>
       <button type="button" class="org-tile" data-org="tt">${ic("cal")}<span class="stack" style="gap:1px"><b>Stundenplan</b><span class="small muted">${S.timetable.entries.length?"Unterricht und Termine im Kalender":"Per Screenshot oder Kalender importieren"}</span></span></button>
       <button type="button" class="org-tile" data-org="plan">${ic("plan")}<span class="stack" style="gap:1px"><b>Lernplan</b><span class="small muted">${S.items.some(i=>!i.done&&i.plan)?"Lerneinheiten bis zur Klausur":"Bis zur nächsten Klausur planen"}</span></span></button>
     </div>
     <div class="grid2">
       <section class="sheet stack"><div class="row"><h3>Anstehende Lerneinheiten</h3><span class="spacer"></span><button class="btn ghost sm" data-org="plan">Lernpläne</button></div>
         ${sessions.length?`<div class="list">${sessions.map(sessionHTML).join("")}</div>`
           :`<p class="small muted">${S.items.some(i=>!i.done)?"In den nächsten sieben Tagen ist nichts eingeplant. Öffne eine Klausur oder Abgabe, um einen Lernplan zu erstellen.":"Noch kein Lernplan. Trag eine Klausur ein und lass dir einen Lernplan bis zum Termin erstellen."}</p>
             <div><button class="btn sm" id="hAddIt">${ic("plus")} Klausur oder Abgabe eintragen</button></div>`}
       </section>
       <section class="sheet stack"><div class="row"><h3>Abgaben &amp; Klausuren</h3><span class="spacer"></span><button class="btn ghost sm" id="toDue">Alle Termine</button></div>
         ${rem.length?remHTML(rem):""}
         ${soon.length?`<div class="list">${soon.map(({it})=>itemRow(it)).join("")}</div>`:rem.length?"":`<p class="small muted">Keine Abgaben oder Klausuren in den nächsten drei Wochen.</p>`}
       </section>
     </div>
     ${lessons.length||evToday.length?`<section class="sheet stack"><div class="row"><h3>Heute im Stundenplan</h3><span class="spacer"></span><button class="btn ghost sm" id="toTT">Kalender</button></div>
       <div class="list">${evToday.map(e=>`<div class="li"><span class="mono small" style="min-width:92px">${e.allDay?"ganztägig":e.start.slice(11,16)+"–"+(e.end||"").slice(11,16)}</span><div class="grow"><b>${esc(e.title)}</b><div class="small muted">Termin</div></div></div>`).join("")}
       ${lessons.map(l=>`<div class="li${l===next?" li-now":""}"><span class="mono small" style="min-width:92px">${l.start}–${l.end}</span><div class="grow"><b style="${l.cancelled?"text-decoration:line-through;opacity:.6":""}">${esc(l.subject)}</b>${l.cancelled?' <span class="pill bad">entfällt</span>':""}${l.moved?' <span class="pill">verlegt</span>':""}<div class="small muted">${esc([l.room,l.teacher].filter(Boolean).join(" · "))}</div></div>${l===next?`<span class="pill">${toMin(l.start)<=nowM?"jetzt":"als Nächstes"}</span>`:""}</div>`).join("")}</div></section>`:""}
   </section>
  </div>`;
  const on=(id,fn)=>{ const e=$("#"+id,m); if(e) e.onclick=fn; };
  on("hNew",()=>openNewSetDialog()); on("hFirst",()=>openNewSetDialog());
  on("hEx",async()=>{ const s=await makeExampleSet(); S.activeSet=s.id; touchSet(s.id); save(); go("learn",{setId:s.id,manage:true}); });
  on("hProf",()=>openWizard()); on("hGuest",()=>openGuestMenu());
  on("hAll",()=>go("learn",{manage:true})); on("hSwitch",()=>pickSetFor(null));
  on("hAddIt",()=>editItem()); on("toDue",()=>go("due")); on("toTT",()=>go("tt"));
  $$("[data-org]",m).forEach(b=>b.onclick=()=>{ const k=b.dataset.org; k==="plan"?go("due",{plans:true}):go(k); });
  $$("[data-resume]",m).forEach(b=>b.onclick=()=>resumeSet(setById(b.dataset.resume)));
  $$("[data-select]",m).forEach(b=>b.onclick=()=>{ const s=setById(b.dataset.select); S.activeSet=s.id; touchSet(s.id); render(); toast(`Lernset „${s.name}“ ausgewählt`); });
  $$("[data-pl]",m).forEach(b=>b.onclick=()=>{ const [id,date,kind]=b.dataset.pl.split("|"); const it=S.items.find(x=>x.id===id); startPlanDay(it,it.plan.days.find(d=>d.date===date&&d.kind===kind)); });
  bindTiles(m); bindRem(m); bindRows(m);
  fillAudioTiles(m,active);
  if(typeof renderInstallSlot==="function") renderInstallSlot();
  if(acc&&acc.provider==="claude") claudeName().then(n=>{ const e=$("#hiName"); if(e&&n) e.textContent=", "+firstName(n); });
};
