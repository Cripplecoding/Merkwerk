use utf8; require "./lib.pl"; our $S;
my $L="https://www.lis.bremen.de/schulqualitaet/bildungsplaene";
open my $out,'>:utf8',"$S/rows/HB.tsv"; my $n=0;
my $INST='Die Senatorin für Kinder und Bildung Bremen / Landesinstitut für Schule (LIS)';
my $ERL='Erlass 100/2026 (15.06.2026): neue Bildungspläne zum 01.08.2026 erlassen; Schuljahr 2026/27 dient der Implementierung, jahrgangsweise aufwachsende Umsetzung ab 2027/28 (Deutsch, Englisch, Mathematik Sek I ab Jg. 5; Deutsch/Englisch E-Phase ab 2027/28; Darstellendes Spiel); Naturwissenschaften Sek I ab 2026/27 (Jg. 5 und 7); Physik GyO; DGS ab 2026/27';
sub item { my ($t)=@_; $t=~s/\s*\(pdf,.*$//; my ($f,$y)= $t=~/^(.*?)[_ ]+(\d{4})$/ ? ($1,$2) : ($t,''); $f=~s/_/ /g; return ($f,$y) }
# ---- Sek I
{ my $u="$L/sekundarbereich-i-21953"; my $c=get($u);
  my $o=index($c,'OBERSCHULE'); my $g=index($c,'GYMNASIUM'); my $e=index($c,'ENTW');
  my %seg=( 'Oberschule'=>substr($c,$o,$g-$o), 'Gymnasium'=>substr($c,$g,$e-$g), 'Entwurf'=>substr($c,$e,30000) );
  my %all; for my $sa (keys %seg){ for my $l (links($u,html=>$seg{$sa})){ next unless $l->[0]=~/\.pdf/i; my ($f,$y)=item($l->[1]); push @{$all{$sa}{$f}}, [$l->[0],$y,$l->[1]] } }
  for my $sa (sort keys %all){ for my $f (sort keys %{$all{$sa}}){ my %s; my @v=grep { !$s{$_->[0]}++ } @{$all{$sa}{$f}}; my @ys=sort map { $_->[1]||0 } @v;
    for my $v (@v){ my ($h,$y,$lt)=@$v; my $isnew = $y && $y>=2026; my $st;
      if($sa eq 'Entwurf'){ $st='[Entwurf – nicht in Kraft] Bildungsplan im Entwurfsstadium/Erprobungsversion laut LIS' }
      elsif($lt=~/Erlass/){ $st='[gültig] Erlass zur Inkraftsetzung'; }
      elsif($lt=~/Einschränk|Hinweise/){ $st='[gültig] Ergänzende Hinweise zur eingeschränkten Gültigkeit des Bildungsplans' }
      elsif($isnew){ $st = $f=~/Naturwiss|Gebärden/ ? "[gültig ab 01.08.2026, aufsteigend ab 2026/27] $ERL" : "[erlassen zum 01.08.2026 – Implementierungsjahr 2026/27, aufsteigende Umsetzung ab 2027/28] $ERL" }
      elsif(grep { $_>=2026 } @ys){ $st="[gültig – auslaufend] bisheriger Bildungsplan ($y); wird durch den Bildungsplan 2026 jahrgangsweise aufsteigend abgelöst. $ERL" }
      else { $st='[gültig] auf der LIS-Seite als geltender Bildungsplan der Sekundarstufe I geführt' }
      my $schulart = $sa eq 'Entwurf' ? ($h=~/GY|Gy_/ ? 'Gymnasium' : $h=~/OS|OSch/ ? 'Oberschule' : 'Sekundarstufe I (Oberschule und Gymnasium)') : $sa;
      my $fach=$f; $fach='Erlass 100-2026 (Inkraftsetzung neuer Bildungspläne)' if $lt=~/Erlass/; $fach='Mathematik' if $fach=~/Hinweise.*Mathematik/; $fach='Naturwissenschaften, Biologie, Chemie, Physik' if $fach=~/^Naturwissenschaften inhaltliche/;
      print $out row(land=>'Bremen',schulart=>$schulart,stufe=>'Klassen 5-10',fach=>$fach,titel=>"Bildungsplan $schulart – $lt" =~ s/\s*\(pdf,.*?\)//r,klassen=>'Jahrgangsstufen 5–10 (Sekundarstufe I)',stand=>($y?"Bildungsplan $y":'lt. Dokument'),gueltigkeit=>$st,institution=>$INST,quelle=>$u,url=>$h,typ=>'pdf',hinweis=>($fach=~/Medienbildung|Religion/?'Schulformübergreifend (Oberschule und Gymnasium)':'')); $n++; } } }
}
# ---- Sek II allgemeinbildend (GyO)
{ my $u="$L/sekundarbereich-ii-allgemeinbildend-21954"; my %seen; my @l=grep { $_->[0]=~/\.pdf/i } links($u); my %by;
  for my $l (@l){ my ($f,$y)=item($l->[1]); $f=~s/^Mathe$/Mathematik/; $f=~s/ ?[EQ]-Phase//; $f=~s/^Operatoren (.*)/$1/; $f=~s/^Bildungsplan fortgeführte Fremdsprachen/Fortgeführte Fremdsprachen (ab Qualifikationsphase)/; $f=~s/ bilingual//; push @{$by{$f}},[$l->[0],$y,$l->[1]] }
  for my $f (sort keys %by){ for my $v (@{$by{$f}}){ my ($h,$y,$lt)=@$v; next if $seen{$h}++;
    my $phase = $lt=~/E-Phase/ ? 'Einführungsphase' : $lt=~/Q-Phase/ ? 'Qualifikationsphase' : 'Einführungs- und Qualifikationsphase';
    my $st;
    if($y && $y>=2026 && $f=~/Deutsch|Englisch/){ $st="[erlassen zum 01.08.2026 – Umsetzung in der Einführungsphase ab 2027/28] $ERL" }
    elsif($y && $y>=2026){ $st="[gültig ab 01.08.2026] $ERL" }
    elsif($lt=~/Änderung Vorwort 2026|2026/ || $h=~/2026/){ $st='[gültig] Fassung mit geändertem Vorwort 2026' }
    else { $st='[gültig] auf der LIS-Seite als geltender Bildungsplan der gymnasialen Oberstufe geführt' }
    $st.='; Operatorenliste/ergänzendes Dokument' if $lt=~/Operator/i || $h=~/Operatoren/;
    my $fd=$f; $fd.=' (bilingual)' if $lt=~/bilingual/;
    print $out row(land=>'Bremen',schulart=>'Gymnasiale Oberstufe',stufe=>'Klassen 11-13',fach=>$fd,titel=>"Bildungsplan Gymnasiale Oberstufe – ".($lt=~s/\s*\(pdf,.*?\)//r),klassen=>"$phase (Gymnasium: Jg. 10/11–12, Oberschule/Berufliches Gymnasium: Jg. 11–13)",stand=>($y?"Bildungsplan $y":'lt. Dokument'),gueltigkeit=>$st,institution=>$INST,quelle=>$u,url=>$h,typ=>'pdf',hinweis=>''); $n++; } }
}
# ---- Sek II berufsbildend (ohne Fachschulen)
{ my $u="$L/sekundarbereich-ii-berufsbildend-21955"; my %seen;
  for my $l (links($u)){ my ($h,$t)=@$l; next unless $h=~/\.pdf/i; next if $seen{$h}++; next if $t=~/^Fachschule/; my ($f,$y)=item($t); $f=~s/^Lehrplan für //;
    my $sa = $h=~/BFS_/ ? 'Berufsfachschule (Assistentenberufe)' : $h=~/Werkschule/ ? 'Werkschule' : $h=~/Fachoberschule/ ? 'Fachoberschule' : 'Berufsbildende Schulen (allgemeinbildende Fächer)';
    print $out row(land=>'Bremen',schulart=>$sa,stufe=>'Sekundarstufe II',fach=>$f,titel=>"Bildungsplan/Lehrplan $sa – ".($t=~s/\s*\(pdf,.*?\)//r),klassen=>($sa eq 'Werkschule'?'Jahrgangsstufen 9–11/12 (Werkschule an berufsbildenden Schulen)':'Sekundarstufe II (berufsbildend)'),stand=>($y?"$y":'lt. Dokument'),gueltigkeit=>($t=~/Handreichung/?'[gültig] Handreichung (ergänzendes Dokument)':'[gültig] auf der LIS-Seite als geltender Plan geführt'),institution=>$INST,quelle=>$u,url=>$h,typ=>'pdf',hinweis=>''); $n++; }
}
close $out; print "$n rows\n";
