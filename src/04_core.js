/* ===================== Grundlagen ===================== */
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rid = (p="") => p+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const DAYS=["Mo","Di","Mi","Do","Fr","Sa","So"];
const DAYS_LONG=["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
const pad=n=>String(n).padStart(2,"0");
const isoDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseISO=s=>{const [y,m,d]=String(s).split("-").map(Number);return new Date(y,(m||1)-1,d||1);};
const today0=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
const daysBetween=(a,b)=>Math.round((parseISO(isoDate(b))-parseISO(isoDate(a)))/864e5);
const fmtDate=(s,opt={weekday:"short",day:"numeric",month:"short"})=>parseISO(s).toLocaleDateString("de-DE",opt);
const wd=d=>(d.getDay()+6)%7; // Mo=0
const toMin=t=>{const [h,m]=String(t||"0:0").split(":").map(Number);return (h||0)*60+(m||0);};
const fromMin=m=>`${pad(Math.floor(m/60))}:${pad(m%60)}`;

function toast(msg,ms=2600){const t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),ms);}
function modal(html,onMount){
  const root=$("#modalRoot"); root.innerHTML=`<div class="overlay" id="ov"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  const close=()=>{root.innerHTML="";};
  $("#ov").addEventListener("click",e=>{if(e.target.id==="ov")close();});
  root.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",close));
  onMount&&onMount(root.querySelector(".modal"),close);
  return close;
}
function confirmBox(text,okLabel="Löschen"){return new Promise(res=>{modal(`<h3>${esc(text)}</h3><div class="row"><button class="btn danger" id="cOk">${esc(okLabel)}</button><button class="btn" data-close>Abbrechen</button></div>`,(m,close)=>{$("#cOk",m).onclick=()=>{close();res(true)};m.querySelector("[data-close]").addEventListener("click",()=>res(false));});});}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast("Kopiert");}catch{toast("Kopieren nicht möglich – bitte markieren und kopieren");}}

/* ---------- Speicher: localStorage (App-Zustand) + IndexedDB (Material) ---------- */
let LS_KEY=storageFor(currentAccount()).ls;
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}};
const idb={
  _db:null, name:storageFor(currentAccount()).db,
  open(){ if(this._db) return Promise.resolve(this._db);
    return new Promise((res,rej)=>{ try{ const r=indexedDB.open(this.name,1); r.onupgradeneeded=()=>{r.result.createObjectStore("sets",{keyPath:"id"});}; r.onsuccess=()=>{this._db=r.result;res(r.result)}; r.onerror=()=>rej(r.error);}catch(e){rej(e)} }); },
  async all(){ try{const db=await this.open(); return await new Promise((res,rej)=>{const q=db.transaction("sets").objectStore("sets").getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error);});}catch{ return lsGet(LS_KEY+".sets",[]); } },
  async put(v){ try{const db=await this.open(); await new Promise((res,rej)=>{const t=db.transaction("sets","readwrite");t.objectStore("sets").put(v);t.oncomplete=res;t.onerror=()=>rej(t.error);});}catch{ const all=lsGet(LS_KEY+".sets",[]).filter(s=>s.id!==v.id); all.push(v); if(!lsSet(LS_KEY+".sets",all)) toast("Speicher voll – sehr große Dateien müssen nach dem Neuladen evtl. neu hochgeladen werden"); } },
  async del(id){ try{const db=await this.open(); await new Promise((res,rej)=>{const t=db.transaction("sets","readwrite");t.objectStore("sets").delete(id);t.oncomplete=res;t.onerror=()=>rej(t.error);});}catch{ lsSet(LS_KEY+".sets",lsGet(LS_KEY+".sets",[]).filter(s=>s.id!==id)); } },
};

const DEFAULT_STATE = () => ({
  v:2, updatedAt:0,
  profile:null,            // {track:'schule'|'uni', state, type, grade, uni, program, semester}
  mySubjects:[],           // Namen
  activeSet:null,
  timetable:{ days:5, slots:null, entries:[] }, // entries: {id, day, start, end, subject, room, teacher, week:'' | 'A' | 'B'}
  items:[],                // Abgaben/Klausuren
  events:[],               // eigene Termine und freie Tage (Kalender)
  ttMode:"cal",
  remind:{ klausur:true, abgabe:true, klausurDays:[14,7,1], abgabeDays:[3,1,0] },
  dismissed:{},            // Erinnerung-ID -> true
  lastView:"home",
});
let S = Object.assign(DEFAULT_STATE(), lsGet(LS_KEY, {}));
let SETS = []; // Lernsets inkl. Text (aus IndexedDB)
// Nach An- oder Abmelden: Zustand und Lernsets des jeweiligen Kontos laden
async function useAccountStorage(){
  const st=storageFor(currentAccount());
  clearTimeout(saveTimer);
  LS_KEY=st.ls; if(idb._db){ try{idb._db.close();}catch{} } idb._db=null; idb.name=st.db;
  S=Object.assign(DEFAULT_STATE(), lsGet(LS_KEY, {})); SETS=[];
  await loadSets(); await syncDown();
}

let saveTimer=null;
function save(remote=true){
  S.updatedAt=Date.now(); lsSet(LS_KEY,S);
  if(remote){ clearTimeout(saveTimer); saveTimer=setTimeout(syncUp,1500); }
}

/* ---------- Claude-Fähigkeiten ---------- */
const CAP={sample:null,db:null,user:null,downloads:null,uid:null,images:null,canWrite:null,isOwner:false,ready:false};
async function initCaps(){
  if(!window.claude||!window.claude.use){ CAP.ready=true; return; }
  const [sample,db,user,downloads]=await Promise.all(["sample","db","user","downloads"].map(n=>window.claude.use(n).catch(()=>null)));
  Object.assign(CAP,{sample,db,user,downloads});
  if(sample){ try{ const l=await sample.limits(); CAP.images=l.images||null; }catch{} }
  if(user){ try{ CAP.uid=await user.id(); CAP.isOwner=await user.isOwner(); CAP.canWrite=await user.can("data.write"); }catch{} }
  CAP.ready=true;
  await syncDown();
  render();
}
function sampleErr(e){
  const c=e&&e.code;
  if(c==="not_granted"||c==="sampling_disabled"||c==="not_declared") return "Claude ist für diese Seite nicht freigegeben. Öffne Merkwerk in claude.ai und erlaube die Nutzung.";
  if(c==="rate_limited") return "Zu viele Anfragen oder Nutzungslimit erreicht. Versuch es in ein paar Minuten noch einmal.";
  if(c==="prompt_too_large") return "Das Material ist für eine Anfrage zu groß. Teile es in kleinere Lernsets auf.";
  if(c==="invalid_json") return "Claudes Antwort war nicht lesbar. Versuch es noch einmal.";
  if(c==="images_unavailable"||c==="image_rejected") return "Bilder können hier nicht gelesen werden. Versuch ein anderes Format (JPG oder PNG).";
  if(c==="refused") return "Claude hat diese Anfrage abgelehnt. Prüfe das Material.";
  if(c==="session_expired") return "Bitte melde dich bei claude.ai erneut an.";
  return "Verbindung zu Claude unterbrochen. Versuch es noch einmal.";
}
const needClaude = () => CAP.sample ? "" : `<div class="note warn">Für diese Funktion braucht Merkwerk Claude. Das funktioniert nur, wenn du die Seite in claude.ai öffnest. Beim ersten Mal fragt sie nach einer Freigabe; die Nutzung zählt zu deinem Claude-Kontingent.</div>`;

/* ---------- Geräteübergreifend: privater Bereich in der Datenbank ---------- */
let syncing=false;
async function syncDown(){
  if(!CAP.db||!CAP.uid||!currentAccount()) return;
  try{
    const snap=await CAP.db.doc(`data/users/${CAP.uid}/app`).get();
    if(snap.exists){ const r=snap.data(); if(r && (r.updatedAt||0) > (S.updatedAt||0)){ S=Object.assign(DEFAULT_STATE(), r.state||{}); S.updatedAt=r.updatedAt; lsSet(LS_KEY,S); } }
  }catch{}
}
async function syncUp(){
  if(!CAP.db||!CAP.uid||syncing||!currentAccount()) return; syncing=true;
  try{ const st=JSON.parse(JSON.stringify(S)); await CAP.db.doc(`data/users/${CAP.uid}/app`).set({updatedAt:S.updatedAt,state:st}); }catch(e){}
  syncing=false;
}

/* ---------- Ansichten / Navigation ---------- */
const VIEWS={};
let cleanup=[];
function go(v,arg){
  cleanup.forEach(f=>{try{f()}catch{}}); cleanup=[];
  S.lastView=v; save(false);
  $$(".tab").forEach(t=>t.setAttribute("aria-selected",String(t.dataset.v===v)));
  ROUTE.v=v; ROUTE.arg=arg; render();
  window.scrollTo({top:0});
}
const ROUTE={v:S.lastView||"home",arg:null};
function render(){
  const m=$("#main");
  renderAccountChip();
  if(!currentAccount()||WEL.step==="onboard"){ renderWelcome(m); return; }
  const fn=VIEWS[ROUTE.v]||VIEWS.home;
  fn(m,ROUTE.arg);
  renderProfileChip();
}
function renderProfileChip(){
  const c=$("#profileChip"); const p=S.profile;
  if(!p||!currentAccount()){c.hidden=true;return;}
  c.hidden=false; c.textContent=profileLabel(p);
  c.onclick=()=>openWizard();
}
function profileLabel(p){
  if(!p) return "";
  if(p.track==="uni") return [p.uni||"Studium",p.program,p.semester?p.semester+". Sem.":""].filter(Boolean).join(" · ");
  const t=SCHOOL_TYPES.find(x=>x.k===p.type);
  return [schoolTypeName(p.type,p.state),(stateByK(p.state)||{}).n,(t&&t.gradeLabel? p.grade+". "+t.gradeLabel : "Klasse "+p.grade)].join(" · ");
}
