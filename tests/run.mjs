// Prüft reine Logik ohne Browser: Beispielzitate, Karteikarten, Abschnitte, Lernplan, ICS-Import, Stundenraster, GoodNotes.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import vm from "node:vm";
import { deflateRawSync } from "node:zlib";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const files = ["02_data.js","02b_plans.js","03_example.js","03b_account.js","04_core.js","04b_handwriting.js","05_learn.js","05b_cards.js","05c_generate.js","07_timetable.js","08_due.js","09_calendar.js"];
const store = {};
const ctx = { console, atob, Intl, Date, Math, JSON, Set, Map, Promise, setTimeout, clearTimeout, Blob, Response, DecompressionStream, TextDecoder,
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}}, document:{querySelector:()=>null,querySelectorAll:()=>[]}, window:{} };
vm.createContext(ctx);
// Bildungsplan-Daten wie im Browser als window.PLAN_DB
vm.runInContext(readFileSync(join(src,"..","data","bildungsplaene.js"),"utf8"), ctx);
vm.runInContext(files.map(f=>readFileSync(join(src,f),"utf8")).join("\n") + `
;globalThis.__api={EXAMPLE_TEXT,EXAMPLE_QUESTIONS,EXAMPLE_CARDS,relax,extractCardsLocal,validateCard,fcStart,fcAssign,fcResult,verifyQuestions,CAP,clozeMatch,judgeNearBlanks,makeSections,buildPlan,isoDate,parseIcsTimetable,deriveSlots,mixFor,subjectsFor,buildCalEvents,readGoodnotes,goodnotesSearchText,S:()=>S,plansFor,planSubjects,plansForSubject,subjectOptions,sameSubject,upsertAccount,currentAccount,storageFor,removeAccount,jwtPayload,curatedTopics,learnLinks,ACC:()=>ACC};`, ctx);
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
await chain;
console.log(`\n${n} Prüfungen bestanden`);
