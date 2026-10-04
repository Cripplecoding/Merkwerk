use utf8; require "./lib.pl"; our $S;
my $B="https://www.schulportal-thueringen.de";
my $INST='Thüringer Ministerium für Bildung, Wissenschaft und Kultur / ThILLM (Thüringer Schulportal)';
open my $out,'>:utf8',"$S/rows/TH.tsv"; my ($n,%seen)=(0);
my @P=(['regelschule','Regelschule','Klassen 5-10','Klassenstufen 5–10'],['gymnasium','Gymnasium','Klassen 5-12','Klassenstufen 5–12 (Erwerb der allgemeinen Hochschulreife)'],['thueringer_gemeinschaftsschule','Thüringer Gemeinschaftsschule','Klassen 5-12','Klassenstufen 5–10 bzw. bis 12/13 (Gemeinschaftsschule)']);
for my $p (@P){ my ($slug,$sa,$st,$kl)=@$p; my $u="$B/lehrplaene/$slug";
  for my $l (links($u)){ my ($h,$t,$ti,$cx,$hd)=@$l; next unless $h=~/tspi=(\d+)|get-data|resources\/medien/; next if $hd=~/Archiv|Orientierungen zur Lehrplanarbeit/ || $t=~/^(Archiv|Bestellung)$/; $h=~s{^http://}{https://}; $h=~s{/web/guest/}{/}; next if $seen{"$sa|$h"}++;
    next if $hd=~/Grundschule/;
    my ($pdf,$gl,$jahr,$titel)=('','','',$t);
    if($h=~/tspi=(\d+)/){ my $dt=text($h); my $c=get($h);
      ($pdf)= map { $_->[0] } grep { $_->[0]=~/resources\/medien|get-data/ && $_->[0]!~/help|portlet/ } links($h,html=>$c);
      if($dt=~/Gültigkeit des Lehrplans:?\n(.*?)\n(?:Adressaten|Sachgebiete|Schlagworte|Urheber)/s){ $gl=$1; $gl=~s/\n/ /g }
      ($jahr)=$dt=~/Produktionsjahr\n(\d{4})/; my ($tt)=$dt=~/Mediendaten\n([^\n]+)/; $titel=$tt if $tt; }
    else { $pdf=$h }
    next unless $pdf;
    my $fach=$t; $fach=~s/\s*\((?:Erprobungs|Entwurfs|Entwurf)[^)]*\)//; $fach=~s/\s*\(\d{4}\).*//; $fach=~s/^Lehrplan\s+//; $fach=~s/\s+\d{4}.*$//; $fach=~s/\s+(ab|Erprobungsfassung).*$//; $fach=~s/\s*\((?!Wahlpflicht)[^)]*$//; $fach=~s/\s+5\/6$//; $fach=~s/, TGS$//; $fach='Geografie' if $fach=~/^Hinweise zur thematischen Schwerpunktsetzung/; $fach='Fächerübergreifend (Leitgedanken, Hinweise)' if $t=~/^(Leitgedanken|Impulse)/;
    my $status = $t=~/Entwurf/ ? '[Entwurf – nicht in Kraft]' : $t=~/Erprobung/ ? '[gültig – Erprobungsfassung]' : $hd=~/1999-2008/ ? '[gültig – älterer Lehrplan]' : '[gültig]';
    $status = '[auslaufend gültig]' if $gl=~/im Schuljahr 20\d\d\/\d\d für/ && $status eq '[gültig]' && $gl!~/^- ab|seit/i && $gl=~/Klassenstufen?\s+\d/ && $gl=~/20(2[7-9]|3\d)\/\d\d für/;
    my $glx = $status.($gl ? " Gültigkeit lt. Schulportal: $gl" : ' im Thüringer Schulportal als Lehrplan geführt');
    my ($yr)=$t=~/\((?:\D*)(\d{4})\)/; $yr||=$jahr;
    my $ext = $pdf=~/\.(\w{3,4})(?:$|\?)/ ? lc $1 : 'pdf'; $ext='pdf' unless $ext=~/^(pdf|docx?)$/;
    print $out row(land=>'Thüringen',schulart=>$sa,stufe=>$st,fach=>$fach,titel=>"$titel – $t",klassen=>$kl,stand=>($yr?"Lehrplan $yr":'lt. Dokument'),gueltigkeit=>$glx,institution=>$INST,quelle=>$h,url=>$pdf,typ=>$ext,hinweis=>($hd && $hd ne '-' ? "Rubrik: $hd" : ''),datei=>"$sa $t"); $n++ } }
print $out row(land=>'Thüringen',schulart=>'Berufsbildende Schulen',stufe=>'Sekundarstufe II',fach=>'Übersicht Lehrpläne berufsbildende Schulen',titel=>'Thüringer Lehrpläne für berufsbildende Schulen (Übersicht)',klassen=>'Sekundarstufe II (beruflich, inkl. Berufliches Gymnasium und Fachoberschule)',gueltigkeit=>'[gültig] Portalübersicht',institution=>$INST,quelle=>"$B/lehrplaene",url=>"$B/lehrplaene/berufsbildende_schulen",typ=>'link',hinweis=>'Sonderfall: berufsbildende Schulen nur als Indexeintrag'); $n++;
close $out; print "$n rows\n";
