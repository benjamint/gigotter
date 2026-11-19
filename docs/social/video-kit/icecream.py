"""Ice cream video (Pexels 4725724). usage: python3 icecream.py PHOTO.jpg OUTDIR [--page-only]"""
import sys
from kit import make
make('gigotter-earned-icecream', sys.argv[1], sys.argv[2], frames='--page-only' not in sys.argv,
     intro=('Your 3-month<br><em>vacation:</em>', 1.6),
     captions=[
         {'text': '<small>Week 1</small>Sleep.', 'at': 2.3, 'until': 3.9, 'style': 'pill'},
         {'text': '<small>Week 4</small>Still sleep.', 'at': 4.0, 'until': 5.6, 'style': 'pill'},
         {'text': '<small>Week 12</small>Where did it go?', 'at': 5.7, 'until': 7.5, 'style': 'pill'},
         {'text': 'Free time melts.<br><em>Get paid before<br>it does.</em>', 'at': 7.7, 'until': 9.95},
     ],
     turn='Make this<br>holiday <em>count.</em>',
     # slide the photo down so the cone sits below the captions; its top edge fades into the photo's own grey
     pos='50% 50%', origin='50% 60%', zoom=((0, 1.0), (13.5, 1.06)), light=True, shift=420, ground='#E4E4E4',
     sounds=[('pop', 2.3), ('pop', 4.0, 880), ('dun', 5.7, 110), ('bonk', 7.7)],
     ambience='room', cover_at=8.6)
