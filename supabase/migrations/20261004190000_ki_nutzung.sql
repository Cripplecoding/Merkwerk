-- Merkwerk: Zähler für die KI-Nutzung (Tageslimit pro Nutzer, pro Internetanschluss und insgesamt).
-- Nur die Edge Function merkwerk-ai greift darauf zu (mit dem service_role-Schlüssel); für Besucher der Seite ist alles gesperrt.

create table if not exists public.ki_nutzung (
  tag        date   not null,
  art        text   not null check (art in ('nutzer','ip','gesamt')),
  schluessel text   not null,          -- Nutzer-ID, Hash der IP-Adresse oder 'alle'
  anfragen   integer not null default 0,
  token_ein  bigint  not null default 0,
  token_aus  bigint  not null default 0,
  primary key (tag, art, schluessel)
);
alter table public.ki_nutzung enable row level security;   -- keine Richtlinien: anon und authenticated sehen nichts
revoke all on public.ki_nutzung from anon, authenticated;

-- Bucht eine Anfrage, wenn keines der drei Limits erreicht ist. Atomar, auch bei vielen gleichzeitigen Anfragen.
-- Liefert {ok, grund, rest} – rest = verbleibende Anfragen des Nutzers heute.
create or replace function public.ki_anfrage_buchen(p_nutzer text, p_ip text, p_limit_nutzer int, p_limit_ip int, p_limit_gesamt int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  heute date := (now() at time zone 'Europe/Berlin')::date;
  n_nutzer int; n_ip int; n_gesamt int;
begin
  insert into ki_nutzung(tag,art,schluessel) values (heute,'nutzer',p_nutzer),(heute,'ip',p_ip),(heute,'gesamt','alle')
    on conflict do nothing;
  -- Zeilen sperren, damit parallele Anfragen nacheinander zählen
  select anfragen into n_gesamt from ki_nutzung where tag=heute and art='gesamt' and schluessel='alle' for update;
  select anfragen into n_ip     from ki_nutzung where tag=heute and art='ip'     and schluessel=p_ip for update;
  select anfragen into n_nutzer from ki_nutzung where tag=heute and art='nutzer' and schluessel=p_nutzer for update;
  if n_gesamt >= p_limit_gesamt then return jsonb_build_object('ok',false,'grund','gesamt','rest',0); end if;
  if n_ip     >= p_limit_ip     then return jsonb_build_object('ok',false,'grund','ip','rest',0); end if;
  if n_nutzer >= p_limit_nutzer then return jsonb_build_object('ok',false,'grund','nutzer','rest',0); end if;
  update ki_nutzung set anfragen = anfragen + 1
    where tag=heute and ((art='nutzer' and schluessel=p_nutzer) or (art='ip' and schluessel=p_ip) or (art='gesamt' and schluessel='alle'));
  return jsonb_build_object('ok',true,'grund',null,'rest',p_limit_nutzer - n_nutzer - 1);
end $$;

-- Trägt nach der Antwort die verbrauchten Token ein (für den Überblick über die Kosten).
create or replace function public.ki_token_buchen(p_nutzer text, p_ein bigint, p_aus bigint)
returns void language sql security definer set search_path = public as $$
  update ki_nutzung set token_ein = token_ein + p_ein, token_aus = token_aus + p_aus
   where tag = (now() at time zone 'Europe/Berlin')::date
     and ((art='nutzer' and schluessel=p_nutzer) or (art='gesamt' and schluessel='alle'));
$$;

revoke all on function public.ki_anfrage_buchen(text,text,int,int,int) from public, anon, authenticated;
revoke all on function public.ki_token_buchen(text,bigint,bigint) from public, anon, authenticated;
grant execute on function public.ki_anfrage_buchen(text,text,int,int,int) to service_role;
grant execute on function public.ki_token_buchen(text,bigint,bigint) to service_role;

-- Übersicht für Joshi im Supabase-Dashboard (SQL Editor): select * from ki_tagesuebersicht;
create or replace view public.ki_tagesuebersicht with (security_invoker = true) as
  select tag, anfragen, token_ein, token_aus,
         (select count(*) from ki_nutzung n where n.tag = g.tag and n.art = 'nutzer') as nutzer
    from ki_nutzung g where art = 'gesamt' order by tag desc;
revoke all on public.ki_tagesuebersicht from anon, authenticated;
