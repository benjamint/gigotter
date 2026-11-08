"""Gigotter Instagram post 2: three text-only slides, 1080x1350. usage: python3 build.py OUT.html"""
import base64, json, pathlib, sys

FONTS = pathlib.Path('/tmp/claude-0/-workspace/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/qr/fonts')
LOGO = 'data:image/png;base64,' + base64.b64encode(pathlib.Path('/home/user/wemove/public/logo-mark.png').read_bytes()).decode()
def font(p): return 'data:font/woff;base64,' + base64.b64encode((FONTS / p).read_bytes()).decode()

css = f"""
@font-face {{ font-family: 'GSerif'; font-style: italic; src: url('{font('fontsource-instrument-serif-5.1.0/files/instrument-serif-latin-400-italic.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 400; src: url('{font('fontsource-inter-5.1.0/files/inter-latin-400-normal.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 600; src: url('{font('fontsource-inter-5.1.0/files/inter-latin-600-normal.woff')}'); }}
@font-face {{ font-family: 'Tight'; font-weight: 700; src: url('{font('fontsource-inter-tight-5.1.0/files/inter-tight-latin-700-normal.woff')}'); }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ background: #333; font-family: Inter, sans-serif; }}
.s {{ width: 1080px; height: 1350px; position: relative; overflow: hidden; margin-bottom: 40px; }}
.in {{ position: absolute; inset: 96px; display: flex; flex-direction: column; }}
h1 {{ font-family: Tight; font-weight: 700; letter-spacing: -0.045em; line-height: .95; }}
.em {{ font-family: GSerif; font-style: italic; font-weight: 400; letter-spacing: -0.015em; }}
.top {{ display: flex; align-items: center; justify-content: space-between; font: 600 26px Inter; letter-spacing: .14em; text-transform: uppercase; }}
.brand {{ display: flex; align-items: center; gap: 16px; font: 700 38px Tight; letter-spacing: -0.03em; text-transform: none; }}
.brand img {{ width: 64px; height: 64px; }}
.foot {{ margin-top: auto; display: flex; justify-content: space-between; align-items: center; font: 600 28px Inter; }}
.rule {{ height: 2px; margin: 0 0 30px; }}
"""

def top(n, light):
    c = '#B7CDBE' if light else '#2F6B52'
    return f'<div class="top" style="color:{c}"><span class="brand" style="color:{"#fff" if light else "#15171A"}"><img src="{LOGO}" alt="">Gigotter</span><span>{n} / 3</span></div>'

# 1 — the hook
s1 = f"""
<section class="s" style="background:#10291F"><div class="in">
  {top(1, True)}
  <div style="margin-top:auto">
    <h1 style="font-size:180px;color:#fff">Free<br>period?</h1>
    <h1 style="margin-top:18px;font-size:150px;color:#B7CDBE"><span class="em">Get paid</span><br><span class="em">for it.</span></h1>
  </div>
  <div class="foot" style="margin-top:80px;color:rgba(255,255,255,.7)"><span>Real gigs for students</span><span style="color:#fff">Swipe →</span></div>
</div></section>"""

def row(n, big, small, last=False):
    border = '' if last else 'border-bottom:2px solid #E4E1D8;'
    return f"""<div style="display:flex;gap:36px;align-items:baseline;padding:40px 0;{border}">
      <span style="font:700 34px Tight;color:#2F6B52;min-width:64px">{n}</span>
      <div><h1 style="font-size:84px;color:#15171A">{big}</h1><p style="margin-top:14px;font-size:32px;line-height:1.4;color:#6B7077">{small}</p></div></div>"""

# 2 — the offer, as three plain lines
s2 = f"""
<section class="s" style="background:#F7F6F2"><div class="in">
  {top(2, False)}
  <div style="margin:auto 0">
  <h1 style="font-size:64px;color:#15171A;letter-spacing:-0.03em">No CV. No interview. <span class="em" style="color:#245A44">No fees.</span></h1>
  <div style="margin-top:36px">
    {row('01', 'Get verified', 'Student ID, national ID and a selfie. Once.')}
    {row('02', 'Pick a gig', 'Surveys, focus groups, onboarding, app tests.')}
    {row('03', 'Get paid', 'Straight to your MoMo when your work is approved.', True)}
  </div>
  </div>
  <div class="foot" style="color:#6B7077"><span>Flexible. Verified. Paid.</span><span style="color:#15171A">Swipe →</span></div>
</div></section>"""

# 3 — call to action
s3 = f"""
<section class="s" style="background:#EFECE4"><div class="in" style="align-items:center;text-align:center">
  {top(3, False).replace('class="top"', 'class="top" style="width:100%;color:#2F6B52"')}
  <div style="margin:auto 0;display:flex;flex-direction:column;align-items:center">
    <img src="{LOGO}" alt="" style="width:170px;height:170px">
    <h1 style="margin-top:48px;font-size:118px;color:#15171A">Your first gig<br><span class="em" style="color:#245A44">is waiting.</span></h1>
    <p style="margin-top:34px;font-size:36px;line-height:1.4;color:#6B7077">Sign up in two minutes.</p>
    <div style="margin-top:56px;padding:30px 56px;border-radius:999px;background:#15171A;color:#fff;font:700 46px Tight;letter-spacing:-0.02em">gigotter.com</div>
    <p style="margin-top:26px;font:600 28px Inter;color:#2F6B52">Link in bio</p>
  </div>
</div></section>"""

pathlib.Path(sys.argv[1]).write_text(f"<!doctype html><html><head><meta charset='utf-8'><style>{css}</style></head><body>{s1}{s2}{s3}</body></html>")
