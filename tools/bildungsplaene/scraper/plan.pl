# plan.pl: reads rows/*.tsv -> jobs.tsv (url \t relpath) + plan.tsv (row + relpath + action)
use utf8; require "./lib.pl"; our $S; use Encode; use URI::Escape (); use Unicode::Normalize qw(NFC);
my $ROOT = shift // die "root";
my %short = ('Sekundarstufe I (Werkrealschule, Hauptschule, Realschule, Gemeinschaftsschule)'=>'Sekundarstufe I (WRS, HS, RS, GMS)');
sub san { my ($s,$max)=@_; $s//=''; $s=NFC($s); $s=$short{$s} // $s; $s=~s/[<>:"\/\|?*\x00-\x1f]+/-/g; $s=~s/\s+/ /g; $s=~s/^[\s.]+|[\s.]+$//g; $s=~s/–/-/g;
  if(length($s)>$max){ $s=substr($s,0,$max); $s=~s/[\s.,;-]+$//; } $s||='_'; return $s; }
my (@rows,%used,%byurl);
for my $f (sort glob("$S/rows/*.tsv")){ open my $h,'<:utf8',$f; while(<$h>){ chomp; next unless length; my @c=split /\t/,$_,-1; push @rows,\@c } }
open my $J,'>:utf8',"$S/jobs.tsv"; open my $P,'>:utf8',"$S/plan.tsv";
my ($nd,$nl,$nx)=(0,0,0);
for my $c (@rows){ my ($land,$sa,$st,$fach,$titel,$kl,$stand,$g,$inst,$q,$url,$typ,$hin,$datei)=@$c; $#$c=12;
  if($g=~/^\[(außer Kraft|Entwurf)/){ print $P join("\t",@$c,'',"nicht heruntergeladen ($1)"),"\n"; $nx++; next }
  my $dir=join('/',san($land,40),san($sa,55),san($st,40),san($fach,60));
  my $key="$land|$url";
  if($byurl{$key}){ print $P join("\t",@$c,$byurl{$key},'siehe Erstablage (Dublette)'),"\n"; next }
  my $fn;
  if($typ eq 'pdf' || $typ eq 'docx' || $typ eq 'doc' || $typ eq 'odt' || $typ eq 'zip'){
    my $b=$url; $b=~s/[?#].*$//; $b=~s{.*/}{}; $b=Encode::decode('UTF-8',URI::Escape::uri_unescape($b)); 
    my $ext = $b=~/\.(pdf|docx?|odt|zip)$/i ? lc $1 : $typ;
    $b=~s/\.(pdf|docx?|odt|zip|html?|php|aspx?|jsp|do)$//i; $b='' if $b=~/^(index|download|file|get|datei|\d+|blob|dokument|document)$/i || length($b)<3;
    $b = $datei || $b || $titel; $b=san($b,90);
    my $room = 245 - length($ROOT) - length($dir) - 6; $room=20 if $room<20; $b=san($b,$room) if length($b)>$room;
    $fn="$b.$ext";
  } else { my $b=san(($datei ? "$datei (Online-Fassung)" : $titel),90); my $room=245-length($ROOT)-length($dir)-6; $room=20 if $room<20; $b=san($b,$room); $fn="$b.url"; }
  my $rel="$dir/$fn"; my $i=2; while($used{lc $rel}){ (my $x=$fn)=~s/(\.\w+)$/_$i$1/; $rel="$dir/$x"; $i++ } $used{lc $rel}=1; $byurl{$key}=$rel;
  if($fn=~/\.url$/){ print $P join("\t",@$c,$rel,'Linkdatei'),"\n"; $nl++ } else { print $J "$url\t$rel\n"; print $P join("\t",@$c,$rel,'Download'),"\n"; $nd++ } }
close $J; close $P; print "rows=",scalar(@rows)," download=$nd links=$nl excluded=$nx\n";
