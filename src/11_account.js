/* ===================== Begrüßung, Anmeldung, Konto ===================== */
const MSAL_JS="https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.30.0/lib/msal-browser.min.js";
const GOOGLE_JS="https://accounts.google.com/gsi/client";
const APPLE_JS="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/de_DE/appleid.auth.js";
const authReady=k=>!!(AUTH_CONFIG[k]&&AUTH_CONFIG[k].clientId);
const WEL={step:"start",mode:"login",provider:null,busy:false,err:""};

// Echte Anmeldung beim Anbieter. Liefert {provider, sub, name, email, picture}.
async function signInWith(k){
  const c=AUTH_CONFIG[k];
  if(k==="google"){
    await loadScript(GOOGLE_JS);
    const token=await new Promise((res,rej)=>{
      const cl=window.google.accounts.oauth2.initTokenClient({client_id:c.clientId,scope:"openid email profile",
        callback:r=>r.error?rej(new Error(r.error_description||r.error)):res(r.access_token),
        error_callback:e=>rej(new Error(e&&e.type==="popup_closed"?"Anmeldung abgebrochen":"Anmeldung bei Google fehlgeschlagen"))});
      cl.requestAccessToken();
    });
    const u=await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:"Bearer "+token}})).json();
    if(!u.sub) throw new Error("Google hat kein Konto zurückgegeben");
    return {provider:"google",sub:u.sub,name:u.name||"",email:u.email||"",picture:u.picture||""};
  }
  if(k==="microsoft"){
    await loadScript(MSAL_JS);
    const pca=new window.msal.PublicClientApplication({auth:{clientId:c.clientId,authority:"https://login.microsoftonline.com/common",redirectUri:location.origin+location.pathname},cache:{cacheLocation:"localStorage"}});
    await pca.initialize();
    const r=await pca.loginPopup({scopes:["openid","profile","email"],prompt:"select_account"});
    const a=r.account; return {provider:"microsoft",sub:a.homeAccountId,name:a.name||"",email:a.username||""};
  }
  if(k==="apple"){
    await loadScript(APPLE_JS);
    window.AppleID.auth.init({clientId:c.clientId,scope:"name email",redirectURI:c.redirectURI||location.origin+location.pathname,usePopup:true});
    const r=await window.AppleID.auth.signIn();
    const p=jwtPayload(r.authorization&&r.authorization.id_token);
    if(!p.sub) throw new Error("Apple hat kein Konto zurückgegeben");
    const n=r.user&&r.user.name?[r.user.name.firstName,r.user.name.lastName].filter(Boolean).join(" "):"";
    return {provider:"apple",sub:p.sub,name:n,email:p.email||""};
  }
  throw new Error("Unbekannter Anbieter");
}

// Nach erfolgreicher Anmeldung oder Registrierung
async function enterAccount(ident){
  const {acc,created}=upsertAccount(ident);
  await useAccountStorage();
  if(!S.profile||(created&&WEL.mode==="register")){ WEL.step="onboard"; WEL.note=WEL.mode==="login"&&created?"Auf diesem Gerät gab es noch keine Daten zu deinem Konto. Lass uns kurz alles einrichten.":""; render(); return; }
  WEL.step="start"; go(S.lastView&&S.lastView!=="welcome"?S.lastView:"home");
  toast(created?"Konto angelegt":`Willkommen zurück${acc.name?", "+acc.name.split(" ")[0]:""}`);
}

function accountLabel(a){ return a.name||a.email||(a.provider==="claude"?"Claude-Konto":"Konto"); }
async function claudeName(){ try{ return CAP.user?(await CAP.user.name())||"":""; }catch{ return ""; } }

function renderWelcome(m){
  document.body.classList.add("guest");
  const w=WEL; const verb=w.mode==="register"?"registrieren":"anmelden";
  const provBtns=()=>`<div class="stack auth-list">${PROVIDERS.map(p=>`<button class="btn auth-btn" data-prov="${p.k}" ${w.busy?"disabled":""}>${AUTH_ICON[p.k]}<span>Mit ${p.n} ${verb}</span></button>`).join("")}</div>`;
  const back=`<button class="btn ghost" id="wBackStart">← Zurück</button>`;
  let html="";
  if(w.step==="start"){
    html=`<div class="welcome-hero stack"><span class="label">Merkwerk</span><h1>Herzlich Willkommen bei Merkwerk,<br>bereit, dein Lernen für immer zu verändern?</h1></div>
      <div class="grid2 welcome-choice">
        <button class="wizard-opt" id="wHave"><b>Ich habe schon ein Konto</b><span class="small muted">Anmelden und weiterlernen</span></button>
        <button class="wizard-opt primary-opt" id="wNew"><b>Verändere mein Lernen</b><span class="small muted">Neues Konto anlegen</span></button>
      </div>`;
  } else if(w.step==="auth"){
    const local=ACC.list.filter(a=>a.provider==="local"||a.provider==="claude"||!authReady(a.provider));
    html=`<section class="sheet stack welcome-card">
      <h1>${w.mode==="login"?"Schön, dass du wieder am Start bist":"Leg dein Konto an"}</h1>
      <p class="muted">${w.mode==="login"?"Melde dich mit dem Dienst an, mit dem du dich registriert hast.":"Registriere dich mit einem dieser Dienste. Danach stimmen wir Merkwerk auf dich ab."}</p>
      ${CAP.user?`<button class="btn primary auth-btn" id="wClaude" ${w.busy?"disabled":""}>${AUTH_ICON.claude}<span>Mit deinem Claude-Konto weiter</span></button><p class="small muted">In claude.ai meldet Merkwerk dich über dein Claude-Konto an; deine Daten sind dann auf allen Geräten da.</p>`:""}
      ${provBtns()}
      ${w.err?`<div class="note bad small">${esc(w.err)}</div>`:""}
      ${w.mode==="login"&&local.length?`<div class="stack" style="gap:6px"><span class="label">Konten auf diesem Gerät</span><div class="list">${local.map(a=>`<div class="li"><div class="grow"><b>${esc(accountLabel(a))}</b><div class="small muted">${a.provider==="local"?"nur auf diesem Gerät":"über "+esc(providerName(a.provider))}</div></div><button class="btn sm" data-acc="${a.id}">Weiter</button></div>`).join("")}</div></div>`:""}
      <div class="row">${back}</div></section>`;
  } else if(w.step==="fallback"){
    const pn=providerName(w.provider);
    html=`<section class="sheet stack welcome-card">
      <h2>${esc(pn)}-Anmeldung ist hier noch nicht eingerichtet</h2>
      <p>Damit Merkwerk dich über ${esc(pn)} anmelden kann, muss die Seite bei ${esc(pn)} registriert sein. Bis dahin kannst du trotzdem starten: Merkwerk legt dein Konto auf diesem Gerät an. Deine Lernsets und Termine bleiben dann in diesem Browser.</p>
      ${w.mode==="login"?`<p class="small muted">Du hattest schon ein Konto auf diesem Gerät? Geh zurück und wähle es unter „Konten auf diesem Gerät“.</p>`:""}
      <label class="f">Wie heißt du?<input type="text" id="wName" placeholder="Vorname" autocomplete="given-name"></label>
      <div class="row"><button class="btn primary" id="wLocal">Konto auf diesem Gerät anlegen</button><button class="btn ghost" id="wBackAuth">← Zurück</button></div></section>`;
  } else if(w.step==="onboard"){
    html=`<div class="welcome-hero stack"><span class="label">Fast geschafft</span><h1>Lass uns Merkwerk auf deine Bedürfnisse abstimmen</h1>${w.note?`<p class="muted">${esc(w.note)}</p>`:""}</div>
      <section class="sheet" id="wizRoot">${wizardHTML(S.profile,{onboard:true})}</section>`;
  }
  m.innerHTML=`<div class="view welcome">${html}</div>`;
  const on=(id,fn)=>{ const e=$("#"+id,m); if(e) e.onclick=fn; };
  on("wHave",()=>{ Object.assign(WEL,{step:"auth",mode:"login",err:""}); render(); });
  on("wNew",()=>{ Object.assign(WEL,{step:"auth",mode:"register",err:""}); render(); });
  on("wBackStart",()=>{ Object.assign(WEL,{step:"start",err:""}); render(); });
  on("wBackAuth",()=>{ Object.assign(WEL,{step:"auth",err:""}); render(); });
  on("wClaude",async()=>{ if(!CAP.uid){ WEL.err="Dein Claude-Konto ist hier nicht verfügbar. Lade die Seite neu."; render(); return; } await enterAccount({provider:"claude",sub:CAP.uid,name:""}); });
  $$("[data-prov]",m).forEach(b=>b.onclick=async()=>{
    const k=b.dataset.prov; WEL.provider=k; WEL.err="";
    if(!authReady(k)){ WEL.step="fallback"; render(); return; }
    WEL.busy=true; render();
    try{ const ident=await signInWith(k); WEL.busy=false; await enterAccount(ident); }
    catch(e){ WEL.busy=false; WEL.err=(e&&e.message&&!/popup_window_error|user_cancelled|popup_closed/i.test(e.message))?e.message:"Anmeldung abgebrochen."; render(); }
  });
  $$("[data-acc]",m).forEach(b=>b.onclick=async()=>{ ACC.current=b.dataset.acc; accStore(ACC); const a=currentAccount(); await enterAccount({provider:a.provider,sub:a.sub,name:a.name}); });
  on("wLocal",async()=>{ const n=$("#wName",m).value.trim(); if(!n){ toast("Bitte gib deinen Namen ein"); return; } await enterAccount({provider:"local",sub:rid("local_"),name:n}); });
  const wn=$("#wName",m); if(wn){ wn.focus(); wn.onkeydown=e=>{ if(e.key==="Enter") $("#wLocal",m).click(); }; }
  const wr=$("#wizRoot",m); if(wr) mountWizard(wr,()=>{ WEL.step="start"; WEL.note=""; go("home"); toast("Alles eingerichtet – leg dein erstes Lernset an"); },{onboard:true});
}

/* ---------- Kontomenü ---------- */
async function openAccountMenu(){
  const a=currentAccount(); if(!a) return;
  const name=a.provider==="claude"?(await claudeName())||"Claude-Konto":accountLabel(a);
  modal(`<div class="row" style="gap:14px;align-items:center"><span class="avatar big">${esc((name||"?").slice(0,1).toUpperCase())}</span><div class="stack" style="gap:2px"><h2>${esc(name)}</h2><span class="small muted">${a.provider==="local"?"Konto auf diesem Gerät":"Angemeldet über "+esc(providerName(a.provider))}${a.email?" · "+esc(a.email):""}</span></div></div>
    ${S.profile?`<div class="stack" style="gap:4px"><span class="label">${S.profile.track==="uni"?"Studium":"Schule"}</span><p>${esc(profileLabel(S.profile))}</p></div>`:""}
    ${a.provider==="local"?`<p class="small muted">Lernsets, Termine und Profil liegen nur in diesem Browser. Mit „Daten sichern“ nimmst du sie auf ein anderes Gerät mit.</p>`:a.provider==="claude"?`<p class="small muted">Deine Angaben werden mit deinem Claude-Konto auf deinen Geräten abgeglichen.</p>`:`<p class="small muted">Die Anmeldung erkennt dich wieder; Lernsets und Termine liegen in diesem Browser.</p>`}
    <div class="stack" style="gap:8px">
      <button class="btn" id="amProfile">Schule oder Studium ändern</button>
      <button class="btn" id="amExport">Daten sichern</button>
      <button class="btn" id="amImport">Sicherung laden</button>
      <button class="btn" id="amSwitch">Konto wechseln</button>
      <button class="btn" id="amOut">Abmelden</button>
      <button class="btn ghost danger" id="amDel">Konto von diesem Gerät entfernen</button>
    </div>
    <div class="row"><span class="spacer"></span><button class="btn ghost" data-close>Schließen</button></div>`,(m,close)=>{
    $("#amProfile",m).onclick=()=>{ close(); openWizard(); };
    $("#amExport",m).onclick=()=>{ close(); exportAll(); };
    $("#amImport",m).onclick=()=>{ close(); importAll(); };
    const out=async(step)=>{ close(); await syncUp(); signOutAccount(); await useAccountStorage(); Object.assign(WEL,{step,mode:"login",err:""}); render(); };
    $("#amSwitch",m).onclick=()=>out("auth");
    $("#amOut",m).onclick=()=>out("start");
    $("#amDel",m).onclick=async()=>{
      close();
      if(!await confirmBox(`Konto „${name}“ mit allen Lernsets und Terminen von diesem Gerät entfernen?`,"Entfernen")) return;
      const st=storageFor(a);
      try{ localStorage.removeItem(st.ls); localStorage.removeItem(st.ls+".sets"); }catch{}
      if(idb._db){ try{idb._db.close();}catch{} idb._db=null; }
      try{ indexedDB.deleteDatabase(st.db); }catch{}
      removeAccount(a.id); await useAccountStorage(); Object.assign(WEL,{step:"start",err:""}); render(); toast("Konto entfernt");
    };
  });
}
function renderAccountChip(){
  const c=$("#accountChip"); if(!c) return; const a=currentAccount();
  document.body.classList.toggle("guest",!a);
  if(!a){ c.hidden=true; return; }
  c.hidden=false; c.onclick=openAccountMenu;
  const set=n=>{ c.innerHTML=`<span class="avatar">${esc((n||"?").slice(0,1).toUpperCase())}</span><span class="acc-name">${esc(n)}</span>`; c.title="Konto: "+n; };
  if(a.provider==="claude"){ set("Konto"); claudeName().then(n=>{ if(n) set(n); }); } else set(accountLabel(a));
}

const AUTH_ICON={
  google:`<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>`,
  apple:`<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 .1-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/></svg>`,
  microsoft:`<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#F25022" d="M2 2h9.5v9.5H2z"/><path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z"/><path fill="#00A4EF" d="M2 12.5h9.5V22H2z"/><path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z"/></svg>`,
  claude:`<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};
