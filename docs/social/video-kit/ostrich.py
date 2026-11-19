"""Ostrich video (Pexels 1201397). usage: python3 ostrich.py PHOTO.jpg OUTDIR [--page-only]"""
import sys
from kit import make
make('gigotter-earned-ostrich', sys.argv[1], sys.argv[2], frames='--page-only' not in sys.argv,
     intro=('Me after checking<br>my <em>balance:</em>', 1.6),
     captions=[
         {'text': '“Let me check again.”', 'at': 5.1, 'until': 7.35, 'style': 'pill'},
         {'text': 'Hiding from<br>your balance<br><em>won’t fix it.</em>', 'at': 7.7, 'until': 9.95, 'place': 'bottom'},
     ],
     turn='Earning<br><em>will.</em>',
     pos='58% 50%', origin='64% 36%',
     # three dramatic punch-ins on the side-eye, then pull back for the line
     zoom=((0, 1.0), (2.0, 1.0), (2.15, 1.25), (3.2, 1.25), (3.35, 1.55), (4.4, 1.55), (4.55, 1.95), (7.2, 1.98), (7.6, 1.12), (13.5, 1.16)),
     shakes=(2.0, 3.2, 4.4), shade='bottom',
     sounds=[('dun', 2.0, 220), ('dun', 3.2, 185), ('dun', 4.4, 147), ('pop', 5.1), ('bonk', 7.7)],
     ambience='outdoor', cover_at=4.8)
