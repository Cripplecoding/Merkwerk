use utf8; require "./lib.pl"; our $S;
my $BBS="https://bildungsserver.berlin-brandenburg.de";
my $BE="https://www.berlin.de/sen/bildung/unterricht/faecher-rahmenlehrplaene/rahmenlehrplaene";
open my $out,'>:utf8',"$S/rows/BE_BB.tsv"; my $n=0;
sub kl { my $t=shift; my ($a,$b)= $t=~/(\d{1,2})\s*[-–\/]\s*(\d{1,2})/; return ($a,$b) if $a; return (5,10) }
sub stf { my ($a,$b)=@_; $a=5 if $a<5; return $a==$b ? "Klasse $a" : "Klassen $a-$b" }
my $g110 = "RLP 1–10 Berlin-Brandenburg (amtliche Fassung 2015), unterrichtswirksam seit Schuljahr 2017/2018; gilt auch für den nachträglichen Erwerb der FOR/MSA";
# ---------- Sek I: Brandenburg (bildungsserver, current table)
{ my $u="$BBS/unterricht/rahmenlehrplaene/jahrgangsstufen-1-10"; my %seen;
  for my $r (trows($u)){ my @c=@{$r->{cells}}; next unless @c && @{$r->{links}}; my ($pdf)=grep { $_->[0]=~/amtliche_Fassung\/Teil_C_.*\.pdf$/ } @{$r->{links}}; next unless $pdf; next if $seen{$pdf->[0]}++;
    my $t=$c[0]; $t=~s/\s*Online\s*$//; next if $t=~/Sachunterricht/; my ($a,$b)=kl($t); next if $b<5;
    my $fach=$t; $fach=~s/\s*\(.*$//; my $ver = $t=~/\((20\d\d)\)/ ? $1 : '2015';
    my $wp = $t=~/Wahlpflicht/ ? ' (Wahlpflichtfach)' : '';
    my $newer = grep { $_->{cells}[0] && $_->{cells}[0]=~/^\Q$fach\E \(20\d\d\)/ } trows($u);
    if($ver eq '2015' && $newer){ print $out row(land=>'Brandenburg',schulart=>'Sekundarstufe I (Oberschule, Gesamtschule, Gymnasium)',stufe=>stf($a,$b),fach=>$fach,titel=>"Rahmenlehrplan 1–10, Teil C $t (Fassung 2015)",klassen=>"Jahrgangsstufen $a–$b",stand=>'amtliche Fassung 2015',gueltigkeit=>'[außer Kraft] durch aktualisierten Fachteil C (2023/2024) ersetzt',institution=>'MBJS Brandenburg / LISUM',quelle=>$u,url=>$pdf->[0],typ=>'pdf',hinweis=>'nicht heruntergeladen'); next }
    my $gl = $ver eq '2015' ? "[gültig] $g110" : "[gültig] Aktualisierung $ver des Fachteils C (Anpassung an die KMK-Bildungsstandards ESA/MSA); ersetzt den Fachteil C von 2015";
    print $out row(land=>'Brandenburg',schulart=>'Sekundarstufe I (Oberschule, Gesamtschule, Gymnasium)',stufe=>stf($a,$b),fach=>$fach.$wp,titel=>"Rahmenlehrplan Jahrgangsstufen 1–10 Berlin/Brandenburg, Teil C $t",klassen=>"Jahrgangsstufen $a–$b (Gesamtplan 1–10; Sekundarstufe I ab Jgst. 7, an Gymnasien mit Leistungsprofilklassen ab 5)",stand=>"amtliche Fassung $ver (Datei ".($pdf->[0]=~/(\d{4}_\d\d_\d\d)/?$1:'').")",gueltigkeit=>$gl,institution=>'MBJS Brandenburg / SenBJF Berlin / LISUM (Bildungsserver Berlin-Brandenburg)',quelle=>$u,url=>$pdf->[0],typ=>'pdf',hinweis=>'Gemeinsamer Rahmenlehrplan Berlin-Brandenburg; Online-Fassung: https://bildungsserver.berlin-brandenburg.de/rlp-online'); $n++; }
  for my $p (['Teil_A_2015_11_16.pdf','Teil A – Bildung und Erziehung in den Jahrgangsstufen 1–10'],['Teil_B_2015_11_10.pdf','Teil B – Fachübergreifende Kompetenzentwicklung (inkl. Basiscurricula Sprach- und Medienbildung)']){
    print $out row(land=>'Brandenburg',schulart=>'Sekundarstufe I (Oberschule, Gesamtschule, Gymnasium)',stufe=>'Klassen 5-10',fach=>'Fächerübergreifend (Teile A und B)',titel=>"Rahmenlehrplan Jahrgangsstufen 1–10 Berlin/Brandenburg, $p->[1]",klassen=>'Jahrgangsstufen 1–10',stand=>'amtliche Fassung 2015',gueltigkeit=>"[gültig] $g110",institution=>'MBJS Brandenburg / SenBJF Berlin / LISUM',quelle=>$u,url=>"$BBS/fileadmin/bbb/unterricht/rahmenlehrplaene/Rahmenlehrplanprojekt/amtliche_Fassung/$p->[0]",typ=>'pdf',hinweis=>'Gilt für alle Fächer'); $n++ }
}
# ---------- Sek I: Berlin (berlin.de list)
{ my $u="$BE/klasse-1-10/"; my %seen;
  for my $L (links($u)){ my ($h,$t)=@$L; next unless $h=~/\.pdf/i && $t=~/Jahrgangsstufen|Teil [AB]/; next if $seen{$h}++; next if $t=~/Sachunterricht/;
    my ($fach,$a,$b);
    if($t=~/^Teil ([AB])/){ $fach='Fächerübergreifend (Teile A und B)'; ($a,$b)=(1,10) } else { ($fach)=$t=~/^(.*?)\s*\(Jahrgangs/; ($a,$b)=kl($t); }
    next if $b<5; $fach=~s/\s+$//;
    if($fach=~/Deutsch als Zweitsprache/ && $h=~/Teil_C_Deutsch_2015/){ next; }
    my $wp = $t=~/Wahlpflicht/ ? ' (Wahlpflichtfach)' : '';
    my $berl = $h=~/berlin\.de/ ? 1 : 0;
    print $out row(land=>'Berlin',schulart=>'Sekundarstufe I (Integrierte Sekundarschule, Gemeinschaftsschule, Gymnasium)',stufe=>stf($a,$b),fach=>($fach=~/^Fächer/?$fach:$fach.$wp),titel=>"Rahmenlehrplan Jahrgangsstufen 1–10 Berlin/Brandenburg – $t",klassen=>"Jahrgangsstufen $a–$b",stand=>($berl?'Berliner Fassung (aktualisierter Fachteil C, Stand lt. Dokument)':'amtliche Fassung 2015'),gueltigkeit=>"[gültig] $g110".($berl?'; aktualisierter Fachteil C (Deutsch/Mathematik 2023, Moderne Fremdsprachen 2024) gemäß Senatsverwaltung':''),institution=>'Senatsverwaltung für Bildung, Jugend und Familie Berlin / LISUM',quelle=>$u,url=>$h,typ=>'pdf',hinweis=>'Gemeinsamer Rahmenlehrplan Berlin-Brandenburg (Teil C); Liste der in Berlin gültigen Fassungen laut berlin.de'); $n++; }
  my $u2="$BE/";
  for my $L (links($u2)){ my ($h,$t,$ti,$cx)=@$L; next unless $h=~/sesb|esu_1-10/i; my ($fach,$kl,$st)= $h=~/ps_sesb/ ? ('Partnersprache (SESB)','Jahrgangsstufen 1–8','Klassen 5-8') : $h=~/ms_sesb/ ? ('Muttersprache (SESB)','Jahrgangsstufen 1–10','Klassen 5-10') : ('Erstsprachenunterricht','Klassenstufen 1–10','Klassen 5-10');
    print $out row(land=>'Berlin',schulart=>'Sekundarstufe I (Integrierte Sekundarschule, Gemeinschaftsschule, Gymnasium)',stufe=>$st,fach=>$fach,titel=>"Rahmenlehrplan Teil C $fach",klassen=>$kl,stand=>($h=~/2019/?'2019':'lt. Dokument'),gueltigkeit=>'[gültig] auf berlin.de als geltender Rahmenlehrplan geführt',institution=>'Senatsverwaltung für Bildung, Jugend und Familie Berlin',quelle=>$u2,url=>$h,typ=>'pdf',hinweis=>($h=~/sesb/?'Nur für Staatliche Europa-Schulen Berlin (SESB); gilt abweichend von Teil C Deutsch/Partnersprachen':'')); $n++; }
}
# ---------- Sek II: Brandenburg GOST (table with Inkraftsetzung)
{ my $u="$BBS/curricula-gost-bb"; my %seen; my %cnt;
  my @R=grep { @{$_->{links}} && @{$_->{cells}}>=3 && $_->{cells}[2]=~/\d\d\.\d\d\.\d{4}/ } trows($u);
  $cnt{ ($_->{cells}[0]=~s/^Teil C\s*//r) }++ for @R;
  for my $r (@R){ my ($t,$art,$ik)=@{$r->{cells}}; my ($pdf)=grep { $_->[0]=~/\.pdf/i } @{$r->{links}}; next unless $pdf; next if $seen{$pdf->[0]}++;
    my $fach=$t; $fach=~s/^Teil C\s*//; $fach=~s/^Teil ([AB]) .*/Fächerübergreifend (Teile A und B)/;
    my ($d,$m,$y)=$ik=~/(\d\d)\.(\d\d)\.(\d{4})/; my $st;
    if($y>=2026 && "$y$m" gt "202608"){ $st="[in Kraft ab $ik]" } elsif($y==2026||$y==2025){ $st="[gültig ab $ik, beginnend mit der Einführungsphase (aufsteigend)]" }
    elsif($cnt{$fach}>1){ $st="[auslaufend gültig] Fassung in Kraft seit $ik; wird durch neue Fassung aufsteigend abgelöst" } else { $st="[gültig] in Kraft seit $ik" }
    $st.=" – Art: ".($art eq 'VR'?'Vorläufiger Rahmenplan (1992)':'Rahmenlehrplan')." – Stand: VV Rahmenlehrplan und curriculare Materialien i.d.F. ÄVVRLPcM vom 27.08.2024 (Amtsblatt MBJS 2024 Nr. 24 S. 382)";
    print $out row(land=>'Brandenburg',schulart=>'Gymnasiale Oberstufe (Gymnasium, Gesamtschule, Berufliches Gymnasium)',stufe=>'Klassen 11-13',fach=>$fach,titel=>"Rahmenlehrplan für die gymnasiale Oberstufe – $t",klassen=>'Einführungsphase und Qualifikationsphase (Jgst. 10/11–12/13 je nach Schulform); auch Bildungsgang zum nachträglichen Erwerb der AHR',stand=>"Inkraftsetzung $ik",gueltigkeit=>$st,institution=>'MBJS Brandenburg / LISUM (Bildungsserver Berlin-Brandenburg)',quelle=>$u,url=>$pdf->[0],typ=>'pdf',hinweis=>'Gilt für Gymnasien, berufliche Gymnasien und Gesamtschulen sowie den Bildungsgang zum nachträglichen Erwerb der allgemeinen Hochschulreife'); $n++; }
}
# ---------- Sek II: Berlin Oberstufe
{ my $u="$BE/oberstufe/"; my %seen; my @L=grep { $_->[0]=~/\.pdf/i } links($u); my %cnt;
  for (@L){ my $t=$_->[1]; next if $t eq 'Download'; (my $f=$t)=~s/\s*\(.*//; $cnt{$f}++ }
  for my $L (@L){ my ($h,$t,$ti,$cx)=@$L; (my $key=$h)=~s/\?.*//; next if $seen{$key}++;
    my ($fach,$titel);
    if($t eq 'Download'){ if($h=~/teil_a/){ $fach='Fächerübergreifend (Teile A und B)'; $titel='Teil A – Bildung und Erziehung in der gymnasialen Oberstufe' } elsif($h=~/teil_b/){ $fach='Fächerübergreifend (Teile A und B)'; $titel='Teil B – Fachübergreifende Kompetenzentwicklung' } elsif($h=~/studium_und_beruf/){ next } elsif($h=~/digitale_welten/){ $fach='Zusatzkurs Digitale Welten'; $titel='Zusatzkurs Digitale Welten' } else { $fach=$titel=$cx||'Sonstiges' } }
    else { ($fach=$t)=~s/\s*\(.*//; $titel="Teil C $t" }
    my $gl;
    if($t=~/ab (\d{4})\/(\d\d) in Klasse 11/){ $gl="[gültig ab Schuljahr $1/$2, beginnend in Klasse 11 (aufsteigend)]" }
    elsif($h=~/neu_(\d\d)-(\d\d)/){ $gl="[gültig ab Schuljahr 20$1/$2, beginnend in der Einführungsphase (aufsteigend)]" }
    elsif($fach eq "Politikwissenschaft"){ $gl="[auslaufend gültig] wird ab Schuljahr 2026/27 beginnend in Klasse 11 durch den Rahmenlehrplan Politische Bildung abgelöst" }
    elsif($cnt{$fach}>1){ $gl="[auslaufend gültig] bisherige Fassung; wird durch die neue Fassung aufsteigend abgelöst" }
    else { $gl="[gültig] auf berlin.de als geltender Rahmenlehrplan für die gymnasiale Oberstufe geführt" }
    my ($yr)=$h=~/(20\d\d)/;
    print $out row(land=>'Berlin',schulart=>'Gymnasiale Oberstufe (Gymnasium, ISS, Gemeinschaftsschule, Berufliches Gymnasium)',stufe=>'Klassen 11-13',fach=>$fach,titel=>"Rahmenlehrplan für die gymnasiale Oberstufe Berlin – $titel",klassen=>'Einführungsphase und Qualifikationsphase (Jgst. 10/11–12/13 je nach Schulform)',stand=>($yr?"lt. Datei $yr":'lt. Dokument'),gueltigkeit=>$gl,institution=>'Senatsverwaltung für Bildung, Jugend und Familie Berlin',quelle=>$u,url=>$h,typ=>'pdf',hinweis=>'Rahmenlehrplan für die gymnasiale Oberstufe (gemeinsam mit Brandenburg entwickelt, Berliner Veröffentlichung)'); $n++; }
}
# ---------- berufliche Bildung: Indexeinträge
for my $land ('Berlin','Brandenburg'){
  print $out row(land=>$land,schulart=>'Berufliche Schulen (OSZ: Berufsschule, Berufsfachschule, Fachoberschule, Berufsoberschule)',stufe=>'Sekundarstufe II',fach=>'Übersicht Bildungsgänge und Rahmenlehrpläne',titel=>'Portal Berufliche Bildung Berlin-Brandenburg – Bildungsgänge und curriculare Vorgaben',klassen=>'Sekundarstufe II (beruflich)',gueltigkeit=>'[gültig] Portalübersicht',institution=>'LISUM / Bildungsserver Berlin-Brandenburg',quelle=>"$BBS/rahmenlehrplan-berufl-bildung",url=>"$BBS/schule/portal-berufliche-bildung/bildungsgaenge",typ=>'link',hinweis=>'Sonderfall: berufliche Bildungsgänge (überwiegend KMK-Rahmenlehrpläne bzw. landesspezifische Pläne je Bildungsgang) nur als Indexeintrag; berufliches Gymnasium nutzt den RLP gymnasiale Oberstufe'); $n++; }
close $out; print "$n rows\n";
