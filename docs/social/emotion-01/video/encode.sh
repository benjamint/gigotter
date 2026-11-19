#!/bin/sh
# ./encode.sh FRAMEDIR OUT.mp4 : a soft two-note chime at 1.55 s (when the alert lands), a low buzz under it, then H.264 + AAC for TikTok
set -e
D="$1"; OUT="$2"
ffmpeg -y -loglevel error \
  -f lavfi -i "sine=f=1318.5:d=0.35" -f lavfi -i "sine=f=1760:d=0.6" -f lavfi -i "sine=f=170:d=0.55" \
  -filter_complex "[0]afade=t=out:st=0.05:d=0.3,volume=3,adelay=1550|1550[a];[1]afade=t=out:st=0.08:d=0.5,volume=2.7,adelay=1700|1700[b];[2]volume=1.4,afade=t=in:d=0.05,afade=t=out:st=0.35:d=0.2,adelay=1550|1550[c];[a][b][c]amix=inputs=3:normalize=0,alimiter=limit=0.8,apad=whole_dur=12,atrim=0:12[out]" \
  -map "[out]" -ar 44100 -ac 2 "$D/chime.wav"
ffmpeg -y -loglevel error -framerate 30 -i "$D/f%04d.png" -i "$D/chime.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 160k -shortest "$OUT"
