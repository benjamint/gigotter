"""Gigotter "Earned." emotion campaign: sample artworks.
Feed posts 1080x1350 (id p1..p9) and Story/TikTok versions 1080x1920 (id s1, s6, s7).
usage: python3 build.py OUT.html   then   node render.cjs OUT.html OUTDIR
Photos are the free-licence ones already on the site (see public/images/CREDITS.md)."""
import base64, pathlib, sys

PUB = pathlib.Path('/home/user/wemove/public')
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')
def font(pkg, f): return 'data:font/woff;base64,' + base64.b64encode((FONTS / pkg / 'package/files' / f).read_bytes()).decode()
def img(p): return f"data:image/{'png' if p.endswith('png') else 'jpeg'};base64," + base64.b64encode((PUB / p).read_bytes()).decode()

ON, IT = 'fontsource-onest-5.1.0', 'fontsource-inter-tight-5.1.0'
CEDI = 'U+20A0-20C0'
faces = ''.join(
    f"@font-face {{ font-family: 'Onest'; font-weight: {w}; src: url('{font(ON, f'onest-latin-{w}-normal.woff')}'); }}"
    f"@font-face {{ font-family: 'Onest'; font-weight: {w}; src: url('{font(ON, f'onest-latin-ext-{w}-normal.woff')}'); unicode-range: {CEDI}; }}"
    for w in (500, 600, 700)) + ''.join(
    f"@font-face {{ font-family: 'Tight'; font-weight: {w}; src: url('{font(IT, f'inter-tight-latin-{w}-normal.woff')}'); }}"
    for w in (400, 500, 600))

LOGO = img('logo-mark.png')
P = {k: img(f'images/{v}') for k, v in dict(
    sky='step-verify.jpg', joy='step-paid.jpg', focus='gig-onboarding.jpg', class_='gig-focus-group.jpg',
    field='step-field.jpg', group='hero.jpg').items()}

GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

css = faces + """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #222; font-family: Tight, sans-serif; }
.a { width: 1080px; height: 1350px; position: relative; overflow: hidden; margin: 0 0 40px; color: #fff; background: #10291F; }
.a.tall { height: 1920px; }
.a::after { content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 5; opacity: .07; mix-blend-mode: overlay; background-image: GRAIN; }
.paper { background: #F3F5F1; color: #131317; }
.paper::after { mix-blend-mode: multiply; opacity: .05; }
/* photo posts: full bleed, warm-green grade, dark foot for the words */
.ph { position: absolute; inset: 0; }
.ph img { width: 100%; height: 100%; object-fit: cover; display: block; filter: saturate(.92) contrast(1.03); }
.ph::before { content: ''; position: absolute; inset: 0; background: #1C4635; mix-blend-mode: soft-light; opacity: .55; z-index: 1; }
.ph::after { content: ''; position: absolute; inset: 0; z-index: 2; background: linear-gradient(180deg, rgba(16,41,31,0) 38%, rgba(16,41,31,.55) 62%, rgba(16,41,31,.94) 100%); }
.words { position: absolute; left: 84px; right: 84px; bottom: 210px; z-index: 3; }
.tall .words { bottom: 470px; }
.up .words { top: 250px; bottom: auto; }
.up .ph::after { background: linear-gradient(0deg, rgba(16,41,31,0) 35%, rgba(16,41,31,.55) 62%, rgba(16,41,31,.92) 100%), linear-gradient(180deg, rgba(16,41,31,0) 70%, rgba(16,41,31,.7) 100%); }
h1 { font: 700 104px/0.98 Onest; letter-spacing: -0.05em; }
h1.xl { font-size: 150px; line-height: .92; }
h1.l { font-size: 124px; }
h1 em { font-style: normal; color: #B7CDBE; }
.paper h1 em { color: #245A44; }
.sub { margin-top: 30px; font: 400 34px/1.35 Tight; color: rgba(255,255,255,.78); max-width: 820px; }
.paper .sub { color: #5C625E; }
/* sign-off: "Earned." on the left, the otter + site on the right */
.foot { position: absolute; left: 84px; right: 84px; bottom: 84px; z-index: 3; display: flex; align-items: center; justify-content: space-between; }
.tall .foot { bottom: 330px; }
.earned { font: 600 44px Onest; letter-spacing: -0.03em; color: #B7CDBE; }
.paper .earned { color: #245A44; }
.mark { display: flex; align-items: center; gap: 14px; font: 500 26px Tight; color: rgba(255,255,255,.8); }
.paper .mark { color: #5C625E; }
.mark img { width: 58px; height: 58px; }
.top { position: absolute; top: 84px; left: 84px; right: 84px; z-index: 3; display: flex; justify-content: space-between; align-items: center;
  font: 500 24px Tight; letter-spacing: .18em; text-transform: uppercase; color: rgba(255,255,255,.7); }
.tall .top { top: 230px; }
.paper .top { color: #5C625E; }
.center { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; justify-content: center; padding: 0 84px 120px; }
.tall .center { padding: 0 84px 260px; }
.leaf { position: absolute; border-radius: 999px 999px 0 999px; border: 2px solid rgba(255,255,255,.06); background: linear-gradient(155deg, rgba(255,255,255,.05), rgba(255,255,255,0) 70%); z-index: 1; }
.paper .leaf { border-color: rgba(36,90,68,.08); background: linear-gradient(155deg, rgba(36,90,68,.05), rgba(36,90,68,0) 70%); }
/* the phone notification */
.note { width: 860px; margin: 0 auto; border-radius: 44px; background: rgba(255,255,255,.96); color: #131317; padding: 34px 38px; box-shadow: 0 40px 80px -30px rgba(0,0,0,.5); }
.note .hd { display: flex; align-items: center; gap: 18px; font: 500 26px Tight; color: #5C625E; }
.note .ic { width: 60px; height: 60px; border-radius: 16px; background: #245A44; display: grid; place-items: center; }
.note .ttl { margin-top: 18px; font: 600 36px Tight; }
.note .bd { margin-top: 8px; font: 400 33px/1.38 Tight; color: #3A3E44; }
.note .hd .t { margin-left: auto; }
.ghost { width: 800px; margin: 0 auto; height: 44px; border-radius: 0 0 36px 36px; background: rgba(255,255,255,.18); }
.ghost.g2 { width: 740px; height: 30px; background: rgba(255,255,255,.08); }
/* story card */
.story { position: absolute; left: 0; right: 0; bottom: 0; height: 540px; background: #F3F5F1; color: #131317; z-index: 3; padding: 64px 84px; }
.story .tag { font: 600 28px Onest; color: #245A44; letter-spacing: -0.01em; }
.story h2 { margin-top: 18px; font: 700 92px/1 Onest; letter-spacing: -0.05em; }
.story p { margin-top: 22px; font: 400 36px/1.38 Tight; color: #3A3E44; max-width: 860px; }
.sample { position: absolute; top: 40px; right: 40px; z-index: 6; background: #FEF0C7; color: #93370D; font: 600 22px Tight; letter-spacing: .14em; padding: 12px 20px; border-radius: 999px; }
""".replace('GRAIN', GRAIN)

def foot(paper=False):
    return f'<div class="foot"><span class="earned">Earned.</span><span class="mark"><img src="{LOGO}">gigotter.com</span></div>'

def photo(id, pic, words, sub='', tall=False, pos='center', top='', up=False):
    return f'''<section class="a{' tall' if tall else ''}{' up' if up else ''}" id="{id}">
<div class="ph"><img src="{P[pic]}" style="object-position:{pos}"></div>
{f'<div class="top"><span>{top}</span></div>' if top else ''}
<div class="words"><h1>{words}</h1>{f'<p class="sub">{sub}</p>' if sub else ''}</div>{foot()}</section>'''

def type_only(id, words, cls='', paper=False, top='', sub='', tall=False):
    return f'''<section class="a{' paper' if paper else ''}{' tall' if tall else ''}" id="{id}">
<div class="leaf" style="width:760px;height:760px;right:-260px;top:-180px"></div>
<div class="leaf" style="width:420px;height:420px;left:-150px;bottom:-120px;transform:rotate(180deg)"></div>
{f'<div class="top"><span>{top}</span></div>' if top else ''}
<div class="center"><h1 class="{cls}">{words}</h1>{f'<p class="sub">{sub}</p>' if sub else ''}</div>{foot(paper)}</section>'''

WALLET = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4"/><path d="M4 7.5v10A2.5 2.5 0 0 0 6.5 20H20V9H6.5A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="14.5" r="1.2" fill="#fff"/></svg>'
def ping(id, tall=False):
    return f'''<section class="a{' tall' if tall else ''}" id="{id}">
<div class="leaf" style="width:760px;height:760px;right:-260px;top:-180px"></div>
<div class="center" style="align-items:stretch">
  <div class="note"><div class="hd"><span class="ic">{WALLET}</span>Mobile money<span class="t">now</span></div>
    <div class="ttl">Payment received</div>
    <div class="bd">You have received GHS 168.00 from GIGOTTER. Reference: Gig payout. Your new balance is available.</div></div>
  <div class="ghost"></div><div class="ghost g2"></div>
  <h1 style="margin-top:110px;text-align:center" class="l">Best sound<br>your phone <em>makes.</em></h1>
</div>{foot()}</section>'''

def earned_it(id):
    return f'''<section class="a" id="{id}">
<div class="sample">SAMPLE · REPLACE WITH A REAL STORY</div>
<div class="ph" style="bottom:540px"><img src="{P['field']}" style="object-position:62% 30%"></div>
<div class="story"><div class="tag">#EarnedIt</div><h2>Ama, 21.</h2>
<p>Signed up 30 salons in Madina between lectures. Bought her own laptop.</p></div>
<div class="foot" style="z-index:4"><span class="earned" style="color:#245A44">Earned.</span><span class="mark" style="color:#5C625E"><img src="{LOGO}">gigotter.com</span></div></section>'''

slides = [
    photo('p1', 'sky', 'The first time<br>you didn’t<br><em>have to ask.</em>', pos='38% 30%'),
    type_only('p2', 'Mum asked who<br>sent the money.<br><em>You said: me.</em>', cls='l'),
    photo('p3', 'class_', 'Lecture at 8.<br>Gig at 2.<br><em>Paid by 5.</em>', pos='40% 40%'),
    type_only('p4', 'Pocket money<br>was a <em>phase.</em>', cls='xl', paper=True),
    photo('p5', 'focus', 'Your time always<br>had a price.<br><em>Now someone’s<br>paying it.</em>', pos='70% 40%'),
    photo('p6', 'joy', 'Not a side hustle.<br><em>Your first salary.</em>', pos='50% 30%'),
    ping('p7'),
    earned_it('p8'),
    type_only('p9', 'Broke is not<br>a <em>personality.</em>', cls='xl'),
    # Story / TikTok versions
    photo('s1', 'sky', 'The first time<br>you didn’t<br><em>have to ask.</em>', tall=True, pos='80% 30%', up=True),
    photo('s6', 'joy', 'Not a side hustle.<br><em>Your first salary.</em>', tall=True, pos='48% 30%'),
    ping('s7', tall=True),
]

html = f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{"".join(slides)}</body></html>'
pathlib.Path(sys.argv[1]).write_text(html)
print('wrote', sys.argv[1], len(html) // 1024, 'KB,', len(slides), 'artworks')
