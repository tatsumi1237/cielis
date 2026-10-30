# usage: powershell -File sheet.ps1 <dir> <out.jpg> [width-per-image]
param($dir, $out, $w = 360)
$files = Get-ChildItem $dir -Filter 't_*.jpg' | Sort-Object { [double]($_.BaseName -replace 't_', '') }
$in = @(); $f = ''
for ($i = 0; $i -lt $files.Count; $i++) { $in += '-i'; $in += $files[$i].FullName; $f += "[${i}:v]scale=${w}:-1[v$i];" }
$f += ($(0..($files.Count - 1) | ForEach-Object { "[v$_]" }) -join '') + "hstack=inputs=$($files.Count)"
ffmpeg -y -loglevel error @in -filter_complex $f -frames:v 1 -q:v 3 $out
