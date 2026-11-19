# "Earned." emotion campaign: sample artwork

Playbook (analysis, idea, captions, four-week calendar): https://claude.ai/artifact/1z29HBG4phoF54RLAMM2Ey

- `gigotter-earned-p1.png` … `p9.png`: Instagram feed, 1080×1350
- `gigotter-earned-s1.png`, `s6.png`, `s7.png`: Story / TikTok, 1080×1920 (words clear of the app buttons)
- `p8` is a **template**: "Ama" is made up. Only post real stories, with the person's written permission and their own photo.
- `p9` ("Broke is not a personality") is the bold option. Test it with a few members first.
- `p7`'s payout amount is illustrative.

Photos: the free-licence images in `public/images` (see `public/images/CREDITS.md`).

Rebuild: `python3 build.py /tmp/earned.html && node render.cjs /tmp/earned.html .`
(needs the Onest and Inter Tight fontsource packages unpacked where `build.py` says).

## TikTok video: "the ping"

`video/gigotter-earned-ping.mp4`: 1080×1920, 12 s, 30 fps, H.264 + AAC, with a short original two-note chime when the payment lands. `video/cover.png` is a cover frame ("Earned.").

Lock screen, then the mobile-money alert drops in with a buzz and the chime, then "That's not pocket money." then "Best sound your phone makes." then "Earned. gigotter.com". Text stays clear of TikTok's buttons and caption. The amount is illustrative.

Rebuild: `python3 video/build.py /tmp/ping.html && node video/render.cjs /tmp/ping.html /tmp/frames && video/encode.sh /tmp/frames video/gigotter-earned-ping.mp4`
