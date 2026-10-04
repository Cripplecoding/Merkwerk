use utf8; require "./lib.pl"; our $S;
my $L="https://www.schulportal.sachsen.de/lplandb";
my $INST='Sächsisches Staatsministerium für Kultus / Landesamt für Schule und Bildung (Lehrplandatenbank Sachsen)';
open my $in,'<:utf8',"$S/sn_data.tsv"; open my $out,'>:utf8',"$S/rows/SN.tsv"; my $n=0; my %seen;
my %SA=('Gymnasium'=>'Gymnasium','Oberschule'=>'Oberschule','Berufliches Gymnasium'=>'Berufliches Gymnasium','Fachoberschule'=>'Fachoberschule');
while(<$in>){ chomp; next unless /\t/; my ($sa,$fach,$id,$sc)=split /\t/; my $pu="$L/index.php?lplanid=$id&lplansc=$sc";
  my $t=text($pu); my ($sub)=$t=~/Im Schulportal anmelden\n(?:-->\n)*(.+?)\n/; $sub//=''; $sub=~s/^-->\s*//;
  my ($toc)=$t=~/Teil Fachlehrplan(.*?)(?:Dokument als PDF|$)/s; $toc//=$t;
  my @n; while($toc=~/(?:Klassenstufen?|Jahrgangsstufen?)\s+(\d{1,2})(?:\s*(?:[\/–-]|bis)\s*(\d{1,2}))?/g){ push @n,$1; push @n,$2 if $2 } @n=grep { $_>=5 && $_<=13 } @n;
  my ($a,$b)=(sort {$a<=>$b} @n)[0,-1];
  if(!$a){ ($a,$b)= $sa eq 'Oberschule' ? (5,10) : $sa eq 'Gymnasium' ? (5,12) : $sa eq 'Fachoberschule' ? (11,12) : (11,13) }
  $b=13 if $sa eq 'Berufliches Gymnasium' && $b<13 && $b>=11; 
  my ($ver)=$sub=~/(\d{4}(?:,\s*Überarbeitung\s*\d{4})?)/; 
  my $st = $a==$b ? "Klasse $a" : "Klassen $a-$b"; my $kl = $a==$b ? "Klassenstufe $a" : "Klassen-/Jahrgangsstufen $a–$b";
  $kl.=' (Gymnasium: Klassenstufen 5–10, Jahrgangsstufen 11/12)' if $sa eq 'Gymnasium' && $b==12;
  my $gl='[gültig] in der Lehrplandatenbank Sachsen als geltender Lehrplan geführt'.($sub?" ($sub)":'');
  if($t=~/((?:tritt|treten)[^\n]{0,250}in Kraft[:.]?(?:\n(?!Die Lehrpläne traten)[^\n]{0,120}){0,10})\nDie Lehrpläne traten/){ my $x=$1; $x=~s/\n/ /g; $gl.="; Inkrafttreten lt. Lehrplan: $x" }
  elsif($t=~/(Die Lehrpläne traten[^\n]{0,60}in Kraft)/){ $gl.="; $1" }
  if($gl=~/ab dem Schuljahr (\d{4})\/(\d{2,4})|am 1\. August (\d{4})/ && ($1||$3)>2026){ $gl=~s/^\[gültig\]/[gültig – teilweise erst später in Kraft]/ }
  my $key="$sa|$id"; next if $seen{$key}++;
  my $fd=$fach; $fd=~s/\s*\(FR .*\)$//; my $fr = $fach=~/\(FR (.*)\)$/ ? $1 : '';
  print $out row(land=>'Sachsen',schulart=>$SA{$sa},stufe=>$st,fach=>($fr ? "$fd ($fr)" : $fd),titel=>"Lehrplan $sa $fd".($sub?" – $sub":''),klassen=>$kl,stand=>($ver?"Lehrplan $ver":($sub||'lt. Dokument')),gueltigkeit=>$gl,institution=>$INST,quelle=>$pu,url=>"$L/lehrplan/file/$id/$sc",typ=>'pdf',hinweis=>($fr?"Fachrichtung: $fr; ":'')."Online-Fassung: $pu",datei=>"LP_${sa}_${fd}_$id"=~s/[\/ ]+/_/gr); $n++ }
for my $x (['Berufsschule','Berufsschule (Ausbildungsberufe, 292 Lehrpläne)'],['Berufsfachschule','Berufsfachschule (29 Lehrpläne)'],['DuBAS','Berufliches Gymnasium/Berufsschule – Duale Berufsausbildung mit Abitur (28 Lehrpläne)']){
  print $out row(land=>'Sachsen',schulart=>"Berufsbildende Schulen – $x->[0]",stufe=>'Sekundarstufe II',fach=>"Übersicht $x->[1]",titel=>"Lehrplandatenbank Sachsen – $x->[1]",klassen=>'Sekundarstufe II (beruflich)',gueltigkeit=>'[gültig] Portalübersicht',institution=>$INST,quelle=>"$L/",url=>"$L/",typ=>'link',hinweis=>'Sonderfall: nur als Indexeintrag; Auswahl in der Lehrplandatenbank über „Berufsbildende Schulen“ (dynamische Anwendung ohne direkte Links)'); $n++ }
close $out; print "$n rows\n";
