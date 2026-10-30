#!/bin/bash
# Final assembly: concat cuts + animated S2 typography (lines grow, characters rise one by one, sub text fades up)
set -e
# usage: AV=<案件フォルダ> [LIST_DIR=<list.txt のあるフォルダ>] [FFMPEG=<ffmpegのパス>] bash build_final_with_animated_text.sh
# AV には final_edit_src.mp4 / logo.png / anim/ch0..4.png / anim/sub.png を置く。list.txt は LIST_DIR（既定: $AV/work）に置く
FF="${FFMPEG:-ffmpeg}"
AV="${AV:?AV に案件フォルダを指定してください}"
cd "${LIST_DIR:-$AV/work}"
OUT="${OUT:-$AV/final_720p60.mp4}"
[ -f "$OUT" ] && cp "$OUT" "${OUT%.mp4}_prev.mp4"

LG=15.45   # logo in
L0=15.62   # lines start
C0=15.78   # first character start
CS=0.07    # stagger
CD=0.45    # per-character duration
S0=16.40   # sub text start
SD=0.50

IN="-f concat -safe 0 -i list.txt -i $AV/final_edit_src.mp4 -loop 1 -framerate 60 -t 18 -i $AV/logo.png"
for i in 0 1 2 3 4; do IN="$IN -loop 1 -framerate 60 -t 18 -i $AV/anim/ch$i.png"; done
IN="$IN -loop 1 -framerate 60 -t 18 -i $AV/anim/sub.png"

FC="[2:v]format=rgba,scale=440:-1,fade=t=in:st=$LG:d=0.5:alpha=1[lg];[0:v][lg]overlay=(W-w)/2:H*0.205:eof_action=pass[v0];"
prev=v0
for i in 0 1 2 3 4; do
  idx=$((3+i)); st=$(python -c "print(round($C0+$i*$CS,3))")
  FC="$FC[$idx:v]format=rgba,fade=t=in:st=$st:d=0.30:alpha=1[c$i];"
  FC="$FC[$prev][c$i]overlay=0:'30*pow(1-clip((t-$st)/$CD,0,1),3)':eof_action=pass[v$((i+1))];"
  prev=v$((i+1))
done
FC="$FC[8:v]format=rgba,fade=t=in:st=$S0:d=$SD:alpha=1[sb];[$prev][sb]overlay=0:'14*pow(1-clip((t-$S0)/$SD,0,1),3)':eof_action=pass[v6];"
# growing lines (centre outwards), ease-out
GROW="min(1,max(0,(t-$L0)/0.45))"
LEN="max(2,300*(1-pow(1-$GROW,3)))"
FC="$FC[v6]drawbox=x='iw/2-($LEN)/2':y=360:w='$LEN':h=2:color=white@0.8:t=fill:enable='gte(t,$L0)',drawbox=x='iw/2-($LEN)/2':y=610:w='$LEN':h=2:color=white@0.8:t=fill:enable='gte(t,$L0)',format=yuv420p[v]"

"$FF" -y -hide_banner -loglevel error $IN -filter_complex "$FC" -map "[v]" -map 1:a \
  -c:v libx264 -crf 16 -preset slow -r 60 -c:a aac -b:a 256k -shortest "$OUT"
echo done
