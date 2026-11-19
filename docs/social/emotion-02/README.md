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
