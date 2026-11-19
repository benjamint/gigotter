"""TikTok video of the fridge post: 1080x1920, 13.5 s, 30 fps.
usage: python3 build.py FRIDGE.jpg OUT.html  ->  node render.cjs OUT.html FRAMEDIR  ->  ./encode.sh FRAMEDIR OUT.mp4
FRIDGE.jpg is Pexels 4058699 with its badge painted out (see ../README.md). The page exposes render(t) for exact frames."""
import base64, json, pathlib, sys
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')
def b64(p, mime): return f'data:{mime};base64,' + base64.b64encode(pathlib.Path(p).read_bytes()).decode()
ON, IT = FONTS / 'fontsource-onest-5.1.0/package/files', FONTS / 'fontsource-inter-tight-5.1.0/package/files'
faces = ''.join(f"@font-face {{ font-family: 'Onest'; font-weight: {w}; src: url('{b64(ON / f'onest-latin-{w}-normal.woff', 'font/woff')}'); }}" for w in (500, 600, 700)) + \
        ''.join(f"@font-face {{ font-family: 'Tight'; font-weight: {w}; src: url('{b64(IT / f'inter-tight-latin-{w}-normal.woff', 'font/woff')}'); }}" for w in (400, 500))
PHOTO = b64(sys.argv[1], 'image/jpeg')
LOGO = b64('/home/user/wemove/public/logo-mark.png', 'image/png')
GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
# label text, time it pops, the item on the photo (frame coords at zoom 1), where the label sits
LABELS = [('1 milk.', 2.9, (520, 905), (84, 1240)), ('A jar of… something.', 4.2, (630, 385), (84, 560)), ('Hope.', 5.5, (770, 660), (500, 800))]

labels = ''.join(f'<div class="lab" id="lab{i}" style="left:{px}px;top:{py}px">{e}</div>' for i, (e, _, _, (px, py)) in enumerate(LABELS))
html = f'''<!doctype html><html><head><meta charset="utf-8"><style>{faces}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ width: 1080px; height: 1920px; overflow: hidden; background: #000; font-family: Tight, sans-serif; color: #fff; }}
#stage {{ position: absolute; inset: 0; overflow: hidden; background: #000; }}
#photo {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 55%; transform-origin: 540px 700px; }}
#shade {{ position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.88), rgba(0,0,0,.78) 30%, rgba(0,0,0,.4) 48%, rgba(0,0,0,0) 64%); }}
#flash {{ position: absolute; inset: 0; background: radial-gradient(80% 60% at 60% 40%, #FFFFFF, #CFE6FF 60%, #7FB2E8); }}
#black {{ position: absolute; inset: 0; background: #000; }}
svg {{ position: absolute; inset: 0; }}
.lab {{ position: absolute; background: #10291F; color: #fff; font: 600 56px/1.1 Onest; letter-spacing: -0.03em; padding: 14px 26px 18px; border-radius: 22px; box-shadow: 0 18px 40px -16px rgba(0,0,0,.6); white-space: nowrap; transform-origin: left center; }}
.t {{ position: absolute; left: 84px; right: 170px; }}
#pov {{ top: 760px; font: 600 80px/1.08 Onest; letter-spacing: -0.04em; }}
#pov i {{ font-style: italic; color: #B7CDBE; }}
#line {{ top: 250px; font: 700 118px/0.95 Onest; letter-spacing: -0.05em; }}
#line em {{ font-style: normal; color: #B7CDBE; }}
#green {{ position: absolute; inset: 0; background: radial-gradient(90% 60% at 50% 30%, #1C4635 0%, #10291F 70%); }}
#green::after {{ content: ''; position: absolute; inset: 0; opacity: .07; mix-blend-mode: overlay; background-image: {GRAIN}; }}
.leaf {{ position: absolute; border-radius: 999px 999px 0 999px; border: 2px solid rgba(255,255,255,.06); background: linear-gradient(155deg, rgba(255,255,255,.05), rgba(255,255,255,0) 70%); }}
#so {{ top: 780px; font: 700 160px/0.95 Onest; letter-spacing: -0.055em; }}
#so em {{ font-style: normal; color: #B7CDBE; }}
#end {{ position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 260px; }}
#end .big {{ font: 700 230px/1 Onest; letter-spacing: -0.06em; color: #B7CDBE; }}
#end .mark {{ margin-top: 40px; display: flex; align-items: center; gap: 18px; font: 500 40px Tight; color: rgba(255,255,255,.85); }}
#end .mark img {{ width: 84px; height: 84px; }}
#end .sub {{ margin-top: 26px; font: 400 34px Tight; color: rgba(255,255,255,.6); }}
</style></head><body><div id="stage">
<img id="photo" src="{PHOTO}"><div id="shade"></div>
<svg width="1080" height="1920"><g id="links" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"></g><g id="dots"></g></svg>
{labels}
<div class="t" id="line">This fridge<br><em>deserves<br>better.</em></div>
<div id="flash"></div><div id="black"></div>
<div class="t" id="pov">POV: it’s 11pm and you’re <i>“just checking”</i></div>
<div id="green"><div class="leaf" style="width:760px;height:760px;right:-260px;top:-180px"></div>
  <div class="leaf" style="width:420px;height:420px;left:-150px;bottom:-120px;transform:rotate(180deg)"></div>
  <div class="t" id="so">So<br>do <em>you.</em></div>
  <div id="end"><div class="big">Earned.</div><div class="mark"><img src="{LOGO}">gigotter.com</div><div class="sub">Real gigs. Paid to mobile money.</div></div></div>
</div>
<script>
const $ = (s) => document.querySelector(s)
const clamp = (x) => Math.max(0, Math.min(1, x))
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3)
const span = (t, a, b) => (t - a) / (b - a)
const show = (el, t, a, b, f = .3) => {{ const k = ease(span(t, a, a + f)) * (1 - ease(span(t, b - f, b))); el.style.opacity = k; return k }}
const L = {json.dumps([[lt, list(item), list(pos)] for (_, lt, item, pos) in LABELS])}
const O = [540, 700]
window.render = (t) => {{
  // opening line on black
  show($('#pov'), t, .1, 1.6, .3)
  // door opens at 1.6: black gives way to a cold flash, which settles into the photo
  $('#black').style.opacity = t < 1.6 ? 1 : (t < 9.8 ? 0 : 1)
  $('#flash').style.opacity = t < 1.6 ? 0 : 1 - ease(span(t, 1.62, 2.4))
  const z = 1 + .1 * clamp(span(t, 1.6, 9.8)); $('#photo').style.transform = `scale(${{z}})`
  // the inventory: labels pop in, each with a line to its item; all clear at 6.9
  let links = '', dots = ''
  L.forEach(([lt, [ix, iy], [px, py]], i) => {{
    const el = $('#lab' + i), k = show(el, t, lt, 6.9, .14)
    el.style.transform = `scale(${{1 + .2 * (1 - ease(span(t, lt, lt + .22)))}})`
    if (k <= 0) return
    const sx = O[0] + (ix - O[0]) * z, sy = O[1] + (iy - O[1]) * z
    const r = el.getBoundingClientRect(), ax = Math.min(Math.max(sx, r.left + 30), r.right - 30), ay = sy < r.top ? r.top : r.bottom
    links += `<line x1="${{ax}}" y1="${{ay}}" x2="${{sx}}" y2="${{sy}}" opacity="${{k}}"/>`
    dots += `<circle cx="${{sx}}" cy="${{sy}}" r="12" fill="#B7CDBE" stroke="#10291F" stroke-width="5" opacity="${{k}}"/>`
  }})
  $('#links').innerHTML = links; $('#dots').innerHTML = dots
  // the line from the post, over a darker top
  $('#shade').style.opacity = ease(span(t, 6.9, 7.3))
  show($('#line'), t, 7.0, 9.7, .3); $('#line').style.transform = `translateY(${{(1 - ease(span(t, 7.0, 7.4))) * 40}}px)`
  // door shuts at 9.8, then the turn
  $('#green').style.opacity = ease(span(t, 10.15, 10.5))
  show($('#so'), t, 10.3, 11.75, .3)
  const e = ease(span(t, 11.7, 12.3)); $('#end').style.opacity = e; $('#end').style.transform = `scale(${{1.06 - .06 * e}})`
  $('#end .mark').style.opacity = ease(span(t, 12.2, 12.7)); $('#end .sub').style.opacity = ease(span(t, 12.5, 13))
}}
render(0)
</script></body></html>'''
pathlib.Path(sys.argv[2]).write_text(html)
print('wrote', sys.argv[2])
