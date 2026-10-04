#!/bin/bash
# usage: fetch.sh ROOT  (reads jobs.tsv on stdin: url \t relpath)
ROOT="$1"; UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
one(){ url="$1"; rel="$2"; f="$ROOT/$rel"; 
  if [ -s "$f" ]; then echo -e "OK\t$rel\tcached"; return; fi
  mkdir -p "$(dirname "$f")"; tmp="$f.part"
  code=$(curl -sSL --compressed -m 300 --retry 2 -A "$UA" -H "Accept: application/pdf,text/html,*/*;q=0.8" -H "Accept-Language: de-DE,de;q=0.9" -o "$tmp" -w "%{http_code}" "$url" 2>/dev/null)
  if [ "$code" != "200" ] || [ ! -s "$tmp" ]; then rm -f "$tmp"; code=$(/c/Windows/System32/curl.exe -sSL -m 300 --retry 2 -A "$UA" -H "Accept: application/pdf,text/html,*/*;q=0.8" -H "Accept-Language: de-DE,de;q=0.9" -o "$(cygpath -w "$tmp")" -w "%{http_code}" "$url" 2>/dev/null); fi
  if [ "$code" = "200" ] && [ -s "$tmp" ]; then
    magic=$(head -c 5 "$tmp" | tr -d '\0'); 
    case "$rel" in *.pdf) if [ "$magic" != "%PDF-" ] && ! head -c 1024 "$tmp" | grep -q "%PDF-"; then echo -e "BAD\t$rel\tnot-pdf($code)"; rm -f "$tmp"; return; fi;; 
                   *.docx|*.zip|*.odt) if [ "${magic:0:2}" != "PK" ]; then echo -e "BAD\t$rel\tnot-zip"; rm -f "$tmp"; return; fi;; esac
    mv "$tmp" "$f"; echo -e "OK\t$rel\t$code"
  else rm -f "$tmp"; echo -e "FAIL\t$rel\t$code"; fi; }
export -f one; export ROOT UA
tr '\t' '\034' | xargs -d '\n' -P 6 -I{} bash -c 'IFS=$'"'"'\034'"'"' read -r u r <<< "{}"; one "$u" "$r"'
