#!/usr/bin/env bash
# frames + narration + fx/bgm -> mp4  (mux.ps1 の Linux / Mac / Git Bash 版。処理は同じ)
# usage: bash mux.sh <frames_dir> <narration.mp3> <fx_bgm.wav> <out.mp4> <duration_sec>
# inputs: 0=video, 1=narration, 2=fx/bgm. BGM is ducked while the voice is speaking.
set -euo pipefail
frames="${1:?frames dir}"; narr="${2:?narration}"; fx="${3:?fx wav}"; out="${4:?out mp4}"; dur="${5:?duration sec}"
fade=$(python3 -c "print(round($dur-0.3,3))" 2>/dev/null || python -c "print(round($dur-0.3,3))")
fc="[1:a]atrim=0:$dur,asetpts=N/SR/TB,aresample=48000,pan=stereo|c0=c0|c1=c0,loudnorm=I=-16:TP=-2:LRA=11,asplit=2[n][sc];"
fc+="[2:a]volume=0.6[b0];[b0][sc]sidechaincompress=threshold=0.04:ratio=4:attack=15:release=350[b];"
fc+="[n][b]amix=inputs=2:normalize=0,afade=t=out:st=$fade:d=0.3,alimiter=limit=0.93[a]"
ffmpeg -y -loglevel error -framerate 30 -i "$frames/f_%04d.jpg" -i "$narr" -i "$fx" -filter_complex "$fc" \
  -map 0:v -map '[a]' -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -t "$dur" -movflags +faststart "$out"
