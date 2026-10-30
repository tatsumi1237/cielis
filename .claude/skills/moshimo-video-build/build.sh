#!/bin/bash
# usage: build.sh <workdir> [scene.js ...]
# 作業フォルダに assets/ を揃え、head+base+models(+追加モデル)+scene を video.html に結合する
set -e
D=${1:?workdir}; shift
SK="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$D"; cd "$D"
for f in head.html base.js models.js render.js render2.js sheet.sh; do [ -f $f ] || cp "$SK/assets/$f" .; done
[ -f gw.js ] || cp "$SK/assets/gw.js" . ; chmod +x sheet.sh
[ -d node_modules/three ] || { npm init -y >/dev/null; npm i three@0.160.0 playwright@1.56.0; }
[ $# -gt 0 ] && cat head.html base.js models.js "$@" > video.html && echo "video.html built"
