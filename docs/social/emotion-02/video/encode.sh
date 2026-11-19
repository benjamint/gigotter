#!/bin/sh
# ./encode.sh FRAMEDIR OUT.mp4 : original sound (quiet room tone, a tick on each "Day", a low bonk on the punchline,
# the two-note chime on "Earned."), then H.264 + AAC for TikTok. Times match build.py.
set -e
D="$1"; OUT="$2"
tick() { echo "[$1]afade=t=out:st=0.005:d=0.05,volume=2.2,adelay=$2|$2[$3]"; }
ffmpeg -y -loglevel error \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.012:d=13.5" \
  -f lavfi -i "sine=f=2200:d=0.06" -f lavfi -i "sine=f=2200:d=0.06" -f lavfi -i "sine=f=2200:d=0.06" -f lavfi -i "sine=f=2200:d=0.06" -f lavfi -i "sine=f=2200:d=0.06" \
  -f lavfi -i "sine=f=150:d=0.5" -f lavfi -i "sine=f=110:d=0.5" \
  -f lavfi -i "sine=f=1318.5:d=0.35" -f lavfi -i "sine=f=1760:d=0.6" \
  -filter_complex "[0]afade=t=out:st=9.8:d=0.4[n];$(tick 1 4600 t1);$(tick 2 5300 t2);$(tick 3 6000 t3);$(tick 4 6700 t4);$(tick 5 7300 t5);\
[6]afade=t=in:d=0.01,afade=t=out:st=0.08:d=0.4,volume=2.6,adelay=8100|8100[b1];[7]afade=t=in:d=0.01,afade=t=out:st=0.08:d=0.4,volume=2.6,adelay=8180|8180[b2];\
[8]afade=t=out:st=0.05:d=0.3,volume=3,adelay=11700|11700[c1];[9]afade=t=out:st=0.08:d=0.5,volume=2.7,adelay=11850|11850[c2];\
[n][t1][t2][t3][t4][t5][b1][b2][c1][c2]amix=inputs=10:normalize=0,alimiter=limit=0.8,apad=whole_dur=13.5,atrim=0:13.5[out]" \
  -map "[out]" -ar 44100 -ac 2 "$D/sound.wav"
ffmpeg -y -loglevel error -framerate 30 -i "$D/f%04d.png" -i "$D/sound.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 160k -shortest "$OUT"
