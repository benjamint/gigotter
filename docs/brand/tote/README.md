# Gigotter tote bag: DTF print files

**Recommended: deep green tote** (hides dirt, matches the green T-shirt) with **yellow handles**. Order "bottle green / dark green cotton canvas totes with yellow (contrast) handles", as close to the logo yellow (#FBCA3B) as the supplier has. A natural canvas version is kept as an option.

Printed on **one side**. Design: a tilted "CARRYING MY" sticker over a 3D "NEXT GIG.", the big otter logo, and a "SCAN ME" QR code to **https://gigotter.com** with www.gigotter.com and "Paid gigs for students & everyone in Ghana".

## Files for the print shop
| File | Bag | Print size | Placement |
|---|---|---|---|
| `dtf-tote-green.png` (+ `.pdf`) | **Deep green tote** (recommended) | **26 × 32.4 cm** | Centred left to right, top about 6 cm below the top hem (standard 38 × 42 cm tote) |
| `dtf-tote-canvas.png` (+ `.pdf`) | Natural canvas tote | 26 × 32.5 cm | Same |

Use the file that matches the bag colour. The green version uses a white sticker, white 3D shadow, white text and a white QR tile; the canvas version uses dark green. Transparent background, 300 dpi, sRGB, solid colours only.

## Notes for the printer
- Print with a **white underbase** (standard for DTF, essential on dark fabric). The QR code sits on a white tile and needs it to scan.
- Print at **100% size**. The QR code is about 5.6 cm wide; don't let it go below 5 cm.
- Canvas is thicker than T-shirt cotton: press a little longer if the film maker recommends it.
- For a smaller tote (e.g. 35 × 40 cm), print at 24 cm wide and test the QR on the first bag.

## Mockups (for showing people, not for printing)
- `mockup-tote-green.png`: the green tote.
- `mockup-tote-canvas.png`: the natural canvas option.
- `mockup-merch.png`: the green tote with the green and white T-shirts.

## QR code
The same tested code as `docs/brand/gigotter-qr.svg` and the T-shirts (error correction H). Checked on both print files with ZXing at several sizes, sharp and blurred.

## Rebuild
```
python3 build/build.py WORK_DIR && node build/render.cjs WORK_DIR docs/brand/tote
python3 build/mockup.py WORK_DIR && node build/mockup.cjs WORK_DIR docs/brand/tote
```

`preview-tote-green-on-fabric.png` shows the green print file on the bag colour (preview only, not for printing): in the transparent PNG the white parts are invisible on a white screen.
