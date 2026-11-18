"""Flat-lay T-shirt mockups (front + back, green + white) with the DTF artwork at true scale.
usage: python3 mockup.py WORK_DIR   (then: node mockup.cjs WORK_DIR OUT_DIR)"""
import base64, io, pathlib, sys
from PIL import Image

HERE = pathlib.Path(__file__).parent; ART = HERE.parent
WORK = pathlib.Path(sys.argv[1])
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')

def uri(p, w):
    im = Image.open(p); im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode(), im.height / im.width
def font(pkg, f): return 'data:font/woff;base64,' + base64.b64encode((FONTS / pkg / 'package/files' / f).read_bytes()).decode()

FRONTS = {k: uri(ART / f'dtf-front-{k}-shirt-9cm.png', 600) for k in ('green', 'white')}   # logo + www.gigotter.com
BACKS = {k: uri(ART / f'dtf-back-{k}-shirt.png', 1400) for k in ('green', 'white')}

# shirt geometry (viewBox units). Chest = 580 units ≈ 52 cm (size M) → 11.15 units per cm
U = 580 / 52
BODY = 'M380 95 {neck} L760 128 L948 252 L878 424 L790 388 L792 1032 Q500 1052 208 1032 L210 388 L122 424 L52 252 L240 128 Z'
NECK = {'front': 'C425 158 575 158 620 95', 'back': 'C430 122 570 122 620 95'}
SHIRT = {'green': ('#173a2b', '#0f2a1f', '#2a5340'), 'white': ('#fbfbf8', '#e4e6e0', '#ffffff')}   # base, shade, highlight

def shirt(color, side):
    base, shade, hi = SHIRT[color]
    d = BODY.format(neck=NECK[side]); neck = f'M380 95 {NECK[side]}'
    stitch = '#0b2018' if color == 'green' else '#d3d6cf'
    if side == 'front':
        src, r = FRONTS[color]; w = 9 * U; h = w * r
        art = f'<image href="{src}" x="{640 - w / 2:.1f}" y="{158 + 8 * U - 30:.1f}" width="{w:.1f}" height="{h:.1f}"/>'
    else:
        src, r = BACKS[color]; w = 28 * U; h = w * r
        art = f'<image href="{src}" x="{500 - w / 2:.1f}" y="{122 + 7 * U:.1f}" width="{w:.1f}" height="{h:.1f}"/>'
    uid = f'{color}{side}'
    return f"""<svg viewBox="0 0 1000 1100" xmlns="http://www.w3.org/2000/svg">
<defs>
  <clipPath id="c{uid}"><path d="{d}"/></clipPath>
  <radialGradient id="l{uid}" cx="42%" cy="30%" r="75%"><stop offset="0" stop-color="{hi}" stop-opacity=".55"/><stop offset=".55" stop-color="{hi}" stop-opacity="0"/><stop offset="1" stop-color="{shade}" stop-opacity=".9"/></radialGradient>
  <linearGradient id="s{uid}" x1="0" x2="1"><stop offset="0" stop-color="{shade}" stop-opacity=".7"/><stop offset=".14" stop-color="{shade}" stop-opacity="0"/><stop offset=".86" stop-color="{shade}" stop-opacity="0"/><stop offset="1" stop-color="{shade}" stop-opacity=".7"/></linearGradient>
  <filter id="n{uid}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .09 0"/></filter>
  <filter id="sh{uid}" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#10291F" flood-opacity=".18"/></filter>
</defs>
<path d="{d}" fill="{base}" filter="url(#sh{uid})"/>
<g clip-path="url(#c{uid})">
  <rect width="1000" height="1100" fill="url(#l{uid})"/>
  <rect width="1000" height="1100" fill="url(#s{uid})"/>
  <path d="M300 520 C380 560 360 700 420 760" stroke="{shade}" stroke-opacity=".35" stroke-width="26" fill="none" stroke-linecap="round" style="filter:blur(14px)"/>
  <path d="M700 600 C640 680 690 820 620 900" stroke="{shade}" stroke-opacity=".3" stroke-width="30" fill="none" stroke-linecap="round" style="filter:blur(16px)"/>
  {art}
  <rect width="1000" height="1100" filter="url(#n{uid})"/>
</g>
<path d="{neck}" stroke="{shade}" stroke-width="20" fill="none" stroke-linecap="round"/>
<path d="{neck}" stroke="{stitch}" stroke-width="2" stroke-dasharray="7 6" fill="none" transform="translate(0 16)"/>
<path d="M240 128 L210 388 M760 128 L790 388" stroke="{shade}" stroke-width="3" fill="none" opacity=".8"/>
<path d="M134 396 L222 360 M866 396 L778 360" stroke="{stitch}" stroke-width="2" stroke-dasharray="7 6" fill="none"/>
<path d="M214 1004 Q500 1024 788 1004" stroke="{stitch}" stroke-width="2" stroke-dasharray="7 6" fill="none"/>
</svg>"""

faces = f"@font-face{{font-family:Onest;font-weight:700;src:url('{font('fontsource-onest-5.1.0', 'onest-latin-700-normal.woff')}')}}" \
      + f"@font-face{{font-family:Tight;font-weight:500;src:url('{font('fontsource-inter-tight-5.1.0', 'inter-tight-latin-500-normal.woff')}')}}"
cells = ''.join(f'<figure class="m" id="{c}-{s}">{shirt(c, s)}<figcaption>{c.title()} shirt · {s}</figcaption></figure>'
                for c in ('green', 'white') for s in ('front', 'back'))
html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{faces}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#EEF2EC;font-family:Tight}}
#sheet{{width:3200px;padding:120px 140px 140px;background:radial-gradient(120% 80% at 50% 10%,#F6F8F4,#E7EDE4)}}
.head{{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:60px}}
h1{{font:700 120px/1 Onest;letter-spacing:-0.04em;color:#131317}} h1 span{{color:#245A44}}
.sw{{display:flex;gap:28px;align-items:center;font:500 34px Tight;color:#5C625E}} .sw i{{width:56px;height:56px;border-radius:50%;display:inline-block;border:2px solid #d9dfd8}}
.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:40px}}
.m{{background:rgba(255,255,255,.55);border:2px solid #E3E9E4;border-radius:48px;padding:40px 30px 36px;text-align:center}}
.m svg{{width:100%;display:block}}
figcaption{{margin-top:18px;font:500 36px Tight;color:#3A3E44}}
.single .m{{width:1600px;border:0;border-radius:0;padding:80px 60px 70px;background:radial-gradient(120% 80% at 50% 10%,#F6F8F4,#E7EDE4)}}
.single figcaption{{font-size:44px}}
</style></head><body>
<div id="sheet"><div class="head"><h1>Gigotter <span>tees.</span></h1>
<div class="sw"><i style="background:#173a2b"></i>Deep green <i style="background:#fbfbf8"></i>White</div></div>
<div class="grid">{cells}</div></div>
<div class="single">{cells.replace('id="', 'id="s-')}</div>
</body></html>"""
(WORK / 'mockups.html').write_text(html)
print('mockup page written')
