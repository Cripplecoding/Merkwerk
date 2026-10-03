/* ===================== Profil-Abfrage ===================== */
function wizardHTML(p){
  p=p||{};
  const track=p.track||"";
  return `<div class="stack" style="gap:16px" id="wiz">
   <div class="stack" style="gap:4px"><h2>Wo lernst du?</h2><p class="muted">Danach zeigt dir Merkwerk die passenden Fächer oder Module und die offiziellen Bildungspläne.</p></div>
   <div class="grid2">
     <button class="wizard-opt" data-track="schule" aria-pressed="${track==="schule"}" style="${track==="schule"?"border-color:var(--accent);background:var(--accent-soft)":""}"><b>Ich gehe zur Schule</b><span class="small muted">Grundschule bis Abitur, Berufsschule</span></button>
     <button class="wizard-opt" data-track="uni" aria-pressed="${track==="uni"}" style="${track==="uni"?"border-color:var(--accent);background:var(--accent-soft)":""}"><b>Ich studiere</b><span class="small muted">Universität, Hochschule, Duale Hochschule</span></button>
   </div>
   <div id="wizFields"></div>
  </div>`;
}
function mountWizard(root,onDone){
  const draft={...(S.profile||{})};
  const fields=$("#wizFields",root);
  const draw=()=>{
    $$("[data-track]",root).forEach(b=>{const on=b.dataset.track===draft.track; b.style.borderColor=on?"var(--accent)":""; b.style.background=on?"var(--accent-soft)":""; b.setAttribute("aria-pressed",on);});
    if(draft.track==="schule"){
      const grades=draft.type?gradesFor(draft.type,draft.state):[];
      const tdef=SCHOOL_TYPES.find(t=>t.k===draft.type);
      fields.innerHTML=`<div class="grid3" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">
        <label class="f">Bundesland<select id="wState"><option value="">Bitte wählen</option>${STATES.map(s=>`<option value="${s.k}" ${draft.state===s.k?"selected":""}>${esc(s.n)}</option>`).join("")}</select></label>
        <label class="f">Schulart<select id="wType" ${draft.state?"":"disabled"}><option value="">Bitte wählen</option>${SCHOOL_TYPES.filter(t=>!(t.k==="bg"&&draft.state==="BY")).map(t=>`<option value="${t.k}" ${draft.type===t.k?"selected":""}>${esc(schoolTypeName(t.k,draft.state))}</option>`).join("")}</select></label>
        <label class="f">${tdef&&tdef.gradeLabel?tdef.gradeLabel:"Klassenstufe"}<select id="wGrade" ${grades.length?"":"disabled"}><option value="">Bitte wählen</option>${grades.map(g=>`<option ${Number(draft.grade)===g?"selected":""}>${g}</option>`).join("")}</select></label>
      </div>
      ${draft.state==="BW"&&draft.type==="gym"?`<p class="small muted">Baden-Württemberg kehrt zu G9 zurück: Seit 2025/26 lernen die Klassen 5 und 6 nach G9, höhere Jahrgänge machen das Abitur noch nach Klasse 12.</p>`:""}
      <div class="row" style="margin-top:12px"><button class="btn primary" id="wNext" ${draft.state&&draft.type&&draft.grade?"":"disabled"}>Weiter zu den Fächern</button></div>`;
      $("#wState",root).onchange=e=>{draft.state=e.target.value; if(draft.type&&!gradesFor(draft.type,draft.state).includes(Number(draft.grade))) draft.grade=""; draw();};
      $("#wType",root).onchange=e=>{draft.type=e.target.value; draft.grade=""; draw();};
      $("#wGrade",root).onchange=e=>{draft.grade=Number(e.target.value)||""; draw();};
    } else if(draft.track==="uni"){
      fields.innerHTML=`<div class="grid3" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))">
        <label class="f">Hochschule<input type="text" id="wUni" value="${esc(draft.uni||"")}" placeholder="z. B. Universität Stuttgart"></label>
        <label class="f">Studiengang<input type="text" id="wProg" list="progList" value="${esc(draft.program||"")}" placeholder="z. B. Informatik"><datalist id="progList">${Object.keys(PROGRAMS).map(k=>`<option value="${esc(k)}">`).join("")}</datalist></label>
        <label class="f">Semester<input type="number" id="wSem" min="1" max="20" value="${esc(draft.semester||"")}"></label>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="wNext">Weiter zu den Modulen</button></div>`;
      const upd=()=>{draft.uni=$("#wUni",root).value.trim();draft.program=$("#wProg",root).value.trim();draft.semester=Number($("#wSem",root).value)||"";$("#wNext",root).disabled=!(draft.uni&&draft.program);};
      ["#wUni","#wProg","#wSem"].forEach(s=>$(s,root).oninput=upd); upd();
    } else fields.innerHTML="";
    const nx=$("#wNext",root); if(nx) nx.onclick=()=>subjectStep();
  };
  const subjectStep=()=>{
    const p={...draft};
    let opts;
    if(p.track==="schule") opts=subjectsFor(p);
    else{ const key=Object.keys(PROGRAMS).find(k=>k.toLowerCase()===String(p.program).toLowerCase()) || Object.keys(PROGRAMS).find(k=>String(p.program).toLowerCase().includes(k.toLowerCase().split(" ")[0])); opts=(key?PROGRAMS[key]:[]).map(n=>({n,core:false})); }
    const same=S.profile&&JSON.stringify(S.profile)===JSON.stringify(p);
    let sel=new Set(same&&S.mySubjects.length?S.mySubjects:opts.filter(o=>o.core).map(o=>o.n));
    S.mySubjects.forEach(x=>{ if(same) sel.add(x); });
    const extra=[...sel].filter(x=>!opts.some(o=>o.n===x)).map(n=>({n}));
    const all=[...opts,...extra];
    const link=p.track==="schule"?planLink(p):null;
    root.innerHTML=`<div class="stack" style="gap:14px">
      <div class="stack" style="gap:4px"><h2>${p.track==="schule"?"Deine Fächer":"Deine Module"}</h2>
      <p class="muted">${p.track==="schule"?`Fächerangebot für ${esc(profileLabel(p))}. Wähle aus, was du hast – Wahlfächer und Profile unterscheiden sich je Schule.`:`Typische Module für ${esc(p.program)}. Maßgeblich ist das Modulhandbuch deiner Hochschule – ergänze oder entferne Module.`}</p>
      ${link?`<p class="small">Quelle: <a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.src)}</a></p>`:`<p class="small"><a href="https://www.google.com/search?q=${encodeURIComponent("Modulhandbuch "+(p.uni||"")+" "+(p.program||""))}" target="_blank" rel="noopener">Modulhandbuch von ${esc(p.uni)} suchen</a></p>`}</div>
      <div class="grid3" id="subjGrid">${all.map(o=>`<button class="subj" aria-pressed="${sel.has(o.n)}" data-n="${esc(o.n)}"><b>${esc(o.n)}</b>${o.core?'<span class="small muted">Kernfach</span>':""}</button>`).join("")}</div>
      <div class="row"><input type="text" id="addSubj" placeholder="${p.track==="schule"?"Fach hinzufügen":"Modul hinzufügen"}" style="max-width:320px"><button class="btn" id="addSubjBtn">Hinzufügen</button>${p.track==="uni"?`<button class="btn" id="suggestMods">Module von Claude vorschlagen lassen</button>`:""}</div>
      <div id="modSug"></div>
      <div class="row"><button class="btn primary" id="wSave">Speichern</button><button class="btn ghost" id="wBack">Zurück</button></div></div>`;
    const grid=$("#subjGrid",root);
    const bind=()=>$$(".subj",grid).forEach(b=>b.onclick=()=>{const n=b.dataset.n; sel.has(n)?sel.delete(n):sel.add(n); b.setAttribute("aria-pressed",sel.has(n));});
    bind();
    const addOne=n=>{ n=n.trim(); if(!n) return; if(!$$(".subj",grid).some(b=>b.dataset.n===n)){ grid.insertAdjacentHTML("beforeend",`<button class="subj" aria-pressed="true" data-n="${esc(n)}"><b>${esc(n)}</b></button>`); } sel.add(n); $$(".subj",grid).forEach(b=>b.setAttribute("aria-pressed",sel.has(b.dataset.n))); bind(); };
    $("#addSubjBtn",root).onclick=()=>{addOne($("#addSubj",root).value); $("#addSubj",root).value="";};
    $("#addSubj",root).onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();$("#addSubjBtn",root).click();}};
    const sm=$("#suggestMods",root); if(sm){ if(!CAP.sample) sm.hidden=true; sm.onclick=async()=>{ const box=$("#modSug",root); box.innerHTML=`<span class="spin"></span> Claude sammelt typische Module …`; sm.disabled=true;
      try{ const arr=await CAP.sample.json(`Nenne die typischen Pflicht- und Wahlpflichtmodule im Studiengang "${p.program}" an der Hochschule "${p.uni}"${p.semester?` (aktuell ${p.semester}. Semester)`:""}. Nutze dein Wissen über das Modulhandbuch dieser Hochschule; wenn du es nicht sicher kennst, nenne die an deutschen Hochschulen üblichen Module dieses Studiengangs. Antworte nur mit JSON: {"modules":["Modulname",...],"sicher":true|false} mit 10 bis 20 Modulen.`,{modelTier:"default",cache:{gcTime:864e5}});
        const mods=(arr.modules||[]).map(String).slice(0,25);
        box.innerHTML=`<div class="note ${arr.sicher?"":"warn"} small">${arr.sicher?"Vorschläge von Claude.":"Claude kennt das Modulhandbuch dieser Hochschule nicht sicher – das sind übliche Module."} Bitte mit dem Modulhandbuch abgleichen. Antippen zum Übernehmen.</div><div class="row" style="margin-top:8px">${mods.map(x=>`<button class="chip" data-addm="${esc(x)}">+ ${esc(x)}</button>`).join("")}</div>`;
        $$("[data-addm]",box).forEach(b=>b.onclick=()=>{addOne(b.dataset.addm); b.remove();});
      }catch(e){ box.innerHTML=`<p class="small">${esc(sampleErr(e))}</p>`; } sm.disabled=false; }; }
    $("#wBack",root).onclick=()=>{ root.innerHTML=wizardHTML(draft); mountWizard(root,onDone); };
    $("#wSave",root).onclick=()=>{ S.profile=p; S.mySubjects=[...sel]; save(); onDone&&onDone(); };
  };
  $$("[data-track]",root).forEach(b=>b.onclick=()=>{draft.track=b.dataset.track; draw();});
  draw();
}
function openWizard(){ modal(`<div id="wizRoot">${wizardHTML(S.profile)}</div><div class="row"><span class="spacer"></span><button class="btn ghost" data-close>Schließen</button></div>`,(m,close)=>{ mountWizard($("#wizRoot",m),()=>{close();render();toast("Profil gespeichert");}); }); }

/* ===================== Bibliothek ===================== */
const KINDS=["Zusammenfassung","Merkblatt","Karteikarten","Übungsaufgaben mit Lösung","Mitschrift","Klausurvorbereitung"];
let VOTES={counts:{},mine:[]}; let voteUnsub=null;
function watchVotes(){
  if(voteUnsub||!CAP.db) return;
  voteUnsub=CAP.db.collection("votes").onSnapshot(snap=>{ const c={}; let mine=[]; snap.docs.forEach(d=>{ const ids=(d.data()||{}).ids||[]; ids.forEach(id=>c[id]=(c[id]||0)+1); if(d.id===CAP.uid) mine=ids; }); VOTES={counts:c,mine}; $$("[data-votes]").forEach(el=>el.textContent=c[el.dataset.votes]||0); },()=>{voteUnsub=null;});
}
async function toggleVote(id){
  if(!CAP.db||!CAP.uid) return;
  const mine=new Set(VOTES.mine); mine.has(id)?mine.delete(id):mine.add(id);
  try{ await CAP.db.doc("votes/"+CAP.uid).set({ids:[...mine].slice(-500)}); VOTES.mine=[...mine]; }catch{ toast("Konnte nicht gespeichert werden"); }
}
function levelLabel(e){ return e.track==="uni" ? [e.uni,e.program].filter(Boolean).join(" · ") : [schoolTypeName(e.schoolType,e.state),e.state,e.grade?("Kl. "+e.grade):""].filter(Boolean).join(" · "); }

VIEWS.lib = function(m,arg){
  if(!S.profile){
    m.innerHTML=`<div class="view"><div class="stack" style="gap:4px"><h1>Bibliothek</h1><p class="muted">Zusammenfassungen, Merkblätter und Übungsaufgaben von anderen Lernenden – sortiert nach Fach und Thema. Du kannst eigene Einträge beisteuern.</p></div><section class="sheet" id="wizRoot">${wizardHTML(null)}</section></div>`;
    mountWizard($("#wizRoot"),()=>{render();}); return;
  }
  if(arg&&arg.subject) return renderSubject(m,arg.subject,arg.topic||"");
  const p=S.profile; const link=p.track==="schule"?planLink(p):null;
  m.innerHTML=`<div class="view">
   <div class="row" style="align-items:flex-end"><div class="stack" style="gap:4px"><h1>Bibliothek</h1><p class="muted">${esc(profileLabel(p))}</p></div><span class="spacer"></span><button class="btn" id="editProf">Angaben ändern</button></div>
   ${CAP.db?"":`<div class="note warn">Die Bibliothek ist eine gemeinsame Datenbank. Einträge siehst du, wenn Merkwerk in claude.ai geöffnet ist und du angemeldet bist.</div>`}
   <section class="sheet stack">
     <div class="row"><h3>${p.track==="schule"?"Meine Fächer":"Meine Module"}</h3><span class="spacer"></span>${link?`<a class="small" href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.src)} ↗</a>`:""}</div>
     ${S.mySubjects.length?`<div class="grid3">${S.mySubjects.map(n=>`<button class="subj" data-s="${esc(n)}"><b>${esc(n)}</b><span class="small muted" data-cnt="${esc(subjKey(n))}">Themen und Einträge</span></button>`).join("")}</div>`:`<div class="empty">Noch keine Fächer gewählt. <button class="btn ghost" id="pickS">Fächer wählen</button></div>`}
   </section>
   <section class="sheet stack"><h3>So funktioniert die Bibliothek</h3>
     <div class="grid2 small"><p><b>1. Fach wählen</b><br>Du siehst die Themen aus dem Bildungsplan bzw. Modulhandbuch und alles, was andere schon geteilt haben.</p><p><b>2. Thema eingeben</b><br>Wähle ein Thema aus der Liste oder tippe dein eigenes ein. Dann Einträge ansehen oder selbst einen hochladen.</p><p><b>3. Mit Merkwerk lernen</b><br>Jeden Eintrag kannst du mit einem Klick als Lernset übernehmen und dir belegte Prüfungsfragen dazu stellen lassen.</p></div></section>
  </div>`;
  $("#editProf").onclick=openWizard; const ps=$("#pickS"); if(ps) ps.onclick=openWizard;
  $$("[data-s]").forEach(b=>b.onclick=()=>go("lib",{subject:b.dataset.s}));
  if(CAP.db){ const tr=p.track; CAP.db.collection("entries").where("track","==",tr).limit(1000).get().then(snap=>{ const c={}; snap.docs.forEach(d=>{const k=(d.data()||{}).subjectKey; c[k]=(c[k]||0)+1;}); $$("[data-cnt]").forEach(el=>{const n=c[el.dataset.cnt]||0; el.textContent=n?`${n} Einträge`:"Noch keine Einträge";}); }).catch(()=>{}); }
};

function renderSubject(m,subject,topic){
  const p=S.profile; const key=subjKey(subject);
  const band=topicBand(p); const alias=topicAlias(subject);
  const curated=p.track==="schule"&&alias&&TOPICS[alias]? (TOPICS[alias][band]||[]) : [];
  const link=p.track==="schule"?planLink(p):null;
  let entries=[]; let unsub=null;
  const filt={mine:p.track==="schule"?"grade":"all"};
  m.innerHTML=`<div class="view">
    <div class="row"><button class="btn ghost sm" id="backLib">← Bibliothek</button></div>
    <div class="row" style="align-items:flex-end"><div class="stack" style="gap:4px"><span class="label">${esc(profileLabel(p))}</span><h1>${esc(subject)}</h1></div><span class="spacer"></span>${link?`<a class="btn sm" href="${esc(link.url)}" target="_blank" rel="noopener">Offizieller Plan ↗</a>`:""}</div>
    <section class="sheet stack">
      <label class="f" for="topicIn">Thema</label>
      <div class="row"><input type="text" id="topicIn" list="topicList" value="${esc(topic)}" placeholder="z. B. ${esc(curated[0]||"Thema eingeben")}" style="flex:1;min-width:200px"><datalist id="topicList"></datalist><button class="btn" id="topicClear" ${topic?"":"hidden"}>Alle Themen</button></div>
      <div class="stack" style="gap:6px">
        ${curated.length?`<span class="small muted">Typische Themen${band==="os"?" der Oberstufe":band==="gs"?" der Grundschule":` der Klassen ${band}`} – Orientierung am Bildungsplan, Reihenfolge und Umfang unterscheiden sich je Land:</span><div class="row" id="curTopics">${curated.map(t=>`<button class="chip" data-t="${esc(t)}" aria-pressed="${t===topic}">${esc(t)}</button>`).join("")}</div>`:""}
        <div class="row" id="libTopics"></div>
        <div class="row"><button class="btn sm" id="claudeTopics" ${CAP.sample?"":"hidden"}>Themen aus dem Bildungsplan von Claude vorschlagen lassen</button></div>
        <div id="ctBox"></div>
      </div>
    </section>
    <div class="grid2">
      <button class="wizard-opt" id="actView"><b>Einträge ansehen</b><span class="small muted" id="cntLbl">Lädt …</span></button>
      <button class="wizard-opt" id="actUp"><b>Eintrag hochladen</b><span class="small muted">Teile deine Zusammenfassung, dein Merkblatt oder Übungsaufgaben${topic?` zu „${esc(topic)}“`:""}.</span></button>
    </div>
    <section class="sheet stack" id="entriesBox">
      <div class="row"><h3 id="entTitle">Einträge</h3><span class="spacer"></span>
        ${p.track==="schule"?`<select id="scope" style="width:auto"><option value="grade">Meine Klassenstufe & Schulart</option><option value="state">Mein Bundesland</option><option value="all">Alle</option></select>`:`<select id="scope" style="width:auto"><option value="all">Alle Hochschulen</option><option value="uni">Nur ${esc(p.uni||"meine Hochschule")}</option></select>`}</div>
      <div class="list" id="entList"><p class="muted small">${CAP.db?"Lädt …":"Einträge sind nur in claude.ai verfügbar."}</p></div>
    </section>
  </div>`;
  $("#backLib").onclick=()=>go("lib");
  const tIn=$("#topicIn");
  const setTopic=t=>{ topic=t; tIn.value=t; ROUTE.arg={subject,topic:t}; $("#topicClear").hidden=!t; $$("[data-t]").forEach(c=>c.setAttribute("aria-pressed",c.dataset.t===t)); $("#actUp .small").textContent=`Teile deine Zusammenfassung, dein Merkblatt oder Übungsaufgaben${t?` zu „${t}“`:""}.`; draw(); };
  const bindChips=root=>$$("[data-t]",root).forEach(c=>c.onclick=()=>setTopic(c.dataset.t===topic?"":c.dataset.t));
  bindChips(m);
  tIn.onchange=()=>setTopic(tIn.value.trim());
  tIn.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();setTopic(tIn.value.trim());}};
  $("#topicClear").onclick=()=>setTopic("");
  $("#actView").onclick=()=>$("#entriesBox").scrollIntoView({behavior:"smooth"});
  $("#actUp").onclick=()=>openEntryForm(subject,topic);
  const sc=$("#scope"); sc.value=filt.mine; sc.onchange=()=>{filt.mine=sc.value;draw();};
  $("#claudeTopics").onclick=async()=>{ const b=$("#claudeTopics"), box=$("#ctBox"); b.disabled=true; box.innerHTML=`<span class="spin"></span> Claude sammelt Themen …`;
    const ctx=p.track==="schule"?`im Fach "${subject}" für ${profileLabel(p)} laut dem dort geltenden offiziellen Bildungsplan bzw. Lehrplan (${link?link.src:""})`:`im Modul "${subject}" des Studiengangs ${p.program} an der ${p.uni}`;
    try{ const r=await CAP.sample.json(`Nenne die Themen ${ctx}. Antworte nur mit JSON: {"topics":["Thema",...],"sicher":true|false} mit 8 bis 16 kurzen Themenbezeichnungen in der Reihenfolge des Plans. "sicher" ist false, wenn du den konkreten Plan nicht genau kennst.`,{modelTier:"default",cache:{gcTime:864e5}});
      const ts=(r.topics||[]).map(String).filter(t=>!curated.includes(t)).slice(0,20);
      box.innerHTML=`<p class="small muted">${r.sicher?"Vorschläge von Claude":"Vorschläge von Claude (Plan nicht sicher bekannt)"} – bitte mit dem offiziellen Plan abgleichen.</p><div class="row">${ts.map(t=>`<button class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>`; bindChips(box);
    }catch(e){ box.innerHTML=`<p class="small">${esc(sampleErr(e))}</p>`; } b.disabled=false; };

  function visible(){
    return entries.filter(e=>{
      if(topic && subjKey(e.topic)!==subjKey(topic)) return false;
      if(p.track==="schule"){ if(filt.mine==="grade") return e.schoolType===p.type&&Number(e.grade)===Number(p.grade); if(filt.mine==="state") return e.state===p.state; }
      else if(filt.mine==="uni") return subjKey(e.uni)===subjKey(p.uni);
      return true;
    }).sort((a,b)=>(VOTES.counts[b._id]||0)-(VOTES.counts[a._id]||0)||(b.createdAt||0)-(a.createdAt||0));
  }
  async function draw(){
    const list=$("#entList"); if(!list) return;
    const libT=[...new Set(entries.map(e=>e.topic).filter(t=>t&&!curated.includes(t)))];
    $("#libTopics").innerHTML=libT.length?`<span class="small muted" style="width:100%">Themen aus der Bibliothek:</span>`+libT.map(t=>`<button class="chip" data-t="${esc(t)}" aria-pressed="${t===topic}">${esc(t)}</button>`).join(""):"";
    bindChips($("#libTopics"));
    $("#topicList").innerHTML=[...curated,...libT].map(t=>`<option value="${esc(t)}">`).join("");
    if(!CAP.db){ $("#cntLbl").textContent="Nur in claude.ai verfügbar"; return; }
    const vis=visible();
    $("#cntLbl").textContent=`${vis.length} ${vis.length===1?"Eintrag":"Einträge"}${topic?` zu „${topic}“`:""}`;
    $("#entTitle").textContent=topic?`Einträge zu „${topic}“`:"Alle Einträge";
    if(!vis.length){ list.innerHTML=`<div class="empty">Zu ${topic?`„${esc(topic)}“`:"diesem Fach"} gibt es hier noch nichts. <button class="btn ghost" id="firstUp">Lade den ersten Eintrag hoch</button>${filt.mine!=="all"?`<br><span class="small">Oder stelle oben „Alle“ ein.</span>`:""}</div>`; $("#firstUp").onclick=()=>openEntryForm(subject,topic); return; }
    let names={}; try{ if(CAP.user){ const ps=await CAP.user.profiles([...new Set(vis.map(e=>e.authorId).filter(Boolean))]); for(const id in ps) names[id]=ps[id].name; } }catch{}
    list.innerHTML=vis.map(e=>`<div class="li"><div class="grow stack" style="gap:3px"><div class="row" style="gap:6px"><span class="pill">${esc(e.kind)}</span><span class="small muted">${esc(e.topic||"")}</span></div><b>${esc(e.title)}</b><span class="small muted">${esc(levelLabel(e))} · ${esc(names[e.authorId]||"Jemand")} · ${new Date(e.createdAt).toLocaleDateString("de-DE")}</span></div><div class="stack" style="gap:6px;align-items:flex-end"><button class="btn sm" data-open="${e._id}">Öffnen</button><span class="small muted">▲ <span data-votes="${e._id}">${VOTES.counts[e._id]||0}</span> hilfreich</span></div></div>`).join("");
    $$("[data-open]",list).forEach(b=>b.onclick=()=>openEntry(entries.find(e=>e._id===b.dataset.open),names));
  }
  if(CAP.db){
    watchVotes();
    unsub=CAP.db.collection("entries").where("subjectKey","==",key).where("track","==",p.track).limit(500).onSnapshot(snap=>{ entries=snap.docs.map(d=>({...d.data(),_id:d.id})); draw(); },()=>{ const l=$("#entList"); if(l) l.innerHTML=`<p class="small">Die Bibliothek ist gerade nicht erreichbar.</p>`; });
    cleanup.push(()=>unsub&&unsub());
  }
  draw();
}

function openEntry(e,names={}){
  if(!e) return;
  const mineOrOwner = (CAP.uid&&e.authorId===CAP.uid)||CAP.isOwner;
  modal(`<div class="stack" style="gap:6px"><div class="row" style="gap:6px"><span class="pill">${esc(e.kind)}</span><span class="small muted">${esc(e.subject)} · ${esc(e.topic||"")}</span></div><h2>${esc(e.title)}</h2><span class="small muted">${esc(levelLabel(e))} · ${esc(names[e.authorId]||"Jemand")} · ${new Date(e.createdAt).toLocaleDateString("de-DE")}</span></div>
    <div class="note warn small">Inhalte sind von Nutzerinnen und Nutzern erstellt und nicht geprüft.</div>
    <div class="entry-body">${esc(e.content)}</div>
    <div class="row"><button class="btn primary" id="eLearn">Mit Merkwerk lernen</button><button class="btn" id="eVote">${VOTES.mine.includes(e._id)?"✓ Hilfreich":"Hilfreich"}</button><button class="btn" id="eCopy">Text kopieren</button><span class="spacer"></span>${mineOrOwner?`<button class="btn ghost danger" id="eDel">Löschen</button>`:""}<button class="btn ghost" data-close>Schließen</button></div>`,(m,close)=>{
    $("#eLearn",m).onclick=async()=>{ const s=newSet(e.title,e.subject); s.files=[{id:rid("f_"),name:`Bibliothek: ${e.title}`,kind:"bibliothek",text:e.content,ocr:false}]; s.sections=makeSections(s.files); await putSet(s); S.activeSet=s.id; save(); close(); go("learn",{manage:true}); toast("Als Lernset übernommen"); };
    $("#eVote",m).onclick=async()=>{ await toggleVote(e._id); $("#eVote",m).textContent=VOTES.mine.includes(e._id)?"✓ Hilfreich":"Hilfreich"; };
    $("#eCopy",m).onclick=()=>copyText(e.content);
    const d=$("#eDel",m); if(d) d.onclick=async()=>{ try{ await CAP.db.doc("entries/"+e._id).delete(); close(); toast("Eintrag gelöscht"); }catch{ toast("Löschen nicht möglich"); } };
  });
}

function openEntryForm(subject,topic){
  const p=S.profile;
  if(!CAP.db){ toast("Hochladen geht nur in claude.ai mit Anmeldung"); return; }
  if(CAP.canWrite===false){ modal(`<h3>Hochladen nicht freigeschaltet</h3><p>Du kannst die Bibliothek lesen, aber noch keine Einträge beisteuern. Bitte die Person, die Merkwerk geteilt hat, dich als Mitwirkende/n einzuladen.</p><div class="row"><button class="btn" data-close>OK</button></div>`); return; }
  modal(`<h2>Eintrag hochladen</h2><p class="small muted">${esc(subject)} · ${esc(profileLabel(p))}</p>
    <label class="f">Thema<input type="text" id="eTopic" value="${esc(topic||"")}" placeholder="z. B. Quadratische Funktionen"></label>
    <label class="f">Titel<input type="text" id="eTitle" placeholder="z. B. Spickzettel Scheitelpunktform"></label>
    <label class="f">Art<select id="eKind">${KINDS.map(k=>`<option>${k}</option>`).join("")}</select></label>
    <label class="f">Inhalt<textarea id="eContent" style="min-height:200px" placeholder="Schreib oder füge deinen Text ein – oder übernimm eine Datei bzw. ein Lernset."></textarea></label>
    <div class="row"><button class="btn sm" id="eFileBtn">Datei übernehmen</button><input type="file" id="eFile" accept=".pdf,.docx,.txt,.md,image/*" hidden>${SETS.length?`<select id="eSet" style="width:auto"><option value="">Aus Lernset übernehmen …</option>${SETS.filter(s=>!s.example).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select>`:""}<span id="eSt" class="small"></span></div>
    <label class="row small" style="gap:8px;align-items:flex-start"><input type="checkbox" id="eOk" style="margin-top:4px"><span>Das ist mein eigener Inhalt (eigene Notizen, eigene Zusammenfassung) – keine abfotografierten Buchseiten oder fremden Lösungen. Er wird für alle Nutzer der Bibliothek sichtbar.</span></label>
    <div class="row"><button class="btn primary" id="ePost">Veröffentlichen</button><button class="btn ghost" data-close>Abbrechen</button></div>`,(m,close)=>{
    const fi=$("#eFile",m); $("#eFileBtn",m).onclick=()=>fi.click();
    fi.onchange=async()=>{ const f=fi.files[0]; if(!f) return; try{ const r=await readFile(f,t=>{$("#eSt",m).innerHTML=`<span class="spin"></span> ${esc(t)}`;}); $("#eContent",m).value=r.text; if(!$("#eTitle",m).value) $("#eTitle",m).value=f.name.replace(/\.[^.]+$/,""); $("#eSt",m).textContent=r.ocr?"Von Claude abgeschrieben – bitte prüfen.":""; }catch(e){ $("#eSt",m).textContent=e&&e.code?sampleErr(e):String(e.message||e); } };
    const es=$("#eSet",m); if(es) es.onchange=()=>{ const s=setById(es.value); if(s){ $("#eContent",m).value=s.files.map(f=>f.text).join("\n\n"); if(!$("#eTitle",m).value) $("#eTitle",m).value=s.name; } };
    $("#ePost",m).onclick=async()=>{
      const t=$("#eTopic",m).value.trim(), ti=$("#eTitle",m).value.trim(), c=$("#eContent",m).value.trim();
      if(!t||!ti||c.length<40){ toast("Bitte Thema, Titel und mindestens ein paar Sätze Inhalt angeben"); return; }
      if(!$("#eOk",m).checked){ toast("Bitte bestätige, dass es dein eigener Inhalt ist"); return; }
      const doc={track:p.track,subject,subjectKey:subjKey(subject),topic:t,topicKey:subjKey(t),title:ti.slice(0,140),kind:$("#eKind",m).value,content:c.slice(0,120000),authorId:CAP.uid||null,createdAt:Date.now(),
        state:p.state||null,schoolType:p.type||null,grade:p.grade||null,uni:p.uni||null,program:p.program||null};
      $("#ePost",m).disabled=true;
      try{ await CAP.db.collection("entries").add(doc); close(); toast("Eintrag veröffentlicht"); }
      catch(e){ $("#ePost",m).disabled=false; toast(e&&e.code==="quota_exceeded"?"Die Bibliothek ist voll":e&&e.code==="invalid_argument"?"Du darfst hier keine Einträge veröffentlichen":"Veröffentlichen fehlgeschlagen – versuch es noch einmal"); }
    };
  });
}
