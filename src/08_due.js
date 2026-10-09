/* ===================== Abgaben, Klausuren, Erinnerungen, Lernplan ===================== */
const TYPE_NAME={klausur:"Klausur",abgabe:"Abgabe"};
function remindDaysOf(it){ return it.remindDays&&it.remindDays.length? it.remindDays : (it.type==="klausur"?S.remind.klausurDays:S.remind.abgabeDays); }
function remindOn(it){ return it.remindDays&&it.remindDays.length ? true : !!S.remind[it.type]; }
function dueReminders(){
  const t=today0(); const out=[];
  for(const it of S.items){ if(it.done||!remindOn(it)) continue; const d=parseISO(it.date); const left=daysBetween(t,d); if(left<0) continue;
    const ds=[...remindDaysOf(it)].sort((a,b)=>a-b); const hit=ds.find(x=>left<=x); if(hit===undefined) continue;
    const key=`${it.id}:${hit}`; if(S.dismissed[key]) continue; out.push({it,left,key}); }
  return out.sort((a,b)=>a.left-b.left);
}
const leftLabel=n=>n===0?"heute":n===1?"morgen":n<0?`vor ${-n} Tagen`:`in ${n} Tagen`;
function calLinks(it){
  const title=`${TYPE_NAME[it.type]}: ${it.title}${it.subject?` (${it.subject})`:""}`;
  const details=[it.notes||"","Eingetragen mit Merkwerk."].filter(Boolean).join("\n");
  const ymd=it.date.replace(/-/g,"");
  let g, o;
  if(it.time){ const [h,mi]=it.time.split(":"); const st=`${ymd}T${h}${mi}00`; const endM=toMin(it.time)+(it.type==="klausur"?90:15); const en=`${ymd}T${pad(Math.floor(endM/60)%24)}${pad(endM%60)}00`;
    g=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${st}/${en}&ctz=Europe/Berlin&details=${encodeURIComponent(details)}`;
    o=`startdt=${it.date}T${it.time}:00&enddt=${it.date}T${fromMin(endM%1440)}:00`; }
  else{ const nx=new Date(parseISO(it.date)); nx.setDate(nx.getDate()+1); g=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${ymd}/${isoDate(nx).replace(/-/g,"")}&details=${encodeURIComponent(details)}`; o=`startdt=${it.date}&enddt=${isoDate(nx)}&allday=true`; }
  const oq=`path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${encodeURIComponent(title)}&body=${encodeURIComponent(details)}&${o}`;
  return {google:g,outlook:`https://outlook.live.com/calendar/0/deeplink/compose?${oq}`,outlook365:`https://outlook.office.com/calendar/0/deeplink/compose?${oq}`};
}

/* ---------- Lernplan ---------- */
const secTitle=s=>{ const first=s.text.split("\n").map(x=>x.trim()).find(Boolean)||""; return first.length>70?first.slice(0,67)+"…":first; };
function buildPlan(it,set,{weekdays,reviewDays,keepDone=true,minutesPerDay}){
  // Hörphasen bleiben beim Neuverteilen stehen (sie ersetzen keine Lerneinheit und belegen keinen Lerntag)
  const hear=it.plan&&keepDone? it.plan.days.filter(d=>d.kind==="hoeren"&&d.date<it.date):[];
  const old=it.plan&&keepDone? it.plan.days.filter(d=>d.done&&d.kind!=="hoeren"):[];
  const doneSecs=new Set(old.filter(d=>d.kind==="neu").flatMap(d=>d.sectionIds));
  const secs=set.sections.filter(s=>!doneSecs.has(s.id));
  const start=today0(); const end=parseISO(it.date); end.setDate(end.getDate()-1);
  const dates=[]; for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){ if(weekdays.includes(wd(d)) && !old.some(o=>o.date===isoDate(d))) dates.push(isoDate(d)); }
  if(!dates.length) return {error:"Bis zum Termin gibt es keinen freien Lerntag mehr. Wähle mehr Wochentage oder lerne heute direkt im Lernset."};
  let rev=clamp(Number(reviewDays)||0,0,Math.max(0,dates.length-1)); if(!secs.length) rev=dates.length? Math.min(dates.length, Math.max(1,rev)) : 0;
  const learnDates=dates.slice(0,dates.length-rev), revDates=dates.slice(dates.length-rev);
  const days=[...old];
  const L=learnDates.length;
  if(secs.length && L){
    if(secs.length<=L){ // weniger Abschnitte als Tage: gleichmäßig verteilen
      secs.forEach((s,j)=>days.push({date:learnDates[Math.floor(j*L/secs.length)],kind:"neu",sectionIds:[s.id],done:false}));
    } else {
      let idx=0;
      for(let k=0;k<L;k++){
        const daysLeft=L-k; const rest=secs.slice(idx); const remain=rest.reduce((a,s)=>a+s.text.length,0); const target=remain/daysLeft;
        const ids=[]; let acc=0;
        while(idx<secs.length){
          const s=secs[idx];
          if(daysLeft>1 && ids.length>0 && (acc+s.text.length/2>target || secs.length-idx<=daysLeft-1)) break;
          ids.push(s.id); acc+=s.text.length; idx++;
        }
        if(ids.length) days.push({date:learnDates[k],kind:"neu",sectionIds:ids,done:false});
      }
    }
  }
  revDates.forEach(date=>days.push({date,kind:"wiederholung",sectionIds:set.sections.map(s=>s.id),done:false}));
  days.push(...hear);
  days.sort((a,b)=>a.date.localeCompare(b.date)||(a.kind==="hoeren")-(b.kind==="hoeren"));
  return {plan:{setId:set.id,weekdays,reviewDays:rev,minutesPerDay:Number(minutesPerDay)||(it.plan&&it.plan.minutesPerDay)||45,days,createdAt:Date.now()}};
}
/* Geschätzte Lernzeit: Lesen (etwa 4 Minuten je Seite) und Abfrage (etwa 1,5 Minuten je Frage); Hörphasen mit ihrer Audiodauer */
function dayMinutes(d,set){
  if(d.kind==="hoeren") return Math.max(1,Math.round(d.minutes||0));
  if(d.kind==="wiederholung") return 25;
  const chars=d.sectionIds.map(id=>set.sections.find(s=>s.id===id)).filter(Boolean).reduce((a,s)=>a+s.text.length,0);
  return Math.round(chars/2200*4+clamp(d.sectionIds.length*4,6,15)*1.5);
}
// Tage, an denen die eingeplante Zeit nicht reicht
function planOverload(plan,set){
  const per={}; for(const d of plan.days) if(!d.done) per[d.date]=(per[d.date]||0)+dayMinutes(d,set);
  const budget=plan.minutesPerDay||45;
  const over=Object.entries(per).filter(([,m])=>m>budget).sort((a,b)=>b[1]-a[1]);
  return {budget,over,max:over.length?over[0][1]:0};
}
// Hörphase in einen Lernplan eintragen (Audiozusammenfassung oder Podcastdialog aus einem Lernset)
function openHearPhase(set,pre={}){
  const plans=S.items.filter(it=>!it.done&&it.plan&&it.plan.setId===set.id&&it.date>isoDate(today0()));
  if(!audEligible(set).length){ toast("Audio entsteht nur aus hochgeladenen Dateien – lade zuerst Dateien in dieses Lernset"); return; }
  if(!plans.length){ modal(`<h3>Hörphase einplanen</h3><p>Für dieses Lernset gibt es noch keinen Lernplan. Öffne unter „Abgaben &amp; Klausuren“ deinen Termin und erstelle mit diesem Lernset einen Lernplan; danach kannst du Hörphasen eintragen.</p><div class="row"><button class="btn primary" id="hpDue">Zu Abgaben &amp; Klausuren</button><button class="btn" data-close>Schließen</button></div>`,(m,close)=>{ $("#hpDue",m).onclick=()=>{ close(); go("due"); }; }); return; }
  let fmt=pre.fmt||"monolog", len=pre.len||"standard";
  const est=()=>pre.minutes||estMinutes({view:audView(set,audDefaultSel(set)),len,fmt});
  modal(`<h2>Hörphase einplanen</h2>
    <p class="small muted">${pre.title?`Aufnahme: <b>${esc(pre.title)}</b>. `:""}Eine Hörphase ergänzt den Plan. Sie ersetzt keine Lerneinheit und zählt nicht als Nachweis deines Wissensstands.</p>
    <label class="f">Lernplan<select id="hpIt">${plans.map(it=>`<option value="${it.id}">${esc(TYPE_NAME[it.type]+": "+it.title)} (${fmtDate(it.date)})</option>`).join("")}</select></label>
    <label class="f">Tag<input type="date" id="hpD" min="${isoDate(today0())}" value="${isoDate(today0())}"></label>
    ${pre.recId?"":`<div class="stack" style="gap:6px"><span class="label">Sprecherformat</span><div class="row">${Object.entries(AUD_FORMATS).map(([k,f])=>`<button class="chip" data-hf="${k}" aria-pressed="${k===fmt}">${esc(f.n)}</button>`).join("")}</div></div>
    <div class="stack" style="gap:6px"><span class="label">Umfang</span><div class="row">${Object.entries(AUD_LENGTHS).map(([k,l])=>`<button class="chip" data-hl="${k}" aria-pressed="${k===len}">${esc(l.n)}</button>`).join("")}</div></div>`}
    <p class="small" id="hpEst"></p>
    <div class="row"><button class="btn primary" id="hpOk">Eintragen</button><button class="btn" data-close>Abbrechen</button></div>`,(m,close)=>{
    const sel=$("#hpIt",m), d=$("#hpD",m);
    const upd=()=>{ const it=S.items.find(x=>x.id===sel.value); const max=parseISO(it.date); max.setDate(max.getDate()-1); d.max=isoDate(max); if(d.value>d.max) d.value=d.max;
      $("#hpEst",m).innerHTML=`Dauer im Plan: <b>ca. ${est()} Min.</b>${pre.minutes?" (Länge der Aufnahme)":" (geschätzt)"}`; };
    sel.onchange=upd; upd();
    $$("[data-hf]",m).forEach(b=>b.onclick=()=>{ fmt=b.dataset.hf; $$("[data-hf]",m).forEach(x=>x.setAttribute("aria-pressed",String(x===b))); upd(); });
    $$("[data-hl]",m).forEach(b=>b.onclick=()=>{ len=b.dataset.hl; $$("[data-hl]",m).forEach(x=>x.setAttribute("aria-pressed",String(x===b))); upd(); });
    $("#hpOk",m).onclick=()=>{ const it=S.items.find(x=>x.id===sel.value); if(!d.value||d.value>=it.date||d.value<isoDate(today0())){ toast("Wähle einen Tag zwischen heute und dem Termin"); return; }
      it.plan.days.push({date:d.value,kind:"hoeren",fmt,len,recId:pre.recId||null,minutes:est(),done:false,sectionIds:[]});
      it.plan.days.sort((a,b)=>a.date.localeCompare(b.date)||(a.kind==="hoeren")-(b.kind==="hoeren"));
      save(); close(); toast("Hörphase eingetragen");
      const o=planOverload(it.plan,set); if(o.over.some(([dt])=>dt===d.value)) toast(`An diesem Tag sind jetzt ca. ${o.over.find(([dt])=>dt===d.value)[1]} Minuten geplant – mehr als deine ${o.budget} Minuten`,4200);
      if(ROUTE.v==="due") render(); };
  });
}
/* Termin verschoben: Lernplan an das neue Datum anpassen (erledigte Tage bleiben) */
function adaptPlanToDate(it){
  if(!it.plan) return;
  const late=it.plan.days.some(d=>!d.done && d.date>=it.date);
  const set=setById(it.plan.setId); if(!late||!set) return;
  const r=buildPlan(it,set,{weekdays:it.plan.weekdays,reviewDays:it.plan.reviewDays,keepDone:true,minutesPerDay:it.plan.minutesPerDay});
  if(!r.error){ it.plan=r.plan; toast("Lernplan an das neue Datum angepasst"); }
}
function planProgress(it,set){ if(!it.plan||!set) return {pct:0,secDone:0,n:0}; const n=set.sections.length; const done=new Set(it.plan.days.filter(d=>d.done&&d.kind==="neu").flatMap(d=>d.sectionIds)); return {pct:n?Math.round(done.size/n*100):0,secDone:done.size,n}; }
function markPlanDone(ref,pct){ const it=S.items.find(x=>x.id===ref.itemId); if(!it||!it.plan) return; const d=it.plan.days.find(x=>x.date===ref.date&&x.kind===ref.kind); if(d){ d.done=true; d.pct=pct; save(); toast("Lerneinheit im Plan abgehakt"); } }
async function startPlanDay(it,day){
  if(!SETS.length) await loadSets();
  const set=setById(it.plan.setId); if(!set){ toast("Das Lernset zu diesem Plan gibt es nicht mehr"); return; }
  if(day.kind==="hoeren"){ openAudio(set,{fmt:day.fmt,len:day.len,open:day.recId||null}); return; }
  const n=day.kind==="wiederholung"?15:clamp(day.sectionIds.length*4,6,15);
  S.activeSet=set.id; save(false);
  go("learn",{manage:true});
  setTimeout(()=>startRound(set,{n,restrict:day.kind==="wiederholung"?null:day.sectionIds,label:`Lernplan ${it.title} · ${fmtDate(day.date)}`,planRef:{itemId:it.id,date:day.date,kind:day.kind}}),30);
}

VIEWS.due = async function(m,arg){
  if(!SETS.length) await loadSets();
  if(arg&&arg.id){ const it=S.items.find(x=>x.id===arg.id); if(it) return renderItem(m,it); }
  const t=today0();
  const items=[...S.items].sort((a,b)=>a.date.localeCompare(b.date)||(a.time||"").localeCompare(b.time||""));
  const upcoming=items.filter(i=>!i.done&&daysBetween(t,parseISO(i.date))>=0), past=items.filter(i=>i.done||daysBetween(t,parseISO(i.date))<0);
  const rem=dueReminders(), planned=upcoming.filter(i=>i.plan);
  m.innerHTML=`<div class="view">
   <div class="row" style="align-items:flex-end"><div class="stack" style="gap:4px"><h1>Termine &amp; Lernplan</h1><p class="muted">Abgaben und Klausuren eintragen, erinnern lassen und mit deinem Material einen Lernplan bis zum Termin erstellen.</p></div><span class="spacer"></span><button class="btn primary" id="addIt">+ Termin eintragen</button></div>
   ${rem.length?`<section class="sheet stack"><h3>Erinnerungen</h3>${remHTML(rem)}</section>`:""}
   <section class="sheet stack" id="plansSec" tabindex="-1"><h3>Lernpläne</h3>${planned.length?`<div class="list">${planned.map(itemRow).join("")}</div>`
     :`<p class="small muted">Noch kein Lernplan. Trag eine Klausur oder Abgabe ein und öffne sie: Dort erstellst du mit einem Lernset einen Lernplan bis zum Termin.</p>${upcoming.length?"":`<div><button class="btn" id="addIt2">Klausur eintragen</button></div>`}`}</section>
   <section class="sheet stack"><h3>Abgaben &amp; Klausuren</h3>${upcoming.length?`<div class="list">${upcoming.map(itemRow).join("")}</div>`:`<div class="empty">Keine anstehenden Termine. Trag deine nächste Klausur oder Abgabe ein.</div>`}</section>
   <section class="sheet stack"><div class="row"><h3>Erinnerungen einstellen</h3></div>
     <div class="grid2">
       ${["klausur","abgabe"].map(k=>`<div class="stack" style="gap:8px"><label class="row" style="gap:8px;font-weight:700"><input type="checkbox" data-ron="${k}" ${S.remind[k]?"checked":""}> An ${k==="klausur"?"Klausuren":"Abgaben"} erinnern</label>
         <div class="row" style="gap:6px">${[14,7,3,2,1,0].map(d=>`<button class="chip" data-rd="${k}" data-d="${d}" aria-pressed="${(S.remind[k+"Days"]||[]).includes(d)}">${d===0?"am Tag":d===1?"1 Tag vorher":d+" Tage vorher"}</button>`).join("")}</div></div>`).join("")}
     </div>
     <p class="small muted">Merkwerk zeigt fällige Erinnerungen, sobald du die Seite öffnest. Damit dein Handy dich auch erinnert, wenn Merkwerk zu ist, übernimm Termine mit einem Klick in Google Kalender oder Outlook und lass dir dort eine Benachrichtigung schicken.</p>
   </section>
   ${past.length?`<details class="sheet"><summary>Erledigt und vergangen (${past.length})</summary><div class="list" style="margin-top:8px">${past.reverse().map(itemRow).join("")}</div></details>`:""}
   <div class="row"><span class="spacer"></span><button class="btn ghost sm" id="backup">Termine & Stundenplan sichern (.json)</button></div>
  </div>`;
  $("#addIt").onclick=()=>editItem(); const a2=$("#addIt2"); if(a2) a2.onclick=()=>editItem();
  bindRem(m); bindRows(m);
  if(arg&&arg.plans) setTimeout(()=>{ const p=$("#plansSec"); if(p){ p.scrollIntoView({block:"start"}); p.focus({preventScroll:true}); } },30);
  $$("[data-ron]").forEach(c=>c.onchange=()=>{S.remind[c.dataset.ron]=c.checked;save();});
  $$("[data-rd]").forEach(c=>c.onclick=()=>{ const k=c.dataset.rd+"Days", d=Number(c.dataset.d); const s=new Set(S.remind[k]||[]); s.has(d)?s.delete(d):s.add(d); S.remind[k]=[...s].sort((a,b)=>b-a); c.setAttribute("aria-pressed",s.has(d)); save(); });
  $("#backup").onclick=async()=>{ if(!CAP.downloads){ copyText(JSON.stringify(S,null,1)); return; } try{ await CAP.downloads.save({filename:`merkwerk-sicherung-${isoDate(new Date())}.json`,data:JSON.stringify(S,null,1)}); }catch(e){ if(e&&e.code!=="declined") toast("Speichern nicht möglich"); } };
};
function remHTML(rem){ return `<div class="list">${rem.map(r=>`<div class="li"><span class="pill ${r.left<=1?"bad":"warn"}">${leftLabel(r.left)}</span><div class="grow"><b>${TYPE_NAME[r.it.type]}: ${esc(r.it.title)}</b><div class="small muted">${esc(r.it.subject||"")} · ${fmtDate(r.it.date,{weekday:"long",day:"numeric",month:"long"})}${r.it.time?" · "+r.it.time+" Uhr":""}</div></div><button class="btn sm" data-open-it="${r.it.id}">Öffnen</button><button class="btn ghost sm" data-dis="${r.key}">Erledigt</button></div>`).join("")}</div>`; }
function bindRem(m){ $$("[data-dis]",m).forEach(b=>b.onclick=()=>{S.dismissed[b.dataset.dis]=true;save();render();}); $$("[data-open-it]",m).forEach(b=>b.onclick=()=>go("due",{id:b.dataset.openIt})); }
function itemRow(it){
  const d=parseISO(it.date); const left=daysBetween(today0(),d); const set=it.plan?setById(it.plan.setId):null; const pr=planProgress(it,set);
  return `<div class="li"><div class="due"><b class="mono">${d.getDate()}</b><span>${d.toLocaleDateString("de-DE",{month:"short"})}</span></div>
   <div class="grow stack" style="gap:3px"><div class="row" style="gap:6px"><span class="pill ${it.type==="klausur"?"warn":""}">${TYPE_NAME[it.type]}</span>${it.done?'<span class="pill ok">erledigt</span>':`<span class="small muted">${leftLabel(left)}${it.time?" · "+it.time+" Uhr":""}</span>`}</div>
   <b>${esc(it.title)}</b><span class="small muted">${esc(it.subject||"")}${it.plan?` · Lernplan ${pr.pct} % durchgearbeitet`:""}</span>
   ${it.plan?`<div class="bar" style="max-width:260px"><i style="width:${pr.pct}%"></i></div>`:""}</div>
   <button class="btn sm" data-open-it="${it.id}">Öffnen</button></div>`;
}
function bindRows(m){ $$("[data-open-it]",m).forEach(b=>b.onclick=()=>go("due",{id:b.dataset.openIt})); }

function editItem(it,prefill,opts={}){
  const isNew=!it; it=it||Object.assign({id:rid("it"),type:"klausur",title:"",subject:"",date:"",time:"",notes:"",remindDays:null,done:false},prefill||{});
  const subs=[...new Set([...(S.mySubjects||[]),...S.timetable.entries.map(x=>x.subject)])];
  modal(`<h2>${isNew?"Termin eintragen":"Termin bearbeiten"}</h2>
   <div class="row" role="radiogroup">${["klausur","abgabe"].map(k=>`<button class="chip" data-ty="${k}" aria-pressed="${it.type===k}">${TYPE_NAME[k]}</button>`).join("")}</div>
   <label class="f">Titel<input type="text" id="iT" value="${esc(it.title)}" placeholder="z. B. Klausur Analysis I oder Hausarbeit Kapitel 2"></label>
   <label class="f">Fach / Modul<input type="text" id="iS" list="iSl" value="${esc(it.subject)}"><datalist id="iSl">${subs.map(s=>`<option value="${esc(s)}">`).join("")}</datalist></label>
   <div class="grid2"><label class="f">Datum<input type="date" id="iD" value="${esc(it.date)}"></label><label class="f">Uhrzeit (optional)<input type="time" id="iH" value="${esc(it.time)}"></label></div>
   <label class="f">Notizen<textarea id="iN" style="min-height:70px" placeholder="Raum, Hilfsmittel, Abgabeform …">${esc(it.notes)}</textarea></label>
   <div class="stack" style="gap:6px"><span class="label">Erinnern</span><div class="row" style="gap:6px" id="iR"></div><span class="small muted">Ohne Auswahl gelten deine Standard-Einstellungen.</span></div>
   <div class="row"><button class="btn primary" id="iSave">Speichern</button>${isNew?"":`<button class="btn danger" id="iDel">Löschen</button>`}<button class="btn ghost" data-close>Abbrechen</button></div>`,(m,close)=>{
    let type=it.type; let rd=new Set(it.remindDays||[]);
    const drawR=()=>{ $("#iR",m).innerHTML=[14,7,3,2,1,0].map(d=>`<button class="chip" data-r="${d}" aria-pressed="${rd.has(d)}">${d===0?"am Tag":d===1?"1 Tag vorher":d+" Tage"}</button>`).join("")+`<span class="small muted">Standard: ${(type==="klausur"?S.remind.klausurDays:S.remind.abgabeDays).map(d=>d===0?"am Tag":d+" T.").join(", ")}</span>`;
      $$("[data-r]",m).forEach(b=>b.onclick=()=>{const d=Number(b.dataset.r); rd.has(d)?rd.delete(d):rd.add(d); drawR();}); };
    drawR();
    $$("[data-ty]",m).forEach(b=>b.onclick=()=>{type=b.dataset.ty; $$("[data-ty]",m).forEach(x=>x.setAttribute("aria-pressed",x.dataset.ty===type)); drawR();});
    $("#iT",m).focus();
    $("#iSave",m).onclick=()=>{ const title=$("#iT",m).value.trim(), date=$("#iD",m).value; if(!title||!date){toast("Bitte Titel und Datum angeben");return;}
      Object.assign(it,{type,title,subject:$("#iS",m).value.trim(),date,time:$("#iH",m).value,notes:$("#iN",m).value.trim(),remindDays:rd.size?[...rd].sort((a,b)=>b-a):null});
      Object.keys(S.dismissed).forEach(k=>{ if(k.startsWith(it.id+":")) delete S.dismissed[k]; });
      const moved=!isNew && opts.oldDate && opts.oldDate!==it.date;
      if(isNew) S.items.push(it);
      if(it.plan) adaptPlanToDate(it);
      save(); close();
      toast(isNew?`${TYPE_NAME[it.type]} im Kalender eingetragen`:"Termin aktualisiert – Kalender angepasst");
      if(opts.stay){ render(); } else go("due",{id:it.id}); };
    const del=$("#iDel",m); if(del) del.onclick=()=>{ S.items=S.items.filter(x=>x.id!==it.id); save(); close(); go("due"); };
  });
}

function renderItem(m,it){
  const set=it.plan?setById(it.plan.setId):(it.setId?setById(it.setId):null);
  const left=daysBetween(today0(),parseISO(it.date)); const L=calLinks(it); const pr=planProgress(it,set);
  const tISO=isoDate(today0());
  m.innerHTML=`<div class="view">
   <div class="row"><button class="btn ghost sm" id="backDue">← Alle Termine</button></div>
   <section class="sheet stack">
     <div class="row" style="align-items:flex-start"><div class="stack" style="gap:4px"><div class="row" style="gap:6px"><span class="pill ${it.type==="klausur"?"warn":""}">${TYPE_NAME[it.type]}</span>${it.subject?`<span class="small muted">${esc(it.subject)}</span>`:""}</div><h1>${esc(it.title)}</h1>
       <p>${fmtDate(it.date,{weekday:"long",day:"numeric",month:"long",year:"numeric"})}${it.time?`, ${it.time} Uhr`:""} · <b>${leftLabel(left)}</b></p></div><span class="spacer"></span>
       <div class="row"><button class="btn sm" id="calIt">Im Kalender zeigen</button>${it.type==="klausur"&&!it.done?`<button class="btn sm" id="examIt">Probeklausur schreiben</button>`:""}<button class="btn sm" id="edIt">Bearbeiten</button><button class="btn sm" id="doneIt">${it.done?"Wieder öffnen":"Als erledigt markieren"}</button></div></div>
     ${it.notes?`<p class="small">${esc(it.notes)}</p>`:""}
     <div class="row small"><span class="muted">Erinnerung: ${remindOn(it)?remindDaysOf(it).map(d=>d===0?"am Tag":d===1?"1 Tag vorher":d+" Tage vorher").join(", "):"aus"}</span></div>
     <p class="small muted">Steht automatisch in deinem Merkwerk-Kalender${it.plan?" – zusammen mit allen Lerneinheiten":""}.</p>
     <div class="row"><span class="label">Auch in externen Kalender</span><a class="btn sm" href="${esc(L.google)}" target="_blank" rel="noopener">Google Kalender ↗</a><a class="btn sm" href="${esc(L.outlook)}" target="_blank" rel="noopener">Outlook.com ↗</a><a class="btn sm" href="${esc(L.outlook365)}" target="_blank" rel="noopener">Outlook (Schule/Arbeit) ↗</a></div>
   </section>
   <section class="sheet stack" id="planSec"></section>
  </div>`;
  $("#backDue").onclick=()=>go("due"); $("#edIt").onclick=()=>editItem(it,null,{oldDate:it.date});
  $("#calIt").onclick=()=>{ S.ttMode="cal"; go("tt",{date:it.date}); };
  $("#doneIt").onclick=()=>{it.done=!it.done;save();render();};
  const ei=$("#examIt"); if(ei) ei.onclick=()=>openExamDialog(set||null,{subject:it.subject||(set&&set.subject)||""});
  const ps=$("#planSec");
  if(it.plan&&set){
    const missed=it.plan.days.filter(d=>!d.done&&d.kind==="neu"&&d.date<tISO);
    const n=it.plan.days.length; let k=0;
    const ov=planOverload(it.plan,set);
    const left=it.plan.days.filter(d=>!d.done&&d.kind!=="hoeren"&&d.date>=tISO).reduce((a,d)=>a+dayMinutes(d,set),0);
    ps.innerHTML=`<div class="row"><h2>Lernplan</h2><span class="spacer"></span><span class="small muted">Material: ${esc(set.name)} · ${set.sections.length} Abschnitte</span></div>
     <div class="stack" style="gap:6px"><div class="row"><span class="label">Durchgearbeitet</span><span class="spacer"></span><span class="mono small">${pr.secDone}/${pr.n} Abschnitte · ${pr.pct} %</span></div><div class="bar"><i style="width:${pr.pct}%"></i></div></div>
     <p class="small muted">Lernzeit pro Lerntag: ${ov.budget} Minuten · noch ca. ${Math.round(left/6)/10} Stunden Lernen bis ${it.type==="klausur"?"zur Klausur":"zur Abgabe"}${it.plan.days.some(d=>d.kind==="hoeren")?" (Hörphasen zusätzlich)":""}</p>
     ${ov.over.length?`<div class="note warn small">Der Zeitraum reicht für den Umfang nicht ganz: An ${ov.over.length} Tag${ov.over.length>1?"en":""} sind bis zu ${ov.max} Minuten geplant, mehr als deine ${ov.budget} Minuten (${esc(ov.over.slice(0,4).map(([d,mn])=>fmtDate(d)+": "+mn+" Min.").join(", "))}${ov.over.length>4?" …":""}). Passe den Plan unten an: mehr Lerntage, weniger Wiederholungstage oder mehr Zeit pro Tag.</div>`:""}
     <div class="row"><button class="btn sm" id="addHear">Hörphase einplanen</button><span class="small muted">Audiozusammenfassung oder Podcastdialog aus den hochgeladenen Dateien dieses Lernsets</span></div>
     ${missed.length?`<div class="note warn row"><span>${missed.length} Lerntag${missed.length>1?"e":""} verpasst. Merkwerk kann den Rest auf die verbleibenden Tage verteilen.</span><button class="btn sm" id="replan">Ab heute neu verteilen</button></div>`:""}
     <div>${it.plan.days.map(d=>{ k++; const secs=d.sectionIds.map(id=>set.sections.find(s=>s.id===id)).filter(Boolean); const chars=secs.reduce((a,s)=>a+s.text.length,0);
        const key=`${d.date}|${d.kind}|${k}`;
        const what=d.kind==="hoeren"?`<b>Hörphase:</b> ${esc((AUD_FORMATS[d.fmt]||AUD_FORMATS.monolog).n)} · ${esc((AUD_LENGTHS[d.len]||AUD_LENGTHS.standard).n)} · ca. ${dayMinutes(d,set)} Min. <span class="muted">(ergänzt die Lerneinheiten, zählt nicht als gelernt)</span>`
          :d.kind==="wiederholung"?`<b>Wiederholung:</b> gemischter Durchgang über das ganze Material · ca. ${dayMinutes(d,set)} Min.`:`<b>${secs.length} Abschnitt${secs.length>1?"e":""}</b> (ca. ${Math.max(1,Math.round(chars/2200))} Seite${Math.round(chars/2200)>1?"n":""}, ca. ${dayMinutes(d,set)} Min.): ${esc(secs.slice(0,3).map(secTitle).join(" · "))}${secs.length>3?" …":""}`;
        return `<div class="plan-day ${d.date===tISO?"today":""} ${d.done?"done":""}"><div class="d"><b>${fmtDate(d.date)}</b>${d.date===tISO?' <span class="small">heute</span>':""}</div><div class="what small">${what}${d.done&&d.pct!=null?` · <span class="pill ok">${d.pct} %</span>`:""}</div>
          <div class="row" style="gap:6px;justify-content:flex-end">${d.done?`<button class="btn ghost sm" data-undo="${key}">Rückgängig</button>`:`<button class="btn sm ${d.date===tISO?"primary":""}" data-learn="${key}">${d.kind==="hoeren"?"Anhören":"Lernen"}</button><button class="btn ghost sm" data-check="${key}">Abhaken</button>${d.kind==="hoeren"?`<button class="btn ghost sm danger" data-rmhear="${key}">Entfernen</button>`:""}`}</div></div>`; }).join("")}</div>
     <details><summary class="small">Plan neu erstellen</summary><div id="planForm" style="margin-top:10px"></div></details>`;
    const find=v=>it.plan.days[Number(v.split("|")[2])-1];
    $$("[data-learn]",ps).forEach(b=>b.onclick=()=>{ const d=find(b.dataset.learn); if(d.kind==="hoeren") openAudio(set,{fmt:d.fmt,len:d.len,open:d.recId||null}); else startPlanDay(it,d); });
    $$("[data-rmhear]",ps).forEach(b=>b.onclick=()=>{ const d=find(b.dataset.rmhear); it.plan.days=it.plan.days.filter(x=>x!==d); save(); render(); });
    $("#addHear",ps).onclick=()=>openHearPhase(set);
    $$("[data-check]",ps).forEach(b=>b.onclick=()=>{find(b.dataset.check).done=true;save();render();});
    $$("[data-undo]",ps).forEach(b=>b.onclick=()=>{const d=find(b.dataset.undo); d.done=false; delete d.pct; save(); render();});
    const rp=$("#replan",ps); if(rp) rp.onclick=()=>{ const r=buildPlan(it,set,{weekdays:it.plan.weekdays,reviewDays:it.plan.reviewDays,minutesPerDay:it.plan.minutesPerDay}); if(r.error){toast(r.error);return;} it.plan=r.plan; save(); render(); toast("Plan neu verteilt"); };
    planForm($("#planForm",ps),it,set);
  } else {
    ps.innerHTML=`<h2>Lernplan erstellen</h2><p class="muted">Pflege dein Material ein. Merkwerk teilt es so auf die Tage bis ${it.type==="klausur"?"zur Klausur":"zur Abgabe"} auf, dass du alles einmal durchgearbeitet hast und am Ende noch Zeit zum Wiederholen bleibt. Jede Lerneinheit startet einen Durchgang mit belegten Fragen zu genau diesen Abschnitten.</p><div id="planForm"></div>`;
    planForm($("#planForm",ps),it,set);
  }
}
function planForm(el,it,set){
  const wds=it.plan?it.plan.weekdays:[0,1,2,3,4,6]; const rev=it.plan?it.plan.reviewDays:2; const mpd=it.plan&&it.plan.minutesPerDay||45;
  const candidates=SETS.filter(s=>!s.example);
  el.innerHTML=`<div class="stack">
    <label class="f">Material<select id="pSet"><option value="">Neues Lernset mit Dateien anlegen …</option>${candidates.map(s=>`<option value="${s.id}" ${set&&set.id===s.id?"selected":""}>${esc(s.name)} (${s.sections.length} Abschnitte)</option>`).join("")}</select></label>
    <div id="pUp" class="stack" ${set&&!candidates.every(s=>s.id!==set.id)?"hidden":""}><div class="dropzone" id="pDz" tabindex="0" role="button"><b>Material hochladen</b><br><span class="small muted">Skript, Folien, Mitschriften – PDF, DOCX, TXT, GoodNotes oder Fotos</span><input type="file" id="pFi" multiple accept="${FILE_ACCEPT}" hidden></div><div id="pSt" class="small"></div></div>
    <div class="stack" style="gap:6px"><span class="label">An diesen Tagen lernen</span><div class="row" style="gap:6px">${DAYS.map((d,i)=>`<button class="chip" data-wd="${i}" aria-pressed="${wds.includes(i)}">${d}</button>`).join("")}</div></div>
    <div class="row"><label class="f" style="max-width:280px">Wiederholungstage vor dem Termin<select id="pRev">${[0,1,2,3,4].map(n=>`<option ${n===rev?"selected":""}>${n}</option>`).join("")}</select></label>
    <label class="f" style="max-width:280px">Lernzeit pro Lerntag<select id="pMin">${[20,30,45,60,90,120].map(n=>`<option value="${n}" ${n===mpd?"selected":""}>${n} Minuten</option>`).join("")}</select></label></div>
    <div class="row"><button class="btn primary" id="pGo">Lernplan erstellen</button></div><div id="pErr"></div></div>`;
  const sel=$("#pSet",el), up=$("#pUp",el); const days=new Set(wds);
  sel.onchange=()=>{ up.hidden=!!sel.value; };
  up.hidden=!!sel.value;
  $$("[data-wd]",el).forEach(b=>b.onclick=()=>{const i=Number(b.dataset.wd); days.has(i)?days.delete(i):days.add(i); b.setAttribute("aria-pressed",days.has(i));});
  let pending=[];
  const fi=$("#pFi",el), dz=$("#pDz",el);
  dz.onclick=()=>fi.click(); dz.onkeydown=e=>{if(e.key==="Enter"){fi.click();}};
  dz.ondragover=e=>{e.preventDefault();dz.classList.add("over");}; dz.ondragleave=()=>dz.classList.remove("over");
  dz.ondrop=e=>{e.preventDefault();dz.classList.remove("over");pending=[...e.dataTransfer.files];$("#pSt",el).textContent=`${pending.length} Datei(en) ausgewählt`;};
  fi.onchange=()=>{pending=[...fi.files];$("#pSt",el).textContent=`${pending.length} Datei(en) ausgewählt`;};
  $("#pGo",el).onclick=async()=>{
    const err=$("#pErr",el); err.innerHTML="";
    if(!days.size){ err.innerHTML=`<div class="note bad">Wähle mindestens einen Wochentag.</div>`; return; }
    let s=sel.value?setById(sel.value):null;
    if(!s){
      if(!pending.length){ err.innerHTML=`<div class="note bad">Wähle ein Lernset oder lade Material hoch.</div>`; return; }
      s=newSet(`${it.title}`,it.subject); const errs=[];
      for(const f of pending){ try{ const r=await readFile(f,t=>{$("#pSt",el).innerHTML=`<span class="spin"></span> ${esc(t)}`;}); if(r.text.trim()) s.files.push(fileEntry(f.name,r)); else errs.push(`„${f.name}“: Kein Text gefunden.`); }catch(e){ errs.push(e&&e.code?`„${f.name}“: ${sampleErr(e)}`:String(e.message||e)); } }
      if(!s.files.length){ err.innerHTML=`<div class="note bad">${errs.map(esc).join("<br>")||"Kein Text gefunden."}</div>`; return; }
      s.sections=makeSections(s.files); await putSet(s);
      if(errs.length) toast(errs.join(" "),5000);
    }
    if(!s.sections.length){ err.innerHTML=`<div class="note bad">Das Lernset enthält noch keinen Text.</div>`; return; }
    const r=buildPlan(it,s,{weekdays:[...days].sort(),reviewDays:Number($("#pRev",el).value),keepDone:!!(it.plan&&it.plan.setId===s.id),minutesPerDay:Number($("#pMin",el).value)});
    if(r.error){ err.innerHTML=`<div class="note bad">${esc(r.error)}</div>`; return; }
    it.plan=r.plan; it.setId=s.id; save(); render();
    const ov=planOverload(r.plan,s); toast(ov.over.length?`Lernplan erstellt – an ${ov.over.length} Tag${ov.over.length>1?"en":""} reicht die Lernzeit nicht, siehe Hinweis`:"Lernplan erstellt",ov.over.length?4200:2600);
  };
}
