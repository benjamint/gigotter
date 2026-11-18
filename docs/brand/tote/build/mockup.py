"""Natural canvas tote mockup (design at true scale on a 38 x 42 cm tote) + a merch sheet with the T-shirts.
usage: python3 mockup.py WORK_DIR   (then: node mockup.cjs WORK_DIR OUT_DIR)"""
import base64, io, pathlib, sys
from PIL import Image

HERE = pathlib.Path(__file__).parent; OUT = HERE.parent; TEE = OUT.parent / 'tshirt'
WORK = pathlib.Path(sys.argv[1])
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')

def uri(p, w):
    im = Image.open(p); im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode(), im.height / im.width
def font(pkg, f): return 'data:font/woff;base64,' + base64.b64encode((FONTS / pkg / 'package/files' / f).read_bytes()).decode()

ARTS = {k: uri(OUT / f'dtf-tote-{k}.png', 1300) for k in ('canvas', 'green')}
U = 20                                   # units per cm: tote body 38 cm = 760 units
X0, Y0, BW, BH = 120, 300, 38 * U, 42 * U
BAGS = {'canvas': ('#ECE2CB', '#D6C9AB', '#F7F1E2', '#B9AB8B'), 'green': ('#173a2b', '#0f2a1f', '#2a5340', '#4E7A63')}  # body, shade, highlight, stitch
H_GREEN, H_SHADE, H_STITCH = '#1C4635', '#10291F', '#4E7A63'   # green handles

def tote(uid, bag='green'):
    CANVAS, SHADE, HI, STITCH = BAGS[bag]; ART, ART_R = ARTS[bag]
    aw = 26 * U; ah = aw * ART_R; ax = X0 + (BW - aw) / 2; ay = Y0 + (BH - ah) / 2 + 8
    strap = lambda x1, x2: f'M{x1} {Y0 + 30} C{x1} {Y0 - 300} {x2} {Y0 - 300} {x2} {Y0 + 30}'
    straps = ''.join(f'<path d="{strap(a, b)}" stroke="{H_SHADE}" stroke-width="54" fill="none" stroke-linecap="round"/>'
                     f'<path d="{strap(a, b)}" stroke="{H_GREEN}" stroke-width="44" fill="none" stroke-linecap="round"/>'
                     f'<path d="{strap(a, b)}" stroke="{H_STITCH}" stroke-width="2" stroke-dasharray="7 6" fill="none" transform="translate(0 0)"/>'
                     for a, b in ((X0 + 170, X0 + 300), (X0 + BW - 300, X0 + BW - 170)))
    return f"""<svg viewBox="0 0 1000 1250" xmlns="http://www.w3.org/2000/svg">
<defs>
  <clipPath id="c{uid}"><rect x="{X0}" y="{Y0}" width="{BW}" height="{BH}" rx="10"/></clipPath>
  <radialGradient id="l{uid}" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="{HI}" stop-opacity=".7"/><stop offset=".6" stop-color="{HI}" stop-opacity="0"/><stop offset="1" stop-color="{SHADE}" stop-opacity=".8"/></radialGradient>
  <filter id="n{uid}"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .2  0 0 0 .16 0"/></filter>
  <filter id="sh{uid}" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#10291F" flood-opacity=".2"/></filter>
</defs>
{straps}
<rect x="{X0}" y="{Y0}" width="{BW}" height="{BH}" rx="10" fill="{CANVAS}" filter="url(#sh{uid})"/>
<g clip-path="url(#c{uid})">
  <rect x="{X0}" y="{Y0}" width="{BW}" height="{BH}" fill="url(#l{uid})"/>
  <rect x="{X0}" y="{Y0}" width="{BW}" height="60" fill="{SHADE}" opacity=".45"/>
  <path d="M{X0 + 260} {Y0 + 420} C{X0 + 300} {Y0 + 560} {X0 + 250} {Y0 + 680} {X0 + 300} {Y0 + 800}" stroke="{SHADE}" stroke-opacity=".5" stroke-width="30" fill="none" style="filter:blur(18px)"/>
  <image href="{ART}" x="{ax:.1f}" y="{ay:.1f}" width="{aw:.1f}" height="{ah:.1f}"/>
  <rect x="{X0}" y="{Y0}" width="{BW}" height="{BH}" filter="url(#n{uid})"/>
</g>
<path d="M{X0 + 6} {Y0 + 62} H{X0 + BW - 6}" stroke="{STITCH}" stroke-width="2" stroke-dasharray="8 6"/>
<path d="M{X0 + 6} {Y0 + 50} H{X0 + BW - 6}" stroke="{STITCH}" stroke-width="2" stroke-dasharray="8 6"/>
</svg>"""

faces = (f"@font-face{{font-family:Onest;font-weight:700;src:url('{font('fontsource-onest-5.1.0', 'onest-latin-700-normal.woff')}')}}"
         f"@font-face{{font-family:Tight;font-weight:500;src:url('{font('fontsource-inter-tight-5.1.0', 'inter-tight-latin-500-normal.woff')}')}}")
tees = {k: uri(TEE / f'mockup-{k}.png', 760)[0] for k in ('green-front', 'green-back', 'white-front', 'white-back')}
html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{faces}
*{{margin:0;padding:0;box-sizing:border-box}} body{{font-family:Tight;background:#EEF2EC}}
.single{{width:1600px;padding:60px 80px 70px;background:radial-gradient(120% 80% at 50% 10%,#F6F8F4,#E7EDE4);text-align:center}}
.single svg{{width:100%;display:block}} .single p{{margin-top:6px;font:500 44px Tight;color:#3A3E44}}
#sheet{{width:3600px;padding:120px 140px 140px;background:radial-gradient(120% 80% at 50% 10%,#F6F8F4,#E7EDE4)}}
h1{{font:700 120px/1 Onest;letter-spacing:-0.04em;color:#131317}} h1 span{{color:#245A44}}
.sub{{margin-top:22px;font:500 38px Tight;color:#5C625E}}
.grid{{margin-top:60px;display:grid;grid-template-columns:1.15fr 1fr 1fr;grid-template-rows:auto auto;gap:36px}}
.card{{background:rgba(255,255,255,.55);border:2px solid #E3E9E4;border-radius:44px;padding:30px;text-align:center}}
.card img,.card svg{{width:100%;display:block}} .card p{{margin-top:10px;font:500 34px Tight;color:#3A3E44}}
.tote{{grid-row:span 2;display:flex;flex-direction:column;justify-content:center}}
</style></head><body>
<div class="single" id="tote-single">{tote('a', 'green')}<p>Deep green tote · 38 × 42 cm</p></div>
<div class="single" id="tote-single-canvas">{tote('c', 'canvas')}<p>Natural canvas tote · 38 × 42 cm</p></div>
<div id="sheet"><h1>Gigotter <span>merch.</span></h1><div class="sub">Tote bag · green and white tees · scan to visit gigotter.com</div>
<div class="grid">
  <div class="card tote">{tote('b', 'green')}<p>Tote bag</p></div>
  <div class="card"><img src="{tees['green-front']}" alt=""></div><div class="card"><img src="{tees['green-back']}" alt=""></div>
  <div class="card"><img src="{tees['white-front']}" alt=""></div><div class="card"><img src="{tees['white-back']}" alt=""></div>
</div></div>
</body></html>"""
(WORK / 'mockups.html').write_text(html)
print('mockup page written')
