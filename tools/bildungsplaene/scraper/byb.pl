use utf8; require "./lib.pl"; our $S;
my $I="https://www.isb.bayern.de/schularten/berufliche-schulen";
open my $out,'>:utf8',"$S/rows/BY_beruf.tsv"; my ($n,%seen)=(0);
for my $p (["$I/berufsschule/allgemeinbildende-lehrplaene/",'Berufsschule (allgemeinbildende Fächer)'],["$I/berufsfachschule/allgemeinbildendene-lehrplaene/",'Berufsfachschule (allgemeinbildende Fächer)'],["$I/berufsfachschule/lehrplan/",'Berufsfachschule']){
  my ($u,$sa)=@$p;
  for my $l (links($u)){ my ($h,$t)=@$l; next unless $h=~/\.pdf$/i; next if $seen{"$sa|$h"}++; $t=~s/\s*\(PDF,[^)]*\)?\s*$//; my $gl='[gültig] auf der Seite des ISB als geltender Lehrplan geführt';
    if($t=~s/\s*\((auslaufend gültig bis (?:Ende )?Schuljahr (\d{4})\/(\d\d))\)//){ $gl = $2<2026 ? "[außer Kraft] $1" : "[auslaufend gültig] $1" }
    elsif($t=~s/\s*\((aufsteigend gültig ab Schuljahr (\d{4})\/(\d\d))\)//){ $gl = $2>2026 ? "[in Kraft ab Schuljahr $2/$3] $1" : "[gültig] $1" }
    my ($fach)=$t; my $kl='Sekundarstufe II (berufliche Schule)'; $kl='Jahrgangsstufe 10' if $t=~/10\. Jahrgangsstufe/; $kl='Jahrgangsstufen 11–12' if $t=~/11\. und 12\./;
    print $out row(land=>'Bayern',schulart=>$sa,stufe=>'Sekundarstufe II',fach=>$fach,titel=>"Lehrplan $sa – $t",klassen=>$kl,stand=>'lt. Dokument',gueltigkeit=>$gl,institution=>'Staatsinstitut für Schulqualität und Bildungsforschung (ISB) Bayern',quelle=>$u,url=>$h,typ=>'pdf',hinweis=>''); $n++ } }
close $out; print "$n rows\n";
