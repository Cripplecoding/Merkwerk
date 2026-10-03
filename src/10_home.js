/* ===================== Heute ===================== */
VIEWS.home = async function(m){
  if(!SETS.length) await loadSets();
  const now=new Date(); const t0=today0(); const tISO=isoDate(t0);
  const lessons=lessonsOn(now); const nowM=now.getHours()*60+now.getMinutes();
  const next=lessons.find(l=>!l.cancelled&&toMin(l.end)>nowM);
  const evToday=(S.events||[]).filter(e=>e.kind!=="frei"&&e.start.slice(0,10)===tISO).sort((a,b)=>a.start.localeCompare(b.start));
  const rem=dueReminders();
  const sessions=S.items.filter(it=>!it.done&&it.plan).flatMap(it=>it.plan.days.filter(d=>d.date===tISO).map(d=>({it,d})));
  const soon=S.items.filter(it=>!it.done).map(it=>({it,left:daysBetween(t0,parseISO(it.date))})).filter(x=>x.left>=0&&x.left<=21).sort((a,b)=>a.left-b.left);
  const active=setById(S.activeSet); const running=active&&active.round&&active.round.phase==="q";
  const fresh=!S.profile&&!SETS.length&&!S.items.length&&!S.timetable.entries.length;
  m.innerHTML=`<div class="view">
   <div class="stack" style="gap:4px"><span class="label">${now.toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}</span><h1>${fresh?"Willkommen bei Merkwerk":"Heute"}</h1></div>
   ${fresh?`<section class="sheet stack"><p>Merkwerk macht aus deinem Material Prüfungsfragen – jede mit einem wörtlichen Beleg. Dazu kommen eine Bibliothek für dein Fach, dein Stundenplan und ein Lernplan bis zur nächsten Klausur.</p>
     <div class="grid2"><button class="wizard-opt" id="h1"><b>Beispiel ausprobieren</b><span class="small muted">15 Fragen zu einem kurzen Text über Photosynthese</span></button><button class="wizard-opt" id="h2"><b>Angaben machen</b><span class="small muted">Schule oder Studium, Fächer, Bundesland</span></button></div></section>`:""}
   ${rem.length?`<section class="sheet stack"><h3>Erinnerungen</h3>${remHTML(rem)}</section>`:""}
   ${running?`<section class="sheet row"><div class="grow stack" style="gap:2px;flex:1;min-width:0"><span class="label">Angefangen</span><b>${esc(active.name)} · Frage ${active.round.idx+1} von ${active.round.qs.length}</b></div><button class="btn primary" id="cont">Weiterlernen</button></section>`:""}
   <div class="grid2">
     <section class="sheet stack"><div class="row"><h3>Lernplan heute</h3></div>
       ${sessions.length?`<div class="list">${sessions.map(({it,d})=>`<div class="li"><div class="grow"><b>${esc(it.title)}</b><div class="small muted">${d.kind==="wiederholung"?"Wiederholung":"Neue Abschnitte: "+d.sectionIds.length} · ${leftLabel(daysBetween(t0,parseISO(it.date)))} ${TYPE_NAME[it.type]}</div></div>${d.done?'<span class="pill ok">erledigt</span>':`<button class="btn sm primary" data-pl="${it.id}|${d.date}|${d.kind}">Lernen</button>`}</div>`).join("")}</div>`
        :`<p class="muted small">Heute steht nichts im Lernplan. ${S.items.some(i=>!i.done)?"Öffne einen Termin, um einen Lernplan zu erstellen.":"Trag eine Klausur ein und lass dir einen Lernplan erstellen."}</p>`}
     </section>
     <section class="sheet stack"><div class="row"><h3>Stundenplan</h3><span class="spacer"></span><button class="btn ghost sm" id="toTT">Kalender</button></div>
       ${evToday.length?`<div class="list">${evToday.map(e=>`<div class="li"><span class="mono small" style="min-width:92px">${e.allDay?"ganztägig":e.start.slice(11,16)+"–"+(e.end||"").slice(11,16)}</span><div class="grow"><b>${esc(e.title)}</b><div class="small muted">Termin</div></div></div>`).join("")}</div>`:""}
       ${lessons.length?`<div class="list">${lessons.map(l=>`<div class="li" ${l===next?'style="background:var(--accent-soft);border-radius:8px;padding-inline:8px"':""}><span class="mono small" style="min-width:92px">${l.start}–${l.end}</span><div class="grow"><b style="${l.cancelled?"text-decoration:line-through;opacity:.6":""}">${esc(l.subject)}</b>${l.cancelled?' <span class="pill bad">entfällt</span>':""}${l.moved?' <span class="pill">verlegt</span>':""}<div class="small muted">${esc([l.room,l.teacher].filter(Boolean).join(" · "))}</div></div>${l===next?`<span class="pill">${toMin(l.start)<=nowM?"jetzt":"als Nächstes"}</span>`:""}</div>`).join("")}</div>`
        :`<p class="muted small">${S.timetable.entries.length?"Heute kein Unterricht eingetragen.":"Noch kein Stundenplan – importiere ihn per Screenshot."}</p>`}
     </section>
   </div>
   <section class="sheet stack"><div class="row"><h3>Die nächsten drei Wochen</h3><span class="spacer"></span><button class="btn ghost sm" id="toDue">Alle Termine</button></div>
     ${soon.length?`<div class="list">${soon.map(({it})=>itemRow(it)).join("")}</div>`:`<p class="muted small">Keine Abgaben oder Klausuren in den nächsten 21 Tagen.</p>`}
   </section>
  </div>`;
  const h1=$("#h1"); if(h1) h1.onclick=async()=>{const s=await makeExampleSet();S.activeSet=s.id;save();go("learn",{manage:true});};
  const h2=$("#h2"); if(h2) h2.onclick=()=>go("lib");
  const c=$("#cont"); if(c) c.onclick=()=>go("learn",{setId:active.id});
  $("#toTT").onclick=()=>go("tt"); $("#toDue").onclick=()=>go("due");
  bindRem(m); bindRows(m);
  $$("[data-pl]").forEach(b=>b.onclick=()=>{ const [id,date,kind]=b.dataset.pl.split("|"); const it=S.items.find(x=>x.id===id); startPlanDay(it,it.plan.days.find(d=>d.date===date&&d.kind===kind)); });
};

/* ===================== Start ===================== */
$$(".tab").forEach(t=>t.onclick=()=>go(t.dataset.v));
(async()=>{
  await loadSets();
  go(ROUTE.v||"home");
  initCaps();
})();
