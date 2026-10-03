/* ===================== Start (als letzte Datei, damit alle Ansichten definiert sind) ===================== */
$$(".tab").forEach(t=>t.onclick=()=>go(t.dataset.v));
(async()=>{
  // Rückkehr aus dem Anmeldefenster eines Anbieters: Das Hauptfenster liest das Ergebnis, hier nichts starten
  if(window.opener&&/[#&?](code|error|id_token)=/.test(location.hash+location.search)) return;
  if(currentAccount()) await loadSets();
  go(ROUTE.v||"home");
  initCaps();
})();
