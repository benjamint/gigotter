"""Builds the calendar web page (published as an artifact) from a built pack.
usage: python3 build_calendar_page.py PACKDIR OUTDIR  ->  OUTDIR/index.html + OUTDIR/media/* (small previews and the videos)"""
import datetime as dt, html, json, pathlib, shutil, sys
from PIL import Image
PACK, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
rows = json.loads((PACK / 'calendar.json').read_text())
(OUT / 'media').mkdir(parents=True, exist_ok=True)
e = html.escape

def thumb(rel, w=360):
    src = PACK / rel; dst = OUT / 'media' / (src.stem + '.jpg')
    im = Image.open(src).convert('RGB'); im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(dst, quality=80, optimize=True, progressive=True)
    return 'media/' + dst.name, im.width, im.height

SOC = pathlib.Path(__file__).resolve().parent.parent
COVERS = {'ping': SOC / 'emotion-01/video/cover.png', 'snail': SOC / 'emotion-02/video/cover.png', 'pigeons': SOC / 'emotion-02/video-pigeons/cover.png', 'fridge': SOC / 'emotion-02/video-fridge/cover.png', 'goldfish': SOC / 'video-kit/out/cover-goldfish.png', 'ostrich': SOC / 'video-kit/out/cover-ostrich.png', 'icecream': SOC / 'video-kit/out/cover-icecream.png'}
PLAT = {'Instagram + Facebook feed': 'feed', 'TikTok + Instagram Reels': 'video', 'TikTok carousel': 'carousel'}
weeks, cards = {}, []
for r in rows:
    d = dt.date.fromisoformat(r['date']); wk = max(1, (d - dt.date(2026, 11, 23)).days // 7 + 1)  # launch week runs Fri 20 to Sun 29 Nov
    files = [f for f in r['files'].split(' | ') if f]
    media = ''
    for f in files:
        if f.endswith('.mp4'):
            dst = OUT / 'media' / pathlib.Path(f).name; shutil.copy(PACK / f, dst)
            cover = COVERS[next(k for k in COVERS if k in f)]; pdst = OUT / 'media' / (dst.stem + '-poster.jpg')
            Image.open(cover).convert('RGB').resize((540, 960), Image.LANCZOS).save(pdst, quality=80)
            media += f'<video src="media/{e(dst.name)}" poster="media/{e(pdst.name)}" controls playsinline preload="none" width="1080" height="1920"></video>'
        elif 'stories-status' not in f:
            src, w, h = thumb(f, 300 if 'carousel' in f else 360)
            media += f'<img src="{e(src)}" alt="" loading="lazy" width="{w}" height="{h}">'
    kind = PLAT.get(r['where'], 'video')
    cap = (r['caption'] + '\n\n' + r['hashtags']).strip()
    body = (f'<div class="cap" id="cap{r["#"]}">{e(cap)}</div><button type="button" class="copy" data-for="cap{r["#"]}">Copy caption</button>' if r['caption']
            else '<div class="cap muted">No new file: repost your best-performing video so far.</div>')
    story = '<div class="story">Also at 12:30: the Story version on Instagram Stories and WhatsApp Status</div>' if r['story/status'] else ''
    note = f'<div class="note">{e(r["note"])}</div>' if r['note'] else ''
    filelist = ''.join(f'<li>{e(f)}</li>' for f in files)
    weeks.setdefault(wk, []).append(f'''<article class="slot {kind}">
  <header><div class="when"><b>{d.strftime('%a %d %b')}</b><span>{e(r['time (Ghana)'])}</span></div><span class="tag">{e(r['where'])}</span></header>
  <div class="media {'multi' if media.count('<img') > 1 else ''}">{media}</div>
  {body}{story}{note}
  <details><summary>Files in the pack</summary><ul>{filelist}</ul></details>
</article>''')

TITLES = {1: 'Launch', 2: "Farmers' Day long weekend", 3: 'End of semester', 4: 'Schools on break, run-up to Christmas', 5: 'Christmas', 6: 'New Year'}
sections = ''.join(f'<section class="week"><h2><span>Week {w}</span>{e(TITLES.get(w, ""))}</h2><div class="slots">{"".join(c)}</div></section>' for w, c in weeks.items())
counts = {k: sum(1 for r in rows if PLAT.get(r['where']) == k) for k in ('feed', 'video', 'carousel')}

page = f'''<title>Gigotter Posting Calendar</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@500;600;700&family=Inter+Tight:wght@400;500;600&display=swap">
<style>
/* Layout: a deep-green header, then one band per week with a responsive grid of post cards */
:root {{ --bg:#FFFFFF; --sand:#F1F5F2; --line:#E3E9E4; --ink:#131317; --muted:#5C625E; --brand:#245A44; --deep:#10291F; --mint:#B7CDBE; --yellow:#F9C93A; --card:#FFFFFF;
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
.slots {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:18px }}
.slot {{ border:1px solid var(--line); border-radius:20px; background:var(--card); padding:14px; display:grid; gap:10px; align-content:start; min-width:0 }}
.slot header {{ display:flex; justify-content:space-between; align-items:flex-start; gap:8px }}
.when {{ display:grid }} .when b {{ font:600 16px var(--display) }} .when span {{ color:var(--muted); font-size:13.5px; font-variant-numeric:tabular-nums }}
.tag {{ font:500 11.5px var(--body); padding:4px 9px; border-radius:999px; background:var(--sand); color:var(--muted); text-align:right }}
.video .tag, .carousel .tag {{ background:var(--deep); color:var(--mint) }}
.media img, .media video {{ width:100%; height:auto; border-radius:12px; display:block; background:var(--sand) }}
.media video {{ aspect-ratio:9/16; max-height:420px; object-fit:cover }}
.media.multi {{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px }}
.cap {{ white-space:pre-wrap; font-size:14.5px; overflow-wrap:anywhere }}
.cap.muted {{ color:var(--muted) }}
.copy {{ justify-self:start; font:600 13px var(--body); border:1px solid var(--line); background:var(--bg); color:var(--ink); border-radius:999px; padding:7px 14px; cursor:pointer }}
.copy:hover {{ border-color:var(--brand) }} .copy:focus-visible {{ outline:2px solid var(--brand); outline-offset:2px }}
.story {{ font-size:13px; color:var(--brand) }}
.note {{ font-size:13px; color:var(--muted); background:var(--sand); border-radius:10px; padding:8px 10px }}
details {{ font-size:12.5px; color:var(--muted) }} details ul {{ margin:6px 0 0; padding-left:18px; overflow-wrap:anywhere }}
footer {{ border-top:1px solid var(--line); padding-block:28px 48px; color:var(--muted); font-size:14px }}
@media (max-width:760px) {{ .how {{ grid-template-columns:1fr }} }}
</style>
<header class="top"><div class="wrap">
  <h1>Posting calendar<span>.</span></h1>
  <p>Gigotter posts from today, Friday 20 November 2026, to 3 January 2027. Every post has its file name, caption and hashtags. All files are in the download pack (gigotter-social-pack.zip), named in posting order, so post 01 goes first.</p>
  <div class="facts"><span>{counts['feed']} feed posts</span><span>{counts['video']} video slots</span><span>{counts['carousel']} TikTok carousels</span><span>21 Story / Status versions</span><span>Times in Ghana time</span></div>
</div></header>
<main class="wrap">
  <div class="how">
    <div><b>Instagram + Facebook feed</b>Upload the feed file (2160×2700). Paste the caption and share to Facebook from Instagram.</div>
    <div><b>TikTok + Reels</b>Upload the video, choose the cover frame in the notes, and paste the caption. Same video to Instagram Reels.</div>
    <div><b>Stories and WhatsApp Status</b>On days marked, post the matching Story file at 12:30 to Instagram Stories and your WhatsApp Status.</div>
  </div>
  {sections}
</main>
<footer><div class="wrap">After week 2, check Admin → Insights → Where people come from and lean into what brings sign-ups. Keep money amounts out of captions and headlines so TikTok doesn’t flag posts. The #EarnedIt template in the pack is a sample: only post real stories with permission.</div></footer>
<script>
document.addEventListener('click', async (ev) => {{
  const b = ev.target.closest('.copy'); if (!b) return
  const el = document.getElementById(b.dataset.for)
  try {{ await navigator.clipboard.writeText(el.textContent); b.textContent = 'Copied' }}
  catch {{ const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected: press copy' }}
  setTimeout(() => {{ b.textContent = 'Copy caption' }}, 1800)
}})
</script>'''
(OUT / 'index.html').write_text(page, encoding='utf-8')
print('wrote', OUT / 'index.html', len(list((OUT / 'media').iterdir())), 'media files')
