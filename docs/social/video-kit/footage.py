"""Footage version of the kit: a real video clip underneath, the kit's captions and "Earned." ending on top.
make_footage(name, clip, outdir, start=, speed=, cx=, ...) builds:
  1. base.mp4: the clip trimmed from `start`, sped/slowed by `speed`, cropped to 9:16 around `cx` (0-1 across the frame,
     or an ffmpeg expression in t for a moving crop), scaled to 1080x1920, lightly graded, and held so it fills 13.5 s
     (the footage shows from 1.4 s; the kit's black intro and green ending cover the rest);
  2. overlay PNGs with transparency (the kit page with no photo);
  3. the composite, with the kit's generated sound plus, optionally, the clip's own audio kept quiet.
Pexels clips are downloaded via https://www.pexels.com/download/video/<id>/ (see CREDITS.md)."""
import pathlib, subprocess
from kit import DUR, HERE, page, sound

SHOW_FROM = 1.4                     # footage visible from here (the intro covers 0-1.6)
SHOW_FOR = 10.3 - SHOW_FROM         # until the green ending fully covers it

def run(*a): subprocess.run([str(x) for x in a], check=True)

def make_footage(name, clip, outdir, *, intro, captions, turn, start=0.0, speed=1.0, cx='0.5', grade=True,
                 clip_audio=0.0, sounds=(), ambience='room', cover_at=8.5, **look):
    out = pathlib.Path(outdir); out.mkdir(parents=True, exist_ok=True)
    src_len = SHOW_FOR * speed       # seconds of source needed
    # crop: 9:16 window, centred on cx (a number or an expression in t, seconds of the trimmed clip)
    xexpr = f"max(0,min(iw-ow,({cx})*iw-ow/2))"
    vf = [f"setpts=(PTS-STARTPTS)/{speed}", "fps=30", f"crop=w=ih*9/16:h=ih:x='{xexpr}':y=0", "scale=1080:1920:flags=lanczos"]
    if grade: vf.append("eq=contrast=1.05:saturation=0.92,colorbalance=gs=0.04:gm=0.03:bs=-0.02")
    vf.append(f"tpad=start_duration={SHOW_FROM}:start_mode=clone:stop_duration={DUR}:stop_mode=clone,trim=0:{DUR},setpts=PTS-STARTPTS")
    base = out / 'base.mp4'
    run('ffmpeg', '-y', '-loglevel', 'error', '-ss', start, '-t', round(src_len + 0.2, 2), '-i', clip, '-an', '-vf', ','.join(vf),
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '16', '-pix_fmt', 'yuv420p', base)
    # captions on a transparent page
    (out / 'page.html').write_text(page(None, intro, captions, turn, **look))
    fd = out / 'frames'; fd.mkdir(exist_ok=True)
    run('node', HERE / 'render.cjs', out / 'page.html', fd, 30, DUR, 'alpha')
    sound(sounds, ambience, fd / 'fx.wav')
    audio_inputs, amix = ['-i', fd / 'fx.wav'], '[2:a]anull[a]'
    if clip_audio:   # the clip's own sound, quiet, only while the footage shows
        ca = fd / 'clip.wav'
        run('ffmpeg', '-y', '-loglevel', 'error', '-ss', start, '-t', round(src_len, 2), '-i', clip, '-vn',
            '-af', f"atempo={min(2.0, max(0.5, speed))},volume={clip_audio},afade=t=in:d=0.5,afade=t=out:st={max(0, SHOW_FOR - 0.6):.2f}:d=0.6,adelay={int(SHOW_FROM * 1000)}|{int(SHOW_FROM * 1000)},apad=whole_dur={DUR},atrim=0:{DUR}",
            '-ar', '44100', '-ac', '2', ca)
        audio_inputs += ['-i', ca]; amix = '[2:a][3:a]amix=inputs=2:normalize=0,alimiter=limit=0.8[a]'
    mp4 = out / f'{name}.mp4'
    run('ffmpeg', '-y', '-loglevel', 'error', '-i', base, '-framerate', 30, '-i', fd / 'f%04d.png', *audio_inputs,
        '-filter_complex', f'[0:v][1:v]overlay=0:0:format=auto[v];{amix}', '-map', '[v]', '-map', '[a]',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '160k', '-t', DUR, mp4)
    run('ffmpeg', '-v', 'error', '-y', '-ss', cover_at, '-i', mp4, '-frames:v', '1', out / 'cover.png')
    return mp4

