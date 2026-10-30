#!/bin/bash
# recruiting video final: unique frames -> Real-ESRGAN x4plus -> 720x1254 -> RIFE v4.6 to constant 60fps -> concat + copy + audio
set -e
# usage: TOOLS_DIR=<realesrgan/ と rife-ncnn-vulkan-*/ を置いたフォルダ> AV=<案件フォルダ> bash upscale_interpolate_pipeline.sh
# 任意: FFMPEG=<ffmpegのパス> / REALESRGAN_BIN / RIFE_DIR / RIFE_BIN / FONT（drawtext用の日本語フォント）
T="${TOOLS_DIR:?TOOLS_DIR を指定してください}"
AV="${AV:?AV に案件フォルダを指定してください}"
W=$T/work
FF="${FFMPEG:-ffmpeg}"
REALESRGAN_BIN="${REALESRGAN_BIN:-$T/realesrgan/realesrgan-ncnn-vulkan}"
RIFE_DIR="${RIFE_DIR:-$(ls -d "$T"/rife-ncnn-vulkan-* | head -1)}"
RIFE_BIN="${RIFE_BIN:-./rife-ncnn-vulkan}"
SRC="$AV/final_edit_src.mp4"
OUT="${OUT:-$AV/final_720p60.mp4}"
DUR=(1.6667 1.8333 1.8833 2.5 2.0833 2.5 2.9667 2.2867)

for i in $(seq 1 8); do
  d=$W/c$i
  mkdir -p $d/up $d/sm $d/interp
  if [ "$(ls $d/up | wc -l)" -lt "$(ls $d/src | wc -l)" ]; then
    echo "[$(date +%T)] cut$i upscale $(ls $d/src | wc -l) frames"
    "$REALESRGAN_BIN" -i $d/src -o $d/up -n realesrgan-x4plus -m $T/realesrgan/models > /dev/null 2>&1
  fi
  "$FF" -y -hide_banner -loglevel error -i $d/up/%04d.png -vf "scale=720:1254:flags=lanczos" $d/sm/%04d.png
  n=$(python -c "print(round(${DUR[$((i-1))]}*60))")
  echo "[$(date +%T)] cut$i interpolate -> $n frames"
  rm -f $d/interp/*
  (cd "$RIFE_DIR" && "$RIFE_BIN" -i $d/sm -o $d/interp -m rife-v4.6 -n $n > /dev/null 2>&1)
  "$FF" -y -hide_banner -loglevel error -framerate 60 -i $d/interp/%08d.png -frames:v $n -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p $d/cut.mp4
done

printf "file '%s'\n" $W/c1/cut.mp4 $W/c2/cut.mp4 $W/c3/cut.mp4 $W/c4/cut.mp4 $W/c5/cut.mp4 $W/c6/cut.mp4 $W/c7/cut.mp4 $W/c8/cut.mp4 > $W/list.txt
FONT="${FONT:-$(fc-match -f '%{file}' 'Noto Sans CJK JP:bold' 2>/dev/null)}"
A="alpha='if(lt(t,15.6),0,min(1,(t-15.6)/0.5))'"
"$FF" -y -hide_banner -loglevel error -f concat -safe 0 -i $W/list.txt -i "$SRC" \
  -filter_complex "[0:v]drawtext=fontfile='$FONT':text='未来を守る仲間を':fontsize=50:fontcolor=white:x=(w-text_w)/2:y=h*0.36:shadowcolor=black@0.55:shadowx=0:shadowy=3:$A,drawtext=fontfile='$FONT':text='募集しています':fontsize=50:fontcolor=white:x=(w-text_w)/2:y=h*0.36+74:shadowcolor=black@0.55:shadowx=0:shadowy=3:$A,format=yuv420p[v]" \
  -map "[v]" -map 1:a -c:v libx264 -crf 16 -preset slow -r 60 -c:a aac -b:a 256k -shortest "$OUT"
echo "[$(date +%T)] DONE $OUT"
