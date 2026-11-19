# Series 3: bold banners

Nine Instagram feed banners, 1080×1350 rendered at 2× (2160×2700 PNG). Big upper-case Onest Bold, one word in the logo's yellow (#F9C93A), and only the yellow otter icon (`public/icon-512.png`) top right. Type is sized automatically so the widest line fills the width.

| File | Line | Photo |
|---|---|---|
| gigotter-b1 | JOLLOF ON **YOU.** FOR ONCE. | Jollof with plantain |
| gigotter-b2 | THIS ROUND'S ON **ME.** | Friends laughing |
| gigotter-b3 | SEND SOMETHING **HOME.** | Mum and daughter hugging |
| gigotter-b4 | NEW KICKS. **ZERO** BEGGING. | Red sneakers (unbranded) |
| gigotter-b5 | GRADUATE WITH MORE THAN A **DEGREE.** | Graduate tossing a cap |
| gigotter-b6 | WEEKEND TRIP. **SELF-FUNDED.** | Woman by the sea |
| gigotter-b7 | FEES? **SORTED.** | Student cheering with papers |
| gigotter-b8 | CHOP LIFE. **RESPONSIBLY.** | Two friends sharing a meal |
| gigotter-b9 | THAT FEELING WHEN IT **LANDS.** | Man fist-pumping at his phone |

Brand check: the first sneaker photo was a Nike, so it was replaced. In b9 the faint "SAMSUNG" on the phone back was painted out in the source photo before rendering (patch from the phone surface just below, at about x 428–540, y 1798–1836 of the 1987×3000 download).

Rebuild: download the photos in CREDITS.md as `<id>.jpg` (`https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&h=3000`), redo the b9 patch, then
`python3 build.py PHOTODIR /tmp/b.html && node render.cjs /tmp/b.html .`
