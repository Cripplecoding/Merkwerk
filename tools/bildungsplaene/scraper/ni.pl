use utf8; require "./lib.pl"; our $S;
my $B="https://cuvo.nibis.de/index.php";
my $INST='Niedersächsisches Kultusministerium / NLQ (NiBiS – Curriculare Vorgaben, CuVo)';
my %KEEP=map {$_=>1} ('Kerncurriculum','Rahmenrichtlinien','Curriculare Vorgaben','Hinweise zum Kerncurriculum');
open my $out,'>:utf8',"$S/rows/NI.tsv"; my ($n,%seen)=(0);
my %sek1=map {$_=>1} ('Hauptschule','Realschule','Oberschule','Gymnasium-Sek.I','Integrierte Gesamtschule','Kooperative Gesamtschule','Sekundarbereich I','Sekundarbereich I für Gymnasien und Gesamtschulen','Förderschule','alle');
for my $bereich ('Sek I','Sek II'){
  my $q=$bereich=~s/ /+/r; my $lu="$B?k0_1000o=Dokumentenart&v0_1000o=&k0_1001o=Schulbereich&v0_1001o=$q&k0_1002o=Schulform&v0_1002o=&k0_1003o=Fach&v0_1003o=&p=search";
  for my $r (trows($lu)){ my @c=@{$r->{cells}}; next unless @c>=7 && $KEEP{$c[1]}; my ($det)=grep { $_->[0]=~/detail_view/ } @{$r->{links}}; next unless $det; my ($id)=$det->[0]=~/docid=(\d+)/; next if $seen{$id}++;
    my $du="$B?p=detail_view&docid=$id"; my $html=get($du); my %f; for my $dr (trows($du,html=>$html)){ my @d=@{$dr->{cells}}; $f{$d[0]}=$d[1] if @d>=2 }
    my $tx=text($du,html=>$html); my ($fb)=$tx=~/
Schulform
(.*?)
Fach
/s; my @forms=grep { length } split /
/, ($fb//'');
    next unless grep { $sek1{$_} || /Oberstufe|Berufliches Gymnasium|Abendgymnasium|Kolleg|Sekundarbereich II/ } @forms;
    next if !grep { $_ ne 'Förderschule' && !/^Förderschule/ } @forms;
    my @dl; while($html=~/href="([^"]*p=download&(?:amp;)?upload=\d+)"[^>]*>(.*?)<\/a>\s*\(?([^()<]*\.\w{2,4})?\)?/gis){ push @dl,[absu($1,$B),$3] }
    if(!@dl){ my @ul=grep { $_->[0]=~/upload=\d+/ } links($du,html=>$html); my @names = $f{Downloads}=~/\(([^)]+\.\w{2,4})\)/g; for my $i (0..$#ul){ push @dl,[$ul[$i][0],$names[$i]] } }
    my ($ab)=($f{'gültig ab'}//'')=~/(\d\d\.\d\d\.\d{4})/; my ($bis)=($f{'gültig bis'}//'')=~/(\d\d\.\d\d\.\d{4})/;
    my $iso=sub { my ($d,$m,$y)=split /\./,shift; "$y$m$d" };
    my $gl;
    if($bis && $iso->($bis) lt '20261003'){ $gl="[außer Kraft] gültig bis $bis" }
    elsif($ab && $iso->($ab) gt '20261003'){ $gl="[in Kraft ab $ab]" }
    else { $gl = '[gültig]'.($ab?" gültig ab $ab":'').($bis?", gültig bis $bis (auslaufend)":'') }
    $gl.='; Hinweis: '.$f{Hinweis} if $f{Hinweis};
    my $titel=$f{Titel}//$c[0]; my $fach=$f{Fach}//$c[3]; $fach||='Allgemein'; next if $titel=~/Förderschule|Förderschwerpunkt/i;
    if($fach=~/^keinem Fach/ || scalar(split /\s+/,$fach)>6){ $fach='Fächerübergreifend' } elsif($fach eq 'Biologie Chemie Naturwissenschaften Physik'){ $fach='Naturwissenschaften (Biologie, Chemie, Physik)' } elsif($fach eq 'Politik Politik-Wirtschaft Wirtschaft'){ $fach='Politik-Wirtschaft' }
    my ($sa,$st,$kl);
    my @s1=grep { $sek1{$_} && $_ ne 'Förderschule' && $_ ne 'alle' } @forms; my @s2=grep { /Oberstufe|Berufliches Gymnasium|Abendgymnasium|Kolleg|Sekundarbereich II/ } @forms;
    if(@s1 && !@s2){ my @core=grep { !/^Sekundarbereich/ } @s1;
      $sa = @core>=3 ? 'Sekundarbereich I (schulformübergreifend)' : @core ? join(', ',map { s/Gymnasium-Sek\.I/Gymnasium (Sek I)/r } @core) : ($s1[0]=~/Gymnasien/ ? 'Gymnasium und Gesamtschule (Sek I)' : 'Sekundarbereich I (schulformübergreifend)');
      $st='Klassen 5-10'; $kl='Schuljahrgänge 5–10 ('.join(', ',@forms).')';
    } elsif(@s2 && !@s1){ $sa = (grep { /Berufliches Gymnasium/ } @s2) && !(grep { /Gymnasium$|Gesamtschule$|^Gymnasiale Oberstufe$/ } @s2) ? 'Berufliches Gymnasium' : 'Gymnasiale Oberstufe'; $st='Klassen 11-13'; $kl='Einführungs- und Qualifikationsphase ('.join(', ',@forms).')';
    } else { $sa='Sekundarbereich I und II (schulformübergreifend)'; $st='Klassen 5-13'; $kl='('.join(', ',@forms).')' }
    $titel=~s/\s+/ /g;
    my $k=0; for my $d (@dl){ my ($u,$nm)=@$d; $nm//=''; my ($ext)=$nm=~/\.(\w+)$/; $ext=lc($ext//'pdf'); next unless $ext=~/^(pdf|docx?|zip|odt)$/; (my $base=$nm)=~s/\.\w+$//; $k++;
      print $out row(land=>'Niedersachsen',schulart=>$sa,stufe=>$st,fach=>$fach,titel=>$titel.(@dl>1?" (Datei $k)":''),klassen=>$kl,stand=>($ab?"gültig ab $ab":'').($nm?"; Datei $nm":''),gueltigkeit=>$gl,institution=>$INST,quelle=>$du,url=>$u,typ=>$ext,hinweis=>"Dokumentenart: $f{Dokumentenart}",datei=>$base); $n++ }
    if(!$k && $f{Link}){ print $out row(land=>'Niedersachsen',schulart=>$sa,stufe=>$st,fach=>$fach,titel=>$titel,klassen=>$kl,stand=>($ab?"gültig ab $ab":''),gueltigkeit=>$gl,institution=>$INST,quelle=>$du,url=>$f{Link},typ=>'link',hinweis=>"Dokumentenart: $f{Dokumentenart}; nur als externer Link"); $n++ }
  } }
print $out row(land=>'Niedersachsen',schulart=>'Berufsbildende Schulen',stufe=>'Sekundarstufe II',fach=>'Übersicht Rahmenrichtlinien berufsbildende Schulen',titel=>'Rahmenrichtlinien und curriculare Vorgaben für berufsbildende Schulen (NLQ/NiBiS)',klassen=>'Sekundarstufe II (beruflich)',gueltigkeit=>'[gültig] Portalübersicht',institution=>'Niedersächsisches Kultusministerium / NLQ',quelle=>'https://bildungsportal-niedersachsen.de/berufliche-bildung/rechtliche-vorgaben',url=>'https://bildungsportal-niedersachsen.de/berufliche-bildung/rechtliche-vorgaben',typ=>'link',hinweis=>'Sonderfall: berufsbildende Schulen (außer Berufliches Gymnasium) nur als Indexeintrag'); $n++;
close $out; print "$n rows\n";
