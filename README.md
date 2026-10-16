# Antimatter Desktop

The desktop app of [Antimatter](https://antimatter.chat), the free, open source team chat you host yourself. It wraps
your Antimatter server's web app in a native window for Windows, macOS and Linux, built on
[Electron](https://www.electronjs.org/).

It is a fork of the [Mattermost Desktop App](https://github.com/mattermost/desktop) (originally created as
"electron-mattermost" by Yuya Ochiai), rebranded, without licence checks and without any Mattermost service: no
telemetry, no Mattermost-hosted links or update feed. It works with Antimatter servers, and with Mattermost servers
from version 9.4.

- Source: [github.com/AntimatterChat/desktop-app](https://github.com/AntimatterChat/desktop-app)
- Bug reports, feature requests and questions: [AntimatterChat/community](https://github.com/AntimatterChat/community)
- Server: [github.com/AntimatterChat/antimatter](https://github.com/AntimatterChat/antimatter)
- Help: [antimatter.chat/help.html](https://antimatter.chat/help.html)
- Documentation: [antimatter.chat/docs/users](https://antimatter.chat/docs/users/index.html#apps)

## Features

* Several servers, each in its own isolated view, with a server dropdown and tabs
* Desktop notifications, with unread and mention badges on the tray and dock icons
* Deep links: `antimatter://` links open in the app (so do the `mattermost://` links people already have)
* Calls and voice rooms with screen sharing, in a dedicated widget window
* Runs in the background, with a tray icon, to reduce the number of open windows
* Administrator policies: Windows group policies and macOS managed preferences (see `resources/windows/gpo` and
  `resources/mac/mdm`)

## Install

Download the installer for your system from the
[releases page](https://github.com/AntimatterChat/desktop-app/releases), run it, then enter the URL of your
Antimatter server on the first launch (for example `https://chat.example.com`).

- **Windows** (x64 and arm64): the `.msi` installer (for all users), the `.exe` installer (for your account only), or
  the `.zip` archive.
- **macOS**: the `.dmg` disk image (`universal`, or `arm64` for Apple silicon and `x64` for Intel Macs), or the `.zip`.
- **Linux** (x64 and arm64): see below.

The builds are **not signed** yet. On Windows, SmartScreen warns about an unknown publisher: choose **More info**,
then **Run anyway**. On macOS the app is signed ad hoc but not notarised: open it the first time with a right-click
(or Control-click) on the app, then **Open**, or run `xattr -dr com.apple.quarantine /Applications/Antimatter.app`.
Every release has a `SHA256SUMS` file to check the downloads against (`sha256sum -c SHA256SUMS --ignore-missing`).

### Linux

- Debian, Ubuntu: `sudo apt install ./antimatter-desktop_<version>-1_amd64.deb`
- Fedora, RHEL, openSUSE: `sudo dnf install ./antimatter-desktop-<version>-linux-x86_64.rpm`
- Any distribution: the `.AppImage` (make it executable and run it), the Flatpak bundle
  (`flatpak install antimatter-desktop-<version>-linux-x86_64.flatpak`), or the `.tar.gz` archive (extract it, then
  run `create_desktop_file.sh` to add a launcher, as its `README.md` explains).

### Updates

The app checks the latest release on GitHub (the `latest.txt` file attached to it) and offers to download the new
version. Turn it off in Settings, or for everyone with the `EnableAutoUpdater` policy.

## Configuration

The settings are in the app (**Settings** in the menu). They are saved in Electron's user data directory:

* `%APPDATA%\Antimatter` on Windows
* `~/Library/Application Support/Antimatter` on macOS
* `~/.config/Antimatter` on Linux

A custom data directory can be given with `--dataDir`:

* `Antimatter.exe --dataDir C:\my-antimatter-data` on Windows
* `open /Applications/Antimatter.app --args --dataDir ~/my-antimatter-data/` on macOS
* `chat.antimatter.desktop --dataDir ~/my-antimatter-data/` on Linux

### Custom builds

`src/common/config/buildConfig.ts` holds the build-time settings: servers to preconfigure, whether people can add
servers, the help link, and the update feed.

## Development

Use Node.js 24 or later, then:

```sh
npm install --allow-git=all  # npm 12 and later refuse git dependencies unless allowed (one dev tool is one)
npm run build                # development build, into dist/
npm start                    # run it
npm run watch                # rebuild and restart on changes
npm run check                # lint, type check, build config check and unit tests
npm run package:linux        # Linux packages, into release/ (also package:windows, package:mac)
```

### Releases

The [release workflow](.github/workflows/release.yml) builds every package on GitHub's runners: pushing a tag
`v<version>` (e.g. `v1.2.0`, or `v1.2.0-rc.1` for a prerelease) publishes them on the GitHub release of that tag, with
`SHA256SUMS` and the `latest.txt` file the app checks for updates. Run by hand from the Actions tab, it builds
everything and keeps the files as workflow artifacts (and, if asked, as a draft prerelease).

The app's icons are rendered from `resources/brand` by `scripts/generate_icons.py` (see `src/assets/linux/ICONS.md`).

## Feedback and support

Found a bug in the desktop app, or missing a feature? Please [open an
issue](https://github.com/AntimatterChat/community/issues/new/choose) in the [Antimatter community
repository](https://github.com/AntimatterChat/community), where the feedback for every part of
Antimatter is gathered. Questions and ideas are welcome in its
[Discussions](https://github.com/AntimatterChat/community/discussions). Please report security
problems privately, as explained in the [security
policy](https://github.com/AntimatterChat/.github/blob/main/SECURITY.md).

## Licence

Apache License 2.0, see `LICENSE.txt`; `NOTICE.txt` lists the open source components the app uses. Copyright
Mattermost, Inc. and Yuya Ochiai for the code this app is based on, and the Antimatter contributors for their changes.
