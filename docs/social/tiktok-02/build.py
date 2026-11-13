"""Gigotter TikTok carousel #2: the live gigs, v2 look. 6 slides, 1080x1920. usage: python3 build.py OUT.html
Amounts and details come from the gigs live on 13 Nov 2026."""
import base64, json, pathlib, sys

HERE = pathlib.Path(__file__).parent
PUB = pathlib.Path('/home/user/wemove/public')
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')
I = json.load(open(HERE.parent / 'tiktok-01' / 'icons.json'))

def font(pkg, f): return 'data:font/woff;base64,' + base64.b64encode((FONTS / pkg / 'package/files' / f).read_bytes()).decode()
def img(p): return f"data:image/{'png' if p.endswith('png') else 'jpeg'};base64," + base64.b64encode((PUB / p).read_bytes()).decode()
def ic(name, s=34): return I[name].replace('width="24" height="24"', f'width="{s}" height="{s}"')
def svg(path, s=34): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{path}</svg>'
PIN = svg('<path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>')
CAL = svg('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>')
HOME = svg('<path d="M4 11l8-6 8 6v8.5a1 1 0 0 1-1 1h-4.5V15h-5v5.5H5a1 1 0 0 1-1-1z"/>')
USERS = svg('<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3 5.5"/>')

LOGO, MTN = img('logo-mark.png'), img('images/mtn.jpg')
HERO, SALON, SURVEY, FOCUS = img('images/hero.jpg'), img('images/gig-onboarding.jpg'), img('images/gig-survey.jpg'), img('images/gig-focus-group.jpg')
ON, IT = 'fontsource-onest-5.1.0', 'fontsource-inter-tight-5.1.0'
CEDI = 'U+20A0-20C0'  # the cedi sign lives in the latin-ext file

faces = ''.join(
    f"@font-face {{ font-family: 'Onest'; font-weight: {w}; src: url('{font(ON, f'onest-latin-{w}-normal.woff')}'); }}"
    f"@font-face {{ font-family: 'Onest'; font-weight: {w}; src: url('{font(ON, f'onest-latin-ext-{w}-normal.woff')}'); unicode-range: {CEDI}; }}"
    for w in (500, 600, 700)) + ''.join(
    f"@font-face {{ font-family: 'Tight'; font-weight: {w}; src: url('{font(IT, f'inter-tight-latin-{w}-normal.woff')}'); }}"
    f"@font-face {{ font-family: 'Tight'; font-weight: {w}; src: url('{font(IT, f'inter-tight-latin-ext-{w}-normal.woff')}'); unicode-range: {CEDI}; }}"
    for w in (400, 500, 600))

css = faces + """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #333; font-family: Tight, sans-serif; color: #131317; }
.s { width: 1080px; height: 1920px; position: relative; overflow: hidden; margin-bottom: 40px;
  background: radial-gradient(120% 80% at 50% 15%, #F6F8F4, #E7EDE4); }
.s.dark { background: #10291F; color: #fff; }
/* faint grain, like the website hero */
.s::after { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .04; mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.s.dark::after { mix-blend-mode: screen; opacity: .05; }
.leaf { position: absolute; border-radius: 999px 999px 0 999px; border: 2px solid rgba(96,122,92,.10);
  background: linear-gradient(155deg, rgba(96,122,92,.07), rgba(96,122,92,.012) 70%); }
.dark .leaf { border-color: rgba(255,255,255,.07); background: linear-gradient(155deg, rgba(255,255,255,.06), rgba(255,255,255,.01) 70%); }
/* TikTok covers ~150px at the top, ~460px at the bottom (caption) and ~150px on the right (buttons) */
.safe { position: absolute; top: 170px; left: 80px; right: 170px; bottom: 470px; display: flex; flex-direction: column; z-index: 2; }
h1, h2, .big { font-family: Onest; font-weight: 700; letter-spacing: -0.045em; line-height: 0.98; }
.g { color: #245A44; } .dark .g { color: #B7CDBE; }
.brand { display: flex; align-items: center; gap: 16px; }
.brand img { width: 76px; height: 76px; }
.brand span { font: 700 40px Onest; letter-spacing: -0.03em; }
.eyebrow { display: inline-flex; align-items: center; gap: 14px; font: 500 25px Tight; letter-spacing: .16em; text-transform: uppercase; color: #5C625E; }
.eyebrow::before { content: ''; width: 12px; height: 12px; border-radius: 50%; background: #245A44; }
.dark .eyebrow { color: rgba(255,255,255,.65); } .dark .eyebrow::before { background: #B7CDBE; }
.tag { align-self: flex-start; display: inline-flex; padding: 14px 26px; border-radius: 999px; background: #fff; border: 2px solid #E3E9E4; font: 500 27px Tight; }
.photo { position: relative; border-radius: 36px; overflow: hidden; background: #C9D6C8; flex: none; }
.photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.chips { display: flex; flex-wrap: wrap; gap: 14px; }
.chip { display: inline-flex; align-items: center; gap: 12px; padding: 16px 26px; border-radius: 999px; background: #fff; border: 2px solid #E3E9E4; font: 500 29px Tight; }
.chip.hot { background: #1C4635; border-color: #1C4635; color: #fff; }
.row { display: flex; align-items: center; gap: 16px; font: 400 32px/1.3 Tight; color: #3A3E44; }
.row svg { flex: none; color: #245A44; }
.momo { position: absolute; display: flex; align-items: center; gap: 22px; padding: 24px 30px 24px 24px; border-radius: 30px; background: #fff;
  box-shadow: 0 30px 70px -30px rgba(16,41,31,.45); border: 2px solid #E3E9E4; }
.momo img { width: 76px; height: 76px; border-radius: 20px; }
.dots { position: absolute; left: 80px; bottom: 400px; display: flex; gap: 12px; z-index: 2; color: #131317; }
.dark .dots { color: #fff; }
.dots i { width: 14px; height: 14px; border-radius: 50%; background: currentColor; opacity: .22; display: block; }
.dots i.on { opacity: 1; width: 46px; border-radius: 99px; }
.step { display: flex; gap: 28px; align-items: flex-start; padding: 34px; border-radius: 34px; background: #fff; border: 2px solid #E3E9E4; }
.step .n { width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; font: 700 30px Onest; flex: none; }
.step b { display: block; font: 700 40px/1.1 Onest; letter-spacing: -0.03em; }
.step span { display: block; margin-top: 8px; font: 400 29px/1.35 Tight; color: #5C625E; }
"""

N = 6
def dots(n): return '<div class="dots">' + ''.join(f'<i class="{"on" if i == n else ""}"></i>' for i in range(N)) + '</div>'
def leaves(a=(820, 260, 300), b=(-90, 1320, 240)):
    return (f'<span class="leaf" style="left:{a[0]}px;top:{a[1]}px;width:{a[2]}px;height:{a[2]}px"></span>'
            f'<span class="leaf" style="left:{b[0]}px;top:{b[1]}px;width:{b[2]}px;height:{b[2]}px;border-radius:999px 0 999px 999px"></span>')
def brand(light=False): return f'<div class="brand"><img src="{LOGO}" alt=""><span style="color:{"#fff" if light else "#131317"}">Gigotter</span></div>'

def gig(n, tag, photo, title, big, sub, rows, chips):
    return f"""<section class="s">{leaves()}
  <div class="safe">
    {brand()}
    <div class="tag" style="margin-top:44px">{tag}</div>
    <div class="photo" style="margin-top:28px;height:440px"><img src="{photo}" alt=""></div>
    <h2 style="margin-top:40px;font-size:66px">{title}</h2>
    <div style="margin-top:26px;display:flex;align-items:baseline;gap:20px">
      <div class="big g" style="font-size:128px">{big}</div>
      <div style="font:500 32px/1.2 Tight;color:#5C625E">{sub}</div>
    </div>
    <div style="margin-top:26px;display:grid;gap:14px">{''.join(f'<div class="row">{i}<span>{t}</span></div>' for i, t in rows)}</div>
    <div class="chips" style="margin-top:auto">{chips}</div>
  </div>{dots(n)}
</section>"""

slides = []
# 1 · hook
slides.append(f"""<section class="s">{leaves((780, 980, 320), (-110, 1480, 260))}
  <div class="safe">
    {brand()}
    <div class="eyebrow" style="margin-top:64px">Accra · and from home</div>
    <h1 style="margin-top:26px;font-size:112px">3 paid gigs you can <span class="g">start this week.</span></h1>
    <div style="position:relative;margin-top:52px;flex:1;min-height:0">
      <div class="photo" style="position:absolute;inset:0 0 70px 70px"><img src="{HERO}" alt="" style="object-position:50% 30%"></div>
      <div class="momo" style="left:0;bottom:0">
        <img src="{MTN}" alt="">
        <div><div style="font:500 26px Tight;color:#5C625E">Every gig pays to</div><div style="font:700 44px Onest;letter-spacing:-0.03em">MTN MoMo</div></div>
      </div>
    </div>
    <div style="margin-top:34px;display:flex;align-items:center;gap:14px;font:500 30px Tight;color:#245A44">Swipe to see them {ic('ArrowRight', 34)}</div>
  </div>{dots(0)}
</section>""")
# 2 · salons
slides.append(gig(1, 'Gig 1 of 3 · Customer onboarding', SALON, 'Sign up women-owned <span class="g">salons</span>',
                  'up to ₵168', 'for 30 salons',
                  [(ic('Wallet', 34), '₵5.60 for every salon you sign up'), (PIN, 'Madina · East Legon · Adenta · Spintex · Osu')],
                  f'<span class="chip">{ic("GraduationCap", 30)}Students</span><span class="chip">10 spots</span><span class="chip">Closes 15 Dec</span>'))
# 3 · home chefs
slides.append(gig(2, 'Gig 2 of 3 · Survey', SURVEY, 'Find home chefs for a <span class="g">new food app</span>',
                  'up to ₵30', 'for 10 chefs',
                  [(ic('Wallet', 34), '₵3 for every chef you talk to'), (ic('MessagesSquare', 34), 'Short chat about ordering home-cooked meals')],
                  f'<span class="chip hot">{HOME}Work from home</span><span class="chip">Students</span><span class="chip">Closes 31 Dec</span>'))
# 4 · focus group
slides.append(gig(3, 'Gig 3 of 3 · Focus group', FOCUS, 'Share your ideas in a <span class="g">design session</span>',
                  '₵80', 'for 2 sessions',
                  [(PIN, 'Buro Hub, Osu'), (CAL, 'Thu 3 & Fri 4 Dec · 10am–12pm')],
                  f'<span class="chip hot">{USERS}Students &amp; non-students</span><span class="chip">Apply · 5 places</span>'))
# 5 · how it works
slides.append(f"""<section class="s">{leaves()}
  <div class="safe">
    {brand()}
    <div class="eyebrow" style="margin-top:64px">How it works</div>
    <h2 style="margin-top:24px;font-size:92px">Three steps to your <span class="g">first payout.</span></h2>
    <div style="margin-top:56px;display:grid;gap:22px">
      <div class="step"><span class="n" style="background:#C9D6C8">1</span><div><b>Get verified once</b><span>Student ID or Ghana Card, plus a quick selfie. About 5 minutes.</span></div></div>
      <div class="step"><span class="n" style="background:#E3ECE4">2</span><div><b>Pick a gig that fits</b><span>Every gig shows the pay, the steps and the proof needed.</span></div></div>
      <div class="step"><img src="{MTN}" alt="" style="width:64px;height:64px;border-radius:20px;flex:none"><div><b>Get paid to MoMo</b><span>Once your work is approved, with a receipt by email.</span></div></div>
    </div>
  </div>{dots(4)}
</section>""")
# 6 · call to action
slides.append(f"""<section class="s dark">{leaves((760, 300, 320), (-100, 1350, 260))}
  <div class="safe">
    {brand(True)}
    <h1 style="margin-top:auto;font-size:118px;color:#fff">Your next payout <span class="g">starts today.</span></h1>
    <p style="margin-top:34px;font:400 36px/1.4 Tight;color:rgba(255,255,255,.7)">Sign up free, get verified in about 5 minutes, then pick your first gig.</p>
    <div style="margin-top:56px;align-self:flex-start;display:inline-flex;align-items:center;gap:18px;padding:30px 44px;border-radius:999px;background:#fff;color:#10291F;font:700 50px Onest;letter-spacing:-0.03em">gigotter.com {ic('ArrowRight', 44)}</div>
    <div style="margin-top:28px;font:500 30px Tight;color:#B7CDBE">Link in bio · No fees to join</div>
  </div>{dots(5)}
</section>""")

html = f"<!doctype html><html><head><meta charset='utf-8'><title>Gigotter TikTok 2</title><style>{css}</style></head><body>{''.join(slides)}</body></html>"
pathlib.Path(sys.argv[1]).write_text(html)
print('slides:', len(slides))
