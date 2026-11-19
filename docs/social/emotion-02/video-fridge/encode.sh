#!/bin/sh
# ./encode.sh FRAMEDIR OUT.mp4 : original sound (door-seal click, fridge hum while open, a pop per label, a thud when the
# door shuts, the two-note chime on "Earned."), then H.264 + AAC for TikTok. Times match build.py.
set -e
D="$1"; OUT="$2"
pop() { echo "[$1]afade=t=in:d=0.004,afade=t=out:st=0.01:d=0.08,volume=2.4,adelay=$2|$2[$3]"; }
ffmpeg -y -loglevel error \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.5:d=0.25" \
  -f lavfi -i "sine=f=50:d=8.3" -f lavfi -i "sine=f=100:d=8.3" \
  -f lavfi -i "sine=f=880:d=0.12" -f lavfi -i "sine=f=990:d=0.12" -f lavfi -i "sine=f=1100:d=0.12" \
  -f lavfi -i "sine=f=70:d=0.45" -f lavfi -i "anoisesrc=color=brown:amplitude=0.6:d=0.2" \
  -f lavfi -i "sine=f=1318.5:d=0.35" -f lavfi -i "sine=f=1760:d=0.6" \
  -filter_complex "[0]highpass=f=800,afade=t=in:d=0.005,afade=t=out:st=0.02:d=0.2,volume=1.2,adelay=1600|1600[k];\
[1]volume=0.9,afade=t=in:d=0.4,afade=t=out:st=7.9:d=0.3,adelay=1650|1650[h1];[2]volume=0.35,afade=t=in:d=0.4,afade=t=out:st=7.9:d=0.3,adelay=1650|1650[h2];\
$(pop 3 2900 p1);$(pop 4 4200 p2);$(pop 5 5500 p3);\
[6]afade=t=in:d=0.005,afade=t=out:st=0.05:d=0.35,volume=3.4,adelay=9800|9800[th];[7]lowpass=f=400,afade=t=out:st=0.02:d=0.15,volume=1.5,adelay=9800|9800[tn];\
[8]afade=t=out:st=0.05:d=0.3,volume=3,adelay=11700|11700[c1];[9]afade=t=out:st=0.08:d=0.5,volume=2.7,adelay=11850|11850[c2];\
[k][h1][h2][p1][p2][p3][th][tn][c1][c2]amix=inputs=10:normalize=0,alimiter=limit=0.8,apad=whole_dur=13.5,atrim=0:13.5[out]" \
  -map "[out]" -ar 44100 -ac 2 "$D/sound.wav"
ffmpeg -y -loglevel error -framerate 30 -i "$D/f%04d.png" -i "$D/sound.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 160k -shortest "$OUT"
