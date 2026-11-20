"""Builds the calendar web page (published as an artifact) from a built pack: one card per day with the X, Instagram and
TikTok posts side by side, each with its own caption and copy button.
usage: python3 build_calendar_page.py PACKDIR OUTDIR  ->  OUTDIR/index.html + OUTDIR/media/* (small previews and the videos)"""
import datetime as dt, html, json, pathlib, shutil, sys
from PIL import Image
PACK, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
SOC = pathlib.Path(__file__).resolve().parent.parent
COVERS = {'ping': SOC / 'emotion-01/video/cover.png', 'snail': SOC / 'video-kit/out/cover-snail-footage.png', 'pigeons': SOC / 'video-kit/out/cover-pigeons-footage.png',
          'fridge': SOC / 'emotion-02/video-fridge/cover.png', 'goldfish': SOC / 'video-kit/out/cover-goldfish.png',
          'ostrich': SOC / 'video-kit/out/cover-ostrich.png', 'icecream': SOC / 'video-kit/out/cover-icecream-footage.png',
          'hourglass': SOC / 'video-kit/out/cover-hourglass-footage.png'}
rows = json.loads((PACK / 'calendar.json').read_text())
MEDIA = OUT / 'media'
if MEDIA.exists(): shutil.rmtree(MEDIA)
MEDIA.mkdir(parents=True)
e = html.escape

def thumb(rel, w):
    src = PACK / rel; dst = MEDIA / rel.replace('/', '__')
    im = Image.open(src).convert('RGB'); im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(dst.with_suffix('.jpg'), quality=80, optimize=True, progressive=True)
    return 'media/' + dst.with_suffix('.jpg').name

def video(rel):
    src = PACK / rel; dst = MEDIA / src.name
    if not dst.exists(): shutil.copy(src, dst)
    cover = COVERS[next(k for k in COVERS if k in src.name)]; poster = MEDIA / (src.stem + '-poster.jpg')
    if not poster.exists(): Image.open(cover).convert('RGB').resize((540, 960), Image.LANCZOS).save(poster, quality=80)
    return f'<video src="media/{e(dst.name)}" poster="media/{e(poster.name)}" controls playsinline preload="none" width="1080" height="1920"></video>'

def media(files, w):
    fs = [f for f in files.split(' | ') if f]
    if fs and fs[0].endswith('.mp4'): return f'<div class="media">{video(fs[0])}</div>'
    imgs = ''.join(f'<img src="{e(thumb(f, w))}" alt="" loading="lazy">' for f in fs)
    return f'<div class="media{" multi" if len(fs) > 1 else ""}">{imgs}</div>'

def side(label, time, files, cap, cid, w, extra=''):
    fl = ''.join(f'<li>{e(f)}</li>' for f in files.split(' | ') if f)
    return f'''<div class="side"><div class="plat"><b>{label}</b><span>{e(time)}</span></div>{media(files, w)}{extra}
  <div class="cap" id="{cid}">{e(cap)}</div><button type="button" class="copy" data-for="{cid}">Copy {label} caption</button>
  <details><summary>Files</summary><ul>{fl}</ul></details></div>'''

def story(r):
    return f'<div class="story">+ Story at {e(r["Instagram Story"].split(" · ")[0])}: the 9:16 version</div>' if r['Instagram Story'] else ''

TITLES = {1: 'Launch', 2: "Farmers' Day long weekend", 3: 'End of semester', 4: 'Schools on break, run-up to Christmas', 5: 'Christmas', 6: 'New Year'}
weeks = {}
for r in rows:
    d = dt.date.fromisoformat(r['date']); wk = max(1, (d - dt.date(2026, 11, 23)).days // 7 + 1)   # launch week runs Fri 20 to Sun 29 Nov
    note = f'<div class="note">{e(r["note"])}</div>' if r['note'] else ''
    weeks.setdefault(wk, []).append(f'''<article class="day">
  <header><div class="when"><b>{d.strftime('%a %d %b')}</b><span>#{r['#']:02d}</span></div><span class="tag {r['type'].lower()}">{e(r['type'])}</span></header>
  <div class="sides">{side('X', r['X time'], r['X files'], r['X caption'], f"x{r['#']}", 260)}{side('Instagram', r['Instagram time'], r['Instagram files'], r['Instagram caption'], f"i{r['#']}", 260, story(r))}{side('TikTok', r['TikTok time'], r['TikTok files'], r['TikTok caption'], f"t{r['#']}", 220)}</div>
  {note}</article>''')
sections = ''.join(f'<section class="week"><h2><span>Week {w}</span>{e(TITLES.get(w, ""))}</h2><div class="days">{"".join(c)}</div></section>' for w, c in weeks.items())
n = {t: sum(r['type'] == t for r in rows) for t in ('Post', 'Video', 'Carousel')}

page = f'''<title>Gigotter Posting Calendar</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@500;600;700&family=Inter+Tight:wght@400;500;600&display=swap">
<style>
/* Layout: deep-green header, then one band per week; each day is a card with the X post and the TikTok post side by side */
:root {{ --bg:#FFFFFF; --sand:#F1F5F2; --line:#E3E9E4; --ink:#131317; --muted:#5C625E; --brand:#245A44; --deep:#10291F; --mint:#B7CDBE; --card:#FFFFFF;
  --display:'Onest','Inter Tight',system-ui,sans-serif; --body:'Inter Tight',system-ui,-apple-system,'Segoe UI',sans-serif; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#0E1512; --sand:#16211C; --line:#26332D; --ink:#ECF1EE; --muted:#A3B0A8; --brand:#8DB59E; --deep:#0A1C15; --card:#121B17; color-scheme:dark }} }}
:root[data-theme="dark"] {{ --bg:#0E1512; --sand:#16211C; --line:#26332D; --ink:#ECF1EE; --muted:#A3B0A8; --brand:#8DB59E; --deep:#0A1C15; --card:#121B17; color-scheme:dark }}
* {{ box-sizing:border-box }}
body {{ margin:0; background:var(--bg); color:var(--ink); font:400 16px/1.55 var(--body) }}
.wrap {{ max-width:1180px; margin:0 auto; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)) }}
.top {{ background:var(--deep); color:#fff }}
.top .wrap {{ padding-block:56px 44px; display:grid; gap:18px }}
.top h1 {{ font:700 clamp(40px,7vw,76px)/.95 var(--display); letter-spacing:-.05em; margin:0; text-wrap:balance }}
.top h1 span {{ color:var(--mint) }}
.top p {{ margin:0; max-width:66ch; color:rgba(255,255,255,.8) }}
.facts {{ display:flex; flex-wrap:wrap; gap:10px }}
.facts span {{ background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14); border-radius:999px; padding:6px 14px; font-size:14px; color:rgba(255,255,255,.85) }}
.how {{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; padding-block:28px }}
.how div {{ background:var(--sand); border-radius:18px; padding:16px 18px; font-size:14.5px; color:var(--muted) }}
.how b {{ display:block; color:var(--ink); font:600 15px var(--display); margin-bottom:4px }}
.week {{ border-top:1px solid var(--line); padding-block:32px }}
.week h2 {{ margin:0 0 18px; font:700 26px var(--display); letter-spacing:-.03em; display:flex; gap:12px; align-items:baseline; flex-wrap:wrap }}
.week h2 span {{ font:600 13px var(--body); letter-spacing:.12em; text-transform:uppercase; color:var(--brand) }}
.days {{ display:grid; grid-template-columns:1fr; gap:18px }}
.day {{ border:1px solid var(--line); border-radius:20px; background:var(--card); padding:16px; display:grid; gap:12px; align-content:start; min-width:0 }}
.day header {{ display:flex; justify-content:space-between; align-items:center; gap:8px }}
.when {{ display:flex; gap:10px; align-items:baseline }} .when b {{ font:600 18px var(--display) }} .when span {{ color:var(--muted); font-size:13px; font-variant-numeric:tabular-nums }}
.tag {{ font:500 12px var(--body); padding:4px 10px; border-radius:999px; background:var(--sand); color:var(--muted) }}
.tag.video, .tag.carousel {{ background:var(--deep); color:var(--mint) }}
.sides {{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px }}
.story {{ font-size:12.5px; color:var(--brand) }}
.side {{ display:grid; gap:8px; align-content:start; min-width:0 }}
.plat {{ display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid var(--line); padding-bottom:6px }}
.plat b {{ font:600 15px var(--display) }} .plat span {{ color:var(--muted); font-size:13.5px; font-variant-numeric:tabular-nums }}
.media img, .media video {{ width:100%; height:auto; border-radius:12px; display:block; background:var(--sand) }}
.media video {{ aspect-ratio:9/16; max-height:380px; object-fit:cover }}
.media.multi {{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px }}
.media img {{ max-height:420px; object-fit:contain; background:var(--sand) }}
.media video {{ max-height:420px }}
.media.multi img {{ max-height:none }}
.cap {{ white-space:pre-wrap; font-size:14px; overflow-wrap:anywhere }}
.copy {{ justify-self:start; font:600 13px var(--body); border:1px solid var(--line); background:var(--bg); color:var(--ink); border-radius:999px; padding:7px 14px; cursor:pointer }}
.copy:hover {{ border-color:var(--brand) }} .copy:focus-visible {{ outline:2px solid var(--brand); outline-offset:2px }}
.note {{ font-size:13px; color:var(--muted); background:var(--sand); border-radius:10px; padding:8px 10px }}
details {{ font-size:12.5px; color:var(--muted) }} details ul {{ margin:6px 0 0; padding-left:18px; overflow-wrap:anywhere }}
footer {{ border-top:1px solid var(--line); padding-block:28px 48px; color:var(--muted); font-size:14px }}
@media (max-width:900px) {{ .how {{ grid-template-columns:1fr }} .sides {{ grid-template-columns:1fr 1fr }} }}
@media (max-width:560px) {{ .sides {{ grid-template-columns:1fr }} }}
</style>
<header class="top"><div class="wrap">
  <h1>Posting calendar<span>.</span></h1>
  <p>Gigotter on Instagram, X and TikTok, from tonight (Friday 20 November 2026) to 3 January 2027. Each day shows what goes on each platform, with captions written for each. All files are in the download pack (gigotter-social-pack.zip), numbered in posting order.</p>
  <div class="facts"><span>{n['Post']} post days</span><span>{n['Video']} video days</span><span>{n['Carousel']} carousel days</span><span>X 12:30 · TikTok 19:00 · Instagram 19:30</span><span>Ghana time</span></div>
</div></header>
<main class="wrap">
  <div class="how">
    <div><b>X (Twitter) · 12:30</b>The 4:5 image from feed-4x5/, the day’s video from videos/, or the first 4 images on carousel days. The caption carries the gigotter.com link and two hashtags.</div>
    <div><b>Instagram · 19:30</b>The same 4:5 image as a feed post, the video as a Reel, or all the images as a carousel. On post days, also share the 9:16 version from vertical-9x16/ as a Story at 12:00.</div>
    <div><b>TikTok · 19:00</b>The 9:16 photo or carousel from vertical-9x16/, or the day’s video. Instagram and TikTok captions say “Link in bio”, so keep gigotter.com in both bios. Tonight: TikTok 19:00, Instagram 19:30, X 20:00.</div>
  </div>
  {sections}
</main>
<footer><div class="wrap">After week 2, check Admin → Insights → Where people come from: Instagram, X and TikTok show up as separate sources, so you can see which brings sign-ups. Keep money amounts out of captions and headlines so TikTok doesn’t flag posts. The #EarnedIt template in the pack is a sample: only post real stories with permission.</div></footer>
<script>
document.addEventListener('click', async (ev) => {{
  const b = ev.target.closest('.copy'); if (!b) return
  const el = document.getElementById(b.dataset.for), label = b.textContent
  try {{ await navigator.clipboard.writeText(el.textContent); b.textContent = 'Copied' }}
  catch {{ const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected: press copy' }}
  setTimeout(() => {{ b.textContent = label }}, 1800)
}})
</script>'''
(OUT / 'index.html').write_text(page, encoding='utf-8')
print('wrote', OUT / 'index.html', len(list(MEDIA.iterdir())), 'media files')
