"""TikTok video of the "ping" post: 1080x1920, 12 s, 30 fps.
usage: python3 build.py OUT.html  ->  node render.cjs OUT.html FRAMEDIR  ->  ./encode.sh FRAMEDIR OUT.mp4
The page exposes render(t) so every frame is drawn at an exact time (no live CSS animation)."""
import base64, pathlib, sys
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')
PUB = pathlib.Path('/home/user/wemove/public')
def font(pkg, f): return 'data:font/woff;base64,' + base64.b64encode((FONTS / pkg / 'package/files' / f).read_bytes()).decode()
ON, IT = 'fontsource-onest-5.1.0', 'fontsource-inter-tight-5.1.0'
faces = ''.join(f"@font-face {{ font-family: 'Onest'; font-weight: {w}; src: url('{font(ON, f'onest-latin-{w}-normal.woff')}'); }}" for w in (500, 600, 700)) + \
        ''.join(f"@font-face {{ font-family: 'Tight'; font-weight: {w}; src: url('{font(IT, f'inter-tight-latin-{w}-normal.woff')}'); }}" for w in (400, 500, 600))
LOGO = 'data:image/png;base64,' + base64.b64encode((PUB / 'logo-mark.png').read_bytes()).decode()
GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
WALLET = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4"/><path d="M4 7.5v10A2.5 2.5 0 0 0 6.5 20H20V9H6.5A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="14.5" r="1.2" fill="#fff"/></svg>'

html = f'''<!doctype html><html><head><meta charset="utf-8"><style>{faces}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ width: 1080px; height: 1920px; overflow: hidden; background: #10291F; font-family: Tight, sans-serif; color: #fff; }}
#stage {{ position: absolute; inset: 0; overflow: hidden; background: radial-gradient(90% 60% at 50% 30%, #1C4635 0%, #10291F 70%); }}
#stage::after {{ content: ''; position: absolute; inset: 0; opacity: .07; mix-blend-mode: overlay; background-image: {GRAIN}; z-index: 20; }}
.leaf {{ position: absolute; border-radius: 999px 999px 0 999px; border: 2px solid rgba(255,255,255,.06); background: linear-gradient(155deg, rgba(255,255,255,.05), rgba(255,255,255,0) 70%); }}
#lock {{ position: absolute; top: 300px; left: 0; right: 0; text-align: center; }}
#date {{ font: 500 40px Tight; color: rgba(255,255,255,.7); }}
#clock {{ font: 600 230px/1 Onest; letter-spacing: -0.04em; margin-top: 6px; }}
#pov {{ position: absolute; top: 220px; left: 84px; right: 84px; text-align: center; font: 500 40px Tight; color: rgba(255,255,255,.85); }}
#note {{ position: absolute; left: 90px; right: 90px; top: 700px; border-radius: 44px; background: rgba(255,255,255,.96); color: #131317; padding: 34px 38px; box-shadow: 0 40px 80px -30px rgba(0,0,0,.55); }}
#note .hd {{ display: flex; align-items: center; gap: 18px; font: 500 28px Tight; color: #5C625E; }}
#note .ic {{ width: 62px; height: 62px; border-radius: 16px; background: #245A44; display: grid; place-items: center; }}
#note .t {{ margin-left: auto; }}
#note .ttl {{ margin-top: 18px; font: 600 38px Tight; }}
#note .bd {{ margin-top: 8px; font: 400 34px/1.38 Tight; color: #3A3E44; }}
.line {{ position: absolute; left: 84px; right: 170px; font: 700 112px/0.98 Onest; letter-spacing: -0.05em; }}
.line em {{ font-style: normal; color: #B7CDBE; }}
.w {{ display: inline-block; }}
#l1 {{ top: 1130px; }} #l2 {{ top: 1110px; }}
#end {{ position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 260px; }}
#end .big {{ font: 700 230px/1 Onest; letter-spacing: -0.06em; color: #B7CDBE; }}
#end .mark {{ margin-top: 40px; display: flex; align-items: center; gap: 18px; font: 500 40px Tight; color: rgba(255,255,255,.85); }}
#end .mark img {{ width: 84px; height: 84px; }}
#end .sub {{ margin-top: 26px; font: 400 34px Tight; color: rgba(255,255,255,.6); }}
</style></head><body><div id="stage">
<div class="leaf" style="width:760px;height:760px;right:-260px;top:-180px"></div>
<div class="leaf" style="width:420px;height:420px;left:-150px;bottom:-120px;transform:rotate(180deg)"></div>
<div id="pov">POV: the lecture just ended.</div>
<div id="lock"><div id="date">Friday</div><div id="clock">17:04</div></div>
<div id="note"><div class="hd"><span class="ic">{WALLET}</span>Mobile money<span class="t">now</span></div>
  <div class="ttl">Payment received</div>
  <div class="bd">You have received GHS 168.00 from GIGOTTER. Reference: Gig payout.</div></div>
<div class="line" id="l1"><span class="w">That’s</span> <span class="w">not</span> <span class="w">pocket</span> <span class="w"><em>money.</em></span></div>
<div class="line" id="l2"><span class="w">Best</span> <span class="w">sound</span><br><span class="w">your</span> <span class="w">phone</span><br><span class="w"><em>makes.</em></span></div>
<div id="end"><div class="big">Earned.</div><div class="mark"><img src="{LOGO}">gigotter.com</div><div class="sub">Real gigs. Paid to mobile money.</div></div>
</div>
<script>
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)]
const clamp = (x) => Math.max(0, Math.min(1, x))
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3)               // ease-out
const back = (x) => {{ x = clamp(x); const c = 1.5; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }} // overshoot
const span = (t, a, b) => (t - a) / (b - a)
function words(sel, t, start, gap) {{
  $$(sel + ' .w').forEach((w, i) => {{ const k = ease(span(t, start + i * gap, start + i * gap + .35)); w.style.opacity = k; w.style.transform = `translateY(${{(1 - k) * 40}}px)` }})
}}
window.render = (t) => {{
  // lock screen fades in, then dims when the message arrives
  const lockIn = ease(span(t, 0, .6)), lockOut = ease(span(t, 4.2, 4.8))
  $('#lock').style.opacity = lockIn * (1 - .55 * ease(span(t, 1.5, 2))) * (1 - lockOut)
  $('#pov').style.opacity = ease(span(t, .3, .9)) * (1 - ease(span(t, 4.2, 4.6)))
  // the notification drops in at 1.5 s with an overshoot, phone buzzes (shake) for 0.5 s
  const drop = back(span(t, 1.5, 2.05))
  const noteOut = ease(span(t, 8.2, 8.8))
  $('#note').style.transform = `translateY(${{(1 - drop) * -900 + (t > 4.6 ? -ease(span(t, 4.6, 5.3)) * 380 : 0)}}px) scale(${{1 - noteOut * .08}})`
  $('#note').style.opacity = (t < 1.5 ? 0 : 1) * (1 - noteOut)
  const buzz = t > 1.55 && t < 2.15 ? Math.sin(t * 140) * 9 * (1 - span(t, 1.55, 2.15)) : 0
  $('#stage').style.transform = `translateX(${{buzz}}px)`
  // line 1, then line 2, word by word
  words('#l1', t, 3.0, .18); $('#l1').style.opacity = 1 - ease(span(t, 4.4, 4.8))
  words('#l2', t, 5.4, .22); $('#l2').style.opacity = 1 - ease(span(t, 8.2, 8.7))
  // sign-off
  const e = ease(span(t, 8.9, 9.6))
  $('#end').style.opacity = e; $('#end').style.transform = `scale(${{1.06 - .06 * e}})`
  $('#end .mark').style.opacity = ease(span(t, 9.6, 10.2)); $('#end .sub').style.opacity = ease(span(t, 10.0, 10.6))
}}
render(0)
</script></body></html>'''
pathlib.Path(sys.argv[1]).write_text(html)
print('wrote', sys.argv[1])
