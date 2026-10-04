use utf8; require "./lib.pl"; our $S; use JSON::PP;
my $U="https://lehrplaene.bildung-rp.de/lehrplaene/";
my $INST='Ministerium für Bildung Rheinland-Pfalz / Pädagogisches Landesinstitut (bildung.rlp.de)';
my $c=get($U); my ($files)=$c=~/data-files="([^"]*)"/; my ($cats)=$c=~/data-categories="([^"]*)"/; for ($files,$cats){ s/&quot;/"/g; s/&amp;/&/g }
my $F=JSON::PP->new->utf8(0)->decode($files); my $C=JSON::PP->new->utf8(0)->decode($cats);
my %name; for my $g (@$C){ $name{$_}=$g->{items}{$_} for keys %{$g->{items}} }
my %SAid=(274=>'GS',275=>'RS+',276=>'Gym',277=>'IGS',278=>'FöS',279=>'HS',280=>'RS',281=>'BBS');
open my $out,'>:utf8',"$S/rows/RP.tsv"; my $n=0; my %byfach;
my @items;
for my $f (@$F){ my $nm=$f->{name}; $nm=~s/\s+/ /g; $nm=~s/^\s+|\s+$//g; my @sa=map { $SAid{$_} // () } @{$f->{categories}}; my @fa=map { $name{$_} // () } grep { !$SAid{$_} } @{$f->{categories}};
  next unless grep { /^(RS\+|Gym|IGS|HS|RS)$/ } @sa; next if $nm=~/Förderschwerpunkt|Grundschule/;
  my $s2 = $nm=~/Sekundarstufe II|Sek\.? ?II|Oberstufe|MSS|Studienstufe|Abiturjahrgang/i && $nm!~/Sekundarstufen I und II/;
  my $both = $nm=~/Sekundarstufen I und II/;
  my ($sa,$st,$kl);
  if($s2){ $sa='Gymnasiale Oberstufe (Mainzer Studienstufe)'; $st='Klassen 11-13'; $kl='Mainzer Studienstufe (MSS): G9 Jahrgangsstufen 11–13, G8GTS 10–12; Gymnasium und IGS' }
  elsif($both){ $sa='Sekundarstufe I und II (Gymnasium, IGS)'; $st='Klassen 5-13'; $kl='Sekundarstufen I und II (Gymnasium, IGS)' }
  else { my %h=map {$_=>1} @sa; my @s=grep { $h{$_} } ('RS+','IGS','Gym','HS','RS');
    $sa = (@s>=3) ? 'Sekundarstufe I (schulartübergreifend: Realschule plus, IGS, Gymnasium)' : join(' / ', map { {'RS+'=>'Realschule plus','IGS'=>'Integrierte Gesamtschule','Gym'=>'Gymnasium','HS'=>'Hauptschule (auslaufende Schulart)','RS'=>'Realschule (auslaufende Schulart)'}->{$_} } @s).' (Sek I)';
    my ($a,$b)= $nm=~/(?:Kl\.|Klassen(?:stufen)?|Hauptschule)\s*(\d+)\s*(?:[-\/]|und|bis)\s*(\d+)/ ? ($1,$2) : $nm=~/Orientierungsstufe|5-6/ ? (5,6) : (5,10);
    $st= "Klassen $a-$b"; $kl="Klassenstufen $a–$b"; }
  my $fach = $nm=~/^([^:.]+)[:.]/ ? $1 : @fa ? join(', ',@fa) : $nm; $fach=~s/\s+$//; $fach=~s/^Lehrplan (für die )?//; $fach=~s/^NaWi$/Naturwissenschaften/; $fach=~s/^Gesellschaftswissenschaftliche Fächer$/Gesellschaftswissenschaftliche Fächer (Erdkunde, Geschichte, Sozialkunde)/; $fach=~s/^gesellschaftswissenschaftlichen Fächer$/Gesellschaftswissenschaftliche Fächer (Erdkunde, Geschichte, Sozialkunde)/;
  $fach='Naturwissenschaften' if $nm=~/^Inhalte der Handreichung/; $fach='Erdkunde, Geschichte, Sozialkunde (Hinweise Lehrplananpassung)' if $nm=~/^Hinweise zur Lehrplananpassung|^Gesellschaftswissenschaftliches Aufgabenfeld/;
  $fach='Philosophie' if $nm=~/^Philosophie/; $fach='Latein' if $nm=~/Latein/; $fach='Physik' if $nm=~/Physik\. Grund/;
  if($nm=~/^Gesellschaftslehre: Sekundarstufe I \(gültig ab Schuljahr 2022/){ $st='Klassen 5-10'; $kl='Klassenstufen 5–10' }
  push @items,{f=>$f,nm=>$nm,sa=>$sa,st=>$st,kl=>$kl,fach=>$fach}; $byfach{"$sa|$fach"}++; }
for my $it (@items){ my ($nm,$sa,$fach)=@$it{qw(nm sa fach)}; my $gl='[gültig] auf dem Lehrplanportal Rheinland-Pfalz als geltender Lehrplan geführt';
  if($nm=~/^Gesellschaftslehre: IGS und RS\+, Kl\./){ $gl='[außer Kraft] ersetzt durch den Lehrplan Gesellschaftslehre Sekundarstufe I (gültig ab 2022/23 für Kl. 5–8, ab 2023/24 Kl. 9, ab 2024/25 für alle Klassenstufen); wird im Portal noch geführt' }
  elsif($nm=~/gültig bis einschließlich Abiturjahrgang (\d{4})/){ $gl = $1<2027 ? "[außer Kraft] gültig bis einschließlich Abiturjahrgang $1" : "[auslaufend gültig] bis Abiturjahrgang $1" }
  elsif($nm=~/gültig ab (?:dem )?(\d\d\.\d\d\.\d{4})|ab dem (\d\d\.\d\d\.\d{4})/){ $gl="[gültig ab ".($1||$2)."]" }
  elsif($nm=~/gültig ab Schuljahr ([^)]*)\)/){ $gl="[gültig] gültig ab Schuljahr $1" }
  elsif($byfach{"$sa|$fach"}>1 && grep { $_->{sa} eq $sa && $_->{fach} eq $fach && $_->{nm}=~/gültig ab (?:dem )?01\.08\.2026|ab dem 01\.08\.2026/ } @items){ $gl='[gültig – auslaufend] bisheriger Lehrplan; neuer Lehrplan gültig ab 01.08.2026' }
  $gl.=' (Lehrplanentwurf)' if $nm=~/entwurf/i;
  my $hin = $nm=~/Handreichung|Anregungen|Hinweise|Inhalte der Handreichung/ ? 'Ergänzendes Dokument (Handreichung/Umsetzungshilfe zum Lehrplan)' : '';
  print $out row(land=>'Rheinland-Pfalz',schulart=>$sa,stufe=>$it->{st},fach=>$fach,titel=>$nm,klassen=>$it->{kl},stand=>'lt. Dokument (Dateigröße '.int(($it->{f}{size}||0)/1024).' KB)',gueltigkeit=>$gl,institution=>$INST,quelle=>$U,url=>$it->{f}{link},typ=>lc($it->{f}{extension}||'pdf'),hinweis=>$hin,datei=>$nm); $n++ }
print $out row(land=>'Rheinland-Pfalz',schulart=>'Berufsbildende Schule',stufe=>'Sekundarstufe II',fach=>'Übersicht Lehrpläne BBS',titel=>'Lehrpläne für berufsbildende Schulen in Rheinland-Pfalz (Übersicht)',klassen=>'Sekundarstufe II (berufsbildend: Berufsschule, BF, HBF, BOS, FOS, Berufliches Gymnasium)',gueltigkeit=>'[gültig] Portalübersicht',institution=>$INST,quelle=>$U,url=>'https://bildung.rlp.de/berufsbildendeschule/lehrplaene',typ=>'link',hinweis=>'Sonderfall: Lehrpläne der berufsbildenden Schulen nur als Indexeintrag'); $n++;
close $out; print scalar(@$F)," files, $n rows\n";
