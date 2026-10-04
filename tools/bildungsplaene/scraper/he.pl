use utf8; require "./lib.pl"; our $S;
my $F="https://kultus.hessen.de/sites/kultus.hessen.de/files/";
my $INST='Hessisches Ministerium für Kultus, Bildung und Chancen';
open my $in,'<:utf8',"$S/he_data.txt"; open my $out,'>:utf8',"$S/rows/HE.tsv"; my ($sec,$src,$n);
my $LPG='[gültig – subsidiär] Lehrpläne 2002 (239. Verordnung über Lehrpläne vom 20.12.2001, ABl. 1/02, in Kraft 01.08.2002) gelten neben dem Kerncurriculum fort, soweit die Schule kein Schulcurriculum beschlossen hat';
my $KCS='[gültig] Kerncurriculum Hessen Sekundarstufe I (Bildungsstandards und Inhaltsfelder), auf der Seite des Kultusministeriums als geltendes Kerncurriculum geführt';
my $KCGO='[gültig] Neue KCGO zum Halbjahreswechsel 2024/25 für die Einführungsphase in Kraft getreten; erstmals Grundlage für das Landesabitur 2027';
my $FOS='[gültig] Seit Schuljahr 2023/24 verbindliche Grundlage (ab 1. Ausbildungsabschnitt Organisationsform A), Grundlage der ZAP ab 2025; ersetzt die bisherigen FOS-Lehrpläne';
while(<$in>){ chomp; next unless length; if(/^## (\S+) (\S+)/){ ($sec,$src)=($1,$2); next } my ($p,$t)=split /\t/; my $u=$F.$p;
  my ($sa,$st,$kl,$fach,$gl,$hin)=('','','','','','');
  if($sec eq 'KCSEK1'){
    my ($b)=$t=~/\((Hauptschule|Realschule|Gymnasium)\)/; ($fach)=$t=~/^(?:Kerncurriculum|Leitfaden|Ergänzung zum Leitfaden)\s+(.*?)\s+-\s+Sekundarstufe/; $fach//=$t;
    if(!$b){ $sa='Sekundarstufe I (alle Bildungsgänge)'; $st='Klassen 5-10'; $kl='Jahrgangsstufen 5–9/10 (alle Bildungsgänge der Sekundarstufe I)'; $gl='[gültig] Leitfaden zum Kerncurriculum Sekundarstufe I (Maßgebliche Orientierungstexte)'; $hin='Leitfaden – ergänzt die Kerncurricula der Bildungsgänge' }
    elsif($b eq 'Hauptschule'){ $sa='Hauptschule (Bildungsgang)'; $st='Klassen 5-9'; $kl='Jahrgangsstufen 5–9 (Hauptschulbildungsgang; auch an Gesamt- und Mittelstufenschulen)' }
    elsif($b eq 'Realschule'){ $sa='Realschule (Bildungsgang)'; $st='Klassen 5-10'; $kl='Jahrgangsstufen 5–10 (Realschulbildungsgang; auch an Gesamt- und Mittelstufenschulen)' }
    else { $sa='Gymnasium (Sekundarstufe I)'; $st='Klassen 5-10'; $kl='Jahrgangsstufen 5–9 (G8) bzw. 5–10 (G9), gymnasialer Bildungsgang' }
    $gl||=$KCS; $gl.=" (Ausgabe lt. Titel: $1)" if $t=~/\((Stand[^)]*|überarbeitete Ausgabe \d{4}|\d{4})\)/; $fach=~s/ - Sekundarstufe I.*//;
  } elsif($sec eq 'KCGO'){ ($fach)=$t=~/^KCGO\s+(.*?)\s+\(/; $fach//=$t; $sa='Gymnasiale Oberstufe'; $st='Klassen 11-13'; $kl='Einführungsphase und Qualifikationsphase (G9: Jg. 11–13, G8: Jg. 10–12)'; $gl=$KCGO.($t=~/April 2026/?'; aktualisierte Ausgabe April 2026':''); $hin='Gilt auch für die allgemeinbildenden Fächer am beruflichen Gymnasium';
  } elsif($sec eq 'KCBG'){ ($fach)=$t=~/^KCBG\s+(.*?)(\s+\(|$)/; $sa='Berufliches Gymnasium'; $st='Klassen 11-13'; $kl='Einführungsphase und Qualifikationsphase (Jg. 11–13)'; $gl=$KCGO.($t=~/April 2026/?'; aktualisierte Ausgabe April 2026':''); $hin='Fachrichtungs-/schwerpunktbezogenes Fach; allgemeinbildende Fächer siehe KCGO (Gymnasiale Oberstufe)';
  } elsif($sec eq 'KCFOS'){ ($fach)=$t=~/^KC FOS\s+(.*?)\s+\(/; $sa='Fachoberschule'; $st='Klassen 11-12'; $kl='Organisationsform A: Jg. 11–12; Organisationsform B: einjährig (Jg. 12)'; $gl=$FOS;
  } elsif($sec eq 'BERUF'){ $sa= $t=~/BzB/ ? 'Berufsvorbereitung (BzB)' : 'Berufliche Schulen (allgemeine Fächer)'; $st='Sekundarstufe II'; $kl='berufliche Schulen (Sekundarstufe II)'; ($fach)= $t=~/Lernbereich (.*)$/ ? $1 : $t=~/Religion \((\w+)\)/ ? ucfirst($1).' Religion' : $t=~/Englisch/ ? 'Englisch' : $t; $fach=~s/^Evangelisch Religion/Evangelische Religion/; $fach=~s/^Katholisch Religion/Katholische Religion/; $gl='[gültig] auf der Seite des Kultusministeriums als geltender Plan geführt'; $hin=$t=~/Fachoberschule/?'Gilt für Fachoberschule (Organisationsform A) und Berufsschule':'';
  } elsif($sec=~/^LP-(.*)/){ my $k=$1; $fach=$t; $fach=~s/^(Lehrplan|Handreichung|Aufgabengebiete)\s+(Hauptschule|Realschule|Gymnasium [89]|Gymnasiale Oberstufe|IGS)\s*//; $fach='Aufgabengebiete' if $t=~/^Aufgabengebiete/; $fach='Vorwort' if $t=~/^Vorwort/; $fach=~s/\s+\d+-\d+$//;
    $gl=$LPG;
    if($k eq 'Hauptschule'){ $sa='Hauptschule (Bildungsgang)'; $st='Klassen 5-9'; $kl='Jahrgangsstufen 5–9/10' }
    elsif($k eq 'Realschule'){ $sa='Realschule (Bildungsgang)'; $st='Klassen 5-10'; $kl='Jahrgangsstufen 5–10' }
    elsif($k eq 'Gymnasium-8'){ $sa='Gymnasium (Sekundarstufe I)'; $st='Klassen 5-9 (G8)'; $kl='G8: Jahrgangsstufen 5–9 (Oberstufenteil durch KCGO abgelöst)'; $gl.='; für die gymnasiale Oberstufe gelten die KCGO' }
    elsif($k eq 'Gymnasium-9'){ $sa='Gymnasium (Sekundarstufe I)'; $st='Klassen 5-10 (G9)'; $kl='G9: Jahrgangsstufen 5–10 (Oberstufenteil durch KCGO abgelöst)'; $gl.='; für die gymnasiale Oberstufe gelten die KCGO' }
    elsif($k eq 'Gymnasiale-Oberstufe'){ $sa='Gymnasiale Oberstufe'; $st='Klassen 11-13'; $kl='Einführungs- und Qualifikationsphase'; $gl='[gültig] Lehrplan für Fächer ohne KCGO, auf der Seite des Kultusministeriums geführt' }
    elsif($k eq 'IGS'){ $sa='Integrierte Gesamtschule'; $st='Klassen 5-10'; $kl='Jahrgangsstufen 5–10 (IGS)'; $gl='[gültig – subsidiär] Handreichungen/Lehrpläne für die IGS (Lehrpläne 2002), gelten neben dem Kerncurriculum, soweit kein Schulcurriculum beschlossen ist' }
    $fach=~s/Freirel\. Religion/Freireligiöse Religion/; $fach=~s/Wirtschaftswiss\./Wirtschaftswissenschaften/; $fach.=' (Lehrplan 2002)' unless $k eq 'IGS' || $k eq 'Gymnasiale-Oberstufe';
  } elsif($sec eq 'SEXUAL'){ $sa='Schulformübergreifend'; $st='Klassen 5-13'; $kl='alle Jahrgangsstufen, allgemeinbildende und berufliche Schulen'; $fach='Sexualerziehung'; $gl='[gültig] Lehrplan zur Sexualerziehung (fächerübergreifend)'; }
  $fach=~s/\s+$//; $fach=ucfirst $fach;
  print $out row(land=>'Hessen',schulart=>$sa,stufe=>$st,fach=>$fach,titel=>$t,klassen=>$kl,stand=>($p=~/^(\d{4})-(\d\d)/ ? "Veröffentlichung auf kultus.hessen.de: $2/$1".($t=~/Ausgabe ([^)]+)/?"; Ausgabe $1":'') : ''),gueltigkeit=>$gl,institution=>$INST,quelle=>$src,url=>$u,typ=>'pdf',hinweis=>$hin); $n++; }
print $out row(land=>'Hessen',schulart=>'Berufliche Schulen (Berufsschule, Berufsfachschule u. a.)',stufe=>'Sekundarstufe II',fach=>'Übersicht Lehrpläne/Rahmenlehrpläne berufliche Bildung',titel=>'Kerncurricula und Lehrpläne für berufliche Schulen in Hessen (Übersicht)',klassen=>'Sekundarstufe II (beruflich)',gueltigkeit=>'[gültig] Portalübersicht',institution=>$INST,quelle=>'https://kultus.hessen.de/unterricht/kerncurricula-und-lehrplaene/kerncurricula',url=>'https://kultus.hessen.de/Unterricht/Kerncurricula/Berufliche-Schulen-Kerncurricula',typ=>'link',hinweis=>'Sonderfall: berufsbezogene Lehrpläne der Berufsschule (KMK-Rahmenlehrpläne) nur als Indexeintrag. Hinweis: kultus.hessen.de-Seiten sind durch eine Browser-Prüfung geschützt; Dokumente selbst sind direkt abrufbar'); $n++;
close $out; print "$n rows\n";
