"""TikTok video of the pigeons post: 1080x1920, 13.5 s, 30 fps.
usage: python3 build.py PIGEONS.jpg OUT.html  ->  node render.cjs OUT.html FRAMEDIR  ->  ./encode.sh FRAMEDIR OUT.mp4
PIGEONS.jpg is Pexels 18132498 (see ../CREDITS.md). The page exposes render(t) so every frame is drawn at an exact time."""
import base64, pathlib, sys
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')
def b64(p, mime): return f'data:{mime};base64,' + base64.b64encode(pathlib.Path(p).read_bytes()).decode()
ON, IT = FONTS / 'fontsource-onest-5.1.0/package/files', FONTS / 'fontsource-inter-tight-5.1.0/package/files'
faces = ''.join(f"@font-face {{ font-family: 'Onest'; font-weight: {w}; src: url('{b64(ON / f'onest-latin-{w}-normal.woff', 'font/woff')}'); }}" for w in (500, 600, 700)) + \
        ''.join(f"@font-face {{ font-family: 'Tight'; font-weight: {w}; src: url('{b64(IT / f'inter-tight-latin-{w}-normal.woff', 'font/woff')}'); }}" for w in (400, 500))
PHOTO = b64(sys.argv[1], 'image/jpeg')
LOGO = b64('/home/user/wemove/public/logo-mark.png', 'image/png')
GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
# label, time it lands, zoom level after it
PUNCHES = [('Pocket money.', 4.0, 1.16), ('Leftover transport money.', 5.0, 1.32), ('“Something small.”', 6.0, 1.5)]

labels = ''.join(f'<div class="t lab" id="lab{i}">{l}</div>' for i, (l, _, _) in enumerate(PUNCHES))
html = f'''<!doctype html><html><head><meta charset="utf-8"><style>{faces}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ width: 1080px; height: 1920px; overflow: hidden; background: #000; font-family: Tight, sans-serif; color: #fff; }}
#stage {{ position: absolute; inset: 0; overflow: hidden; background: #000; }}
#photo {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 50%; transform-origin: 62% 60%; }}
#shade {{ position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.8), rgba(0,0,0,.55) 22%, rgba(0,0,0,0) 44%), linear-gradient(0deg, rgba(8,22,16,.9), rgba(8,22,16,.5) 30%, rgba(8,22,16,0) 52%); }}
#dim {{ position: absolute; inset: 0; background: #000; }}
.t {{ position: absolute; left: 84px; right: 170px; }}
#l1 {{ top: 250px; font: 700 104px/0.98 Onest; letter-spacing: -0.05em; }}
#l1 em {{ font-style: normal; color: #B7CDBE; }}
.w {{ display: inline-block; }}
.lab {{ top: 260px; }}
.lab span {{ display: inline-block; background: #F3F5F1; color: #131317; font: 700 72px/1.1 Onest; letter-spacing: -0.04em; padding: 14px 26px 18px; border-radius: 22px; }}
#big {{ bottom: 470px; font: 700 150px/0.92 Onest; letter-spacing: -0.055em; }}
#big em {{ font-style: normal; color: #B7CDBE; }}
#green {{ position: absolute; inset: 0; background: radial-gradient(90% 60% at 50% 30%, #1C4635 0%, #10291F 70%); }}
#green::after {{ content: ''; position: absolute; inset: 0; opacity: .07; mix-blend-mode: overlay; background-image: {GRAIN}; }}
.leaf {{ position: absolute; border-radius: 999px 999px 0 999px; border: 2px solid rgba(255,255,255,.06); background: linear-gradient(155deg, rgba(255,255,255,.05), rgba(255,255,255,0) 70%); }}
#own {{ top: 760px; font: 700 132px/0.95 Onest; letter-spacing: -0.05em; }}
#own em {{ font-style: normal; color: #B7CDBE; }}
#end {{ position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 260px; }}
#end .big {{ font: 700 230px/1 Onest; letter-spacing: -0.06em; color: #B7CDBE; }}
#end .mark {{ margin-top: 40px; display: flex; align-items: center; gap: 18px; font: 500 40px Tight; color: rgba(255,255,255,.85); }}
#end .mark img {{ width: 84px; height: 84px; }}
#end .sub {{ margin-top: 26px; font: 400 34px Tight; color: rgba(255,255,255,.6); }}
</style></head><body><div id="stage">
<img id="photo" src="{PHOTO}"><div id="shade"></div><div id="dim"></div>
<div class="t" id="l1"><span class="w">Everyone’s</span> <span class="w">fighting</span><br><span class="w">for</span> <span class="w">the</span> <span class="w">same</span><br><span class="w"><em>crumbs.</em></span></div>
{labels.replace('">', '"><span>').replace('</div>', '</span></div>')}
<div class="t" id="big">Stop<br>fighting<br><em>for crumbs.</em></div>
<div id="green"><div class="leaf" style="width:760px;height:760px;right:-260px;top:-180px"></div>
  <div class="leaf" style="width:420px;height:420px;left:-150px;bottom:-120px;transform:rotate(180deg)"></div>
  <div class="t" id="own">Get your<br>own <em>bread.</em></div>
  <div id="end"><div class="big">Earned.</div><div class="mark"><img src="{LOGO}">gigotter.com</div><div class="sub">Real gigs. Paid to mobile money.</div></div></div>
</div>
<script>
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)]
const clamp = (x) => Math.max(0, Math.min(1, x))
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3)
const span = (t, a, b) => (t - a) / (b - a)
const show = (el, t, a, b, f = .3) => {{ const k = ease(span(t, a, a + f)) * (1 - ease(span(t, b - f, b))); el.style.opacity = k; return k }}
const P = {[[t, z] for (_, t, z) in PUNCHES]}
window.render = (t) => {{
  // the scene fades in and drifts slowly; each label lands with a quick punch-in
  $('#dim').style.opacity = 1 - ease(span(t, 0, .8))
  let z = 1 + .04 * clamp(span(t, 0, 4)), prev = 1.04
  for (const [pt, pz] of P) {{ if (t >= pt) {{ z = prev + (pz - prev) * ease(span(t, pt, pt + .18)) + .02 * clamp(span(t, pt, pt + 1)) }} prev = pz }}
  if (t >= 7.0) z = 1.52 - .38 * ease(span(t, 7.0, 7.6))                  // pull back out for the big line
  const shake = P.some(([pt]) => t > pt && t < pt + .15) ? Math.sin(t * 160) * 8 : 0
  $('#photo').style.transform = `translateX(${{shake}}px) scale(${{z}})`
  // opening line, word by word
  show($('#l1'), t, .4, 3.9, .3)
  $$('#l1 .w').forEach((w, i) => {{ const k = ease(span(t, .5 + i * .22, .85 + i * .22)); w.style.opacity = k; w.style.transform = `translateY(${{(1 - k) * 36}}px)` }})
  // the three labels
  P.forEach(([pt], i) => {{ const el = $('#lab' + i); const k = show(el, t, pt, i < 2 ? P[i + 1][0] : 7.0, .12); el.style.transform = `scale(${{1 + .18 * (1 - ease(span(t, pt, pt + .2)))}})`; el.style.transformOrigin = 'left top' }})
  // the line from the post
  show($('#big'), t, 7.4, 10.1, .3); $('#big').style.transform = `translateY(${{(1 - ease(span(t, 7.4, 7.8))) * 50}}px)`
  // the turn
  $('#green').style.opacity = ease(span(t, 10.0, 10.45))
  show($('#own'), t, 10.3, 11.75, .3)
  const e = ease(span(t, 11.7, 12.3)); $('#end').style.opacity = e; $('#end').style.transform = `scale(${{1.06 - .06 * e}})`
  $('#end .mark').style.opacity = ease(span(t, 12.2, 12.7)); $('#end .sub').style.opacity = ease(span(t, 12.5, 13))
}}
render(0)
</script></body></html>'''
pathlib.Path(sys.argv[2]).write_text(html)
print('wrote', sys.argv[2])
