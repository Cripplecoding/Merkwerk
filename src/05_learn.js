/* ===================== Lernen (Merkwerk-Kern) ===================== */
const TYPE_LABEL={mc:"Multiple Choice",text:"Schriftliche Antwort",match:"Zuordnung",cloze:"Lückentext"};
const AFB_LABEL={I:"AFB I · Wiedergeben",II:"AFB II · Zusammenhänge herstellen",III:"AFB III · Anwenden und Beurteilen"};
const BASE_MIX={mc:5,text:4,match:3,cloze:3};
function mixFor(n){ if(n>=15) return {...BASE_MIX}; const k=n/15; const m={mc:Math.max(1,Math.round(5*k)),text:Math.max(1,Math.round(4*k)),match:Math.max(1,Math.round(3*k)),cloze:Math.max(1,Math.round(3*k))}; let s=m.mc+m.text+m.match+m.cloze; while(s>n){ const t=["mc","match","cloze","text"].find(x=>m[x]>1); if(!t)break; m[t]--; s--; } return m; }

/* ---------- Text-Normalisierung für die Zitatprüfung ---------- */
const norm=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/­/g,"");
const relax=s=>norm(s).replace(/ß/g,"ss").replace(/[^a-z0-9äöü]+/g,"");

/* ---------- Abschnitte bilden ---------- */
function makeSections(files){
  const out=[];
  files.forEach((f,fi)=>{
    const paras=String(f.text||"").replace(/\r/g,"").split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
    let buf="";
    const flush=()=>{ if(buf.trim()) out.push({id:"S"+(out.length+1),fileId:f.id,fileName:f.name,text:buf.trim()}); buf=""; };
    for(const p of paras){
      if(p.length>1500){ flush(); const sents=p.split(/(?<=[.!?])\s+/); for(const s of sents){ if((buf+" "+s).length>900) flush(); buf+=(buf?" ":"")+s; } flush(); continue; }
      if(buf && (buf.length+p.length)>900) flush();
      buf+=(buf?"\n\n":"")+p;
      if(buf.length>=420) flush();
    }
    flush();
  });
  return out;
}
function coverageOf(set){ const n=set.sections.length; if(!n) return {pct:0,done:0,n:0}; const done=set.sections.filter(s=>(set.coverage||{})[s.id]>0).length; return {pct:Math.round(done/n*100),done,n}; }
function locateQuote(set,quote){
  const rq=relax(quote); if(rq.length<12) return null;
  for(const f of set.files){ if(relax(f.text).includes(rq)){
      const head=rq.slice(0,40); const secs=set.sections.filter(s=>s.fileId===f.id && (relax(s.text).includes(head)||relax(s.text).includes(rq.slice(-40))));
      return {fileName:f.name,sectionIds:secs.map(s=>s.id)}; } }
  return null;
}

/* ---------- Dateien lesen ---------- */
const scriptCache={};
function loadScript(src){ return scriptCache[src] ||= new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("Bibliothek konnte nicht geladen werden"));document.head.appendChild(s);}); }
const PDFJS="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const MAMMOTH="https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js";

async function ocrImages(blobs,progress){
  if(!CAP.sample) throw {code:"not_granted"};
  if(!CAP.images) throw {code:"images_unavailable"};
  const per=Math.max(1,Math.min(CAP.images.maxCount||1,5)); let out=[];
  for(let i=0;i<blobs.length;i+=per){
    const part=blobs.slice(i,i+per); progress&&progress(`Claude schreibt Seite ${i+1}–${i+part.length} von ${blobs.length} ab …`);
    const {text}=await CAP.sample(`Du bekommst ${part.length} Bild(er) von Lernmaterial (Scan, Foto oder Screenshot). Schreibe den gesamten sichtbaren Text exakt und vollständig ab, in Lesereihenfolge. Nichts zusammenfassen, nichts ergänzen, nichts korrigieren. Tabellen zeilenweise, Formeln als Text. Trenne die Bilder mit einer Zeile "=====". Gib nur den abgeschriebenen Text aus.`,{images:part,modelTier:"default"});
    out.push(text.trim());
  }
  return out.join("\n\n");
}
async function readFile(file,progress){
  const name=file.name; const ext=(name.split(".").pop()||"").toLowerCase();
  if(ext==="doc") throw new Error(`„${name}“: Alte .doc-Dateien werden nicht unterstützt. Speichere sie als .docx oder PDF.`);
  if(["txt","md"].includes(ext)) return {text:await file.text(),ocr:false,kind:"text"};
  if(ext==="docx"){ progress&&progress(`Lese ${name} …`); await loadScript(MAMMOTH); const r=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()}); return {text:r.value,ocr:false,kind:"docx"}; }
  if(ext==="pdf"){
    progress&&progress(`Lese ${name} …`); await loadScript(PDFJS);
    const lib=window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
    const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    const pages=[]; const scans=[];
    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p); const tc=await page.getTextContent();
      let t=""; for(const it of tc.items){ t+=it.str+(it.hasEOL?"\n":" "); }
      t=t.replace(/[ \t]+\n/g,"\n").replace(/ {2,}/g," ").trim();
      if(t.replace(/\s/g,"").length<25){
        const vp=page.getViewport({scale:1.7}); const c=document.createElement("canvas"); c.width=vp.width; c.height=vp.height;
        await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
        const b=await new Promise(r=>c.toBlob(r,"image/jpeg",0.85)); scans.push({p,b}); pages.push(null);
      } else pages.push(t);
    }
    let ocr=false;
    if(scans.length){ const txt=await ocrImages(scans.map(s=>s.b),progress); const parts=txt.split(/\n=====\n?/); scans.forEach((s,i)=>{pages[s.p-1]=(parts[i]||"").trim();}); if(parts.length!==scans.length) pages[scans[0].p-1]=txt; ocr=true; }
    return {text:pages.filter(Boolean).join("\n\n"),ocr,kind:"pdf"};
  }
  if(["png","jpg","jpeg","webp","gif","heic"].includes(ext)||file.type.startsWith("image/")){ return {text:await ocrImages([file],progress),ocr:true,kind:"bild"}; }
  throw new Error(`„${name}“: Dieses Format wird nicht unterstützt (PDF, DOCX, TXT oder Bild).`);
}

/* ---------- Lernsets ---------- */
async function loadSets(){ SETS=(await idb.all()).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)); }
async function putSet(set){ set.sections ||= makeSections(set.files); await idb.put(set); const i=SETS.findIndex(s=>s.id===set.id); if(i<0) SETS.unshift(set); else SETS[i]=set; }
function newSet(name,subject){ return {id:rid("set_"),name:name||"Neues Lernset",subject:subject||"",createdAt:Date.now(),files:[],sections:[],coverage:{},round:null,history:[]}; }
const setById=id=>SETS.find(s=>s.id===id);
async function makeExampleSet(){
  let ex=SETS.find(s=>s.example); if(ex) return ex;
  ex=newSet("Beispiel: Photosynthese","Biologie"); ex.example=true;
  ex.files=[{id:"f_ex",name:"Beispieltext Photosynthese",kind:"text",text:EXAMPLE_TEXT,ocr:false}];
  ex.sections=makeSections(ex.files); await putSet(ex); return ex;
}

/* ---------- Fragen erzeugen ---------- */
function buildPrompt(set,mix,restrict,avoid){
  const total=Object.values(mix).reduce((a,b)=>a+b,0);
  let secs=set.sections; if(restrict&&restrict.length) secs=secs.filter(s=>restrict.includes(s.id));
  const cov=set.coverage||{};
  const ranked=[...secs].sort((a,b)=>(cov[a.id]||0)-(cov[b.id]||0));
  let budget=110000, chosen=new Set();
  for(const s of ranked){ if(budget-s.text.length<0) break; budget-=s.text.length; chosen.add(s.id); }
  const listed=secs.filter(s=>chosen.has(s.id));
  const uncovered=listed.filter(s=>!(cov[s.id]>0)).map(s=>s.id);
  const material=listed.map(s=>`[${s.id} | ${s.fileName}]\n${s.text}`).join("\n\n");
  return `Du erstellst Prüfungsfragen für eine Lernseite. Grundlage ist AUSSCHLIESSLICH das Material unten.

REGELN
1. Jede Frage muss sich vollständig aus dem Material beantworten lassen. Keine Inhalte, Zahlen oder Fachbegriffe, die nicht im Material stehen – auch nicht in falschen Antwortmöglichkeiten.
2. Jede Frage hat ein Feld "quote": ein wörtliches, zusammenhängendes Zitat aus dem Material (ein bis zwei Sätze, 40 bis 300 Zeichen), das die Lösung belegt. Exakt so geschrieben wie im Material, ohne Auslassungen, ohne "…".
3. Jede Frage hat "afb" ("I" Wiedergeben, "II" Zusammenhänge herstellen, "III" Anwenden und Beurteilen) wie im Abitur. Verteilung etwa 40 % I, 40 % II, 20 % III.
4. Mindestens ${Math.max(1,Math.round(total/4))} Fragen verknüpfen zwei oder mehr verschiedene Abschnitte. "sections" nennt alle verwendeten Abschnitts-IDs.
5. Genau diese Anzahl je Format: ${mix.mc||0}× "mc", ${mix.text||0}× "text", ${mix.match||0}× "match", ${mix.cloze||0}× "cloze".
${uncovered.length?`6. Diese Abschnitte wurden noch nie abgefragt und haben Vorrang: ${uncovered.slice(0,40).join(", ")}.`:""}
${avoid&&avoid.length?`7. Diese Fragen gab es schon, stelle andere:\n- ${avoid.slice(0,40).join("\n- ")}`:""}

FORMATE (Felder)
- mc: {"type":"mc","afb","prompt","options":[4 Antworten],"answer":Index der richtigen (0-3),"explain":"1 Satz","quote","sections"}
- text: {"type":"text","afb","prompt","model_answer":"Musterlösung, 1-3 Sätze","key_points":["Kernpunkt",...],"quote","sections"}
- match: {"type":"match","afb","prompt","pairs":[{"left","right"}, 3 bis 5 Paare],"quote","sections"}
- cloze: {"type":"cloze","afb","prompt":"Satz/Sätze mit ___ für jede Lücke (1-3 Lücken)","blanks":[["Lösung","erlaubte Variante"],...] in Reihenfolge der Lücken,"quote","sections"}

Antworte nur mit JSON: {"questions":[...]}

MATERIAL
${material}`;
}
function validateQ(set,q){
  if(!q||!TYPE_LABEL[q.type]||!q.prompt||!q.quote) return null;
  const loc=locateQuote(set,q.quote); if(!loc) return null;
  const afb=["I","II","III"].includes(q.afb)?q.afb:"II";
  const base={id:rid("q"),type:q.type,afb,prompt:String(q.prompt),quote:String(q.quote),fileName:loc.fileName,sections:[...new Set([...(loc.sectionIds||[]),...((q.sections||[]).filter(id=>set.sections.some(s=>s.id===id)))])]};
  if(q.type==="mc"){ const o=(q.options||[]).map(String).filter(Boolean); const a=Number(q.answer); if(o.length<3||!(a>=0&&a<o.length)) return null; return {...base,options:o,answer:a,explain:q.explain||""}; }
  if(q.type==="text"){ if(!q.model_answer) return null; return {...base,model_answer:String(q.model_answer),key_points:(q.key_points||[]).map(String)}; }
  if(q.type==="match"){ const p=(q.pairs||[]).filter(x=>x&&x.left&&x.right).map(x=>({left:String(x.left),right:String(x.right)})); if(p.length<2||new Set(p.map(x=>x.right)).size!==p.length) return null; return {...base,pairs:p}; }
  if(q.type==="cloze"){ const n=(String(q.prompt).match(/___/g)||[]).length; const b=(q.blanks||[]).map(x=>Array.isArray(x)?x.map(String):[String(x)]); if(!n||b.length!==n) return null; return {...base,blanks:b}; }
  return null;
}
async function generateQuestions(set,{n=15,restrict=null,onStatus,signal}={}){
  const want=mixFor(n); const got={mc:[],text:[],match:[],cloze:[]}; let dropped=0;
  const avoid=(set.history||[]).flatMap(h=>h.prompts||[]).slice(-60);
  for(let attempt=0;attempt<2;attempt++){
    const need={}; let any=false; for(const k in want){ need[k]=Math.max(0,want[k]-got[k].length); if(need[k]) any=true; }
    if(!any) break;
    onStatus&&onStatus(attempt?"Ersetze verworfene Fragen …":"Claude erstellt die Fragen. Das dauert meist 20–60 Sekunden …");
    const res=await CAP.sample.json(buildPrompt(set,need,restrict,[...avoid,...Object.values(got).flat().map(q=>q.prompt)]),{modelTier:"default",cache:false,signal});
    const list=Array.isArray(res)?res:(res&&res.questions)||[];
    for(const raw of list){ const q=validateQ(set,raw); if(!q){dropped++;continue;} if(got[q.type].length<want[q.type]) got[q.type].push(q); }
  }
  const qs=[...got.mc,...got.text,...got.match,...got.cloze];
  return {qs:shuffle(qs),dropped};
}
function exampleQuestions(set){ return shuffle(EXAMPLE_QUESTIONS.map(q=>{ const v=validateQ(set,q); return v; }).filter(Boolean)); }

/* ---------- Durchgang ---------- */
function prepQuestion(q){
  const d={...q};
  if(q.type==="mc"){ const idx=shuffle(q.options.map((_,i)=>i)); d.view={order:idx}; }
  if(q.type==="match"){ d.view={rights:shuffle(q.pairs.map(p=>p.right))}; }
  return d;
}
async function startRound(set,{n=15,restrict=null,label=null,reuse=false,planRef=null,fresh=false}={}){
  let qs;
  if(reuse && set.round){ qs=shuffle(set.round.qs.map(q=>prepQuestion(q))); }
  else if(set.example && !restrict && !fresh){ qs=exampleQuestions(set).map(prepQuestion); qs.forEach(q=>q.sections.forEach(id=>{ set.coverage[id]=(set.coverage[id]||0)+1; })); }
  else{
    if(!CAP.sample){ toast("Dafür braucht Merkwerk Claude (in claude.ai öffnen)"); return; }
    const box=$("#roundStatus"); const ctl=new AbortController();
    if(box){ box.hidden=false; box.innerHTML=`<div class="row"><span class="spin"></span><span id="rsTxt">Starte …</span><span class="spacer"></span><button class="btn sm" id="rsStop">Abbrechen</button></div>`; $("#rsStop").onclick=()=>ctl.abort(); }
    try{
      const r=await generateQuestions(set,{n,restrict,signal:ctl.signal,onStatus:t=>{const e=$("#rsTxt"); if(e) e.textContent=t;}});
      if(!r.qs.length){ if(box) box.innerHTML=`<div class="note bad">Es konnte keine belegte Frage erzeugt werden. Prüfe unter „Gelesenen Text ansehen“, ob der Text richtig gelesen wurde.</div>`; return; }
      qs=r.qs.map(prepQuestion);
      if(r.qs.length<n) toast(`${r.qs.length} von ${n} Fragen belegt – ${r.dropped} ohne gültiges Zitat verworfen`,4200);
      else if(r.dropped) toast(`${r.dropped} Fragen ohne gültiges Zitat verworfen und ersetzt`,3500);
    }catch(e){ if(box){ if(e&&e.code==="cancelled"){box.hidden=true;} else box.innerHTML=`<div class="note bad">${esc(sampleErr(e))}</div>`; } return; }
    qs.forEach(q=>q.sections.forEach(id=>{ set.coverage[id]=(set.coverage[id]||0)+1; }));
  }
  set.round={qs,idx:0,results:[],phase:"q",label,restrict,planRef,startedAt:Date.now()};
  await putSet(set); S.activeSet=set.id; save(); go("learn",{setId:set.id});
}

/* ---------- Bewertung ---------- */
const cmp=s=>norm(s).replace(/ß/g,"ss").replace(/[^a-z0-9äöü]+/g," ").trim();
async function gradeText(q,answer){
  if(!CAP.sample) return null;
  const r=await CAP.sample.json(`Bewerte die Antwort eines Lernenden auf eine Prüfungsfrage. Bewerte nur inhaltlich anhand der Musterlösung und des Belegs, Rechtschreibung zählt nicht.

Frage: ${q.prompt}
Musterlösung: ${q.model_answer}
Kernpunkte: ${(q.key_points||[]).join("; ")}
Beleg aus dem Material: "${q.quote}"

Antwort des Lernenden: """${answer.slice(0,3000)}"""

Antworte nur mit JSON: {"verdict":"richtig"|"teilweise"|"falsch","score":Zahl 0 bis 1,"feedback":"2 bis 3 Sätze auf Deutsch, direkt an den Lernenden, was stimmt und was fehlt"}`,{modelTier:"default",cache:false});
  const score=clamp(Number(r.score)||0,0,1);
  return {correct: r.verdict==="richtig" || score>=0.6, verdict:r.verdict||"", score, feedback:String(r.feedback||"")};
}

/* ---------- Ansicht Lernen ---------- */
VIEWS.learn = async function(m,arg){
  if(arg&&arg.setId) S.activeSet=arg.setId;
  if(!SETS.length) await loadSets();
  const set=setById(S.activeSet)||SETS[0];
  if(set&&set.round&&set.round.phase!=="done"&&!(arg&&arg.manage)){ return renderRound(m,set); }
  m.innerHTML=`<div class="view">
    <div class="row"><div class="stack" style="gap:4px"><h1>Lernen</h1><p class="muted">Lade PDF-, DOCX- oder Bilddateien hoch. Jeder Durchgang hat 15 Prüfungsfragen, jede mit einem wörtlichen Beleg aus deinem Material.</p></div></div>
    <div class="row" id="setChips"></div>
    <div id="setPanel"></div>
  </div>`;
  const chips=$("#setChips");
  chips.innerHTML=SETS.map(s=>`<button class="chip" aria-pressed="${s.id===(set&&set.id)}" data-id="${s.id}">${esc(s.name)}${s.example?' <span class="pill mark">Beispiel</span>':""}</button>`).join("")+
    `<button class="chip" id="newSet">+ Neues Lernset</button>${SETS.some(s=>s.example)?"":`<button class="chip" id="exBtn">Beispiel ausprobieren</button>`}`;
  $$("[data-id]",chips).forEach(b=>b.onclick=()=>{S.activeSet=b.dataset.id;save(false);go("learn",{manage:true});});
  $("#newSet").onclick=async()=>{const s=newSet("Lernset "+(SETS.length+1));await putSet(s);S.activeSet=s.id;save();go("learn",{manage:true});};
  const ex=$("#exBtn"); if(ex) ex.onclick=async()=>{const s=await makeExampleSet();S.activeSet=s.id;save();go("learn",{manage:true});};
  renderSetPanel($("#setPanel"),set);
};

function renderSetPanel(el,set){
  if(!set){ el.innerHTML=`<div class="empty stack" style="align-items:center"><h3>Noch kein Lernset</h3><p>Lege ein Lernset an und lade dein Material hoch – oder probiere zuerst das Beispiel zur Photosynthese aus.</p><div class="row" style="justify-content:center"><button class="btn primary" id="e1">Beispiel ausprobieren</button><button class="btn" id="e2">Eigenes Lernset anlegen</button></div></div>`;
    $("#e1").onclick=async()=>{const s=await makeExampleSet();S.activeSet=s.id;save();go("learn",{manage:true});};
    $("#e2").onclick=async()=>{const s=newSet("Lernset 1");await putSet(s);S.activeSet=s.id;save();go("learn",{manage:true});}; return; }
  const cov=coverageOf(set); const subjOpts=[...new Set([...(S.mySubjects||[]),set.subject].filter(Boolean))];
  const last=(set.history||[]).slice(-1)[0];
  el.innerHTML=`<div class="grid2">
   <section class="sheet stack">
     ${set.example?`<div class="note">Beispiel: Text und Fragen zur Photosynthese sind von Merkwerk selbst geschrieben, nicht aus deinem Material.</div>`:""}
     <label class="f">Name<input type="text" id="setName" value="${esc(set.name)}"></label>
     <label class="f">Fach<input type="text" id="setSubj" list="subjList" value="${esc(set.subject||"")}" placeholder="z. B. Biologie"><datalist id="subjList">${subjOpts.map(s=>`<option value="${esc(s)}">`).join("")}</datalist></label>
     <div class="stack" style="gap:6px"><div class="row"><span class="label">Abdeckung</span><span class="spacer"></span><span class="mono small">${cov.done}/${cov.n} Abschnitte · ${cov.pct} %</span></div><div class="bar mark"><i style="width:${cov.pct}%"></i></div><p class="small muted">Neue Fragen nehmen zuerst die Abschnitte dran, die noch nicht abgefragt wurden.</p></div>
     ${last?`<p class="small">Letzter Durchgang: <b class="mono">${last.pct} %</b> am ${new Date(last.at).toLocaleDateString("de-DE")}</p>`:""}
     <div id="roundStatus" hidden></div>
     <div class="row">
       <button class="btn primary" id="startBtn" ${set.files.length?"":"disabled"}>Durchgang starten · 15 Fragen</button>
       ${set.round&&set.round.qs?`<button class="btn" id="sameBtn">Letzte Fragen neu gemischt</button>`:""}
     </div>
     ${set.example?"":needClaude()}
     <div class="row"><span class="spacer"></span><button class="btn ghost danger sm" id="delSet">Lernset löschen</button></div>
   </section>
   <section class="sheet stack">
     <h3>Material</h3>
     ${set.example?"":`<div class="dropzone" id="dz" tabindex="0" role="button" aria-label="Dateien hochladen"><b>Dateien hierher ziehen oder klicken</b><br><span class="small muted">PDF, DOCX, TXT, Fotos und Screenshots · keine alten .doc-Dateien</span><input type="file" id="fileIn" multiple accept=".pdf,.docx,.txt,.md,image/*" hidden></div>
     <div id="upStatus" class="small"></div>`}
     <div class="list">${set.files.map(f=>`<div class="li"><div class="grow"><b>${esc(f.name)}</b><div class="small muted">${f.text.length.toLocaleString("de-DE")} Zeichen · ${set.sections.filter(s=>s.fileId===f.id).length} Abschnitte ${f.ocr?'· <span class="pill warn">von Claude abgeschrieben – bitte prüfen</span>':""}</div></div>${set.example?"":`<button class="btn ghost sm danger" data-rm="${f.id}">Entfernen</button>`}</div>`).join("")||`<p class="muted small">Noch keine Dateien.</p>`}</div>
     ${set.files.length?`<details id="readText"><summary>Gelesenen Text ansehen</summary><div class="stack" style="margin-top:10px">${set.files.map(f=>`<div class="stack" style="gap:6px"><span class="label">${esc(f.name)}</span>${set.example?`<div class="pre">${esc(f.text)}</div>`:`<textarea id="tx_${f.id}" style="min-height:200px">${esc(f.text)}</textarea><div><button class="btn sm" data-savetx="${f.id}">Korrektur speichern</button></div>`}</div>`).join("")}</div></details>`:""}
   </section></div>`;
  const nameIn=$("#setName"), subjIn=$("#setSubj");
  nameIn.onchange=async()=>{set.name=nameIn.value.trim()||"Lernset";await putSet(set);go("learn",{manage:true});};
  subjIn.onchange=async()=>{set.subject=subjIn.value.trim();await putSet(set);};
  $("#startBtn").onclick=()=>startRound(set,{n:15});
  const sb=$("#sameBtn"); if(sb) sb.onclick=()=>startRound(set,{reuse:true});
  $("#delSet").onclick=async()=>{ if(await confirmBox(`Lernset „${set.name}“ löschen?`)){ await idb.del(set.id); SETS=SETS.filter(s=>s.id!==set.id); S.activeSet=SETS[0]?SETS[0].id:null; S.items.forEach(it=>{ if(it.setId===set.id) it.setId=null; }); save(); go("learn",{manage:true}); } };
  $$("[data-rm]").forEach(b=>b.onclick=async()=>{ set.files=set.files.filter(f=>f.id!==b.dataset.rm); set.sections=makeSections(set.files); set.coverage={}; await putSet(set); go("learn",{manage:true}); });
  $$("[data-savetx]").forEach(b=>b.onclick=async()=>{ const f=set.files.find(x=>x.id===b.dataset.savetx); f.text=$("#tx_"+f.id).value; set.sections=makeSections(set.files); set.coverage={}; await putSet(set); toast("Text gespeichert – Abschnitte neu gebildet"); go("learn",{manage:true}); });
  const dz=$("#dz"); if(dz){ const fi=$("#fileIn");
    dz.onclick=()=>fi.click(); dz.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();fi.click();}};
    dz.ondragover=e=>{e.preventDefault();dz.classList.add("over");}; dz.ondragleave=()=>dz.classList.remove("over");
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove("over");addFiles(set,[...e.dataTransfer.files]);};
    fi.onchange=()=>addFiles(set,[...fi.files]); }
}
async function addFiles(set,files){
  const st=$("#upStatus"); const errs=[];
  for(const f of files){
    try{ const r=await readFile(f,t=>{st.innerHTML=`<span class="spin"></span> ${esc(t)}`;});
      if(!r.text.trim()){ errs.push(`„${f.name}“: Kein Text gefunden.`); continue; }
      set.files.push({id:rid("f_"),name:f.name,kind:r.kind,text:r.text,ocr:r.ocr});
    }catch(e){ errs.push(e&&e.code?`„${f.name}“: ${sampleErr(e)}`:String(e.message||e)); }
  }
  set.sections=makeSections(set.files); await putSet(set);
  go("learn",{manage:true});
  if(errs.length) setTimeout(()=>{const s=$("#upStatus"); if(s) s.innerHTML=`<div class="note bad">${errs.map(esc).join("<br>")}</div>`;},50);
  else toast(`${files.length} Datei(en) gelesen`);
}

function renderRound(m,set){
  const R=set.round; if(R.phase==="end") return renderEnd(m,set);
  const q=R.qs[R.idx]; const res=R.results[R.idx];
  const pct=Math.round(R.idx/R.qs.length*100);
  m.innerHTML=`<div class="view">
   <div class="row"><button class="btn ghost sm" id="backSets">← ${esc(set.name)}</button><span class="spacer"></span>${R.label?`<span class="pill mark">${esc(R.label)}</span>`:""}${set.example?'<span class="pill mark">Beispiel</span>':""}</div>
   <section class="sheet stack" style="gap:16px">
     <div class="q-head"><span class="mono small">Frage ${R.idx+1} / ${R.qs.length}</span><span class="pill">${TYPE_LABEL[q.type]}</span><span class="pill warn">${AFB_LABEL[q.afb]}</span></div>
     <div class="bar"><i style="width:${pct}%"></i></div>
     <p class="q-prompt">${q.type==="cloze"?"Fülle die Lücken.":esc(q.prompt)}</p>
     <div id="qBody" class="stack"></div>
     <div id="qFb"></div>
   </section></div>`;
  $("#backSets").onclick=()=>go("learn",{manage:true});
  const body=$("#qBody"); const fb=$("#qFb");
  const done=!!res;
  const finish=async(r)=>{ R.results[R.idx]=r; await putSet(set); renderRound(m,set); };
  if(q.type==="mc"){
    body.innerHTML=q.view.order.map((oi,k)=>{ let cls=""; if(done){ if(oi===q.answer) cls="right"; else if(res.given===oi) cls="wrong"; } return `<button class="opt ${cls}" data-oi="${oi}" ${done?"disabled":""}><span class="k">${"ABCD"[k]||k+1}</span><span>${esc(q.options[oi])}</span></button>`;}).join("");
    if(!done) $$(".opt",body).forEach(b=>b.onclick=()=>{ const oi=Number(b.dataset.oi); finish({correct:oi===q.answer,given:oi}); });
  }
  if(q.type==="text"){
    body.innerHTML=`<textarea id="ans" placeholder="Deine Antwort …" ${done?"disabled":""}>${esc(done?res.given:"")}</textarea>${done?"":`<div class="row"><button class="btn primary" id="chk">Antwort prüfen</button><span id="gs" class="small muted"></span></div>`}`;
    if(!done) $("#chk").onclick=async()=>{ const a=$("#ans").value.trim(); if(!a){toast("Schreib zuerst eine Antwort");return;}
      if(!CAP.sample){ // Selbsteinschätzung
        $("#gs").innerHTML=""; fb.innerHTML=`<div class="feedback" style="border:1px solid var(--line)"><b>Musterlösung</b><p>${esc(q.model_answer)}</p><p class="small muted">Ohne Claude kann Merkwerk schriftliche Antworten nicht bewerten. Vergleiche selbst:</p><div class="row"><button class="btn" id="selfOk">Hatte ich richtig</button><button class="btn" id="selfBad">Hatte ich nicht richtig</button></div></div>`;
        $("#selfOk").onclick=()=>finish({correct:true,given:a,feedback:"Selbst eingeschätzt."}); $("#selfBad").onclick=()=>finish({correct:false,given:a,feedback:"Selbst eingeschätzt."}); return; }
      $("#chk").disabled=true; $("#gs").innerHTML=`<span class="spin"></span> Claude prüft deine Antwort …`;
      try{ const g=await gradeText(q,a); finish({correct:g.correct,given:a,feedback:g.feedback,verdict:g.verdict}); }
      catch(e){ $("#gs").textContent=sampleErr(e); $("#chk").disabled=false; } };
  }
  if(q.type==="match"){
    body.innerHTML=q.pairs.map((p,i)=>{ const g=done?res.given[i]:""; const ok=done&&g===p.right; return `<div class="match-row"><b>${esc(p.left)}</b><select id="m${i}" ${done?"disabled":""} class="${done?(ok?"right":"wrong"):""}" style="${done?`border-color:var(--${ok?"ok":"bad"})`:""}"><option value="">– zuordnen –</option>${q.view.rights.map(r=>`<option ${g===r?"selected":""}>${esc(r)}</option>`).join("")}</select></div>`;}).join("")+(done?"":`<div><button class="btn primary" id="chk">Zuordnung prüfen</button></div>`);
    if(!done) $("#chk").onclick=()=>{ const given=q.pairs.map((_,i)=>$("#m"+i).value); if(given.some(x=>!x)){toast("Ordne zuerst alles zu");return;} const n=given.filter((g,i)=>g===q.pairs[i].right).length; finish({correct:n===q.pairs.length,given,partial:`${n}/${q.pairs.length}`}); };
  }
  if(q.type==="cloze"){
    let k=0; const html=esc(q.prompt).replace(/___/g,()=>{ const i=k++; const g=done?res.given[i]:""; const ok=done&&q.blanks[i].some(b=>cmp(b)===cmp(g)); return `<input type="text" id="c${i}" aria-label="Lücke ${i+1}" value="${esc(g)}" ${done?"disabled":""} class="${done?(ok?"right":"wrong"):""}" size="${Math.max(8,(q.blanks[i][0]||"").length+2)}">`; });
    body.innerHTML=`<p class="cloze" style="font-size:1.1rem;line-height:2.1">${html}</p>${done?"":`<div><button class="btn primary" id="chk">Lücken prüfen</button></div>`}`;
    if(!done){ $("#chk").onclick=()=>{ const given=q.blanks.map((_,i)=>$("#c"+i).value.trim()); if(given.some(x=>!x)){toast("Fülle zuerst alle Lücken");return;} const okAll=given.every((g,i)=>q.blanks[i].some(b=>cmp(b)===cmp(g))); finish({correct:okAll,given}); };
      body.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.tagName==="INPUT"){e.preventDefault();$("#chk").click();}}); }
  }
  if(done){
    const sol = q.type==="mc"?esc(q.options[q.answer]) : q.type==="text"?esc(q.model_answer) : q.type==="match"? q.pairs.map(p=>`${esc(p.left)} → ${esc(p.right)}`).join("<br>") : q.blanks.map((b,i)=>`Lücke ${i+1}: ${esc(b[0])}`).join("<br>");
    fb.innerHTML=`<div class="feedback ${res.correct?"ok":"bad"}" role="status">
      <b>${res.correct?"Richtig":res.verdict==="teilweise"?"Teilweise richtig – noch nicht ganz":"Leider falsch"}${res.partial&&!res.correct?` · ${res.partial} richtig zugeordnet`:""}</b>
      ${res.feedback?`<p>${esc(res.feedback)}</p>`:""}
      ${!res.correct||q.type==="text"?`<div><span class="label">Lösung</span><p>${sol}</p></div>`:""}
      ${q.explain&&!res.correct?`<p class="small">${esc(q.explain)}</p>`:""}
      <div><span class="label">Beleg aus ${esc(q.fileName)}</span><p class="quote">„${esc(q.quote)}“</p></div>
      <div class="row"><button class="btn primary" id="nextQ">${R.idx+1<R.qs.length?"Nächste Frage":"Auswertung ansehen"}</button></div></div>`;
    $("#nextQ").onclick=async()=>{ if(R.idx+1<R.qs.length){R.idx++;} else { R.phase="end"; const pctv=Math.round(R.results.filter(r=>r&&r.correct).length/R.qs.length*100); (set.history ||= []).push({at:Date.now(),pct:pctv,prompts:R.qs.map(q=>q.prompt)}); if(R.planRef) markPlanDone(R.planRef,pctv); } await putSet(set); renderRound(m,set); };
    $("#nextQ").focus();
  }
}
function renderEnd(m,set){
  const R=set.round; const n=R.qs.length; const right=R.results.filter(r=>r&&r.correct).length; const pct=Math.round(right/n*100);
  const by={}; R.qs.forEach((q,i)=>{ by[q.type] ||= {n:0,r:0}; by[q.type].n++; if(R.results[i]&&R.results[i].correct) by[q.type].r++; });
  const wrong=R.qs.map((q,i)=>({q,r:R.results[i]})).filter(x=>!x.r||!x.r.correct);
  const cov=coverageOf(set);
  m.innerHTML=`<div class="view">
   <div class="row"><button class="btn ghost sm" id="backSets">← ${esc(set.name)}</button></div>
   <section class="sheet stack" style="gap:18px">
     <div class="row" style="align-items:flex-end;gap:18px"><div class="score mono">${pct}<span style="font-size:1.6rem"> %</span></div><div class="stack" style="gap:2px"><h2>Durchgang beendet</h2><p class="muted">${right} von ${n} Fragen richtig${R.label?` · ${esc(R.label)}`:""}</p></div></div>
     <div class="scrollx"><table class="t"><thead><tr><th>Aufgabenformat</th><th style="text-align:right">Richtig</th><th style="text-align:right">Quote</th></tr></thead><tbody>
      ${Object.keys(TYPE_LABEL).filter(k=>by[k]).map(k=>`<tr><td>${TYPE_LABEL[k]}</td><td class="n">${by[k].r} / ${by[k].n}</td><td class="n">${Math.round(by[k].r/by[k].n*100)} %</td></tr>`).join("")}
     </tbody></table></div>
     <div class="stack" style="gap:6px"><div class="row"><span class="label">Abdeckung des Materials</span><span class="spacer"></span><span class="mono small">${cov.pct} %</span></div><div class="bar mark"><i style="width:${cov.pct}%"></i></div></div>
     <div class="row"><button class="btn primary" id="again">Dieselben Fragen in neuer Reihenfolge</button><button class="btn" id="fresh">15 neue Fragen</button></div>
     <div id="roundStatus" hidden></div>
   </section>
   ${wrong.length?`<section class="sheet stack"><h3>Falsch beantwortet (${wrong.length})</h3><div class="list">${wrong.map(({q})=>`<div class="li"><div class="grow stack" style="gap:4px"><div class="row"><span class="pill">${TYPE_LABEL[q.type]}</span><span class="pill warn">AFB ${q.afb}</span></div><b>${esc(q.type==="cloze"?q.prompt.replace(/___/g,"_____"):q.prompt)}</b><p class="small">${q.type==="mc"?"Lösung: "+esc(q.options[q.answer]):q.type==="text"?"Musterlösung: "+esc(q.model_answer):q.type==="match"?q.pairs.map(p=>esc(p.left)+" → "+esc(p.right)).join(" · "):"Lösung: "+q.blanks.map(b=>esc(b[0])).join(", ")}</p><p class="quote small">„${esc(q.quote)}“ <span class="muted">– ${esc(q.fileName)}</span></p></div></div>`).join("")}</div></section>`:`<div class="note">Alles richtig. Mit „15 neue Fragen“ gehst du an Abschnitte, die noch nicht abgefragt wurden.</div>`}
  </div>`;
  $("#backSets").onclick=()=>{ set.round.phase="done"; putSet(set); go("learn",{manage:true}); };
  $("#again").onclick=()=>startRound(set,{reuse:true,restrict:R.restrict,label:R.label});
  $("#fresh").onclick=()=>startRound(set,{n:R.qs.length>=15?15:Math.max(6,R.qs.length),restrict:R.restrict,label:R.label,planRef:R.planRef,fresh:true});
}
