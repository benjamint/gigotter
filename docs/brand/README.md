# Gigotter QR code

| File | Use |
|---|---|
| `gigotter-qr.png` | The code on its own (2,640 px), for flyers, posters, stickers and social posts |
| `gigotter-qr-card.png` | Ready-to-print card (1800 × 2400 px, 3:4), "Scan to start earning" |
| `gigotter-qr.svg` | Vector version for print shops. Scales to any size without blurring |

Opens **https://gigotter.com**. Uses error correction level H, so the centre logo is safe.
Tested with two independent QR readers (OpenCV and ZXing), including at small size, blurred and rotated.

**Printing tips:** keep the code at least **2.5 cm (1 inch)** wide, print on a light background, and leave the white margin around it.

**Make a code for another link** (e.g. a campus campaign):

```
pip install "qrcode[pil]==7.4.2"
python3 scripts/make_qr.py "https://gigotter.com/gigs" OUT_DIR public/icon-512.png FONTS_DIR 4 0.94 0.35 0.13 dot
```

`FONTS_DIR` needs the @fontsource Inter, Inter Tight and Instrument Serif packages. Longer links need a bigger version number (the 4th argument, e.g. 5 or 6). Re-test the result before printing.
