"""Installs the generated sounds and music (assets/soundFX, raw MP3s, not in git) into assets/audio, stage by stage.

Usage: python tools/install_audio.py <stage> [<stage> ...]     e.g.  python tools/install_audio.py 1
Needs ffmpeg. For every file of the stage:
  sound effects  -> assets/audio/sfx/<name>.ogg   mono; only the FIRST sound of the file (some files hold two or
                    a second click after a pause); silence before and after cut, a short fade at the end;
                    loudness evened out (RMS of the sound -18 dBFS, peaks under -1 dBFS)
  music, ambience -> assets/audio/music/<name>.ogg stereo; cut before the ending (fade-out or silence) and made into
                    a seamless loop: the last LOOP_X seconds are crossfaded into the loop start, so the player
                    jumps from loopEnd back to loopStart without a seam (written to assets/audio/loops.json)
The raw names may have spaces ("pour_cup _1.mp3"); a name without a number next to numbered ones becomes _1.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np

SRC = 'assets/soundFX'
OUT_SFX = 'assets/audio/sfx'
OUT_MUSIC = 'assets/audio/music'
LOOPS = 'assets/audio/loops.json'
SR = 44100
LOOP_X = 1.5  # seconds of crossfade at the loop seam

# What comes in which stage (most heard first). Music options: end = cut there (s), loop_from = where the loop starts
# again (s, after an intro). Sound options: keep = 'all' keeps every part of the file (a bark twice, a bell twice),
# max = longest length (s; a long tail fades out), stereo = keep both channels (the jingles), loop = the whole file
# made into a seamless loop (its end crossfaded into its start: the mixer motor plays over and over), onset = the
# sound starts where it comes within this many dB of its peak (a quiet rustle before the sound itself is cut).
STAGES = {
    1: {
        'sfx': ['coin_1', 'coin_2', 'coin_3', 'pour_cup_1', 'pour_cup_2', 'pour_cup_3', 'ui_tap_1', 'buy', ('ui_error', {'max': 1.0})],
        'music': {'music_title': {}, 'music_morning': {}, 'music_sell_sunny': {'end': 108.6, 'loop_from': 3.0}},
    },
    2: {
        'music': {
            'music_kitchen': {},
            'music_sell_cloudy': {},
            'music_sell_rain': {'end': 113.0},
            'music_evening': {'end': 98.2},
            'music_night': {'end': 111.5},
            'music_mall': {'end': 94.0},
            'music_rush': {'loop_from': 2.0},
            'music_thief': {},
            'music_festival': {},
            'music_concert': {},
        },
    },
    3: {
        'sfx': [
            # the kitchen: every tap squeezes, pours or stirs, so the sounds are short
            ('lemon_squeeze_1', {'max': 0.9}),
            ('lemon_squeeze_2', {'max': 0.9}),
            ('sugar_pour', {'max': 0.9, 'onset': 12}),
            ('stir_spoon_1', {'max': 0.6}),
            ('stir_spoon_2', {'max': 0.6}),
            ('mixer_start', {'max': 0.7}),
            ('mixer_loop', {'loop': True}),
            ('ice_clink', {'max': 0.8}),
            'mixer_perfect',
            'mixer_over',
            'jug_ready',
            'pick_item',
            'drop_item',
            # the pouring mini-game: the cup overflows
            ('spill', {'max': 1.0}),
            # the jingles of the day (the music gets quieter under them)
            ('jingle_day_start', {'stereo': True, 'keep': 'all'}),
            ('jingle_profit', {'stereo': True, 'keep': 'all'}),
            ('jingle_loss', {'stereo': True, 'keep': 'all'}),
            ('jingle_rep_up', {'stereo': True, 'keep': 'all'}),
            ('jingle_unlock', {'stereo': True, 'keep': 'all'}),
            ('jingle_king', {'stereo': True, 'keep': 'all'}),
        ],
    },
}


def clean(name: str) -> str:
    return re.sub(r'\s+', '', name)


def sources() -> dict:
    """Clean name -> raw file; a plain name that also has numbered brothers becomes <name>_1."""
    raw = {clean(os.path.splitext(f)[0]): f for f in os.listdir(SRC) if f.lower().endswith(('.mp3', '.wav', '.ogg'))}
    out = dict(raw)
    for n in raw:
        if not re.search(r'_\d+$', n) and any(re.fullmatch(re.escape(n) + r'_\d+', m) for m in raw):
            out[n + '_1'] = raw[n]
            del out[n]
    return out


def decode(path: str, channels: int) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', str(channels), '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, channels).copy()


def encode(x: np.ndarray, path: str, quality: int) -> None:
    ch = x.shape[1]
    subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(ch), '-i', '-', '-c:a', 'libvorbis', '-q:a', str(quality), '-map_metadata', '-1', path],
        input=np.clip(x, -1, 1).astype(np.float32).tobytes(),
        check=True,
    )


def frames_db(x: np.ndarray, win: int) -> np.ndarray:
    mono = x.mean(axis=1)
    n = len(mono) // win
    f = mono[: n * win].reshape(n, win)
    return 20 * np.log10(np.sqrt((f ** 2).mean(axis=1)) + 1e-9)


def sfx(src: str, name: str, opts: dict) -> str:
    x = decode(src, 2 if opts.get('stereo') else 1)
    if opts.get('loop'):
        # the end fades into the start (equal power), and the start is cut: the file then loops without a seam
        n = int(SR * 0.25)
        t = np.linspace(0, np.pi / 2, n)[:, None]
        y = np.concatenate([x[n:-n], x[-n:] * np.cos(t) + x[:n] * np.sin(t)])
        rms = np.sqrt((y ** 2).mean())
        gain = min(10 ** (-18 / 20) / max(rms, 1e-6), 0.89 / max(np.abs(y).max(), 1e-6))
        encode(y * gain, f'{OUT_SFX}/{name}.ogg', 3)
        return f'loop, {len(y) / SR:.2f} s'
    win = SR // 100  # 10 ms
    db = frames_db(x, win)
    on = db > max(db.max() - 40, -55)
    idx = np.where(on)[0]
    # the parts of the file: sounds separated by at least 0.3 s of silence
    parts, s, last = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - last > 30:
            parts.append((s, last + 1))
            s = i
        last = i
    parts.append((s, last + 1))
    a, b = (parts[0][0], parts[-1][1]) if opts.get('keep') == 'all' else parts[0]
    if 'onset' in opts:
        loud = np.where(db[a:b] > db.max() - opts['onset'])[0]
        a = max(a, a + loud[0] - 2)
    start = max(0, a * win - SR // 200)
    end = min(len(x), b * win + int(SR * 0.06))
    if 'max' in opts:
        end = min(end, start + int(opts['max'] * SR))
    y = x[start:end].copy()
    fade = min(len(y) // 4, int(SR * (0.15 if 'max' in opts else 0.03)))
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    y[: SR // 500] *= np.linspace(0, 1, SR // 500)[:, None]
    rms = np.sqrt((y ** 2).mean())
    gain = min(10 ** (-18 / 20) / max(rms, 1e-6), 0.89 / max(np.abs(y).max(), 1e-6))
    encode(y * gain, f'{OUT_SFX}/{name}.ogg', 3)
    return f'{len(parts)} part(s), kept {"all" if opts.get("keep") == "all" else "the first"}, {len(y) / SR:.2f} s'


def music(src: str, name: str, opts: dict) -> tuple[str, dict]:
    x = decode(src, 2)
    win = SR // 2
    db = frames_db(x, win)
    med = np.median(db)
    # the end of the body: before a fade-out or the silence at the end
    if 'end' in opts:
        end = int(opts['end'] * SR)
    else:
        loud = np.where(db > med - 6)[0]
        end = (loud[-1] + 1) * win
    begin = np.where(db > med - 30)[0][0] * win  # silence before the music
    y = x[begin:end].copy()
    loop_from = int(opts.get('loop_from', 0) * SR)
    n = int(LOOP_X * SR)
    # crossfade: the last n samples of the body fade out while the loop start fades in (equal power)
    t = np.linspace(0, np.pi / 2, n)[:, None]
    y[-n:] = y[-n:] * np.cos(t) + y[loop_from : loop_from + n] * np.sin(t)
    rms = np.sqrt((y ** 2).mean())
    gain = min(10 ** (-18 / 20) / max(rms, 1e-6), 0.89 / max(np.abs(y).max(), 1e-6))
    encode(y * gain, f'{OUT_MUSIC}/{name}.ogg', 3)
    loop = {'loopStart': round((loop_from + n) / SR, 4), 'loopEnd': round(len(y) / SR, 4)}
    return f'{len(y) / SR:.1f} s, loop {loop["loopStart"]}-{loop["loopEnd"]} s', loop


def main() -> None:
    # --only=name1,name2 installs just these files of the stages (a change to one sound)
    only = next((a.split('=', 1)[1].split(',') for a in sys.argv[1:] if a.startswith('--only=')), None)
    stages = [int(a) for a in sys.argv[1:] if not a.startswith('--')] or [1]
    src = sources()
    os.makedirs(OUT_SFX, exist_ok=True)
    os.makedirs(OUT_MUSIC, exist_ok=True)
    loops = json.load(open(LOOPS, encoding='utf-8')) if os.path.exists(LOOPS) else {}
    for st in stages:
        spec = STAGES[st]
        for name in spec.get('sfx', []):
            opts = {}
            if isinstance(name, tuple):
                name, opts = name
            if only and name not in only:
                continue
            print('sfx  ', name.ljust(18), sfx(f'{SRC}/{src[name]}', name, opts))
        for name, opts in spec.get('music', {}).items():
            if only and name not in only:
                continue
            info, loop = music(f'{SRC}/{src[name]}', name, opts)
            loops[name] = loop
            print('music', name.ljust(18), info)
    with open(LOOPS, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(loops, f, indent=2, sort_keys=True)
        f.write('\n')


if __name__ == '__main__':
    main()
