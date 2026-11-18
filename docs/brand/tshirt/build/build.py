"""Gigotter T-shirt: DTF print files (transparent, 300 dpi) and mockup pages.
usage: python3 build.py WORK_DIR   (then: node render.cjs WORK_DIR OUT_DIR)
Solid colours only: DTF prints semi-transparency and gradients poorly."""
import base64, io, math, pathlib, sys
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

def star(x, y, r, fill, stroke=None):
    """4-point sparkle centred on x,y."""
    k = r * 0.22
    d = f'M{x} {y - r} Q{x + k} {y - k} {x + r} {y} Q{x + k} {y + k} {x} {y + r} Q{x - k} {y + k} {x - r} {y} Q{x - k} {y - k} {x} {y - r}Z'
    s = f' stroke="{stroke}" stroke-width="{cm(.12)}" stroke-linejoin="round"' if stroke else ''
    return f'<path d="{d}" fill="{fill}"{s}/>'

def headline(sticker_bg, sticker_ink, ext, outline, ping, sparkle, sparkle_line=None):
    """'ASK ME HOW I' sticker + 3D 'GET PAID.' with outline, ping lines and sparkles. Solid colours only (DTF-safe)."""
    H = cm(9.0); cx = W / 2; fs = cm(4.55); base = cm(7.5)
    sw = cm(.24)                                   # outline thickness
    depth, steps = cm(.5), 30                      # 3D block shadow, down-right
    txt = lambda x, y, fill, stroke, extra='': (f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" font-family="Onest" font-weight="700" font-size="{fs}" '
                                                f'letter-spacing="{0.035 * fs:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw * 2}" stroke-linejoin="round" paint-order="stroke"{extra}>GET PAID.</text>')
    block = ''.join(txt(cx + depth * i / steps, base + depth * i / steps, ext, ext) for i in range(steps, 0, -1))
    main = txt(cx, base, YELLOW, outline)
    # sticker: tilted pill with a hard offset shadow
    sw_, sh_ = cm(12.2), cm(2.2); sx, sy = cm(2.0), cm(1.0); off = cm(.22)
    sticker = (f'<g transform="rotate(-7 {sx + sw_ / 2} {sy + sh_ / 2})">'
               f'<rect x="{sx + off}" y="{sy + off}" width="{sw_}" height="{sh_}" rx="{sh_ / 2}" fill="{YELLOW}"/>'
               f'<rect x="{sx}" y="{sy}" width="{sw_}" height="{sh_}" rx="{sh_ / 2}" fill="{sticker_bg}"/>'
               f'<text x="{sx + sw_ / 2}" y="{sy + sh_ * 0.68}" text-anchor="middle" font-family="Onest" font-weight="700" font-size="{cm(1.3)}" letter-spacing="{cm(.1)}" fill="{sticker_ink}">ASK ME HOW I</text></g>')
    # ping lines bursting off the full stop, like the phone in the logo
    px, py = cm(25.2), cm(5.5); L = cm(1.5)
    pings = ''.join(f'<line x1="{px + math.cos(a) * cm(.6):.0f}" y1="{py + math.sin(a) * cm(.6):.0f}" x2="{px + math.cos(a) * (cm(.6) + L):.0f}" y2="{py + math.sin(a) * (cm(.6) + L):.0f}" '
                    f'stroke="{ping}" stroke-width="{cm(.42)}" stroke-linecap="round"/>' for a in (math.radians(-38), math.radians(0), math.radians(38)))
    sparkles = star(cm(23.6), cm(1.3), cm(.95), sparkle, sparkle_line) + star(cm(26.0), cm(2.7), cm(.55), sparkle, sparkle_line) + star(cm(1.4), cm(5.6), cm(.6), sparkle, sparkle_line)
    return (f'<svg class="hl" width="{W}" height="{H}" viewBox="0 0 {W} {H}" overflow="visible" xmlns="http://www.w3.org/2000/svg">'
            f'<g transform="rotate(-4 {cx} {base - fs * .35})">{block}{main}{pings}</g>{sparkles}{sticker}</svg>')

def back(name, top, head, sub, url, tab_bg, tab_ink, tile_line, hl):
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{faces}
*{{margin:0;padding:0;box-sizing:border-box}} html,body{{background:transparent}}
#art{{width:{W}px;display:flex;flex-direction:column;align-items:center;text-align:center;padding:{cm(.3)}px 0}}
.top{{font:600 {cm(2.0)}px/1 Onest;letter-spacing:.08em;color:{top}}}
.head{{font:700 {cm(5.4)}px/0.92 Onest;letter-spacing:-0.045em;color:{head};white-space:nowrap;margin-top:{cm(.55)}px}}
.hl{{display:block}}
.tab{{margin-top:{cm(1.1)}px;display:inline-flex;align-items:center;gap:{cm(.45)}px;padding:{cm(.5)}px {cm(1.3)}px;border-radius:999px;background:{tab_bg};color:{tab_ink};font:700 {cm(1.35)}px/1 Onest;letter-spacing:.1em}}
.tab svg{{width:{cm(1.2)}px;height:{cm(1.2)}px}}
.tile{{margin-top:{cm(.6)}px;background:#fff;border-radius:{cm(1.1)}px;padding:{cm(.55)}px;overflow:hidden;{f'border:{cm(.12)}px solid {tile_line};' if tile_line else ''}}}
.tile img{{display:block;width:{QRW}px;height:{QRW}px;border-radius:{cm(.5)}px}}
.sub{{margin-top:{cm(1.0)}px;font:500 {cm(1.05)}px/1.2 Tight;color:{sub}}}
.url{{margin-top:{cm(.35)}px;font:700 {cm(1.7)}px/1 Onest;letter-spacing:-0.03em;color:{url}}}
</style></head><body><div id="art">
{hl}
<div class="tab">SCAN ME <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15M5 12l7 7 7-7"/></svg></div>
<div class="tile"><img src="{QR}" alt=""></div>
<div class="sub">Paid gigs for students in Ghana</div>
<div class="url">gigotter.com</div>
</div></body></html>"""
    (WORK / f'back-{name}.html').write_text(html)

back('green-shirt', top=WHITE, head=YELLOW, sub=SAGE, url=WHITE, tab_bg=YELLOW, tab_ink=INK, tile_line=None,
     hl=headline(sticker_bg=WHITE, sticker_ink=INK, ext=WHITE, outline=INK, ping=WHITE, sparkle=YELLOW))
back('white-shirt', top=INK, head=LGREEN, sub=LGREEN, url=INK, tab_bg=YELLOW, tab_ink=INK, tile_line=INK,
     hl=headline(sticker_bg=INK, sticker_ink=WHITE, ext=INK, outline=INK, ping=INK, sparkle=YELLOW, sparkle_line=INK))
print('back pages written; width', W, 'px =', 28, 'cm')

# ── 3. front: logo + www.gigotter.com underneath (text sized to match the logo width) ──
def front(name, ink, w_cm):
    w = cm(w_cm)
    logo = 'data:image/png;base64,' + base64.b64encode((OUT / f'dtf-front-logo-{w_cm}cm.png').read_bytes()).decode()
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{faces}
*{{margin:0;padding:0;box-sizing:border-box}} html,body{{background:transparent}}
#art{{width:{w}px;display:flex;flex-direction:column;align-items:center;padding-bottom:{cm(.15)}px}}
#art img{{display:block;width:{w}px}}
.url{{margin-top:{cm(w_cm * .045)}px;font:700 100px/1.3 Onest;letter-spacing:-0.01em;color:{ink};white-space:nowrap}}
</style></head><body><div id="art"><img src="{logo}" alt=""><div class="url">www.gigotter.com</div></div>
<script>
  // fit the address to the logo width, so the lockup stays one clean block
  document.fonts.ready.then(() => {{ const u = document.querySelector('.url'); const r = {w} / u.getBoundingClientRect().width;
    u.style.fontSize = (100 * r * 0.98) + 'px'; document.body.dataset.ready = 1; }});
</script></body></html>"""
    (WORK / f'front-{name}-{w_cm}cm.html').write_text(html)

for w_cm in (9, 12):
    front('green-shirt', WHITE, w_cm)
    front('white-shirt', INK, w_cm)
print('front lockups written')
