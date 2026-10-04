# build_index.pl ROOT  – erzeugt Linkdateien (.url), Master-Index (CSV, XLSX) aus plan.tsv + Download-Logs
use utf8; use strict; use warnings; require "./lib.pl"; our $S;
use IO::Compress::Zip qw(zip $ZipError :zip_method);
use Encode qw(encode decode);
my $ROOT = shift // die "root";
binmode STDOUT,':utf8';
# Download-Status aus Logs
my %dl; for my $lf (glob("$S/fetch*.log")){ open my $h,'<:raw',$lf or next; while(<$h>){ chomp; $_=decode('UTF-8',$_,Encode::FB_DEFAULT); my ($st,$rel,$code)=split /\t/; next unless $rel; $dl{$rel}=$st if !$dl{$rel} || $st eq 'OK' } }
my @cols=('ID','Bundesland','Schulart','Klassenstufe (Ordner)','Fach','Titel','Geltungsbereich (Klassen/Jahrgangsstufen)','Stand / Fassung','Gültigkeit (Status und Angaben der Quelle)','Status kurz','Herausgeber / Institution','Quellseite','Offizieller Link','Dokumenttyp','Ablage (relativer Pfad)','Ablagestatus','Dateigröße (KB)','Hinweise');
my (@out,%cnt,%land);
open my $P,q{<:utf8},"$S/plan.tsv" or die; my $id=0; my @PL=<$P>; close $P; chomp @PL; my $nk=sub{ my $s=lc shift; $s=~s/(\d+)/sprintf("%04d",$1)/ge; $s=~tr/äöüß/aous/; $s }; @PL = sort { my @a=split /\t/,$a,-1; my @b=split /\t/,$b,-1; $nk->($a[0]) cmp $nk->($b[0]) || $nk->($a[1]) cmp $nk->($b[1]) || $nk->($a[2]) cmp $nk->($b[2]) || $nk->($a[3]) cmp $nk->($b[3]) || $nk->($a[4]) cmp $nk->($b[4]) } @PL;
for (@PL){ my @c=split /\t/,$_,-1; my ($land,$sa,$st,$fach,$titel,$kl,$stand,$g,$inst,$q,$url,$typ,$hin,$rel,$act)=@c; $id++;
  my $kurz = $g=~/^\[außer Kraft/ ? 'außer Kraft (nicht abgelegt)' : $g=~/^\[Entwurf/ ? 'Entwurf (nicht abgelegt)' : $g=~/^\[nicht verifiziert/ ? 'nicht verifiziert' : $g=~/^\[in Kraft ab/ ? 'künftig in Kraft' : $g=~/Erprobung/ ? 'gültig (Erprobung)' : $g=~/^\[(?:gültig – )?auslaufend|^\[auslaufend/ ? 'auslaufend gültig' : $g=~/Portalübersicht/ ? 'Portalübersicht' : $g=~/^\[gültig ab|aufsteigend|aufwachsend/ ? 'gültig (aufsteigend eingeführt)' : $g=~/subsidiär/ ? 'gültig (subsidiär)' : 'gültig';
  my ($ab,$size)=('','');
  if($act eq 'Download' || $act=~/Dublette/){ my $s = $dl{$rel}//''; my $f="$ROOT/$rel";
    if($act=~/Dublette/){ $ab = $rel=~/\.url$/ ? 'Dublette – siehe Erstablage (Linkdatei)' : -s $f ? 'Dublette – siehe Erstablage (Datei)' : 'Dublette – Erstablage noch nicht heruntergeladen'; $size = -s $f && $rel!~/\.url$/ ? int((-s $f)/1024) : '' }
    elsif(-s $f){ $ab='heruntergeladen'; $size=int((-s $f)/1024) }
    else { $ab = $s ? "Download fehlgeschlagen ($s) – siehe Link" : 'Download ausstehend – siehe Link' } }
  elsif($act eq 'Linkdatei'){ my $f="$ROOT/$rel"; my $dir=$f; $dir=~s{/[^/]+$}{}; system('mkdir','-p',$dir);
    open my $L,'>:raw',$f or die "$f: $!"; print $L "[InternetShortcut]\r\nURL=$url\r\n"; close $L; $ab='Linkdatei (.url)'; }
  else { $ab='nicht abgelegt'; $rel='' }
  $cnt{$ab=~/^heruntergeladen/?'pdf':$ab=~/^Linkdatei/?'link':$ab=~/^Dublette/?'dup':$ab=~/fehlgeschlagen|ausstehend/?'fail':'excl'}++; $land{$land}{$kurz}++; $land{$land}{_n}++; $land{$land}{_dl}++ if $ab eq 'heruntergeladen';
  my $gl=$g; push @out,[sprintf('BP%05d',$id),$land,$sa,$st,$fach,$titel,$kl,$stand,$gl,$kurz,$inst,$q,$url,uc($typ),$rel,$ab,$size,$hin]; }

# CSV (UTF-8 mit BOM, Semikolon)
sub csvq { my $v=shift//''; $v=~s/"/""/g; return "\"$v\"" }
open my $C,'>:raw',"$ROOT/Master-Index_Bildungsplaene.csv" or die; print $C "\xEF\xBB\xBF";
print $C encode('UTF-8', join(';',map {csvq($_)} @cols)."\r\n");
for my $r (@out){ print $C encode('UTF-8', join(';',map {csvq($_)} @$r)."\r\n") } close $C;
# XLSX (minimal OOXML)
sub x { my $s=shift//''; $s=~s/&/&amp;/g; $s=~s/</&lt;/g; $s=~s/>/&gt;/g; $s=~s/"/&quot;/g; $s=~s/[\x00-\x08\x0B\x0C\x0E-\x1F]//g; return $s }
sub colname { my $n=shift; my $s=''; while($n>0){ my $m=($n-1)%26; $s=chr(65+$m).$s; $n=int(($n-1)/26) } return $s }
sub sheet { my ($rows,$widths,$filter)=@_; my $nc=scalar(@{$rows->[0]}); my $x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>';
  for my $i (1..$nc){ $x.=qq(<col min="$i" max="$i" width="$widths->[$i-1]" customWidth="1"/>) } $x.='</cols><sheetData>';
  my $r=0; for my $row (@$rows){ $r++; $x.=qq(<row r="$r">); my $c=0; for my $v (@$row){ $c++; my $ref=colname($c).$r; my $st=$r==1?' s="1"':'';
      if(defined $v && $v=~/^\d+$/ && $r>1 && length($v)<12){ $x.=qq(<c r="$ref"$st><v>$v</v></c>) } elsif($c==13 && $r>1 && $v){ $x.=qq(<c r="$ref" s="2" t="inlineStr"><is><t>).x($v).'</t></is></c>' } else { $x.=qq(<c r="$ref"$st t="inlineStr"><is><t xml:space="preserve">).x($v).'</t></is></c>' } } $x.='</row>' }
  $x.='</sheetData>'; $x.='<autoFilter ref="A1:'.colname($nc).$r.'"/>' if $filter; $x.='</worksheet>'; return $x }
my @summ=(['Bundesland','Einträge gesamt','davon heruntergeladen (PDF/DOCX)','gültig','gültig (aufsteigend eingeführt)','auslaufend gültig','künftig in Kraft','gültig (Erprobung)','gültig (subsidiär)','nicht verifiziert','Portalübersicht','außer Kraft (nicht abgelegt)','Entwurf (nicht abgelegt)']);
for my $l (sort keys %land){ my $h=$land{$l}; push @summ,[$l,$h->{_n},$h->{_dl}//0,map { $h->{$_}//0 } @{$summ[0]}[3..12]] }
my $s1=sheet([\@cols,@out],[10,20,34,16,30,60,34,26,70,22,40,40,60,8,70,24,10,50],1);
my $s2=sheet(\@summ,[26,14,16,10,16,14,14,14,14,14,14,16,16],0);
my %files=(
 '[Content_Types].xml'=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
 '_rels/.rels'=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml'=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Master-Index" sheetId="1" r:id="rId1"/><sheet name="Übersicht Länder" sheetId="2" r:id="rId2"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\'Master-Index\'!$A$1:$R$'.(scalar(@out)+1).'</definedName></definedNames></workbook>',
 'xl/_rels/workbook.xml.rels'=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
 'xl/styles.xml'=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><u/><sz val="10"/><color rgb="FF0563C1"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>',
 'xl/worksheets/sheet1.xml'=>$s1, 'xl/worksheets/sheet2.xml'=>$s2 );
my @names=('[Content_Types].xml','_rels/.rels','xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/styles.xml','xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml');
my $zfile="$ROOT/Master-Index_Bildungsplaene.xlsx"; unlink $zfile;
{ my $z; for my $nm (@names){ my $data=encode('UTF-8',$files{$nm});
    if(!$z){ $z=IO::Compress::Zip->new($zfile, Name=>$nm, Method=>ZIP_CM_DEFLATE) or die $ZipError } else { $z->newStream(Name=>$nm, Method=>ZIP_CM_DEFLATE) }
    $z->print($data) } $z->close }
# JSON-Index für Anwendungen
use JSON::PP; my @j = map { my %h; @h{qw(id land schulart klassenstufe fach titel geltungsbereich stand gueltigkeit status institution quelle url typ pfad ablage groesse_kb hinweis)}=@$_; \%h } @out;
open my $J,'>:raw',"$ROOT/Master-Index_Bildungsplaene.json"; print $J JSON::PP->new->utf8->canonical->pretty->encode({stand=>'2026-10-03',eintraege=>\@j}); close $J;
print "Einträge: ".scalar(@out)." | heruntergeladen: ".($cnt{pdf}//0)." | Linkdateien: ".($cnt{link}//0)." | Dubletten: ".($cnt{dup}//0)." | fehlgeschlagen/ausstehend: ".($cnt{fail}//0)." | nicht abgelegt: ".($cnt{excl}//0)."\n";
for (@summ[1..$#summ]){ print join(' | ',@$_),"\n" }
