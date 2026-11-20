"""Snail video on real footage (Pexels video 2467471). usage: python3 snail_footage.py CLIP.mp4 OUTDIR"""
import sys
from footage import make_footage
make_footage('gigotter-earned-snail-footage', sys.argv[1], sys.argv[2],
     intro=('Me: <em>*asks uncle<br>for money*</em>', 1.6),
     captions=[
         {'text': 'Uncle:<br><em>“Let me see<br>what I can do.”</em>', 'at': 2.0, 'until': 4.3},
         {'text': '<small>Day 1</small>Still waiting…', 'at': 4.5, 'until': 5.5, 'style': 'pill'},
         {'text': '<small>Day 11</small>Still waiting…', 'at': 5.6, 'until': 6.6, 'style': 'pill'},
         {'text': '<small>Day 23</small>Still waiting…', 'at': 6.7, 'until': 7.7, 'style': 'pill'},
         {'text': 'Response time:<br><em>3–5 business<br>weeks.</em>', 'at': 7.9, 'until': 9.95},
     ],
     turn='Or just…<br><em>earn it.</em>',
     # the snail crosses from right to left: the crop pans with it (t = seconds into the footage)
     start=1.0, speed=1.3, cx='0.98-0.105*t', shade='top',
     sounds=[('tick', 4.5), ('tick', 5.6), ('tick', 6.7), ('bonk', 7.9)], ambience='room', cover_at=8.6)
