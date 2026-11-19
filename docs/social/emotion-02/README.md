# "Earned." series 2: odd and abstract

Nine Instagram feed posts, 1080×1350 rendered at 2× (2160×2700 PNG), using Pexels photos (see CREDITS.md) and the same "Earned." sign-off as series 1.

| File | Line |
|---|---|
| a1 | Asking your uncle for money. / Response time: 3–5 business weeks. |
| a2 | Waiting around to be fed is a goldfish thing. |
| a3 | Hiding from your balance won't fix it. |
| a4 | Stop fighting for crumbs. |
| a5 | This fridge deserves better. |
| a6 | Free time melts. / Get paid before it does. |
| a7 | Idle hours are just money waiting. |
| a8 | Your time was never free. / Start charging for it. |
| a9 | Boredom is expensive. |

Rebuild: download the photos by ID into a folder (`https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&h=3000` saved as `<id>.jpg`), then
`python3 build.py PHOTODIR /tmp/e2.html && node render.cjs /tmp/e2.html .`

## TikTok / Story versions

`gigotter-earned-a1-story.png` … `a9-story.png`: 1080×1920 (TikTok's full size). The words and sign-off stay clear of TikTok's top bar (~200px), side buttons (~150px on the right) and caption area (~420px at the bottom).
Rebuild: `python3 build.py PHOTODIR /tmp/e2s.html --story && node render.cjs /tmp/e2s.html . 1`

The fridge photo (4058699) has its small "LIEBHERR" badge painted out before rendering: a patch of the plain panel from just below, at about x 432–560, y 886–914 of the 2000×3000 download.

## TikTok video: the snail

`video/gigotter-earned-snail.mp4`: 1080×1920, 13.5 s, 30 fps, H.264 + AAC, original sound (room tone, a tick on each "Day", a low bonk on the punchline, the two-note chime on "Earned."). `video/cover.png` is the punchline frame, for the TikTok cover.

Me: *asks uncle for money* → snail creeps in, "Uncle: 'Let me see what I can do.'" → "Day 1 … Day 23, still waiting…" → "Response time: 3–5 business weeks." → "Or just… earn it." → "Earned." + otter + gigotter.com.

Rebuild: `python3 video/build.py PHOTODIR/31280238.jpg /tmp/snail.html && node video/render.cjs /tmp/snail.html /tmp/frames && video/encode.sh /tmp/frames video/gigotter-earned-snail.mp4`

## TikTok video: the pigeons

`video-pigeons/gigotter-earned-pigeons.mp4`: 1080×1920, 13.5 s, 30 fps, original sound (street ambience, a wing flutter, a thud on each punch-in, a low bonk, the "Earned." chime). `video-pigeons/cover.png` is the "Stop fighting for crumbs." frame.

"Everyone's fighting for the same crumbs." → punch-ins: "Pocket money." / "Leftover transport money." / "'Something small.'" → "Stop fighting for crumbs." → "Get your own bread." → "Earned."

Rebuild: `python3 video-pigeons/build.py PHOTODIR/18132498.jpg /tmp/p.html && node video-pigeons/render.cjs /tmp/p.html /tmp/frames && video-pigeons/encode.sh /tmp/frames video-pigeons/gigotter-earned-pigeons.mp4`

## TikTok video: the fridge

`video-fridge/gigotter-earned-fridge.mp4`: 1080×1920, 13.5 s, 30 fps, original sound (door-seal click, fridge hum, a pop per label, door thud, the "Earned." chime). `video-fridge/cover.png` shows all three labels.

"POV: it's 11pm and you're 'just checking'" → the fridge opens with a cold flash → labels pop up on the contents: "1 milk." / "A jar of… something." / "Hope." → "This fridge deserves better." → door shuts → "So do you." → "Earned."

Rebuild: `python3 video-fridge/build.py PHOTODIR/4058699.jpg /tmp/f.html && node video-fridge/render.cjs /tmp/f.html /tmp/frames && video-fridge/encode.sh /tmp/frames video-fridge/gigotter-earned-fridge.mp4` (use the badge-free photo, see above).
