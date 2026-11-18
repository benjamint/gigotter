# Gigotter tote bag: DTF print file

Natural canvas tote with **deep green handles** (order the bag with green handles; the print is the same), printed on **one side**. Design: a tilted "CARRYING MY" sticker over a 3D "NEXT GIG.", the big otter logo, and a "SCAN ME" QR code to **https://gigotter.com** with www.gigotter.com and "Paid gigs for students & everyone in Ghana".

## Files for the print shop
| File | Print size | Placement |
|---|---|---|
| `dtf-tote-canvas.png` | **26 × 32.5 cm** | Centred left to right, top about 6 cm below the top hem (for a standard 38 × 42 cm tote) |
| `dtf-tote-canvas.pdf` | same | Same design as a PDF, for shops that prefer it |

Transparent background, 300 dpi, sRGB, solid colours only (dark green, brand green, yellow and white).

## Notes for the printer
- Print with a **white underbase** (standard for DTF on natural canvas). The QR code sits on a white tile and needs it to scan.
- Print at **100% size**. The QR code is about 5.6 cm wide; don't let it go below 5 cm.
- Canvas is thicker than T-shirt cotton: press a little longer if the film maker recommends it.
- For a smaller tote (e.g. 35 × 40 cm), the design can be printed at 24 cm wide. Test the QR on the first bag.

## Mockups (for showing people, not for printing)
- `mockup-tote.png`: the tote on its own.
- `mockup-merch.png`: the tote with the green and white T-shirts.

## QR code
The same tested code as `docs/brand/gigotter-qr.svg` and the T-shirts (error correction H). Checked on the print file with ZXing at several sizes, sharp and blurred.

## Rebuild
```
python3 build/build.py WORK_DIR && node build/render.cjs WORK_DIR docs/brand/tote
python3 build/mockup.py WORK_DIR && node build/mockup.cjs WORK_DIR docs/brand/tote
```
