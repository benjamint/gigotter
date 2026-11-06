"""Gigotter A4 bi-fold brochure (two sides, each A4 landscape = two A5 panels).
usage: python3 build.py OUT.html BLEED_MM
"""
import json, sys
from pathlib import Path

OUT, BLEED = sys.argv[1], float(sys.argv[2])
S = Path(__file__).parent.parent  # scratchpad
FONTS = S / 'qr' / 'fonts'
PH = S / 'drive'
REPO = Path('/home/user/wemove')
ic = json.loads((Path(__file__).parent / 'icons.json').read_text())
def icon(n, cls=''): return ic[n].replace('<svg ', f'<svg class="{cls}" ', 1)
img = lambda name: (PH / name).as_uri()
f = lambda p: (FONTS / p).as_uri()

b = BLEED
W, H = 297 + 2 * b, 210 + 2 * b

css = f"""
@font-face {{ font-family: 'Inter Tight'; font-weight: 600; src: url('{f('fontsource-inter-tight-5.1.0/files/inter-tight-latin-600-normal.woff')}'); }}
@font-face {{ font-family: 'Inter Tight'; font-weight: 700; src: url('{f('fontsource-inter-tight-5.1.0/files/inter-tight-latin-700-normal.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 400; src: url('{f('fontsource-inter-5.1.0/files/inter-latin-400-normal.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 600; src: url('{f('fontsource-inter-5.1.0/files/inter-latin-600-normal.woff')}'); }}
@font-face {{ font-family: 'Instrument Serif'; font-style: italic; src: url('{f('fontsource-instrument-serif-5.1.0/files/instrument-serif-latin-400-italic.woff')}'); }}
@font-face {{ font-family: 'Instrument Serif'; font-style: normal; src: url('{f('fontsource-instrument-serif-5.1.0/files/instrument-serif-latin-400-normal.woff')}'); }}
@page {{ size: {W}mm {H}mm; margin: 0; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
body {{ font-family: Inter, sans-serif; color: #15171A; font-size: 9.6pt; line-height: 1.5; }}
.sheet {{ width: {W}mm; height: {H}mm; display: flex; overflow: hidden; page-break-after: always; break-after: page; }}
.panel {{ width: {148.5 + b}mm; height: {H}mm; position: relative; overflow: hidden; }}
/* safe area: 12mm from trim on every side, including the fold */
.left  .inner {{ position: absolute; top: {b + 12}mm; bottom: {b + 12}mm; left: {b + 12}mm; right: 12mm; display: flex; flex-direction: column; }}
.right .inner {{ position: absolute; top: {b + 12}mm; bottom: {b + 12}mm; left: 12mm; right: {b + 12}mm; display: flex; flex-direction: column; }}
.paper {{ background: #F7F6F2; }} .dark {{ background: #10291F; color: #fff; }} .white {{ background: #fff; }}
h1, h2, h3 {{ font-family: 'Inter Tight', sans-serif; font-weight: 600; letter-spacing: -0.035em; line-height: 1.04; }}
h1 {{ font-size: 31pt; }} h2 {{ font-size: 21pt; }} h3 {{ font-size: 11pt; letter-spacing: -0.015em; line-height: 1.2; }}
.em {{ font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; letter-spacing: 0; }}
.eyebrow {{ font-size: 7pt; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: #245A44; }}
.dark .eyebrow {{ color: #B7CDBE; }}
.muted {{ color: #6B7077; }} .dark .muted {{ color: rgba(255,255,255,.68); }}
.brand {{ display: flex; align-items: center; gap: 2.4mm; }}
.brand img {{ width: 10.5mm; height: 10.5mm; }}
.brand span {{ font-family: 'Inter Tight'; font-weight: 600; font-size: 14pt; letter-spacing: -0.02em; }}
.photo {{ border-radius: 5mm; overflow: hidden; background: #EFECE4; }}
.photo img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
.chip {{ display: inline-flex; align-items: center; gap: 1.6mm; font-size: 7.6pt; color: #3A3E44; }}
.chip svg {{ width: 3.6mm; height: 3.6mm; color: #245A44; }}
.rule {{ height: .25mm; background: #E4E1D8; }}
.dark .rule {{ background: rgba(255,255,255,.14); }}
"""

def brand(light=False):
    return f'<div class="brand"><img src="{(REPO / "public/logo-mark.png").as_uri()}"><span style="color:{"#fff" if light else "#15171A"}">Gigotter</span></div>'

# ───────────────────────── OUTSIDE: [back cover | front cover] ─────────────────────────
back = f"""
<div class="panel left dark">
  <div class="inner">
    <div class="eyebrow">For businesses</div>
    <h2 style="margin-top:4mm;color:#fff">Need people on the ground? <span class="em" style="color:#B7CDBE">Send in the otters.</span></h2>
    <p class="muted" style="margin-top:4mm;max-width:108mm">Customer sign-ups, market research, focus groups and product sampling — we scope the work, match verified students and you only pay for approved results.</p>
    <div class="photo" style="margin-top:6mm;height:64mm"><img src="{img('19-pexels-david-crypto-2995151-32103487.jpg')}" style="object-position:55% 45%"></div>
    <div style="margin-top:6mm;display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm">
      {''.join(f'<div><div style="color:#B7CDBE">{icon(i)}</div><div style="margin-top:1.6mm;font-weight:600;font-size:8.4pt">{t}</div><div class="muted" style="font-size:7.4pt;line-height:1.4;margin-top:.6mm">{d}</div></div>' for i, t, d in [
        ('ShieldCheck', 'Verified students', 'ID and selfie checked before any work starts.'),
        ('BadgeCheck', 'Proof for every result', 'Photos, contacts and GPS pins for each unit.'),
        ('Wallet', 'Pay for approved work', 'You only pay for what passes review.'),
      ])}
    </div>
    <div style="flex:1"></div>
    <div style="display:flex;align-items:center;gap:5mm;background:#fff;color:#15171A;border-radius:5mm;padding:4.5mm">
      <img src="{(REPO / 'docs/brand/gigotter-qr.png').as_uri()}" style="width:28mm;height:28mm;flex-shrink:0">
      <div>
        <div style="font-family:'Inter Tight';font-weight:600;font-size:12pt;letter-spacing:-0.02em">Scan to <span class="em" style="color:#245A44;font-size:14pt">get started</span></div>
        <div style="margin-top:1.8mm;display:flex;flex-direction:column;gap:.9mm">
          <span class="chip">{icon('Globe')}gigotter.com</span>
          <span class="chip">{icon('Mail')}hello@gigotter.com</span>
        </div>
      </div>
    </div>
    <div style="margin-top:4mm;font-size:6.6pt;color:rgba(255,255,255,.5)">Gigotter · Accra, Ghana · Real work for real businesses, paid to mobile money.</div>
  </div>
</div>"""

front = f"""
<div class="panel right paper">
  <div class="inner">
    <div style="display:flex;justify-content:space-between;align-items:center">{brand()}<span class="eyebrow">For students</span></div>
    <div class="photo" style="margin-top:7mm;height:96mm"><img src="{img('01-leiada-krozjhen-rqaAWQgy05U-unsplash.jpg')}" style="object-position:50% 30%"></div>
    <h1 style="margin-top:8mm">Get paid to do <span class="em" style="color:#245A44">real work</span> for real businesses.</h1>
    <p class="muted" style="margin-top:4mm;font-size:10pt;max-width:112mm">Sign up businesses, run focus groups and gather research on your own schedule. Get verified once, pick a gig, get paid to your mobile money.</p>
    <div style="flex:1"></div>
    <div class="rule"></div>
    <div style="margin-top:4mm;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;gap:4.5mm">
        <span class="chip">{icon('ShieldCheck')}ID-verified</span><span class="chip">{icon('Wallet')}Paid to MoMo</span><span class="chip">{icon('BadgeCheck')}No fees</span>
      </div>
      <span style="font-family:'Inter Tight';font-weight:600;font-size:11pt;letter-spacing:-0.02em">gigotter.com</span>
    </div>
  </div>
</div>"""

# ───────────────────────── INSIDE: [how it works | the work] ─────────────────────────
steps = [
    ('01', 'Get verified once', 'Add your student ID, national ID and a quick selfie, plus the mobile money number you want paid to. Most students are approved within a day.', '18-pexels-ono-kosuki-6000068.jpg', '30% 40%'),
    ('02', 'Pick work that fits', 'Browse open gigs near you or remote. Each one tells you exactly what to do, what proof to collect and how much it pays.', '16-pexels-gustavo-fring-6720592.jpg', '70% 40%'),
    ('03', 'Submit and get paid', 'Log each completed unit with a photo. Once it’s approved, the money goes straight to your MoMo in the weekly payout.', '13-pexels-rdne-10375889.jpg', '50% 45%'),
]
how = f"""
<div class="panel left paper">
  <div class="inner">
    <div class="eyebrow">How it works</div>
    <h2 style="margin-top:4mm">Three steps between you and your <span class="em" style="color:#245A44">first payout.</span></h2>
    <div style="margin-top:8mm;display:flex;flex-direction:column;gap:6mm">
      {''.join(f'''<div style="display:flex;gap:5mm;align-items:center">
        <div class="photo" style="width:38mm;height:38mm;flex-shrink:0"><img src="{img(p)}" style="object-position:{pos}"></div>
        <div><div style="font-family:'Instrument Serif';font-size:20pt;line-height:1;color:#245A44">{n}</div>
          <h3 style="margin-top:1.6mm">{t}</h3><p class="muted" style="margin-top:1.4mm;font-size:8.4pt;line-height:1.45">{d}</p></div>
      </div>''' for n, t, d, p, pos in steps)}
    </div>
    <div style="flex:1"></div>
    <div class="rule"></div>
    <div style="margin-top:3.5mm;display:flex;justify-content:space-between" class="muted"><span style="font-size:7.4pt">Free to join · No CV · No interview</span><span style="font-size:7.4pt">Students across Ghana &amp; Nigeria</span></div>
  </div>
</div>"""

kinds = [
    ('Handshake', 'Customer onboarding', 'Introduce businesses to a product and help them sign up.'),
    ('MessagesSquare', 'Focus groups', 'Bring the right people together and keep the conversation flowing.'),
    ('Search', 'Field research', 'Visit shops and markets to collect prices, photos and insight.'),
    ('ClipboardList', 'Surveys', 'Gather genuine responses from people who match the brief.'),
]
why = ['Every gig is paid and clearly scoped', 'Work between lectures, on weekends or from home', 'Payouts straight to your mobile money', 'Real experience with real businesses for your CV']
work = f"""
<div class="panel right white">
  <div class="inner">
    <div class="eyebrow">The work</div>
    <h2 style="margin-top:4mm">Flexible work that <span class="em" style="color:#245A44">builds</span> real experience.</h2>
    <div style="margin-top:7mm;display:grid;grid-template-columns:1fr 1fr;gap:0;border:.25mm solid #E4E1D8;border-radius:5mm;overflow:hidden">
      {''.join(f'<div style="padding:5mm;{"border-right:.25mm solid #E4E1D8;" if i % 2 == 0 else ""}{"border-bottom:.25mm solid #E4E1D8;" if i < 2 else ""}"><div style="color:#245A44">{icon(ic_)}</div><h3 style="margin-top:2.4mm">{t}</h3><p class="muted" style="margin-top:1.2mm;font-size:8pt;line-height:1.45">{d}</p></div>' for i, (ic_, t, d) in enumerate(kinds))}
    </div>
    <h3 style="margin-top:8mm;font-size:12pt">Why students choose <span class="em" style="color:#245A44;font-size:14pt">Gigotter</span></h3>
    <ul style="list-style:none;margin-top:3mm;display:flex;flex-direction:column;gap:2.2mm">
      {''.join(f'<li style="display:flex;gap:2.6mm;align-items:flex-start;font-size:9pt"><span style="color:#245A44;flex-shrink:0;margin-top:.3mm">{icon("Check", "")}</span>{w}</li>' for w in why)}
    </ul>
    <div style="flex:1"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:5mm;background:#10291F;color:#fff;border-radius:5mm;padding:5mm 5.5mm">
      <div>
        <div style="font-family:'Inter Tight';font-weight:600;font-size:13pt;letter-spacing:-0.02em;line-height:1.15">Ready? Sign up in <span class="em" style="color:#B7CDBE;font-size:15pt">two minutes.</span></div>
        <div style="margin-top:1.4mm;font-size:8.4pt;color:rgba(255,255,255,.7)">Scan the code or visit <b style="color:#fff">gigotter.com</b></div>
      </div>
      <div style="background:#fff;border-radius:3mm;padding:1.6mm;flex-shrink:0"><img src="{(REPO / 'docs/brand/gigotter-qr.png').as_uri()}" style="width:25mm;height:25mm;display:block"></div>
    </div>
  </div>
</div>"""

html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{css}
svg {{ width: 6.2mm; height: 6.2mm; }}
li svg {{ width: 4mm; height: 4mm; }}
</style></head><body>
<div class="sheet">{back}{front}</div>
<div class="sheet">{how}{work}</div>
</body></html>"""
Path(OUT).write_text(html)
print('wrote', OUT, f'{W}x{H}mm')
