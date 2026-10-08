/* ===================== Konten: Anmeldung mit Google, Apple, Microsoft ===================== */
/* Client-IDs der eigenen App-Registrierungen. Leer = Anbieter noch nicht eingerichtet;
   dann legt Merkwerk das Konto nur auf diesem Gerät an (siehe README, Abschnitt Anmeldung). */
const AUTH_CONFIG = {
  google:   { clientId: "" },                  // Google Cloud Console → OAuth-Client „Webanwendung“
  microsoft:{ clientId: "" },                  // Microsoft Entra → App-Registrierung, Plattform „Single-Page-Anwendung“
  apple:    { clientId: "", redirectURI: "" }, // Apple Developer → Services ID mit „Sign in with Apple“
};
const PROVIDERS = [
  {k:"google",n:"Google"},
  {k:"apple",n:"Apple"},
  {k:"microsoft",n:"Microsoft"},
];
const providerName = k => (PROVIDERS.find(p=>p.k===k)||{n:k==="claude"?"Claude":k==="local"?"diesem Gerät":k==="guest"?"Gastzugang":k}).n;
const guestAccount = () => ACC.list.find(a=>a.provider==="guest")||null;

/* Kontenliste auf diesem Gerät. Jedes Konto hat eigenen App-Zustand (localStorage) und eigene Lernsets (IndexedDB).
   Daten von vor der Kontenfunktion übernimmt das erste Konto. */
const ACC_KEY="merkwerk.accounts";
const accLoad=()=>{ try{ return JSON.parse(localStorage.getItem(ACC_KEY))||{list:[],current:null}; }catch{ return {list:[],current:null}; } };
const accStore=a=>{ try{ localStorage.setItem(ACC_KEY,JSON.stringify(a)); }catch{} };
let ACC=accLoad();
const currentAccount=()=>ACC.list.find(a=>a.id===ACC.current)||null;
function storageFor(acc){ return acc ? {ls:acc.ls, db:acc.db} : {ls:"merkwerk.v2", db:"merkwerk"}; }
// Sucht ein Konto über Anbieter und Kennung; legt es sonst an. Liefert {acc, created}.
function upsertAccount(ident){
  let acc=ACC.list.find(a=>a.provider===ident.provider&&a.sub===ident.sub);
  if(acc){ Object.assign(acc,{name:ident.name||acc.name,email:ident.email||acc.email,picture:ident.picture||acc.picture}); ACC.current=acc.id; accStore(ACC); return {acc,created:false}; }
  // Gast („Ohne Konto fortfahren“): eigener Speicherbereich, übernimmt nie die Daten anderer Konten
  if(ident.provider==="guest"){
    acc={id:"gast",provider:"guest",sub:"gast",name:"Gast",email:"",picture:"",createdAt:Date.now(),ls:"merkwerk.v2.gast",db:"merkwerk-gast"};
    ACC.list.push(acc); ACC.current=acc.id; accStore(ACC); return {acc,created:true};
  }
  const id=Math.random().toString(36).slice(2,10);
  const legacyFree=!ACC.list.some(a=>a.db==="merkwerk");
  acc={id,provider:ident.provider,sub:String(ident.sub),name:ident.name||"",email:ident.email||"",picture:ident.picture||"",createdAt:Date.now(),
    ls: legacyFree?"merkwerk.v2":"merkwerk.v2."+id, db: legacyFree?"merkwerk":"merkwerk-"+id};
  ACC.list.push(acc); ACC.current=acc.id; accStore(ACC);
  return {acc,created:true};
}
function signOutAccount(){ ACC.current=null; accStore(ACC); }
function removeAccount(id){ ACC.list=ACC.list.filter(a=>a.id!==id); if(ACC.current===id) ACC.current=null; accStore(ACC); }
// Kennung aus einem JWT (Apple liefert die Identität nur als ID-Token)
function jwtPayload(t){ try{ const p=String(t).split(".")[1].replace(/-/g,"+").replace(/_/g,"/"); return JSON.parse(decodeURIComponent(escape(atob(p)))); }catch{ return {}; } }
