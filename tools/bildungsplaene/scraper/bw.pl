use utf8; require "./lib.pl"; our $S;
my $B="https://www.bildungsplaene-bw.de/,Lde/";
# --- Inkrafttreten parse
my $ik = text($B."32504784"); my (@E,$sec,$cur);
for my $l (split /\n/,$ik){ if($l=~/^(Grundschule|Sekundarstufe I|Gymnasium|Oberstufe der Gemeinschaftsschule|Weitere Bildungspläne)$/){$sec=$1; next}
  if($l=~/^(\d\d\.\d\d\.\d{4}) (.+)$/ && $sec){ $cur={sec=>$sec,date=>$1,title=>$2,body=>''}; push @E,$cur; next }
  $cur->{body}.=" $l" if $cur; }
my %secmap=(GYM=>'Gymnasium',SEK1=>'Sekundarstufe I',GMSO=>"Oberstufe der Gemeinschaftsschule");
sub norm { my $t=lc shift; $t=~s/\(v[\d.]+\)//g; $t=~s/ vom \d.*$//; $t=~s/ – überarbeitete fassung.*$//; $t=~s/[^a-zäöüß0-9]+/ /g; $t=~s/^ | $//g; $t=~s/\bpraegung\b/prägung/; return $t }
sub ver { my $t=shift; return $1 if $t=~/\((V[\d.]+)\)/; return 'V1' }
my %SA=(GYM=>'Gymnasium',SEK1=>'Sekundarstufe I (Werkrealschule, Hauptschule, Realschule, Gemeinschaftsschule)',GMSO=>'Gemeinschaftsschule (Oberstufe)');
my %PG=(GYM=>'30823695',SEK1=>'32179355',GMSO=>'30877179');
my $fs = { map { my ($code)=$_->[0]=~/(BP2016BW_ALLG_\w+?_\w+)\.V2\.pdf/; $code ? ($code=>$_->[0]) : () } links($B."23967688") };
open my $out,'>:utf8',"$S/rows/BW.tsv"; my @plans;
for my $k (qw(SEK1 GYM GMSO)){
  my %seen;
  for my $L (links($B.$PG{$k})){ my ($u,$t)=@$L; next unless $u=~/(BP2016BW_ALLG_${k}_|GEN2X_BPBW_ALLG_${k}_|23967688)/; next if $seen{"$u|$t"}++;
    my ($code,$v);
    if($u=~/(BP2016BW_ALLG_${k}_\w+?)(\.V2)?$/){ $code=$1; $v=$2?'V2':'V1' }
    elsif($u=~/BPBW_ALLG_${k}_(\w+)\(V3\.0\)/){ $code="BP2016BW_ALLG_${k}_$1"; $v='V3.0' }
    else { $v='V2-2025'; }
    push @plans,{k=>$k,u=>$u,t=>$t,code=>$code,v=>$v}; }
}
# map 2025 V2 Fremdsprachen to codes via title
for my $p (grep { $_->{v} eq 'V2-2025' } @plans){ my $n=norm($p->{t}); my ($m)=grep { $_->{k} eq $p->{k} && $_->{v} eq 'V1' && norm($_->{t}) eq $n } @plans; $m//= (grep { $_->{k} eq $p->{k} && $_->{v} eq 'V1' && index($n,norm($_->{t}))==0 } @plans)[0];
  my %fb=("englisch"=>"E","französisch als dritte fremdsprache"=>"F3","französisch als spät beginnende fremdsprache"=>"F4","französisch als spätbeginnende fremdsprache wahlfach in der oberstufe"=>"F4");
  if($m){ $p->{code}=$m->{code}; $p->{pdf}=$fs->{$m->{code}} } elsif($fb{$n}){ $p->{code}="BP2016BW_ALLG_$p->{k}_$fb{$n}"; $p->{pdf}=$fs->{$p->{code}} } else { warn "no map $p->{k} [$n] $p->{t}\n" } }
for my $p (@plans){ next unless $p->{code}; next if $p->{v} eq "V2-2025"; my $html=get($p->{u}); 
  # PDF
  if(!$p->{pdf} && $html=~/href="([^"]*bpExport[^"]*requestMode=PDF[^"]*)"/){ $p->{pdf}=absu($1,$p->{u}) }
  # classes from TOC
  my $tx=text($p->{u},html=>$html); my @n; my %x;
  while($tx=~/Klassen? (\d{1,2})(?:\s*[\/–-]\s*(\d{1,2}))?/g){ push @n,$1; push @n,$2 if $2 }
  $x{ks}=1 if $tx=~/Kursstufe/; $x{qp}=1 if $tx=~/Qualifikationsphase|Jahrgangsstufe ?[12]\b|J1\/J2/; $x{ep}=1 if $tx=~/Einführungsphase/;
  @n=grep { $_>=1 && $_<=13 } @n; my ($mn,$mx)=(sort {$a<=>$b} @n)[0,-1];
  if($p->{v} eq 'V3.0' && $p->{k} eq 'GYM'){ $mx=13 if $x{qp}||$x{ks}; $mx=11 if !$mx && $x{ep} } else { $mx=12 if $x{ks}||$x{qp} }
  if($p->{k} eq 'GMSO'){ $mn=11 if !$mn || $mn<11; $mx=13 if !$mx || $mx<13 }  # GMS-Oberstufe = 11-13 (G9)
  $mn//=5; $mx//=($p->{k} eq 'SEK1'?10:12); $mn=5 if $mn<5;
  $p->{kl}=[$mn,$mx];
}
# validity
for my $p (@plans){ if($p->{v} eq "V2-2025"){ my ($m)=grep { $_->{code} && $_->{code} eq $p->{code} && $_->{v} eq "V1" && $_->{k} eq $p->{k} } @plans; $p->{kl}=$m->{kl} if $m; }
}
for my $p (@plans){ next unless $p->{code}; my $sec=$secmap{$p->{k}}; my $n=norm($p->{t}); my $vv=$p->{v}; $vv='V2' if $vv eq 'V2-2025';
  my @c=grep { $_->{sec} eq $sec && norm($_->{title}) eq $n } @E; @c=grep { ver($_->{title}) eq $vv } @c if @c;
  my $g = @c ? join(' | ', map {"Verfügung vom $_->{date}: $_->{body}"} @c) : '';
  if(!$g && $vv eq 'V1'){ my ($e)=grep { $_->{sec} eq $sec && $_->{title}=~/^Bildungsplan 2016/ } @E; $g="Verfügung vom $e->{date}: $e->{body}" if $e }
  # newer versions of same Fach
  my @newer=grep { $_->{sec} eq $sec && norm($_->{title}) eq $n && ver($_->{title}) ne $vv && ver($_->{title}) gt $vv } @E;
  $p->{status}='gültig';
  @newer=sort { ver($a->{title}) cmp ver($b->{title}) } @newer; my $first=1;
  for my $e (@newer){ my $b=$e->{body}; $g.=" | Spätere Fassung ".ver($e->{title})." (Verfügung $e->{date}): $b";
    if($first){ $first=0; my $fin = $p->{k} eq "SEK1" ? 10 : $p->{k} eq "GMSO" ? 13 : 12; my $ly = lastyear($b,$fin);
      if(($b=~/außer Kraft/ && $b!~/fortg|letztma|weiterhin|Maßgabe außer Kraft/) || (defined $ly && $ly < 2026)){ $p->{status}="außer Kraft (durch ".ver($e->{title})." ersetzt)" } else { $p->{status}="auslaufend gültig (aufsteigend durch ".ver($e->{title})." abgelöst)" } } }
  if($p->{v} eq 'V3.0' && $g=~/1\. August 2026/){ $p->{status}='gültig (ab 1.8.2026, aufsteigend)' }
  $p->{g}=$g; }
for my $p (@plans){ next unless $p->{code}; my $fach=$p->{t}; $fach=~s/ – Überarbeitete Fassung.*$//; $fach=~s/ vom \d.*$//; $fach=~s/\s*\(V[\d.]+\)//;
  my $stand = $p->{v} eq 'V1' ? 'Bildungsplan 2016 vom 23.03.2016 (V1)' : $p->{t}=~/((?:Überarbeitete )?Fassung vom [^()]+\(V[\d.]+\))/ ? $1 : $p->{v} eq 'V2-2025' ? 'Fassung vom 10. März 2025 (V2)' : $p->{v};
  my $url = $p->{pdf} || $p->{u}; my $typ = $p->{pdf} ? 'pdf' : 'html';
  my $hin = $p->{pdf} ? "Online-Fassung: $p->{u}" : 'Nur als HTML-Online-Fassung im Bildungsplanportal veröffentlicht (keine PDF-Ausgabe angeboten)';
  $hin.=' | Gemeinsamer Plan für Werkrealschule/Hauptschule, Realschule, Gemeinschaftsschule und Schulen besonderer Art (Niveaus G/M/E)' if $p->{k} eq 'SEK1';
  my ($mn,$mx)=@{$p->{kl}};
  print $out row(land=>'Baden-Württemberg',schulart=>$SA{$p->{k}},stufe=>($mn==$mx?"Klasse $mn":"Klassen $mn-$mx"),fach=>$fach,titel=>"Bildungsplan 2016 – $SA{$p->{k}} – $p->{t}",klassen=>($mn==$mx?"Klasse $mn":"Klassen $mn–$mx").($p->{k} eq 'GYM' && $p->{v} eq 'V3.0' ? ' (G9)':''),stand=>$stand,gueltigkeit=>"[$p->{status}] $p->{g}",institution=>'Kultusministerium Baden-Württemberg / ZSL (bildungsplaene-bw.de)',quelle=>$B.$PG{$p->{k}},url=>$url,typ=>$typ,hinweis=>$hin,datei=>$p->{code}.($p->{v} eq "V1"?"":".".($p->{v}=~s/-2025//r)));
}
close $out; print scalar(@plans)," plans\n";
sub lastyear { my ($b,$fin)=@_;
  if($b=~/(?:letztmal\w*|fortg\w*)[^.]*?(vor dem )?Schuljahr (\d{4})\/\d{2,4} (?:in )?die Klassen? (\d+)[^.]*?(eintreten|eingetreten)/){ my ($vor,$y,$n)=($1,$2,$3); $y-- if $vor; return $y + ($fin-$n) }
  return undef }
