"""Hourglass video on real footage (Pexels video 5562657). usage: python3 hourglass_footage.py CLIP.mp4 OUTDIR"""
import sys
from footage import make_footage
make_footage('gigotter-earned-hourglass-footage', sys.argv[1], sys.argv[2],
     intro=('Lecture’s<br><em>over.</em>', 1.6),
     captions=[
         {'text': '<small>Free time</small>4pm to 10pm.', 'at': 2.3, 'until': 3.9, 'style': 'pill'},
         {'text': '<small>Spent on</small>Scrolling.', 'at': 4.0, 'until': 5.6, 'style': 'pill'},
         {'text': '<small>Earned</small>Nothing.', 'at': 5.7, 'until': 7.5, 'style': 'pill'},
         {'text': 'Your time was<br>never free.<br><em>Start charging<br>for it.</em>', 'at': 7.7, 'until': 9.95},
     ],
     turn='Make your<br>hours <em>pay.</em>',
     start=20.0, speed=1.0, cx='0.5', shade='top',
     sounds=[('tick', 2.3), ('tick', 4.0), ('dun', 5.7, 110), ('bonk', 7.7)], ambience='room', cover_at=8.6)
