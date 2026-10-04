use utf8; require "./lib.pl"; our $S;
my $B="https://www.bildung-mv.de/unterricht/rahmenplaene/rahmenplaene-fuer-die-allgemein-bildenden-faecher/";
my $INST='Ministerium für Bildung und Kindertagesförderung M-V / Institut für Qualitätsentwicklung (IQ M-V), Bildungsserver M-V';
open my $out,'>:utf8',"$S/rows/MV.tsv"; my ($n,%seen)=(0);
my @pages = grep { $_ ne $B && index($_,$B)==0 } map { $_->[0]=~s/#.*//r } links($B); my %u; @pages=grep { !$u{$_}++ } @pages;
for my $pg (@pages){ my @R=trows($pg); my $hdr=0;
  for my $r (@R){ my @c=@{$r->{cells}}; if(@c && $c[0] eq 'Bezeichnung'){ $hdr=1; next } next unless $hdr && @c>=3; my ($pdf)=grep { $_->[0]=~/\.pdf/i } @{$r->{links}}; next unless $pdf;
    my ($bez,$sa,$jg)=@c[0..2]; my ($a,$b)= $jg=~/(\d+)\s*[-–]\s*(\d+)/ ? ($1,$2) : $jg=~/(\d+)/ ? ($1,$1) : (0,0);
    next if $b && $b<5; next if $sa=~/Grundschule/ && $b<5; next if $sa=~/Förder/;
    my $key="$pdf->[0]|$sa"; next if $seen{$key}++;
    my $fach=$bez; $fach=~s/^Rahmen(?:p)?l?an\s+//i; $fach=~s/,.*$//; $fach=~s/\s+(auslaufend|aufwachsend|gültig).*$//i; $fach=~s/\s*\(.*$//; $fach||=$bez;
    my $gl='[gültig] in der Übersicht der geltenden Rahmenpläne des Bildungsservers M-V geführt';
    if($bez=~/gültig ab (\d\d\.\d\d\.(\d{4}))/i){ my ($d,$y)=($1,$2); $gl = $y>2026 || ($y==2026 && $d gt '01.10.2026') ? "[in Kraft ab $d, aufwachsend] bereits veröffentlicht" : "[gültig ab $d, aufwachsend]" }
    elsif($bez=~/aufwachsend ab (\d\d\.\d\d\.\d{4})/i){ $gl="[gültig ab $1, aufwachsend]" }
    elsif($bez=~/(?:gültig bis|auslaufend bis) (\d\d)\.(\d\d)\.(\d{4})/i){ $gl = "$3$2$1" lt "20261003" ? "[außer Kraft] Gültigkeit endete am $1.$2.$3" : "[auslaufend gültig bis $1.$2.$3]" }
    elsif($bez=~/auslaufend/i){ $gl='[auslaufend gültig]' }
    $gl.=' – Erprobungsfassung' if $pdf->[0]=~/Erprobung/i || $bez=~/Erprobung/i;
    my $st = $a ? ($a==$b ? "Klasse $a" : "Klassen $a-$b") : 'Sekundarstufe';
    my ($yr)=$pdf->[0]=~/[_-](20\d\d)(?:[_.-]|$)/;
    $sa=~s/\s+,/,/g; $sa=~s/^Gymnasien,/Gymnasium,/; $sa=~s/^Regionale Schulen,/Regionale Schule,/; $sa=~s/schulartenunabhängige/schulartunabhängige/; $fach=~s/\s+(Sek I.*|Sekundarbereich II.*|für die Vorstufe des Fachgymnasiums)$//; $fach=ucfirst $fach;
    my $sa2=$sa; $sa2='Orientierungsstufe (schulartunabhängig, Jg. 5–6)' if $sa=~/^schulartunabhängige Orientierungsstufe$/i;
    $sa2='Fachgymnasium (berufliche Schule)' if $sa=~/^Berufsschule - Fachgymnasium$/; $sa2='Fachoberschule' if $sa=~/^Berufsschule - Fachoberschule$/; $sa2='Berufsschule und Fachoberschule (allgemeinbildende Fächer)' if $sa=~/^Berufsschule, Fachoberschule$/; $sa2='Berufsschule (allgemeinbildende Fächer)' if $sa eq 'Berufsschule';
    $sa2='Gymnasiale Oberstufe (Qualifikationsphase)' if $sa=~/^Qualifikationsphase der gymnasialen Oberstufe/; $sa2='Schulartübergreifend' if $sa=~/^alle$|^schulartunabhängige Orientierungsstufe, Sekundarbereich/;
    print $out row(land=>'Mecklenburg-Vorpommern',schulart=>$sa2,stufe=>$st,fach=>$fach,titel=>"$bez – $sa (Jahrgangsstufe $jg)",klassen=>"Jahrgangsstufen $jg",stand=>($yr?"lt. Datei $yr":'lt. Dokument'),gueltigkeit=>$gl,institution=>$INST,quelle=>$pg,url=>$pdf->[0],typ=>'pdf',hinweis=>''); $n++; } }
# fachübergreifende Pläne + Bildung und Erziehung Sek I
for my $l (links($B)){ my ($h,$t,$ti,$cx,$hd)=@$l; next unless $h=~/\.pdf$/i && ($hd=~/Fachübergreifende/ || $t=~/Bildung und Erziehung/); next if $seen{$h}++;
  print $out row(land=>'Mecklenburg-Vorpommern',schulart=>'Schulartübergreifend',stufe=>'Klassen 5-13',fach=>($t=~/Bildung und Erziehung/?'Bildung und Erziehung (Orientierungsstufe und Sek I)':"Fachübergreifend – $t"),titel=>"Rahmenplan/Grundlagendokument $t",klassen=>'alle Jahrgangsstufen (fachübergreifend)',stand=>'lt. Dokument',gueltigkeit=>'[gültig] auf dem Bildungsserver M-V als geltender fachübergreifender Plan geführt',institution=>$INST,quelle=>$B,url=>$h,typ=>'pdf',hinweis=>'Fachübergreifender Plan'); $n++; }
print $out row(land=>'Mecklenburg-Vorpommern',schulart=>'Berufliche Schulen',stufe=>'Sekundarstufe II',fach=>'Übersicht Rahmenpläne berufliche Bildungsgänge und Fächer',titel=>'Rahmenpläne für die beruflichen Bildungsgänge und Fächer (Übersicht)',klassen=>'Sekundarstufe II (beruflich)',gueltigkeit=>'[gültig] Portalübersicht',institution=>$INST,quelle=>'https://www.bildung-mv.de/unterricht/rahmenplaene/',url=>'https://www.bildung-mv.de/unterricht/rahmenplaene/rahmenplaene-fuer-die-beruflichen-bildungsgaenge-und-faecher/',typ=>'link',hinweis=>'Sonderfall: berufliche Bildungsgänge nur als Indexeintrag; allgemeinbildende Fächer an Fachgymnasium/FOS sind oben je Fach enthalten'); $n++;
close $out; print scalar(@pages)," pages, $n rows\n";
