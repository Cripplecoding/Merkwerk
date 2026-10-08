-- Merkwerk: Zeichenzähler für die Sprachausgabe von „Audio & Podcast“ (Tageslimit pro Nutzer, pro Internetanschluss und insgesamt).
-- Nur die Edge Function merkwerk-tts greift darauf zu (mit dem geheimen Schlüssel); für Besucher der Seite ist alles gesperrt.
-- Die Sprachausgabe kostet pro Zeichen, deshalb zählt hier die Textmenge und nicht die Zahl der Anfragen.

create table if not exists public.tts_nutzung (
  tag        date   not null,
  art        text   not null check (art in ('nutzer','ip','gesamt')),
  schluessel text   not null,          -- Nutzer-ID, Hash der IP-Adresse oder 'alle'
  zeichen    bigint not null default 0,
  anfragen   integer not null default 0,
  primary key (tag, art, schluessel)
);
alter table public.tts_nutzung enable row level security;   -- keine Richtlinien: anon und authenticated sehen nichts
revoke all on public.tts_nutzung from anon, authenticated;

-- Bucht p_zeichen Zeichen, wenn keines der drei Limits überschritten würde. Atomar.
-- Negative p_zeichen geben Zeichen zurück (wenn die Sprachausgabe fehlgeschlagen ist), ohne Limitprüfung.
-- Liefert {ok, grund, rest} – rest = Zeichen, die der Nutzer heute noch hat.
create or replace function public.tts_zeichen_buchen(p_nutzer text, p_ip text, p_zeichen int, p_limit_nutzer int, p_limit_ip int, p_limit_gesamt int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  heute date := (now() at time zone 'Europe/Berlin')::date;
  n_nutzer bigint; n_ip bigint; n_gesamt bigint;
begin
  insert into tts_nutzung(tag,art,schluessel) values (heute,'nutzer',p_nutzer),(heute,'ip',p_ip),(heute,'gesamt','alle')
    on conflict do nothing;
  select zeichen into n_gesamt from tts_nutzung where tag=heute and art='gesamt' and schluessel='alle' for update;
  select zeichen into n_ip     from tts_nutzung where tag=heute and art='ip'     and schluessel=p_ip for update;
  select zeichen into n_nutzer from tts_nutzung where tag=heute and art='nutzer' and schluessel=p_nutzer for update;
  if p_zeichen > 0 then
    if n_gesamt + p_zeichen > p_limit_gesamt then return jsonb_build_object('ok',false,'grund','gesamt','rest',0); end if;
    if n_ip     + p_zeichen > p_limit_ip     then return jsonb_build_object('ok',false,'grund','ip','rest',0); end if;
    if n_nutzer + p_zeichen > p_limit_nutzer then return jsonb_build_object('ok',false,'grund','nutzer','rest',greatest(0,p_limit_nutzer-n_nutzer)); end if;
  end if;
  update tts_nutzung set zeichen = greatest(0, zeichen + p_zeichen), anfragen = anfragen + (case when p_zeichen > 0 then 1 else 0 end)
    where tag=heute and ((art='nutzer' and schluessel=p_nutzer) or (art='ip' and schluessel=p_ip) or (art='gesamt' and schluessel='alle'));
  return jsonb_build_object('ok',true,'grund',null,'rest',greatest(0,p_limit_nutzer - n_nutzer - p_zeichen));
end $$;

revoke all on function public.tts_zeichen_buchen(text,text,int,int,int,int) from public, anon, authenticated;
grant execute on function public.tts_zeichen_buchen(text,text,int,int,int,int) to service_role;

-- Übersicht im Supabase-Dashboard (SQL Editor): select * from tts_tagesuebersicht;
-- Kosten grob: Google „Chirp 3: HD“ 30 US$ je 1 Mio. Zeichen (die erste Million pro Monat ist frei).
create or replace view public.tts_tagesuebersicht with (security_invoker = true) as
  select tag, zeichen, anfragen,
         (select count(*) from tts_nutzung n where n.tag = g.tag and n.art = 'nutzer') as nutzer
    from tts_nutzung g where art = 'gesamt' order by tag desc;
revoke all on public.tts_tagesuebersicht from anon, authenticated;
