/* ===================== Handschrift und GoodNotes ===================== */
// Handschrift lesen: In claude.ai liest Claude Seitenbilder (auch Handschrift). Ohne Claude (lokal, GitHub Pages)
// übernimmt Tesseract.js im Browser – gut bei gedrucktem Text, bei Handschrift nur eingeschränkt.
// GoodNotes: .goodnotes-Dateien sind ZIP-Archive. GoodNotes legt die eigene Handschrifterkennung
// pro Seite unter search/<Seiten-ID> ab; diesen Text übernimmt Merkwerk. Eingebettete PDFs und Bilder
// (importierte Folien, Fotos) werden wie normale Dateien gelesen.

const FILE_ACCEPT=".pdf,.docx,.txt,.md,.goodnotes,image/*";
const TESSERACT="https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js";
const OCR_BY={claude:"von Claude abgeschrieben",browser:"im Browser erkannt",goodnotes:"Handschrift von GoodNotes erkannt"};
const BROWSER_OCR_NOTE="Ohne Claude liest Merkwerk Bilder mit einer Texterkennung im Browser. Gedruckter Text klappt meist gut, Handschrift oft nur teilweise. Prüfe und korrigiere den Text unter „Gelesenen Text ansehen“; in claude.ai liest Claude auch Handschrift.";
const ocrLabel=f=>f&&f.ocr?`${OCR_BY[f.ocrBy]||OCR_BY.claude} – bitte prüfen`:"";

/* ---------- Texterkennung im Browser (ohne Claude) ---------- */
// Tempo: nur das deutsche Sprachmodell (es liest auch englische Wörter; ein zweites Modell kostet fast die doppelte Zeit),
// mehrere Bilder gleichzeitig in eigenen Workern und große Fotos vorher verkleinert.
const OCR_LANG="deu";
const OCR_MAX_SIDE=2400; // längere Bildseite in Pixeln; mehr macht die Erkennung langsamer, aber kaum genauer
// Jeder Worker braucht eigenen Speicher: höchstens drei, auf schwachen Geräten einer
const ocrWorkerCap=()=>(navigator.deviceMemory&&navigator.deviceMemory<4)?1:Math.max(1,Math.min(3,(navigator.hardwareConcurrency||2)-1));
const tessWorkers=[];
function tessWorker(i){
  return tessWorkers[i] ||= loadScript(TESSERACT).then(()=>window.Tesseract.createWorker(OCR_LANG)).catch(e=>{tessWorkers[i]=null;throw e;});
}
async function shrinkForOcr(blob){
  if(typeof createImageBitmap!=="function") return blob;
  let bmp; try{ bmp=await createImageBitmap(blob); }catch{ return blob; }
  const s=OCR_MAX_SIDE/Math.max(bmp.width,bmp.height);
  if(s>=1){ bmp.close&&bmp.close(); return blob; }
  const c=document.createElement("canvas"); c.width=Math.round(bmp.width*s); c.height=Math.round(bmp.height*s);
  c.getContext("2d").drawImage(bmp,0,0,c.width,c.height); bmp.close&&bmp.close();
  return new Promise(r=>c.toBlob(b=>r(b||blob),"image/jpeg",0.92));
}
// items: Bilder oder Funktionen, die ein Bild (oder null für eine leere Seite) liefern – siehe ocrImages
async function ocrLocal(items,progress){
  const n=items.length, out=new Array(n).fill(""); let next=0, done=0;
  const show=()=>progress&&progress(n===1?"Texterkennung im Browser läuft …":`Texterkennung im Browser: ${done} von ${n} Bildern fertig …`);
  progress&&progress("Lade Texterkennung …");
  const lanes=Math.min(n,ocrWorkerCap());
  for(let k=0;k<lanes;k++) tessWorker(k).catch(()=>{}); // alle Worker laden gleichzeitig
  const lane=async k=>{
    let w=null;
    if(k>0){ try{ w=await tessWorker(k); }catch{ return; } } // weitere Worker sind nur Zusatz
    while(next<n){ const i=next++;
      const b=await ocrBlob(items[i]); // Worker 0 lädt, während die erste Seite vorbereitet wird
      if(!w){ w=await tessWorker(0); show(); }
      if(b){ const {data}=await w.recognize(await shrinkForOcr(b)); out[i]=String(data.text||"").replace(/[ \t]+\n/g,"\n").trim(); }
      done++; show();
    }
  };
  await Promise.all(Array.from({length:lanes},(_,k)=>lane(k)));
  return out;
}

/* ---------- ZIP lesen (ohne Bibliothek) ---------- */
async function inflateRaw(u8){
  const s=new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
function unzipIndex(u8){
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
  let e=-1; for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--){ if(dv.getUint32(i,true)===0x06054b50){e=i;break;} }
  if(e<0) throw new Error("kein ZIP-Archiv");
  const n=dv.getUint16(e+10,true); let p=dv.getUint32(e+16,true); const dec=new TextDecoder(); const files={};
  for(let k=0;k<n;k++){
    if(dv.getUint32(p,true)!==0x02014b50) throw new Error("ZIP-Verzeichnis beschädigt");
    const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), off=dv.getUint32(p+42,true);
    const name=dec.decode(u8.subarray(p+46,p+46+nl));
    const start=off+30+dv.getUint16(off+26,true)+dv.getUint16(off+28,true);
    files[name]={method,raw:u8.subarray(start,start+csize)};
    p+=46+nl+xl+cl;
  }
  return files;
}
async function zipRead(entry){
  if(!entry) return null;
  if(entry.method===0) return entry.raw;
  if(entry.method===8) return inflateRaw(entry.raw);
  throw new Error("ZIP-Kompression wird nicht unterstützt");
}

/* ---------- Protobuf ohne Schema ---------- */
function pbFields(u8){
  const out=[]; let i=0;
  const varint=()=>{ let r=0,m=1,b; do{ if(i>=u8.length) throw 0; b=u8[i++]; r+=(b&127)*m; m*=128; }while(b&128); return r; };
  while(i<u8.length){
    const key=varint(), f=Math.floor(key/8), t=key%8; let v;
    if(f<1) throw 0;
    if(t===0) v=varint(); else if(t===1){ v=null; i+=8; } else if(t===5){ v=null; i+=4; }
    else if(t===2){ const L=varint(); if(i+L>u8.length) throw 0; v=u8.subarray(i,i+L); i+=L; }
    else throw 0;
    out.push([f,t,v]);
  }
  return out;
}
const pbTry=u8=>{ try{ return pbFields(u8); }catch{ return null; } };
function pbDelimited(u8){ // Folge von Datensätzen mit vorangestellter Länge
  const out=[]; let i=0;
  while(i<u8.length){ let L=0,m=1,b; do{ b=u8[i++]; L+=(b&127)*m; m*=128; }while(b&128 && i<u8.length); out.push(u8.subarray(i,i+L)); i+=L; }
  return out;
}
const utf8=u8=>new TextDecoder().decode(u8);

/* ---------- GoodNotes ---------- */
// Erkannter Text einer Seite: Feld 6 = Wort/Zeichen, darin Feld 3 = Kandidaten (der erste ist der beste)
function goodnotesSearchText(u8){
  const top=pbTry(u8); if(!top) return "";
  let s="";
  for(const [f,t,v] of top){
    if(f!==6||t!==2) continue;
    const tok=pbTry(v); if(!tok) continue;
    const c=tok.find(([ff,tt])=>ff===3&&tt===2);
    if(c) s+=utf8(c[2]);
  }
  return s.replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
}
function sniff(u8){
  const h=String.fromCharCode(...u8.subarray(0,8));
  if(h.startsWith("%PDF")) return "pdf";
  if(u8[0]===0x89&&h.slice(1,4)==="PNG") return "png";
  if(u8[0]===0xff&&u8[1]===0xd8) return "jpeg";
  return "";
}
async function readGoodnotes(file,progress,readPdf,ocrImagesFn){
  const name=file.name; let files;
  try{ files=unzipIndex(new Uint8Array(await file.arrayBuffer())); }
  catch{ throw new Error(`„${name}“: Diese GoodNotes-Datei lässt sich nicht öffnen. Exportiere die Notizen in GoodNotes als PDF (Teilen → Exportieren → PDF) und lade das PDF hoch.`); }
  progress&&progress(`Lese GoodNotes-Notizen ${name} …`);
  // Seiten in der Reihenfolge des Notizbuchs
  const ids=[]; const idxRaw=await zipRead(files["index.notes.pb"]).catch(()=>null);
  if(idxRaw) for(const rec of pbDelimited(idxRaw)){ const fs=pbTry(rec); const id=fs&&fs.find(([f,t])=>f===1&&t===2); if(id){ const s=utf8(id[2]); if(!ids.includes(s)) ids.push(s); } }
  for(const k of Object.keys(files)){ const m=k.match(/^notes\/(.+)$/); if(m&&!ids.includes(m[1])) ids.push(m[1]); }
  const parts=[]; let hand=0;
  for(const id of ids){
    const raw=await zipRead(files["search/"+id]).catch(()=>null);
    const t=raw?goodnotesSearchText(raw):"";
    if(t){ parts.push(t); hand++; }
  }
  // Eingebettete PDFs (importierte Folien, Arbeitsblätter) nur mit Textebene – sonst ist es meist das Papier (Linien, Karos)
  // und die Handschrift darauf steckt schon in search/. Eingebettete Bilder (Fotos, Screenshots) werden gelesen.
  const imgs=[]; let by=hand?"goodnotes":""; let ocrUsed=hand>0;
  for(const k of Object.keys(files).filter(k=>k.startsWith("attachments/"))){
    const raw=await zipRead(files[k]).catch(()=>null); if(!raw) continue;
    const kind=sniff(raw);
    if(kind==="pdf"){ try{ const r=await readPdf(raw,name,progress,{textOnly:true}); if(r.text.trim()){ parts.push(r.text); if(r.ocr){ ocrUsed=true; by=by||r.ocrBy; } } }catch{} }
    else if(kind==="png"||kind==="jpeg"){ if(raw.length>20000) imgs.push(new Blob([raw],{type:"image/"+kind})); }
  }
  if(imgs.length){
    try{ const r=await ocrImagesFn(imgs,progress); const t=r.texts.filter(Boolean).join("\n\n"); if(t.trim()){ parts.push(t); ocrUsed=true; by=by||r.by; } }catch{}
  }
  const text=parts.join("\n\n").trim();
  if(!text) throw new Error(`„${name}“: In dieser GoodNotes-Datei wurde kein Text gefunden. Wahrscheinlich hat GoodNotes die Handschrift noch nicht erkannt. Exportiere die Notizen als PDF und lade das PDF hoch – ${CAP.sample?"Claude":"die Texterkennung"} liest dann die Seiten.`);
  return {text,ocr:ocrUsed,ocrBy:by||"goodnotes",kind:"goodnotes"};
}
