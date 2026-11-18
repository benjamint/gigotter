"""Gigotter T-shirt: DTF print files (transparent, 300 dpi) and mockup pages.
usage: python3 build.py WORK_DIR   (then: node render.cjs WORK_DIR OUT_DIR)
Solid colours only: DTF prints semi-transparency and gradients poorly."""
import base64, io, pathlib, sys
from PIL import Image

HERE = pathlib.Path(__file__).parent
DOCS = HERE.parent.parent.parent                      # docs/
WORK = pathlib.Path(sys.argv[1]); WORK.mkdir(parents=True, exist_ok=True)
OUT = HERE.parent
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')
DPI = 300
cm = lambda x: round(x / 2.54 * DPI)

YELLOW, LGREEN, INK, DEEP, SAGE, WHITE = '#FBCA3B', '#235845', '#10291F', '#1C4635', '#C9D6C8', '#FFFFFF'

# ── 1. front logo: crop to the visible artwork, then exact print widths at 300 dpi ──
src = Image.open(DOCS / 'otter-logo-source.webp').convert('RGBA')
a = src.getchannel('A').point(lambda v: 255 if v > 24 else 0)   # ignore faint edge noise
art = src.crop(a.getbbox())
for w_cm in (9, 12):
    w = cm(w_cm); h = round(art.height * w / art.width)
    out = art.resize((w, h), Image.LANCZOS)
    out.save(OUT / f'dtf-front-logo-{w_cm}cm.png', dpi=(DPI, DPI))
    print(f'front {w_cm} cm: {w}x{h}px ({w_cm} x {h / DPI * 2.54:.1f} cm)')

# ── 2. back designs (HTML, rendered at 1 css px = 1 print px) ──
def font(pkg, f): return 'data:font/woff;base64,' + base64.b64encode((FONTS / pkg / 'package/files' / f).read_bytes()).decode()
ON = 'fontsource-onest-5.1.0'; IT = 'fontsource-inter-tight-5.1.0'
faces = ''.join(f"@font-face{{font-family:Onest;font-weight:{w};src:url('{font(ON, f'onest-latin-{w}-normal.woff')}')}}" for w in (600, 700)) \
      + ''.join(f"@font-face{{font-family:Tight;font-weight:{w};src:url('{font(IT, f'inter-tight-latin-{w}-normal.woff')}')}}" for w in (500, 600))
QR = 'data:image/svg+xml;base64,' + base64.b64encode((DOCS / 'brand/gigotter-qr.svg').read_bytes()).decode()

W = cm(28)            # back artwork width
QRW = cm(11)          # the code itself

def back(name, top, head, sub, url, tab_bg, tab_ink, tile_line):
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{faces}
*{{margin:0;padding:0;box-sizing:border-box}} html,body{{background:transparent}}
#art{{width:{W}px;display:flex;flex-direction:column;align-items:center;text-align:center;padding:{cm(.3)}px 0}}
.top{{font:600 {cm(2.0)}px/1 Onest;letter-spacing:.08em;color:{top}}}
.head{{font:700 {cm(5.4)}px/0.92 Onest;letter-spacing:-0.045em;color:{head};white-space:nowrap;margin-top:{cm(.55)}px}}
.tab{{margin-top:{cm(2.0)}px;display:inline-flex;align-items:center;gap:{cm(.45)}px;padding:{cm(.5)}px {cm(1.3)}px;border-radius:999px;background:{tab_bg};color:{tab_ink};font:700 {cm(1.35)}px/1 Onest;letter-spacing:.1em}}
.tab svg{{width:{cm(1.2)}px;height:{cm(1.2)}px}}
.tile{{margin-top:{cm(.6)}px;background:#fff;border-radius:{cm(1.1)}px;padding:{cm(.55)}px;overflow:hidden;{f'border:{cm(.12)}px solid {tile_line};' if tile_line else ''}}}
.tile img{{display:block;width:{QRW}px;height:{QRW}px;border-radius:{cm(.5)}px}}
.sub{{margin-top:{cm(1.0)}px;font:500 {cm(1.05)}px/1.2 Tight;color:{sub}}}
.url{{margin-top:{cm(.35)}px;font:700 {cm(1.7)}px/1 Onest;letter-spacing:-0.03em;color:{url}}}
</style></head><body><div id="art">
<div class="top">ASK ME HOW I</div>
<div class="head">GET PAID.</div>
<div class="tab">SCAN ME <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15M5 12l7 7 7-7"/></svg></div>
<div class="tile"><img src="{QR}" alt=""></div>
<div class="sub">Paid gigs for students in Ghana</div>
<div class="url">gigotter.com</div>
</div></body></html>"""
    (WORK / f'back-{name}.html').write_text(html)

back('green-shirt', top=WHITE, head=YELLOW, sub=SAGE, url=WHITE, tab_bg=YELLOW, tab_ink=INK, tile_line=None)
back('white-shirt', top=INK, head=LGREEN, sub=LGREEN, url=INK, tab_bg=YELLOW, tab_ink=INK, tile_line=INK)
print('back pages written; width', W, 'px =', 28, 'cm')
