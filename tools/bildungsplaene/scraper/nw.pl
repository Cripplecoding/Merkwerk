use utf8; require "./lib.pl"; our $S;
my $N="https://lehrplannavigator.nrw.de";
my $INST='Ministerium für Schule und Bildung NRW / QUA-LiS NRW (Lehrplannavigator)';
open my $out,'>:utf8',"$S/rows/NW.tsv"; my $n=0;
my %SA=('sekundarstufe-i/realschule'=>['Realschule','Klassen 5-10'],'sekundarstufe-i/gesamtschule'=>['Gesamtschule (auch Sekundarschule)','Klassen 5-10'],'sekundarstufe-i/hauptschule'=>['Hauptschule','Klassen 5-10'],
 'sekundarstufe-i/kernlehrplaene-fuer-das-gymnasium-ab-sj-20192020'=>['Gymnasium (Sekundarstufe I, G9)','Klassen 5-10'],
 'sekundarstufe-ii/kernlehrplaene-fuer-die-gymnasiale-oberstufe-ab-sj-2013'=>['Gymnasiale Oberstufe','Klassen 11-13'],
 'sekundarstufe-ii/kernlehrplaene-fuer-die-gymnasiale-oberstufe-ab-sj-20222023'=>['Gymnasiale Oberstufe','Klassen 11-13'],
 'sekundarstufe-ii/kernlehrplaene-fuer-die-gymnasiale-oberstufe-ab-sj-20272028'=>['Gymnasiale Oberstufe','Klassen 11-13'],
 'weiterbildungskolleg/kernlehrplaene-fuer-das-abendgymnasium-kolleg'=>['Weiterbildungskolleg (Abendgymnasium, Kolleg)','Sekundarstufe II'],
 'weiterbildungskolleg/kernlehrplaene-fuer-das-abendgymnasium-kolleg-neue-klp'=>['Weiterbildungskolleg (Abendgymnasium, Kolleg)','Sekundarstufe II'],
 'weiterbildungskolleg/kernlehrplaene-fuer-das-abendgymnasium-kolleg-ab-20222023'=>['Weiterbildungskolleg (Abendgymnasium, Kolleg)','Sekundarstufe II'],
 'weiterbildungskolleg/kernlehrplaene-fuer-die-abendrealschule'=>['Weiterbildungskolleg (Abendrealschule)','Sekundarstufe I']);
my %pages;
for my $nav ("$N/lehrplannavigator-sekundarstufe-i-richtlinien-und-kernlehrplaene","$N/lehrplannavigator-sekundarstufe-ii-richtlinien-und-kernlehrplaene","$N/lehrplannavigator-weiterbildungskolleg-richtlinien-und-kernlehrplaene"){
  for my $l (links($nav)){ my $h=$l->[0]=~s/#.*//r; next unless $h=~m{nrw\.de/((?:sekundarstufe-ii?|weiterbildungskolleg)/[^/]+)/[^/]+$}; my $k=$1; next unless $SA{$k}; $pages{$h}//={k=>$k,t=>$l->[1]} } }
my (@items,%newer);
for my $p (sort keys %pages){ my $k=$pages{$p}{k}; my $html=get($p); my $h1=h1($html); $h1=~s/\s+/ /g;
  my ($sa,$st)=@{$SA{$k}};
  my $fach=$h1; $fach=~s/\s*\((?:NEU )?(?:ab|in|aufsteigend)[^)]*\)//gi; $fach=~s/\s+(Gesamtschule|Realschule|Hauptschule|Gymnasium|Gymnasiale Oberstufe|Abendgymnasium.*|Kolleg|Abendrealschule|WbK|Weiterbildungskolleg).*$//i; $fach=~s/\s*\(.*$//; $fach=~s/\s+$//; $fach||=$pages{$p}{t};
  my ($neu)= "$h1 $p"=~/(?:neu-ab-|NEU ab (?:SJ )?)(\d{4})\/?(\d{2,4})?/i; my $ver = $k=~/(20\d\d)(\d\d\d\d)?$/ ? $1 : $neu ? $neu : '';
  my %s; for my $l (links($p,html=>$html)){ my ($h,$t,$ti,$cx,$hd)=@$l; next unless $h=~/\.pdf$/i; next if $s{$h}++;
    next unless "$t $hd"=~/^\s*(Kernlehrplan|Lehrplan|Richtlinien)/i || $hd=~/^(Kernlehrplan|Lehrplan|Richtlinien)/i;
    next if $t=~/Aufgabenbeispiel|Präsentation|Material|Beiträge|Integration|Implementation|Synopse|Übersicht/i;
    push @items,{p=>$p,k=>$k,sa=>$sa,st=>$st,fach=>$fach,h1=>$h1,url=>$h,t=>$t,ver=>$ver,neu=>$neu};
    $newer{"$sa|$fach"}{$ver||0}=1; } }
for my $it (@items){ my ($sa,$fach,$ver,$k)=@$it{qw(sa fach ver k)}; my @vs=sort { $a<=>$b } keys %{$newer{"$sa|$fach"}}; my $max=$vs[-1]; my @gt=grep { $_ > ($ver||0) && $_<=2026 } @vs;
  my $gl;
  if($it->{p}=~/archiv/i || $it->{url}=~/archiv/i){ $gl='[außer Kraft] im Kernlehrplan-Archiv des Lehrplannavigators geführt (G8- bzw. abgelöste Fassung)' }
  elsif($it->{p}=~/20212022-fuer-kl-5-20222023-fuer-kl-6/){ $gl='[außer Kraft] Übergangsfassung nur für 2021/22 (Klasse 5) und 2022/23 (Klasse 6)' }
  elsif($k=~/20272028$/ || ($ver && $ver>2026)){ $gl="[in Kraft ab Schuljahr 2027/28] Kernlehrplan veröffentlicht, gilt beginnend mit der Einführungsphase ab 2027/28" }
  elsif($sa eq 'Gymnasiale Oberstufe' && @gt){ $gl="[außer Kraft] durch Kernlehrplan ab ".$gt[0]."/".($gt[0]+1)." ersetzt (gymnasiale Oberstufe vollständig durchlaufen)" }
  elsif(@gt){ $gl="[auslaufend gültig] bisheriger Kernlehrplan; neuer Kernlehrplan ab ".$gt[0]."/".($gt[0]+1)." aufsteigend eingeführt (gilt noch für höhere Jahrgänge)" }
  elsif($it->{neu}){ $gl="[gültig] Kernlehrplan, aufsteigend in Kraft ab Schuljahr $it->{neu}/".($it->{neu}+1) }
  elsif($k=~/gymnasium-ab-sj-20192020/){ $gl='[gültig] Kernlehrplan G9, aufsteigend in Kraft seit Schuljahr 2019/20 (Sekundarstufe I inzwischen vollständig)' }
  elsif($k=~/oberstufe-ab-sj-2013/){ $gl='[gültig] Kernlehrplan für die gymnasiale Oberstufe, in Kraft seit 2014/15 (Einführungsphase); wird ab 2027/28 schrittweise durch neue Kernlehrpläne ersetzt, sofern veröffentlicht' }
  elsif($k=~/20222023/){ $gl='[gültig] Kernlehrplan, in Kraft ab Schuljahr 2022/23' }
  else { $gl='[gültig] im Lehrplannavigator NRW als geltender Kernlehrplan geführt' }
  my ($yr)=$it->{t}=~/\((\d{4})\)/; $yr//=($it->{url}=~/_(20\d\d)_\d\d_\d\d/)[0];
  print $out row(land=>'Nordrhein-Westfalen',schulart=>$sa,stufe=>$it->{st},fach=>$fach,titel=>"$it->{t} – $it->{h1}",klassen=>($sa=~/Oberstufe/?'Einführungsphase und Qualifikationsphase (G9: Jg. 11–13, G8: Jg. 10–12)':$it->{st}=~/Klassen/?'Jahrgangsstufen 5–10':$it->{st}),stand=>($yr?"Kernlehrplan $yr":'lt. Dokument'),gueltigkeit=>$gl,institution=>$INST,quelle=>$it->{p},url=>$it->{url},typ=>'pdf',hinweis=>($sa=~/Gesamtschule/?'Kernlehrpläne der Gesamtschule gelten auch für Sekundarschule, PRIMUS-Schule und Gemeinschaftsschule':'')); $n++ }
print $out row(land=>'Nordrhein-Westfalen',schulart=>'Berufskolleg',stufe=>'Sekundarstufe II',fach=>'Übersicht Bildungspläne Berufskolleg',titel=>'Bildungspläne und Lehrpläne für das Berufskolleg in NRW (Übersicht)',klassen=>'Sekundarstufe II (Berufskolleg: Berufsschule, Berufsfachschule, Fachoberschule, Berufliches Gymnasium)',gueltigkeit=>'[gültig] Portalübersicht',institution=>'Ministerium für Schule und Bildung NRW / QUA-LiS NRW',quelle=>'https://www.berufsbildung.nrw.de/',url=>'https://www.berufsbildung.nrw.de/bildungsgaenge-und-bildungsplaene',typ=>'link',hinweis=>'Sonderfall: Berufskolleg-Bildungspläne nur als Indexeintrag'); $n++;
close $out; print scalar(keys %pages)," pages, $n rows\n";
