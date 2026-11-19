"""Builds the Gigotter social posting pack: every post as a high-res file named in posting order, captions with hashtags,
and a six-week calendar (23 Nov 2026 to 3 Jan 2027) for Instagram, Facebook, TikTok, Reels, Stories and WhatsApp Status.
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
  'p1': (S1 / 'p1.png', SOC / 'emotion-01/gigotter-earned-s1.png', 'first-time-didnt-ask', 'Remember asking for transport money? There’s another way. Real gigs from real businesses, paid to your mobile money. Link in bio.', '#Accra #StudentLife'),
  'p2': (S1 / 'p2.png', None, 'mum-asked', 'Some phone calls hit different. 💚', '#Ghana #Family'),
  'p3': (S1 / 'p3.png', None, 'lecture-gig-paid', 'Gigs that work around your timetable, not the other way round.', '#StudentLife #Accra'),
  'p4': (S1 / 'p4.png', None, 'pocket-money-phase', 'New year, new rules. We said what we said.', '#NewYear #Ghana'),
  'p5': (S1 / 'p5.png', None, 'time-had-a-price', 'Your hours are worth something. Verified gigs from real businesses in Ghana.', '#GhanaJobs'),
  'p6': (S1 / 'p6.png', SOC / 'emotion-01/gigotter-earned-s6.png', 'first-salary', 'Some people call it a side hustle. We call it a start.', '#Accra #Ghana'),
  'p7': (S1 / 'p7.png', SOC / 'emotion-01/gigotter-earned-s7.png', 'the-ping', 'Turn the volume up. 🔔', '#MobileMoney #Ghana'),
  'p9': (S1 / 'p9.png', None, 'broke-not-a-personality', 'Plenty of ways to fix that. One of them is at gigotter.com. (Bold one: post only if it tested well.)', '#Ghana #StudentLife'),
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
  'v-snail': (SOC / 'emotion-02/video/gigotter-earned-snail.mp4', 'snail-video', 'Still waiting? 🐌', '#Relatable #Ghana #StudentLife'),
  'v-pigeons': (SOC / 'emotion-02/video-pigeons/gigotter-earned-pigeons.mp4', 'pigeons-video', 'Get your own bread. 🍞', '#Accra #GhanaJobs #StudentLife'),
}
CAROUSELS = {  # TikTok photo carousels from the Story versions
  'c1': (['a1', 'a2', 'a3'], 'odd-ones', 'Which one is you? 🐌🐠👀', '#Relatable #Ghana #StudentLife'),
  'c2': (['b1', 'b2', 'b3'], 'treat-people', 'Treat your people. With your own money. 💛', '#Accra #Ghana #Friends'),
  'c3': (['a6', 'a7', 'a8', 'a9'], 'time-is-money', 'Your free time is worth more than you think. ⏳', '#Vacation #StudentLife #Ghana'),
  'c4': (['b4', 'b5', 'b6'], 'self-funded', 'Self-funded hits different.', '#Christmas #Accra #Ghana'),
  'c5': (['b7', 'b8', 'b9'], 'that-feeling', 'Fees sorted. Jollof bought. Notification landed. 🔔', '#StudentLife #Ghana #MobileMoney'),
}

D = lambda m, d, y=2026: dt.date(y, m, d)
# (date, time, platforms, item, note)
CAL = [
  # week 1: launch
  (D(11, 23), '19:30', 'Instagram + Facebook feed', 'p2', 'Launch post. Pin it to the top of the profile.'),
  (D(11, 24), '19:00', 'TikTok + Instagram Reels', 'v-ping', 'Choose the "Earned." frame as the cover.'),
  (D(11, 25), '19:30', 'Instagram + Facebook feed', 'b1', ''),
  (D(11, 26), '19:00', 'TikTok + Instagram Reels', 'v-snail', 'Cover: the "3–5 business weeks" frame.'),
  (D(11, 27), '19:30', 'Instagram + Facebook feed', 'a4', ''),
  (D(11, 28), '12:00', 'Instagram + Facebook feed', 'b2', 'Weekend: post around midday.'),
  (D(11, 29), '19:00', 'TikTok carousel', 'c1', ''),
  # week 2: Farmers' Day long weekend (Fri 4 Dec)
  (D(11, 30), '19:30', 'Instagram + Facebook feed', 'p1', ''),
  (D(12, 1), '19:00', 'TikTok + Instagram Reels', 'v-pigeons', 'Cover: "Stop fighting for crumbs."'),
  (D(12, 2), '19:30', 'Instagram + Facebook feed', 'a1', ''),
  (D(12, 3), '19:00', 'TikTok carousel', 'c2', ''),
  (D(12, 4), '12:00', 'Instagram + Facebook feed', 'b6', "Farmers' Day long weekend."),
  (D(12, 5), '12:00', 'Instagram + Facebook feed', 'a3', ''),
  # week 3: end of semester
  (D(12, 7), '19:30', 'Instagram + Facebook feed', 'p3', ''),
  (D(12, 8), '19:00', 'TikTok carousel', 'c3', ''),
  (D(12, 9), '19:30', 'Instagram + Facebook feed', 'b7', ''),
  (D(12, 11), '19:30', 'Instagram + Facebook feed', 'a2', ''),
  (D(12, 12), '12:00', 'Instagram + Facebook feed', 'p5', ''),
  # week 4: schools on break, run-up to Christmas
  (D(12, 14), '19:30', 'Instagram + Facebook feed', 'a6', 'Schools are on break.'),
  (D(12, 15), '19:00', 'TikTok carousel', 'c4', ''),
  (D(12, 16), '19:30', 'Instagram + Facebook feed', 'b3', ''),
  (D(12, 17), '19:00', 'TikTok carousel', 'c5', ''),
  (D(12, 18), '19:30', 'Instagram + Facebook feed', 'p6', ''),
  (D(12, 19), '12:00', 'Instagram + Facebook feed', 'b4', ''),
  (D(12, 20), '12:00', 'Instagram + Facebook feed', 'a5', ''),
  # week 5: Christmas
  (D(12, 21), '19:30', 'Instagram + Facebook feed', 'p7', ''),
  (D(12, 22), '19:00', 'TikTok + Instagram Reels', 'repost', 'Repost the best video so far (most shares in TikTok analytics).'),
  (D(12, 23), '19:30', 'Instagram + Facebook feed', 'b8', 'Christmas week.'),
  (D(12, 26), '12:00', 'Instagram + Facebook feed', 'a7', 'Boxing Day.'),
  (D(12, 27), '12:00', 'Instagram + Facebook feed', 'p9', 'Optional bold post: only if it tested well with members.'),
  # week 6: New Year
  (D(12, 28), '19:30', 'Instagram + Facebook feed', 'a9', ''),
  (D(12, 29), '19:00', 'TikTok + Instagram Reels', 'repost', 'Repost the second-best video.'),
  (D(12, 30), '19:30', 'Instagram + Facebook feed', 'b9', ''),
  (D(1, 1, 2027), '12:00', 'Instagram + Facebook feed', 'a8', "New Year's Day."),
  (D(1, 2, 2027), '12:00', 'Instagram + Facebook feed', 'b5', ''),
  (D(1, 3, 2027), '12:00', 'Instagram + Facebook feed', 'p4', ''),
]

def jpeg(src, dst, size=None):
    im = Image.open(src).convert('RGB')
    if size: im = im.resize(size, Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True); im.save(dst, quality=93, optimize=True, progressive=True, subsampling=0)

def tags(extra): return f'{TAG} {extra}'.strip()

if OUT.exists(): shutil.rmtree(OUT)
rows, thumbs = [], {}
for n, (day, time, where, item, note) in enumerate(CAL, 1):
    stem = f'{n:02d}_{day.isoformat()}'
    files, caption, hashtags = [], '', ''
    if item in POSTS:
        feed, story, name, caption, extra = POSTS[item]; hashtags = tags(extra)
        f = OUT / 'feed' / f'{stem}_{name}.jpg'; jpeg(feed, f); files.append(f)
        if story:  # same post as a Story / WhatsApp Status at lunchtime
            s = OUT / 'stories-status' / f'{stem}_{name}-story.jpg'; jpeg(story, s); files.append(s)
        thumbs[item] = feed
    elif item in VIDEOS:
        src, name, caption, extra = VIDEOS[item]; hashtags = tags(extra)
        f = OUT / 'videos' / f'{stem}_{name}.mp4'; f.parent.mkdir(parents=True, exist_ok=True); shutil.copy(src, f); files.append(f)
    elif item in CAROUSELS:
        ids, name, caption, extra = CAROUSELS[item]; hashtags = tags(extra)
        for i, pid in enumerate(ids, 1):
            f = OUT / 'tiktok-carousels' / f'{stem}_{name}' / f'{i}_{POSTS[pid][2]}.jpg'; jpeg(POSTS[pid][1], f); files.append(f)
    rows.append({'#': n, 'date': day.isoformat(), 'day': day.strftime('%a'), 'time (Ghana)': time, 'where': where, 'post': item,
                 'files': ' | '.join(str(x.relative_to(OUT)) for x in files), 'caption': caption, 'hashtags': hashtags,
                 'story/status': '12:30 same day: post the -story file to Instagram Stories and WhatsApp Status' if any('stories-status' in str(x) for x in files) else '',
                 'note': note})

# the #EarnedIt template is not a real story: kept apart so it isn't posted by mistake
jpeg(S1 / 'p8.png', OUT / 'templates' / 'earnedit-story-template_SAMPLE-do-not-post.jpg')

with open(OUT / 'CALENDAR.csv', 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
with open(OUT / 'CAPTIONS.txt', 'w', encoding='utf-8') as fh:
    for r in rows:
        if not r['caption']: continue
        fh.write(f"#{r['#']}  {r['date']} {r['day']} {r['time (Ghana)']}  ·  {r['where']}\n{r['caption']}\n\n{r['hashtags']}\n\n{'-' * 60}\n\n")
(OUT / 'calendar.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False))
(OUT / 'README.txt').write_text('''Gigotter social pack: 23 Nov 2026 to 3 Jan 2027

feed/              Instagram + Facebook feed posts, 2160x2700 (4:5). Upload as they are; Instagram shrinks them cleanly.
stories-status/    1080x1920 versions for Instagram Stories and WhatsApp Status, same day at 12:30.
tiktok-carousels/  1080x1920 photo carousels for TikTok (upload the folder's images in order).
videos/            TikTok + Instagram Reels videos with their own sound, 1080x1920.
templates/         The #EarnedIt layout with a made-up person. Do not post; swap in a real, consented story.
CALENDAR.csv       Every post: date, time (Ghana time), where, file names, caption, hashtags, notes. Opens in Excel or Google Sheets.
CAPTIONS.txt       Captions and hashtags ready to copy.

Files are numbered in posting order. Times are suggestions: weekday evenings 19:00-19:30, weekends around noon.
Rules that keep posts safe on TikTok: no money amounts in captions or headlines, no links in videos (link in bio instead).
After week 2, check Admin > Insights > Where people come from, and post more of what brings sign-ups.
''')
print(len(rows), 'calendar entries;', sum(1 for _ in OUT.rglob('*') if _.is_file()), 'files in', OUT)
