"""Gigotter TikTok video kit: one photo, timed captions, a green "turn" line and the "Earned." sign-off, with original sound.
A video is a small Python file that calls make(...). Example: python3 goldfish.py PHOTO.jpg OUTDIR
Writes OUTDIR/page.html (frame-exact render(t)), then renders frames with render.cjs and encodes OUTDIR/<name>.mp4 + cover.png.
1080x1920, 30 fps. Text stays clear of TikTok's top bar, side buttons and caption area."""
import base64, json, pathlib, subprocess

HERE = pathlib.Path(__file__).resolve().parent
FONTS = pathlib.Path('/tmp/claude-0/-home-user/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/fonts2')
LOGO_PATH = pathlib.Path('/home/user/wemove/public/logo-mark.png')
GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
OUTRO_AT = 10.0   # green screen; the turn line shows 10.3-11.75, "Earned." from 11.7
DUR = 13.5

def b64(p, mime): return f'data:{mime};base64,' + base64.b64encode(pathlib.Path(p).read_bytes()).decode()

def page(photo, intro, captions, turn, pos='50% 50%', origin='50% 50%', zoom=((0, 1.0), (DUR, 1.1)), bob=0, shakes=(), light=False, shade='both', shift=0, ground=None):
    # shift: move the photo down this many px, fading its top edge into `ground` (a colour sampled from the photo)
    ON, IT = FONTS / 'fontsource-onest-5.1.0/package/files', FONTS / 'fontsource-inter-tight-5.1.0/package/files'
    faces = ''.join(f"@font-face {{ font-family: 'Onest'; font-weight: {w}; src: url('{b64(ON / f'onest-latin-{w}-normal.woff', 'font/woff')}'); }}" for w in (500, 600, 700)) + \
            ''.join(f"@font-face {{ font-family: 'Tight'; font-weight: {w}; src: url('{b64(IT / f'inter-tight-latin-{w}-normal.woff', 'font/woff')}'); }}" for w in (400, 500))
    ink, acc = ('#131317', '#245A44') if light else ('#fff', '#B7CDBE')
    shades = {'top': 'linear-gradient(180deg, rgba(0,0,0,.8), rgba(0,0,0,.5) 26%, rgba(0,0,0,0) 46%)',
              'bottom': 'linear-gradient(0deg, rgba(8,22,16,.9), rgba(8,22,16,.55) 30%, rgba(8,22,16,0) 52%)'}
    shade_css = 'none' if light else ', '.join(shades[k] for k in (['top', 'bottom'] if shade == 'both' else [shade]))
    caps = ''
    for i, c in enumerate(captions):
        style = c.get('style', 'line'); place = c.get('place', 'top')
        caps += f'<div class="t cap {style} {place}" id="c{i}">{c["text"]}</div>'
    # photo=None: a transparent caption layer, composited over video footage by footage.py
    photo_tag = f'<img id="photo" src="{b64(photo, "image/jpeg")}">' if photo else '<div id="photo"></div>'
    cfg = {'captions': [[c['at'], c['until']] for c in captions], 'zoom': [list(z) for z in zoom], 'bob': bob, 'shakes': list(shakes), 'introEnd': intro[1]}
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{faces}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ width: 1080px; height: 1920px; overflow: hidden; background: {'#000' if photo else 'transparent'}; font-family: Tight, sans-serif; color: #fff; }}
#stage {{ position: absolute; inset: 0; overflow: hidden; background: {(ground or ('#F3F5F1' if light else '#000')) if photo else 'transparent'}; }}
#photo {{ position: absolute; inset: -40px 0; width: 100%; height: calc(100% + 80px); object-fit: cover; object-position: {pos}; transform-origin: {origin}; {f'top: {shift - 40}px; -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 260px); mask-image: linear-gradient(180deg, transparent 0, #000 260px);' if shift else ''} }}
#shade {{ position: absolute; inset: 0; background: {shade_css}; }}
#black {{ position: absolute; inset: 0; background: #000; }}
.t {{ position: absolute; left: 84px; right: 170px; }}
.top {{ top: 250px; }} .bottom {{ bottom: 470px; }} .mid {{ top: 760px; }}
#intro {{ top: 760px; font: 600 84px/1.06 Onest; letter-spacing: -0.04em; color: #fff; }}
#intro em {{ font-style: normal; color: #B7CDBE; }}
.cap.line {{ font: 700 104px/0.98 Onest; letter-spacing: -0.05em; color: {ink}; }}
.cap.big {{ font: 700 140px/0.93 Onest; letter-spacing: -0.055em; color: {ink}; }}
.cap em {{ font-style: normal; color: {acc}; }}
.cap.pill {{ right: auto; background: #F3F5F1; color: #131317; font: 700 66px/1.12 Onest; letter-spacing: -0.035em; padding: 16px 28px 20px; border-radius: 22px; box-shadow: 0 18px 40px -16px rgba(0,0,0,.5); transform-origin: left top; max-width: 826px; }}
.cap.pill small {{ display: block; font: 500 38px Tight; letter-spacing: 0; color: #5C625E; margin-bottom: 4px; }}
.light .cap.pill {{ background: #10291F; color: #fff; }} .light .cap.pill small {{ color: #B7CDBE; }}
#green {{ position: absolute; inset: 0; background: radial-gradient(90% 60% at 50% 30%, #1C4635 0%, #10291F 70%); }}
#green::after {{ content: ''; position: absolute; inset: 0; opacity: .07; mix-blend-mode: overlay; background-image: {GRAIN}; }}
.leaf {{ position: absolute; border-radius: 999px 999px 0 999px; border: 2px solid rgba(255,255,255,.06); background: linear-gradient(155deg, rgba(255,255,255,.05), rgba(255,255,255,0) 70%); }}
#turn {{ top: 760px; font: 700 132px/0.95 Onest; letter-spacing: -0.05em; }}
#turn em {{ font-style: normal; color: #B7CDBE; }}
#end {{ position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-bottom: 260px; }}
#end .big {{ font: 700 230px/1 Onest; letter-spacing: -0.06em; color: #B7CDBE; }}
#end .mark {{ margin-top: 40px; display: flex; align-items: center; gap: 18px; font: 500 40px Tight; color: rgba(255,255,255,.85); }}
#end .mark img {{ width: 84px; height: 84px; }}
#end .sub {{ margin-top: 26px; font: 400 34px Tight; color: rgba(255,255,255,.6); }}
</style></head><body><div id="stage" class="{'light' if light else ''}">
{photo_tag}<div id="shade"></div>
{caps}
<div id="black"></div><div class="t" id="intro">{intro[0]}</div>
<div id="green"><div class="leaf" style="width:760px;height:760px;right:-260px;top:-180px"></div>
  <div class="leaf" style="width:420px;height:420px;left:-150px;bottom:-120px;transform:rotate(180deg)"></div>
  <div class="t" id="turn">{turn}</div>
  <div id="end"><div class="big">Earned.</div><div class="mark"><img src="{b64(LOGO_PATH, 'image/png')}">gigotter.com</div><div class="sub">Real gigs. Paid to mobile money.</div></div></div>
</div>
<script>
const C = {json.dumps(cfg)}
const $ = (s) => document.querySelector(s)
const clamp = (x) => Math.max(0, Math.min(1, x))
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3)
const span = (t, a, b) => (t - a) / (b - a)
const show = (el, t, a, b, f = .25) => {{ const k = ease(span(t, a, a + f)) * (1 - ease(span(t, b - f, b))); el.style.opacity = k; return k }}
function zoomAt(t) {{  // piecewise: each step eases quickly into its value, so a step reads as a punch-in
  const Z = C.zoom; let z = Z[0][1]
  for (let i = 1; i < Z.length; i++) {{ const [t0, z0] = Z[i - 1], [t1, z1] = Z[i]; if (t >= t0) z = z0 + (z1 - z0) * (t1 - t0 < .5 ? ease(span(t, t0, t1)) : clamp(span(t, t0, t1))) }}
  return z
}}
window.render = (t) => {{
  show($('#intro'), t, .1, C.introEnd, .3); $('#intro').style.transform = `translateY(${{(1 - ease(span(t, .1, .5))) * 30}}px)`
  $('#black').style.opacity = 1 - ease(span(t, C.introEnd - .2, C.introEnd + .5))
  const shake = C.shakes.some((s) => t > s && t < s + .16) ? Math.sin(t * 170) * 9 : 0
  const bob = C.bob ? Math.sin(t * 2.2) * C.bob : 0
  $('#photo').style.transform = `translate(${{shake}}px, ${{bob}}px) scale(${{zoomAt(t)}})`
  C.captions.forEach(([a, b], i) => {{
    const el = $('#c' + i), pill = el.classList.contains('pill')
    const k = show(el, t, a, b, pill ? .12 : .28)
    el.style.transform = pill ? `scale(${{1 + .16 * (1 - ease(span(t, a, a + .2)))}})` : `translateY(${{(1 - ease(span(t, a, a + .4))) * 40}}px)`
  }})
  $('#green').style.opacity = ease(span(t, {OUTRO_AT}, {OUTRO_AT + .45}))
  show($('#turn'), t, {OUTRO_AT + .3}, 11.75, .3)
  const e = ease(span(t, 11.7, 12.3)); $('#end').style.opacity = e; $('#end').style.transform = `scale(${{1.06 - .06 * e}})`
  $('#end .mark').style.opacity = ease(span(t, 12.2, 12.7)); $('#end .sub').style.opacity = ease(span(t, 12.5, 13))
}}
render(0)
</script></body></html>'''

# ---------- sound: each event is (kind, seconds[, frequency]) ----------
def _src(kind, f=None):
    return {
        'tick': ('sine=f=2200:d=0.06', 'afade=t=out:st=0.005:d=0.05,volume=2.2'),
        'pop': (f'sine=f={f or 990}:d=0.12', 'afade=t=in:d=0.004,afade=t=out:st=0.01:d=0.08,volume=2.4'),
        'thud': ('sine=f=85:d=0.3', 'afade=t=in:d=0.005,afade=t=out:st=0.03:d=0.22,volume=3.2'),
        'dun': (f'sine=f={f or 147}:d=0.7', 'afade=t=in:d=0.01,afade=t=out:st=0.15:d=0.5,volume=3.0'),
        'bonk': ('sine=f=150:d=0.5', 'afade=t=in:d=0.01,afade=t=out:st=0.08:d=0.4,volume=2.6'),
        'bubble': ("aevalsrc='0.6*sin(2*PI*(500+2600*t)*t)':d=0.09", 'afade=t=in:d=0.005,afade=t=out:st=0.02:d=0.06,volume=1.6'),
        'chime1': ('sine=f=1318.5:d=0.35', 'afade=t=out:st=0.05:d=0.3,volume=3'),
        'chime2': ('sine=f=1760:d=0.6', 'afade=t=out:st=0.08:d=0.5,volume=2.7'),
    }[kind]

AMBIENCE = {
    'water': ('anoisesrc=color=brown:amplitude=0.05:d=13.5', 'lowpass=f=500,tremolo=f=0.6:d=0.5,afade=t=in:d=1,afade=t=out:st=9.6:d=0.5,volume=1.4'),
    'room': ('anoisesrc=color=pink:amplitude=0.012:d=13.5', 'afade=t=out:st=9.8:d=0.4'),
    'outdoor': ('anoisesrc=color=brown:amplitude=0.03:d=13.5', 'lowpass=f=700,afade=t=in:d=0.8,afade=t=out:st=9.6:d=0.5,volume=1.5'),
}

def sound(events, ambience, out):
    events = list(events) + [('chime1', 11.7), ('chime2', 11.85)]
    args, chains, labels = [], [], []
    if ambience:
        src, flt = AMBIENCE[ambience]; args += ['-f', 'lavfi', '-i', src]; chains.append(f'[0]{flt}[amb]'); labels.append('[amb]')
    for e in events:
        kind, at = e[0], e[1]; src, flt = _src(kind, e[2] if len(e) > 2 else None)
        n = len(args) // 4; ms = int(at * 1000)
        args += ['-f', 'lavfi', '-i', src]; chains.append(f'[{n}]{flt},adelay={ms}|{ms}[e{n}]'); labels.append(f'[e{n}]')
    fc = ';'.join(chains) + f';{"".join(labels)}amix=inputs={len(labels)}:normalize=0,alimiter=limit=0.8,apad=whole_dur={DUR},atrim=0:{DUR}[out]'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args, '-filter_complex', fc, '-map', '[out]', '-ar', '44100', '-ac', '2', str(out)], check=True)

def make(name, photo, outdir, *, intro, captions, turn, sounds=(), ambience='room', cover_at=8.5, frames=True, **look):
    out = pathlib.Path(outdir); out.mkdir(parents=True, exist_ok=True)
    (out / 'page.html').write_text(page(photo, intro, captions, turn, **look))
    if not frames: return out / 'page.html'
    fd = out / 'frames'; fd.mkdir(exist_ok=True)
    subprocess.run(['node', str(HERE / 'render.cjs'), str(out / 'page.html'), str(fd), '30', str(DUR)], check=True)
    sound(sounds, ambience, fd / 'sound.wav')
    mp4 = out / f'{name}.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', str(fd / 'f%04d.png'), '-i', str(fd / 'sound.wav'),
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
                    '-c:a', 'aac', '-b:a', '160k', '-shortest', str(mp4)], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(cover_at), '-i', str(mp4), '-frames:v', '1', str(out / 'cover.png')], check=True)
    return mp4
