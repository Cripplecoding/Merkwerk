/* ===================== Stundenplan ===================== */
const SLOTS_SCHOOL=[["07:45","08:30"],["08:35","09:20"],["09:40","10:25"],["10:30","11:15"],["11:35","12:20"],["12:25","13:10"],["13:15","14:00"],["14:00","14:45"],["14:45","15:30"],["15:30","16:15"]].map(([start,end])=>({start,end}));
const SLOTS_UNI=[["08:00","09:30"],["09:45","11:15"],["11:30","13:00"],["14:00","15:30"],["15:45","17:15"],["17:30","19:00"]].map(([start,end])=>({start,end}));
function ttSlots(){ const t=S.timetable; if(!t.slots||!t.slots.length) t.slots=(S.profile&&S.profile.track==="uni")?SLOTS_UNI:SLOTS_SCHOOL; return t.slots; }
function hueOf(s){ let h=0; for(const c of String(s)) h=(h*31+c.charCodeAt(0))%360; return h; }
const subjColor=s=>`color-mix(in oklab, hsl(${hueOf(s)} 70% 55%) 24%, var(--sheet))`;
function deriveSlots(entries){
  const pairs=[...new Map(entries.map(e=>[e.start+"-"+e.end,{start:e.start,end:e.end}])).values()].sort((a,b)=>toMin(a.start)-toMin(b.start)||toMin(a.end)-toMin(b.end));
  const out=[]; for(const p of pairs){ const last=out[out.length-1]; if(last && toMin(p.start)<toMin(last.end)) continue; out.push({...p}); }
  return out;
}
function entriesAt(day,slot){ return S.timetable.entries.filter(e=>e.day===day && toMin(e.start)<toMin(slot.end) && toMin(e.end)>toMin(slot.start)); }
function lessonsOn(date){
  const iso=isoDate(date); if(freeDates().has(iso)) return [];
  const t=calStore(); const wl=weekLetter(date);
  const res=t.entries.filter(e=>e.day===wd(date)&&!(e.week&&wl&&e.week!==wl)&&!t.moves[e.id+"|"+iso]).map(e=>({...e,cancelled:!!t.cancel[e.id+"|"+iso]}));
  for(const k in t.moves){ const mv=t.moves[k]; if(mv.date!==iso) continue; const l=t.entries.find(x=>x.id===k.split("|")[0]); if(l) res.push({...l,start:mv.start,end:mv.end,moved:true}); }
  return res.sort((a,b)=>toMin(a.start)-toMin(b.start));
}

let TT_DAY=null;
VIEWS.tt = function(m,arg){
  const mode=S.ttMode||"cal";
  const t=S.timetable; const slots=ttSlots(); const nd=t.days||5;
  const now=new Date(); const nowD=wd(now), nowM=now.getHours()*60+now.getMinutes();
  const narrow=window.innerWidth<620; if(TT_DAY===null||TT_DAY>=nd) TT_DAY=nowD<nd?nowD:0;
  const cols=narrow?[TT_DAY]:[...Array(nd).keys()];
  m.innerHTML=`<div class="view">
   <div class="row" style="align-items:flex-end"><div class="stack" style="gap:4px"><h1>Stundenplan & Kalender</h1><p class="muted">${mode==="cal"?"Unterricht, Klausuren, Abgaben, Lerneinheiten und eigene Termine in einem Kalender. Zieh im Kalender über eine freie Zeit, um etwas einzutragen.":"Tippe auf ein Feld, um eine Stunde einzutragen – oder importiere deinen Plan."}</p></div></div>
   <div class="row" style="gap:6px" role="group" aria-label="Ansicht"><button class="chip" data-mode="cal" aria-pressed="${mode==="cal"}">Kalender</button><button class="chip" data-mode="grid" aria-pressed="${mode==="grid"}">Wochenraster</button></div>
   <div class="row">
     <button class="btn primary" id="impShot">Aus Screenshot übernehmen</button>
     <button class="btn" id="impIcs">WebUntis / Kalenderdatei (.ics)</button>
     <button class="btn" id="slotsBtn">Zeiten anpassen</button>
     <label class="row small" style="gap:6px"><input type="checkbox" id="satChk" ${nd>5?"checked":""}> Samstag</label>
     <span class="spacer"></span>${t.entries.length?`<button class="btn ghost danger sm" id="clearTT">Plan leeren</button>`:""}
   </div>
   <input type="file" id="shotIn" accept="image/*" hidden><input type="file" id="icsIn" accept=".ics,text/calendar" hidden>
   <div id="impBox"></div>
   ${mode==="cal"?`<section class="sheet stack" id="calWrap"><div class="row small" id="calBar"></div><div id="calBox"><p class="muted"><span class="spin"></span> Kalender wird geladen …</p></div></section>`:`
   ${narrow?`<div class="row" style="gap:6px">${DAYS.slice(0,nd).map((d,i)=>`<button class="chip" data-tday="${i}" aria-pressed="${i===TT_DAY}">${d}${i===nowD?" ·":""}</button>`).join("")}</div>`:""}
   <section class="sheet ${narrow?"":"scrollx"}">
     <div class="tt" style="grid-template-columns:62px repeat(${cols.length},minmax(0,1fr));${narrow?"min-width:0":""}">
       <div></div>${cols.map(i=>`<div class="h" ${i===nowD?'style="color:var(--accent)"':""}>${DAYS_LONG[i]}</div>`).join("")}
       ${slots.map((s,si)=>`<div class="time">${si+1}.<br>${s.start}<br>${s.end}</div>`+cols.map(di=>{ const es=entriesAt(di,s); const e=es[0]; const isNow=di===nowD&&nowM>=toMin(s.start)&&nowM<toMin(s.end);
          return e?`<button class="cell filled ${isNow?"now":""}" style="--c:${subjColor(e.subject)}" data-d="${di}" data-s="${si}" data-id="${e.id}"><b>${esc(e.subject)}</b><span>${esc([e.room,e.teacher].filter(Boolean).join(" · "))}${e.week?` · Woche ${e.week}`:""}${es.length>1?` · +${es.length-1}`:""}</span></button>`
                  :`<button class="cell ${isNow?"now":""}" data-d="${di}" data-s="${si}" aria-label="${DAYS_LONG[di]} ${si+1}. Stunde eintragen"></button>`; }).join("")).join("")}
     </div>
   </section>`}
   ${t.entries.length?"":`<div class="empty">Dein Stundenplan ist noch leer. Am schnellsten geht es mit einem Screenshot aus WebUntis oder deinem Uni-Portal.</div>`}
  </div>`;
  $$("[data-mode]").forEach(b=>b.onclick=()=>{S.ttMode=b.dataset.mode;save(false);render();});
  if(mode==="cal") mountCalendar($("#calBox"),$("#calBar"),arg&&arg.date);
  $$("[data-tday]").forEach(b=>b.onclick=()=>{TT_DAY=Number(b.dataset.tday);render();});
  $("#satChk").onchange=e=>{t.days=e.target.checked?6:5;save();render();};
  $$(".tt .cell").forEach(c=>c.onclick=()=>editLesson(Number(c.dataset.d),slots[Number(c.dataset.s)],c.dataset.id));
  $("#impShot").onclick=()=>{ if(!CAP.sample||!CAP.images){ $("#impBox").innerHTML=needClaude()||`<div class="note warn">Bilder kann Claude in dieser Ansicht nicht lesen.</div>`; return; } $("#shotIn").click(); };
  $("#shotIn").onchange=e=>{ const f=e.target.files[0]; if(f) importShot(f); };
  $("#impIcs").onclick=()=>showIcsHelp();
  $("#icsIn").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try{ const list=parseIcsTimetable(await f.text()); previewImport(list,"Kalenderdatei"); }catch(err){ $("#impBox").innerHTML=`<div class="note bad">${esc(err.message||err)}</div>`; } };
  $("#slotsBtn").onclick=editSlots;
  const ct=$("#clearTT"); if(ct) ct.onclick=async()=>{ if(await confirmBox("Ganzen Stundenplan leeren?","Leeren")){ t.entries=[]; save(); render(); } };
};

function editLesson(day,slot,id){
  const t=S.timetable; const e=id?t.entries.find(x=>x.id===id):null;
  const others=id?entriesAt(day,slot).filter(x=>x.id!==id):[];
  const subs=[...new Set([...(S.mySubjects||[]),...t.entries.map(x=>x.subject)])];
  modal(`<h2>${DAYS_LONG[day]}, ${esc(slot.start)}–${esc(slot.end)}</h2>
   ${others.length?`<p class="small muted">Außerdem in diesem Feld: ${others.map(o=>`<button class="chip" data-other="${o.id}">${esc(o.subject)}${o.week?" (Woche "+o.week+")":""}</button>`).join(" ")}</p>`:""}
   <label class="f">Fach / Veranstaltung<input type="text" id="lS" list="lSl" value="${esc(e?e.subject:"")}"><datalist id="lSl">${subs.map(s=>`<option value="${esc(s)}">`).join("")}</datalist></label>
   <div class="grid2"><label class="f">Raum<input type="text" id="lR" value="${esc(e?e.room:"")}"></label><label class="f">${S.profile&&S.profile.track==="uni"?"Dozent/in":"Lehrkraft"}<input type="text" id="lT" value="${esc(e?e.teacher:"")}"></label></div>
   <div class="grid2"><label class="f">Beginn<input type="time" id="lA" value="${esc(e?e.start:slot.start)}"></label><label class="f">Ende<input type="time" id="lB" value="${esc(e?e.end:slot.end)}"></label></div>
   <label class="f">Rhythmus<select id="lW"><option value="">Jede Woche</option><option value="A" ${e&&e.week==="A"?"selected":""}>Nur Woche A</option><option value="B" ${e&&e.week==="B"?"selected":""}>Nur Woche B</option></select></label>
   <div class="row"><button class="btn primary" id="lSave">Speichern</button>${e?`<button class="btn danger" id="lDel">Entfernen</button>`:""}<button class="btn ghost" data-close>Abbrechen</button></div>`,(m,close)=>{
    $("#lS",m).focus();
    $$("[data-other]",m).forEach(b=>b.onclick=()=>{close();editLesson(day,slot,b.dataset.other);});
    $("#lSave",m).onclick=()=>{ const subject=$("#lS",m).value.trim(); if(!subject){toast("Bitte ein Fach eintragen");return;}
      const v={day,subject,room:$("#lR",m).value.trim(),teacher:$("#lT",m).value.trim(),start:$("#lA",m).value||slot.start,end:$("#lB",m).value||slot.end,week:$("#lW",m).value};
      if(toMin(v.end)<=toMin(v.start)){toast("Das Ende muss nach dem Beginn liegen");return;}
      if(e) Object.assign(e,v); else t.entries.push({id:rid("l"),...v});
      save(); close(); render(); };
    const d=$("#lDel",m); if(d) d.onclick=()=>{ t.entries=t.entries.filter(x=>x.id!==e.id); save(); close(); render(); };
  });
}
function editSlots(){
  const slots=ttSlots().map(s=>({...s}));
  const draw=m=>{ $("#slotList",m).innerHTML=slots.map((s,i)=>`<div class="row"><span class="mono small" style="width:2.5em">${i+1}.</span><input type="time" data-a="${i}" value="${s.start}" style="width:auto"><span>–</span><input type="time" data-b="${i}" value="${s.end}" style="width:auto"><button class="btn ghost sm danger" data-x="${i}">Entfernen</button></div>`).join("");
    $$("[data-a]",m).forEach(x=>x.onchange=()=>slots[x.dataset.a].start=x.value); $$("[data-b]",m).forEach(x=>x.onchange=()=>slots[x.dataset.b].end=x.value);
    $$("[data-x]",m).forEach(x=>x.onclick=()=>{slots.splice(Number(x.dataset.x),1);draw(m);}); };
  modal(`<h2>Stundenzeiten</h2><p class="small muted">Lege fest, welche Zeilen der Plan hat. Einträge bleiben erhalten.</p><div class="stack" id="slotList"></div>
    <div class="row"><button class="btn sm" id="slAdd">+ Stunde</button><button class="btn sm" id="slSchool">Schul-Raster (45 Min.)</button><button class="btn sm" id="slUni">Uni-Raster (90 Min.)</button><button class="btn sm" id="slFit">Aus Einträgen ableiten</button></div>
    <div class="row"><button class="btn primary" id="slSave">Speichern</button><button class="btn ghost" data-close>Abbrechen</button></div>`,(m,close)=>{
    draw(m);
    $("#slAdd",m).onclick=()=>{const l=slots[slots.length-1]; const st=l?toMin(l.end)+5:480; slots.push({start:fromMin(st),end:fromMin(st+45)}); draw(m);};
    $("#slSchool",m).onclick=()=>{slots.splice(0,slots.length,...SLOTS_SCHOOL.map(s=>({...s})));draw(m);};
    $("#slUni",m).onclick=()=>{slots.splice(0,slots.length,...SLOTS_UNI.map(s=>({...s})));draw(m);};
    $("#slFit",m).onclick=()=>{ const d=deriveSlots(S.timetable.entries); if(d.length){slots.splice(0,slots.length,...d);draw(m);} else toast("Noch keine Einträge"); };
    $("#slSave",m).onclick=()=>{ S.timetable.slots=slots.filter(s=>s.start&&s.end&&toMin(s.end)>toMin(s.start)).sort((a,b)=>toMin(a.start)-toMin(b.start)); save(); close(); render(); };
  });
}

async function importShot(file){
  const box=$("#impBox"); const ctl=new AbortController();
  box.innerHTML=`<div class="sheet row"><span class="spin"></span><span>Claude liest deinen Stundenplan …</span><span class="spacer"></span><button class="btn sm" id="stopShot">Abbrechen</button></div>`;
  $("#stopShot").onclick=()=>ctl.abort();
  try{
    const r=await CAP.sample.json(`Das Bild ist ein Stundenplan (z. B. Screenshot aus WebUntis, einem Uni-Portal oder ein Foto). Lies jede Unterrichtsstunde bzw. Veranstaltung aus und ordne sie dem Wochentag und der Uhrzeit zu.
- Wenn nur Stundennummern sichtbar sind, nutze diese typischen Zeiten: 1. 07:45–08:30, 2. 08:35–09:20, 3. 09:40–10:25, 4. 10:30–11:15, 5. 11:35–12:20, 6. 12:25–13:10, 7. 13:15–14:00, 8. 14:00–14:45, 9. 14:45–15:30, 10. 15:30–16:15 – außer im Bild stehen eigene Zeiten.
- Doppelstunden als ein Eintrag mit durchgehender Zeit.
- Abkürzungen von Fächern ausschreiben, wenn eindeutig (z. B. M → Mathematik, D → Deutsch, E → Englisch, BIO → Biologie, G/GE → Geschichte, PH → Physik, CH → Chemie, GEO/EK → Geographie, SP → Sport, MU → Musik, BK/KU → Kunst, ETH → Ethik, REV/EV → Evangelische Religion, RK/KR → Katholische Religion, INF → Informatik). Sonst Abkürzung übernehmen.
- Ausgefallene oder durchgestrichene Stunden normal übernehmen (es geht um den regulären Plan).
Antworte nur mit JSON: {"lessons":[{"day":"Mo|Di|Mi|Do|Fr|Sa","start":"HH:MM","end":"HH:MM","subject":"…","room":"…","teacher":"…","week":""}],"hinweis":"kurzer Hinweis, falls etwas unsicher war"}`,{images:[file],modelTier:"default",cache:false,signal:ctl.signal});
    const list=(r.lessons||[]).map(l=>({day:DAYS.indexOf(String(l.day).slice(0,2)),start:String(l.start||"").slice(0,5),end:String(l.end||"").slice(0,5),subject:String(l.subject||"").trim(),room:String(l.room||"").trim(),teacher:String(l.teacher||"").trim(),week:["A","B"].includes(l.week)?l.week:""})).filter(l=>l.day>=0&&l.subject&&/^\d\d:\d\d$/.test(l.start)&&/^\d\d:\d\d$/.test(l.end));
    previewImport(list,"Screenshot",r.hinweis);
  }catch(e){ box.innerHTML=e&&e.code==="cancelled"?"":`<div class="note bad">${esc(sampleErr(e))}</div>`; }
}
function showIcsHelp(){
  modal(`<h2>WebUntis & Kalenderdateien</h2>
   <p>Eine direkte Anmeldung bei WebUntis ist aus Merkwerk heraus nicht möglich: WebUntis lässt fremde Webseiten nicht zu, und dein Passwort soll nicht in einer anderen App landen. So kommt dein Plan trotzdem rein:</p>
   <div class="stack small">
     <p><b>Variante 1 – Screenshot (am schnellsten):</b> In der WebUntis-App die Wochenansicht öffnen, Screenshot machen, hier „Aus Screenshot übernehmen“ wählen. Claude ordnet die Fächer den Zeiten zu, du prüfst die Vorschau.</p>
     <p><b>Variante 2 – Kalenderdatei:</b> In WebUntis im Browser „Mein Stundenplan“ öffnen und über das Teilen-/Export-Symbol eine iCal-Datei (.ics) herunterladen (Abo-Links und Export sind je nach Schule freigeschaltet). Uni-Portale wie HISinOne, CAMPUSonline oder Stud.IP bieten ebenfalls einen iCal-Export. Die Datei hier auswählen.</p>
   </div>
   <div class="row"><button class="btn primary" id="pickIcs">.ics-Datei auswählen</button><button class="btn ghost" data-close>Schließen</button></div>`,(m,close)=>{ $("#pickIcs",m).onclick=()=>{close();$("#icsIn").click();}; });
}
function parseIcsTimetable(txt){
  const lines=txt.replace(/\r\n[ \t]/g,"").replace(/\n[ \t]/g,"").split(/\r?\n/);
  const evs=[]; let cur=null;
  const parseDT=(v,params)=>{ const m=v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/); if(!m) return null; if(!m[4]) return {date:new Date(+m[1],+m[2]-1,+m[3]),allday:true};
    const d= m[7]? new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5])) : new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]); return {date:d,allday:false}; };
  const unesc=s=>s.replace(/\\n/gi," ").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\\\/g,"\\");
  for(const ln of lines){
    if(ln==="BEGIN:VEVENT"){cur={};continue;} if(ln==="END:VEVENT"){ if(cur) evs.push(cur); cur=null; continue; } if(!cur) continue;
    const i=ln.indexOf(":"); if(i<0) continue; const head=ln.slice(0,i), val=ln.slice(i+1); const name=head.split(";")[0].toUpperCase();
    if(name==="DTSTART") cur.s=parseDT(val); else if(name==="DTEND") cur.e=parseDT(val); else if(name==="SUMMARY") cur.sum=unesc(val); else if(name==="LOCATION") cur.loc=unesc(val); else if(name==="DESCRIPTION") cur.desc=unesc(val); else if(name==="RRULE") cur.rrule=val; else if(name==="STATUS") cur.status=val;
  }
  const timed=evs.filter(e=>e.s&&!e.s.allday&&e.e&&e.sum&&e.status!=="CANCELLED");
  if(!timed.length) throw new Error("In der Datei wurden keine Termine mit Uhrzeit gefunden.");
  let pick=timed.filter(e=>e.rrule&&/FREQ=WEEKLY/.test(e.rrule));
  if(!pick.length){ const wk={}; const key=d=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-wd(x));return isoDate(x);};
    timed.forEach(e=>{const k=key(e.s.date);(wk[k] ||= []).push(e);});
    const best=Object.values(wk).sort((a,b)=>new Set(b.map(e=>e.sum)).size-new Set(a.map(e=>e.sum)).size||b.length-a.length)[0]; pick=best; }
  const seen=new Set(); const out=[];
  for(const e of pick){ const d=e.s.date, en=e.e.date; const v={day:wd(d),start:fromMin(d.getHours()*60+d.getMinutes()),end:fromMin(en.getHours()*60+en.getMinutes()),subject:e.sum.trim(),room:(e.loc||"").trim(),teacher:"",week:""};
    const k=[v.day,v.start,v.subject].join("|"); if(seen.has(k)||v.day>5) continue; seen.add(k); out.push(v); }
  return out;
}
function previewImport(list,src,hint){
  const box=$("#impBox");
  if(!list.length){ box.innerHTML=`<div class="note bad">Im ${esc(src)} wurden keine Stunden erkannt. Versuch einen schärferen Screenshot der Wochenansicht.</div>`; return; }
  list.sort((a,b)=>a.day-b.day||toMin(a.start)-toMin(b.start));
  box.innerHTML=`<section class="sheet stack"><div class="row"><h3>Vorschau: ${list.length} Stunden aus ${esc(src)}</h3></div>${hint?`<p class="small muted">${esc(hint)}</p>`:""}
    <p class="small">Prüfe die Zuordnung. Einzelne Zeilen kannst du abwählen und später im Plan korrigieren.</p>
    <div class="scrollx"><table class="t"><thead><tr><th></th><th>Tag</th><th>Zeit</th><th>Fach</th><th>Raum</th><th>Lehrkraft</th></tr></thead><tbody>${list.map((l,i)=>`<tr><td><input type="checkbox" data-i="${i}" checked aria-label="übernehmen"></td><td>${DAYS[l.day]}</td><td class="mono">${l.start}–${l.end}</td><td><b>${esc(l.subject)}</b></td><td>${esc(l.room)}</td><td>${esc(l.teacher)}</td></tr>`).join("")}</tbody></table></div>
    <div class="row"><button class="btn primary" id="impReplace">Plan ersetzen</button><button class="btn" id="impAdd">Zum Plan hinzufügen</button><button class="btn ghost" id="impCancel">Verwerfen</button></div></section>`;
  const chosen=()=>$$("[data-i]",box).filter(c=>c.checked).map(c=>list[Number(c.dataset.i)]);
  const apply=replace=>{ const c=chosen().map(l=>({id:rid("l"),...l})); S.timetable.entries=replace?c:[...S.timetable.entries,...c];
    const d=deriveSlots(S.timetable.entries); if(d.length>=3) S.timetable.slots=d; if(c.some(l=>l.day===5)) S.timetable.days=6;
    save(); box.innerHTML=""; render(); toast(`${c.length} Stunden übernommen`); };
  $("#impReplace").onclick=()=>apply(true); $("#impAdd").onclick=()=>apply(false); $("#impCancel").onclick=()=>box.innerHTML="";
}
