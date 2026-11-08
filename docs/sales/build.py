"""Gigotter one-page sales flyer for businesses (A4 portrait). usage: python3 build.py OUT.html"""
import base64, json, pathlib, sys

HERE = pathlib.Path(__file__).parent
FONTS = pathlib.Path('/tmp/claude-0/-workspace/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/qr/fonts')
PUB = pathlib.Path('/home/user/wemove/public')
I = json.load(open(HERE / 'icons.json'))
def font(p): return 'data:font/woff;base64,' + base64.b64encode((FONTS / p).read_bytes()).decode()
def img(p, kind='jpeg'): return f'data:image/{kind};base64,' + base64.b64encode(pathlib.Path(p).read_bytes()).decode()
def ic(name, size='5mm'): return I[name].replace('width="24" height="24"', f'width="24" height="24" style="width:{size};height:{size}"')

LOGO, QR, PHOTO = img(PUB / 'logo-mark.png', 'png'), img(HERE / 'qr.png', 'png'), img(PUB / 'images/business.jpg')

css = f"""
@font-face {{ font-family: 'GSerif'; font-style: italic; src: url('{font('fontsource-instrument-serif-5.1.0/files/instrument-serif-latin-400-italic.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 400; src: url('{font('fontsource-inter-5.1.0/files/inter-latin-400-normal.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 600; src: url('{font('fontsource-inter-5.1.0/files/inter-latin-600-normal.woff')}'); }}
@font-face {{ font-family: 'Tight'; font-weight: 700; src: url('{font('fontsource-inter-tight-5.1.0/files/inter-tight-latin-700-normal.woff')}'); }}
@page {{ size: A4; margin: 0; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: Inter, sans-serif; color: #15171A; font-size: 9.4pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #ccc; }}
.page {{ width: 210mm; height: 297mm; background: #F7F6F2; position: relative; overflow: hidden; display: flex; flex-direction: column; }}
h1, h2, h3 {{ font-family: Tight; font-weight: 700; letter-spacing: -0.03em; line-height: 1.02; }}
.em {{ font-family: GSerif; font-style: italic; font-weight: 400; letter-spacing: -0.01em; }}
.eyebrow {{ font: 600 7.2pt Inter; letter-spacing: .16em; text-transform: uppercase; color: #2F6B52; }}
.pad {{ padding: 0 14mm; }}
.ic {{ width: 9.5mm; height: 9.5mm; border-radius: 3mm; display: grid; place-items: center; background: #EEF3EF; color: #245A44; flex: none; }}
.card {{ background: #fff; border: 1px solid #E4E1D8; border-radius: 4mm; }}
"""

hero = f"""
<div style="display:grid;grid-template-columns:1.15fr .85fr;background:#10291F;color:#fff">
  <div style="padding:10mm 10mm 9mm 14mm;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:2.5mm"><img src="{LOGO}" style="width:11mm;height:11mm"><span style="font:700 16pt Tight;letter-spacing:-0.02em">Gigotter</span><span style="margin-left:2mm;padding:1mm 2.6mm;border-radius:99px;border:1px solid rgba(255,255,255,.25);font:600 6.8pt Inter;letter-spacing:.12em;text-transform:uppercase;color:#B7CDBE">For businesses</span></div>
    <h1 style="margin-top:7mm;font-size:27pt;color:#fff">Verified students.<br><span class="em" style="color:#B7CDBE">Real results</span> on the ground.</h1>
    <p style="margin-top:4mm;font-size:10pt;line-height:1.5;color:rgba(255,255,255,.75);max-width:96mm">Need customers signed up, a market surveyed or an app tested? Gigotter sends ID-verified university students to do it, with photo and location proof you can check. You only pay for work you approve.</p>
  </div>
  <div style="position:relative;min-height:70mm"><img src="{PHOTO}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><div style="position:absolute;inset:0;background:linear-gradient(90deg,#10291F 0%,rgba(16,41,31,0) 35%)"></div></div>
</div>"""

def svc(icon, title, body):
    return f'<div class="card" style="padding:3.6mm;display:flex;gap:3mm;align-items:flex-start"><span class="ic" style="width:8.5mm;height:8.5mm">{ic(icon, "4.6mm")}</span><div><h3 style="font-size:10.4pt">{title}</h3><p style="margin-top:.8mm;color:#6B7077;font-size:8.4pt;line-height:1.4">{body}</p></div></div>'

services = f"""
<div class="pad" style="margin-top:7mm">
  <div class="eyebrow">What students can do for you</div>
  <div style="margin-top:3.5mm;display:grid;grid-template-columns:repeat(3,1fr);gap:3mm">
    {svc('Handshake', 'Customer onboarding', 'Sign up shops, vendors or users for your product, in person.')}
    {svc('ClipboardList', 'Surveys', 'Responses from the right people, on campus or in the community.')}
    {svc('MessagesSquare', 'Focus groups', 'Recruit and run sessions with your target customers.')}
    {svc('Search', 'Field research', 'Prices, stock and shelf checks in markets and shops.')}
    {svc('Smartphone', 'App testing', 'Real users try your app and report what works.')}
    {svc('Megaphone', 'Activations & errands', 'Sampling, flyer drops, campus drives and deliveries.')}
  </div>
</div>"""

def step(n, title, body):
    return f'<div style="display:flex;gap:3mm"><span style="width:7mm;height:7mm;border-radius:50%;background:#15171A;color:#fff;font:700 8.5pt Tight;display:grid;place-items:center;flex:none">{n}</span><div><b style="display:block;font-size:9.6pt">{title}</b><span style="color:#6B7077;font-size:8.6pt">{body}</span></div></div>'

def why(icon, title, body):
    return f'<div style="display:flex;gap:3mm;align-items:flex-start"><span class="ic" style="width:8mm;height:8mm;border-radius:2.5mm">{ic(icon, "4.4mm")}</span><div><b style="display:block;font-size:9.6pt">{title}</b><span style="color:#6B7077;font-size:8.6pt">{body}</span></div></div>'

middle = f"""
<div class="pad" style="margin-top:7mm;display:grid;grid-template-columns:1fr 1fr;gap:8mm">
  <div>
    <div class="eyebrow">How it works</div>
    <div style="margin-top:3.5mm;display:grid;gap:2.8mm">
      {step(1, 'Send us a brief', 'What you need, where, by when and your budget.')}
      {step(2, 'We scope it and post the gig', 'Clear instructions and exactly what proof to collect.')}
      {step(3, 'Verified students deliver', 'Each result comes with the proof you asked for.')}
      {step(4, 'Approve and pay for results', 'Review every entry. Reject anything that misses the brief.')}
    </div>
  </div>
  <div>
    <div class="eyebrow">Why Gigotter</div>
    <div style="margin-top:3.5mm;display:grid;gap:2.8mm">
      {why('ShieldCheck', 'Every student is verified', 'Student ID, national ID and a selfie, checked by our team.')}
      {why('Camera', 'Proof you can check', 'Photos, GPS pins and timestamps, set for each gig.')}
      {why('BadgeCheck', 'Pay only for approved work', 'Per result or a fixed budget. No retainers.')}
      {why('FileSpreadsheet', 'Clean data, ready to use', 'Download every response as a spreadsheet.')}
    </div>
  </div>
</div>"""

cta = f"""
<div class="pad" style="margin-top:auto;padding-top:6mm;margin-bottom:9mm">
  <div style="border-radius:5mm;background:#fff;border:1px solid #E4E1D8;display:grid;grid-template-columns:1fr auto;overflow:hidden">
    <div style="padding:7mm 8mm">
      <div class="eyebrow">Start small</div>
      <h2 style="margin-top:2mm;font-size:19pt">Try a pilot. <span class="em" style="color:#245A44">Pay only for results.</span></h2>
      <p style="margin-top:2.5mm;color:#6B7077;font-size:9.2pt;max-width:100mm">Tell us about one task, like 50 survey responses or 20 business sign-ups, and see the quality before you scale.</p>
      <div style="margin-top:4.5mm;display:flex;flex-wrap:wrap;gap:2.5mm 6mm;font:600 9.6pt Inter">
        <span style="display:flex;align-items:center;gap:1.6mm">{ic('ArrowRight', '4mm')}gigotter.com/brief</span>
        <span style="display:flex;align-items:center;gap:1.6mm;color:#6B7077">hello@gigotter.com</span>
      </div>
    </div>
    <div style="background:#EFECE4;padding:5.5mm 6.5mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm">
      <img src="{QR}" style="width:33mm;height:33mm;border-radius:2.5mm">
      <span style="font:600 7.6pt Inter;color:#15171A">Scan to post a brief</span>
    </div>
  </div>
  <div style="margin-top:4mm;display:flex;justify-content:space-between;font-size:7.4pt;color:#6B7077"><span>Gigotter · Accra, Ghana</span><span>Verified students. Paid to mobile money. Approved results only.</span></div>
</div>"""

html = f"<!doctype html><html><head><meta charset='utf-8'><title>Gigotter for businesses</title><style>{css}</style></head><body><section class='page'>{hero}{services}{middle}{cta}</section></body></html>"
pathlib.Path(sys.argv[1]).write_text(html)
