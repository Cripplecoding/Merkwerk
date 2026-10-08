/* ===================== Kalender (FullCalendar) ===================== */
const FULLCAL="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.21/index.global.min.js";
const FC_DE={code:"de",week:{dow:1,doy:4},buttonText:{prev:"Zurück",next:"Weiter",today:"Heute",year:"Jahr",month:"Monat",week:"Woche",day:"Tag",list:"Liste"},weekText:"KW",weekTextLong:"Woche",allDayText:"Ganztägig",moreLinkText:n=>"+ "+n+" weitere",noEventsText:"Keine Einträge in diesem Zeitraum"};
let CAL=null; let CAL_POS={view:null,date:null};
const calRefresh=()=>{ if(CAL) CAL.refetchEvents(); };
function calStore(){ S.events ||= []; const t=S.timetable; t.cancel ||= {}; t.moves ||= {}; return t; }

/* A/B-Wochen: Anker = Montag einer Woche + ihr Buchstabe */
function mondayOf(d){ const x=new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate()-wd(x)); return x; }
function weekLetter(date){ const a=S.timetable.ab; if(!a) return null; const diff=Math.round((mondayOf(date)-parseISO(a.monday))/(7*864e5)); return (Math.abs(diff)%2===0)?a.letter:(a.letter==="A"?"B":"A"); }

/* Freie Tage (Ferien, Feiertage) unterdrücken Unterricht */
function freeDates(){ const s=new Set(); for(const e of (S.events||[])){ if(e.kind!=="frei") continue; const a=parseISO(e.start.slice(0,10)); const b=parseISO((e.end||e.start).slice(0,10)); for(let d=new Date(a); d<=b; d.setDate(d.getDate()+1)) s.add(isoDate(d)); } return s; }

function buildCalEvents(start,end){
  const t=calStore(); const out=[]; const free=freeDates(); const tISO=isoDate(today0());
  // Unterricht (wöchentlich wiederkehrend)
  for(let d=new Date(start); d<end; d.setDate(d.getDate()+1)){
    const iso=isoDate(d); if(free.has(iso)) continue; const day=wd(d); const wl=weekLetter(d);
    for(const l of t.entries){ if(l.day!==day) continue; if(l.week&&wl&&l.week!==wl) continue;
      const key=l.id+"|"+iso; if(t.moves[key]) continue;
      const cancelled=!!t.cancel[key];
      out.push({id:"L|"+key,title:(cancelled?"Entfällt: ":"")+l.subject+(l.room?" · "+l.room:""),start:`${iso}T${l.start}`,end:`${iso}T${l.end}`,backgroundColor:subjColor(l.subject),borderColor:"transparent",textColor:"var(--ink)",classNames:["ev-lesson",cancelled?"ev-cancel":""],extendedProps:{kind:"lesson",lessonId:l.id,date:iso}}); }
  }
  // einzeln verschobene Stunden
  for(const key in t.moves){ const mv=t.moves[key]; const [lid,orig]=key.split("|"); const l=t.entries.find(x=>x.id===lid); if(!l) continue;
    const ds=parseISO(mv.date); if(ds<start||ds>=end) continue;
    out.push({id:"L|"+key,title:l.subject+" (verlegt)"+(l.room?" · "+l.room:""),start:`${mv.date}T${mv.start}`,end:`${mv.date}T${mv.end}`,backgroundColor:subjColor(l.subject),borderColor:"var(--accent)",textColor:"var(--ink)",classNames:["ev-lesson"],extendedProps:{kind:"lesson",lessonId:lid,date:orig,moved:true}}); }
  // Klausuren & Abgaben
  for(const it of S.items){
    const base={id:"I|"+it.id,title:`${TYPE_NAME[it.type]}: ${it.title}`,classNames:[it.type==="klausur"?"ev-klausur":"ev-abgabe",it.done?"ev-done":""],extendedProps:{kind:"item",itemId:it.id},durationEditable:false};
    if(it.time){ const endM=Math.min(toMin(it.time)+(it.type==="klausur"?90:30),1439); out.push({...base,start:`${it.date}T${it.time}`,end:`${it.date}T${fromMin(endM)}`}); }
    else out.push({...base,start:it.date,allDay:true});
    // Lerneinheiten aus dem Lernplan
    if(it.plan&&!it.done) it.plan.days.forEach((d,i)=>{
      out.push({id:`P|${it.id}|${d.date}|${d.kind}|${i}`,title:`${d.kind==="wiederholung"?"Wiederholen":d.kind==="hoeren"?"Anhören":"Lernen"}: ${it.title}`,start:d.date,allDay:true,classNames:["ev-plan",d.done?"ev-done":"",(!d.done&&d.date<tISO&&d.kind==="neu")?"ev-missed":""],extendedProps:{kind:"plan",itemId:it.id,date:d.date,pk:d.kind,idx:i},durationEditable:false});
    });
  }
  // eigene Termine & freie Tage
  for(const e of S.events||[]){
    if(e.kind==="frei"){ const endEx=new Date(parseISO((e.end||e.start).slice(0,10))); endEx.setDate(endEx.getDate()+1);
      out.push({id:"E|"+e.id,title:e.title||"Frei",start:e.start.slice(0,10),end:isoDate(endEx),allDay:true,classNames:["ev-frei"],extendedProps:{kind:"event",eventId:e.id}});
      out.push({id:"B|"+e.id,start:e.start.slice(0,10),end:isoDate(endEx),display:"background",classNames:["ev-frei-bg"]}); }
    else out.push({id:"E|"+e.id,title:e.title,start:e.start,end:e.end||undefined,allDay:!!e.allDay,classNames:["ev-termin"],extendedProps:{kind:"event",eventId:e.id}});
  }
  return out;
}

const hhmm=d=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;
const localISO=d=>`${isoDate(d)}T${hhmm(d)}`;

async function mountCalendar(box,bar,gotoDate){
  calStore();
  if(CAL){ try{CAL.destroy();}catch{} CAL=null; }
  const narrow=window.innerWidth<620;
  const ab=S.timetable.ab; const curWL=weekLetter(new Date());
  bar.innerHTML=`<button class="btn sm primary" id="calNew">+ Neuer Eintrag</button>
    <label class="row" style="gap:6px">A/B-Wochen<select id="abSel" style="width:auto"><option value="">aus</option><option value="A" ${curWL==="A"?"selected":""}>diese Woche = A</option><option value="B" ${curWL==="B"?"selected":""}>diese Woche = B</option></select></label>
    <span class="spacer"></span>
    <span class="row" style="gap:10px"><span><i class="lg lg-k"></i>Klausur</span><span><i class="lg lg-a"></i>Abgabe</span><span><i class="lg lg-p"></i>Lernen</span><span><i class="lg lg-t"></i>Termin</span><span><i class="lg lg-f"></i>Frei</span></span>`;
  $("#calNew").onclick=()=>{ const d=CAL?CAL.getDate():new Date(); newEntryDialog({start:new Date(d.getFullYear(),d.getMonth(),d.getDate(),8,0),end:new Date(d.getFullYear(),d.getMonth(),d.getDate(),9,0),allDay:false}); };
  $("#abSel").onchange=e=>{ const v=e.target.value; S.timetable.ab=v?{monday:isoDate(mondayOf(new Date())),letter:v}:null; save(); calRefresh(); };
  try{ await loadScript(FULLCAL); }catch{ box.innerHTML=`<div class="note bad">Der Kalender konnte nicht geladen werden. Prüfe deine Internetverbindung oder nutze das Wochenraster.</div>`; return; }
  if(!box.isConnected) return;
  box.innerHTML="";
  const slots=ttSlots(); const minT=Math.min(7*60,...slots.map(s=>toMin(s.start)),...S.timetable.entries.map(e=>toMin(e.start)))-30; const maxT=Math.max(18*60,...slots.map(s=>toMin(s.end)),...S.timetable.entries.map(e=>toMin(e.end)))+30;
  CAL=new FullCalendar.Calendar(box,{
    locales:[FC_DE],locale:"de",firstDay:1,timeZone:"local",
    initialView:CAL_POS.view||(narrow?"timeGridDay":"timeGridWeek"),
    initialDate:gotoDate||CAL_POS.date||undefined,
    headerToolbar:narrow?{left:"prev,next",center:"title",right:"today"}:{left:"prev,next today",center:"title",right:"dayGridMonth,timeGridWeek,timeGridDay,listMonth"},
    footerToolbar:narrow?{center:"timeGridDay,timeGridWeek,dayGridMonth,listMonth"}:undefined,
    views:{listMonth:{buttonText:"Liste"}},
    height:"auto",expandRows:true,nowIndicator:true,weekNumbers:!narrow,navLinks:true,
    slotMinTime:fromMin(Math.max(0,minT-minT%30))+":00",slotMaxTime:fromMin(Math.min(1440,maxT+(30-maxT%30)%30))+":00",
    slotDuration:"00:15:00",slotLabelInterval:"01:00",scrollTime:"07:30:00",
    slotLabelFormat:{hour:"2-digit",minute:"2-digit",hour12:false},eventTimeFormat:{hour:"2-digit",minute:"2-digit",hour12:false},
    dayMaxEvents:true,editable:true,selectable:true,selectMirror:true,longPressDelay:350,
    events:(info,ok)=>ok(buildCalEvents(info.start,info.end)),
    datesSet:info=>{ CAL_POS={view:info.view.type,date:isoDate(info.view.currentStart)}; },
    select:info=>{ CAL.unselect(); newEntryDialog({start:info.start,end:info.end,allDay:info.allDay}); },
    eventClick:info=>{ info.jsEvent.preventDefault(); onCalClick(info.event); },
    eventDrop:info=>onCalMove(info,false),
    eventResize:info=>onCalMove(info,true),
    eventDidMount:info=>{ const p=info.event.extendedProps; if(p.kind==="item"){ const it=S.items.find(x=>x.id===p.itemId); if(it) info.el.title=`${TYPE_NAME[it.type]}: ${it.title}${it.subject?" ("+it.subject+")":""}${it.notes?"\n"+it.notes:""}`; } },
  });
  CAL.render();
  cleanup.push(()=>{ if(CAL){ try{CAL.destroy();}catch{} CAL=null; } });
}

/* ---------- Klick ---------- */
function onCalClick(ev){
  const p=ev.extendedProps; const t=calStore();
  if(p.kind==="item"){ go("due",{id:p.itemId}); return; }
  if(p.kind==="plan"){ const it=S.items.find(x=>x.id===p.itemId); if(!it||!it.plan) return; const d=(p.idx!=null&&it.plan.days[p.idx]&&it.plan.days[p.idx].date===p.date&&it.plan.days[p.idx].kind===p.pk)?it.plan.days[p.idx]:it.plan.days.find(x=>x.date===p.date&&x.kind===p.pk); if(!d) return;
    modal(`<span class="label">${d.kind==="wiederholung"?"Wiederholung":d.kind==="hoeren"?"Hörphase":"Lerneinheit"} · ${fmtDate(d.date,{weekday:"long",day:"numeric",month:"long"})}</span><h2>${esc(it.title)}</h2>
      <p class="small muted">${d.kind==="wiederholung"?"Gemischter Durchgang über das ganze Material.":d.kind==="hoeren"?`${esc((AUD_FORMATS[d.fmt]||AUD_FORMATS.monolog).n)}, ca. ${Math.round(d.minutes||0)} Minuten. Ergänzt die Lerneinheiten, zählt nicht als gelernt.`:`${d.sectionIds.length} Abschnitt${d.sectionIds.length>1?"e":""} aus deinem Lernplan.`} ${TYPE_NAME[it.type]} ${leftLabel(daysBetween(today0(),parseISO(it.date)))}.</p>
      <div class="row"><button class="btn primary" id="pcL">${d.kind==="hoeren"?"Anhören":d.done?"Noch einmal lernen":"Jetzt lernen"}</button><button class="btn" id="pcD">${d.done?"Nicht erledigt":"Abhaken"}</button><button class="btn" id="pcO">Lernplan öffnen</button><button class="btn ghost" data-close>Schließen</button></div>`,(m,close)=>{
      $("#pcL",m).onclick=()=>{close();startPlanDay(it,d);};
      $("#pcD",m).onclick=()=>{d.done=!d.done; if(!d.done) delete d.pct; save(); close(); calRefresh();};
      $("#pcO",m).onclick=()=>{close();go("due",{id:it.id});}; }); return; }
  if(p.kind==="event"){ const e=S.events.find(x=>x.id===p.eventId); if(e) editEvent(e); return; }
  if(p.kind==="lesson"){ const l=t.entries.find(x=>x.id===p.lessonId); if(!l) return; const key=l.id+"|"+p.date; const cancelled=!!t.cancel[key]; const mv=t.moves[key];
    modal(`<span class="label">${fmtDate(mv?mv.date:p.date,{weekday:"long",day:"numeric",month:"long"})} · ${mv?mv.start:l.start}–${mv?mv.end:l.end}</span><h2>${esc(l.subject)}</h2>
      <p class="small muted">${esc([l.room,l.teacher].filter(Boolean).join(" · ")||"Kein Raum eingetragen")}${l.week?` · nur Woche ${l.week}`:""}${mv?` · verlegt vom ${fmtDate(p.date)}`:""}${cancelled?" · entfällt an diesem Tag":""}</p>
      <div class="stack" style="gap:8px">
        <span class="label">Nur dieser Termin</span>
        <div class="row">${mv?`<button class="btn" id="lcBack">Verlegung aufheben</button>`:`<button class="btn" id="lcX">${cancelled?"Findet doch statt":"Entfällt"}</button>`}</div>
        <span class="label">Jede Woche</span>
        <div class="row"><button class="btn" id="lcEdit">Stunde im Stundenplan bearbeiten</button><button class="btn" id="lcExam">Klausur in dieser Stunde eintragen</button></div>
      </div>
      <div class="row"><span class="spacer"></span><button class="btn ghost" data-close>Schließen</button></div>`,(m,close)=>{
      const x=$("#lcX",m); if(x) x.onclick=()=>{ if(cancelled) delete t.cancel[key]; else t.cancel[key]=true; save(); close(); calRefresh(); };
      const b=$("#lcBack",m); if(b) b.onclick=()=>{ delete t.moves[key]; save(); close(); calRefresh(); };
      $("#lcEdit",m).onclick=()=>{ close(); editLesson(l.day,{start:l.start,end:l.end},l.id); };
      $("#lcExam",m).onclick=()=>{ close(); editItem(null,{type:"klausur",subject:l.subject,date:mv?mv.date:p.date,time:mv?mv.start:l.start,title:`Klausur ${l.subject}`,notes:l.room?`Raum ${l.room}`:""},{stay:true}); };
    }); }
}

/* ---------- Verschieben / Dauer ändern ---------- */
function onCalMove(info,resized){
  const ev=info.event, p=ev.extendedProps; const t=calStore();
  const s=ev.start, e=ev.end; const allDay=ev.allDay;
  if(p.kind==="item"){ const it=S.items.find(x=>x.id===p.itemId); if(!it){info.revert();return;}
    const nd=isoDate(s); if(nd<isoDate(today0())&&!it.done){ toast("Termine in der Vergangenheit sind nicht möglich"); info.revert(); return; }
    it.date=nd; it.time=allDay?"":hhmm(s); Object.keys(S.dismissed).forEach(k=>{ if(k.startsWith(it.id+":")) delete S.dismissed[k]; });
    adaptPlanToDate(it); save(); calRefresh(); toast(`${TYPE_NAME[it.type]} verschoben auf ${fmtDate(nd)}${it.time?", "+it.time+" Uhr":""}`); return; }
  if(p.kind==="plan"){ const it=S.items.find(x=>x.id===p.itemId); const d=it&&it.plan&&it.plan.days.find(x=>x.date===p.date&&x.kind===p.pk); const nd=isoDate(s);
    if(!d||nd>=it.date){ toast("Lerneinheiten müssen vor dem Termin liegen"); info.revert(); return; }
    d.date=nd; it.plan.days.sort((a,b)=>a.date.localeCompare(b.date)); save(); calRefresh(); return; }
  if(p.kind==="event"){ const x=S.events.find(y=>y.id===p.eventId); if(!x){info.revert();return;}
    if(x.kind==="frei"||allDay){ const endIncl=e?new Date(e.getTime()-864e5):s; x.start=isoDate(s); x.end=isoDate(endIncl<s?s:endIncl); x.allDay=true; }
    else { x.start=localISO(s); x.end=e?localISO(e):localISO(new Date(s.getTime()+36e5)); x.allDay=false; }
    save(); calRefresh(); return; }
  if(p.kind==="lesson"){
    if(allDay||!e||isoDate(s)!==isoDate(e)){ toast("Unterricht braucht eine Uhrzeit"); info.revert(); return; }
    const l=t.entries.find(x=>x.id===p.lessonId); if(!l){info.revert();return;} const key=l.id+"|"+p.date;
    let decided=false;
    modal(`<h2>${esc(l.subject)} ${resized?"verlängern/kürzen":"verschieben"}</h2><p>Neu: ${fmtDate(isoDate(s),{weekday:"long",day:"numeric",month:"long"})}, ${hhmm(s)}–${hhmm(e)} Uhr</p>
      <div class="row"><button class="btn primary" id="mvOne">Nur diesen Termin</button><button class="btn" id="mvAll">Jede Woche (Stundenplan ändern)</button><button class="btn ghost" id="mvNo">Abbrechen</button></div>`,(m,close)=>{
      const done=()=>{decided=true;close();};
      $("#mvOne",m).onclick=()=>{ t.moves[key]={date:isoDate(s),start:hhmm(s),end:hhmm(e)}; delete t.cancel[key]; save(); done(); calRefresh(); };
      $("#mvAll",m).onclick=()=>{ delete t.moves[key]; l.day=wd(s); l.start=hhmm(s); l.end=hhmm(e); if(l.day>4&&(S.timetable.days||5)<6) S.timetable.days=6; save(); done(); calRefresh(); toast("Stundenplan geändert"); };
      $("#mvNo",m).onclick=()=>{ done(); info.revert(); };
      $("#ov").addEventListener("click",ev2=>{ if(ev2.target.id==="ov"&&!decided) info.revert(); });
    });
  }
}

/* ---------- Neuer Eintrag ---------- */
function newEntryDialog({start,end,allDay}){
  const date=isoDate(start); const time=allDay?"":hhmm(start); const endTime=allDay||!end?"":hhmm(end);
  modal(`<span class="label">${fmtDate(date,{weekday:"long",day:"numeric",month:"long"})}${time?` · ${time}${endTime?"–"+endTime:""}`:" · ganztägig"}</span><h2>Was möchtest du eintragen?</h2>
    <div class="grid2">
      <button class="wizard-opt" data-k="klausur"><b>Klausur</b><span class="small muted">mit Erinnerung und Lernplan</span></button>
      <button class="wizard-opt" data-k="abgabe"><b>Abgabe</b><span class="small muted">Hausarbeit, Übungsblatt, Projekt</span></button>
      <button class="wizard-opt" data-k="termin"><b>Termin</b><span class="small muted">Sprechstunde, Treffen, Training</span></button>
      <button class="wizard-opt" data-k="frei"><b>Frei / Ferien</b><span class="small muted">Unterricht fällt an diesen Tagen weg</span></button>
      ${allDay?"":`<button class="wizard-opt" data-k="stunde"><b>Unterrichtsstunde</b><span class="small muted">jede Woche ${DAYS_LONG[wd(start)]}, ${time}${endTime?"–"+endTime:""}</span></button>`}
    </div><div class="row"><span class="spacer"></span><button class="btn ghost" data-close>Abbrechen</button></div>`,(m,close)=>{
    $$("[data-k]",m).forEach(b=>b.onclick=()=>{ const k=b.dataset.k; close();
      if(k==="klausur"||k==="abgabe") editItem(null,{type:k,date,time},{stay:true});
      else if(k==="stunde") editLesson(wd(start),{start:time,end:endTime||fromMin(toMin(time)+45)},null);
      else if(k==="frei"){ const endIncl=end&&allDay?new Date(end.getTime()-864e5):start; editEvent(null,{kind:"frei",title:"Ferien",start:date,end:isoDate(endIncl<start?start:endIncl),allDay:true}); }
      else editEvent(null,{kind:"termin",title:"",start:allDay?date:`${date}T${time}`,end:allDay?null:`${date}T${endTime||fromMin(Math.min(toMin(time)+60,1439))}`,allDay}); });
  });
}
function editEvent(e,prefill){
  const isNew=!e; e=e||Object.assign({id:rid("ev")},prefill);
  const frei=e.kind==="frei";
  modal(`<h2>${isNew?(frei?"Freie Tage eintragen":"Termin eintragen"):(frei?"Freie Tage":"Termin")}</h2>
    <label class="f">Bezeichnung<input type="text" id="evT" value="${esc(e.title||"")}" placeholder="${frei?"z. B. Herbstferien, Feiertag, Brückentag":"z. B. Sprechstunde, Lerngruppe"}"></label>
    ${frei?`<div class="grid2"><label class="f">Von<input type="date" id="evA" value="${esc(e.start.slice(0,10))}"></label><label class="f">Bis<input type="date" id="evB" value="${esc((e.end||e.start).slice(0,10))}"></label></div><p class="small muted">An diesen Tagen blendet der Kalender deinen Unterricht aus.</p>`
    :`<label class="row small" style="gap:6px"><input type="checkbox" id="evAll" ${e.allDay?"checked":""}> ganztägig</label>
      <div class="grid2"><label class="f">Datum<input type="date" id="evD" value="${esc(e.start.slice(0,10))}"></label><span></span>
      <label class="f evTime">Beginn<input type="time" id="evA" value="${esc(e.allDay?"":(e.start.slice(11,16)||""))}"></label><label class="f evTime">Ende<input type="time" id="evB" value="${esc(e.allDay||!e.end?"":e.end.slice(11,16))}"></label></div>`}
    <label class="f">Notizen<textarea id="evN" style="min-height:60px">${esc(e.notes||"")}</textarea></label>
    <div class="row"><button class="btn primary" id="evS">Speichern</button>${isNew?"":`<button class="btn danger" id="evX">Löschen</button>`}<button class="btn ghost" data-close>Abbrechen</button></div>`,(m,close)=>{
    $("#evT",m).focus();
    const all=$("#evAll",m); const tog=()=>$$(".evTime",m).forEach(x=>x.hidden=all.checked); if(all){ all.onchange=tog; tog(); }
    $("#evS",m).onclick=()=>{ const title=$("#evT",m).value.trim()||(frei?"Frei":""); if(!title){toast("Bitte eine Bezeichnung angeben");return;}
      if(frei){ const a=$("#evA",m).value, b=$("#evB",m).value||a; if(!a){toast("Bitte ein Datum angeben");return;} Object.assign(e,{title,start:a<=b?a:b,end:a<=b?b:a,allDay:true}); }
      else { const d=$("#evD",m).value; if(!d){toast("Bitte ein Datum angeben");return;}
        if(all.checked) Object.assign(e,{start:d,end:null,allDay:true});
        else { const a=$("#evA",m).value||"08:00"; let b=$("#evB",m).value; if(!b||toMin(b)<=toMin(a)) b=fromMin(Math.min(toMin(a)+60,1439)); Object.assign(e,{start:`${d}T${a}`,end:`${d}T${b}`,allDay:false}); }
        e.title=title; }
      e.notes=$("#evN",m).value.trim();
      if(isNew) S.events.push(e); save(); close(); calRefresh(); if(!CAL) render(); toast(isNew?"Im Kalender eingetragen":"Gespeichert"); };
    const x=$("#evX",m); if(x) x.onclick=()=>{ S.events=S.events.filter(y=>y.id!==e.id); save(); close(); calRefresh(); };
  });
}
