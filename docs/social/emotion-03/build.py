"""Gigotter series 3: bold banners, crowd-pleasing Pexels photos, only the yellow otter icon. 1080x1350 rendered at 2x.
usage: python3 build.py PHOTODIR OUT.html [--story]  then  node render.cjs OUT.html OUTDIR   (photos: <pexels id>.jpg, see CREDITS.md)"""
import base64, pathlib, sys
PHOTOS = pathlib.Path(sys.argv[1])
STORY = '--story' in sys.argv  # 1080x1920 TikTok/Story version, words kept clear of the app's buttons and caption
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')
def b64(p, mime): return f'data:{mime};base64,' + base64.b64encode(pathlib.Path(p).read_bytes()).decode()
ON = FONTS / 'fontsource-onest-5.1.0/package/files'
faces = f"@font-face {{ font-family: 'Onest'; font-weight: 700; src: url('{b64(ON / 'onest-latin-700-normal.woff', 'font/woff')}'); }}"
ICON = b64('/home/user/wemove/public/icon-512.png', 'image/png')
YELLOW = '#F9C93A'

css = faces + f"""
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ background: #222; }}
.a {{ width: 1080px; height: 1350px; position: relative; overflow: hidden; margin-bottom: 40px; }}
.bg {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
.a::before {{ content: ''; position: absolute; inset: 0; z-index: 1; background: linear-gradient(0deg, rgba(8,24,18,.92) 0%, rgba(8,24,18,.72) 28%, rgba(8,24,18,0) 58%); }}
.light::before {{ background: none; }}
.light {{ background: radial-gradient(120% 60% at 50% 70%, #EAEFF5, #CBD2DC); }}
.light .bg {{ height: 66%; -webkit-mask-image: linear-gradient(180deg, #000 78%, transparent); mask-image: linear-gradient(180deg, #000 78%, transparent); }}
.words {{ position: absolute; left: 72px; right: 72px; bottom: 80px; z-index: 2; font: 700 150px/0.9 Onest; letter-spacing: -0.045em; text-transform: uppercase; color: #fff; }}
.words .ln {{ display: block; white-space: nowrap; width: max-content; }}
.words y {{ color: {YELLOW}; }}
.light .words {{ color: #10291F; }}
.light .words y {{ color: #10291F; background: {YELLOW}; padding: 0 .08em; }}
.story {{ height: 1920px; }}
.story .words {{ right: 170px; bottom: 460px; }}
.story .icon {{ top: 230px; }}
.story::before {{ background: linear-gradient(0deg, rgba(8,24,18,.92) 0%, rgba(8,24,18,.8) 24%, rgba(8,24,18,.55) 40%, rgba(8,24,18,0) 62%); }}
.story.light::before {{ background: none; }}
.story.light .bg {{ height: 58%; }}
.icon {{ position: absolute; top: 60px; right: 60px; width: 112px; height: 112px; z-index: 3; filter: drop-shadow(0 6px 18px rgba(0,0,0,.35)); }}
"""

def ban(id, pid, lines, pos='center', light=False):
    ls = ''.join(f'<span class="ln">{l}</span>' for l in lines)
    return f'''<section class="a{' story' if STORY else ''}{' light' if light else ''}" id="{id}{'-story' if STORY else ''}"><img class="bg" src="{b64(PHOTOS / f'{pid}.jpg', 'image/jpeg')}" style="object-position:{pos}">
<div class="words">{ls}</div><img class="icon" src="{ICON}"></section>'''

slides = [
    ban('b1', 17952748, ['Jollof', 'on <y>you.</y>', 'For once.'], pos='50% 30%'),
    ban('b2', 9287491, ['This round’s', 'on <y>me.</y>'], pos='45% 40%'),
    ban('b3', 5727792, ['Send', 'something', '<y>home.</y>'], pos='50% 25%'),
    ban('b4', 31688982, ['New kicks.', '<y>Zero</y>', 'begging.'], pos='40% 40%', light=True),
    ban('b5', 35286503, ['Graduate with', 'more than', 'a <y>degree.</y>'], pos='50% 20%'),
    ban('b6', 5126586, ['Weekend trip.', '<y>Self-funded.</y>'], pos='50% 35%'),
    ban('b7', 4560083, ['Fees?', '<y>Sorted.</y>'], pos='55% 35%'),
    ban('b8', 6210437, ['Chop life.', '<y>Responsibly.</y>'], pos='50% 30%'),
    ban('b9', 10843136, ['That feeling', 'when it', '<y>lands.</y>'], pos='50% 20%'),
]
# shrink each banner's type so its widest line fits the frame (max 170px)
fit = """<script>
document.fonts.ready.then(() => { for (const w of document.querySelectorAll('.words')) {
  let s = 170; w.style.fontSize = s + 'px'
  const widest = () => Math.max(...[...w.querySelectorAll('.ln')].map((l) => l.getBoundingClientRect().width))
  while (widest() > w.clientWidth && s > 60) { s -= 2; w.style.fontSize = s + 'px' }
} document.body.dataset.ready = 1 })
</script>"""
html = f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{"".join(slides)}{fit}</body></html>'
pathlib.Path(sys.argv[2]).write_text(html); print('wrote', sys.argv[2], len(html) // 1024, 'KB')
