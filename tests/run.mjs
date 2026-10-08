// Prüft reine Logik ohne Browser: Beispielzitate, Karteikarten, Abschnitte, Lernplan, ICS-Import, Stundenraster, GoodNotes.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import vm from "node:vm";
import { deflateRawSync } from "node:zlib";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const files = ["02_data.js","02b_plans.js","03_example.js","03b_account.js","04_core.js","04b_handwriting.js","04c_ai.js","05_learn.js","05b_cards.js","05c_generate.js","05d_tutor.js","05e_audio.js","07_timetable.js","08_due.js","09_calendar.js"];
const store = {};
const ctx = { console, atob, Intl, Date, Math, JSON, Set, Map, Promise, setTimeout, clearTimeout, Blob, Response, ReadableStream, DecompressionStream, TextDecoder, TextEncoder, btoa, AbortController,
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}}, document:{querySelector:()=>null,querySelectorAll:()=>[]}, window:{} };
vm.createContext(ctx);
// Bildungsplan-Daten wie im Browser als window.PLAN_DB
vm.runInContext(readFileSync(join(src,"..","data","bildungsplaene.js"),"utf8"), ctx);
vm.runInContext(files.map(f=>readFileSync(join(src,f),"utf8")).join("\n") + `
;globalThis.__api={EXAMPLE_TEXT,EXAMPLE_QUESTIONS,EXAMPLE_CARDS,relax,extractCardsLocal,validateCard,fcStart,fcAssign,fcResult,verifyQuestions,CAP,clozeMatch,judgeNearBlanks,makeSections,buildPlan,isoDate,parseIcsTimetable,deriveSlots,mixFor,subjectsFor,buildCalEvents,readGoodnotes,goodnotesSearchText,ocrImages,S:()=>S,plansFor,planSubjects,plansForSubject,subjectOptions,sameSubject,upsertAccount,currentAccount,storageFor,removeAccount,jwtPayload,curatedTopics,learnLinks,genModesHTML,ACC:()=>ACC,AI_CONFIG,remoteSample,aiParseJson,sampleErr,generateQuestions,buildCardPrompt,notenpunkte,noteFromNP,gradeEstimate,validateExamTask,gradeExam,givenText,whyPrompt,examPoints,EXAMPLE_UNITS,EXAMPLE_SCRIPTS,materialHash,numbersOf,validateUnit,mergeUnits,buildUnits,selectBasis,cleanSegments,localCheck,applyRepairs,checkAndRepair,splitSpeech,ttsPlan,ttsBatches,trimSilence,normalizeGain,assemblePcm,encodeWav,audPipeline,audStart,audMeta,audDeleteSet,idb,ttsStatus,synthesize,TTS,audErr,scriptPrompt,unitChunks,transcriptText,setFetch:f=>{globalThis.fetch=f;}};`, ctx);
const A = ctx.__api;
let n = 0; const ok = (name, fn) => { fn(); n++; console.log("✓", name); };
let chain = Promise.resolve(); // Async-Prüfungen nacheinander, weil sie CAP.sample teilen
const okAsync = (name, fn) => { chain = chain.then(fn).then(() => { n++; console.log("✓", name); }); };

ok("Alle Beispielzitate stehen wörtlich im Beispieltext", () => {
  for (const q of A.EXAMPLE_QUESTIONS) assert.ok(A.relax(A.EXAMPLE_TEXT).includes(A.relax(q.quote)), q.quote);
  assert.equal(A.EXAMPLE_QUESTIONS.length, 15);
});
ok("Alle Beispiel-Karteikarten sind wörtlich belegt", () => {
  const set = { files:[{id:"f",name:"Beispiel",text:A.EXAMPLE_TEXT}] }; set.sections = A.makeSections(set.files);
  for (const c of A.EXAMPLE_CARDS) assert.ok(A.validateCard(set, c), c.term);
  assert.ok(A.EXAMPLE_CARDS.length >= 10);
});
ok("Karteikarten ohne Claude: Definitionssätze werden erkannt", () => {
  const cards = A.extractCardsLocal({ files:[{id:"f",name:"Beispiel",text:A.EXAMPLE_TEXT}] });
  const terms = cards.map(c=>c.term);
  assert.ok(terms.includes("Fotolyse"), terms.join(", "));
  assert.ok(terms.includes("Photosynthese"), terms.join(", "));
  assert.ok(terms.some(t=>/begrenzender Faktor/i.test(t)), terms.join(", "));
  assert.ok(cards.every(c=>c.definition.length>5 && A.EXAMPLE_TEXT.includes(c.quote)));
});
ok("Karteikarten-Durchlauf zählt und wiederholt nicht gewusste", () => {
  const set = {};
  A.fcStart(set, ["a","b","c","d"]);
  A.fcAssign(set,"known"); A.fcAssign(set,"practice"); A.fcAssign(set,"known");
  assert.equal(set.fc.phase, "card"); assert.equal(set.fc.idx, 3);
  A.fcAssign(set,"practice");
  assert.equal(set.fc.phase, "end");
  assert.equal(JSON.stringify(A.fcResult(set.fc)), JSON.stringify({n:4,known:2,practice:2,pct:50}));
  const again = [...set.fc.practice];
  A.fcStart(set, again, true);
  assert.equal(set.fc.ids.length, 2); assert.ok(set.fc.ids.every(id=>again.includes(id))); assert.equal(set.fc.retry, true);
});
ok("Lückentext toleriert kleine Tipp- und Grammatikfehler", () => {
  assert.ok(A.clozeMatch("kostenorientierte", ["kostenorientierten"]));
  assert.ok(A.clozeMatch("Kostenorientirten", ["kostenorientierten"]));
  assert.ok(A.clozeMatch("Glukose", ["Glucose"]));
  assert.ok(A.clozeMatch("Chloroplasten", ["Chloroplast"]));
  assert.ok(A.clozeMatch("Thylakoidmembran", ["Thylakoidmembranen"]));
  assert.ok(!A.clozeMatch("nachfrageorientierten", ["kostenorientierten"]));
  assert.ok(!A.clozeMatch("ADP", ["ATP"]));
  assert.ok(!A.clozeMatch("Stroma", ["Thylakoide"]));
  assert.ok(!A.clozeMatch("", ["ATP"]));
  assert.equal(A.clozeMatch("ATP", ["ATP"]), "exact");
  assert.equal(A.clozeMatch("Glukose", ["Glucose"]), "near");
});
okAsync("Sinnverändernde Abweichungen im Lückentext zählen als falsch", async () => {
  const q = {prompt:"Die Rate ___ und die Kosten sind ___.", blanks:[["zunehmende"],["kostenorientierten"]]};
  const given = ["abnehmende","kostenorientierte"];
  const v = given.map((g,i)=>A.clozeMatch(g,q.blanks[i]));
  assert.deepEqual([...v], ["near","near"]);
  const fake = async () => ({text:""}); fake.json = async () => ({luecken:[{i:0,sinnentstellend:true},{i:1,sinnentstellend:false}]});
  A.CAP.sample = fake;
  assert.deepEqual([...await A.judgeNearBlanks(q, given, v)], [false, true]);
  fake.json = async () => { throw {code:"rate_limited"}; };
  assert.deepEqual([...await A.judgeNearBlanks(q, given, v)], [true, true]);
  A.CAP.sample = null;
  assert.deepEqual([...await A.judgeNearBlanks(q, given, v)], [true, true]);
});
ok("Fragenmix 5/4/3/3", () => { assert.equal(JSON.stringify(A.mixFor(15)), JSON.stringify({mc:5,text:4,match:3,cloze:3})); });
ok("Lernplan deckt alle Abschnitte vor dem Termin ab", () => {
  const set = { id:"x", files:[{id:"f",name:"a",text:(A.EXAMPLE_TEXT+"\n\n").repeat(3)}] };
  set.sections = A.makeSections(set.files);
  const d = new Date(); d.setDate(d.getDate()+12);
  const r = A.buildPlan({id:"i",date:A.isoDate(d)}, set, {weekdays:[0,1,2,3,4,5,6], reviewDays:2});
  const covered = new Set(r.plan.days.filter(x=>x.kind==="neu").flatMap(x=>x.sectionIds));
  assert.equal(covered.size, set.sections.length);
  assert.ok(r.plan.days.every(x=>x.date < A.isoDate(d)));
  assert.equal(r.plan.days.filter(x=>x.kind==="wiederholung").length, 2);
});
ok("ICS-Import ordnet Wochentag und Uhrzeit zu", () => {
  const ics = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;TZID=Europe/Berlin:20261005T074500\nDTEND;TZID=Europe/Berlin:20261005T083000\nSUMMARY:Mathematik\nLOCATION:R101\nEND:VEVENT\nEND:VCALENDAR";
  const l = A.parseIcsTimetable(ics);
  assert.equal(l.length, 1); assert.equal(l[0].day, 0); assert.equal(l[0].start, "07:45"); assert.equal(l[0].room, "R101");
});
ok("Stundenraster bevorzugt Einzelstunden vor Doppelstunden", () => {
  const s = A.deriveSlots([{start:"07:45",end:"09:20"},{start:"07:45",end:"08:30"},{start:"08:35",end:"09:20"}]);
  assert.equal(JSON.stringify(s.map(x=>x.start)), JSON.stringify(["07:45","08:35"]));
});
ok("Kalender: Ferien blenden Unterricht aus, Klausuren erscheinen", () => {
  const S = A.S();
  const mon = new Date(2026,9,5);
  S.timetable.entries = [{id:"l1",day:0,start:"07:45",end:"08:30",subject:"Mathe"}];
  S.items = [{id:"k",type:"klausur",title:"Analysis",date:"2026-10-06",time:"10:00"}];
  S.events = [];
  let ev = A.buildCalEvents(mon, new Date(2026,9,12));
  assert.ok(ev.some(e=>e.id==="L|l1|2026-10-05"));
  assert.ok(ev.some(e=>e.id==="I|k" && e.start==="2026-10-06T10:00"));
  S.events = [{id:"f",kind:"frei",title:"Ferien",start:"2026-10-05",end:"2026-10-05",allDay:true}];
  ev = A.buildCalEvents(mon, new Date(2026,9,12));
  assert.ok(!ev.some(e=>e.id==="L|l1|2026-10-05"));
});
ok("Fächerkatalog Bayern Mittelschule ohne Biologie/Physik", () => {
  const f = A.subjectsFor({track:"schule",state:"BY",type:"haupt",grade:7}).map(x=>x.n);
  assert.ok(f.includes("Natur und Technik")); assert.ok(!f.includes("Physik"));
});
okAsync("Zweite Prüfung verwirft Fragen mit falscher Lösung", async () => {
  const set = { files:[{id:"f",name:"Beispiel",text:A.EXAMPLE_TEXT}] }; set.sections = A.makeSections(set.files);
  const qs = A.EXAMPLE_QUESTIONS.slice(0,3).map(q => ({...q, sections:[set.sections[0].id]}));
  let prompt = "";
  const fake = async () => ({text:""}); fake.json = async (p) => { prompt = p; return {checks:[{i:0,ok:true},{i:1,ok:false,grund:"vertauscht"},{i:2,ok:true}]}; };
  A.CAP.sample = fake;
  const kept = await A.verifyQuestions(set, qs);
  assert.equal(kept.length, 2); assert.ok(!kept.includes(qs[1])); assert.ok(prompt.includes("#1"));
  fake.json = async () => { throw {code:"rate_limited"}; };
  assert.equal((await A.verifyQuestions(set, qs)).length, 3);
  A.CAP.sample = null;
});
// --- GoodNotes: kleines Notizbuch im echten Aufbau (ZIP, index.notes.pb, search/<Seite>) nachbauen ---
const pbVar = n => { const o=[]; do { let b=n&127; n>>>=7; if(n) b|=128; o.push(b); } while(n); return o; };
const pbStr = (f, bytes) => [...pbVar(f*8+2), ...pbVar(bytes.length), ...bytes];
const te = s => [...new TextEncoder().encode(s)];
const word = (...cands) => pbStr(6, [...pbVar(1*8+0), 5, ...cands.flatMap(c=>pbStr(3, te(c)))]);
function zip(entries) { // [name, Uint8Array, deflate?]
  const loc=[], cen=[]; let off=0;
  for (const [name, data, def] of entries) {
    const nm=Buffer.from(name), body=def?deflateRawSync(data):Buffer.from(data), h=Buffer.alloc(30), c=Buffer.alloc(46);
    h.writeUInt32LE(0x04034b50,0); h.writeUInt16LE(def?8:0,8); h.writeUInt32LE(body.length,18); h.writeUInt32LE(data.length,22); h.writeUInt16LE(nm.length,26);
    c.writeUInt32LE(0x02014b50,0); c.writeUInt16LE(def?8:0,10); c.writeUInt32LE(body.length,20); c.writeUInt32LE(data.length,24); c.writeUInt16LE(nm.length,28); c.writeUInt32LE(off,42);
    loc.push(h,nm,body); cen.push(c,nm); off+=30+nm.length+body.length;
  }
  const cd=Buffer.concat(cen), e=Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50,0); e.writeUInt16LE(entries.length,8); e.writeUInt16LE(entries.length,10); e.writeUInt32LE(cd.length,12); e.writeUInt32LE(off,16);
  return Buffer.concat([...loc,cd,e]);
}
okAsync("GoodNotes: Handschrift-Erkennung wird seitenweise übernommen", async () => {
  const p1="AAAAAAAA-0000-0000-0000-000000000001", p2="BBBBBBBB-0000-0000-0000-000000000002";
  const rec = id => { const m=[...pbStr(1,te(id)), ...pbStr(2,te("notes/"+id))]; return [...pbVar(m.length), ...m]; };
  const s1 = Uint8Array.from([...pbStr(5,te(p1)), ...word("Photosynthese","Photosynthase"), ...word(" "), ...word("ist","ist."), ...word(" "), ...word("Lichtenergie"), ...word("\n"), ...word("ATP","AJP")]);
  const s2 = Uint8Array.from([...pbStr(5,te(p2)), ...word("Seite"), ...word(" "), ...word("zwei")]);
  const buf = zip([["schema.pb",Uint8Array.from([8,35])], ["index.notes.pb",Uint8Array.from([...rec(p2),...rec(p1)]),true],
    ["notes/"+p1,Uint8Array.from([1,2,3])], ["notes/"+p2,Uint8Array.from([1])], ["search/"+p1,s1,true], ["search/"+p2,s2,false],
    ["attachments/X",Uint8Array.from(te("%PDF-1.7 Vorlage")),true]]);
  let pdfCalls = 0;
  const readPdf = async () => { pdfCalls++; return {text:"Gedrucktes Arbeitsblatt",ocr:false}; };
  const r = await A.readGoodnotes({name:"Bio.goodnotes", arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.length)}, null, readPdf, async()=>({texts:[],by:"browser"}));
  assert.equal(r.kind, "goodnotes"); assert.equal(r.ocrBy, "goodnotes"); assert.ok(r.ocr);
  assert.equal(r.text, "Seite zwei\n\nPhotosynthese ist Lichtenergie\nATP\n\nGedrucktes Arbeitsblatt");
  assert.equal(pdfCalls, 1);
});
okAsync("GoodNotes: kaputte oder leere Datei verweist auf den PDF-Export", async () => {
  await assert.rejects(A.readGoodnotes({name:"x.goodnotes", arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}, null, null, null), /als PDF/);
  const buf = zip([["schema.pb",Uint8Array.from([8,35])]]);
  await assert.rejects(A.readGoodnotes({name:"leer.goodnotes", arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.length)}, null, null, null), /kein Text/);
});
okAsync("Bilder lesen: zwei Stapel gleichzeitig, leere Seiten werden nicht geschickt", async () => {
  const calls = []; let running = 0, maxRun = 0;
  A.CAP.images = { maxCount: 5 };
  A.CAP.sample = async (prompt, opt) => {
    running++; maxRun = Math.max(maxRun, running); calls.push({ n: opt.images.length, tier: opt.modelTier });
    await new Promise(r => setTimeout(r, 20)); running--;
    opt.onText && opt.onText({ text: "x", delta: "x" });
    return { text: opt.images.map(b => b.name).join("\n=====\n") };
  };
  const img = name => Object.assign(new Blob(["x"]), { name });
  const r = await A.ocrImages([img("A"), () => Promise.resolve(null), img("C"), img("D"), () => Promise.resolve(img("E"))], null);
  assert.equal(JSON.stringify(r.texts), JSON.stringify(["A", "", "C", "D", "E"]));
  assert.equal(maxRun, 2);
  assert.equal(JSON.stringify(calls.map(c => c.n).sort()), JSON.stringify([2, 2]));
  assert.ok(calls.every(c => c.tier === "quick"));
  A.S().ocrThorough = true; await A.ocrImages([img("F")], null); A.S().ocrThorough = false;
  assert.equal(calls.at(-1).tier, "default");
  A.CAP.sample = null; A.CAP.images = null;
});
ok("Bildungspläne: Realschule Bayern Klasse 7 bekommt die Fachlehrpläne der 7. Jahrgangsstufe", () => {
  const p = {track:"schule",state:"BY",type:"real",grade:7};
  const docs = A.plansForSubject(p,"Mathematik").docs;
  assert.ok(docs.length >= 2 && docs.every(d=>/Realschule/.test(d.title) && /\/realschule\/7\//.test(d.url)), docs.map(d=>d.title).join(" | "));
  assert.ok(A.plansFor(p).every(r=>r.land==="BY" && r.lo<=7 && r.hi>=7));
});
ok("Bildungspläne: Fächerliste kommt aus dem Plan, Kernfächer vorausgewählt", () => {
  const o = A.subjectOptions({track:"schule",state:"NW",type:"gym",grade:7});
  const core = o.filter(x=>x.core).map(x=>x.n);
  for (const n of ["Deutsch","Mathematik","Englisch","Erdkunde"]) assert.ok(core.includes(n), core.join(", "));
  assert.ok(o.some(x=>x.n==="Latein" && !x.core));
  assert.ok(!core.includes("Deutsch als Zweitsprache"));
});
ok("Bildungspläne: außer Kraft gesetzte Pläne fehlen, Oberstufe Hessen findet das KCGO", () => {
  const all = A.plansFor({track:"schule",state:"HE",type:"gym",grade:12});
  assert.ok(all.length > 10);
  assert.ok(A.plansForSubject({track:"schule",state:"HE",type:"gym",grade:12},"Mathematik").docs.some(d=>/KCGO/.test(d.title)));
  assert.equal(A.plansFor({track:"schule",state:"BY",type:"grund",grade:3}).length, 0);
});
ok("Bildungspläne: Fachnamen werden zusammengeführt, aber nicht verwechselt", () => {
  assert.ok(A.sameSubject("Erdkunde","Geographie"));
  assert.ok(A.sameSubject("Mathematik","Mathematik"));
  assert.ok(!A.sameSubject("Deutsch als Zweitsprache","Deutsch"));
  assert.ok(!A.sameSubject("Informatik, Mathematik, Physik (IMP)","Informatik"));
});
ok("Konten: erstes Konto übernimmt die bisherigen Daten, weitere bekommen eigenen Speicher", () => {
  assert.equal(A.currentAccount(), null);
  assert.equal(A.storageFor(null).ls, "merkwerk.v2");
  const a = A.upsertAccount({provider:"google",sub:"123",name:"Joshi"});
  assert.ok(a.created); assert.equal(a.acc.ls, "merkwerk.v2"); assert.equal(a.acc.db, "merkwerk");
  const again = A.upsertAccount({provider:"google",sub:"123",name:"Joshi P."});
  assert.ok(!again.created); assert.equal(again.acc.id, a.acc.id); assert.equal(again.acc.name, "Joshi P.");
  const b = A.upsertAccount({provider:"microsoft",sub:"abc",name:"Gast"});
  assert.ok(b.created); assert.notEqual(b.acc.ls, "merkwerk.v2"); assert.notEqual(b.acc.db, "merkwerk");
  assert.equal(A.currentAccount().id, b.acc.id);
  A.removeAccount(b.acc.id); assert.equal(A.currentAccount(), null); assert.equal(A.ACC().list.length, 1);
  A.removeAccount(a.acc.id);
});
ok("Konten: Apple-Kennung wird aus dem ID-Token gelesen", () => {
  const tok = "x."+Buffer.from(JSON.stringify({sub:"001.abc",email:"a@b.de"})).toString("base64url")+".y";
  assert.equal(A.jwtPayload(tok).sub, "001.abc");
  assert.equal(Object.keys(A.jwtPayload("kaputt")).length, 0);
});
ok("Lerninhalte: Themenliste und Links zu Erklärungen und Videos", () => {
  assert.ok(A.curatedTopics("Mathematik",{track:"schule",type:"real",grade:7}).includes("Lineare Funktionen"));
  const l = A.learnLinks("Mathematik","Lineare Funktionen",{track:"schule",grade:7});
  assert.ok(l.some(x=>x.kind==="Video" && x.url.startsWith("https://www.youtube.com/results?search_query=") && x.url.includes("Klasse%207")));
});
ok("Lerninhalte: Lernmodus wählbar, Abfrage ohne Claude gesperrt", () => {
  const off = A.genModesHTML();
  assert.ok(off.includes("Karteikarten") && off.includes("Interaktive Abfrage"));
  assert.match(off, /data-gm="quiz" disabled/); assert.doesNotMatch(off, /data-gm="cards" disabled/);
  A.CAP.sample = () => {}; const on = A.genModesHTML(); A.CAP.sample = null;
  assert.doesNotMatch(on, /data-gm="quiz" disabled/);
});
ok("KI-Server: JSON wird auch mit Text oder ```json drumherum gelesen", () => {
  assert.equal(A.aiParseJson('{"a":1}').a, 1);
  assert.equal(A.aiParseJson('```json\n{"cards":[1,2]}\n```').cards.length, 2);
  assert.equal(A.aiParseJson('Hier ist das Ergebnis: [{"x":"y"}] Fertig.')[0].x, "y");
  assert.throws(() => A.aiParseJson("kein JSON"), e => e.code === "invalid_json");
});
okAsync("KI-Server: Anfrage mit Anmeldung, Fortschritt, Ergebnis und Tageslimit", async () => {
  Object.assign(A.AI_CONFIG, { url: "https://beispiel.supabase.co/", anonKey: "anon" });
  store["merkwerk.ki.einwilligung"] = "true";
  const calls = [];
  const enc = new TextEncoder();
  const ndjson = lines => new Response(new ReadableStream({ start(c) { for (const l of lines) c.enqueue(enc.encode(JSON.stringify(l) + "\n")); c.close(); } }));
  let mode = "ok";
  A.setFetch(async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith("/auth/v1/signup")) return new Response(JSON.stringify({ access_token: "t1", refresh_token: "r1", expires_in: 3600 }));
    if (mode === "limit") return new Response(JSON.stringify({ code: "daily_limit", message: "nutzer" }), { status: 429 });
    return ndjson([{ t: "text", text: '{"a"' }, { t: "done", text: '{"answer":42}', rest: 7 }]);
  });
  const sample = A.remoteSample();
  const seen = [];
  const r = await sample.json("Frage", { modelTier: "quick", onText: u => seen.push(u.text) });
  assert.equal(r.answer, 42); assert.equal(A.CAP.aiRest, 7); assert.deepEqual(seen, ['{"a"']);
  const fn = calls.find(c => c.url === "https://beispiel.supabase.co/functions/v1/merkwerk-ai");
  assert.equal(fn.init.headers.Authorization, "Bearer t1");
  assert.equal(JSON.parse(fn.init.body).tier, "quick");
  assert.equal(calls.filter(c => c.url.endsWith("/signup")).length, 1);
  await sample("Noch eine"); // Token wird wiederverwendet
  assert.equal(calls.filter(c => c.url.endsWith("/signup")).length, 1);
  mode = "limit";
  await assert.rejects(sample("zu viel"), e => e.code === "daily_limit" && /Tageslimit/.test(A.sampleErr(e)));
  Object.assign(A.AI_CONFIG, { url: "", anonKey: "" });
});
okAsync("Prompt-Caching: Erstellen, Prüfen und Karteikarten schicken denselben Material-Block", async () => {
  const set = { files:[{id:"f",name:"Beispiel",text:A.EXAMPLE_TEXT}], coverage:{}, history:[] }; set.sections = A.makeSections(set.files);
  const calls = [];
  const fake = async () => ({text:""});
  fake.json = async (p, o) => { calls.push({p, o}); return calls.length===1 ? {questions:A.EXAMPLE_QUESTIONS} : {checks:[]}; };
  A.CAP.sample = fake; A.CAP.remote = true;
  await A.generateQuestions(set, {n:15});
  const [gen, chk] = calls;
  assert.ok(gen.o.material && gen.o.material.length > 1000, "Material als eigener Block");
  assert.equal(chk.o.material, gen.o.material, "Prüfung nutzt denselben Block");
  assert.ok(!gen.p.includes(set.sections[0].text) && !chk.p.includes(set.sections[0].text), "Material nicht doppelt in der Anweisung");
  assert.equal(A.buildCardPrompt(set, 10).material, gen.o.material, "Karteikarten nutzen denselben Block");
  // claude.ai: Material wie bisher am Ende der Anfrage
  A.CAP.remote = false; calls.length = 0;
  await A.generateQuestions(set, {n:15});
  assert.ok(calls[0].p.endsWith(gen.o.material) && calls[0].p.includes("\n\nMATERIAL\n") && !calls[0].o.material);
  A.CAP.sample = null;
});
ok("Probeklausur: Notenschätzung nach Notenpunkten", () => {
  assert.equal(A.notenpunkte(100), 15); assert.equal(A.notenpunkte(95), 15); assert.equal(A.notenpunkte(94), 14);
  assert.equal(A.notenpunkte(50), 6); assert.equal(A.notenpunkte(19), 0);
  assert.deepEqual([15,14,13,12,10,7,4,3,1,0].map(A.noteFromNP), ["1+","1","1-","2+","2-","3-","4-","5+","5-","6"]);
  assert.equal(A.gradeEstimate(72,{track:"schule",grade:12}).sub, "10 Notenpunkte");
  assert.equal(A.gradeEstimate(72,{track:"schule",grade:8}).main, "2-");
  assert.equal(A.gradeEstimate(72,{track:"uni"}).main, "2,7");
  assert.equal(A.examPoints(45), 35); assert.equal(A.examPoints(0), 40);
});
ok("Probeklausur: Aufgaben brauchen einen wörtlichen Beleg aus dem Material", () => {
  const set = { id:"s1", name:"Photosynthese", files:[{id:"f",name:"Beispiel",text:A.EXAMPLE_TEXT}] }; set.sections = A.makeSections(set.files);
  const quote = A.EXAMPLE_QUESTIONS[0].quote;
  const t = A.validateExamTask([set], { prompt:"Erkläre …", points:"6", afb:"II", expectation:"…", key_points:["a"], quote, set:1 });
  assert.ok(t); assert.equal(t.points, 6); assert.equal(t.setId, "s1"); assert.equal(t.fileName, "Beispiel");
  assert.equal(A.validateExamTask([set], { prompt:"Erkläre …", points:6, expectation:"…", quote:"Dieser Satz steht nirgends im Material und ist erfunden." }), null);
});
okAsync("Probeklausur: Korrektur zählt Punkte, leere Antworten ohne Claude mit 0", async () => {
  const ex = { subject:"Bio", tasks:[{id:"a",nr:1,prompt:"x",points:4,afb:"I",expectation:"e",key_points:[],quote:"q"},{id:"b",nr:2,prompt:"y",points:6,afb:"II",expectation:"e",key_points:[],quote:"q"}], answers:{a:"meine Antwort", b:"  "} };
  let prompt = "";
  A.CAP.sample = { json: async p => { prompt = p; return { aufgaben:[{nr:1,punkte:3.7},{nr:2,punkte:6}], gesamt:"gut" }; } };
  const g = await A.gradeExam(ex); A.CAP.sample = null;
  assert.ok(prompt.includes("AUFGABE 1") && !prompt.includes("AUFGABE 2"));
  assert.equal(g.tasks.a.points, 3.5); assert.equal(g.tasks.b.points, 0);
  assert.equal(g.got, 3.5); assert.equal(g.max, 10); assert.equal(g.pct, 35); assert.equal(g.overall, "gut");
});
ok("Warum ist das falsch?: Erklärung bekommt Frage, falsche Antwort und Beleg", () => {
  const set = { files:[{id:"f",name:"Beispiel",text:A.EXAMPLE_TEXT}] }; set.sections = A.makeSections(set.files);
  const q = { type:"mc", prompt:"Wo?", options:["A","B","C","D"], answer:2, quote:"Zitat", sections:[set.sections[0].id] };
  const res = { correct:false, given:1 };
  assert.equal(A.givenText(q,res), "B");
  const p = A.whyPrompt(set,q,res,[],"");
  assert.ok(p.includes("Richtige Antwort: C") && p.includes("Antwort des Lernenden: B") && p.includes("Merke:"));
  assert.ok(p.includes(set.sections[0].text.slice(0,50)));
  const p2 = A.whyPrompt(set,q,res,[{q:null,a:"Weil …"}],"Und warum nicht A?");
  assert.ok(p2.includes("Du: Weil …") && p2.includes("Und warum nicht A?"));
});
// ---------------- Audio & Podcast ----------------
const FX = await import("./audio-fixture.mjs");
const audioSet = () => { const set = { id:"set_audio", name:"Geld", files:FX.DOCS.map((d,i)=>({id:"f"+i,name:d.name,text:d.text})) }; set.sections = A.makeSections(set.files); return set; };
const exampleSet = () => { const set = { id:"set_ex", name:"Beispiel", example:true, files:[{id:"f_ex",name:"Beispieltext Photosynthese",text:A.EXAMPLE_TEXT}] }; set.sections = A.makeSections(set.files); return set; };
const fakeSample = (state={}) => { const f = async () => ({text:""}); f.json = async (p) => FX.fakeClaude(p, state); return f; };
ok("Audio: Dokumentenstand erkennt geänderte Dateien, Zahlen werden einheitlich gelesen", () => {
  const s = audioSet(); const h = A.materialHash(s);
  assert.equal(h, A.materialHash(audioSet()));
  s.files[1].text += " Neu."; assert.notEqual(h, A.materialHash(s));
  assert.deepEqual([...A.numbersOf("6 CO2 + 6 H2O → C6H12O6, 1.000 Euro, 2,5 % im Jahr 1848.")], ["6","6","1000","2.5","1848"]);
});
ok("Audio: Beispiel-Einheiten sind belegt, beide Beispielskripte decken dieselbe Grundlage ohne Zusätze ab", () => {
  const set = exampleSet();
  const units = A.EXAMPLE_UNITS.einheiten.map(u => A.validateUnit(set, u));
  assert.ok(units.every(Boolean), "jede Beispiel-Einheit hat einen wörtlichen Beleg");
  const m = A.mergeUnits([{themen:A.EXAMPLE_UNITS.themen, units}]);
  const ids = A.selectBasis(m.units, "standard");
  assert.equal(ids.length, 14);
  for (const fmt of ["monolog","podcast"]) {
    const segs = A.cleanSegments(A.EXAMPLE_SCRIPTS[fmt].segmente, fmt);
    const r = A.localCheck({units:m.units}, ids, segs);
    assert.equal(r.problems.length, 0, fmt+": "+JSON.stringify(r.problems)); assert.equal(r.covered, 14);
  }
  const cov = fmt => new Set(A.cleanSegments(A.EXAMPLE_SCRIPTS[fmt].segmente, fmt).filter(s=>s.teil==="haupt").flatMap(s=>s.einheiten));
  assert.deepEqual([...cov("monolog")].sort(), [...cov("podcast")].sort());
});
okAsync("Audio: Einheiten aus zwei Dokumenten – unbelegte Zitate und falsche Zahlen fallen weg", async () => {
  const set = audioSet(); A.CAP.sample = fakeSample(); A.CAP.remote = false;
  const u = await A.buildUnits(set);
  assert.equal(u.dropped, 2);
  assert.deepEqual([...u.themen], ["Inflation","Geldpolitik"]);
  assert.deepEqual([...u.units.map(x=>x.id+":"+x.fileName.split(".")[0])], ["E1:Inflation","E2:Inflation","E3:Inflation","E4:Geldpolitik","E5:Geldpolitik","E6:Geldpolitik"]);
  assert.ok(!u.units.some(x=>/Gelddrucken|3 Prozent/.test(x.aussage)));
  assert.deepEqual([...A.selectBasis(u.units,"kurz")], ["E1","E2","E5"]);
  assert.deepEqual([...A.selectBasis(u.units,"standard")], ["E1","E2","E3","E5","E6"]);
  assert.equal(A.selectBasis(u.units,"ausfuehrlich").length, 6);
  A.CAP.sample = null;
});
ok("Audio: großes Material wird in Pakete geteilt statt abgeschnitten", () => {
  const set = { files:[{id:"f",name:"lang",text:Array.from({length:400},(_,i)=>"Absatz "+i+" "+"x".repeat(600)).join("\n\n")}] }; set.sections = A.makeSections(set.files);
  const ch = A.unitChunks(set);
  assert.ok(ch.length >= 3); assert.equal(ch.flat().length, set.sections.length);
  assert.ok(ch.every(c => c.reduce((a,s)=>a+s.text.length,0) <= 100000));
});
ok("Audio: lokale Prüfung findet fehlende Einheiten und fremde Zahlen", () => {
  const meta = { units:[{id:"E1",aussage:"Ziel sind 2 Prozent.",zitat:"2 Prozent"},{id:"E2",aussage:"Kredite werden teurer.",zitat:"teurer"}] };
  const segs = A.cleanSegments([{teil:"haupt",text:"Ziel sind 3 Prozent.",einheiten:["E1","E9"]},{teil:"abschluss",text:"Kredite werden teurer.",einheiten:["E2"]}], "monolog");
  const r = A.localCheck(meta, ["E1","E2"], segs);
  assert.deepEqual([...r.problems.map(p=>p.art)].sort(), ["erfunden","fehlend"]);
  assert.equal(r.problems.find(p=>p.art==="fehlend").einheit, "E2", "Abschluss zählt nicht als Abdeckung");
  assert.deepEqual([...segs[0].einheiten], ["E1"], "Verweis auf fremde Einheit entfernt");
});
ok("Audio: Korrekturen ersetzen und fügen an der richtigen Stelle ein", () => {
  const segs = ["a","b","c"].map(t=>({teil:"haupt",text:t,einheiten:[]}));
  const out = A.applyRepairs(segs, [{nach:-1,neu:[{text:"0"}]},{segment:1,neu:[{text:"B1"},{text:"B2"}]},{nach:2,neu:[{text:"d"}]},{segment:0,neu:[]}], "monolog");
  assert.deepEqual([...out.map(s=>s.text)], ["0","B1","B2","c","d"]);
});
okAsync("Audio: Prüfung korrigiert beanstandete Stellen und prüft erneut", async () => {
  const set = audioSet(); const state = {}; A.CAP.sample = fakeSample(state);
  const u = await A.buildUnits(set); const meta = {units:u.units}; const ids = A.selectBasis(u.units,"standard");
  const sc = {titel:"x", segments:A.cleanSegments(FX.MONOLOG_RESPONSE.segmente,"monolog")};
  const r = await A.checkAndRepair(set, meta, ids, sc, "monolog", "de");
  assert.ok(r.check.ok, JSON.stringify(r.check.problems)); assert.equal(r.check.rounds, 1); assert.ok(r.check.semantic);
  assert.equal(state.repairs, 1); assert.equal(state.checks, 2);
  assert.match(r.segments[2].text, /2 Prozent/);
  // Bleibt ein Problem bestehen, wird das Ergebnis nicht als geprüft ausgegeben
  const stubborn = async () => ({text:""}); stubborn.json = async p => p.includes("Du prüfst") ? {probleme:[{segment:1,art:"erfunden",detail:"Beispiel nicht im Material"}]} : {korrekturen:[]};
  A.CAP.sample = stubborn;
  const r2 = await A.checkAndRepair(set, meta, ids, {segments:A.cleanSegments(FX.PODCAST_RESPONSE.segmente,"podcast")}, "podcast", "de");
  assert.equal(r2.check.ok, false); assert.equal(r2.check.rounds, 2); assert.equal(r2.check.problems[0].art, "erfunden");
  // Fällt die inhaltliche Prüfung aus, steht das im Ergebnis
  const down = async () => ({text:""}); down.json = async () => { throw {code:"overloaded"}; };
  A.CAP.sample = down;
  const r3 = await A.checkAndRepair(set, meta, ids, {segments:A.cleanSegments(FX.PODCAST_RESPONSE.segmente,"podcast")}, "podcast", "de");
  assert.equal(r3.check.semantic, false); assert.ok(r3.check.ok);
  A.CAP.sample = null;
});
ok("Audio: Skript-Anweisung enthält nur die Grundlage und verbietet Zusätze", () => {
  const meta = {units:[{id:"E1",thema:"T",rang:1,aussage:"A1",zitat:"Z1"},{id:"E2",thema:"T",rang:3,aussage:"A2",zitat:"Z2"}]};
  const p = A.scriptPrompt(meta, ["E1"], "podcast", "de");
  assert.ok(p.includes("E1 [T · Rang 1] A1") && !p.includes("A2"));
  assert.ok(p.includes("Moderatorin") && p.includes("Experte") && p.includes("Keine fachliche Aussage, die nicht durch eine Einheit gedeckt ist"));
  assert.ok(A.scriptPrompt(meta, ["E1"], "monolog", "en").includes("Sprache: Englisch"));
});
ok("Audio: Sprachausgabe in passende Teile, Pausen und Rollen", () => {
  const long = Array.from({length:30},(_,i)=>`Das ist Satz Nummer ${i} mit etwas Inhalt.`).join(" ");
  const parts = A.splitSpeech(long, 300);
  assert.ok(parts.length > 1 && parts.every(p=>p.length<=300)); assert.equal(parts.join(" "), long);
  assert.ok(A.splitSpeech("x".repeat(2000), 900).every(p=>p.length<=900));
  const segs = A.cleanSegments(FX.PODCAST_RESPONSE.segmente,"podcast");
  const plan = A.ttsPlan(segs,"podcast");
  assert.deepEqual([...new Set(plan.map(p=>p.role))].sort(), ["experte","moderation"]);
  assert.equal(plan.at(-1).gap, 0); assert.equal(plan[0].gap, 750, "Pause nach der Einleitung");
  assert.equal(plan[1].gap, 300, "Sprecherwechsel");
  assert.ok(A.ttsPlan(A.cleanSegments(FX.MONOLOG_RESPONSE.segmente,"monolog"),"monolog").every(p=>p.role==="erzaehler"));
  const b = A.ttsBatches(Array.from({length:30},()=>({text:"y".repeat(400)})));
  assert.ok(b.every(x=>x.length<=12 && x.reduce((a,p)=>a+p.text.length,0)<=4500)); assert.equal(b.flat().length, 30);
});
ok("Audio: Stille kürzen, Lautstärke angleichen, Teile ohne Überlappung zusammensetzen, WAV schreiben", () => {
  const rate = 1000;
  const tone = (n,amp) => Float32Array.from({length:n},(_,i)=>amp*Math.sin(i/3));
  const x = new Float32Array(1000); x.set(tone(400,0.5),300);
  const t = A.trimSilence(x, rate); assert.ok(t.length >= 400 && t.length <= 400+2*60+4, String(t.length));
  const loud = A.normalizeGain(tone(500,0.9)), quiet = A.normalizeGain(tone(500,0.05));
  const rms = y => Math.sqrt(y.reduce((a,v)=>a+v*v,0)/y.length);
  assert.ok(Math.abs(rms(loud)-rms(quiet)) < 0.01, "gleiche Lautheit");
  assert.ok(Math.max(...loud.map(Math.abs)) <= 0.97);
  const r = A.assemblePcm([{pcm:tone(100,0.5),gap:200},{pcm:tone(50,0.5),gap:0}], rate);
  assert.deepEqual([...r.starts], [0, 0.3]); assert.equal(r.pcm.length, 350); assert.ok(Math.abs(r.duration-0.35)<1e-9);
  assert.ok(r.pcm.slice(100,300).every(v=>v===0), "Pause ist still");
  const wav = A.encodeWav(r.pcm, 24000);
  assert.equal(String.fromCharCode(...wav.slice(0,4)), "RIFF"); assert.equal(wav.length, 44+350*2);
});
okAsync("Audio: Ablauf speichert Grundlage und Skripte, Formatwechsel nutzt dieselbe Grundlage, Änderung am Material wird erkannt", async () => {
  const set = audioSet(); const state = {}; A.CAP.sample = fakeSample(state);
  Object.assign(A.AI_CONFIG, { url:"", anonKey:"" }); // keine Sprachausgabe eingerichtet
  const steps = []; const step = i => steps.push(i);
  let r = await A.audPipeline(set, {len:"standard",fmt:"monolog",lang:"de"}, {step});
  assert.equal(r.noAudio, "no_server", "ohne Server: Skript fertig, keine vorgetäuschte Audiodatei");
  assert.deepEqual([...new Set(steps)], [0,1,2,3]);
  let meta = await A.audMeta(set.id);
  assert.equal(meta.hash, A.materialHash(set)); assert.equal(meta.units.length, 6);
  assert.ok(meta.variants.standard.scripts["monolog|de"].check.ok);
  assert.deepEqual(Object.keys(meta.variants.standard.audio), []);
  // Wechsel zum Podcast: keine neue Analyse, gleiche Grundlage
  r = await A.audPipeline(set, {len:"standard",fmt:"podcast",lang:"de"}, {step});
  meta = await A.audMeta(set.id);
  assert.equal(state.units, 1); assert.equal(state.podcast, 1);
  const cov = k => [...new Set(meta.variants.standard.scripts[k].segments.filter(s=>s.teil==="haupt").flatMap(s=>s.einheiten))].sort();
  assert.deepEqual(cov("monolog|de"), cov("podcast|de"));
  assert.deepEqual(cov("podcast|de"), [...meta.variants.standard.unitIds].sort());
  // Erneut öffnen: nichts wird neu erzeugt
  await A.audPipeline(set, {len:"standard",fmt:"monolog",lang:"de"}, {step});
  assert.equal(state.monolog, 1); assert.equal(state.units, 1);
  // Material geändert → neue Analyse
  set.files[0].text += "\n\nNeuer Absatz."; set.sections = A.makeSections(set.files);
  await A.audPipeline(set, {len:"standard",fmt:"monolog",lang:"de"}, {step});
  assert.equal(state.units, 2); assert.equal(state.monolog, 2);
  await A.audDeleteSet(set.id); assert.equal(await A.audMeta(set.id), null);
  A.CAP.sample = null;
});
okAsync("Audio: mehrfaches Klicken startet keinen zweiten Auftrag", async () => {
  const set = audioSet(); set.id = "set_dbl"; const state = {}; A.CAP.sample = fakeSample(state);
  const j1 = A.audStart(set, {len:"kurz",fmt:"monolog",lang:"de"});
  const j2 = A.audStart(set, {len:"kurz",fmt:"monolog",lang:"de"});
  assert.equal(j1, j2); await j1.promise;
  assert.equal(state.units, 1); assert.equal(j1.running, false); assert.equal(j1.error, null);
  assert.notEqual(A.audStart(set, {len:"kurz",fmt:"monolog",lang:"de"}), j1, "nach dem Ende ist ein neuer Auftrag möglich");
  await A.audDeleteSet(set.id); A.CAP.sample = null;
});
okAsync("Audio: Beispiel funktioniert ohne Claude", async () => {
  const set = exampleSet(); A.CAP.sample = null;
  const r = await A.audPipeline(set, {len:"standard",fmt:"podcast",lang:"de"}, {step:()=>{}});
  const sc = r.meta.variants.standard.scripts["podcast|de"];
  assert.ok(sc.check.ok); assert.equal(sc.check.semantic, false); assert.equal(sc.check.total, 14);
  assert.ok(A.transcriptText(sc,"podcast","T").includes("Moderatorin: Hallo"));
  await A.audDeleteSet(set.id);
});
okAsync("Audio: Sprachausgabe-Server – Prüfung, Teile, Stimmen, Tageslimit", async () => {
  Object.assign(A.AI_CONFIG, { url:"https://beispiel.supabase.co", anonKey:"anon" });
  const calls = []; let mode = "ok";
  A.setFetch(async (url, init) => {
    if (url.endsWith("/auth/v1/signup")) return new Response(JSON.stringify({access_token:"t1",refresh_token:"r1",expires_in:3600}));
    const body = JSON.parse(init.body); calls.push(body);
    assert.equal(init.headers.Authorization, "Bearer t1");
    if (mode === "unset") return new Response(JSON.stringify({code:"tts_not_configured"}), {status:503});
    if (body.probe) return new Response(JSON.stringify({ok:true,provider:"google",label:"Google Cloud Text-to-Speech"}));
    if (mode === "limit") return new Response(JSON.stringify({code:"daily_limit",message:"zeichen"}), {status:429});
    return new Response(JSON.stringify({audio:body.segments.map(s=>({mime:"audio/mpeg",data:btoa(s.role)})),voices:{experte:"de-DE-Chirp3-HD-Charon",moderation:"de-DE-Chirp3-HD-Aoede"},provider:"google",rest:1234}));
  });
  const st = await A.ttsStatus(true); assert.ok(st.ok); assert.equal(st.provider, "google");
  const plan = A.ttsPlan(A.cleanSegments(FX.PODCAST_RESPONSE.segmente,"podcast"),"podcast");
  const prog = [];
  const r = await A.synthesize(plan, "de", {onProgress:(d,n)=>prog.push(d+"/"+n)});
  assert.equal(r.clips.length, plan.length);
  assert.ok(r.clips.every((c,i)=>new TextDecoder().decode(c.bytes)===plan[i].role), "Reihenfolge der Teile bleibt");
  assert.equal(prog.at(-1), plan.length+"/"+plan.length); assert.equal(r.voices.experte, "de-DE-Chirp3-HD-Charon"); assert.equal(A.TTS.rest, 1234);
  assert.ok(calls.filter(c=>!c.probe).every(c=>c.lang==="de"));
  mode = "limit";
  await assert.rejects(A.synthesize(plan, "de"), e => e.code==="daily_limit" && /Tageslimit für die Sprachausgabe/.test(A.audErr(e)));
  mode = "unset";
  const st2 = await A.ttsStatus(true); assert.equal(st2.ok, false); assert.equal(st2.reason, "tts_not_configured");
  Object.assign(A.AI_CONFIG, { url:"", anonKey:"" });
});
await chain;
console.log(`\n${n} Prüfungen bestanden`);
