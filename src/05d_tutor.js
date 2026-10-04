/* ===================== KI-Tutor: „Warum ist das falsch?“ und Probeklausur ===================== */
// Beides braucht Claude (CAP.sample). Grundlage ist immer das eigene Material, nie Wissen von außerhalb.

const levelOf=()=>S.profile?profileLabel(S.profile):"";
function sectionsText(set,ids,budget=8000){
  return set.sections.filter(s=>ids.includes(s.id)).filter(s=>(budget-=s.text.length)>=0).map(s=>s.text).join("\n\n");
}
// Was der Lernende geantwortet hat, als lesbarer Text
function givenText(q,res){
  if(!res) return "";
  if(q.type==="mc") return q.options[res.given]||"";
  if(q.type==="text") return String(res.given||"");
  if(q.type==="match") return q.pairs.map((p,i)=>`${p.left} → ${(res.given||[])[i]||"–"}`).join("; ");
  if(q.type==="cloze") return (res.given||[]).map((g,i)=>`Lücke ${i+1}: ${g}`).join("; ");
  return "";
}

/* ---------- Warum ist das falsch? ---------- */
function whyPrompt(set,q,res,turns,ask){
  const lvl=levelOf();
  return `Du bist ein geduldiger Nachhilfelehrer auf einer Lernseite${lvl?` (Lernende: ${lvl})`:""}. Ein Lernender hat eine Prüfungsfrage falsch beantwortet.

Frage (${TYPE_LABEL[q.type]}): ${q.type==="cloze"?q.prompt.replace(/___/g,"_____"):q.prompt}
Richtige Lösung: ${solutionText(q)}
Antwort des Lernenden: ${givenText(q,res)||"(keine)"}
${res.feedback?`Bisherige Bewertung: ${res.feedback}\n`:""}Beleg aus dem Material: "${q.quote}"

MATERIAL (Ausschnitt)
${sectionsText(set,q.sections)||q.quote}
${turns.length?`\nBISHERIGES GESPRÄCH\n${turns.map(t=>(t.q?`Lernender: ${t.q}\n`:"")+`Du: ${t.a}`).join("\n\n")}\n`:""}
${ask?`Der Lernende fragt nach: """${ask.slice(0,1000)}"""
Beantworte die Nachfrage in 2 bis 5 Sätzen.`:`Erkläre in 3 bis 5 Sätzen, was an der Antwort nicht stimmt und warum die Lösung richtig ist. Gehe auf den konkreten Denkfehler ein (zum Beispiel verwechselte Begriffe), nicht nur auf das Ergebnis. Schließe mit einer kurzen Merkhilfe ab, die mit „Merke:“ beginnt.`}
Sprich den Lernenden mit „du“ an, schreib einfach und passend zur Stufe. Stütze dich nur auf das Material; wenn es eine Nachfrage nicht beantwortet, sag das ehrlich. Kein Markdown, keine Überschriften.`;
}
async function explainWrong(set,q,res,ask,onText){
  const turns=res.why||[];
  const {text}=await CAP.sample(whyPrompt(set,q,res,turns,ask),{modelTier:"default",cache:false,onText:u=>onText&&onText(u.text)});
  return String(text||"").trim();
}
// Kasten unter der Lösung einer falsch beantworteten Frage
function mountWhy(el,set,q,res){
  if(!el) return;
  if(!CAP.sample){ el.innerHTML=""; return; }
  const turns=res.why||[];
  el.innerHTML=`<div class="why stack" style="gap:8px">
    ${turns.map(t=>`${t.q?`<p class="small muted">Du: ${esc(t.q)}</p>`:""}<p class="why-a">${esc(t.a)}</p>`).join("")}
    <div id="whyLive" hidden><p class="why-a"></p></div>
    <div id="whyErr"></div>
    ${turns.length?`<div class="row" style="flex-wrap:nowrap"><input type="text" id="whyAsk" placeholder="Nachfragen, z. B. „Was ist der Unterschied zu …?“" style="flex:1"><button class="btn sm" id="whyGo">Fragen</button></div>`
      :`<div><button class="btn sm" id="whyGo">Warum ist das falsch?</button></div>`}
  </div>`;
  const go=$("#whyGo",el), inp=$("#whyAsk",el);
  const run=async()=>{
    const ask=inp?inp.value.trim():"";
    if(inp&&!ask){ inp.focus(); return; }
    go.disabled=true; if(inp) inp.disabled=true;
    const live=$("#whyLive",el); live.hidden=false; live.firstElementChild.innerHTML=`<span class="spin"></span> Claude erklärt …`;
    try{
      const a=await explainWrong(set,q,res,ask,t=>{ live.firstElementChild.textContent=t; });
      res.why=[...turns,{q:ask||null,a}]; await putSet(set); mountWhy(el,set,q,res);
    }catch(e){ live.hidden=true; $("#whyErr",el).innerHTML=`<div class="note bad small">${esc(sampleErr(e))}</div>`; go.disabled=false; if(inp) inp.disabled=false; }
  };
  go.onclick=run;
  if(inp) inp.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); run(); } };
}

/* ---------- Probeklausur ---------- */
const EXAM_DURATIONS=[30,45,60,90,0]; // 0 = ohne Zeitlimit
const examTaskCount=min=>min<=30?4:min<=45?5:min<=60?6:min<=90?7:5;
const examPoints=min=>min?Math.round(min*0.8/5)*5:40; // etwa 0,8 Bewertungseinheiten pro Minute
const examById=id=>(S.exams||[]).find(e=>e.id===id);
const examSubjectOf=set=>(set.subject||"").trim();
function examSets(subject,fallback){
  const withFiles=SETS.filter(s=>s.files&&s.files.length);
  const same=subject?withFiles.filter(s=>examSubjectOf(s)&&(examSubjectOf(s).toLowerCase()===subject.toLowerCase()||sameSubject(examSubjectOf(s),subject))):[];
  if(same.length) return same;
  return fallback?[fallback]:[];
}

// Schätzung nach der Notenpunkte-Skala der Oberstufe (wie im Abitur). Lehrkräfte nutzen teils andere Schlüssel.
const NP_STEPS=[95,90,85,80,75,70,65,60,55,50,45,40,33,27,20]; // ab x % → 15, 14, … 1 Notenpunkte
function notenpunkte(pct){ const i=NP_STEPS.findIndex(p=>pct>=p); return i<0?0:15-i; }
function noteFromNP(np){ if(np===0) return "6"; const n=5-Math.floor((np-1)/3); const t=(np-1)%3; return n+(t===2?"+":t===0?"-":""); }
const UNI_STEPS=[[95,"1,0"],[90,"1,3"],[85,"1,7"],[80,"2,0"],[75,"2,3"],[70,"2,7"],[65,"3,0"],[60,"3,3"],[55,"3,7"],[50,"4,0"]];
function gradeEstimate(pct,profile){
  if(profile&&profile.track==="uni"){ const s=UNI_STEPS.find(([p])=>pct>=p); return {main:s?s[1]:"5,0",sub:pct>=50?"bestanden":"nicht bestanden"}; }
  const np=notenpunkte(pct);
  const upper=profile&&Number(profile.grade)>=11;
  return {main:noteFromNP(np),sub:upper?`${np} Notenpunkte`:"",np};
}

function examPrompt(sets,subject,minutes,total){
  const n=examTaskCount(minutes); const lvl=levelOf();
  let budget=110000;
  const material=sets.map((s,si)=>{
    const parts=[]; for(const sec of s.sections){ if((budget-=sec.text.length)<0) break; parts.push(`[L${si+1}/${sec.id}]\n${sec.text}`); }
    return parts.length?`=== Lernset L${si+1}: ${s.name} ===\n${parts.join("\n\n")}`:"";
  }).filter(Boolean).join("\n\n");
  return `Du erstellst eine Probeklausur${subject?` im Fach ${subject}`:""}${lvl?` für: ${lvl}`:""}. Sie soll sich anfühlen wie eine echte Klassenarbeit bzw. Klausur dieser Schulart und Stufe. Grundlage ist AUSSCHLIESSLICH das Material unten.

REGELN
1. ${n} Aufgaben, zusammen genau ${total} Bewertungseinheiten (BE)${minutes?`, lösbar in ${minutes} Minuten`:""}. Mehr BE für umfangreichere Aufgaben.
2. Aufgaben mit Operatoren wie in echten Klausuren (nenne, beschreibe, erkläre, vergleiche, begründe, beurteile, wende an). Anforderungsbereiche etwa 30 % AFB I, 45 % AFB II, 25 % AFB III. Beginne leicht, steigere dich.
3. Mindestens eine Aufgabe verknüpft Inhalte aus verschiedenen Abschnitten${sets.length>1?" oder Lernsets":""}. Eine Aufgabe darf Teilaufgaben a), b) haben; dann steht alles in "prompt".
4. Jede Aufgabe muss sich vollständig aus dem Material beantworten lassen; keine Fakten von außerhalb.
5. "expectation": der Erwartungshorizont, also was eine volle Antwort enthalten muss, 2 bis 5 Sätze. "key_points": die Punkte, für die es BE gibt.
6. "quote": ein wörtliches, zusammenhängendes Zitat aus dem Material (40 bis 300 Zeichen), das die Lösung belegt, exakt so geschrieben wie im Material. "set": die Nummer des Lernsets (1, 2, …), aus dem das Zitat stammt.

Antworte nur mit JSON: {"title":"kurzer Titel der Klausur","tasks":[{"prompt","points":Zahl,"afb":"I"|"II"|"III","expectation","key_points":["…"],"quote","set":Zahl}]}

MATERIAL
${material}`;
}
function validateExamTask(sets,t){
  if(!t||!t.prompt||!t.expectation||!t.quote) return null;
  const pref=sets[Number(t.set)-1]; const order=pref?[pref,...sets.filter(s=>s!==pref)]:sets;
  let loc=null, from=null; for(const s of order){ loc=locateQuote(s,t.quote); if(loc){ from=s; break; } }
  if(!loc) return null;
  return {id:rid("t"),prompt:String(t.prompt),points:clamp(Math.round(Number(t.points)||0),1,40),afb:["I","II","III"].includes(t.afb)?t.afb:"II",
    expectation:String(t.expectation),key_points:(t.key_points||[]).map(String),quote:String(t.quote),fileName:loc.fileName,setId:from.id};
}
async function generateExam(sets,subject,minutes,signal){
  const total=examPoints(minutes);
  const r=await CAP.sample.json(examPrompt(sets,subject,minutes,total),{modelTier:"default",cache:false,signal});
  const tasks=((r&&r.tasks)||[]).map(t=>validateExamTask(sets,t)).filter(Boolean);
  tasks.forEach((t,i)=>t.nr=i+1);
  return {title:String((r&&r.title)||"").trim(),tasks,dropped:((r&&r.tasks)||[]).length-tasks.length};
}

function examGradePrompt(ex){
  const lvl=levelOf();
  const list=ex.tasks.filter(t=>(ex.answers[t.id]||"").trim()).map(t=>`AUFGABE ${t.nr} (${t.points} BE, AFB ${t.afb})
${t.prompt}
Erwartungshorizont: ${t.expectation}
BE-relevante Punkte: ${t.key_points.join("; ")}
Beleg aus dem Material: "${t.quote}"
Antwort: """${String(ex.answers[t.id]).slice(0,4000)}"""`).join("\n\n");
  return `Du korrigierst eine Probeklausur${ex.subject?` im Fach ${ex.subject}`:""}${lvl?` (${lvl})`:""} wie eine faire Lehrkraft nach dem Erwartungshorizont.
- Vergib für jede Aufgabe Punkte zwischen 0 und der maximalen BE, halbe Punkte sind erlaubt. Teilweise richtige Antworten bekommen Teilpunkte.
- Rechtschreib-, Tipp- und Grammatikfehler kosten keine Punkte, außer sie verändern den Sinn (anderes Fachwort, andere Zahl, Gegenteil).
- Richtige Inhalte, die anders formuliert sind als im Erwartungshorizont, zählen voll.
- "feedback": 2 bis 3 Sätze direkt an den Lernenden (du): was gut war, was für volle Punktzahl fehlt.

Antworte nur mit JSON: {"aufgaben":[{"nr":Nummer,"punkte":Zahl,"feedback":"…"}],"gesamt":"2 bis 3 Sätze: Stärken, Schwächen und was du vor der echten Klausur wiederholen solltest"}

${list}`;
}
async function gradeExam(ex,signal){
  const grading={tasks:{},overall:""};
  ex.tasks.forEach(t=>{ if(!(ex.answers[t.id]||"").trim()) grading.tasks[t.id]={points:0,feedback:"Keine Antwort abgegeben."}; });
  if(ex.tasks.some(t=>(ex.answers[t.id]||"").trim())){
    const r=await CAP.sample.json(examGradePrompt(ex),{modelTier:"default",cache:false,signal});
    for(const a of (r&&r.aufgaben)||[]){ const t=ex.tasks.find(x=>x.nr===Number(a.nr)); if(!t||grading.tasks[t.id]) continue;
      grading.tasks[t.id]={points:clamp(Math.round((Number(a.punkte)||0)*2)/2,0,t.points),feedback:String(a.feedback||"")}; }
    grading.overall=String((r&&r.gesamt)||"");
  }
  ex.tasks.forEach(t=>{ grading.tasks[t.id] ||= {points:0,feedback:"Diese Aufgabe konnte nicht bewertet werden."}; });
  grading.got=ex.tasks.reduce((a,t)=>a+grading.tasks[t.id].points,0);
  grading.max=ex.tasks.reduce((a,t)=>a+t.points,0);
  grading.pct=grading.max?Math.round(grading.got/grading.max*100):0;
  return grading;
}

function openExamDialog(set,prefill={}){
  if(!CAP.sample){ toast("Für die Probeklausur braucht Merkwerk Claude (in claude.ai öffnen)"); return; }
  const subjects=[...new Set(SETS.filter(s=>s.files&&s.files.length).map(examSubjectOf).filter(Boolean))];
  let subject=(prefill.subject||(set&&examSubjectOf(set))||"").trim();
  let minutes=45; let picked=null;
  modal(`<h2>Probeklausur</h2>
    <p class="muted small">Claude stellt aus deinem Material eine Klausur im Stil deiner Schulart und Stufe zusammen. Du schreibst sie mit Zeitlimit, danach korrigiert Claude nach dem Erwartungshorizont und schätzt deine Note.</p>
    <label class="f">Fach<input type="text" id="exSubj" list="exSubjList" value="${esc(subject)}" placeholder="z. B. Biologie"><datalist id="exSubjList">${subjects.map(s=>`<option value="${esc(s)}">`).join("")}</datalist></label>
    <div class="stack" style="gap:6px"><span class="label">Lernsets</span><div id="exSets" class="stack" style="gap:4px"></div></div>
    <div class="stack" style="gap:6px"><span class="label">Bearbeitungszeit</span><div class="row" id="exDur">${EXAM_DURATIONS.map(d=>`<button class="chip" data-d="${d}" aria-pressed="${d===minutes}">${d?d+" Min.":"ohne Zeitlimit"}</button>`).join("")}</div></div>
    <div id="exStatus"></div>
    <div class="row"><button class="btn primary" id="exGo">Klausur erstellen</button><button class="btn" data-close>Abbrechen</button></div>`,(m,close)=>{
    const drawSets=()=>{
      const list=examSets(subject,set&&set.files.length?set:null);
      if(!picked) picked=new Set(list.map(s=>s.id));
      $("#exSets",m).innerHTML=list.length?list.map(s=>`<label class="row small" style="gap:8px"><input type="checkbox" data-sid="${s.id}" ${picked.has(s.id)?"checked":""}> ${esc(s.name)} <span class="muted">${s.sections.length} Abschnitte</span></label>`).join("")
        :`<p class="small muted">Kein Lernset mit Material zu diesem Fach. Trag beim Lernset das Fach ein oder lade Material hoch.</p>`;
      $$("[data-sid]",m).forEach(c=>c.onchange=()=>{ c.checked?picked.add(c.dataset.sid):picked.delete(c.dataset.sid); });
    };
    drawSets();
    $("#exSubj",m).onchange=()=>{ subject=$("#exSubj",m).value.trim(); picked=null; drawSets(); };
    $$("[data-d]",m).forEach(b=>b.onclick=()=>{ minutes=Number(b.dataset.d); $$("[data-d]",m).forEach(x=>x.setAttribute("aria-pressed",String(x===b))); });
    let ctl=null;
    $("#exGo",m).onclick=async()=>{
      const sets=SETS.filter(s=>picked&&picked.has(s.id)&&s.files.length);
      if(!sets.length){ toast("Wähle mindestens ein Lernset"); return; }
      const st=$("#exStatus",m), btn=$("#exGo",m); btn.disabled=true; ctl=new AbortController();
      st.innerHTML=`<div class="row"><span class="spin"></span><span>Claude stellt deine Klausur zusammen. Das dauert meist 30–90 Sekunden …</span></div>`;
      try{
        const r=await generateExam(sets,subject,minutes,ctl.signal);
        if(r.tasks.length<2){ st.innerHTML=`<div class="note bad">Es konnten keine belegten Aufgaben erstellt werden. Prüfe unter „Gelesenen Text ansehen“, ob dein Material richtig gelesen wurde.</div>`; btn.disabled=false; return; }
        const ex={id:rid("ex_"),title:r.title||`Probeklausur ${subject||sets[0].name}`,subject,setIds:sets.map(s=>s.id),minutes,createdAt:Date.now(),startedAt:Date.now(),tasks:r.tasks,answers:{},phase:"write"};
        S.exams=[ex,...(S.exams||[])].slice(0,12); save();
        close(); go("exam",{id:ex.id});
        if(r.dropped) toast(`${r.dropped} Aufgabe(n) ohne gültigen Beleg aus deinem Material weggelassen`,3800);
      }catch(e){ if(e&&e.code==="cancelled") return; st.innerHTML=`<div class="note bad">${esc(sampleErr(e))}</div>`; btn.disabled=false; }
    };
    m.querySelector("[data-close]").addEventListener("click",()=>ctl&&ctl.abort());
  });
}

const fmtClock=s=>`${Math.floor(s/60)}:${pad(s%60)}`;
const examLeft=ex=>ex.minutes?Math.max(0,Math.round((ex.startedAt+ex.minutes*6e4-Date.now())/1000)):null;

VIEWS.exam=async function(m,arg){
  if(!SETS.length) await loadSets();
  const ex=examById(arg&&arg.id)||(S.exams||[])[0];
  if(!ex){ go("learn",{manage:true}); return; }
  ROUTE.arg={id:ex.id};
  if(ex.phase==="write") return renderExamWrite(m,ex);
  return renderExamResult(m,ex);
};
function backFromExam(ex){ const s=SETS.find(x=>ex.setIds.includes(x.id)); if(s) S.activeSet=s.id; go("learn",{manage:true}); }

function renderExamWrite(m,ex){
  if(ex.minutes&&examLeft(ex)===0) return submitExam(m,ex,true);
  const max=ex.tasks.reduce((a,t)=>a+t.points,0);
  m.innerHTML=`<div class="view">
   <div class="row"><button class="btn ghost sm" id="exBack">← Zurück</button><span class="spacer"></span><span class="pill mark">Probeklausur</span></div>
   <section class="sheet stack exam-head">
     <div class="row" style="align-items:flex-end"><div class="stack" style="gap:2px"><h1>${esc(ex.title)}</h1><p class="muted small">${ex.subject?esc(ex.subject)+" · ":""}${ex.tasks.length} Aufgaben · ${max} BE${ex.minutes?` · ${ex.minutes} Minuten`:""}</p></div><span class="spacer"></span>
     ${ex.minutes?`<div class="stack" style="gap:0;align-items:flex-end"><span class="label">Restzeit</span><span class="score mono exam-clock" id="exClock">${fmtClock(examLeft(ex))}</span></div>`:""}</div>
     <p class="small muted">Deine Antworten werden beim Tippen gespeichert. Du kannst die Seite verlassen und später weiterschreiben${ex.minutes?"; die Zeit läuft weiter":""}.</p>
   </section>
   ${ex.tasks.map(t=>`<section class="sheet stack" style="gap:10px">
     <div class="q-head"><b>Aufgabe ${t.nr}</b><span class="pill">${t.points} BE</span><span class="pill warn">${AFB_LABEL[t.afb]}</span></div>
     <p class="q-prompt" style="white-space:pre-line">${esc(t.prompt)}</p>
     <textarea data-tid="${t.id}" placeholder="Deine Antwort …" style="min-height:140px">${esc(ex.answers[t.id]||"")}</textarea>
   </section>`).join("")}
   <section class="sheet row"><span class="small muted" id="exCount"></span><span class="spacer"></span><button class="btn primary" id="exSubmit">Abgeben und korrigieren lassen</button></section>
  </div>`;
  const count=()=>{ const n=ex.tasks.filter(t=>(ex.answers[t.id]||"").trim()).length; $("#exCount").textContent=`${n} von ${ex.tasks.length} Aufgaben bearbeitet`; };
  count();
  $$("[data-tid]").forEach(a=>a.oninput=()=>{ ex.answers[a.dataset.tid]=a.value; save(false); count(); });
  $("#exBack").onclick=()=>{ save(); backFromExam(ex); };
  $("#exSubmit").onclick=async()=>{
    const open=ex.tasks.length-ex.tasks.filter(t=>(ex.answers[t.id]||"").trim()).length;
    if(await confirmBox(open?`Abgeben? ${open} Aufgabe${open>1?"n sind":" ist"} noch leer.`:"Klausur abgeben?","Abgeben")) submitExam(m,ex,false);
  };
  if(ex.minutes){
    const iv=setInterval(()=>{ const left=examLeft(ex); const c=$("#exClock"); if(c){ c.textContent=fmtClock(left); c.classList.toggle("low",left<=300); }
      if(left===0){ clearInterval(iv); submitExam(m,ex,true); } },1000);
    cleanup.push(()=>clearInterval(iv));
  }
}
async function submitExam(m,ex,timeUp){
  cleanup.forEach(f=>{try{f()}catch{}}); cleanup=[];
  ex.phase="grading"; ex.submittedAt=ex.submittedAt||Date.now(); ex.timeUp=ex.timeUp||timeUp; save();
  renderExamResult(m,ex);
}

function renderExamResult(m,ex){
  if(ex.phase==="grading"){
    m.innerHTML=`<div class="view"><section class="sheet stack">
      ${ex.timeUp?`<div class="note warn">Die Zeit ist abgelaufen. Deine Klausur wurde automatisch abgegeben.</div>`:""}
      <div class="row" id="exGr"><span class="spin"></span><span>Claude korrigiert deine Klausur nach dem Erwartungshorizont …</span></div></section></div>`;
    if(!CAP.sample){ $("#exGr").innerHTML=`<div class="note bad">${esc(sampleErr({code:"not_granted"}))}</div>`; return; }
    gradeExam(ex).then(g=>{ ex.grading=g; ex.phase="done"; save(); if(ROUTE.v==="exam") renderExamResult($("#main"),ex); })
      .catch(e=>{ const el=$("#exGr"); if(!el) return; el.innerHTML=`<div class="stack"><div class="note bad">${esc(sampleErr(e))}</div><div><button class="btn primary" id="exRetry">Noch einmal korrigieren</button></div></div>`; $("#exRetry").onclick=()=>renderExamResult($("#main"),ex); });
    return;
  }
  const g=ex.grading; const est=gradeEstimate(g.pct,S.profile);
  const byAfb={}; ex.tasks.forEach(t=>{ const b=byAfb[t.afb] ||= {got:0,max:0}; b.got+=g.tasks[t.id].points; b.max+=t.points; });
  const nf=v=>String(v).replace(".",",");
  m.innerHTML=`<div class="view">
   <div class="row"><button class="btn ghost sm" id="exBack">← Zurück</button><span class="spacer"></span><span class="pill mark">Probeklausur</span></div>
   <section class="sheet stack" style="gap:16px">
     <div class="row" style="align-items:flex-end;gap:18px"><div class="score mono">${esc(est.main)}</div><div class="stack" style="gap:2px"><h2>${esc(ex.title)}</h2><p class="muted">${nf(g.got)} von ${g.max} BE · ${g.pct} %${est.sub?` · ${esc(est.sub)}`:""}</p></div></div>
     <p class="small muted">Notenschätzung nach der Notenpunkte-Skala der Oberstufe${S.profile&&S.profile.track==="uni"?" bzw. dem üblichen Hochschulschlüssel":""}. Deine Lehrkraft kann einen anderen Schlüssel verwenden.</p>
     ${ex.timeUp?`<div class="note warn small">Abgegeben, weil die Zeit abgelaufen war.</div>`:""}
     ${g.overall?`<div class="feedback" style="border:1px solid var(--line)"><b>Rückmeldung</b><p>${esc(g.overall)}</p></div>`:""}
     <div class="scrollx"><table class="t"><thead><tr><th>Anforderungsbereich</th><th style="text-align:right">BE</th><th style="text-align:right">Quote</th></tr></thead><tbody>
      ${["I","II","III"].filter(k=>byAfb[k]).map(k=>`<tr><td>${AFB_LABEL[k]}</td><td class="n">${nf(byAfb[k].got)} / ${byAfb[k].max}</td><td class="n">${Math.round(byAfb[k].got/byAfb[k].max*100)} %</td></tr>`).join("")}
     </tbody></table></div>
     <div class="row"><button class="btn primary" id="exNew">Neue Probeklausur</button></div>
   </section>
   ${ex.tasks.map(t=>{ const r=g.tasks[t.id]; const full=r.points>=t.points, none=r.points===0; return `<section class="sheet stack" style="gap:10px">
     <div class="q-head"><b>Aufgabe ${t.nr}</b><span class="pill ${full?"ok":none?"":"warn"}">${nf(r.points)} / ${t.points} BE</span><span class="pill warn">AFB ${t.afb}</span></div>
     <p style="white-space:pre-line"><b>${esc(t.prompt)}</b></p>
     <div><span class="label">Deine Antwort</span><p class="pre" style="white-space:pre-wrap">${esc(ex.answers[t.id]||"–")}</p></div>
     <div class="feedback ${full?"ok":"bad"}"><p>${esc(r.feedback)}</p>
       <div><span class="label">Erwartungshorizont</span><p>${esc(t.expectation)}</p></div>
       <div><span class="label">Beleg aus ${esc(t.fileName)}</span><p class="quote">„${esc(t.quote)}“</p></div></div>
   </section>`; }).join("")}
  </div>`;
  $("#exBack").onclick=()=>backFromExam(ex);
  $("#exNew").onclick=()=>openExamDialog(SETS.find(s=>ex.setIds.includes(s.id))||null,{subject:ex.subject});
}
