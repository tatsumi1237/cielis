#!/bin/bash
# usage: sheet.sh dir out.jpg cols
cd $1; ls t_*.jpg | sort -t_ -k2 -g > l.txt; n=$(wc -l < l.txt); c=${3:-6}
ffmpeg -y -loglevel error $(for f in $(cat l.txt); do echo -i $f; done) -filter_complex "$(i=0; for f in $(cat l.txt); do echo -n "[$i:v]scale=270:480[v$i];"; i=$((i+1)); done; for i in $(seq 0 $((n-1))); do echo -n "[v$i]"; done; echo -n "xstack=inputs=$n:fill=black:layout=$(for i in $(seq 0 $((n-1))); do echo -n "$(( (i%c)*270 ))_$(( (i/c)*480 ))|"; done | sed 's/|$//')")" $2
