#!/usr/bin/env bash
# 試し撮りのコマ（t_<秒>.jpg）を横に並べた比較画像を作る（sheet.ps1 の Linux / Mac / Git Bash 版）
# usage: bash sheet.sh <dir> <out.jpg> [width-per-image=360]
set -euo pipefail
dir="${1:?dir}"; out="${2:?out.jpg}"; w="${3:-360}"
mapfile -t files < <(ls "$dir"/t_*.jpg | awk -F/ '{n=$NF; sub(/^t_/,"",n); sub(/\.jpg$/,"",n); print n"\t"$0}' | sort -g | cut -f2)
n=${#files[@]}; [ "$n" -ge 1 ] || { echo "no t_*.jpg in $dir"; exit 1; }
inputs=(); fc=""; stack=""
for i in "${!files[@]}"; do inputs+=(-i "${files[$i]}"); fc+="[${i}:v]scale=${w}:-1[v$i];"; stack+="[v$i]"; done
if [ "$n" -eq 1 ]; then fc+="${stack}null"; else fc+="${stack}hstack=inputs=$n"; fi
ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "$fc" -frames:v 1 -q:v 3 "$out"
