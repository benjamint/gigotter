# TikTok video kit

Turns one photo into a 13.5-second 1080×1920 TikTok/Reels video:
- an intro line on black;
- the photo with movement: slow zoom, punch-ins, bob, shake;
- timed captions or label pills;
- a green "turn" line and the "Earned." sign-off with the otter;
- original sound: ambience plus ticks, pops, bubbles, "dun"s and bonks, and the shared two-note chime.

All text stays clear of TikTok's top bar, side buttons and caption area.

Each video is a short script that calls `make(...)` in `kit.py`:

```bash
python3 goldfish.py PHOTODIR/8434694.jpg /tmp/vk/goldfish          # renders frames + encodes MP4 + cover.png
python3 goldfish.py PHOTODIR/8434694.jpg /tmp/vk/goldfish --page-only   # just the page, to check key frames
```

Photos are the Pexels IDs listed in `../emotion-02/CREDITS.md`. Finished videos and covers are in `out/`.

| Video | Story | Cover |
|---|---|---|
| goldfish | "Waiting for pocket money like:" → the fish bobbing → Day 1 "It's coming." / Day 12 "Soon." / Day 30 "Next week." → "Waiting around to be fed is a goldfish thing." → "You're not a goldfish." | the post line |
| ostrich | "Me after checking my balance:" → three dramatic punch-ins with a "dun" each → "Let me check again." → "Hiding from your balance won't fix it." → "Earning will." | extreme close-up |
| icecream | "Your 3-month vacation:" → Week 1 "Sleep." / Week 4 "Still sleep." / Week 12 "Where did it go?" → "Free time melts. Get paid before it does." → "Make this holiday count." | the post line |

## Footage videos

`footage.py` puts the same captions and ending over a real video clip instead of a photo: the clip is trimmed, sped or slowed to fit, cropped to 9:16 (a fixed position or a pan that follows the subject), lightly graded and composited under a transparent caption layer. Scripts: `snail_footage.py`, `pigeons_footage.py`, `icecream_footage.py`, `hourglass_footage.py`; clips and credits in `CREDITS.md`.

```bash
python3 snail_footage.py CLIPS/2467471.mp4 /tmp/vf/snail
```
