/* ===================== Neues Lernset mit Fach- und Themenvorschlägen, „Lerninhalte generieren“ ===================== */
// Typische Themen aus der Themenliste (Orientierung am Bildungsplan)
function curatedTopics(subject,p=S.profile){
  const alias=topicAlias(subject||""); const band=topicBand(p);
  return p&&p.track==="schule"&&alias&&TOPICS[alias]?(TOPICS[alias][band]||[]):[];
}
function levelText(p=S.profile){
  if(!p) return "";
  return p.track==="uni"?`Studium ${p.program||""}${p.semester?`, ${p.semester}. Semester`:""}${p.uni?` an der ${p.uni}`:""}`:profileLabel(p);
}
// Claude schlägt Themen aus dem Bildungsplan vor
async function claudeTopics(subject,docs){
  const p=S.profile;
  const ctx=p&&p.track==="schule"
    ?`im Fach "${subject}" für ${profileLabel(p)} laut dem geltenden Bildungsplan${docs.length?` (${docs.slice(0,3).map(d=>d.title).join("; ")})`:""}`
    :`im Fach bzw. Modul "${subject}"${p?` (${levelText(p)})`:""}`;
  const r=await CAP.sample.json(`Nenne die Themen ${ctx}. Antworte nur mit JSON: {"topics":["Thema",...],"sicher":true|false} mit 8 bis 16 kurzen Themenbezeichnungen in der Reihenfolge des Plans. "sicher" ist false, wenn du den konkreten Plan nicht genau kennst.`,{modelTier:"default",cache:{gcTime:864e5}});
  return {topics:(r.topics||[]).map(String).slice(0,20),sure:!!r.sicher};
}

function openNewSetDialog(preset={}){
  const p=S.profile; let subject=preset.subject||""; let topic=preset.topic||""; let plansOk=false;
  const mine=[...new Set(S.mySubjects||[])];
  modal(`<div class="stack" style="gap:14px" id="ns">
    <div class="stack" style="gap:4px"><h2>Neues Lernset</h2><p class="small muted">${p?esc(levelText(p)):"Ohne Angaben zu Schule oder Studium gibt es keine Vorschläge aus dem Bildungsplan."}</p></div>
    <div class="stack" style="gap:6px">
      <label class="f" for="nsSubj">Fach</label>
      <input type="text" id="nsSubj" value="${esc(subject)}" placeholder="z. B. Mathematik" autocomplete="off">
      <div class="row" id="nsSubjChips"></div>
      <div id="nsMoreSubj"></div>
      <div id="nsPlan" class="small"></div>
    </div>
    <div class="stack" style="gap:6px">
      <label class="f" for="nsTopic">Thema</label>
      <input type="text" id="nsTopic" value="${esc(topic)}" placeholder="z. B. Lineare Funktionen" autocomplete="off">
      <div class="row" id="nsTopicChips"></div>
      <div id="nsClaudeTopics"></div>
    </div>
    <div class="stack" style="gap:8px"><span class="label">Material</span>
      <div class="grid2" style="gap:10px">
        <button class="wizard-opt" id="nsOwn"><b>Eigene Dateien anfügen</b><span class="small muted">PDF, DOCX, GoodNotes, Fotos – wie gewohnt</span></button>
        <button class="wizard-opt" id="nsGen"><b>Lerninhalte generieren</b><span class="small muted">Merkwerk gleicht Fach und Thema mit deinem Bildungsplan ab, sucht Erklärungen und Videos und erstellt daraus dein Material</span></button>
      </div>
    </div>
    <div class="row"><span class="spacer"></span><button class="btn ghost" data-close>Abbrechen</button></div>
  </div>`,(m,close)=>{
    const sIn=$("#nsSubj",m), tIn=$("#nsTopic",m);
    const chip=(v,attr,on)=>`<button class="chip" ${attr}="${esc(v)}" aria-pressed="${on}">${esc(v)}</button>`;
    const drawSubjects=()=>{
      $("#nsSubjChips",m).innerHTML=mine.map(n=>chip(n,"data-ns",subjKey(n)===subjKey(subject))).join("");
      const extra=plansOk?planSubjects(p).filter(s=>!mine.some(n=>sameSubject(s.n,n))):[];
      $("#nsMoreSubj",m).innerHTML=extra.length?`<details><summary class="small">Weitere Fächer aus deinem Bildungsplan (${extra.length})</summary><div class="row" style="margin-top:6px">${extra.map(s=>chip(s.n,"data-ns",subjKey(s.n)===subjKey(subject))).join("")}</div></details>`:"";
      $$("[data-ns]",m).forEach(b=>b.onclick=()=>{ subject=b.dataset.ns; sIn.value=subject; drawSubjects(); drawPlan(); drawTopics(); });
    };
    const drawPlan=()=>{
      const box=$("#nsPlan",m);
      if(!p||p.track!=="schule"||!subject){ box.innerHTML=""; return; }
      if(!plansOk){ const l=planLink(p); box.innerHTML=`Bildungsplan: <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.src)} ↗</a>`; return; }
      const {docs}=plansForSubject(p,subject);
      box.innerHTML=docs.length?`<div class="stack" style="gap:4px"><span class="muted">Dein Bildungsplan für ${esc(subject)}:</span>${docs.slice(0,4).map(d=>`<span>${planDocHTML(d)}</span>`).join("")}</div>`
        :`<span class="muted">Für „${esc(subject)}“ ist kein eigener Plan für ${esc(profileLabel(p))} im Index. Du kannst das Fach trotzdem nutzen.</span>`;
    };
    const drawTopics=()=>{
      const cur=curatedTopics(subject,p);
      $("#nsTopicChips",m).innerHTML=(cur.length?`<span class="small muted" style="width:100%">Typische Themen – Orientierung am Bildungsplan:</span>`:"")+cur.map(t=>chip(t,"data-nt",t===topic)).join("")
        +(CAP.sample&&subject?`<button class="btn sm" id="nsAskTopics">Themen aus dem Bildungsplan vorschlagen</button>`:"");
      $$("[data-nt]",m).forEach(b=>b.onclick=()=>{ topic=b.dataset.nt; tIn.value=topic; $$("[data-nt]",m).forEach(c=>c.setAttribute("aria-pressed",c.dataset.nt===topic)); });
      const ask=$("#nsAskTopics",m); if(ask) ask.onclick=async()=>{ const box=$("#nsClaudeTopics",m); ask.disabled=true; box.innerHTML=`<span class="spin"></span> Claude sammelt Themen …`;
        try{ const docs=plansOk&&p&&p.track==="schule"?plansForSubject(p,subject).docs:[]; const r=await claudeTopics(subject,docs);
          box.innerHTML=`<p class="small muted">${r.sure?"Vorschläge von Claude":"Vorschläge von Claude (Plan nicht sicher bekannt)"} – bitte mit dem offiziellen Plan abgleichen.</p><div class="row">${r.topics.filter(t=>!cur.includes(t)).map(t=>chip(t,"data-nt",t===topic)).join("")}</div>`;
          $$("[data-nt]",box).forEach(b=>b.onclick=()=>{ topic=b.dataset.nt; tIn.value=topic; $$("[data-nt]",m).forEach(c=>c.setAttribute("aria-pressed",c.dataset.nt===topic)); });
        }catch(e){ box.innerHTML=`<p class="small">${esc(sampleErr(e))}</p>`; } ask.disabled=false; };
    };
    sIn.oninput=()=>{ subject=sIn.value.trim(); drawSubjects(); drawPlan(); drawTopics(); };
    tIn.oninput=()=>{ topic=tIn.value.trim(); $$("[data-nt]",m).forEach(c=>c.setAttribute("aria-pressed",c.dataset.nt===topic)); };
    drawSubjects(); drawPlan(); drawTopics();
    if(p&&p.track==="schule") loadPlans().then(ok=>{ plansOk=ok; if($("#ns")){ drawSubjects(); drawPlan(); } });
    const create=async gen=>{
      subject=sIn.value.trim(); topic=tIn.value.trim();
      if(gen&&!topic){ toast("Gib zuerst ein Thema ein – dazu sucht Merkwerk die Inhalte"); tIn.focus(); return; }
      const s=newSet(topic||subject||"Lernset "+(SETS.length+1),subject); s.topic=topic;
      await putSet(s); S.activeSet=s.id; save(); close(); go("learn",{manage:true});
      if(gen) generateIntoSet(s);
    };
    $("#nsOwn",m).onclick=()=>create(false);
    $("#nsGen",m).onclick=()=>create(true);
    (subject?tIn:sIn).focus();
  });
}

/* ---------- Lerninhalte generieren ---------- */
const WIKI="https://de.wikipedia.org/w/api.php";
async function wikiSearch(q,n=3,signal){
  const r=await fetch(`${WIKI}?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=${n}&format=json&origin=*`,{signal});
  const j=await r.json(); return ((j.query&&j.query.search)||[]).map(x=>x.title);
}
async function wikiText(title,signal){
  const r=await fetch(`${WIKI}?action=query&prop=extracts&explaintext=1&exsectionformat=plain&redirects=1&titles=${encodeURIComponent(title)}&format=json&origin=*`,{signal});
  const j=await r.json(); const pg=Object.values((j.query&&j.query.pages)||{})[0]||{};
  // Literatur, Weblinks und Einzelnachweise abschneiden
  const t=String(pg.extract||"").split(/\n(?:Literatur|Weblinks|Einzelnachweise|Siehe auch|Anmerkungen)\n/)[0].replace(/\n{3,}/g,"\n\n").trim();
  return {title:pg.title||title,text:t,url:`https://de.wikipedia.org/wiki/${encodeURIComponent((pg.title||title).replace(/ /g,"_"))}`};
}
// Suchlinks zu Erklärungen und Videos (YouTube ohne eigenen Schlüssel nur als Suche)
function learnLinks(subject,topic,p=S.profile){
  const lvl=p&&p.track==="schule"&&p.grade?` Klasse ${p.grade}`:"";
  const q=`${topic} ${subject}`.trim();
  return [
    {kind:"Video",title:`YouTube: Erklärvideos zu „${topic}“`,url:`https://www.youtube.com/results?search_query=${encodeURIComponent(q+" einfach erklärt"+lvl)}`},
    {kind:"Erklärung",title:`Serlo: „${topic}“`,url:`https://de.serlo.org/search?q=${encodeURIComponent(topic)}`},
    {kind:"Erklärung",title:`Wikipedia-Suche: „${topic}“`,url:`https://de.wikipedia.org/w/index.php?search=${encodeURIComponent(topic)}`},
  ];
}
// Prüft Fach und Thema gegen den Bildungsplan. Ohne Claude: Abgleich mit der Themenliste.
async function checkAgainstPlan(set,docs,signal){
  const p=S.profile; const cur=curatedTopics(set.subject,p);
  const inList=cur.some(t=>subjKey(t)===subjKey(set.topic)||subjKey(t).includes(subjKey(set.topic))||subjKey(set.topic).includes(subjKey(t)));
  if(!CAP.sample) return {fit:inList?"ja":"offen",note:inList?"Das Thema steht in den typischen Themen für deine Klassenstufe.":"Ohne Claude kann Merkwerk nur mit der Themenliste abgleichen; das Thema steht dort nicht. Prüfe es im verlinkten Plan.",focus:[],terms:[set.topic]};
  const r=await CAP.sample.json(`Du prüfst für eine Lernseite, ob ein Thema zum Bildungsplan eines Lernenden passt.

Lernende/r: ${levelText(p)||"keine Angaben"}
Fach: ${set.subject||"(nicht angegeben)"}
Thema: ${set.topic}
${docs.length?`Geltende Pläne laut offiziellem Index:\n${docs.slice(0,5).map(d=>`- ${d.title} (${PLAN_STATUS[d.st]||""})${d.valid?` – ${d.valid}`:""}`).join("\n")}`:"Kein konkreter Plan im Index gefunden."}
${cur.length?`Typische Themen dieser Stufe: ${cur.join("; ")}`:""}

Antworte nur mit JSON: {"passt":"ja"|"teilweise"|"nein","hinweis":"1 bis 2 Sätze an den Lernenden: in welcher Klassenstufe und welchem Rahmen das Thema laut Plan dran ist","schwerpunkte":["was laut Plan auf dieser Stufe gekonnt werden soll", 3 bis 6 Punkte],"suchbegriffe":["1 bis 2 Begriffe für die Suche in Wikipedia"]}. Wenn du den konkreten Plan nicht sicher kennst, sag das im Hinweis.`,{modelTier:"default",cache:{gcTime:864e5},signal});
  return {fit:["ja","teilweise","nein"].includes(r.passt)?r.passt:"offen",note:String(r.hinweis||""),focus:(r.schwerpunkte||[]).map(String).slice(0,8),terms:(r.suchbegriffe||[]).map(String).filter(Boolean).slice(0,2)};
}
async function generateContent(set,{onStatus,signal}={}){
  const p=S.profile;
  onStatus&&onStatus("Gleiche Fach und Thema mit deinem Bildungsplan ab …");
  const docs=p&&p.track==="schule"&&await loadPlans()?plansForSubject(p,set.subject).docs:[];
  const check=await checkAgainstPlan(set,docs,signal);
  onStatus&&onStatus("Suche Erklärungen in Wikipedia …");
  let wiki=[];
  try{
    const terms=[...new Set([...(check.terms||[]),set.topic])];
    const titles=[]; for(const t of terms){ for(const x of await wikiSearch(t,2,signal)) if(!titles.includes(x)) titles.push(x); if(titles.length>=2) break; }
    for(const t of titles.slice(0,2)){ const w=await wikiText(t,signal); if(w.text.length>300) wiki.push(w); }
  }catch(e){ if(e&&e.name==="AbortError") throw e; wiki=[]; }
  const links=[...wiki.map(w=>({kind:"Quelle",title:`Wikipedia: ${w.title}`,url:w.url})),...learnLinks(set.subject,set.topic,p)];
  const files=[];
  if(CAP.sample){
    onStatus&&onStatus(wiki.length?"Claude schreibt aus den Quellen deinen Lerntext …":"Claude schreibt deinen Lerntext …");
    const src=wiki.map(w=>`[Wikipedia: ${w.title}]\n${w.text.slice(0,24000)}`).join("\n\n");
    const {text}=await CAP.sample(`Schreibe einen Lerntext für eine Lernseite.

Lernende/r: ${levelText(p)||"keine Angaben"}
Fach: ${set.subject||"(nicht angegeben)"}
Thema: ${set.topic}
${check.focus.length?`Laut Bildungsplan soll auf dieser Stufe gekonnt werden:\n- ${check.focus.join("\n- ")}`:""}

REGELN
- Sprache und Tiefe passend zur Stufe. Nur, was zum Thema auf dieser Stufe gehört.
- ${wiki.length?"Stütze dich auf die Quellen unten. Übernimm keine Zahl, kein Datum und keinen Fachbegriff, der nicht in den Quellen steht; was die Quellen nicht hergeben, lässt du weg.":"Es konnten keine Quellen geladen werden. Schreib nur gesichertes Lehrbuchwissen und nichts, bei dem du unsicher bist."}
- Gliedere mit kurzen Zwischenüberschriften (eigene Zeile, ohne Markdown-Zeichen) und Absätzen, getrennt durch Leerzeilen.
- Jeder Fachbegriff bekommt einen eigenen Definitionssatz der Form „Begriff ist …“ oder „Als Begriff bezeichnet man …“.
- Am Ende ein Absatz „Das Wichtigste in Kürze“ mit 4 bis 6 Sätzen.
- 600 bis 1400 Wörter. Gib nur den Lerntext aus.
${src?`\nQUELLEN\n${src}`:""}`,{modelTier:"default",signal});
    const t=text.replace(/^#+\s*/gm,"").replace(/\*\*/g,"").trim();
    if(t.length>200) files.push({id:rid("f_"),name:`Lerntext: ${set.topic}${wiki.length?" (Claude, aus Wikipedia)":" (Claude)"}`,kind:"generiert",text:t,ocr:false});
  } else {
    wiki.forEach(w=>files.push({id:rid("f_"),name:`Wikipedia: ${w.title}`,kind:"generiert",text:w.text.slice(0,30000),ocr:false}));
  }
  return {files,gen:{at:Date.now(),fit:check.fit,note:check.note,focus:check.focus,docs:docs.slice(0,4).map(d=>({title:d.title,url:d.url,st:d.st})),links,by:CAP.sample?"claude":"wikipedia"}};
}
async function generateIntoSet(set){
  const box=$("#genBox"); const ctl=new AbortController();
  const status=t=>{ const e=$("#genTxt"); if(e) e.textContent=t; };
  if(box){ box.hidden=false; box.innerHTML=`<div class="note"><div class="row"><span class="spin"></span><span id="genTxt">Starte …</span><span class="spacer"></span><button class="btn sm" id="genStop">Abbrechen</button></div></div>`; $("#genStop").onclick=()=>ctl.abort(); }
  try{
    const r=await generateContent(set,{onStatus:status,signal:ctl.signal});
    set.gen=r.gen;
    if(!r.files.length){ await putSet(set); go("learn",{manage:true}); setTimeout(()=>{ const b=$("#genBox"); if(b){ b.hidden=false; b.innerHTML=`<div class="note warn">Zu „${esc(set.topic)}“ konnte Merkwerk ${CAP.sample?"keinen Lerntext erstellen":"ohne Claude keine Erklärung in Wikipedia finden"}. Unten stehen Links zu Erklärungen und Videos; du kannst auch eigene Dateien anfügen.</div>`; } },50); return; }
    set.files.push(...r.files); set.sections=makeSections(set.files); set.cards=null; set.fc=null;
    await putSet(set); go("learn",{manage:true}); toast("Lerninhalte erstellt – wähle jetzt, wie du lernen willst");
  }catch(e){
    const b=$("#genBox"); if(!b) return;
    if((e&&e.code==="cancelled")||(e&&e.name==="AbortError")){ b.hidden=true; return; }
    b.innerHTML=`<div class="note bad">${esc(e&&e.code?sampleErr(e):"Die Inhalte konnten nicht geladen werden. Prüfe die Internetverbindung und versuch es noch einmal.")}</div>`;
  }
}
const FIT_LABEL={ja:"passt zum Bildungsplan",teilweise:"passt teilweise zum Bildungsplan",nein:"steht so nicht im Bildungsplan",offen:"nicht sicher geprüft"};
function genInfoHTML(set){
  const g=set.gen; if(!g) return "";
  const pill=g.fit==="ja"?"ok":g.fit==="nein"?"bad":"warn";
  return `<div class="stack gen-src">
    <div class="row" style="gap:6px"><span class="label">Abgleich mit dem Bildungsplan</span><span class="pill ${pill}">${esc(FIT_LABEL[g.fit]||"")}</span></div>
    ${g.note?`<p class="small">${esc(g.note)}</p>`:""}
    ${g.focus&&g.focus.length?`<ul class="small" style="margin:0;padding-left:18px">${g.focus.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>`:""}
    ${g.docs&&g.docs.length?`<div class="small stack" style="gap:2px">${g.docs.map(d=>`<span>${planDocHTML(d)}</span>`).join("")}</div>`:""}
    <span class="label" style="margin-top:6px">Quellen, Erklärungen und Videos</span>
    <div class="small stack" style="gap:2px">${(g.links||[]).map(l=>`<span><span class="muted">${esc(l.kind)}:</span> <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)} ↗</a></span>`).join("")}</div>
    <p class="small muted">${g.by==="claude"?"Der Lerntext ist von Claude geschrieben. Gleiche ihn mit deinem Heft oder Schulbuch ab.":"Ohne Claude übernimmt Merkwerk den Wikipedia-Text als Material. Er kann über deine Klassenstufe hinausgehen."}</p>
  </div>`;
}
