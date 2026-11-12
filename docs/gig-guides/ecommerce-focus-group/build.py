"""Participant info sheet for the e-commerce design thinking focus group (1080x1350). usage: python3 build.py OUT.html"""
import base64, json, pathlib, sys

HERE = pathlib.Path(__file__).parent
FONTS = pathlib.Path('/tmp/claude-0/-workspace/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/qr/fonts')
I = json.load(open(HERE / 'icons.json'))
LOGO = 'data:image/png;base64,' + base64.b64encode(pathlib.Path('/home/user/wemove/public/logo-mark.png').read_bytes()).decode()
def font(p): return 'data:font/woff;base64,' + base64.b64encode((FONTS / p).read_bytes()).decode()
def ic(n, s=34): return I[n].replace('width="24" height="24"', f'width="{s}" height="{s}"')

css = f"""
@font-face {{ font-family: 'GSerif'; font-style: italic; src: url('{font('fontsource-instrument-serif-5.1.0/files/instrument-serif-latin-400-italic.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 400; src: url('{font('fontsource-inter-5.1.0/files/inter-latin-400-normal.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 600; src: url('{font('fontsource-inter-5.1.0/files/inter-latin-600-normal.woff')}'); }}
@font-face {{ font-family: 'Tight'; font-weight: 700; src: url('{font('fontsource-inter-tight-5.1.0/files/inter-tight-latin-700-normal.woff')}'); }}
@page {{ size: 1080px 1350px; margin: 0; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: Inter, sans-serif; color: #15171A; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.s {{ width: 1080px; height: 1350px; position: relative; overflow: hidden; background: #F7F6F2; display: flex; flex-direction: column; }}
h1, h2, h3 {{ font-family: Tight; font-weight: 700; letter-spacing: -0.035em; line-height: 1.02; }}
.em {{ font-family: GSerif; font-style: italic; font-weight: 400; letter-spacing: -0.01em; }}
.eyebrow {{ font: 600 22px Inter; letter-spacing: .16em; text-transform: uppercase; }}
.ic {{ width: 62px; height: 62px; border-radius: 18px; display: grid; place-items: center; background: #EEF3EF; color: #245A44; flex: none; }}
"""

def fact(icon, k, v):
    return f'<div style="display:flex;gap:18px;align-items:center"><span class="ic" style="background:rgba(255,255,255,.1);color:#B7CDBE">{ic(icon, 30)}</span><div><div style="font:600 19px Inter;letter-spacing:.12em;text-transform:uppercase;color:#B7CDBE">{k}</div><div style="margin-top:4px;font:700 32px Tight;letter-spacing:-0.02em;color:#fff">{v}</div></div></div>'

def item(icon, title, body):
    return f'<div style="display:flex;gap:20px;align-items:flex-start"><span class="ic">{ic(icon, 30)}</span><div><h3 style="font-size:30px">{title}</h3><p style="margin-top:5px;font-size:21px;line-height:1.4;color:#5C6066">{body}</p></div></div>'

def step(n, title, body):
    return f'<div style="display:flex;gap:18px;align-items:flex-start"><span style="width:46px;height:46px;border-radius:50%;background:#15171A;color:#fff;font:700 22px Tight;display:grid;place-items:center;flex:none">{n}</span><div><b style="display:block;font-size:24px">{title}</b><span style="font-size:21px;line-height:1.4;color:#5C6066">{body}</span></div></div>'

html = f"""<!doctype html><html><head><meta charset='utf-8'><title>E-commerce focus group: participant info</title><style>{css}</style></head><body>
<section class="s">
  <div style="background:#10291F;color:#fff;padding:52px 72px 46px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:16px"><img src="{LOGO}" style="width:62px;height:62px"><span style="font:700 34px Tight;letter-spacing:-0.03em">Gigotter</span></div>
      <span class="eyebrow" style="color:#B7CDBE;font-size:20px;padding:12px 22px;border:2px solid rgba(255,255,255,.2);border-radius:999px">Participant info</span>
    </div>
    <div class="eyebrow" style="margin-top:38px;color:#B7CDBE">E-commerce focus group</div>
    <h1 style="margin-top:12px;font-size:72px;color:#fff">How do you <span class="em" style="color:#B7CDBE">shop online?</span></h1>
    <p style="margin-top:14px;font-size:25px;line-height:1.42;color:rgba(255,255,255,.75);max-width:860px">A 2-hour, hands-on design thinking session. Share your real experiences of buying online and help shape a better shopping experience.</p>
    <div style="margin-top:34px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
      {fact('CalendarDays', 'Date', 'Thu 3 Dec')}
      {fact('Clock', 'Time', '10am – 12pm')}
      {fact('MapPin', 'Where', 'Buro Hub, Osu')}
    </div>
  </div>

  <div style="padding:40px 72px 30px;display:grid;grid-template-columns:1.08fr .92fr;gap:52px">
    <div>
      <div class="eyebrow" style="color:#2F6B52">What you’ll do</div>
      <div style="margin-top:22px;display:grid;gap:22px">
        {item('ShoppingCart', 'Talk about how you shop', 'Where you buy, how you pay, and who you trust.')}
        {item('MessagesSquare', 'Share what frustrates you', 'Delivery, returns, payments, fake products: no wrong answers.')}
        {item('PenLine', 'Sketch simple ideas', 'In small groups. No design or drawing skills needed.')}
        {item('Lightbulb', 'React to early concepts', 'Tell the team honestly what works and what doesn’t.')}
      </div>
    </div>
    <div>
      <div class="eyebrow" style="color:#2F6B52">On the day</div>
      <div style="margin-top:22px;display:grid;gap:20px">
        {step(1, 'Arrive by 9:50am', 'Bring your phone, charged. Refreshments provided.')}
        {step(2, 'Stay for the full 2 hours', 'Latecomers may not be able to join.')}
        {step(3, 'Check in on Gigotter', 'Add a photo from the session and a short report, the same day.')}
        {step(4, 'Get paid', 'To your mobile money once your check-in is approved.')}
      </div>
    </div>
  </div>

  <div style="margin:auto 72px 0;padding:24px 30px;border-radius:28px;background:#fff;border:2px solid #E4E1D8;display:flex;gap:22px;align-items:center">
    <span class="ic">{ic('ShieldCheck', 30)}</span>
    <p style="font-size:22px;line-height:1.45;color:#5C6066"><b style="color:#15171A">Your privacy:</b> what you share is used only to improve the product. Nothing you say is published with your name. Questions or can’t make it? Email <b style="color:#15171A">hello@gigotter.com</b></p>
  </div>
  <div style="margin:18px 72px 40px;display:flex;justify-content:space-between;font-size:19px;color:#6B7077"><span>Selected participants only · please don’t bring friends along</span><span>gigotter.com</span></div>
</section></body></html>"""
pathlib.Path(sys.argv[1]).write_text(html)
