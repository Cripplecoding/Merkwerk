use strict; use warnings; use utf8; use Digest::MD5 qw(md5_hex); use Encode qw(decode encode);
binmode STDOUT, ':utf8'; binmode STDERR, ':utf8';
use File::Basename qw(dirname); use Cwd qw(abs_path);
our $S = $ENV{BP_WORK} // dirname(abs_path(__FILE__));   # Arbeitsverzeichnis: cache/, rows/, plan.tsv, jobs.tsv
our $UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
my %ent=(nbsp=>' ',amp=>'&',uuml=>'ü',auml=>'ä',ouml=>'ö',Uuml=>'Ü',Auml=>'Ä',Ouml=>'Ö',szlig=>'ß',ndash=>'–',mdash=>'—',quot=>'"',lt=>'<',gt=>'>',shy=>'',bdquo=>'„',ldquo=>'“',rdquo=>'”',sbquo=>'‚',lsquo=>'‘',rsquo=>'’',eacute=>'é',egrave=>'è',hellip=>'…',middot=>'·',apos=>"'",laquo=>'«',raquo=>'»',sect=>'§',euro=>'€',ccedil=>'ç',agrave=>'à',aacute=>'á',iacute=>'í',oacute=>'ó',uacute=>'ú',ntilde=>'ñ');
sub dec { my $s=shift; return '' unless defined $s; $s=~s/&(\w+);/exists $ent{$1}?$ent{$1}:"&$1;"/ge; $s=~s/&#(\d+);/chr($1)/ge; $s=~s/&#x([0-9a-f]+);/chr(hex $1)/gie; $s=~s/\x{AD}//g; $s=~s/\x{200B}//g; $s=~s/\s+/ /g; $s=~s/^ | $//g; return $s; }
sub get { my ($u,%o)=@_; my $f="$S/cache/".substr(md5_hex(encode('UTF-8',$u.($o{post}//''))),0,16).".html";
  if(!-s $f || $o{fresh}){ my $tmp="$f.tmp"; my $w=`cygpath -w "$tmp"`; chomp $w;
    for my $try (1..3){ my $code;
      { my @a=('curl','-sSL','--compressed','-m','120','-A',$UA,'-H','Accept: text/html,application/xhtml+xml,*/*;q=0.8','-H','Accept-Language: de-DE,de;q=0.9','-o',$tmp,'-w','%{http_code}'); push @a,('--data',$o{post}) if $o{post}; push @a,$u; open my $p,'-|',@a; $code=<$p>//''; close $p; }
      if($code ne '200' || !-s $tmp){ unlink $tmp; my @b=("/c/Windows/System32/curl.exe","-sSL","--compressed","-m","120","-A",$UA,"-H","Accept: text/html,application/xhtml+xml,*/*;q=0.8","-H","Accept-Language: de-DE,de;q=0.9","-o",$w,'-w','%{http_code}'); push @b,("--data",$o{post}) if $o{post}; push @b,$u; open my $p,'-|',@b; $code=<$p>//''; close $p; }
      if($code eq '200' && -s $tmp){ rename $tmp,$f; last } unlink $tmp; warn "get: HTTP $code for $u (Versuch $try)\n"; last if $code=~/^(400|404|410)$/; sleep 2*$try; } }
  open my $h,'<:raw',$f or return ''; local $/; my $c=<$h>; close $h; $c//='';
  my $d = eval { decode('UTF-8',$c,Encode::FB_CROAK) }; $d = decode('cp1252',$c) unless defined $d; return $d; }
sub absu { my ($h,$base)=@_; $h=~s/&amp;/&/g; $h=~s/^\s+|\s+$//g; return $h if $h=~m{^https?:}i; return '' if $h=~/^(mailto|javascript|tel|#)/i;
  my ($o)=$base=~m{^(https?://[^/]+)}; return "https:$h" if $h=~m{^//}; return "$o$h" if $h=~m{^/}; (my $d=$base)=~s{[?#].*$}{}; $d=~s{[^/]*$}{}; $h=~s{^\./}{}; while($h=~s{^\.\./}{}){ $d=~s{[^/]+/$}{} } return "$d$h"; }
sub links { my ($u,%o)=@_; my $c= $o{html} // get($u,%o); my @r;
  while($c=~/<a\b([^>]*)>(.*?)<\/a>/gis){ my($a,$t)=($1,$2); my $pos=$-[0]; next unless $a=~/href\s*=\s*["']([^"']+)["']/i; my $h=absu($1,$u); next unless $h; my $ti=''; $ti=$1 if $a=~/title\s*=\s*["']([^"']*)["']/i; $t=~s/<[^>]+>/ /g;
    my $st=$pos>4000?$pos-4000:0; my $pre=substr($c,$st,$pos-$st); my $ctx='';
    if($pre=~/.*(<(?:tr|li|p|h[1-6]|dt)\b.*)$/is){ $ctx=$1; $ctx=~s/<a\b.*?<\/a>//gis; $ctx=~s/<[^>]+>/ /g; $ctx=dec($ctx) }
    my $hd=''; if($pre=~/.*<h[1-6]\b[^>]*>(.*?)<\/h[1-6]>/is){ $hd=$1; $hd=~s/<[^>]+>/ /g; $hd=dec($hd) }
    push @r,[$h,dec($t),dec($ti),$ctx,$hd]; } return @r; }
sub text { my ($u,%o)=@_; my $c= $o{html} // get($u,%o); $c=~s/<script.*?<\/script>//gis; $c=~s/<style.*?<\/style>//gis; $c=~s/<(br|p|div|li|h\d|tr|dt|dd|section|article)\b[^>]*>/\n/gi; $c=~s/<[^>]+>//g; my @l=map { dec($_) } split /\n/,$c; return join("\n", grep { length } @l); }
sub row { my %r=@_; my @c=qw(land schulart stufe fach titel klassen stand gueltigkeit institution quelle url typ hinweis datei);
  return join("\t", map { my $v=$r{$_}//''; $v=~s/[\t\r\n]+/ /g; $v } @c)."\n"; }
1;
sub h1 { my $c=shift; return dec($1=~s/<[^>]+>/ /gr) if $c=~/<h1\b[^>]*>(.*?)<\/h1>/is; return dec($1) if $c=~/<title>(.*?)<\/title>/is; '' }
# crawl: BFS; opts: depth, follow (regex on url), skip (hashref of urls), docre (regex for documents)
sub crawl { my ($start,%o)=@_; my $docre=$o{docre}//qr/\.(pdf|docx?|odt|zip)(\?|$)/i; my %seen=%{$o{skip}//{}}; delete $seen{$start}; my @q=([$start,0,undef]); my (%pg,@docs,%dseen);
  while(my $it=shift @q){ my ($u,$d,$par)=@$it; next if $seen{$u}++; my $c=get($u); my $t=h1($c); $pg{$u}={title=>$t,depth=>$d,parent=>$par};
    for my $L (links($u,html=>$c)){ my ($h,$tx,$ti,$cx,$hd)=@$L; $h=~s/#.*$//; next unless $h;
      if($h=~$docre){ push @docs,{url=>$h,text=>$tx||$ti,page=>$u,ctx=>$cx,hd=>$hd} unless $dseen{"$h|$u"}++; next }
      next if $d>=($o{depth}//2); next unless $h=~$o{follow}; next if $o{nofollow} && $h=~$o{nofollow}; push @q,[$h,$d+1,$u] unless $seen{$h}; } }
  return (\%pg,\@docs); }
sub chain { my ($pg,$u)=@_; my @c; while($u && $pg->{$u}){ unshift @c,$pg->{$u}{title}; $u=$pg->{$u}{parent} } return @c }
1;
# table rows: returns list of {cells=>[text...], links=>[[href,text],...]}
sub trows { my ($u,%o)=@_; my $c=$o{html}//get($u); my @r;
  while($c=~/<tr\b[^>]*>(.*?)<\/tr>/gis){ my $tr=$1; my @cells; while($tr=~/<t[dh]\b[^>]*>(.*?)<\/t[dh]>/gis){ my $x=$1; $x=~s/<br\s*\/?>/ /gi; $x=~s/<[^>]+>/ /g; push @cells,dec($x) }
    my @l=map { [$_->[0],$_->[1]] } links($u,html=>$tr); push @r,{cells=>\@cells,links=>\@l}; } return @r; }
1;
