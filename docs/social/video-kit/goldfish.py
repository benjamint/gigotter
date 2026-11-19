"""Goldfish video (Pexels 8434694). usage: python3 goldfish.py PHOTO.jpg OUTDIR [--page-only]"""
import sys
from kit import make
make('gigotter-earned-goldfish', sys.argv[1], sys.argv[2], frames='--page-only' not in sys.argv,
     intro=('Waiting for pocket money like:', 1.6),
     captions=[
         {'text': '<small>Day 1</small>“It’s coming.”', 'at': 2.4, 'until': 4.2, 'style': 'pill'},
         {'text': '<small>Day 12</small>“Soon.”', 'at': 4.3, 'until': 6.0, 'style': 'pill'},
         {'text': '<small>Day 30</small>“Next week.”', 'at': 6.1, 'until': 7.7, 'style': 'pill'},
         {'text': 'Waiting around<br>to be fed is a<br><em>goldfish thing.</em>', 'at': 7.9, 'until': 9.95},
     ],
     turn='You’re not a<br><em>goldfish.</em>',
     pos='68% 50%', origin='60% 55%', zoom=((0, 1.0), (13.5, 1.14)), bob=12, light=True,
     sounds=[('bubble', 1.9), ('bubble', 2.4), ('bubble', 3.3), ('bubble', 4.3), ('bubble', 6.1), ('bubble', 6.9), ('bonk', 7.9)],
     ambience='water', cover_at=8.6)
