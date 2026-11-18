# Gigotter T-shirt: DTF print files

Shirts: **deep green** and **white**. Front: otter logo with www.gigotter.com underneath (left chest). Back: a tilted "ASK ME HOW I" sticker over a 3D "GET PAID." with sparkles, + QR code to **https://gigotter.com**.

## Files for the print shop
All PNGs have a **transparent background**, **300 dpi**, sRGB, solid colours only (no gradients or see-through areas).

| File | Print size | Placement |
|---|---|---|
| `dtf-front-green-shirt-9cm.png` | 9 × 12.9 cm | **Front, green shirts:** logo + "www.gigotter.com" in white. **Wearer's left chest**, top about 8 cm below the collar seam, centre about 10 cm from the middle of the shirt |
| `dtf-front-white-shirt-9cm.png` | 9 × 12.9 cm | **Front, white shirts:** logo + "www.gigotter.com" in dark green. Same placement |
| `dtf-front-*-shirt-12cm.png` | 12 × 17.2 cm | Same two designs, bigger |
| `dtf-front-logo-9cm.png` / `-12cm.png` | 9 × 11 / 12 × 14.7 cm | Logo only, without the website (spare option) |
| `dtf-back-green-shirt.png` (+ `.pdf`) | 28 × 30.0 cm | **Back, green shirts.** Centred, top about 8 cm below the collar seam |
| `dtf-back-white-shirt.png` (+ `.pdf`) | 28 × 30.3 cm | **Back, white shirts.** Same placement |

Use the back file that matches the shirt colour. The green one uses white and yellow text, the white one uses dark green.

## Notes for the printer
- Print with a **white underbase** (standard for DTF). The QR code sits on a white tile and needs it to scan.
- Print at **100% size**. Don't shrink the back design; the QR code must stay **at least 8 cm wide** (it's 11 cm in these files).
- Press per the film maker's instructions (typically about 150–160 °C for 10–15 s, then peel as specified).
- Don't place the back print over a seam.

## Mockups (for showing people, not for printing)
`mockup-sheet.png` (all four views), `mockup-green-front.png`, `mockup-green-back.png`, `mockup-white-front.png`, `mockup-white-back.png`.

## QR code
The same tested code as `docs/brand/gigotter-qr.svg`. Error correction level H, so the centre logo is safe. Checked on both back files with two QR readers (ZXing and OpenCV), including small and blurred, as a phone sees it from a few metres away.

## Rebuild
```
python3 build/build.py WORK_DIR && node build/render.cjs WORK_DIR docs/brand/tshirt
python3 build/mockup.py WORK_DIR && node build/mockup.cjs WORK_DIR docs/brand/tshirt
```
Needs the @fontsource Onest and Inter Tight packages (path set in the scripts).
