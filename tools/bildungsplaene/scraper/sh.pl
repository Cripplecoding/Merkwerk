use utf8; require "./lib.pl"; our $S;
# Fachportal.SH (fachportal.lernnetz.de) war am 03.10.2026 weder per curl noch per Browser/WebFetch erreichbar.
# Erfasst werden daher nur offizielle Adressen, die ueber die IQSH-Seite bzw. den Suchindex belegt sind (als Linkdateien).
my $INST='Ministerium für Allgemeine und Berufliche Bildung, Wissenschaft, Forschung und Kultur Schleswig-Holstein / IQSH (Fachportal.SH)';
my $NV='[nicht verifiziert] Fachportal.SH war während der Recherche am 03.10.2026 nicht erreichbar (Verbindungs-Timeout); Gültigkeit und Fassung bitte im Fachportal prüfen';
my $F='https://fachportal.lernnetz.de/files/Fachanforderungen%20und%20Leitf%C3%A4den/Sek.%20I_II';
my $SA='Alle Schularten der Sekundarstufe I und II';
my @R=(
 [$SA,'Klassen 5-13','Übersicht Fachanforderungen','Fachanforderungen und Leitfäden – Übersicht (Fachportal.SH)','https://fachportal.lernnetz.de/sh/fachanforderungen.html','Offizielle Übersicht, verlinkt von der IQSH-Seite Lehrpläne auf schleswig-holstein.de'],
 [$SA,'Klassen 5-13','Inkraftsetzung','Inkraftsetzungserlass Fachanforderungen 2024 (NBl. MBWFK Schl.-H. 2024)','https://fachportal.lernnetz.de/files/Fachanforderungen%20und%20Leitf%C3%A4den/Inkraftsetzungserlasse/Inkraftsetzungserlass%202024.pdf',''],
 [$SA,'Klassen 5-13','Deutsch','Fachanforderungen Deutsch (Fachseite)','https://fachportal.lernnetz.de/sh/faecher/deutsch/fachanforderungen.html',''],
 [$SA,'Klassen 5-13','Deutsch','Leitfaden zu den Fachanforderungen Deutsch Sekundarstufe I',"$F/Leif%C3%A4den/Leitfaden_zu_den_Fachanforderungen_Deutsch.pdf",''],
 [$SA,'Klassen 5-13','Englisch','Fachanforderungen Englisch (Fachseite)','https://fachportal.lernnetz.de/sh/faecher/englisch/fachanforderungen.html',''],
 [$SA,'Klassen 5-13','Englisch','Leitfaden zu den Fachanforderungen Englisch (barrierearm)',"$F/Leitf%C3%A4den%20barrierefrei/Leitfaden_Englisch_SEK_barrierearm.pdf",''],
 [$SA,'Klassen 5-13','Mathematik','Fachanforderungen Mathematik (Fachseite)','https://fachportal.lernnetz.de/sh/faecher/mathematik/fachanforderungen.html',''],
 [$SA,'Klassen 5-13','Mathematik','Fachanforderungen Mathematik Sekundarstufen I und II',"$F/Fachanforderungen/Fachanforderungen_Mathematik_Sekundarstufen_I_II.pdf",'Fassung lt. Suchindex; laut Portalbeschreibung existiert eine überarbeitete Fassung 2024'],
 [$SA,'Klassen 5-13','Mathematik','Leitfaden zu den Fachanforderungen Mathematik',"$F/Leif%C3%A4den/Leitfaden_zu_den_Fachanforderungen_Mathematik.pdf",''],
 [$SA,'Klassen 5-13','Chemie','Fachanforderungen Chemie für die Sekundarstufe I und II',"$F/Fachanforderungen/Fachanforderungen_Chemie_f%C3%BCr_die_Sekundarstufe_I_II.pdf",'Laut Portalbeschreibung existiert eine überarbeitete Fassung 2026'],
 [$SA,'Klassen 5-13','Italienisch','Fachanforderungen Italienisch Sekundarstufen I und II',"$F/Fachanforderungen/Fachanforderungen_Italienisch_Sekundarstufen_I_II.pdf",''],
 [$SA,'Klassen 5-10','Naturwissenschaften','Fachanforderungen Naturwissenschaften Sekundarstufe I',"$F/Fachanforderungen/Fachanforderungen_Naturwissenschaften_Sekundarstufe_I.pdf",''],
 [$SA,'Klassen 5-10','Naturwissenschaften','Leitfaden zu den Fachanforderungen Naturwissenschaften Sekundarstufe I',"$F/Leif%C3%A4den/Leitfaden_zu_den_Fachanforderungen_Naturwissenschaften_Sekundarstufe_I.pdf",''],
 [$SA,'Klassen 5-13','Informatik','Fachanforderungen Informatik Sekundarstufe',"$F/Fachanforderungen/21-14520%20Fachanforderungen%20Informatik%20SEK_WEB_PDF%20UA.pdf",''],
 [$SA,'Klassen 5-10','Technik','Leitfaden zu den Fachanforderungen Technik Sekundarstufe I',"$F/Leif%C3%A4den/Leitfaden_zu_den_Fachanforderungen_Technik_Sekundarstufe_I.pdf",''],
 [$SA,'Klassen 5-13','Philosophie','Fachanforderungen Philosophie Sekundarstufe (barrierearm)',"$F/Fachanforderungen_barrierefrei/Fachanforderungen_Philosophie_SEK_barrierearm.pdf",''],
 [$SA,'Klassen 5-13','Geographie','Fachanforderungen Geographie (Fachseite)','https://fachportal.lernnetz.de/sh/fachanforderungen/geographie.html',''],
 [$SA,'Klassen 5-13','Geographie','Leitfaden zu den Fachanforderungen Geographie',"$F/Leif%C3%A4den/Leitfaden_zu_den_Fachanforderungen_Geographie.pdf",''],
 [$SA,'Klassen 5-10','Weltkunde','Fachanforderungen Weltkunde (Fachseite)','https://fachportal.lernnetz.de/sh/faecher/weltkunde/fachanforderungen.html',''],
 [$SA,'Klassen 5-13','Verbraucherbildung','Fachanforderungen Verbraucherbildung (Fachseite)','https://fachportal.lernnetz.de/sh/faecher/verbraucherbildung/fachanforderungen.html',''],
);
my $Q='https://www.schleswig-holstein.de/DE/landesregierung/ministerien-behoerden/IQSH/Arbeitsfelder/Schulentwicklung/Lehrplaene/lehrplaene';
open my $out,'>:utf8',"$S/rows/SH.tsv"; my $n=0;
for my $r (@R){ my ($sa,$st,$fach,$t,$u,$h)=@$r;
  print $out row(land=>'Schleswig-Holstein',schulart=>$sa,stufe=>$st,fach=>$fach,titel=>$t,klassen=>'Sekundarstufe I und II (Gemeinschaftsschule, Gymnasium; Fachanforderungen gelten schulartübergreifend nach Bildungsgängen)',stand=>'nicht verifizierbar',gueltigkeit=>$NV,institution=>$INST,quelle=>$Q,url=>$u,typ=>'link',hinweis=>join('; ',grep {$_} 'Adresse über IQSH-Seite bzw. Suchindex belegt; Download nicht möglich, da Server nicht erreichbar',$h),datei=>$t); $n++ }
print $out row(land=>'Schleswig-Holstein',schulart=>'Berufsbildende Schulen',stufe=>'Sekundarstufe II',fach=>'Übersicht Lehrpläne berufsbildende Schulen',titel=>'Lehrpläne für berufsbildende Schulen Schleswig-Holstein (Fachportal.SH)',klassen=>'Sekundarstufe II (beruflich)',gueltigkeit=>$NV,institution=>$INST,quelle=>$Q,url=>'https://fachportal.lernnetz.de/sh/fachanforderungen.html',typ=>'link',hinweis=>'Sonderfall: nur Indexeintrag',datei=>'Berufsbildende Schulen SH (Übersicht)'); $n++;
close $out; print "$n rows\n";
