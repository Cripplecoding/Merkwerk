use utf8; require "./lib.pl"; our $S;
my $P="https://www.bildung-lsa.de/informationsportal/unterricht";
my $INST='Ministerium für Bildung Sachsen-Anhalt / Landesinstitut für Schulqualität und Lehrerbildung (LISA), Bildungsserver Sachsen-Anhalt';
open my $out,'>:utf8',"$S/rows/ST.tsv"; my ($n,%seen)=(0);
my @P=(["$P/sekundarschule/schulformbezogene_informationen/lehrplan.htm",'Sekundarschule','Klassen 5-10','Schuljahrgänge 5–10','164f3f97'],
       ["$P/gemeinschaftsschule/lehrplan.htm",'Gemeinschaftsschule','Klassen 5-10','Schuljahrgänge 5–10 (Gemeinschaftsschule; Fachlehrpläne der Sekundarschule bzw. des Gymnasiums gelten entsprechend)','0cf06e8b'],
       ["$P/gymnasium/schulformbezogene_informationen/lehrplan.htm",'Gymnasium','Klassen 5-12','Schuljahrgänge 5–12 (Sekundarstufe I und gymnasiale Oberstufe; auch Fachgymnasium für allgemeinbildende Fächer)','b45de329']);
for my $p (@P){ my ($u,$sa,$st,$kl,$hash)=@$p;
  for my $l (links($u)){ my ($h,$t,$ti,$cx,$hd)=@$l; next unless $h=~/\.(pdf|docx?)$/i; next if $h=~/1eb853e2b9e930fd4c29b67f2b3dbe72/; next unless $h=~/\Q$hash\E/; next if $seen{"$sa|$h"}++;
    my $typ=$t; my $fach=$hd; $fach='' if !$fach || $fach=~/^(Trenner|Andrea|Grundsatzband)/;
    if($typ=~/^(Grundsatzband|Orientierungen zur schulinternen|Der kompetenzorientierte|Bildungssprachliche|Was ist neu|Lehrplananforderungen)/){ $fach='Fächerübergreifend (Grundsatzband, Orientierungen)' }
    $fach||='Fächerübergreifend (Grundsatzband, Orientierungen)'; $fach=~s/^ev\. Religion$/Evangelische Religion/; $fach=~s/^kath\. Religion$/Katholische Religion/;
    my $ext=lc(($h=~/\.(\w+)$/)[0]);
    my ($d,$m,$y)= $h=~/(\d\d)_?(\d\d)_?(20\d\d)/ ? ($1,$2,$3) : $h=~/0108(\d\d)/ ? ('01','08',"20$1") : ();
    my $gl='[gültig] auf dem Bildungsserver Sachsen-Anhalt als geltende curriculare Vorgabe geführt';
    $gl='[gültig] Grundsatzband und Fachlehrpläne in der Fassung vom 01.08.2022 gelten für alle Schuljahrgänge der Sekundarstufe I und die Einführungsphase der gymnasialen Oberstufe' if $sa eq 'Gymnasium' && $h=~/0108(22|2022)|010822/;
    $gl="[gültig] Fachlehrplan in der Fassung vom 01.08.2024" if $h=~/010824|01082024/;
    $gl='[gültig] Fachlehrplan in der Fassung vom 01.08.2019' if $h=~/01_08_2019/;
    $gl="[gültig – Erprobungslehrplan] in Erprobung ab 01.08.2026" if $typ=~/Erprobung/ && $h=~/2026/;
    $gl='[gültig] Kurslehrplan (Erprobungsfassung 2015) für Wahlpflichtkurse' if $typ=~/Kurslehrplan/;
    my $hin = $typ=~/^(Informationen|Lektüre|Ausschärfung|Fachliche Orientierung|Orientierungen|Der kompetenz|Bildungssprach|Was ist neu)/ ? "Ergänzendes Dokument ($typ)" : '';
    print $out row(land=>'Sachsen-Anhalt',schulart=>$sa,stufe=>$st,fach=>$fach,titel=>"$typ $sa – $fach",klassen=>$kl,stand=>($y?"Fassung vom $d.$m.$y":'lt. Dokument'),gueltigkeit=>$gl,institution=>$INST,quelle=>$u,url=>$h,typ=>$ext,hinweis=>$hin); $n++ } }
print $out row(land=>'Sachsen-Anhalt',schulart=>'Berufsbildende Schulen (inkl. Fachgymnasium, Fachoberschule)',stufe=>'Sekundarstufe II',fach=>'Übersicht Lehrpläne, Rahmenrichtlinien und Curricula berufsbildender Bereich',titel=>'Lehrpläne, Rahmenrichtlinien und Curricula für den berufsbildenden Schulbereich (Übersicht)',klassen=>'Sekundarstufe II (beruflich)',gueltigkeit=>'[gültig] Portalübersicht',institution=>$INST,quelle=>'https://lisa.sachsen-anhalt.de/schulqualitaet/lehrplaene-rahmenrichtlinien',url=>"https://www.bildung-lsa.de/informationsportal/unterricht/berufliche_bildung.htm",typ=>'link',hinweis=>'Sonderfall: berufsbildende Schulen nur als Indexeintrag; das Fachgymnasium nutzt für allgemeinbildende Fächer die Fachlehrpläne des Gymnasiums'); $n++;
close $out; print "$n rows\n";
