use utf8; require "./lib.pl"; our $S;
my $B="https://www.bildungsplaene-bw.de/,Lde/";
my %skip=map {($_->[0]=~s/#.*//r)=>1} links($B."Startseite"); $skip{$B.$_}=1 for qw(25861925 25862142 25862121 25861913 25861938 ausbildungsberufe zusatzqualifikationen wahlpflichtbereich);
my @sec=(['25862101','Berufliches Gymnasium',3],['25862111','Berufsoberschule',3],['25862086','Berufskolleg',3],['25862076','Berufsfachschule',3],['25862066','Berufsvorbereitende Bildungsgänge (VABO, AV, AVdual, BVE)',3],['allgemeine+faecher','Berufsschule (allgemeine Fächer)',2],['besondere+bildungsgaenge+fuer+abiturientinnen+und+abiturienten+-+kaufmaennische+berufskollegs+in+teilzeitform+_duales+berufskolleg_','Berufskolleg',2],['25862131','Berufliche Schulen – schulartübergreifend',1]);
open my $out,'>:utf8',"$S/rows/BW_beruf.tsv"; my %done; my $n=0;
for my $s (@sec){ my ($id,$sa,$dep)=@$s; my ($pg,$docs)=crawl($B.$id,depth=>$dep,follow=>qr{bildungsplaene-bw\.de/,Lde/},skip=>\%skip);
  my %rich; if($sa eq "Berufliches Gymnasium"){ for my $p (grep { /Mittelstufe_|Oberstufe_/ } keys %$pg){ for my $L (links($p)){ my $h=$L->[0]=~s/#.*//r; push @{$rich{$h}}, ($p=~/Mittelstufe/?"Mittelstufe ":"").$pg->{$p}{title} } } }
  my %by; for my $d (@$docs){ push @{$by{$d->{url}}},$d }
  for my $u (sort keys %by){ next if $done{$u}++; my @ds=@{$by{$u}}; my $d=$ds[0]; my @ch=chain($pg,$d->{page}); shift @ch;
    my $lt=$d->{text}; if($lt=~/^(Download( als PDF)?|PDF|hier|Datei|\s*)$/i){ $lt=$d->{ctx}//""; $lt="" if length($lt)>150 } $lt=~s/\s*\(?PDF[^)]*\)?\s*$//i; $lt=~s/^\s+|\s+$//g;
    my $pt = @ch ? $ch[-1] : ""; my @par = @ch>1 ? @ch[0..$#ch-1] : ();
    my ($fach,$bg);
    if($lt && $lt ne $pt && $lt!~/^Download/i){ $fach=$lt; $bg=join(" > ",grep {$_} @par,$pt) } else { $fach=$pt||$lt||"Allgemein"; $bg=join(" > ",@par) }
    $fach=~s/^\d+[_ ]//;
    my $gab=''; if($fach=~s/\s*\(\s*(gültig ab[^)]*?)\s*\)//i){ $gab=$1 } $fach=~s/,?\s*Veröffentlichungsfassung//; $fach=~s/\s*\(\s*$//; $fach=~s/^\s+|\s+$//g;
    my @ctxs = do { my %h; grep { $_ && !$h{$_}++ } map { my @c=chain($pg,$_->{page}); shift @c; join(" > ",@c) } @ds };
    next if "$fach $lt $bg"=~/letztmal|Archiv|nicht mehr gültig|auslaufend/i;
    next if "$fach $bg"=~/(?<!Berufs)Fachschule/i && "$fach $bg"!~/Berufskolleg/i;
    next if "$fach $bg $lt"=~/Fachschule für Sozialpädagogik/i && !grep { /1BKSP/ } @ctxs;   # Erzieherausbildung (Fachschulniveau, tertiär) ausgeschlossen
    my ($stufe,$kl)=("Sekundarstufe II","Sekundarstufe II (Klassenstufen gemäß Bildungsgang)");
    if($sa eq "Berufliches Gymnasium"){ if(join(" ",map {$_->{page}} @ds)=~/_MS\b|_MS_/){($stufe,$kl)=("Klassen 8-10","Klassen 8–10 (sechsjähriges Berufliches Gymnasium, Mittelstufe)")} else {($stufe,$kl)=("Klassen 11-13","Klassen 11–13 (Eingangsklasse, Jahrgangsstufen 1 und 2)")} }
    elsif($sa eq "Berufsoberschule"){ if("$bg $fach"=~/Mittelstufe|BAS/){($stufe,$kl)=("Sekundarstufe II","Berufsaufbauschule (Mittelstufe, 1 Jahr, Fachschulreife)")} else {($stufe,$kl)=("Klassen 12-13","Oberstufe (2 Jahre, Fachgebundene/Allgemeine Hochschulreife)")} }
    my $fd=$fach; my $bgs=$bg; $bgs=~s/.* > //;
    $fd="$fach ($bgs)" if $bgs && $sa ne "Berufliches Gymnasium" && @ds==1 && $bgs ne $fach;
    if($sa eq "Berufliches Gymnasium"){ my @r=@{$rich{$d->{page}}||[]}; $bg=join(" | ",@r); $fd=$fach; if(@r==1){ my ($ab)=$r[0]=~/\((\w+)\)\s*$/; $fd="$fach (".($ab||$r[0]).")" } }
    my ($yr)= $u=~/(20\d\d)(?!\d)/;
    print $out row(land=>"Baden-Württemberg",schulart=>$sa,stufe=>$stufe,fach=>$fd,titel=>"Bildungsplan $sa – ".($bg?"$bg – ":"").$fach,klassen=>$kl,stand=>($yr?"lt. Dateipfad $yr":""),gueltigkeit=>"[gültig".($gab?" – $gab":"")."] im Bildungsplanportal unter den aktuell gültigen Plänen geführt (abgelaufene Pläne stehen im separaten Archiv)",institution=>"Kultusministerium Baden-Württemberg / ZSL (bildungsplaene-bw.de)",quelle=>$d->{page},url=>$u,typ=>"pdf",hinweis=>(@ctxs>1? "Gilt für: ".join(" | ",@ctxs) : $bg ? "Bildungsgang: $bg" : "")); $n++; }
  print STDERR "$sa: ",scalar(keys %$pg)," pages, ",scalar(keys %by)," docs\n"; }
print $out row(land=>'Baden-Württemberg',schulart=>'Berufsschule (Ausbildungsberufe)',stufe=>'Sekundarstufe II',fach=>'Berufsbezogener Bereich – alle Ausbildungsberufe',titel=>'Lehrpläne für den berufsbezogenen Bereich der Berufsschule (Übersicht nach Ausbildungsberufen)',klassen=>'Berufsschule (duale Ausbildung, 2–3,5 Jahre)',gueltigkeit=>'[gültig] Portalübersicht',institution=>'Kultusministerium Baden-Württemberg / ZSL',quelle=>$B.'25862055',url=>$B.'ausbildungsberufe',typ=>'link',hinweis=>'Sonderfall: berufsfachliche Lehrpläne je Ausbildungsberuf (überwiegend KMK-Rahmenlehrpläne) nur als Indexeintrag, siehe README');
close $out; print "$n rows\n";
