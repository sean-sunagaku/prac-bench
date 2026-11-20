#!/bin/zsh
# 書き出した4区間をつなぎ、音楽を合わせて最終の MP4 にする
set -e
cd "$(dirname $0)/.."
printf "file 'segs/s0.mp4'\nfile 'segs/s1.mp4'\nfile 'segs/s2.mp4'\nfile 'segs/s3.mp4'\n" > build/concat.txt
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i build/concat.txt -c copy build/video.mp4
ffmpeg -hide_banner -loglevel error -y -i build/video.mp4 -i build/audio.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 \
  -metadata title="f(t)" -metadata artist="Claude Opus 5.5" -metadata comment="All visuals and audio computed from code. Zero assets." \
  -movflags +faststart -shortest out/f_t.mp4
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels -of compact out/f_t.mp4
