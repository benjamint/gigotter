"""Melting ice cream video on real footage (Pexels video 9808555, time-lapse). usage: python3 icecream_footage.py CLIP.mp4 OUTDIR"""
import sys
from footage import make_footage
make_footage('gigotter-earned-icecream-footage', sys.argv[1], sys.argv[2],
     intro=('Your 3-month<br><em>vacation:</em>', 1.6),
     captions=[
         {'text': '<small>Week 1</small>Sleep.', 'at': 2.3, 'until': 3.9, 'style': 'pill'},
         {'text': '<small>Week 4</small>Still sleep.', 'at': 4.0, 'until': 5.6, 'style': 'pill'},
         {'text': '<small>Week 12</small>Where did it go?', 'at': 5.7, 'until': 7.5, 'style': 'pill'},
         {'text': 'Free time melts.<br><em>Get paid before<br>it does.</em>', 'at': 7.7, 'until': 9.95},
     ],
     turn='Make this<br>holiday <em>count.</em>',
     # the whole 12 s time-lapse, sped up a touch so the melt finishes as the line lands
     start=0.0, speed=1.3, cx='0.48', shade='top',
     sounds=[('pop', 2.3), ('pop', 4.0, 880), ('dun', 5.7, 110), ('bonk', 7.7)], ambience='room', cover_at=8.6)
