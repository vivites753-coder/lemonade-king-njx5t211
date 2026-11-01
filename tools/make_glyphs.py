"""Fetch the Phosphor icons the game uses (MIT, @phosphor-icons/core 2.1.1) and write src/ui/glyphs.ts.

Usage (from lemonade-king/): python tools/make_glyphs.py src/ui/glyphs.ts <a folder for the downloaded files>
Add a name of ours to ICONS (the icon from https://phosphoricons.com and its weight), run it, use gi("name").
"""
import os
import re
import sys
import urllib.request

VERSION = '2.1.1'
# our name: (phosphor name, weight)
ICONS = {
    'clock': ('clock', 'fill'),
    'alarm': ('alarm', 'fill'),
    'hourglass': ('hourglass-medium', 'fill'),
    'timer': ('timer', 'fill'),
    'check': ('check-circle', 'fill'),
    'tick': ('check', 'bold'),
    'lock': ('lock-simple', 'fill'),
    'unlock': ('lock-simple-open', 'fill'),
    'bulb': ('lightbulb', 'fill'),
    'map': ('map-trifold', 'fill'),
    'users': ('users-three', 'fill'),
    'user': ('user', 'fill'),
    'hammer': ('hammer', 'fill'),
    'wrench': ('wrench', 'fill'),
    'toolbox': ('toolbox', 'fill'),
    'star': ('star', 'fill'),
    'store': ('storefront', 'fill'),
    'truck': ('truck', 'fill'),
    'cart': ('shopping-cart', 'fill'),
    'bag': ('shopping-bag', 'fill'),
    'package': ('package', 'fill'),
    'coins': ('coins', 'fill'),
    'money': ('money', 'fill'),
    'tag': ('tag', 'fill'),
    'warning': ('warning', 'fill'),
    'info': ('info', 'fill'),
    'question': ('question', 'fill'),
    'x': ('x', 'bold'),
    'plus': ('plus', 'bold'),
    'minus': ('minus', 'bold'),
    'arrow-right': ('arrow-right', 'bold'),
    'arrow-left': ('arrow-left', 'bold'),
    'back': ('arrow-u-up-left', 'bold'),
    'undo': ('arrow-counter-clockwise', 'bold'),
    'refresh': ('arrows-clockwise', 'bold'),
    'sun': ('sun', 'fill'),
    'moon': ('moon', 'fill'),
    'sunrise': ('sun-horizon', 'fill'),
    'home': ('house', 'fill'),
    'calendar': ('calendar-blank', 'fill'),
    'trend-up': ('chart-line-up', 'fill'),
    'trend-down': ('chart-line-down', 'fill'),
    'chart': ('chart-bar', 'fill'),
    'gift': ('gift', 'fill'),
    'heart': ('heart', 'fill'),
    'smile': ('smiley', 'fill'),
    'sad': ('smiley-sad', 'fill'),
    'angry': ('smiley-angry', 'fill'),
    'meh': ('smiley-meh', 'fill'),
    'bed': ('bed', 'fill'),
    'music': ('music-notes', 'fill'),
    'sound': ('speaker-high', 'fill'),
    'mute': ('speaker-slash', 'fill'),
    'gear': ('gear-six', 'fill'),
    'door': ('door-open', 'fill'),
    'globe': ('globe-hemisphere-east', 'fill'),
    'save': ('floppy-disk', 'fill'),
    'download': ('download-simple', 'bold'),
    'upload': ('upload-simple', 'bold'),
    'trash': ('trash', 'fill'),
    'book': ('book-open', 'fill'),
    'gamepad': ('game-controller', 'fill'),
    'hand': ('hand-palm', 'fill'),
    'eye': ('eye', 'fill'),
    'eye-off': ('eye-slash', 'fill'),
    'pause': ('pause', 'fill'),
    'play': ('play', 'fill'),
    'ff': ('fast-forward', 'fill'),
    'skip': ('skip-forward', 'fill'),
    'battery': ('battery-high', 'fill'),
    'text': ('text-aa', 'fill'),
    'sliders': ('sliders-horizontal', 'fill'),
    'fullscreen': ('corners-out', 'bold'),
    'gauge': ('gauge', 'fill'),
    'bug': ('bug', 'fill'),
    'dice': ('dice-five', 'fill'),
    'clipboard': ('clipboard-text', 'fill'),
    'broom': ('broom', 'fill'),
    'receipt': ('receipt', 'fill'),
    'news': ('newspaper', 'fill'),
    'pin': ('map-pin', 'fill'),
    'grad': ('graduation-cap', 'fill'),
    'briefcase': ('briefcase', 'fill'),
    'palette': ('palette', 'fill'),
    'tap': ('hand-tap', 'fill'),
    'drop': ('drop', 'fill'),
    'snow': ('snowflake', 'bold'),
    'bolt': ('lightning', 'fill'),
    'sparkle': ('sparkle', 'fill'),
    'scales': ('scales', 'fill'),
    'ban': ('prohibit', 'bold'),
    'walk': ('person-simple-walk', 'fill'),
    'run': ('person-simple-run', 'fill'),
    'thumbs': ('thumbs-up', 'fill'),
    'wave': ('hand-waving', 'fill'),
    'chat': ('chat-circle-dots', 'fill'),
    'thermo': ('thermometer', 'fill'),
    'party': ('confetti', 'fill'),
    'mic': ('microphone-stage', 'fill'),
    'train': ('train', 'fill'),
    'bus': ('bus', 'fill'),
    'barricade': ('barricade', 'fill'),
    'flyer': ('file-text', 'fill'),
    'pot': ('cooking-pot', 'fill'),
    'card': ('credit-card', 'fill'),
    'signal': ('broadcast', 'fill'),
    'radius': ('circles-three', 'fill'),
    'rocket': ('rocket-launch', 'fill'),
    'crown': ('crown-simple', 'fill'),
    'medal': ('medal', 'fill'),
    'plug': ('plug', 'fill'),
    'percent': ('percent', 'bold'),
    'cup': ('pint-glass', 'fill'),
    'paw': ('paw-print', 'fill'),
    'smiley-x': ('smiley-x-eyes', 'fill'),
    'hand-coins': ('hand-coins', 'fill'),
    'list': ('list-checks', 'fill'),
    'family': ('users', 'fill'),
    'baby': ('baby', 'fill'),
    'puzzle': ('puzzle-piece', 'fill'),
    'copy': ('copy', 'fill'),
    'chevron-down': ('caret-down', 'bold'),
    'chevron-up': ('caret-up', 'bold'),
    'fist': ('hand-fist', 'fill'),
}

ALLOWED = re.compile(r'^<svg [^>]*viewBox="0 0 256 256"[^>]*>((?:<(?:path|rect|circle|line|polyline|polygon|ellipse)\b[^<>]*/>)+)</svg>\s*$')


def main(out_path, cache):
    os.makedirs(cache, exist_ok=True)
    rows = []
    for name, (ph, weight) in ICONS.items():
        file = f'{ph}.svg' if weight == 'regular' else f'{ph}-{weight}.svg'
        local = os.path.join(cache, f'{weight}_{file}')
        if not os.path.exists(local):
            url = f'https://cdn.jsdelivr.net/npm/@phosphor-icons/core@{VERSION}/assets/{weight}/{file}'
            with urllib.request.urlopen(url, timeout=30) as r:
                data = r.read().decode('utf-8')
            with open(local, 'w', encoding='utf-8') as f:
                f.write(data)
        svg = open(local, encoding='utf-8').read().strip()
        m = ALLOWED.match(svg)
        if not m:
            raise SystemExit(f'unexpected svg for {name}: {svg[:200]}')
        inner = m.group(1)
        rows.append(f"  '{name}': '{inner}',")
    head = (
        '// Small interface icons (glyphs) drawn as SVG in the colour of the text: what the game used emoji for.\n'
        '// From Phosphor Icons (https://phosphoricons.com), @phosphor-icons/core ' + VERSION + ', MIT License,\n'
        '// Copyright (c) 2023 Phosphor Icons (the licence text: src/ui/glyphs.LICENSE.txt).\n'
        '// Made by a script from the icon files: a name of ours → the shapes of its 256×256 picture.\n'
        'export const GLYPHS = {\n'
    )
    with open(out_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(head + '\n'.join(rows) + '\n} as const;\n\nexport type GlyphName = keyof typeof GLYPHS;\n')
    print(len(rows), 'glyphs')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
