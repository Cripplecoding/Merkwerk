/* ===================== KI außerhalb von claude.ai (eigener Server mit Supabase) ===================== */
/* Wenn die Seite nicht in claude.ai läuft (GitHub Pages, lokal), fragt Merkwerk Claude über die eigene
   Supabase Edge Function „merkwerk-ai“. Sie hat dieselbe Schnittstelle wie claude.ais sample, damit der
   Rest der App nichts davon merkt. Leer = nicht eingerichtet; dann bleibt es bei der Variante ohne KI.
   Einrichtung: docs/ki-fuer-alle.md */
const AI_CONFIG = {
  url: "",      // Supabase → Project Settings → API → Project URL, z. B. https://abcd1234.supabase.co
  anonKey: "",  // Supabase → Project Settings → API → anon public key (darf öffentlich sein)
};
const aiReady=()=>!!(AI_CONFIG.url&&AI_CONFIG.anonKey);
const AI_SESSION_KEY="merkwerk.ki.sitzung";
const AI_CONSENT_KEY="merkwerk.ki.einwilligung";
const aiErr=(code,msg)=>Object.assign(new Error(msg||code),{code});

// Anonymes Supabase-Konto pro Gerät: kein Formular, nur ein Zugangs-Token, an dem das Tageslimit hängt.
async function aiToken(force){
  const base=AI_CONFIG.url.replace(/\/+$/,"");
  const h={apikey:AI_CONFIG.anonKey,"Content-Type":"application/json"};
  let s=lsGet(AI_SESSION_KEY,null);
  if(s&&!force&&s.exp>Date.now()+60e3) return s.access;
  let r=null;
  if(s&&s.refresh){ try{ r=await fetch(base+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:h,body:JSON.stringify({refresh_token:s.refresh})}); if(!r.ok) r=null; }catch{ r=null; } }
  if(!r){
    try{ r=await fetch(base+"/auth/v1/signup",{method:"POST",headers:h,body:JSON.stringify({data:{}})}); }catch{ throw aiErr("network"); }
    if(r.status===429) throw aiErr("rate_limited");
    if(!r.ok) throw aiErr("server_error");
  }
  const j=await r.json();
  s={access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000};
  lsSet(AI_SESSION_KEY,s);
  return s.access;
}

// Einmal pro Gerät: Hinweis, dass Material an Claude (Anthropic) geschickt wird
async function aiConsent(){
  if(lsGet(AI_CONSENT_KEY,false)) return;
  const ok=await new Promise(res=>modal(`<h3>Merkwerk mit KI nutzen</h3>
    <p>Für diese Funktion schickt Merkwerk dein Material (Text oder Bilder) an Claude von Anthropic, damit Claude Fragen erstellt, Bilder liest oder Antworten bewertet. Anthropic verwendet Daten aus solchen Anfragen nicht zum Training seiner Modelle. Pro Tag gibt es eine begrenzte Zahl kostenloser Anfragen.</p>
    <div class="row"><button class="btn primary" id="kiOk">Einverstanden</button><button class="btn" data-close>Abbrechen</button></div>`,
    (m,close)=>{ $("#kiOk",m).onclick=()=>{close();res(true);}; m.querySelector("[data-close]").addEventListener("click",()=>res(false)); }));
  if(!ok) throw aiErr("cancelled");
  lsSet(AI_CONSENT_KEY,true);
}

// Bilder vor dem Senden auf höchstens 1568 px Kantenlänge verkleinern (mehr nutzt Claude ohnehin nicht)
async function aiImage(blob){
  const type=blob.type||"image/jpeg";
  try{
    const bmp=await createImageBitmap(blob);
    const k=Math.min(1,1568/Math.max(bmp.width,bmp.height));
    if(k<1||!["image/jpeg","image/png","image/webp","image/gif"].includes(type)||blob.size>3.5e6){
      const c=document.createElement("canvas"); c.width=Math.round(bmp.width*k); c.height=Math.round(bmp.height*k);
      const x=c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,c.width,c.height); x.drawImage(bmp,0,0,c.width,c.height);
      blob=await new Promise(r=>c.toBlob(r,"image/jpeg",0.88));
    }
  }catch{}
  const buf=new Uint8Array(await blob.arrayBuffer()); let bin="";
  for(let i=0;i<buf.length;i+=0x8000) bin+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));
  return {media_type:blob.type||"image/jpeg",data:btoa(bin)};
}

// JSON aus Claudes Antwort lesen (auch wenn Text oder ```json drumherum steht)
function aiParseJson(text){
  const t=String(text||"").replace(/^\s*```(?:json)?\s*/i,"").replace(/\s*```\s*$/,"").trim();
  try{ return JSON.parse(t); }catch{}
  const a=t.search(/[\[{]/), b=Math.max(t.lastIndexOf("}"),t.lastIndexOf("]"));
  if(a>=0&&b>a){ try{ return JSON.parse(t.slice(a,b+1)); }catch{} }
  throw aiErr("invalid_json");
}

// Gleiche Form wie claude.ai: sample(prompt,{images,modelTier,signal,onText}) → {text}
function remoteSample(){
  const run=async(prompt,opt={})=>{
    await aiConsent();
    const images=opt.images&&opt.images.length?await Promise.all(opt.images.map(aiImage)):[];
    const body=JSON.stringify({prompt,images,tier:opt.modelTier==="quick"?"quick":"default"});
    let res;
    for(let attempt=0;attempt<2;attempt++){
      const token=await aiToken(attempt>0);
      try{ res=await fetch(AI_CONFIG.url.replace(/\/+$/,"")+"/functions/v1/merkwerk-ai",{method:"POST",signal:opt.signal,
        headers:{apikey:AI_CONFIG.anonKey,Authorization:"Bearer "+token,"Content-Type":"application/json"},body}); }
      catch(e){ throw aiErr(e&&e.name==="AbortError"?"cancelled":"network"); }
      if(res.status!==401) break;
    }
    if(!res.ok){ let j={}; try{ j=await res.json(); }catch{} throw aiErr(j.code||(res.status===429?"rate_limited":"server_error"),j.message); }
    const rd=res.body.getReader(), dec=new TextDecoder(); let buf="", done=null;
    try{
      for(;;){
        const {value,done:end}=await rd.read(); if(end) break;
        buf+=dec.decode(value,{stream:true}); let i;
        while((i=buf.indexOf("\n"))>=0){
          const line=buf.slice(0,i).trim(); buf=buf.slice(i+1); if(!line) continue;
          let ev; try{ ev=JSON.parse(line); }catch{ continue; }
          if(ev.t==="text"&&opt.onText) opt.onText({text:ev.text});
          else if(ev.t==="error") throw aiErr(ev.code,ev.message);
          else if(ev.t==="done") done=ev;
        }
      }
    }catch(e){ if(e&&e.name==="AbortError") throw aiErr("cancelled"); throw e; }
    if(!done) throw aiErr("network");
    if(typeof done.rest==="number") CAP.aiRest=done.rest;
    return {text:done.text};
  };
  const sample=(prompt,opt)=>run(prompt,opt);
  sample.json=async(prompt,opt)=>aiParseJson((await run(prompt+"\n\nGib nur das JSON aus, ohne Text davor oder danach.",opt)).text);
  sample.limits=async()=>({images:{maxCount:5}});
  return sample;
}
