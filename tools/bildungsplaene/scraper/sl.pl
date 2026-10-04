use utf8; require "./lib.pl"; our $S;
my $B="https://www.saarland.de/mbk/DE/portale/bildungsserver/schulen-und-bildungswege/lehrplaene";
my $INST='Ministerium für Bildung und Kultur Saarland (Bildungsserver Saarland)';
open my $out,'>:utf8',"$S/rows/SL.tsv"; my ($n,%seen)=(0);
my @P=( ["$B/lehrplaene.allgemeinbildende/gymnasium.lehrplaene",'GYM'], ["$B/lehrplaene.allgemeinbildende/gymnasiale-oberstufe.lehrplaene",'GOS'],
        ["$B/lehrplaene.allgemeinbildende/gemeinschaftsschule.lehrplaene",'GEMS'], ["$B/lehrplaene.schulformuebergreifend/lehrplaene-schulformuebergreifend_node",'UEB'],
        ["$B/lehrplaene.berufliche/fos-lp",'FOS'], ["$B/lehrplaene.berufliche/gos-lp",'BGOS'] );
sub kl { my $t=shift; return ($1,$2) if $t=~/Klass\w*stufen?\s+(\d+)\s*(?:und|bis|-|–)\s*(\d+)/i; return ($1,$1) if $t=~/Klass\w*stufe\s+(\d+)/i; return () }
my @items;
for my $p (@P){ my ($u,$k)=@$p;
  for my $l (links($u)){ my ($h,$t,$ti,$cx,$hd)=@$l; next unless $h=~/SharedDocs\/Downloads/; my $key=$h=~s/\?.*//r; next if $seen{"$k|$key"}++; $t=~s/\s*\((?:PDF|DOCX?|ODT)[^)]*\)?.*$//i; $t=~s/\s+/ /g; $t=~s/^\s+|\s+$//g; next unless $t;
    my ($ext)= $key=~/\.(\w+)$/; $ext=lc($ext//'pdf');
    my $fach=$hd||''; $fach='' if $fach=~/^(Handreichungen?|Inhaltsverzeichnis|Lehrpläne.*|Fachoberschulen|Gymnasiale Oberstufe.*|Abiturlektüren|Allgemeine.*|Berufliche.*)$/i;
    my @SUBJ=('Allgemeine Ethik','Bildende Kunst','Darstellendes Spiel','Evangelische Religion','Katholische Religion','Herkunftssprachlicher Unterricht','Beruf und Wirtschaft','Lernen lernen','Sprachbildender Unterricht','Betriebswirtschaftslehre','Volkswirtschaftslehre','Wirtschaftslehre','Rechnungswesen','Gesellschaftswissenschaften','Naturwissenschaften','Erziehungswissenschaft','Biologie','Chemie','Deutsch','Englisch','Erdkunde','Französisch','Geschichte','Griechisch','Informatik','Italienisch','Latein','Mathematik','Musik','Physik','Politik','Sozialkunde','Spanisch','Sport','Philosophie','Technologie','Technik','Arbeitslehre','Russisch','Chinesisch','Portugiesisch','Türkisch','Psychologie','Pädagogik','Gesundheit','Sozialwesen','Gestaltung','Ernährung','Astronomie','Ethik');
    { my ($best,$bp); if($t=~/im Fach ([A-ZÄÖÜ][\wäöüß]+(?: [A-ZÄÖÜ][\wäöüß]+)?)/){ $best=$1 } else { for my $s (@SUBJ){ my $i=index(lc $t,lc $s); if($i>=0 && (!defined $bp || $i<$bp || ($i==$bp && length($s)>length($best)))){ ($best,$bp)=($s,$i) } } } $fach=$best if $best; $fach=~s/Religionslehre$/Religion/; $fach=~s/^(Evangelische|Katholische) Religion.*/$1 Religion/; }
    if(!$fach){ ($fach=$t)=~s/^Lehrplan\s+//; $fach=~s/\s*\(\d{4}\).*$//; $fach=~s/\s+(Klassenstufe|Einführungsphase|Hauptphase|für die|der Fachoberschule).*$//i; $fach=substr($fach,0,60); $fach||='Allgemein' }
    $fach='Deutsch' if $t=~/^(Lehrplanelement|Übersicht Abiturlektüre)/; $fach='Naturwissenschaften' if $fach=~/^Naturwis/; $fach=~s/ APA$//;
    $fach='Geschichte (Handreichungen)' if $t!~/Lehrplan/ && $hd=~/^Handreichung/ && $k eq 'GYM';
    push @items,{k=>$k,u=>$u,h=>$h,t=>$t,fach=>$fach,ext=>$ext,path=>$key} } }
# newest year per (k,fach) for GemS supersession
my %maxy; for my $it (@items){ my ($y)=$it->{t}=~/\((20\d\d)\)/; $y//=($it->{path}=~/_(20\d\d)\./)[0]; $it->{y}=$y//0; my $kk="$it->{k}|$it->{fach}"; $maxy{$kk}=$it->{y} if $it->{y}>($maxy{$kk}//0) }
for my $it (@items){ my ($k,$t,$fach)=@$it{qw(k t fach)}; my ($a,$b)=kl($t); my ($sa,$st,$kl,$gl);
  my $isg9 = $t=~/neunjährig/i || $it->{path}=~/neunjaehrig/;
  my $gos = $k eq 'GOS' || $it->{path}=~/GOS_ab_2019/ || $t=~/Oberstufe|Einführungsphase|Hauptphase|Abitur/;
  if($k eq 'FOS'){ $sa='Fachoberschule'; $st='Klassen 11-12'; $kl='Fachoberschule (Klassenstufen 11–12)' }
  elsif($k eq 'BGOS'){ $sa='Gymnasiale Oberstufe mit berufsbezogener Fachrichtung (Berufliches Oberstufengymnasium)'; $st='Klassen 11-13'; $kl='Einführungs- und Hauptphase' }
  elsif($k eq 'UEB'){ $sa='Schulformübergreifend'; $st=$a ? ($a==$b?"Klasse $a":"Klassen $a-$b") : 'Klassen 5-13'; $kl=$a ? "Klassenstufen $a–$b" : 'schulformübergreifend' }
  elsif($gos){ $sa='Gymnasiale Oberstufe (Gymnasium, Gemeinschaftsschule)'; if($t=~/Einführungsphase/){ $st='Einführungsphase'; $kl='Einführungsphase (G8: Klassenstufe 10; Gemeinschaftsschule: 11)' } elsif($t=~/Hauptphase|Grundkurs|Leistungskurs/){ $st='Hauptphase'; $kl='Hauptphase (G8: Klassenstufen 11–12; Gemeinschaftsschule: 12–13)' } else { $st='Einführungs- und Hauptphase'; $kl='Gymnasiale Oberstufe (Einführungs- und Hauptphase)' } }
  elsif($k eq 'GEMS'){ $sa='Gemeinschaftsschule (Sek I)'; ($a,$b)=(5,10) unless $a; $st=$a==$b?"Klasse $a":"Klassen $a-$b"; $kl="Klassenstufen $a–$b".($t=~/Grundebene/?' (Grundebene)':$t=~/Erweiterung/?' (Erweiterungs-/Aufbauebene)':'') }
  elsif($isg9){ $sa='Gymnasium – neunjährig (G9)'; ($a,$b)=(5,10) unless $a; $st=$a==$b?"Klasse $a":"Klassen $a-$b"; $kl="Klassenstufen $a–$b (G9)" }
  else { $sa='Gymnasium – achtjährig (G8)'; ($a,$b)=(5,9) unless $a; $st=$a==$b?"Klasse $a":"Klassen $a-$b"; $kl="Klassenstufen $a–$b (G8)" }
  $gl='[gültig] auf dem Bildungsserver Saarland als geltender Lehrplan geführt';
  if($gos){
    if($t=~/(?:für das |für )?Abitur(?:jahrg\w*)?\s+(\d{4})\s+und\s+(\d{4})/i && $t!~/\bab\b/){ $gl = $2<=2026 ? "[außer Kraft] galt für die Abiturjahrgänge $1 und $2" : "[auslaufend gültig] für die Abiturjahrgänge $1 und $2" }
    elsif($t=~/für (?:das )?Abitur (\d{4})(?!\s*(?:ff|und|-))/ && $t!~/\bab\b/){ $gl = $1<=2026 ? "[außer Kraft] galt für den Abiturjahrgang $1" : "[gültig] für den Abiturjahrgang $1" }
    elsif($t=~/ab (?:dem )?Abitur(?:jahrgang)?\s*(\d{4})/i){ $gl="[gültig] ab Abiturjahrgang $1" }
    elsif($t=~/Abitur(?:prüfungsjahre)?\s+(\d{4})/){ $gl="[gültig] Bezug: Abitur $1 ff. (lt. Titel)" } }
  elsif($sa=~/G8/){ $gl='[auslaufend gültig] G8-Lehrplan; das neunjährige Gymnasium wird seit 2023/24 aufsteigend eingeführt – gilt nur noch für G8-Jahrgänge' }
  elsif($sa=~/G9/ && $a){ my $sy=2023+($a-5); $gl = $sy>2026 ? "[gültig – veröffentlicht] G9-Lehrplan; Anwendung, sobald der erste G9-Jahrgang (Eintritt Kl. 5 im Schuljahr 2023/24) die Klassenstufe $a erreicht (voraussichtlich $sy/".($sy+1).")" : "[gültig] G9-Lehrplan (G9 aufsteigend seit 2023/24)" }
  elsif($k eq 'GEMS' && $it->{y} && $maxy{"$k|$fach"}>$it->{y} && $maxy{"$k|$fach"}>=2025){ $gl="[auslaufend gültig] bisheriger Lehrplan; durch neue Lehrpläne (".$maxy{"$k|$fach"}.") aufsteigend abgelöst" }
  elsif($k eq 'GEMS' && !$it->{y} && $maxy{"$k|$fach"}>=2025 && $t=~/^Lehrplan/){ $gl="[auslaufend gültig] älterer Lehrplan; neue Lehrpläne (".$maxy{"$k|$fach"}.") werden aufsteigend eingeführt" }
  if($t=~/Schuljahren? (\d{4})\/\d+ bis (\d{4})\/(\d+)/ && $2<2026){ $gl="[außer Kraft] galt bis Schuljahr $2/$3" }
  my $hin = $t=~/Prüfungsanforderungen|APA/ ? 'Allgemeine Prüfungsanforderungen (Abitur)' : $t=~/Lehrplanelement|Lektüre/ ? 'Lehrplanelement/Abiturlektüre (verbindliche Ergänzung)' : $t=~/Handreichung|Hinweis|Leitlinien|Themen/ ? 'Ergänzendes Dokument' : '';
  print $out row(land=>'Saarland',schulart=>$sa,stufe=>$st,fach=>$fach,titel=>$t,klassen=>$kl,stand=>($it->{y}?"Lehrplan $it->{y}":'lt. Dokument'),gueltigkeit=>$gl,institution=>$INST,quelle=>$it->{u},url=>$it->{h},typ=>$it->{ext},hinweis=>$hin,datei=>$t); $n++ }
for my $x (['berufsschule-lp','Berufsschule'],['berufsfachschulen-lp','Berufsfachschulen'],['hbfs-lp','Höhere Berufsfachschulen'],['AV_bvj-bgj-bgs-lp/bgj-bgs-lp_node','Ausbildungsvorbereitung']){
  print $out row(land=>'Saarland',schulart=>"Berufliche Schulen – $x->[1]",stufe=>'Sekundarstufe II',fach=>"Übersicht Lehrpläne $x->[1]",titel=>"Lehrpläne $x->[1] Saarland (Übersicht)",klassen=>'Sekundarstufe II (beruflich)',gueltigkeit=>'[gültig] Portalübersicht',institution=>$INST,quelle=>"$B/lehrplaene.berufliche/lehrplaeneberufliche_node",url=>"$B/lehrplaene.berufliche/$x->[0]",typ=>'link',hinweis=>'Sonderfall: berufliche Bildungsgänge nur als Indexeintrag (FOS und berufliche Oberstufe sind als PDF enthalten)'); $n++ }
close $out; print scalar(@items)," items, $n rows\n";
