#!/bin/bash
set -eu

# Requires sha256sum, on osx you can do
# brew install coreutils

function print_link {
  local NAME="${1}"
  local URL="${BASE_URL}/${NAME}"
  echo "- ${URL}"
  if [ -f "${DIST_DIR}/${NAME}" ]; then
    local CHECKSUM="$(sha256sum "${DIST_DIR}/${NAME}" | awk '{print $1}')"
    echo "  - SHA-256 Checksum: \`${CHECKSUM}\`"
  fi
}

VERSION="$1" # such as 3.7.1, 4.0.0-rc1
DIST_DIR="${2:-./ghr-dist}" # the release files, to compute their checksums
BASE_URL="https://github.com/AntimatterChat/desktop-app/releases/download/v${VERSION}"

cat <<-MD
### Antimatter Desktop v${VERSION}

The download links can be found below.

#### Windows - installer files
$(print_link "antimatter-desktop-${VERSION}-win-x64.msi")
$(print_link "antimatter-desktop-${VERSION}-win-arm64.msi")

#### Windows - zip files
$(print_link "antimatter-desktop-${VERSION}-win-x64.zip")
$(print_link "antimatter-desktop-${VERSION}-win-arm64.zip")

#### Mac
$(print_link "antimatter-desktop-${VERSION}-mac-universal.dmg")
$(print_link "antimatter-desktop-${VERSION}-mac-x64.dmg")
$(print_link "antimatter-desktop-${VERSION}-mac-arm64.dmg")

#### Linux
$(print_link "antimatter-desktop-${VERSION}-linux-arm64.tar.gz")
$(print_link "antimatter-desktop-${VERSION}-linux-x64.tar.gz")

#### Linux (Unofficial) - deb files
$(print_link "antimatter-desktop_${VERSION}-1_arm64.deb")
$(print_link "antimatter-desktop_${VERSION}-1_amd64.deb")

#### Linux (Unofficial) - rpm files (beta)
$(print_link "antimatter-desktop-${VERSION}-linux-aarch64.rpm")
$(print_link "antimatter-desktop-${VERSION}-linux-x86_64.rpm")

#### Linux (Unofficial) - AppImage files
$(print_link "antimatter-desktop-${VERSION}-linux-arm64.AppImage")
$(print_link "antimatter-desktop-${VERSION}-linux-x86_64.AppImage")

#### Linux (Unofficial) - flatpak files (beta)
$(print_link "antimatter-desktop-${VERSION}-linux-aarch64.flatpak")
$(print_link "antimatter-desktop-${VERSION}-linux-x86_64.flatpak")
MD
