# minimal PDF text extractor: FlateDecode streams, ToUnicode CMaps, Tj/TJ/'/" operators
use strict; no warnings; use Compress::Zlib; binmode STDOUT,':utf8';
local $/; my $f=shift; open my $h,'<:raw',$f or die; my $pdf=<$h>; close $h;
my %obj; while($pdf=~/(\d+)\s+0\s+obj\b(.*?)endobj/gs){ $obj{$1}=$2 }
sub stream { my $o=shift; return undef unless $o=~/^(.*?)stream\r?\n(.*)endstream/s; my ($d,$s)=($1,$2); $s=~s/\r?\n$//; if($d=~/FlateDecode/){ my $x=uncompress($s); if(!defined $x){ my ($i)=inflateInit(); ($x)=$i->inflate($s) if $i } return $x } return $s }
# object streams
for my $k (keys %obj){ my $o=$obj{$k}; next unless $o=~/\/Type\s*\/ObjStm/; my ($n)=$o=~/\/N\s+(\d+)/; my ($fst)=$o=~/\/First\s+(\d+)/; my $s=stream($o) // next; my @h=split ' ', substr($s,0,$fst); for(my $i=0;$i<@h;$i+=2){ my $st=$fst+$h[$i+1]; my $en= $i+3<@h ? $fst+$h[$i+3] : length($s); $obj{$h[$i]}//=substr($s,$st,$en-$st) } }
# cmaps per font object
my %cmap; # fontobj -> {code=>uni}
for my $k (keys %obj){ my $o=$obj{$k}; next unless $o=~/\/ToUnicode\s+(\d+)\s+0\s+R/; my $cm=stream($obj{$1}//'') // next; my %m;
  while($cm=~/beginbfchar(.*?)endbfchar/gs){ my $b=$1; while($b=~/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g){ $m{hex $1}=u16($2) } }
  while($cm=~/beginbfrange(.*?)endbfrange/gs){ my $b=$1; while($b=~/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<([0-9a-fA-F]+)>|\[([^\]]*)\])/g){ my ($a,$z)=(hex $1,hex $2); if(defined $4){ my $v=hex $4; for my $c ($a..$z){ $m{$c}=chr($v+$c-$a) } } else { my @l=$5=~/<([0-9a-fA-F]+)>/g; for my $c ($a..$z){ $m{$c}=u16(shift @l // '') } } } }
  my ($two)= $cm=~/<0000>\s*<FFFF>/ ? 1 : 0; $cmap{$k}={m=>\%m,two=>$two}; }
sub u16 { my $x=shift; my $s=''; while($x=~/([0-9a-fA-F]{4})/g){ $s.=chr(hex $1) } $s=chr(hex $x) if !length $s && length $x; return $s }
# map font resource names -> font obj (global, last wins)
my %fname; for my $k (keys %obj){ while($obj{$k}=~/\/(F\w*|TT\w*|C\d\w*|R\d+|T\d\w*)\s+(\d+)\s+0\s+R/g){ $fname{$1}=$2 if $obj{$2} && $obj{$2}=~/\/Type\s*\/Font/ } }
my $win=sub { my $s=shift; my %w=(0x80=>'€',0x84=>'„',0x93=>'“',0x94=>'”',0x96=>'–',0x97=>'—',0x91=>'‘',0x92=>'’',0x85=>'…',0x95=>'•'); join '', map { $w{ord $_} // $_ } split //,$s };
my $out='';
for my $k (sort { $a<=>$b } keys %obj){ my $o=$obj{$k}; next if $o=~/\/Type\s*\/(XObject|ObjStm|XRef|Metadata)/ || $o=~/\/Subtype\s*\/(Image|Type1C|CIDFontType0C|OpenType)/ || $o=~/\/Length1/; my $s=stream($o) // next; next unless $s=~/\bBT\b/;
  my $font; 
  while($s=~/\/([^\s\/]+)\s+[\d.]+\s+Tf|(\((?:\.|[^\)])*\)|<[0-9a-fA-F\s]*>)\s*(?:Tj|'|")|\[((?:\.|[^\]])*)\]\s*TJ|(T\*|Td|TD|ET)\b/gs){
    if(defined $1){ $font=$fname{$1}; next } if(defined $4){ $out.= $4 eq 'TD'||$4 eq 'T*'||$4 eq 'ET' ? "\n" : " "; next }
    my @parts; if(defined $2){ @parts=($2) } else { my $a=$3; while($a=~/(\((?:\.|[^\)])*\)|<[0-9a-fA-F\s]*>|-?\d+\.?\d*)/g){ push @parts,$1 } }
    for my $p (@parts){ if($p=~/^-?\d/){ $out.=' ' if $p < -200; next }
      my $cm = $font && $cmap{$font};
      if($p=~/^<(.*)>$/s){ (my $hx=$1)=~s/\s//g; my $w = ($cm && $cm->{two}) || length($hx)%4==0 && $cm ? 4 : 2; while($hx=~/(.{$w})/g){ my $c=hex $1; $out.= $cm && exists $cm->{m}{$c} ? $cm->{m}{$c} : chr($c) } }
      else { my $t=substr($p,1,-1); my %esc=(n=>"\n",r=>"",t=>"\t",b=>"",f=>"","("=>"(",")"=>")","\\"=>"\\"); $t=~s/\\\r?\n//g; $t=~s/\\([0-7]{1,3}|.)/exists $esc{$1} ? $esc{$1} : $1=~m{^[0-7]} ? chr(oct $1) : $1/ges;
        if($cm && %{$cm->{m}}){ if($cm->{two}){ my @b=unpack('C*',$t); while(@b>1){ my $c=shift(@b)*256+shift(@b); $out.=$cm->{m}{$c}//'' } } else { $out.=join '', map { $cm->{m}{ord $_} // $_ } split //,$t } } else { $out.=$win->($t) } } } } $out.="\n"; }
$out=~s/[ \t]+/ /g; $out=~s/\n\s*\n+/\n/g; print $out;
