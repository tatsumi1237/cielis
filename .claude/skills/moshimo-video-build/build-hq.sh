#!/bin/bash
# 高品質版（v2）の作業フォルダを作り、video.html を結合する
# usage: build-hq.sh <workdir> [scene.js ...]   （scene.js は hq-core/hq-city/hq-phone の後に結合される）
set -e
D=${1:?workdir}; shift
SK="$(cd "$(dirname "$0")" && pwd)"
SCN=(); for f in "$@"; do SCN+=("$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"); done
mkdir -p "$D"; cd "$D"
for f in base.js models.js render.js render2.js sheet.sh; do cp "$SK/assets/$f" .; done
for f in head.html hq-core.js hq-city.js hq-town.js hq-shelter.js hq-phone.js; do cp "$SK/assets/hq/$f" .; done
chmod +x sheet.sh
[ -d node_modules/three ] || { npm init -y >/dev/null; npm i three@0.160.0 playwright@1.56.0; npx playwright install chromium; }
[ -d node_modules/@fontsource/shippori-mincho-b1 ] || npm i @fontsource/shippori-mincho-b1 @fontsource/zen-kaku-gothic-new @fontsource/oswald
if [ $# -gt 0 ]; then cat head.html base.js models.js hq-core.js hq-city.js hq-town.js hq-shelter.js hq-phone.js "${SCN[@]}" > video.html; echo "video.html built"; fi
