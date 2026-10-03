/* ===================== Karteikarten ===================== */
// set.cards: [{id,term,definition,quote,fileName}]
// set.fc:    {ids:[Karten-IDs in Reihenfolge], idx, known:[ids], practice:[ids], phase:"card"|"end", retry}

function cardCountFor(set){ const chars=set.files.reduce((a,f)=>a+f.text.length,0); return clamp(Math.round(chars/350),8,40); }

/* ---------- Karten mit Claude ---------- */
function buildCardPrompt(set,n){
  let budget=110000; const listed=[];
  for(const s of set.sections){ if(budget-s.text.length<0) break; budget-=s.text.length; listed.push(s); }
  const material=listed.map(s=>`[${s.id} | ${s.fileName}]\n${s.text}`).join("\n\n");
  return `Du erstellst Karteikarten für eine Lernseite. Grundlage ist AUSSCHLIESSLICH das Material unten.

REGELN
1. Jede Karte hat "term": einen Fachbegriff, Namen oder eine kurze Bezeichnung aus dem Material (höchstens 6 Wörter), und "definition": eine Erklärung in 1 bis 2 Sätzen, nur mit Inhalten aus dem Material. Der Begriff selbst steht nicht in der Definition.
2. Jede Karte hat "quote": ein wörtliches, zusammenhängendes Zitat aus dem Material (40 bis 300 Zeichen), das die Definition belegt. Exakt so geschrieben wie im Material, ohne Auslassungen, ohne "…".
3. Etwa ${n} Karten, verteilt über das ganze Material. Jeder Begriff nur einmal, die wichtigsten zuerst.

Antworte nur mit JSON: {"cards":[{"term","definition","quote"}]}

MATERIAL
${material}`;
}
function validateCard(set,c){
  if(!c||!c.term||!c.definition||!c.quote) return null;
  const term=String(c.term).trim(), def=String(c.definition).trim();
  if(term.length>90||def.length<4||def.length>600) return null;
  const loc=locateQuote(set,c.quote); if(!loc) return null;
  return {id:rid("c"),term,definition:def,quote:String(c.quote),fileName:loc.fileName};
}
function dedupeCards(cards){ const seen=new Set(); return cards.filter(c=>{ const k=relax(c.term); if(!k||seen.has(k)) return false; seen.add(k); return true; }); }
async function generateCards(set,{signal}={}){
  const n=cardCountFor(set);
  const res=await CAP.sample.json(buildCardPrompt(set,n),{modelTier:"default",cache:false,signal});
  const list=Array.isArray(res)?res:(res&&res.cards)||[];
  const cards=dedupeCards(list.map(c=>validateCard(set,c)).filter(Boolean));
  return {cards,dropped:list.length-cards.length};
}

/* ---------- Karten ohne Claude: Definitionssätze im Text erkennen ---------- */
const CARD_STOP=new Set(["es","er","sie","das","dies","diese","dieser","dieses","man","hier","dort","dabei","daher","deshalb","so","wir","ihr","ich","du","beide","alle","viele","manche","einige","er","jeder","jede","jedes"]);
const capFirst=s=>s.charAt(0).toUpperCase()+s.slice(1);
const stripArticle=s=>s.replace(/^(der|die|das|den|dem|des|ein|eine|einen|einem|eines)\s+/i,"").trim();
function extractCardsLocal(set){
  const out=[];
  for(const f of set.files){
    const sents=String(f.text||"").replace(/\r/g,"").split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean);
    sents.forEach((s,i)=>{
      if(s.length<20||s.length>420) return;
      let term=null, def=null;
      let m=s.match(/^(.{8,}?)[;,:]?\s+(?:diese[nrs]?\s+\S+\s+)?(?:nennt|bezeichnet)\s+man\s+(?:als\s+)?(.{2,60}?)[.!]?$/i);
      if(m){ term=m[2]; def=m[1]; }
      if(!term){ m=s.match(/^(?:Dieser|Diese|Dieses)\s+\S+\s+(?:wird|werden)\s+(?:auch\s+)?als\s+(.{2,60}?)\s+bezeichnet[.!]?$/);
        if(m&&i>0){ term=m[1]; def=sents[i-1]; } }
      if(!term){ m=s.match(/^(?:Unter\s+(?:dem|der|den)\s+)?((?:(?:Der|Die|Das|Ein|Eine)\s+)?[A-ZÄÖÜ][\wÄÖÜäöüß-]*(?:\s+[\wÄÖÜäöüß-]+){0,2}?)\s+(?:ist|sind|bezeichnet|beschreibt|bedeutet|versteht\s+man)\s+(.{20,})$/);
        if(m){ term=m[1]; def=m[2]; } }
      if(!term) return;
      term=capFirst(stripArticle(term.replace(/[„“"]/g,""))); def=capFirst(def.trim().replace(/[;,:]$/,""));
      if(!/[.!?]$/.test(def)) def+=".";
      if(term.length<2||CARD_STOP.has(term.toLowerCase())||!/^[A-ZÄÖÜ0-9]/.test(term)) return;
      out.push({id:rid("c"),term,definition:def,quote:s,fileName:f.name});
    });
  }
  return dedupeCards(out).slice(0,40);
}
function exampleCards(set){ return EXAMPLE_CARDS.map(c=>validateCard(set,c)).filter(Boolean); }

/* ---------- Durchlauf ---------- */
function fcStart(set,ids,retry=false){ set.fc={ids:shuffle(ids),idx:0,known:[],practice:[],phase:"card",retry}; return set.fc; }
function fcAssign(set,cat){
  const F=set.fc; if(!F||F.phase!=="card") return F;
  const id=F.ids[F.idx]; (cat==="known"?F.known:F.practice).push(id);
  F.idx++; if(F.idx>=F.ids.length) F.phase="end";
  return F;
}
function fcResult(F){ const n=F.known.length+F.practice.length; return {n,known:F.known.length,practice:F.practice.length,pct:n?Math.round(F.known.length/n*100):0}; }

async function openCards(set,{rebuild=false}={}){
  if(!set.files.length){ toast("Lade zuerst Material hoch"); return; }
  if(!set.cards||!set.cards.length||rebuild){
    let cards=[];
    if(set.example) cards=exampleCards(set);
    else if(CAP.sample){
      const box=$("#roundStatus"); const ctl=new AbortController();
      if(box){ box.hidden=false; box.innerHTML=`<div class="row"><span class="spin"></span><span>Claude erstellt Karteikarten aus deinem Material …</span><span class="spacer"></span><button class="btn sm" id="rsStop">Abbrechen</button></div>`; $("#rsStop").onclick=()=>ctl.abort(); }
      try{ const r=await generateCards(set,{signal:ctl.signal}); cards=r.cards; if(r.dropped) toast(`${r.dropped} Karten ohne gültigen Beleg verworfen`,3500); }
      catch(e){ if(box){ if(e&&e.code==="cancelled") box.hidden=true; else box.innerHTML=`<div class="note bad">${esc(sampleErr(e))}</div>`; } return; }
    } else cards=extractCardsLocal(set);
    if(!cards.length){ const box=$("#roundStatus"); if(box){ box.hidden=false; box.innerHTML=`<div class="note bad">${CAP.sample?"Es konnte keine belegte Karte erstellt werden. Prüfe unter „Gelesenen Text ansehen“, ob der Text richtig gelesen wurde.":"Im Material wurden keine Begriffe mit Definition erkannt. Öffne Merkwerk in claude.ai, dann erstellt Claude die Karteikarten."}</div>`; } return; }
    set.cards=cards; set.fc=null;
  }
  if(!set.fc||rebuild) fcStart(set,set.cards.map(c=>c.id));
  await putSet(set); S.activeSet=set.id; save(); go("learn",{setId:set.id,cards:true});
}

/* ---------- Ansicht ---------- */
let fcKeyHandler=null;
function setFcKeys(fn){ if(fcKeyHandler) document.removeEventListener("keydown",fcKeyHandler); fcKeyHandler=fn; if(fn){ document.addEventListener("keydown",fn); cleanup.push(()=>setFcKeys(null)); } }
const reduceMotion=()=>window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function renderCards(m,set){
  const F=set.fc; if(!F||!set.cards) return go("learn",{manage:true});
  if(F.phase==="end") return renderCardsEnd(m,set);
  const byId=Object.fromEntries(set.cards.map(c=>[c.id,c]));
  const card=byId[F.ids[F.idx]]; if(!card){ F.ids=F.ids.filter(id=>byId[id]); F.idx=Math.min(F.idx,F.ids.length); if(F.idx>=F.ids.length) F.phase="end"; putSet(set); return renderCards(m,set); }
  const total=F.ids.length, done=F.idx, pct=Math.round(done/total*100);
  m.innerHTML=`<div class="view">
   <div class="row"><button class="btn ghost sm" id="backSets">← ${esc(set.name)}</button><span class="spacer"></span>${F.retry?'<span class="pill warn">Nicht gewusste</span>':""}${set.example?'<span class="pill mark">Beispiel</span>':""}</div>
   <div class="fc-progress" aria-label="Fortschritt"><span class="mono"><b>${done}</b> / ${total}</span><div class="fc-bar"><i style="width:${pct}%"></i></div></div>
   <div class="fc-stage">
     <button class="fc-zone know" id="zKnow" type="button" aria-label="Weiß ich (${F.known.length})"><span class="fc-count mono">${F.known.length}</span><span class="fc-zl">weiß ich</span><span class="fc-arrow" aria-hidden="true">←</span></button>
     <div class="fc-card" id="fcCard" tabindex="0" role="button" aria-label="Karte umdrehen">
       <div class="fc-inner">
         <div class="fc-face fc-front"><span class="label">Begriff</span><p class="fc-term">${esc(card.term)}</p><span class="small muted">Antippen zum Umdrehen</span></div>
         <div class="fc-face fc-back" aria-hidden="true"><span class="label">Definition</span><p class="fc-def">${esc(card.definition)}</p><p class="quote small">„${esc(card.quote)}“ <span class="muted">– ${esc(card.fileName)}</span></p></div>
       </div>
     </div>
     <button class="fc-zone practice" id="zPractice" type="button" aria-label="Muss ich noch üben (${F.practice.length})"><span class="fc-count mono">${F.practice.length}</span><span class="fc-zl">muss ich noch üben</span><span class="fc-arrow" aria-hidden="true">→</span></button>
   </div>
   <p class="small muted" style="text-align:center">Karte antippen zum Umdrehen · nach links oder rechts ziehen zum Einordnen · Tastatur: Leertaste, ← und →</p>
  </div>`;
  $("#backSets").onclick=()=>go("learn",{manage:true});
  const el=$("#fcCard"), inner=$(".fc-inner",el), zK=$("#zKnow"), zP=$("#zPractice");
  let flipped=false, busy=false;
  const flip=()=>{ flipped=!flipped; inner.classList.toggle("flipped",flipped); $(".fc-front",el).setAttribute("aria-hidden",String(flipped)); $(".fc-back",el).setAttribute("aria-hidden",String(!flipped)); };
  const assign=async cat=>{
    if(busy) return; busy=true;
    (cat==="known"?zK:zP).classList.add("hot");
    const fly=()=>new Promise(r=>{ if(reduceMotion()) return r(); el.style.transition="transform .28s ease-in, opacity .28s ease-in"; el.style.transform=`translateX(${cat==="known"?"-":""}110vw) rotate(${cat==="known"?-14:14}deg)`; el.style.opacity="0"; setTimeout(r,260); });
    await fly(); fcAssign(set,cat); await putSet(set); renderCards(m,set);
  };
  el.onkeydown=e=>{ if(e.key===" "||e.key==="Enter"){e.preventDefault();flip();} };
  const onKey=e=>{ if(e.target.closest&&e.target.closest("input,textarea,select")) return; if(e.key==="ArrowLeft"){e.preventDefault();assign("known");} else if(e.key==="ArrowRight"){e.preventDefault();assign("practice");} };
  setFcKeys(onKey);
  zK.onclick=()=>assign("known"); zP.onclick=()=>assign("practice");
  // Ziehen mit Maus, Finger oder Stift; ein kurzer Klick dreht die Karte um
  let sx=0, sy=0, dx=0, pid=null, moved=false;
  const thresh=()=>Math.min(140,Math.max(60,el.offsetWidth*0.28));
  const hot=()=>{ const t=thresh(); zK.classList.toggle("hot",dx<-t); zP.classList.toggle("hot",dx>t); };
  const reset=()=>{ el.style.transition="transform .2s ease"; el.style.transform=""; dx=0; hot(); el.classList.remove("dragging"); };
  el.onpointerdown=e=>{ if(busy||e.button>0) return; pid=e.pointerId; sx=e.clientX; sy=e.clientY; dx=0; moved=false; el.style.transition="none"; };
  el.onpointermove=e=>{ if(e.pointerId!==pid) return; dx=e.clientX-sx; if(!moved&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(e.clientY-sy)){ moved=true; el.classList.add("dragging"); try{el.setPointerCapture(pid);}catch{} } if(moved){ el.style.transform=`translateX(${dx}px) rotate(${dx/22}deg)`; hot(); } };
  el.onpointerup=e=>{ if(e.pointerId!==pid) return; pid=null;
    if(!moved){ flip(); return; }
    const t=thresh(); if(dx<-t) assign("known"); else if(dx>t) assign("practice"); else reset(); };
  el.onpointercancel=()=>{ pid=null; if(moved) reset(); };
  el.focus({preventScroll:true});
}

function renderCardsEnd(m,set){
  setFcKeys(null); const F=set.fc; const r=fcResult(F);
  const kPct=r.pct, pPct=r.n?100-r.pct:0;
  m.innerHTML=`<div class="view">
   <div class="row"><button class="btn ghost sm" id="backSets">← ${esc(set.name)}</button></div>
   <section class="sheet stack" style="gap:20px">
     <div class="row" style="align-items:flex-end;gap:18px"><div class="score mono">${kPct}<span style="font-size:1.6rem"> %</span></div><div class="stack" style="gap:2px"><h2>Alle Karten durchgearbeitet</h2><p class="muted">Du hast ${r.known} von ${r.n} Karten gewusst${F.retry?" · Durchlauf mit nicht gewussten Karten":""}</p></div></div>
     <div class="fc-chart" role="img" aria-label="Gewusst ${kPct} Prozent, muss ich noch üben ${pPct} Prozent">
       <div class="fc-col know"><span class="fc-val mono">${r.known} · ${kPct} %</span><div class="fc-track"><i style="height:${kPct}%"></i></div><span class="fc-cl">gewusst</span></div>
       <div class="fc-col practice"><span class="fc-val mono">${r.practice} · ${pPct} %</span><div class="fc-track"><i style="height:${pPct}%"></i></div><span class="fc-cl">muss ich noch üben</span></div>
     </div>
     <div class="fc-actions">
       <button class="btn primary" id="fcAll">Karten noch einmal durcharbeiten</button>
       <button class="btn" id="fcRetry" ${r.practice?"":"disabled"}>Nicht gewusste erneut üben${r.practice?` (${r.practice})`:""}</button>
       <button class="btn" id="fcHome">Zurück zum Hauptmenü</button>
     </div>
   </section>
   ${r.practice?`<section class="sheet stack"><h3>Muss ich noch üben (${r.practice})</h3><div class="list">${F.practice.map(id=>set.cards.find(c=>c.id===id)).filter(Boolean).map(c=>`<div class="li"><div class="grow stack" style="gap:2px"><b>${esc(c.term)}</b><p class="small">${esc(c.definition)}</p></div></div>`).join("")}</div></section>`:`<div class="note">Alles gewusst. Mit „Karten noch einmal durcharbeiten“ startest du einen neuen Durchlauf.</div>`}
  </div>`;
  $("#backSets").onclick=()=>go("learn",{manage:true});
  $("#fcAll").onclick=async()=>{ fcStart(set,set.cards.map(c=>c.id)); await putSet(set); renderCards(m,set); window.scrollTo({top:0}); };
  $("#fcRetry").onclick=async()=>{ if(!F.practice.length) return; fcStart(set,[...F.practice],true); await putSet(set); renderCards(m,set); window.scrollTo({top:0}); };
  $("#fcHome").onclick=()=>go("home");
}
