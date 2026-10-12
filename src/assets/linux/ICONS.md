## Icons

The icons of the app are rendered from the SVG sources in `resources/brand` (the Antimatter mark and the app icon)
by `scripts/generate_icons.py`: the app icon for every platform (ICO, ICNS, the PNG set in `src/assets/icons`), the
tray icons with their unread and mention states, and the macOS DMG background. Edit the sources or the script, then
run `python3 scripts/generate_icons.py` from the repository root (it needs `rsvg-convert` and ImageMagick's `magick`).
