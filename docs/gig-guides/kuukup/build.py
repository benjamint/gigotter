"""Kuukup intro + student field guide, 2 A4 pages. usage: python3 build.py OUT.html"""
import json, sys, base64, pathlib

HERE = pathlib.Path(__file__).parent
FONTS = pathlib.Path('/tmp/claude-0/-workspace/04016ca2-3467-57d3-863b-54dd5a5c69fc/scratchpad/qr/fonts')
I = json.load(open(HERE / 'icons.json'))
def f(p): return 'data:font/woff;base64,' + base64.b64encode((FONTS / p).read_bytes()).decode()
def ic(name, cls='ic'): return f'<span class="{cls}">{I[name]}</span>'

css = f"""
@font-face {{ font-family: 'KSerif'; font-style: normal; src: url('{f('fontsource-instrument-serif-5.1.0/files/instrument-serif-latin-400-normal.woff')}'); }}
@font-face {{ font-family: 'KSerif'; font-style: italic; src: url('{f('fontsource-instrument-serif-5.1.0/files/instrument-serif-latin-400-italic.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 400; src: url('{f('fontsource-inter-5.1.0/files/inter-latin-400-normal.woff')}'); }}
@font-face {{ font-family: 'Inter'; font-weight: 600; src: url('{f('fontsource-inter-5.1.0/files/inter-latin-600-normal.woff')}'); }}
@font-face {{ font-family: 'Tight'; font-weight: 700; src: url('{f('fontsource-inter-tight-5.1.0/files/inter-tight-latin-700-normal.woff')}'); }}
@page {{ size: A4; margin: 0; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
:root {{ --cream:#FBF6EE; --sand:#F3EADB; --line:#E7DCCA; --ink:#2B1D16; --soft:#5C4A3F; --muted:#8A776A; --clay:#B5532A; --clay2:#8E3F1F; --gold:#E3A33B; }}
html, body {{ background: #ddd; }}
body {{ font-family: Inter, sans-serif; color: var(--ink); font-size: 9.6pt; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.page {{ width: 210mm; height: 297mm; background: var(--cream); position: relative; overflow: hidden; page-break-after: always; }}
.inner {{ position: absolute; inset: 0; padding: 14mm 15mm 12mm; display: flex; flex-direction: column; }}
.inner > * {{ flex-shrink: 0; }}
h1, h2, h3 {{ font-family: 'KSerif', Georgia, serif; font-weight: 400; letter-spacing: -0.01em; line-height: 1.05; }}
.em {{ font-family: 'KSerif'; font-style: italic; }}
.eyebrow {{ font: 600 7.4pt Inter; letter-spacing: .16em; text-transform: uppercase; color: var(--clay); }}
.ic {{ display: inline-grid; place-items: center; width: 9mm; height: 9mm; border-radius: 3mm; background: #F6E3D6; color: var(--clay2); flex: none; }}
.ic svg {{ width: 4.8mm; height: 4.8mm; }}
.sm {{ width: 6mm; height: 6mm; border-radius: 2mm; }} .sm svg {{ width: 3.6mm; height: 3.6mm; }}
.mark {{ display: flex; align-items: center; gap: 2.5mm; }}
.logo {{ width: 11mm; height: 11mm; border-radius: 50%; background: var(--clay); color: #fff; display: grid; place-items: center; }}
.logo svg {{ width: 6mm; height: 6mm; }}
.word {{ font: 700 17pt Tight; letter-spacing: -0.02em; }}
.pill {{ display: inline-flex; align-items: center; gap: 1.5mm; padding: 1.2mm 3mm; border-radius: 99px; font: 600 7.4pt Inter; }}
.top {{ display: flex; justify-content: space-between; align-items: center; }}
.hero {{ margin-top: 7mm; background: var(--ink); color: #fff; border-radius: 6mm; padding: 10mm 10mm 9mm; position: relative; overflow: hidden; }}
.hero h1 {{ font-size: 31pt; color: #fff; max-width: 150mm; }}
.hero h1 .em {{ color: var(--gold); }}
.hero p {{ margin-top: 4mm; color: rgba(255,255,255,.72); font-size: 10pt; max-width: 140mm; line-height: 1.55; }}
.hero .ring {{ position: absolute; right: -18mm; top: -18mm; width: 70mm; height: 70mm; border-radius: 50%; border: 1px solid rgba(227,163,59,.25); }}
.hero .ring2 {{ right: -6mm; top: -6mm; width: 46mm; height: 46mm; }}
.grid3 {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }}
.card {{ background: #fff; border: 1px solid var(--line); border-radius: 4.5mm; padding: 5.5mm; }}
.card h3 {{ font-size: 15pt; margin-top: 3.5mm; }}
.card p {{ margin-top: 1.6mm; color: var(--soft); font-size: 8.9pt; }}
.sec {{ margin-top: 7mm; }}
.sec > h2 {{ font-size: 21pt; margin-top: 1.5mm; }}
.two {{ display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }}
ul.ck {{ list-style: none; margin-top: 3.5mm; display: grid; gap: 2.6mm; }}
ul.ck li {{ display: flex; gap: 2.5mm; align-items: flex-start; color: var(--soft); }}
ul.ck li b {{ color: var(--ink); font-weight: 600; }}
ul.ck .ic {{ margin-top: -.6mm; }}
.steps {{ display: grid; gap: 2.4mm; margin-top: 3.5mm; }}
.step {{ display: flex; gap: 3mm; align-items: flex-start; }}
.num {{ width: 6.5mm; height: 6.5mm; border-radius: 50%; background: var(--clay); color: #fff; font: 600 8pt Inter; display: grid; place-items: center; flex: none; }}
.step b {{ display: block; font-weight: 600; }} .step div span {{ color: var(--soft); }}
.cta {{ margin-top: auto; position: relative; top: 0; background: var(--clay); color: #fff; border-radius: 5mm; padding: 7mm 8mm; display: flex; gap: 6mm; align-items: center; }}
.cta h2 {{ font-size: 19pt; color: #fff; }}
.cta p {{ color: rgba(255,255,255,.82); margin-top: 1.5mm; font-size: 9pt; }}
.cta .big {{ width: 15mm; height: 15mm; border-radius: 4mm; background: rgba(255,255,255,.16); color: #fff; }}
.cta .big svg {{ width: 8mm; height: 8mm; }}
.foot {{ margin-top: 4mm; display: flex; justify-content: space-between; font-size: 7.4pt; color: var(--muted); }}
/* page 2 */
.banner {{ margin-top: 7mm; display: flex; justify-content: space-between; align-items: flex-end; gap: 8mm; }}
.banner h1 {{ font-size: 32pt; }}
.banner p {{ color: var(--soft); max-width: 72mm; font-size: 9pt; }}
.box {{ background: #fff; border: 1px solid var(--line); border-radius: 4.5mm; padding: 5.5mm 6mm; }}
.box h3 {{ font-size: 14pt; display: flex; align-items: center; gap: 2.5mm; }}
.script {{ background: var(--sand); border-left: 1.2mm solid var(--clay); border-radius: 0 4mm 4mm 0; padding: 4.5mm 6mm; margin-top: 3mm; font-family: 'KSerif'; font-style: italic; font-size: 12.2pt; line-height: 1.38; color: var(--ink); }}
.faq {{ display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 6mm; margin-top: 3.5mm; }}
.faq b {{ display: block; font-weight: 600; font-size: 9pt; }}
.faq span {{ color: var(--soft); font-size: 8.7pt; }}
.dd {{ display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }}
.dd ul {{ list-style: none; display: grid; gap: 1.8mm; margin-top: 2.5mm; }}
.dd li {{ display: flex; gap: 2mm; color: var(--soft); font-size: 8.8pt; }}
.dd li svg {{ width: 3.6mm; height: 3.6mm; flex: none; margin-top: .6mm; }}
.do svg {{ color: #2F6B52; }} .dont svg {{ color: #B3261E; }}
.tag {{ font: 600 7pt Inter; letter-spacing: .12em; text-transform: uppercase; }}
"""

def li(icon, b, t): return f'<li>{ic(icon, "ic sm")}<div><b>{b}</b> {t}</div></li>'
def step(n, b, t): return f'<div class="step"><span class="num">{n}</span><div><b>{b}</b><span>{t}</span></div></div>'
def dd(icon, t): return f'<li>{I[icon]}<span>{t}</span></li>'

logo = f'<div class="mark"><span class="logo">{I["ChefHat"]}</span><span class="word">Kuukup</span></div>'

page1 = f"""
<section class="page"><div class="inner">
  <div class="top">{logo}<span class="pill" style="background:#F6E3D6;color:var(--clay2)">{I['Sparkles'].replace('width="24" height="24"','width="11" height="11"')} Coming soon</span></div>

  <div class="hero"><div class="ring"></div><div class="ring ring2"></div>
    <div class="eyebrow" style="color:var(--gold)">For home chefs, cooks &amp; caterers</div>
    <h1 style="margin-top:3mm">Your cooking, <span class="em">ordered and booked</span> by people near you.</h1>
    <p>Kuukup is a new platform that connects home chefs with people who want real, home-cooked food. Customers will be able to order your meals, or book you to cook at their events, parties and homes. We’re inviting chefs to join before we launch.</p>
  </div>

  <div class="sec">
    <div class="eyebrow">Three ways to cook with Kuukup</div>
    <div class="grid3" style="margin-top:4mm">
      <div class="card">{ic('ShoppingBag')}<h3>Meal orders</h3><p>Customers browse chefs near them and order your dishes, from everyday plates to your specials.</p></div>
      <div class="card">{ic('PartyPopper')}<h3>Events &amp; parties</h3><p>Get booked to cook for birthdays, naming ceremonies, office lunches and family gatherings.</p></div>
      <div class="card">{ic('House')}<h3>In-home cooking</h3><p>Be the private chef: cook in someone’s home for a dinner, a celebration or the week ahead.</p></div>
    </div>
  </div>

  <div class="sec two">
    <div>
      <div class="eyebrow">Why join early</div>
      <h2 style="font-size:19pt;margin-top:1.5mm">Be among the <span class="em">first chefs</span> on Kuukup.</h2>
      <ul class="ck">
        {li('Users', 'Reach new customers', 'beyond your WhatsApp contacts and followers.')}
        {li('CalendarDays', 'Get booked for events', 'as well as everyday meal orders.')}
        {li('ChefHat', 'Show off your cooking', 'with your own chef profile and dishes.')}
        {li('HeartHandshake', 'Free to register interest', 'with no commitment. Keep your current customers.')}
      </ul>
    </div>
    <div>
      <div class="eyebrow">How it will work for customers</div>
      <div class="steps" style="margin-top:4.5mm">
        {step(1, 'Find a chef', 'Browse home chefs near them and see what they cook.')}
        {step(2, 'Order or book', 'Order a meal, or request a chef for an event or at home.')}
        {step(3, 'The chef cooks', 'Fresh, home-cooked food, made by you.')}
      </div>
    </div>
  </div>

  <div class="cta"><span class="ic big">{I['ClipboardList']}</span>
    <div><h2>Register your interest in 5 minutes</h2>
    <p>A student from Gigotter will ask you a few questions about your cooking. With your permission, the Kuukup team will contact you before launch to invite you to join.</p></div>
  </div>
  <div class="foot"><span>Kuukup · Home-cooked food from chefs near you</span><span>Registration of interest organised by Gigotter · gigotter.com</span></div>
</div></section>
"""

page2 = f"""
<section class="page"><div class="inner">
  <div class="top">{logo}<span class="pill" style="background:var(--ink);color:#fff">Student field guide</span></div>
  <div class="banner">
    <div><div class="eyebrow">Student field guide · part one</div><h1 style="margin-top:2mm">Finding chefs <span class="em">for Kuukup</span></h1></div>
    <p>Read this before your first conversation. Show chefs page 1; pages 2 and 3 are for you.</p>
  </div>

  <div class="two" style="margin-top:6mm">
    <div class="box"><h3>{ic('Users','ic sm')}Who to look for</h3>
      <ul class="ck" style="margin-top:3mm">
        {li('Check','Home cooks', 'who sell meals from their kitchen.')}
        {li('Check','Online food sellers', 'taking orders on WhatsApp, Instagram or TikTok.')}
        {li('Check','Small caterers', 'who cook for parties, churches and offices.')}
        {li('Check','Private chefs', 'who cook in people’s homes.')}
      </ul>
      <p style="margin-top:3mm;font-size:8.5pt;color:var(--muted)">Not restaurant chains or fast-food franchises. They must cook and sell food themselves.</p>
    </div>
    <div class="box"><h3>{ic('MapPin','ic sm')}Where to find them</h3>
      <ul class="ck" style="margin-top:3mm">
        {li('Check','WhatsApp statuses', 'and food groups you’re already in.')}
        {li('Check','Instagram &amp; TikTok', 'food pages in your area.')}
        {li('Check','Campus and office', 'food sellers and lunch vendors.')}
        {li('Check','Event caterers', 'recommended by churches, friends and family.')}
        {li('Check','Ask every chef', 'if they know another one.')}
      </ul>
    </div>
  </div>

  <div class="box" style="margin-top:4mm"><h3>{ic('MessageCircle','ic sm')}Your 2-minute introduction</h3>
    <div class="script">“Hi, I’m [your name], a student working with Gigotter. I’m talking to home chefs about Kuukup, a new platform launching soon. People will be able to order meals from chefs near them, or book a chef to cook at a party, an event or in their home. They’re inviting chefs to join before launch. It’s free to register your interest and there’s no commitment. Can I ask you a few quick questions about your cooking? It takes about five minutes.”</div>
  </div>

  <div class="box" style="margin-top:4mm"><h3>{ic('ShieldCheck','ic sm')}Ask for consent</h3>
      <div class="script" style="font-size:11pt">“Are you happy for me to share these details with the Kuukup team, so they can contact you about joining?”</div>
      <p style="margin-top:2.5mm;font-size:8.6pt;color:var(--soft)">Only continue if they say yes, and record their answer in the last question. Ask before taking any photo of them or their food.</p>
    </div>
  <div class="foot" style="margin-top:auto"><span>Questions about this gig? Email hello@gigotter.com</span><span>Every entry is checked. Genuine, complete entries get paid.</span></div>
</div></section>
"""


page3 = f"""
<section class="page"><div class="inner">
  <div class="top">{logo}<span class="pill" style="background:var(--ink);color:#fff">Student field guide</span></div>
  <div class="banner" style="margin-top:4mm">
    <div><div class="eyebrow">Student field guide · part two</div><h1 style="margin-top:2mm">Answering <span class="em">questions</span></h1></div>
    <p>Chefs will have questions. Keep answers honest and simple, and never promise what Kuukup hasn’t confirmed.</p>
  </div>
  <div class="box" style="margin-top:4mm"><h3>{ic('HelpCircle','ic sm')}Questions chefs may ask</h3>
    <div class="faq">
      <div><b>Is it free?</b><span>Registering interest is free and has no commitment. The Kuukup team will explain how joining works before launch.</span></div>
      <div><b>When does it launch?</b><span>Soon. They’re building the list of chefs first, and will contact you before it goes live.</span></div>
      <div><b>Do I need a restaurant or shop?</b><span>No. Kuukup is built for people who cook from home, cater or work as private chefs.</span></div>
      <div><b>What happens to my details?</b><span>They go only to the Kuukup team, so they can contact you about joining. Nothing is shared publicly.</span></div>
      <div><b>Do I need a certificate?</b><span>Not to register interest. Kuukup will share any requirements before launch.</span></div>
      <div><b>Can I keep my WhatsApp customers?</b><span>Yes. Kuukup is a way to reach more people, not a replacement for your customers.</span></div>
    </div>
    <p style="margin-top:3mm;font-size:8.5pt;color:var(--muted)">Don’t know the answer? Say so honestly and the Kuukup team will follow up.</p>
  </div>


  <div class="box dd" style="margin-top:4mm">
      <div class="do"><div class="tag" style="color:#2F6B52">Do</div><ul>
        {dd('Check','Fill in the survey with the chef, there and then')}
        {dd('Check','Double-check their phone number')}
        {dd('Check','Write their dishes in their own words')}
        {dd('Check','Thank them, even if they say no')}
      </ul></div>
      <div class="dont"><div class="tag" style="color:#B3261E">Don’t</div><ul>
        {dd('X','Pressure anyone to sign up')}
        {dd('X','Make up or guess any answers')}
        {dd('X','Submit the same chef twice')}
        {dd('X','Promise money, orders or dates')}
      </ul></div>
    </div>

  <div class="box" style="margin-top:4mm"><h3>{ic('ClipboardList','ic sm')}Before you submit</h3>
    <ul class="ck" style="margin-top:3mm;grid-template-columns:1fr 1fr;gap:2mm 6mm">
      {li('Check','Name and phone', 'checked with the chef, digit by digit.')}
      {li('Check','Dishes and cuisines', 'in their own words, not “local food”.')}
      {li('Check','All three ways', 'answered: meal orders, events, in-home.')}
      {li('Check','Consent recorded', 'as “Yes” in the last question.')}
      {li('Check','Photo, if shared', 'of their food or their food page.')}
      {li('Check','A quick thank-you', 'and let them know Kuukup will be in touch.')}
    </ul>
  </div>

  <div class="cta" style="background:var(--ink);margin-top:5mm"><span class="ic big">{I['Star']}</span>
    <div><h2>Quality beats quantity</h2>
    <p>Every entry is checked and chefs may be called. Ten genuine, complete chefs are worth far more than thirty rushed ones, and only genuine entries are paid.</p></div>
  </div>
  <div class="foot"><span>Questions about this gig? Email hello@gigotter.com</span><span>Kuukup · Student field guide</span></div>
</div></section>
"""

html = f"<!doctype html><html><head><meta charset='utf-8'><title>Kuukup guide</title><style>{css}</style></head><body>{page1}{page2}{page3}</body></html>"
pathlib.Path(sys.argv[1]).write_text(html)
