import sys, base64, io, qrcode
from PIL import Image, ImageDraw, ImageFont
URL, OUT, LOGO, FONTS = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
VER, DOT, ROUND, LOGOF, STYLE = int(sys.argv[5]), float(sys.argv[6]), float(sys.argv[7]), float(sys.argv[8]), sys.argv[9]
INK, GREEN, PAPER, WHITE, MUTED = (16, 41, 31), (28, 70, 53), (247, 246, 242), (255, 255, 255), (107, 112, 119)

qr = qrcode.QRCode(version=VER, error_correction=qrcode.constants.ERROR_CORRECT_H, border=0)
qr.add_data(URL); qr.make(fit=False)
M = qr.get_matrix(); N = len(M)
S = 40                    # pixels per module
Q = 4                     # quiet zone (modules)
W = (N + 2 * Q) * S
finders = [(0, 0), (0, N - 7), (N - 7, 0)]
def in_finder(r, c): return any(fr <= r < fr + 7 and fc <= c < fc + 7 for fr, fc in finders)
# centre logo area: ~22% of the code, snapped to whole modules
L = int(N * LOGOF) | 1; L0 = (N - L) // 2
def in_logo(r, c): return L0 - 1 <= r <= L0 + L and L0 - 1 <= c <= L0 + L

def draw_qr(bg):
    img = Image.new('RGB', (W, W), bg); d = ImageDraw.Draw(img)
    off = Q * S
    for r in range(N):
        for c in range(N):
            if M[r][c] and not in_finder(r, c) and not in_logo(r, c):
                x, y = off + c * S, off + r * S; p = S * (1 - DOT) / 2
                if STYLE == 'dot': d.ellipse((x + p, y + p, x + S - p, y + S - p), fill=INK)
                else: d.rounded_rectangle((x + p, y + p, x + S - p, y + S - p), radius=int(S * 0.32), fill=INK)
    for fr, fc in finders:
        x, y = off + fc * S, off + fr * S
        d.rounded_rectangle((x, y, x + 7 * S, y + 7 * S), radius=int(ROUND * 2.2 * S), fill=GREEN)
        d.rounded_rectangle((x + S, y + S, x + 6 * S, y + 6 * S), radius=int(ROUND * 1.5 * S), fill=bg)
        d.rounded_rectangle((x + 2 * S, y + 2 * S, x + 5 * S, y + 5 * S), radius=int(ROUND * 0.9 * S), fill=INK)
    # logo on a white rounded tile
    lx, ly, ls = off + (L0 - 0.5) * S, off + (L0 - 0.5) * S, (L + 1) * S
    d.rounded_rectangle((lx, ly, lx + ls, ly + ls), radius=int(ls * 0.24), fill=WHITE)
    logo = Image.open(LOGO).convert('RGBA'); inner = int(ls * 0.86); logo = logo.resize((inner, inner), Image.LANCZOS)
    img.paste(logo, (int(lx + (ls - inner) / 2), int(ly + (ls - inner) / 2)), logo)
    return img

# 1) plain QR (white background, quiet zone included)
qr_img = draw_qr(WHITE); qr_img.save(f'{OUT}/gigotter-qr.png', optimize=True)

# 2) printable card (A6-ish portrait, 1800x2400)
def font(path, size): return ImageFont.truetype(f'{FONTS}/{path}', size)
CW, CH = 1800, 2400
card = Image.new('RGB', (CW, CH), PAPER); d = ImageDraw.Draw(card)
logo = Image.open(LOGO).convert('RGBA').resize((150, 150), Image.LANCZOS)
wm = font('fontsource-inter-tight-5.1.0/files/inter-tight-latin-600-normal.woff', 96)
tw = d.textlength('Gigotter', font=wm); gx = (CW - (150 + 28 + tw)) / 2
card.paste(logo, (int(gx), 150), logo); d.text((gx + 178, 225), 'Gigotter', font=wm, fill=(21, 23, 26), anchor='lm')
h1 = font('fontsource-inter-tight-5.1.0/files/inter-tight-latin-600-normal.woff', 132)
em = font('fontsource-instrument-serif-5.1.0/files/instrument-serif-latin-400-italic.woff', 150)
a, b = 'Scan to start ', 'earning.'
wa, wb = d.textlength(a, font=h1), d.textlength(b, font=em); x0 = (CW - wa - wb) / 2
d.text((x0, 470), a, font=h1, fill=(21, 23, 26), anchor='ls'); d.text((x0 + wa, 470), b, font=em, fill=GREEN, anchor='ls')
sub = font('fontsource-inter-5.1.0/files/inter-latin-400-normal.woff', 52)
d.text((CW / 2, 560), 'Real gigs for students. Paid to mobile money.', font=sub, fill=MUTED, anchor='mm')
# white panel with the code
pw = 1240; px, py = (CW - pw) // 2, 680
d.rounded_rectangle((px, py, px + pw, py + pw), radius=90, fill=WHITE, outline=(228, 225, 216), width=4)
code = qr_img.resize((pw - 80, pw - 80), Image.LANCZOS); card.paste(code, (px + 40, py + 40))
url = font('fontsource-inter-tight-5.1.0/files/inter-tight-latin-600-normal.woff', 76)
d.text((CW / 2, py + pw + 150), 'gigotter.com', font=url, fill=(21, 23, 26), anchor='mm')
foot = font('fontsource-inter-5.1.0/files/inter-latin-400-normal.woff', 44)
d.text((CW / 2, py + pw + 250), 'Point your phone camera at the code', font=foot, fill=MUTED, anchor='mm')
card.save(f'{OUT}/gigotter-qr-card.png', optimize=True)

# 3) SVG (vector, for print shops)
buf = io.BytesIO(); Image.open(LOGO).convert('RGBA').save(buf, 'PNG'); b64 = base64.b64encode(buf.getvalue()).decode()
hexc = lambda c: '#%02x%02x%02x' % c
u = 10; off = Q * u; VW = (N + 2 * Q) * u
parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VW} {VW}" width="1000" height="1000"><rect width="100%" height="100%" fill="#ffffff"/>']
for r in range(N):
    for c in range(N):
        if M[r][c] and not in_finder(r, c) and not in_logo(r, c):
            pp = u * (1 - DOT) / 2
            parts.append(f'<circle cx="{off + c*u + u/2}" cy="{off + r*u + u/2}" r="{u*DOT/2:.2f}" fill="{hexc(INK)}"/>' if STYLE == 'dot' else f'<rect x="{off + c*u + pp:.2f}" y="{off + r*u + pp:.2f}" width="{u*DOT:.2f}" height="{u*DOT:.2f}" rx="{u*0.32:.2f}" fill="{hexc(INK)}"/>')
for fr, fc in finders:
    x, y = off + fc*u, off + fr*u
    parts.append(f'<rect x="{x}" y="{y}" width="{7*u}" height="{7*u}" rx="{ROUND*2.2*u:.2f}" fill="{hexc(GREEN)}"/>')
    parts.append(f'<rect x="{x+u}" y="{y+u}" width="{5*u}" height="{5*u}" rx="{ROUND*1.5*u:.2f}" fill="#ffffff"/>')
    parts.append(f'<rect x="{x+2*u}" y="{y+2*u}" width="{3*u}" height="{3*u}" rx="{ROUND*0.9*u:.2f}" fill="{hexc(INK)}"/>')
lx = off + (L0 - 0.5)*u; ls = (L + 1)*u; inner = ls*0.86
parts.append(f'<rect x="{lx}" y="{lx}" width="{ls}" height="{ls}" rx="{ls*0.24:.1f}" fill="#ffffff"/>')
parts.append(f'<image x="{lx + (ls-inner)/2}" y="{lx + (ls-inner)/2}" width="{inner}" height="{inner}" href="data:image/png;base64,{b64}"/>')
parts.append('</svg>')
open(f'{OUT}/gigotter-qr.svg', 'w').write(''.join(parts))
print(f'modules: {N}x{N} (version {qr.version}), error correction H, logo covers {L+2}x{L+2} modules')
