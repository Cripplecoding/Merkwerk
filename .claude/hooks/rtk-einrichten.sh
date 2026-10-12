#!/usr/bin/env bash
# Richtet RTK (Rust Token Killer, https://github.com/rtk-ai/rtk) in
# Claude-Code-Cloud-Sitzungen ein. RTK kürzt die Ausgabe von Terminal-Befehlen
# (git, ls, grep, npm test …), bevor Claude sie liest, und spart so Tokens.
#
# Fertige RTK-Downloads sind in der Cloud gesperrt, deshalb wird RTK aus dem
# Quellcode gebaut (ca. 4–6 Minuten) und im Projektordner zwischengespeichert.
# Spätere Sitzungen kopieren nur noch die fertige Datei.
set -u

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

VERSION="v0.49.0"
ZIEL="$HOME/.local/bin/rtk"
CACHE_DIR="/mnt/project-files/werkzeuge/rtk"
CACHE="$CACHE_DIR/rtk-$VERSION-$(uname -m)"

if [ -x "$ZIEL" ] && "$ZIEL" --version >/dev/null 2>&1; then
  exit 0
fi
mkdir -p "$HOME/.local/bin" "$HOME/.cache"

if [ -f "$CACHE" ]; then
  install -m 755 "$CACHE" "$ZIEL" && "$ZIEL" --version >/dev/null 2>&1 && exit 0
fi

command -v cargo >/dev/null 2>&1 || exit 0

# Noch kein Zwischenspeicher: im Hintergrund bauen, damit die Sitzung nicht wartet.
# Bis der Bau fertig ist, laufen Befehle einfach ohne RTK.
nohup bash -c '
  set -e
  QUELLE="$HOME/.cache/rtk-src"
  rm -rf "$QUELLE"
  git clone -q --depth 1 --branch "$1" https://github.com/rtk-ai/rtk "$QUELLE"
  cargo build --release --locked --manifest-path "$QUELLE/Cargo.toml"
  install -m 755 "$QUELLE/target/release/rtk" "$2"
  if [ -d /mnt/project-files ]; then
    mkdir -p "$3"
    cp "$2" "$4.tmp.$$" && mv "$4.tmp.$$" "$4"
  fi
  rm -rf "$QUELLE"
' rtk-bau "$VERSION" "$ZIEL" "$CACHE_DIR" "$CACHE" >"$HOME/.cache/rtk-bau.log" 2>&1 &

exit 0
