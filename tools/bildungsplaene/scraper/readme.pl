use utf8; use strict; use JSON::PP; binmode STDOUT,':utf8';
my ($ROOT,$tpl,$notes)=@ARGV;
local $/; open my $j,'<:raw',"$ROOT/Master-Index_Bildungsplaene.json" or die; my $d=JSON::PP->new->utf8->decode(<$j>); close $j;
my (%L,%T);
for my $e (@{$d->{eintraege}}){ my $l=$e->{land}; my $a=$e->{ablage};
  my $k = $a=~/^heruntergeladen/ ? 'pdf' : $a=~/^Linkdatei/ ? 'link' : $a=~/^Dublette/ ? 'dup' : $a=~/fehlgeschlagen|ausstehend/ ? 'fail' : 'excl';
  $L{$l}{$k}++; $T{$k}++; $L{$l}{n}++; $T{n}++;
  $L{$l}{aus}++ if $e->{status}=~/auslaufend/; $L{$l}{kuenftig}++ if $e->{status}=~/künftig/; }
my $size=`du -sk "$ROOT"`; ($size)=$size=~/^(\d+)/; $size=sprintf('%.1f GB',$size/1024/1024); $size=~s/\./,/;
my $tab="| Land | Einträge | heruntergeladen | Linkdateien | Dubletten-Verweise | Download offen | nicht abgelegt | davon auslaufend | künftig in Kraft |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n";
for my $l (sort keys %L){ my $h=$L{$l}; $tab.="| $l | $h->{n} | ".join(' | ',map { $h->{$_}//0 } qw(pdf link dup fail excl aus kuenftig))." |\n" }
open my $t,'<:utf8',$tpl or die; my $s=<$t>; close $t; open my $n,'<:utf8',$notes or die; my $nt=<$n>; close $n;
my %v=(N_ALL=>$T{n},N_PDF=>$T{pdf}//0,N_LINK=>$T{link}//0,N_DUP=>$T{dup}//0,N_FAIL=>$T{fail}//0,N_EXCL=>$T{excl}//0,SIZE=>$size,LANDTABELLE=>$tab,LANDNOTIZEN=>$nt);
$s=~s/\{\{(\w+)\}\}/exists $v{$1} ? $v{$1} : "{{$1}}"/ge;
open my $o,'>:utf8',"$ROOT/README.md" or die; print $o $s; close $o;
print "README: $T{n} Einträge | $v{N_PDF} Downloads | $v{N_LINK} Links | $v{N_DUP} Dubletten | $v{N_FAIL} offen | $v{N_EXCL} nicht abgelegt | $size\n";
