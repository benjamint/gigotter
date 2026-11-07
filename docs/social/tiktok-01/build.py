"""Gigotter first TikTok photo carousel: 5 slides, 1080x1920. usage: python3 build.py OUT.html"""
import base64, json, pathlib, sys

HERE = pathlib.Path(__file__).parent
REPO = pathlib.Path('/home/user/wemove/public')
FONTS = pathlib.Path('/tmp/claude-0/-workspace/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/qr/fonts')
I = json.load(open(HERE / 'icons.json'))
def font(p): return 'data:font/woff;base64,' + base64.b64encode((FONTS / p).read_bytes()).decode()
def img(p): return f"data:image/{'png' if p.endswith('png') else 'jpeg'};base64," + base64.b64encode((REPO / p).read_bytes()).decode()
LOGO = img('logo-mark.png')

css = f"""
@font-face {{ font-family: 'GSerif'; font-style: italic; src: url('{font('fontsource-instrument-serif-5.1.0/files/instrument-serif-latin-400-italic.woff')}'); }}
@font-face {{ font-family: 'GSerif'; font-style: normal; src: url('{font('fontsource-instrument-serif-5.1.0/files/instrument-serif-latin-400-normal.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 400; src: url('{font('fontsource-inter-5.1.0/files/inter-latin-400-normal.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 600; src: url('{font('fontsource-inter-5.1.0/files/inter-latin-600-normal.woff')}'); }}
@font-face {{ font-family: 'Tight'; font-weight: 600; src: url('{font('fontsource-inter-tight-5.1.0/files/inter-tight-latin-600-normal.woff')}'); }}
@font-face {{ font-family: 'Tight'; font-weight: 700; src: url('{font('fontsource-inter-tight-5.1.0/files/inter-tight-latin-700-normal.woff')}'); }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ background: #333; font-family: Inter, sans-serif; color: #15171A; }}
.s {{ width: 1080px; height: 1920px; position: relative; overflow: hidden; background: #F7F6F2; margin-bottom: 40px; }}
/* TikTok covers ~150px at the top, ~460px at the bottom (caption) and ~150px on the right (buttons) */
.safe {{ position: absolute; top: 170px; left: 80px; right: 170px; bottom: 470px; display: flex; flex-direction: column; }}
h1, h2 {{ font-family: Tight; font-weight: 700; letter-spacing: -0.035em; line-height: 1.0; }}
.em {{ font-family: GSerif; font-style: italic; font-weight: 400; letter-spacing: -0.01em; }}
.brand {{ display: flex; align-items: center; gap: 18px; }}
.brand img {{ width: 84px; height: 84px; }}
.brand span {{ font: 700 44px Tight; letter-spacing: -0.03em; }}
.eyebrow {{ font: 600 26px Inter; letter-spacing: .16em; text-transform: uppercase; color: #2F6B52; }}
.chip {{ display: inline-flex; align-items: center; gap: 14px; padding: 18px 28px; border-radius: 999px; font: 600 30px Inter; }}
.chip svg {{ width: 34px; height: 34px; }}
.dots {{ position: absolute; left: 80px; bottom: 400px; display: flex; gap: 12px; }}
.dots i {{ width: 14px; height: 14px; border-radius: 50%; background: currentColor; opacity: .25; display: block; }}
.dots i.on {{ opacity: 1; width: 44px; border-radius: 99px; }}
.ic {{ width: 92px; height: 92px; border-radius: 26px; display: grid; place-items: center; background: #EEF3EF; color: #245A44; flex: none; }}
.ic svg {{ width: 48px; height: 48px; }}
"""

def dots(n, color='#15171A'):
    return f'<div class="dots" style="color:{color}">' + ''.join(f'<i class="{"on" if i == n else ""}"></i>' for i in range(5)) + '</div>'
def brand(light=False):
    return f'<div class="brand"><img src="{LOGO}" alt=""><span style="color:{"#fff" if light else "#15171A"}">Gigotter</span></div>'

# 1 — hook on a full-bleed photo
s1 = f"""
<section class="s" style="background:#10291F">
  <img src="{img('images/hero.jpg')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,41,31,.55) 0%,rgba(16,41,31,.05) 30%,rgba(16,41,31,.55) 52%,rgba(16,41,31,.96) 78%)"></div>
  <div class="safe">
    {brand(True)}
    <div style="margin-top:auto">
      <div class="chip" style="background:#fff;color:#245A44">{I['GraduationCap']} For students</div>
      <h1 style="margin-top:34px;font-size:118px;color:#fff">Get paid to do <span class="em" style="color:#B7CDBE">real work</span> for real businesses.</h1>
      <p style="margin-top:30px;font-size:36px;line-height:1.4;color:rgba(255,255,255,.82)">Flexible gigs. Paid to your mobile money.</p>
      <div style="margin-top:40px;display:flex;align-items:center;gap:14px;font:600 32px Inter;color:#fff">Swipe to see how <span style="display:inline-grid;width:56px;height:56px;border-radius:50%;background:#fff;color:#10291F;place-items:center">{I['ArrowRight'].replace('width="24" height="24"','width="30" height="30"')}</span></div>
    </div>
  </div>
  
</section>"""

def step(n, photo, title, body):
    return f"""<div style="display:flex;gap:34px;align-items:center">
      <div style="position:relative;flex:none"><img src="{img(photo)}" style="width:210px;height:210px;object-fit:cover;border-radius:36px">
        <span style="position:absolute;left:-18px;top:-18px;width:76px;height:76px;border-radius:50%;background:#15171A;color:#fff;font:700 34px Tight;display:grid;place-items:center;border:6px solid #F7F6F2">{n}</span></div>
      <div><h2 style="font-size:52px">{title}</h2><p style="margin-top:12px;font-size:31px;line-height:1.4;color:#6B7077">{body}</p></div></div>"""

# 2 — how it works
s2 = f"""
<section class="s"><div class="safe">
  {brand()}
  <div class="eyebrow" style="margin-top:90px">How it works</div>
  <h1 style="margin-top:22px;font-size:96px">Three steps to your <span class="em">first payout.</span></h1>
  <div style="margin-top:64px;display:grid;gap:46px">
    {step(1, 'images/step-verify.jpg', 'Get verified once', 'Student ID, national ID and a quick selfie.')}
    {step(2, 'images/step-field.jpg', 'Pick a gig', 'Clear instructions and clear pay, upfront.')}
    {step(3, 'images/step-paid.jpg', 'Get paid to MoMo', 'Submit your work. Once approved, you’re paid.')}
  </div>
</div></section>"""

def work(icon, title, body):
    return f'<div style="background:#fff;border:2px solid #E4E1D8;border-radius:40px;padding:40px 36px"><span class="ic">{I[icon]}</span><h2 style="margin-top:28px;font-size:44px">{title}</h2><p style="margin-top:10px;font-size:28px;line-height:1.38;color:#6B7077">{body}</p></div>'

# 3 — kinds of work
s3 = f"""
<section class="s" style="background:#EFECE4"><div class="safe">
  {brand()}
  <div class="eyebrow" style="margin-top:90px">The work</div>
  <h1 style="margin-top:22px;font-size:96px">Gigs that fit <span class="em">around lectures.</span></h1>
  <div style="margin-top:70px;display:grid;grid-template-columns:1fr 1fr;gap:26px">
    {work('Handshake', 'Onboarding', 'Introduce businesses to new products.')}
    {work('MessagesSquare', 'Focus groups', 'Share your views and get paid for them.')}
    {work('Search', 'Field research', 'Visit shops and markets to gather info.')}
    {work('Smartphone', 'App testing', 'Try new apps and say what works.')}
  </div>
</div></section>"""

def why(icon, title, body):
    return f'<div style="display:flex;gap:30px;align-items:center;padding:38px 0;border-bottom:2px solid rgba(255,255,255,.12)"><span class="ic" style="background:rgba(255,255,255,.1);color:#B7CDBE">{I[icon]}</span><div><h2 style="font-size:50px;color:#fff">{title}</h2><p style="margin-top:8px;font-size:30px;color:rgba(255,255,255,.65)">{body}</p></div></div>'

# 4 — why Gigotter
s4 = f"""
<section class="s" style="background:#10291F;color:#fff"><div class="safe">
  {brand(True)}
  <div class="eyebrow" style="margin-top:90px;color:#B7CDBE">Why Gigotter</div>
  <h1 style="margin-top:22px;font-size:96px;color:#fff">Real gigs. <span class="em" style="color:#B7CDBE">Real pay.</span></h1>
  <div style="margin-top:60px">
    {why('ShieldCheck', 'Every student verified', 'So businesses trust the people they meet.')}
    {why('Wallet', 'Paid to mobile money', 'MTN MoMo, Telecel Cash and more.')}
    {why('BadgeCheck', 'No fees, ever', 'Joining and working is free for students.')}
    {why('Clock', 'Work when you can', 'Between lectures, on weekends, near campus.')}
  </div>
</div></section>"""

# 5 — call to action
s5 = f"""
<section class="s" style="background:#F7F6F2"><div class="safe" style="align-items:center;text-align:center;justify-content:center">
  <img src="{LOGO}" style="width:300px;height:300px">
  <h1 style="margin-top:56px;font-size:116px">Your next payout <span class="em" style="color:#245A44">starts today.</span></h1>
  <p style="margin-top:34px;font-size:38px;line-height:1.4;color:#6B7077">Sign up in two minutes. Get verified.<br>Pick your first gig.</p>
  <div style="margin-top:60px;display:inline-flex;align-items:center;gap:18px;padding:34px 56px;border-radius:999px;background:#15171A;color:#fff;font:600 44px Tight">gigotter.com {I['ArrowRight'].replace('width="24" height="24"','width="44" height="44"')}</div>
  <p style="margin-top:30px;font:600 30px Inter;color:#2F6B52">Link in bio</p>
</div></section>"""

html = f"<!doctype html><html><head><meta charset='utf-8'><style>{css}</style></head><body>{s1}{s2}{s3}{s4}{s5}</body></html>"
pathlib.Path(sys.argv[1]).write_text(html)
