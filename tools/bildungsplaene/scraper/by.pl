use utf8; require "./lib.pl"; our $S;
my $INST='Bayerisches Staatsministerium für Unterricht und Kultus / Staatsinstitut für Schulqualität und Bildungsforschung (ISB), LehrplanPLUS';
my %SA=(mittelschule=>'Mittelschule',realschule=>'Realschule',gymnasium=>'Gymnasium',wirtschaftsschule=>'Wirtschaftsschule',fos=>'Fachoberschule',bos=>'Berufsoberschule');
my %lm; open my $sm,'<:utf8',"$S/by/sitemap.xml"; { local $/; my $x=<$sm>; while($x=~/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)</g){ $lm{$1}=$2 } }
open my $in,'<:utf8',"$S/by/h1.tsv"; open my $out,'>:utf8',"$S/rows/BY.tsv"; my $n=0;
while(<$in>){ chomp; my ($u,$ti,$h1)=split /\t/; next unless $u; my ($typ,$sa,$jg)=$u=~m{bayern\.de/([^/]+)/([^/]+)(?:/(\d+))?}; next unless $SA{$sa};
  my $SAn=$SA{$sa}; $ti=dec($ti); $h1=dec($h1);
  my @t=split / - /,$ti; my ($jgl,$fach)=('','');
  if($typ eq 'fachlehrplan'){ ($jgl,$fach)=@t[2,3] } elsif($typ eq 'jahrgangsstufenprofil'){ $jgl=$t[2]; $fach='Jahrgangsstufenprofil (Grundlegende Kompetenzen)' } else { $fach='Bildungs- und Erziehungsauftrag'; $jgl='' }
  $fach//=''; $fach=~s/\s+$//; $jgl//='';
  my @j=$jgl=~/(\d+)/g; @j=($jg) if !@j && $jg; my ($a,$b)=(sort {$a<=>$b} @j)[0,-1];
  my $st = !$a ? ($sa=~/fos|bos/?'Jahrgangsstufen 11-13':'Alle Jahrgangsstufen') : $a==$b ? "Jahrgangsstufe $a" : "Jahrgangsstufen $a-$b";
  my $name=$h1; $name=~s/\s+\Q$SAn\E,.*$//; $name=~s/^\s+|\s+$//g; $name ||= $ti;
  my $gl='[gültig] in LehrplanPLUS als geltender Lehrplan veröffentlicht';
  if("$name $h1"=~/g(?:ü|ue)l?t?l?ig ab SJ (20(\d\d))\/(\d\d)|gütlig ab SJ (20(\d\d))\/(\d\d)/i){ my $y=$1||$4; $gl = $y>2026 ? "[in Kraft ab Schuljahr $y/".(($3||$6))."] bereits veröffentlicht; bis dahin gilt der bisherige Fachlehrplan" : "[gültig ab Schuljahr $y/".(($3||$6))."]" }
  elsif("$name $h1"=~/(auslaufend|gültig bis)[^,]*/i){ $gl="[auslaufend gültig] $&" }
  my $kl = $a ? ($a==$b ? "Jahrgangsstufe $a" : "Jahrgangsstufen $a–$b") : 'alle Jahrgangsstufen der Schulart';
  $kl.=' (G9; Jahrgangsstufe 13 seit 2025/26)' if $sa eq 'gymnasium' && $a && $b>=12;
  my $lmod=$lm{$u} ? substr($lm{$u},0,10) : '';
  my $titel = $typ eq 'fachlehrplan' ? "LehrplanPLUS $SAn – $name" : "LehrplanPLUS $SAn – $fach".($a?" $jgl":'');
  print $out row(land=>'Bayern',schulart=>$SAn,stufe=>$st,fach=>($fach||'Allgemein'),titel=>$titel,klassen=>$kl,stand=>($lmod?"Online-Fassung, zuletzt geändert $lmod (lt. Sitemap)":'Online-Fassung'),gueltigkeit=>$gl,institution=>$INST,quelle=>'https://www.lehrplanplus.bayern.de/sitemap.xml',url=>$u,typ=>'link',hinweis=>'LehrplanPLUS ist ausschließlich als HTML-Online-Lehrplan verfügbar; die Gesamtlehrplan-PDFs werden laut ISB derzeit überarbeitet (voraussichtlich Q4 2026)',datei=>($typ eq 'fachlehrplan' ? $name : "$fach".($a?" $jgl":''))); $n++ }
print $out row(land=>'Bayern',schulart=>'Berufsschule (berufsbezogene Lehrpläne)',stufe=>'Sekundarstufe II',fach=>'Übersicht Lehrpläne berufliche Schulen',titel=>'Lehrpläne der Berufsschule (berufsbezogener Unterricht) in Bayern (ISB, Übersicht)',klassen=>'Sekundarstufe II (beruflich)',gueltigkeit=>'[gültig] Portalübersicht',institution=>'Staatsinstitut für Schulqualität und Bildungsforschung (ISB)',quelle=>'https://www.isb.bayern.de/',url=>'https://www.isb.bayern.de/schularten/berufliche-schulen/berufsschule/',typ=>'link',hinweis=>'Sonderfall: berufsbezogene Lehrpläne der Berufsschule (Ausbildungsberufe) nur als Indexeintrag; allgemeinbildende Fächer an Berufsschule/Berufsfachschule und Berufsfachschul-Lehrpläne sind als PDF enthalten; Wirtschaftsschule, FOS und BOS über LehrplanPLUS'); $n++;
close $out; print "$n rows\n";
