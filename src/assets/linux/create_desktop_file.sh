#!/bin/sh
set -e

WORKING_DIR=$(pwd)
THIS_PATH=$(readlink -f "$0")
cd "$(dirname "$THIS_PATH")"
FULL_PATH=$(pwd)
cd "$WORKING_DIR"

cat <<EOS > chat.antimatter.desktop.desktop
[Desktop Entry]
Name=Antimatter
Comment=Antimatter Desktop application for Linux
Exec="${FULL_PATH}/chat.antimatter.desktop" %U
Terminal=false
Type=Application
MimeType=x-scheme-handler/antimatter;x-scheme-handler/mattermost;
Icon="${FULL_PATH}/app_icon.png"
Categories=Network;InstantMessaging;
StartupWMClass=chat.antimatter.desktop
EOS

chmod +x chat.antimatter.desktop.desktop
