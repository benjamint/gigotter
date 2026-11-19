"""Gigotter "Earned." series 2: abstract and odd Pexels photos with provocative lines. 1080x1350, rendered at 2x (2160x2700).
usage: python3 build.py PHOTODIR OUT.html [--story]  then  node render.cjs OUT.html OUTDIR
PHOTODIR holds <pexels id>.jpg downloaded from images.pexels.com (see CREDITS.md)."""
import base64, pathlib, sys
PHOTOS = pathlib.Path(sys.argv[1])
STORY = '--story' in sys.argv  # 1080x1920 TikTok/Story version, words kept clear of the app's buttons and caption
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')
def font(pkg, f): return 'data:font/woff;base64,' + base64.b64encode((FONTS / pkg / 'package/files' / f).read_bytes()).decode()
ON, IT = 'fontsource-onest-5.1.0', 'fontsource-inter-tight-5.1.0'
faces = ''.join(f"@font-face {{ font-family: 'Onest'; font-weight: {w}; src: url('{font(ON, f'onest-latin-{w}-normal.woff')}'); }}" for w in (500, 600, 700)) + \
        ''.join(f"@font-face {{ font-family: 'Tight'; font-weight: {w}; src: url('{font(IT, f'inter-tight-latin-{w}-normal.woff')}'); }}" for w in (400, 500))
LOGO = 'data:image/png;base64,' + base64.b64encode(pathlib.Path('/home/user/wemove/public/logo-mark.png').read_bytes()).decode()
def ph(i): return 'data:image/jpeg;base64,' + base64.b64encode((PHOTOS / f'{i}.jpg').read_bytes()).decode()

css = faces + """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #222; }
.a { width: 1080px; height: 1350px; position: relative; overflow: hidden; margin-bottom: 40px; font-family: Tight, sans-serif; --fg: #fff; --soft: rgba(255,255,255,.72); --acc: #B7CDBE; color: var(--fg); }
.a.light { --fg: #131317; --soft: #4A504C; --acc: #245A44; }
.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.shade-top::before, .shade-bot::before, .shade-both::before, .shade-foot::before { content: ''; position: absolute; inset: 0; z-index: 1; }
.shade-both::before { background: linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0) 40%), linear-gradient(0deg, rgba(0,0,0,.75), rgba(0,0,0,0) 30%); }
.shade-foot::before { background: linear-gradient(0deg, rgba(10,22,17,.85), rgba(10,22,17,0) 24%); }
.shade-top::before { background: linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0) 45%); }
.shade-bot::before { background: linear-gradient(0deg, rgba(10,22,17,.8), rgba(10,22,17,0) 55%); }
.copy { position: absolute; left: 80px; right: 80px; z-index: 2; }
.copy.top { top: 84px; } .copy.bot { bottom: 190px; }
.l1 { font: 600 76px/1.02 Onest; letter-spacing: -0.045em; text-wrap: balance; }
.l1.xl { font-size: 104px; font-weight: 700; line-height: .96; }
.l2 { margin-top: 18px; font: 500 40px/1.2 Onest; letter-spacing: -0.03em; color: var(--acc); }
.foot { position: absolute; left: 80px; right: 80px; bottom: 72px; z-index: 2; display: flex; justify-content: space-between; align-items: center; }
.earned { font: 600 40px Onest; letter-spacing: -0.03em; color: var(--acc); }
.mark { display: flex; align-items: center; gap: 12px; font: 500 24px Tight; color: var(--soft); }
.mark img { width: 52px; height: 52px; }
.sticker { position: absolute; left: 80px; bottom: 190px; z-index: 2; background: #10291F; color: #fff; padding: 34px 40px 38px; border-radius: 28px; max-width: 760px; }
.sticker .l1 { font-size: 96px; font-weight: 700; line-height: .96; }
.sticker .l1 em { font-style: normal; color: #B7CDBE; }
/* story: 1080x1920; TikTok covers ~200px at the top, ~420px at the bottom and ~150px on the right */
.story { height: 1920px; }
.story .copy { right: 170px; } .story .copy.top { top: 240px; } .story .copy.bot { bottom: 470px; }
.story .foot { bottom: 340px; right: 170px; }
.story .sticker { bottom: 470px; }
.story .l1 { font-size: 84px; } .story .l1.xl { font-size: 108px; }
.story.shade-bot::before { background: linear-gradient(0deg, rgba(10,22,17,.85), rgba(10,22,17,.55) 30%, rgba(10,22,17,0) 55%); }
.story.shade-both::before { background: linear-gradient(180deg, rgba(0,0,0,.78), rgba(0,0,0,.45) 22%, rgba(0,0,0,0) 40%), linear-gradient(0deg, rgba(0,0,0,.75), rgba(0,0,0,0) 32%); }
.story.shade-foot::before { background: linear-gradient(0deg, rgba(10,22,17,.9), rgba(10,22,17,0) 34%); }
"""

def art(id, pid, l1, l2='', place='top', light=False, shade='', pos='center', big=False, sticker=False):
    cls = 'a' + (' story' if STORY else '') + (' light' if light else '') + (f' shade-{shade}' if shade else '')
    if sticker:
        copy = f'<div class="sticker"><div class="l1">{l1}</div></div>'
    else:
        copy = f'<div class="copy {place}"><div class="l1{" xl" if big else ""}">{l1}</div>{f"<div class=l2>{l2}</div>" if l2 else ""}</div>'
    return f'''<section class="{cls}" id="{id}{'-story' if STORY else ''}"><img class="bg" src="{ph(pid)}" style="object-position:{pos}">{copy}
<div class="foot"><span class="earned">Earned.</span><span class="mark"><img src="{LOGO}">gigotter.com</span></div></section>'''

slides = [
    art('a1', 31280238, 'Asking your uncle<br>for money.', 'Response time: 3–5 business weeks.', place='bot', pos='55% 50%'),
    art('a2', 8434694, 'Waiting around<br>to be fed is a<br>goldfish thing.', light=True, pos='74% 50%'),
    art('a3', 1201397, 'Hiding from your<br>balance won’t fix it.', place='bot', shade='bot', pos='52% 50%'),
    art('a4', 18132498, 'Stop fighting<br>for crumbs.', place='bot', shade='bot', big=True, pos='50% 60%'),
    art('a5', 4058699, 'This fridge<br>deserves better.', shade='both', pos='50% 55%'),
    art('a6', 4725724, 'Free time melts.', 'Get paid before it does.', light=True, pos='50% 0%'),
    art('a7', 6402524, 'Idle hours<br>are just money<br>waiting.', place='bot', light=True, pos='50% 100%'),
    art('a8', 33795954, 'Your time was<br>never free.', 'Start charging for it.', pos='50% 60%'),
    art('a9', 6273478, 'Boredom is<br><em>expensive.</em>', sticker=True, shade='foot', pos='50% 50%'),
]
html = f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{"".join(slides)}</body></html>'
pathlib.Path(sys.argv[2]).write_text(html); print('wrote', sys.argv[2], len(html) // 1024, 'KB')
