# Gigotter A4 bi-fold brochure

One A4 sheet, printed on both sides (landscape) and folded in half → four A5 panels.

| File | Use |
|---|---|
| `gigotter-brochure-A4.pdf` | Office / home printers (A4, no bleed) |
| `gigotter-brochure-A4-print-3mm-bleed.pdf` | Print shops: 303 × 216 mm with 3 mm bleed on every side, trim to A4 |

**Page 1 (outside):** left = back cover (for businesses + QR), right = front cover.
**Page 2 (inside):** left = how it works, right = the work + why students choose Gigotter.

**Printing:** double-sided, **flip on short edge**, 100% scale ("Actual size", not "Fit to page"),
150–170 gsm silk or matte paper. Fold so the front cover (otter logo + students photo) is on the outside.

Rebuild after edits: `python3 build.py out.html 0` (or `3` for bleed), then `node render.cjs out.html out.pdf preview`.
Paths inside build.py point at the original photos and fonts; adjust if rebuilding elsewhere.
