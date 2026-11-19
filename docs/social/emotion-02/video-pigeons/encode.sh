#!/bin/sh
# ./encode.sh FRAMEDIR OUT.mp4 : original sound (soft street ambience, a short wing flutter at the start, a thud on each
# label punch-in, a low bonk on "Stop fighting for crumbs", the two-note chime on "Earned."), then H.264 + AAC for TikTok.
set -e
D="$1"; OUT="$2"
thud() { echo "[$1]afade=t=in:d=0.005,afade=t=out:st=0.03:d=0.22,volume=3.2,adelay=$2|$2[$3]"; }
ffmpeg -y -loglevel error \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.03:d=13.5" \
  -f lavfi -i "anoisesrc=color=white:amplitude=0.25:d=0.5" \
  -f lavfi -i "sine=f=85:d=0.3" -f lavfi -i "sine=f=85:d=0.3" -f lavfi -i "sine=f=85:d=0.3" \
  -f lavfi -i "sine=f=150:d=0.5" -f lavfi -i "sine=f=110:d=0.5" \
  -f lavfi -i "sine=f=1318.5:d=0.35" -f lavfi -i "sine=f=1760:d=0.6" \
  -filter_complex "[0]lowpass=f=600,afade=t=in:d=0.6,afade=t=out:st=9.8:d=0.4,volume=1.6[n];\
[1]bandpass=f=1800:width_type=o:w=1.5,volume='0.6+0.4*sin(2*PI*28*t)':eval=frame,afade=t=in:d=0.05,afade=t=out:st=0.2:d=0.3,adelay=300|300[f];\
$(thud 2 4000 h1);$(thud 3 5000 h2);$(thud 4 6000 h3);\
[5]afade=t=in:d=0.01,afade=t=out:st=0.08:d=0.4,volume=2.6,adelay=7400|7400[b1];[6]afade=t=in:d=0.01,afade=t=out:st=0.08:d=0.4,volume=2.6,adelay=7480|7480[b2];\
[7]afade=t=out:st=0.05:d=0.3,volume=3,adelay=11700|11700[c1];[8]afade=t=out:st=0.08:d=0.5,volume=2.7,adelay=11850|11850[c2];\
[n][f][h1][h2][h3][b1][b2][c1][c2]amix=inputs=9:normalize=0,alimiter=limit=0.8,apad=whole_dur=13.5,atrim=0:13.5[out]" \
  -map "[out]" -ar 44100 -ac 2 "$D/sound.wav"
ffmpeg -y -loglevel error -framerate 30 -i "$D/f%04d.png" -i "$D/sound.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 160k -shortest "$OUT"
