"""Gigotter tote bag (natural canvas): DTF print page, rendered to a transparent 300 dpi PNG + PDF.
usage: python3 build.py WORK_DIR   (then: node render.cjs WORK_DIR OUT_DIR)
Same style as the T-shirt back (docs/brand/tshirt/build/build.py). Solid colours only (DTF-safe)."""
import base64, io, math, pathlib, sys
from PIL import Image

HERE = pathlib.Path(__file__).parent
DOCS = HERE.parent.parent.parent                      # docs/
WORK = pathlib.Path(sys.argv[1]); WORK.mkdir(parents=True, exist_ok=True)
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')
DPI = 300
SCALE = 26 / 30      # whole design laid out at 30 cm, printed at 26 cm wide to suit a standard 38 x 42 cm tote
cm = lambda x: round(x * SCALE / 2.54 * DPI)
YELLOW, LGREEN, INK, WHITE, SAGE = '#FBCA3B', '#235845', '#10291F', '#FFFFFF', '#C9D6C8'
PAL = {  # sticker bg/ink, 3D block, pings, QR tile outline, url, sub line
  'canvas': dict(st_bg=INK, st_ink=WHITE, ext=INK, ping=INK, tile=f'border:{{b}}px solid {INK};', url=INK, sub=LGREEN),
  'green':  dict(st_bg=WHITE, st_ink=INK, ext=WHITE, ping=WHITE, tile='', url=WHITE, sub=WHITE),
}

W = cm(30)           # print width
LOGO_W = cm(14)      # hero otter
QRW = cm(6.5)        # QR code itself

def font(pkg, f): return 'data:font/woff;base64,' + base64.b64encode((FONTS / pkg / 'package/files' / f).read_bytes()).decode()
ON = 'fontsource-onest-5.1.0'; IT = 'fontsource-inter-tight-5.1.0'
faces = ''.join(f"@font-face{{font-family:Onest;font-weight:{w};src:url('{font(ON, f'onest-latin-{w}-normal.woff')}')}}" for w in (600, 700)) \
      + f"@font-face{{font-family:Tight;font-weight:500;src:url('{font(IT, 'inter-tight-latin-500-normal.woff')}')}}"
QR = 'data:image/svg+xml;base64,' + base64.b64encode((DOCS / 'brand/gigotter-qr.svg').read_bytes()).decode()

# logo: crop to visible artwork, resize to the print width
src = Image.open(DOCS / 'otter-logo-source.webp').convert('RGBA')
art = src.crop(src.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())
art = art.resize((LOGO_W, round(art.height * LOGO_W / art.width)), Image.LANCZOS)
b = io.BytesIO(); art.save(b, 'PNG'); LOGO = 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

def star(x, y, r, fill, stroke=None):
    k = r * 0.22
    d = f'M{x} {y - r} Q{x + k} {y - k} {x + r} {y} Q{x + k} {y + k} {x} {y + r} Q{x - k} {y + k} {x - r} {y} Q{x - k} {y - k} {x} {y - r}Z'
    s = f' stroke="{stroke}" stroke-width="{cm(.12)}" stroke-linejoin="round"' if stroke else ''
    return f'<path d="{d}" fill="{fill}"{s}/>'

def headline(sticker_text, words, P):
    """Tilted sticker + 3D outlined headline (yellow on dark green), ping lines placed after the text by script."""
    H = cm(8.8); cx = W / 2; fs = cm(4.25); base = cm(7.2); sw = cm(.24); depth, steps = cm(.5), 30
    txt = lambda x, y, fill, stroke, extra='': (f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" font-family="Onest" font-weight="700" font-size="{fs}" '
                                                f'letter-spacing="{0.035 * fs:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw * 2}" stroke-linejoin="round" paint-order="stroke"{extra}>{words}</text>')
    block = ''.join(txt(cx + depth * i / steps, base + depth * i / steps, P['ext'], P['ext']) for i in range(steps, 0, -1))
    main = txt(cx, base, YELLOW, INK, ' id="main"')
    sw_, sh_ = cm(11.6), cm(2.2); sx, sy = cm(2.4), cm(1.0); off = cm(.22)
    sticker = (f'<g transform="rotate(-7 {sx + sw_ / 2} {sy + sh_ / 2})">'
               f'<rect x="{sx + off}" y="{sy + off}" width="{sw_}" height="{sh_}" rx="{sh_ / 2}" fill="{YELLOW}"/>'
               f'<rect x="{sx}" y="{sy}" width="{sw_}" height="{sh_}" rx="{sh_ / 2}" fill="{P['st_bg']}"/>'
               f'<text x="{sx + sw_ / 2}" y="{sy + sh_ * 0.68}" text-anchor="middle" font-family="Onest" font-weight="700" font-size="{cm(1.3)}" letter-spacing="{cm(.1)}" fill="{P['st_ink']}">{sticker_text}</text></g>')
    L, r0 = cm(1.5), cm(.6)
    pings = ''.join(f'<line x1="{math.cos(a) * r0:.0f}" y1="{math.sin(a) * r0:.0f}" x2="{math.cos(a) * (r0 + L):.0f}" y2="{math.sin(a) * (r0 + L):.0f}" '
                    f'stroke="{P['ping']}" stroke-width="{cm(.42)}" stroke-linecap="round"/>' for a in (math.radians(-38), 0, math.radians(38)))
    sparkles = (star(cm(24.6), cm(1.4), cm(.95), YELLOW, INK) + star(cm(27.0), cm(2.7), cm(.55), YELLOW, INK)
                + star(cm(1.4), cm(5.8), cm(.6), YELLOW, INK))
    return (f'<svg class="hl" width="{W}" height="{H}" viewBox="0 0 {W} {H}" overflow="visible" xmlns="http://www.w3.org/2000/svg">'
            f'<g transform="rotate(-4 {cx} {base - fs * .35})">{block}{main}<g id="pings">{pings}</g></g>{sparkles}{sticker}</svg>')

for bag, P in PAL.items():
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{faces}
    *{{margin:0;padding:0;box-sizing:border-box}} html,body{{background:transparent}}
    #art{{width:{W}px;display:flex;flex-direction:column;align-items:center;padding:{cm(.3)}px 0 {cm(.4)}px}}
    .hl{{display:block}}
    .logo{{display:block;width:{LOGO_W}px;margin-top:{cm(.4)}px}}
    .row{{margin-top:{cm(1.2)}px;display:flex;align-items:center;gap:{cm(1.3)}px}}
    .qr{{display:flex;flex-direction:column;align-items:center}}
    .tab{{display:inline-flex;align-items:center;gap:{cm(.25)}px;padding:{cm(.3)}px {cm(.7)}px;border-radius:999px;background:{YELLOW};color:{INK};font:700 {cm(.8)}px/1.1 Onest;letter-spacing:.1em}}
    .tab svg{{width:{cm(.7)}px;height:{cm(.7)}px}}
    .tile{{margin-top:{cm(.35)}px;background:#fff;{P['tile'].format(b=cm(.1))}border-radius:{cm(.7)}px;padding:{cm(.35)}px;overflow:hidden}}
    .tile img{{display:block;width:{QRW}px;height:{QRW}px;border-radius:{cm(.3)}px}}
    .txt{{max-width:{cm(13.5)}px}}
    .url{{font:700 {cm(1.5)}px/1.25 Onest;letter-spacing:-0.025em;color:{P['url']};white-space:nowrap}}
    .sub{{margin-top:{cm(.3)}px;font:500 {cm(.95)}px/1.3 Tight;color:{P['sub']}}}
    </style></head><body><div id="art">
    {headline('CARRYING MY', 'NEXT GIG.', P)}
    <img class="logo" src="{LOGO}" alt="">
    <div class="row">
      <div class="qr"><div class="tab">SCAN ME <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15M5 12l7 7 7-7"/></svg></div>
        <div class="tile"><img src="{QR}" alt=""></div></div>
      <div class="txt"><div class="url">www.gigotter.com</div><div class="sub">Paid gigs for students<br>&amp; everyone in Ghana</div></div>
    </div>
    </div>
    <script>
      // put the ping lines just after the full stop, whatever the word widths
      document.fonts.ready.then(() => {{ const m = document.getElementById('main').getBBox();
        document.getElementById('pings').setAttribute('transform', `translate(${{m.x + m.width + {cm(.7)}}} ${{m.y + m.height * .5}})`);
        document.body.dataset.ready = 1; }});
    </script></body></html>"""
    (WORK / f'tote-{bag}.html').write_text(html)
print('tote pages written; width', W, 'px =', round(W / DPI * 2.54, 1), 'cm')
