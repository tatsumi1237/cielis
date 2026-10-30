# frames + narration + fx/bgm -> mp4
# usage: powershell -File mux.ps1 -frames <dir> -narr <narration.mp3> -fx <fx_bgm.wav> -out <out.mp4> -dur 12.3
# inputs: 0=video, 1=narration, 2=fx/bgm. BGM is ducked while the voice is speaking.
# NOTE: keep this file ASCII-only (Windows PowerShell 5.1 misreads UTF-8 without BOM).
param([string]$frames, [string]$narr, [string]$fx, [string]$out, [double]$dur = 12.3)
$ic = [Globalization.CultureInfo]::InvariantCulture
$durS = $dur.ToString($ic); $fadeS = ($dur - 0.3).ToString($ic)
$fc = "[1:a]atrim=0:$durS,asetpts=N/SR/TB,aresample=48000,pan=stereo|c0=c0|c1=c0,loudnorm=I=-16:TP=-2:LRA=11,asplit=2[n][sc];" +
      "[2:a]volume=0.6[b0];[b0][sc]sidechaincompress=threshold=0.04:ratio=4:attack=15:release=350[b];" +
      "[n][b]amix=inputs=2:normalize=0,afade=t=out:st=${fadeS}:d=0.3,alimiter=limit=0.93[a]"
ffmpeg -y -loglevel error -framerate 30 -i "$frames\f_%04d.jpg" -i $narr -i $fx -filter_complex $fc `
  -map 0:v -map '[a]' -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -t $durS -movflags +faststart $out
