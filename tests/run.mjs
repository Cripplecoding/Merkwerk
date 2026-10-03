// Prüft reine Logik ohne Browser: Beispielzitate, Karteikarten, Abschnitte, Lernplan, ICS-Import, Stundenraster.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import vm from "node:vm";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const files = ["02_data.js","03_example.js","04_core.js","05_learn.js","05b_cards.js","07_timetable.js","08_due.js","09_calendar.js"];
const store = {};
const ctx = { console, Intl, Date, Math, JSON, Set, Map, Promise, setTimeout, clearTimeout,
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}}, document:{querySelector:()=>null,querySelectorAll:()=>[]}, window:{} };
vm.createContext(ctx);
vm.runInContext(files.map(f=>readFileSync(join(src,f),"utf8")).join("\n") + `
;globalThis.__api={EXAMPLE_TEXT,EXAMPLE_QUESTIONS,EXAMPLE_CARDS,relax,extractCardsLocal,validateCard,fcStart,fcAssign,fcResult,verifyQuestions,CAP,clozeMatch,judgeNearBlanks,makeSections,buildPlan,isoDate,parseIcsTimetable,deriveSlots,mixFor,subjectsFor,buildCalEvents,S:()=>S};`, ctx);
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
await chain;
console.log(`\n${n} Prüfungen bestanden`);
