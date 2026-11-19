"""TikTok video of the snail post: 1080x1920, 13.5 s, 30 fps.
usage: python3 build.py SNAIL.jpg OUT.html  ->  node render.cjs OUT.html FRAMEDIR  ->  ./encode.sh FRAMEDIR OUT.mp4
SNAIL.jpg is Pexels 31280238 (see ../CREDITS.md). The page exposes render(t) so every frame is drawn at an exact time."""
import base64, pathlib, sys
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')
def b64(p, mime): return f'data:{mime};base64,' + base64.b64encode(pathlib.Path(p).read_bytes()).decode()
ON, IT = FONTS / 'fontsource-onest-5.1.0/package/files', FONTS / 'fontsource-inter-tight-5.1.0/package/files'
faces = ''.join(f"@font-face {{ font-family: 'Onest'; font-weight: {w}; src: url('{b64(ON / f'onest-latin-{w}-normal.woff', 'font/woff')}'); }}" for w in (500, 600, 700)) + \
        ''.join(f"@font-face {{ font-family: 'Tight'; font-weight: {w}; src: url('{b64(IT / f'inter-tight-latin-{w}-normal.woff', 'font/woff')}'); }}" for w in (400, 500))
SNAIL = b64(sys.argv[1], 'image/jpeg')
LOGO = b64('/home/user/wemove/public/logo-mark.png', 'image/png')
GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

html = f'''<!doctype html><html><head><meta charset="utf-8"><style>{faces}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ width: 1080px; height: 1920px; overflow: hidden; background: #000; font-family: Tight, sans-serif; color: #fff; }}
#stage {{ position: absolute; inset: 0; overflow: hidden; background: #000; }}
#photo {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 55% 50%; transform-origin: 52% 46%; }}
#dim {{ position: absolute; inset: 0; background: #000; }}
.t {{ position: absolute; left: 84px; right: 170px; }}
#me {{ top: 760px; font: 600 88px/1.05 Onest; letter-spacing: -0.04em; }}
#me i {{ display: block; margin-top: 18px; font: italic 500 60px/1.1 Tight; color: rgba(255,255,255,.75); }}
#uncle {{ top: 250px; font: 600 66px/1.1 Onest; letter-spacing: -0.035em; }}
#uncle span {{ color: #B7CDBE; }}
#day {{ top: 250px; font: 700 150px/1 Onest; letter-spacing: -0.05em; }}
#day small {{ display: block; margin-top: 16px; font: 500 40px Tight; letter-spacing: 0; color: rgba(255,255,255,.65); }}
#resp {{ top: 250px; font: 700 104px/0.98 Onest; letter-spacing: -0.05em; }}
#resp em {{ font-style: normal; color: #B7CDBE; }}
#green {{ position: absolute; inset: 0; background: radial-gradient(90% 60% at 50% 30%, #1C4635 0%, #10291F 70%); }}
#green::after {{ content: ''; position: absolute; inset: 0; opacity: .07; mix-blend-mode: overlay; background-image: {GRAIN}; }}
.leaf {{ position: absolute; border-radius: 999px 999px 0 999px; border: 2px solid rgba(255,255,255,.06); background: linear-gradient(155deg, rgba(255,255,255,.05), rgba(255,255,255,0) 70%); }}
#or {{ top: 760px; font: 700 128px/0.96 Onest; letter-spacing: -0.05em; }}
#or em {{ font-style: normal; color: #B7CDBE; }}
#end {{ position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 260px; }}
#end .big {{ font: 700 230px/1 Onest; letter-spacing: -0.06em; color: #B7CDBE; }}
#end .mark {{ margin-top: 40px; display: flex; align-items: center; gap: 18px; font: 500 40px Tight; color: rgba(255,255,255,.85); }}
#end .mark img {{ width: 84px; height: 84px; }}
#end .sub {{ margin-top: 26px; font: 400 34px Tight; color: rgba(255,255,255,.6); }}
</style></head><body><div id="stage">
<img id="photo" src="{SNAIL}"><div id="dim"></div>
<div class="t" id="me">Me:<i>*asks uncle for money*</i></div>
<div class="t" id="uncle">Uncle: <span>“Let me see<br>what I can do.”</span></div>
<div class="t" id="day"><span id="dn">Day 1</span><small>still waiting…</small></div>
<div class="t" id="resp">Response time:<br><em>3–5 business<br>weeks.</em></div>
<div id="green"><div class="leaf" style="width:760px;height:760px;right:-260px;top:-180px"></div>
  <div class="leaf" style="width:420px;height:420px;left:-150px;bottom:-120px;transform:rotate(180deg)"></div>
  <div class="t" id="or">Or just…<br><em>earn it.</em></div>
  <div id="end"><div class="big">Earned.</div><div class="mark"><img src="{LOGO}">gigotter.com</div><div class="sub">Real gigs. Paid to mobile money.</div></div></div>
</div>
<script>
const $ = (s) => document.querySelector(s)
const clamp = (x) => Math.max(0, Math.min(1, x))
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3)
const span = (t, a, b) => (t - a) / (b - a)
const show = (el, t, a, b, f = .35) => {{ const k = ease(span(t, a, a + f)) * (1 - ease(span(t, b - f, b))); el.style.opacity = k; return k }}
const DAYS = [[4.6, 1], [5.3, 4], [6.0, 11], [6.7, 19], [7.3, 23]]
window.render = (t) => {{
  // 0-1.6: the ask, on black
  const k = show($('#me'), t, 0.1, 1.75, .35); $('#me').style.transform = `translateY(${{(1 - ease(span(t, .1, .6))) * 30}}px)`
  $('#me i').style.opacity = ease(span(t, .55, .95))
  // the snail: fades in, then creeps closer for the rest of the clip
  $('#dim').style.opacity = 1 - .9 * ease(span(t, 1.5, 2.4)) + .35 * ease(span(t, 7.9, 8.4))
  $('#photo').style.transform = `translateY(330px) scale(${{1 + .22 * clamp(span(t, 1.5, 10))}})`
  show($('#uncle'), t, 2.0, 4.45, .3)
  // the counter: days tick by, each with a small pop
  const dk = show($('#day'), t, 4.55, 8.0, .2)
  let cur = DAYS[0]; for (const d of DAYS) if (t >= d[0]) cur = d
  $('#dn').textContent = 'Day ' + cur[1]
  const pop = 1 + .12 * (1 - ease(span(t, cur[0], cur[0] + .25)))
  $('#dn').style.display = 'inline-block'; $('#dn').style.transform = `scale(${{pop}})`; $('#dn').style.transformOrigin = 'left bottom'
  // the punchline
  show($('#resp'), t, 8.1, 10.1, .3); $('#resp').style.transform = `translateY(${{(1 - ease(span(t, 8.1, 8.5))) * 40}}px)`
  // the turn: green, "Or just... earn it.", then the sign-off
  $('#green').style.opacity = ease(span(t, 10.0, 10.45))
  show($('#or'), t, 10.3, 11.75, .3)
  const e = ease(span(t, 11.7, 12.3)); $('#end').style.opacity = e; $('#end').style.transform = `scale(${{1.06 - .06 * e}})`
  $('#end .mark').style.opacity = ease(span(t, 12.2, 12.7)); $('#end .sub').style.opacity = ease(span(t, 12.5, 13))
}}
render(0)
</script></body></html>'''
pathlib.Path(sys.argv[2]).write_text(html)
print('wrote', sys.argv[2])
