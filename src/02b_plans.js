/* ===================== Bildungspläne: passende Pläne zu Profil, Fach und Thema ===================== */
/* Die Daten (data/bildungsplaene.js, ca. 1 MB) lädt Merkwerk erst, wenn sie gebraucht werden. */
const PLAN_SRC="bildungsplaene.js";
const PLAN_STATUS={g:"gültig",a:"gültig, wird aufsteigend eingeführt",x:"auslaufend, gilt noch für höhere Jahrgänge",s:"gilt subsidiär weiter",k:"tritt erst künftig in Kraft",e:"Erprobungsfassung",n:"nicht verifiziert",p:"Portalübersicht"};
const PLAN_RANK={g:0,a:0,e:1,s:2,n:3,x:4,k:5,p:6};
let PLAN_ROWS=null;
function planRows(){
  if(PLAN_ROWS) return PLAN_ROWS;
  const D=(typeof window!=="undefined"&&window.PLAN_DB)||null; if(!D) return null;
  PLAN_ROWS=D.rows.map(r=>({land:r[0],types:D.types[r[1]].split(","),art:D.arten[r[2]],lo:r[3],hi:r[4],fach:D.faecher[r[5]],title:r[6],url:D.pre[r[7]]+r[8],st:r[9],gen:!!r[10],valid:r[11]||""}));
  return PLAN_ROWS;
}
let planLoading=null;
async function loadPlans(){
  if(planRows()) return true;
  planLoading ||= loadScript(PLAN_SRC).then(()=>!!planRows()).catch(()=>{ planLoading=null; return false; });
  return planLoading;
}
// Alle Pläne für Land, Schulart und Klasse
function plansFor(p){
  const rows=planRows(); if(!rows||!p||p.track!=="schule"||!p.state||!p.type) return [];
  const g=Number(p.grade)||0;
  return rows.filter(r=>r.land===p.state&&r.types.includes(p.type)&&(p.type==="bs"||!g||(g>=r.lo&&g<=r.hi)))
    .sort((a,b)=>(PLAN_RANK[a.st]??9)-(PLAN_RANK[b.st]??9));
}
// Fächer laut Bildungsplan: [{n, docs}]
function planSubjects(p){
  const m=new Map();
  for(const r of plansFor(p)){ if(r.gen||!r.fach||r.st==="p") continue; const k=subjKey(r.fach); if(!m.has(k)) m.set(k,{n:r.fach,docs:0}); m.get(k).docs++; }
  return [...m.values()].sort((a,b)=>a.n.localeCompare(b.n,"de"));
}
// Passt ein Planfach zu einem Fachnamen des Nutzers? (gleicher Name oder dasselbe Kernfach unter anderem Namen)
function sameSubject(planFach,name){
  const a=subjKey(planFach), b=subjKey(name); if(!a||!b) return false;
  if(a===b) return true;
  if(/,| als |zweitsprache|herkunft|profil|gebärden|\(nwt\)/i.test(planFach)) return false; // z. B. „Deutsch als Zweitsprache“, „Informatik, Mathematik, Physik (IMP)“
  const ta=topicAlias(planFach), tb=topicAlias(name); return !!(ta&&tb&&ta===tb&&(a===subjKey(ta)||b===subjKey(ta)));
}
// Pläne zu einem Fach: {docs: Fachpläne, general: übergreifende Teile}
function plansForSubject(p,subject){
  const all=plansFor(p);
  return { docs:all.filter(r=>!r.gen&&r.fach&&sameSubject(r.fach,subject)), general:all.filter(r=>r.gen).slice(0,4) };
}
// Fächerliste für die Profil-Abfrage: Fächer laut Bildungsplan, Kernfächer (aus subjectsFor) vorausgewählt
function subjectOptions(p){
  const base=subjectsFor(p); const fromPlan=planSubjects(p);
  if(!fromPlan.length) return base;
  const out=fromPlan.map(s=>({n:s.n,core:base.some(b=>b.core&&sameSubject(s.n,b.n)),plan:true}));
  return out.sort((a,b)=>(b.core-a.core)||a.n.localeCompare(b.n,"de"));
}
function planDocHTML(r){
  return `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)} ↗</a>${r.st!=="g"?` <span class="small muted">· ${esc(PLAN_STATUS[r.st]||"")}</span>`:""}`;
}
