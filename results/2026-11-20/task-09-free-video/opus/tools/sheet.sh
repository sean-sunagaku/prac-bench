#!/bin/zsh
# 使い方: sheet.sh out.png cols width img1 img2 ...  — 静止画を並べた確認用シート
out=$1; cols=$2; w=$3; shift 3
n=$#; rows=$(( (n + cols - 1) / cols ))
inputs=(); for f in "$@"; do inputs+=(-i "$f"); done
filter=""; for ((i=0;i<n;i++)); do filter+="[$i:v]scale=${w}:-1[v$i];"; done
for ((i=0;i<n;i++)); do filter+="[v$i]"; done
filter+="xstack=inputs=${n}:layout="
lay=""; h=$(( w * 9 / 16 ))
for ((i=0;i<n;i++)); do c=$(( i % cols )); r=$(( i / cols )); lay+="$(( c * w ))_$(( r * h ))|"; done
filter+="${lay%|}:fill=black"
if [ $n -eq 1 ]; then filter="[0:v]scale=${w}:-1"; fi
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "$filter" -frames:v 1 "$out"
