"""Pigeons video on real footage (Pexels video 16356013). usage: python3 pigeons_footage.py CLIP.mp4 OUTDIR"""
import sys
from footage import make_footage
make_footage('gigotter-earned-pigeons-footage', sys.argv[1], sys.argv[2],
     intro=('Everyone’s fighting<br>for the same <em>crumbs.</em>', 1.6),
     captions=[
         {'text': 'Pocket money.', 'at': 2.6, 'until': 4.0, 'style': 'pill'},
         {'text': 'Leftover transport money.', 'at': 4.1, 'until': 5.6, 'style': 'pill'},
         {'text': '“Something small.”', 'at': 5.7, 'until': 7.3, 'style': 'pill'},
         {'text': 'Stop<br>fighting<br><em>for crumbs.</em>', 'at': 7.6, 'until': 9.95, 'style': 'big'},
     ],
     turn='Get your<br>own <em>bread.</em>',
     # a 5 s slow-motion clip, slowed a little more to fill the middle of the video; keep the real birds, quietly
     start=0.0, speed=0.55, cx='0.42', clip_audio=0.5, shade='both',
     sounds=[('thud', 2.6), ('thud', 4.1), ('thud', 5.7), ('bonk', 7.6)], ambience='outdoor', cover_at=8.6)
