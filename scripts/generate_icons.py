#!/usr/bin/env python3
# Copyright (c) 2026-present Antimatter contributors. All Rights Reserved.
# See LICENSE.txt for license information.

"""
Renders every icon of the desktop app from the SVG sources in resources/brand:
the app icon (ICO, ICNS, PNG sets), the tray icons of each platform (with their unread and
mention states) and the DMG background.

Requires rsvg-convert (librsvg) and ImageMagick 7 (`magick`). Run from the repository root:

    python3 scripts/generate_icons.py
"""

import os
import struct
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, 'resources', 'brand')
ASSETS = os.path.join(ROOT, 'src', 'assets')

INK = '#1B1A24'
WHITE = '#FFFFFF'
MENTION = '#D24B4E'
UNREAD = '#8B5CF6'

TRAY_STAR = 'M32 23.5Q33.4 30.6 40.5 32Q33.4 33.4 32 40.5Q30.6 33.4 23.5 32Q30.6 30.6 32 23.5Z'


def tray_svg(color, badge=None):
    """A single-colour version of the mark, with thicker strokes and a smaller star so that it reads at 16px.

    The badge (if any) is cut out of the mark, with a gap around it.
    """
    badge_mask = ''
    badge_dot = ''
    if badge:
        badge_mask = '<circle cx="50" cy="50" r="16" fill="black"/>'
        badge_dot = f'<circle cx="50" cy="50" r="11.5" fill="{badge}"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
      <rect width="64" height="64" fill="white"/>
      {badge_mask}
    </mask>
  </defs>
  <g mask="url(#cut)">
    <g fill="none" stroke="{color}" stroke-width="5">
      <ellipse cx="32" cy="32" rx="27" ry="10" transform="rotate(45 32 32)"/>
      <ellipse cx="32" cy="32" rx="27" ry="10" transform="rotate(-45 32 32)"/>
    </g>
    <path d="{TRAY_STAR}" fill="{color}"/>
    <circle cx="13" cy="13" r="6.5" fill="{color}"/>
    <circle cx="51" cy="13" r="5" fill="{color}"/>
  </g>
  {badge_dot}
</svg>
'''


def dmg_background_svg():
    """Background of the macOS disk image window (542x353): the app on the left, Applications on the right."""
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 542 353" width="542" height="353">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#241A4D"/>
      <stop offset="1" stop-color="#140E2C"/>
    </linearGradient>
    <radialGradient id="glowV" cx="0.18" cy="0.2" r="0.6">
      <stop offset="0" stop-color="#8B5CF6" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#8B5CF6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowC" cx="0.85" cy="0.85" r="0.55">
      <stop offset="0" stop-color="#22D3EE" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#22D3EE" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="542" height="353" fill="url(#bg)"/>
  <rect width="542" height="353" fill="url(#glowV)"/>
  <rect width="542" height="353" fill="url(#glowC)"/>
  <g fill="none" stroke-width="1.5" opacity="0.18">
    <ellipse cx="271" cy="176" rx="330" ry="110" stroke="#A78BFA" transform="rotate(-18 271 176)"/>
    <ellipse cx="271" cy="176" rx="330" ry="110" stroke="#22D3EE" transform="rotate(18 271 176)"/>
  </g>
  <path d="M248 158h22v-12l26 24-26 24v-12h-22z" fill="#FFFFFF" fill-opacity="0.4"/>
  <rect x="88" y="232" width="94" height="25" rx="5" fill="#FFFFFF" stroke="#1B1238"/>
  <rect x="358" y="232" width="98" height="25" rx="5" fill="#FFFFFF" stroke="#1B1238"/>
</svg>
'''


def render(svg_path, out_path, size, height=None):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(height or size), '-o', out_path, svg_path], check=True)


def write_ico(pngs, out_path):
    subprocess.run(['magick', *pngs, out_path], check=True)


def write_icns(entries, out_path):
    """entries: list of (OSType, png_path). Modern ICNS files can embed PNG data for every type used here."""
    chunks = b''
    for ostype, png in entries:
        with open(png, 'rb') as f:
            data = f.read()
        chunks += ostype.encode('ascii') + struct.pack('>I', len(data) + 8) + data
    with open(out_path, 'wb') as f:
        f.write(b'icns' + struct.pack('>I', len(chunks) + 8) + chunks)


def main():
    app_icon = os.path.join(BRAND, 'app-icon.svg')
    app_icon_mac = os.path.join(BRAND, 'app-icon-mac.svg')

    with tempfile.TemporaryDirectory(dir=ROOT, prefix='.icons-') as tmp:
        def tmp_png(name, svg, size):
            path = os.path.join(tmp, name)
            render(svg, path, size)
            return path

        def tmp_svg(name, content):
            path = os.path.join(tmp, name)
            with open(path, 'w') as f:
                f.write(content)
            return path

        # Windows app icon
        write_ico([tmp_png(f'app-{s}.png', app_icon, s) for s in (256, 128, 64, 48, 32, 24, 16)], os.path.join(ASSETS, 'icon.ico'))

        # macOS app icon
        icns = [
            ('icp4', 16), ('icp5', 32), ('icp6', 64), ('ic07', 128), ('ic08', 256), ('ic09', 512), ('ic10', 1024),
            ('ic11', 32), ('ic12', 64), ('ic13', 256), ('ic14', 512),
        ]
        write_icns([(t, tmp_png(f'mac-{s}.png', app_icon_mac, s)) for t, s in icns], os.path.join(ASSETS, 'icon.icns'))

        # PNG app icons: notifications, Linux window icon, Linux icon set (desktop entry, packages)
        render(app_icon, os.path.join(ASSETS, 'appicon_48.png'), 48)
        spaced = tmp_png('app-28.png', app_icon, 28)
        subprocess.run(['magick', spaced, '-background', 'none', '-gravity', 'center', '-extent', '32x32',
                        os.path.join(ASSETS, 'appicon_with_spacing_32.png')], check=True)
        render(app_icon, os.path.join(ASSETS, 'linux', 'app_icon.png'), 512)
        for s in (16, 24, 32, 48, 64, 128, 256, 512, 1024):
            render(app_icon, os.path.join(ASSETS, 'icons', f'{s}x{s}.png'), s)

        # Tray icons. "dark" icons are drawn in ink for light panels, "light" ones in white for dark panels.
        variants = {
            '': None,
            '_unread': UNREAD,
            '_mention': MENTION,
        }
        for theme, color in (('dark', INK), ('light', WHITE)):
            for suffix, badge in variants.items():
                svg = tmp_svg(f'tray-{theme}{suffix}.svg', tray_svg(color, badge))

                # Linux
                render(svg, os.path.join(ASSETS, 'linux', f'top_bar_{theme}{suffix}_16.png'), 16)
                render(svg, os.path.join(ASSETS, 'linux', f'top_bar_{theme}{suffix}_16@2x.png'), 32)

                # Windows
                sizes = (16, 20, 24, 32, 40, 48, 64)
                write_ico([tmp_png(f'win-{theme}{suffix}-{s}.png', svg, s) for s in sizes],
                          os.path.join(ASSETS, 'windows', f'tray_{theme}{suffix}.ico'))

        # macOS menu bar template images: black and alpha only, the system tints them.
        for name, badge in (('MenuIcon', None), ('MenuIconUnread', '#000000')):
            svg = tmp_svg(f'{name}.svg', tray_svg('#000000', badge))
            for s in (16, 20, 24, 32):
                render(svg, os.path.join(ASSETS, 'osx', 'menuIcons', f'{name}{s}Template.png'), s)
                render(svg, os.path.join(ASSETS, 'osx', 'menuIcons', f'{name}{s}Template@2x.png'), s * 2)

        # DMG background
        render(tmp_svg('dmg.svg', dmg_background_svg()), os.path.join(ASSETS, 'osx', 'DMG_BG.png'), 542, 353)


if __name__ == '__main__':
    main()
