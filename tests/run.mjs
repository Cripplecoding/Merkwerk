// Prüft reine Logik ohne Browser: Beispielzitate, Abschnitte, Lernplan, ICS-Import, Stundenraster.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import vm from "node:vm";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const files = ["02_data.js","03_example.js","04_core.js","05_learn.js","07_timetable.js","08_due.js","09_calendar.js"];
const store = {};
const ctx = { console, Intl, Date, Math, JSON, Set, Map, Promise, setTimeout, clearTimeout,
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}}, document:{querySelector:()=>null,querySelectorAll:()=>[]}, window:{} };
vm.createContext(ctx);
vm.runInContext(files.map(f=>readFileSync(join(src,f),"utf8")).join("\n") + `
;globalThis.__api={EXAMPLE_TEXT,EXAMPLE_QUESTIONS,relax,makeSections,buildPlan,isoDate,parseIcsTimetable,deriveSlots,mixFor,subjectsFor,buildCalEvents,S:()=>S};`, ctx);
const A = ctx.__api;
let n = 0; const ok = (name, fn) => { fn(); n++; console.log("✓", name); };

ok("Alle Beispielzitate stehen wörtlich im Beispieltext", () => {
  for (const q of A.EXAMPLE_QUESTIONS) assert.ok(A.relax(A.EXAMPLE_TEXT).includes(A.relax(q.quote)), q.quote);
  assert.equal(A.EXAMPLE_QUESTIONS.length, 15);
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
console.log(`\n${n} Prüfungen bestanden`);
