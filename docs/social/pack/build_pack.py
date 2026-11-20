"""Builds the Gigotter social posting pack: every post as a high-res file named in posting order, captions with hashtags,
and a calendar (20 Nov 2026 to 3 Jan 2027) for the platforms Gigotter is on: Instagram, X (Twitter) and TikTok.
usage: python3 build_pack.py SERIES1_2X_DIR OUTDIR   (SERIES1_2X_DIR holds p1..p9.png rendered at 2x)
Series 2 and 3 files and the videos are read from docs/social/emotion-02 and emotion-03 / emotion-01."""
import csv, datetime as dt, html, json, pathlib, shutil, sys
from PIL import Image

SOC = pathlib.Path(__file__).resolve().parent.parent
S1 = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2])
TAG = '#Gigotter #EarnedIt'

# id: (feed file, story file or None, short name, caption, extra hashtags)
POSTS = {
  # series 1: "Earned." photo and type posts
  'p1': (S1 / 'p1.png', SOC / 'emotion-01/gigotter-earned-s1.png', 'first-time-didnt-ask', 'Remember asking for transport money? There’s another way. Real gigs from real businesses, paid to your mobile money.', '#Accra #StudentLife'),
  'p2': (S1 / 'p2.png', SOC / 'emotion-01/gigotter-earned-s2.png', 'mum-asked', 'Some phone calls hit different. 💚', '#Ghana #Family'),
  'p3': (S1 / 'p3.png', SOC / 'emotion-01/gigotter-earned-s3.png', 'lecture-gig-paid', 'Gigs that work around your timetable, not the other way round.', '#StudentLife #Accra'),
  'p4': (S1 / 'p4.png', SOC / 'emotion-01/gigotter-earned-s4.png', 'pocket-money-phase', 'New year, new rules. We said what we said.', '#NewYear #Ghana'),
  'p5': (S1 / 'p5.png', SOC / 'emotion-01/gigotter-earned-s5.png', 'time-had-a-price', 'Your hours are worth something. Verified gigs from real businesses in Ghana.', '#GhanaJobs'),
  'p6': (S1 / 'p6.png', SOC / 'emotion-01/gigotter-earned-s6.png', 'first-salary', 'Some people call it a side hustle. We call it a start.', '#Accra #Ghana'),
  'p7': (S1 / 'p7.png', SOC / 'emotion-01/gigotter-earned-s7.png', 'the-ping', 'Turn the volume up. 🔔', '#MobileMoney #Ghana'),
  'p9': (S1 / 'p9.png', SOC / 'emotion-01/gigotter-earned-s9.png', 'broke-not-a-personality', 'Plenty of ways to fix that. One of them is at gigotter.com.', '#Ghana #StudentLife'),
  # series 2: odd and abstract
  'a1': (SOC / 'emotion-02/gigotter-earned-a1.png', SOC / 'emotion-02/gigotter-earned-a1-story.png', 'snail-uncle', 'Still waiting? 🐌', '#Ghana #Relatable'),
  'a2': (SOC / 'emotion-02/gigotter-earned-a2.png', SOC / 'emotion-02/gigotter-earned-a2-story.png', 'goldfish', 'Swim out of the bag. 🐠', '#StudentLife #Accra'),
  'a3': (SOC / 'emotion-02/gigotter-earned-a3.png', SOC / 'emotion-02/gigotter-earned-a3-story.png', 'ostrich', 'We see you. 👀', '#Relatable #Ghana'),
  'a4': (SOC / 'emotion-02/gigotter-earned-a4.png', SOC / 'emotion-02/gigotter-earned-a4-story.png', 'pigeons-crumbs', 'Real gigs from real businesses. Paid properly.', '#GhanaJobs #Accra'),
  'a5': (SOC / 'emotion-02/gigotter-earned-a5.png', SOC / 'emotion-02/gigotter-earned-a5-story.png', 'fridge', 'Tag the friend whose fridge looks like this. 😅', '#Relatable #StudentLife'),
  'a6': (SOC / 'emotion-02/gigotter-earned-a6.png', SOC / 'emotion-02/gigotter-earned-a6-story.png', 'free-time-melts', 'Long vacation? Make it count. 🍦', '#Vacation #StudentLife'),
  'a7': (SOC / 'emotion-02/gigotter-earned-a7.png', SOC / 'emotion-02/gigotter-earned-a7-story.png', 'idle-hours', 'Two free hours this week? That’s a gig.', '#Ghana #GhanaJobs'),
  'a8': (SOC / 'emotion-02/gigotter-earned-a8.png', SOC / 'emotion-02/gigotter-earned-a8-story.png', 'hourglass', 'New year reminder: your time has always had value. Now it has a price. ⏳', '#NewYear #Ghana'),
  'a9': (SOC / 'emotion-02/gigotter-earned-a9.png', SOC / 'emotion-02/gigotter-earned-a9-story.png', 'boredom-expensive', 'Fix it at gigotter.com.', '#Holidays #Ghana'),
  # series 3: bold banners
  'b1': (SOC / 'emotion-03/gigotter-b1.png', SOC / 'emotion-03/gigotter-b1-story.png', 'jollof-on-you', 'Your turn to buy the jollof. 🍛', '#Jollof #Accra'),
  'b2': (SOC / 'emotion-03/gigotter-b2.png', SOC / 'emotion-03/gigotter-b2-story.png', 'round-on-me', 'Say it with your chest. 🥂', '#Friends #Accra'),
  'b3': (SOC / 'emotion-03/gigotter-b3.png', SOC / 'emotion-03/gigotter-b3-story.png', 'send-something-home', 'Christmas is coming. Mum deserves a surprise. 💛', '#Christmas #Ghana'),
  'b4': (SOC / 'emotion-03/gigotter-b4.png', SOC / 'emotion-03/gigotter-b4-story.png', 'new-kicks', 'Christmas fit, sorted yourself. 👟', '#Christmas #Accra'),
  'b5': (SOC / 'emotion-03/gigotter-b5.png', SOC / 'emotion-03/gigotter-b5-story.png', 'graduate', 'New year goal: experience, references and your own money. 🎓', '#NewYearGoals #Graduate'),
  'b6': (SOC / 'emotion-03/gigotter-b6.png', SOC / 'emotion-03/gigotter-b6-story.png', 'weekend-trip', 'Long weekend. Where are we going? 🌊', '#FarmersDay #Ghana'),
  'b7': (SOC / 'emotion-03/gigotter-b7.png', SOC / 'emotion-03/gigotter-b7-story.png', 'fees-sorted', 'One less thing to stress about.', '#StudentLife #Ghana'),
  'b8': (SOC / 'emotion-03/gigotter-b8.png', SOC / 'emotion-03/gigotter-b8-story.png', 'chop-life', 'Merry Christmas. Enjoy it, you worked for it. 🎄', '#Christmas #Ghana'),
  'b9': (SOC / 'emotion-03/gigotter-b9.png', SOC / 'emotion-03/gigotter-b9-story.png', 'that-feeling', 'Turn notifications on. 🔔', '#MobileMoney #Ghana'),
}
VIDEOS = {
  'v-ping': (SOC / 'emotion-01/video/gigotter-earned-ping.mp4', 'ping-video', 'Turn the volume up. 🔔', '#StudentLife #Accra #GhanaJobs'),
  'v-snail': (SOC / 'video-kit/out/gigotter-earned-snail-footage.mp4', 'snail-video', 'Still waiting? 🐌', '#Relatable #Ghana #StudentLife'),
  'v-pigeons': (SOC / 'video-kit/out/gigotter-earned-pigeons-footage.mp4', 'pigeons-video', 'Get your own bread. 🍞', '#Accra #GhanaJobs #StudentLife'),
  'v-goldfish': (SOC / 'video-kit/out/gigotter-earned-goldfish.mp4', 'goldfish-video', '“It’s coming.” 🐠', '#Relatable #StudentLife #Ghana'),
  'v-ostrich': (SOC / 'video-kit/out/gigotter-earned-ostrich.mp4', 'ostrich-video', 'We’ve all been there. 👀', '#Relatable #Ghana #StudentLife'),
  'v-icecream': (SOC / 'video-kit/out/gigotter-earned-icecream-footage.mp4', 'icecream-video', 'Week 12 hits different. 🍦', '#Vacation #StudentLife #Ghana'),
  'v-hourglass': (SOC / 'video-kit/out/gigotter-earned-hourglass-footage.mp4', 'hourglass-video', 'Where did your evening go? ⏳', '#StudentLife #Ghana #GhanaJobs'),
  'v-fridge': (SOC / 'emotion-02/video-fridge/gigotter-earned-fridge.mp4', 'fridge-video', 'Tag the friend who “just checks” the fridge at 11pm. 😅', '#Relatable #StudentLife #Ghana'),
}
CAROUSELS = {  # TikTok photo carousels from the Story versions
  'c1': (['a1', 'a2', 'a3'], 'odd-ones', 'Which one is you? 🐌🐠👀', '#Relatable #Ghana #StudentLife'),
  'c2': (['b1', 'b2', 'b3'], 'treat-people', 'Treat your people. With your own money. 💛', '#Accra #Ghana #Friends'),
  'c3': (['a6', 'a7', 'a8', 'a9'], 'time-is-money', 'Your free time is worth more than you think. ⏳', '#Vacation #StudentLife #Ghana'),
  'c4': (['b4', 'b5', 'b6'], 'self-funded', 'Self-funded hits different.', '#Christmas #Accra #Ghana'),
  'c5': (['b7', 'b8', 'b9'], 'that-feeling', 'Fees sorted. Jollof bought. Notification landed. 🔔', '#StudentLife #Ghana #MobileMoney'),
}

D = lambda m, d, y=2026: dt.date(y, m, d)
# (date, old time (unused: X and TikTok times are set below), kind, item, note)
CAL = [
  # week 1: launch, from today (Fri 20 Nov) to Sun 29 Nov
  (D(11, 20), '19:30', 'post', 'p2', 'Launch post, tonight. Pin it to the top of the profile.'),
  (D(11, 21), '12:00', 'video', 'v-ping', 'Choose the "Earned." frame as the cover.'),
  (D(11, 22), '12:00', 'post', 'b1', ''),
  (D(11, 23), '19:30', 'post', 'a4', ''),
  (D(11, 24), '19:00', 'video', 'v-snail', 'Cover: the "3–5 business weeks" frame.'),
  (D(11, 25), '19:30', 'post', 'b2', ''),
  (D(11, 26), '19:00', 'carousel', 'c1', ''),
  (D(11, 28), '12:00', 'post', 'p5', ''),
  # week 2: Farmers' Day long weekend (Fri 4 Dec)
  (D(11, 30), '19:30', 'post', 'p1', ''),
  (D(12, 1), '19:00', 'video', 'v-pigeons', 'Cover: "Stop fighting for crumbs."'),
  (D(12, 2), '19:30', 'post', 'a1', ''),
  (D(12, 3), '19:00', 'carousel', 'c2', ''),
  (D(12, 4), '12:00', 'post', 'b6', "Farmers' Day long weekend."),
  (D(12, 5), '12:00', 'post', 'a3', ''),
  # week 3: end of semester
  (D(12, 7), '19:30', 'post', 'p3', ''),
  (D(12, 8), '19:00', 'carousel', 'c3', ''),
  (D(12, 9), '19:30', 'post', 'b7', ''),
  (D(12, 11), '19:30', 'post', 'a2', ''),
  # week 4: schools on break, run-up to Christmas
  (D(12, 13), '19:00', 'video', 'v-hourglass', 'Cover: "Your time was never free. Start charging for it."'),
  (D(12, 14), '19:30', 'post', 'a6', 'Schools are on break.'),
  (D(12, 15), '19:00', 'carousel', 'c4', ''),
  (D(12, 16), '19:30', 'post', 'b3', ''),
  (D(12, 17), '19:00', 'carousel', 'c5', ''),
  (D(12, 18), '19:30', 'post', 'p6', ''),
  (D(12, 19), '12:00', 'post', 'b4', ''),
  (D(12, 20), '12:00', 'post', 'a5', ''),
  # week 5: Christmas
  (D(12, 21), '19:30', 'post', 'p7', ''),
  (D(12, 22), '19:00', 'video', 'v-fridge', 'Cover: the frame with all three labels ("1 milk.", "A jar of… something.", "Hope.").'),
  (D(12, 23), '19:30', 'post', 'b8', 'Christmas week.'),
  (D(12, 24), '19:00', 'video', 'v-ostrich', 'Cover: the extreme close-up with "Let me check again."'),
  (D(12, 26), '12:00', 'post', 'a7', 'Boxing Day.'),
  (D(12, 27), '12:00', 'post', 'p9', 'Optional bold post: only if it tested well with members.'),
  (D(12, 27), '19:00', 'video', 'v-icecream', 'Cover: "Free time melts. Get paid before it does."'),
  # week 6: New Year
  (D(12, 28), '19:30', 'post', 'a9', ''),
  (D(12, 29), '19:00', 'video', 'v-goldfish', 'Cover: "Waiting around to be fed is a goldfish thing."'),
  (D(12, 30), '19:30', 'post', 'b9', ''),
  (D(1, 1, 2027), '12:00', 'post', 'a8', "New Year's Day."),
  (D(1, 2, 2027), '12:00', 'post', 'b5', ''),
  (D(1, 3, 2027), '12:00', 'post', 'p4', ''),
]

def jpeg(src, dst, size=None):
    im = Image.open(src).convert('RGB')
    if size: im = im.resize(size, Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True); im.save(dst, quality=93, optimize=True, progressive=True, subsampling=0)

def x_caption(text, extra):
    """X: the line, the link (links work on X) and two hashtags at most; X counts a link as 23 characters."""
    first = extra.split()[0] if extra else ''
    cap = f'{text}\n\ngigotter.com\n#Gigotter {first}'.strip()
    assert len(cap) - len('gigotter.com') + 23 <= 280, cap
    return cap

def tiktok_caption(text, extra):
    """TikTok: the line, "link in bio" (links in captions aren't clickable) and 4-5 hashtags."""
    bio = '' if 'gigotter.com' in text else ' Link in bio.'
    return f'{text}{bio}\n\n{TAG} {extra}'.strip()

def ig_caption(text, extra):
    """Instagram: the line, "link in bio" (caption links aren't clickable) and 4 hashtags (Instagram now favours 3-5)."""
    bio = '' if 'gigotter.com' in text else ' Link in bio.'
    tags = ' '.join(f'{TAG} {extra}'.split()[:4])
    return f'{text}{bio}\n\n{tags}'.strip()

X_TIME, IG_TIME, TT_TIME, IG_STORY_TIME = '12:30', '19:30', '19:00', '12:00'
FEED, VERT = 'feed-4x5', 'vertical-9x16'   # one copy of each file, shared across platforms
if OUT.exists(): shutil.rmtree(OUT)
rows = []
for n, (day, _time, _where, item, note) in enumerate(CAL, 1):
    stem = f'{n:02d}_{day.isoformat()}'
    # launch tonight: lunchtime has passed, so all three go out in the evening
    x_time, story_time = ('20:00', '') if n == 1 else (X_TIME, IG_STORY_TIME)
    story = []
    if item in POSTS:
        feed, vert, name, text, extra = POSTS[item]
        ff = [OUT / FEED / f'{stem}_{name}.jpg']; jpeg(feed, ff[0])
        vf = [OUT / VERT / f'{stem}_{name}.jpg']; jpeg(vert, vf[0])
        xf, igf, tf, story, kind = ff, ff, vf, vf, 'Post'
    elif item in VIDEOS:
        src, name, text, extra = VIDEOS[item]
        v = OUT / 'videos' / f'{stem}_{name}.mp4'; v.parent.mkdir(parents=True, exist_ok=True); shutil.copy(src, v)
        xf, igf, tf, kind = [v], [v], [v], 'Video'   # one file: X video, Instagram Reel, TikTok
    elif item in CAROUSELS:
        ids, name, text, extra = CAROUSELS[item]
        ff, vf = [], []
        for i, pid in enumerate(ids, 1):
            f = OUT / FEED / f'{stem}_{name}' / f'{i}_{POSTS[pid][2]}.jpg'; jpeg(POSTS[pid][0], f); ff.append(f)
            f = OUT / VERT / f'{stem}_{name}' / f'{i}_{POSTS[pid][2]}.jpg'; jpeg(POSTS[pid][1], f); vf.append(f)
        xf, igf, tf, kind = ff[:4], ff[:10], vf, 'Carousel'   # X takes 4 images, Instagram 10
    else:
        raise SystemExit(f'unknown item {item}')
    rel = lambda fs: ' | '.join(str(f.relative_to(OUT)) for f in fs)
    rows.append({'#': n, 'date': day.isoformat(), 'day': day.strftime('%a'), 'type': kind,
                 'X time': x_time, 'X files': rel(xf), 'X caption': x_caption(text, extra),
                 'Instagram time': IG_TIME, 'Instagram files': rel(igf), 'Instagram caption': ig_caption(text, extra),
                 'Instagram Story': (f'{story_time} · ' + rel(story)) if story and story_time else '',
                 'TikTok time': TT_TIME, 'TikTok files': rel(tf), 'TikTok caption': tiktok_caption(text, extra), 'note': note})

# the #EarnedIt template is not a real story: kept apart so it isn't posted by mistake
jpeg(S1 / 'p8.png', OUT / 'templates' / 'earnedit-story-template_SAMPLE-do-not-post.jpg')

with open(OUT / 'CALENDAR.csv', 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
with open(OUT / 'CAPTIONS.txt', 'w', encoding='utf-8') as fh:
    for r in rows:
        story = f"\n(Instagram Story at {r['Instagram Story']})" if r['Instagram Story'] else ''
        fh.write(f"#{r['#']}  {r['day']} {r['date']}  ·  {r['type']}\n\n"
                 f"TikTok at {r['TikTok time']}:\n{r['TikTok caption']}\n\n"
                 f"Instagram at {r['Instagram time']}:\n{r['Instagram caption']}{story}\n\n"
                 f"X (Twitter) at {r['X time']}:\n{r['X caption']}\n\n{'-' * 60}\n\n")
(OUT / 'calendar.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False))
(OUT / 'README.txt').write_text('''Gigotter social pack for Instagram, X (Twitter) and TikTok: 20 Nov 2026 to 3 Jan 2027

feed-4x5/      4:5 images (2160x2700) for X and the Instagram feed. Carousel days are folders: Instagram takes all of them, X the first 4.
vertical-9x16/ 9:16 images (1080x1920) for TikTok posts and Instagram Stories. Carousel days are folders (upload in order).
videos/        The videos (1080x1920 with sound). Each one goes on X, as an Instagram Reel and on TikTok on its day.
templates/     The #EarnedIt layout with a made-up person. Do not post; swap in a real, consented story.
CALENDAR.csv   Every day: what goes on X (12:30), Instagram (19:30, Story 12:00) and TikTok (19:00), file names, captions and notes.
CAPTIONS.txt   The captions for each platform, each day, ready to copy.

Files are numbered in posting order: 01 is tonight (Fri 20 Nov: TikTok 19:00, Instagram 19:30, X 20:00). Times are Ghana time.
X captions carry the gigotter.com link and 2 hashtags. Instagram and TikTok captions say "Link in bio", so keep gigotter.com in both bios.
Keep money amounts out of captions and headlines so posts don't get flagged.
After week 2, check Admin > Insights > Where people come from (Instagram, X and TikTok show up separately) and post more of what brings sign-ups.
''')
print(len(rows), 'calendar entries;', sum(1 for _ in OUT.rglob('*') if _.is_file()), 'files in', OUT)
