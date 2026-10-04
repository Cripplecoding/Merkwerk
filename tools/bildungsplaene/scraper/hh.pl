use utf8; use feature "state"; require "./lib.pl"; our $S;
my $B="https://www.hamburg.de/politik-und-verwaltung/behoerden/bsfb/veroeffentlichungen/bildungsplaene";
my $INST='Behörde für Schule, Familie und Berufsbildung Hamburg (BSFB)';
open my $out,'>:utf8',"$S/rows/HH.tsv"; my $n=0;
my $G1='[gültig] Bildungspläne 2022: Allgemeiner Teil sowie Rahmenpläne Deutsch, Englisch, Mathematik, Religion in Kraft seit 01.08.2023; alle übrigen Rahmenpläne in Kraft seit 01.08.2024';
my $G2='[gültig] Bildungsplan gymnasiale Oberstufe 2022 (Studienstufe), in Kraft gemäß BSFB; gilt für die Studienstufe an Gymnasien, Stadtteilschulen, beruflichen Gymnasien, Abendgymnasium und Hansa-Kolleg';
my @P=(['gym-seki-122942','Gymnasium','Klassen 5-10','Jahrgangsstufen 5–10 (Sekundarstufe I des Gymnasiums)',$G1],
       ['stadtteilschule-2022-122976','Stadtteilschule','Klassen 5-11','Jahrgangsstufen 5–11 (Sekundarstufe I und Vorstufe der Stadtteilschule)',$G1],
       ['start-sek2-2022-123118','Gymnasiale Oberstufe (Studienstufe)','Klassen 11-13','Studienstufe (Gymnasium Jg. 11–12, Stadtteilschule/berufliches Gymnasium Jg. 12–13) bzw. gemäß Bildungsplan',$G2]);
for my $p (@P){ my ($pg,$sa,$st,$kl,$gl)=@$p; my $u="$B/$pg"; my %s;
  for my $l (links($u)){ my ($h,$t)=@$l; next unless $h=~/\.pdf/i; next if $s{$h}++; next if $t=~/^PDF herunterladen/;
    my $fach=$t; $fach=~s/^Neuere Fremdsprachen: //; $fach=~s/^Alte Sprachen: //;
    my $hin='';
    if($t=~/^(Teil C|Sprachbildung|Aufgabengebiete|Rahmenvorgaben|Religion - Hinweise)/){ $hin='Übergreifender Teil des Bildungsplans' }
    my $fst=$st; my $fkl=$kl;
    if($sa eq 'Gymnasiale Oberstufe (Studienstufe)' && $t=~/Fachrichtung/){ $hin='Profilgebende Fachrichtung an beruflichen Gymnasien' }
    if($t=~/Deutsch als Zweitsprache in Vorbereitungsklassen/){ $hin='Für Internationale Vorbereitungsklassen' }
    my ($yr)=$h=~/(20\d\d)/;
    print $out row(land=>'Hamburg',schulart=>$sa,stufe=>$fst,fach=>$fach,titel=>"Bildungsplan $sa – $t",klassen=>$fkl,stand=>($yr?"Bildungsplan $yr":'Bildungsplan 2022 (Rahmenplan lt. Dokument)'),gueltigkeit=>$gl,institution=>$INST,quelle=>$u,url=>$h,typ=>'pdf',hinweis=>$hin); $n++; } }
# Allgemeiner Teil / Präambel (gelten auch für Sek I)
for my $l (links($B)){ my ($h,$t)=@$l; next unless $h=~/(a-teil-dl|praeambel-dl|sic-dl)-data\.pdf/; next if $t=~/^PDF/; state %s; next if $s{$h}++;
  print $out row(land=>'Hamburg',schulart=>'Schulformübergreifend (Grundschule, Stadtteilschule, Gymnasium)',stufe=>'Klassen 5-13',fach=>$t,titel=>"Bildungsplan Hamburg – $t",klassen=>'alle Jahrgangsstufen (Sekundarstufe I und II betroffen)',stand=>'Bildungspläne 2022',gueltigkeit=>$G1,institution=>$INST,quelle=>$B,url=>$h,typ=>'pdf',hinweis=>'Übergreifender Teil, gilt für alle allgemeinbildenden Schulformen'); $n++; }
print $out row(land=>'Hamburg',schulart=>'Berufliche Schulen (HIBB)',stufe=>'Sekundarstufe II',fach=>'Übersicht Bildungspläne berufliche Schulen',titel=>'Bildungspläne der berufsbildenden Schulen Hamburg (HIBB)',klassen=>'Sekundarstufe II (beruflich)',gueltigkeit=>'[gültig] Portalübersicht',institution=>'Hamburger Institut für Berufliche Bildung (HIBB)',quelle=>'https://hibb.hamburg.de/',url=>'https://hibb.hamburg.de/beratung-recht/bildungsplaene/',typ=>'link',hinweis=>'Sonderfall: Bildungspläne der beruflichen Bildungsgänge nur als Indexeintrag; berufliche Gymnasien siehe Bildungsplan gymnasiale Oberstufe (Fachrichtungen)'); $n++;
close $out; print "$n rows\n";
