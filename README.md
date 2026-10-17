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
* Managed deployments: servers, username, server management and update checks set by Group Policy, Intune, SCCM,
  macOS MDM profiles or a Linux policy file (see [Deploying in a company](#deploying-in-a-company))

## Install

Download the installer for your system from the
[releases page](https://github.com/AntimatterChat/desktop-app/releases), run it, then enter the URL of your
Antimatter server on the first launch (for example `https://chat.example.com`).

- **Windows** (x64 and arm64): the `.exe` installer (for your account, no administrator rights needed: the one to
  pick), the `.msi` package (for every user of the computer, for companies: see
  [Deploying in a company](#deploying-in-a-company)), or the `.zip` archive.
- **macOS**: the `.dmg` disk image (`universal`, or `arm64` for Apple silicon and `x64` for Intel Macs), or the `.zip`.
- **Linux** (x64 and arm64): see below.

The builds are **not signed** yet. On Windows, SmartScreen warns about an unknown publisher: choose **More info**,
then **Run anyway**. On macOS the app is signed ad hoc but not notarised, so macOS blocks it the first time. On
macOS 15 and later, try to open it once, then go to **System Settings** › **Privacy & Security** and click **Open
Anyway** next to the message about Antimatter. On older versions, Control-click the app, then choose **Open**. You
can also run `xattr -dr com.apple.quarantine /Applications/Antimatter.app` instead.
Every release has a `SHA256SUMS` file to check the downloads against (`sha256sum -c SHA256SUMS --ignore-missing`).

### Linux

- Debian, Ubuntu: `sudo apt install ./antimatter-desktop_<version>-1_amd64.deb`
- Fedora, RHEL, openSUSE: `sudo dnf install ./antimatter-desktop-<version>-linux-x86_64.rpm`
- Any distribution: the `.AppImage` (make it executable and run it), the Flatpak bundle
  (`flatpak install antimatter-desktop-<version>-linux-x86_64.flatpak`), or the `.tar.gz` archive (extract it, then
  run `create_desktop_file.sh` to add a launcher, as its `README.md` explains).

### Updates

The app checks the latest release on GitHub (the `latest.txt` file attached to it) and offers to download the new
version: on Windows the `.exe` installer, which updates your copy in place. Turn it off in Settings, or for everyone
with the `EnableAutoUpdater` policy. It only sees full releases: prereleases (such as `1.2.0-rc.1`) are never offered,
so install one by hand to try it.

A copy installed with the `.msi` package doesn't check for updates: its users usually can't install software, and the
administrator deploys the new versions. Setting the `EnableAutoUpdater` policy to 1 turns the checks on for it (the
download is then the `.msi`).

## Deploying in a company

The `.msi` package installs the app for every user of a computer, in `C:\Program Files\Antimatter`, which suits
SCCM (Configuration Manager), Intune and Group Policy software installation. The app can be configured centrally:
the servers, a username to prefill, whether people can add servers of their own, and the update checks.

### The settings

| Policy | Windows registry value (`HKLM` or `HKCU\SOFTWARE\Policies\Antimatter`) | macOS and Linux key | What it does |
|---|---|---|---|
| Servers | `DefaultServerList` subkey: one string value per server, name = tab name, data = URL | `DefaultServerList`: array of `{name, url}` | Adds servers people can't remove |
| Username to prefill | `DefaultUsername` (string) | `DefaultUsername` (string) | Fills the username on the login page of those servers |
| Server management | `EnableServerManagement` (DWORD 0 or 1) | `EnableServerManagement` (boolean) | 0 / `false`: people can only use the servers set by policy |
| Update checks | `EnableAutoUpdater` (DWORD 0 or 1) | `EnableAutoUpdater` (boolean) | 0 / `false`: never check for new versions; 1 / `true`: check, even for an MSI install |
| Trusted embedded media | `TrustedEmbeddedMediaOrigins` subkey: JSON strings | `TrustedEmbeddedMediaOrigins`: array of `{serverOrigin, embeddedOrigin}` | Camera and microphone permissions for embedded content |

- **The username** is only filled on the login page of the servers set by policy, never on a server people added,
  and never over what someone typed. Environment variables between percent signs are replaced, so one value fits
  everyone: `%USERNAME%` (Windows) or `%USER%` (macOS, Linux) gives the account name, and
  `%USERNAME%@example.com` an email address that follows that pattern. If a variable isn't set, nothing is filled.
- On Windows, a machine policy (`HKLM`) wins over a user policy (`HKCU`); server lists from both are combined.
- Policies set for the Mattermost desktop app, under `SOFTWARE\Policies\Mattermost`, keep working, but the app falls
  back to them place by place, not setting by setting. The three places are the values directly under the key
  (`DefaultUsername`, `EnableServerManagement`, `EnableAutoUpdater`), the `DefaultServerList` subkey and the
  `TrustedEmbeddedMediaOrigins` subkey. The app reads a place from the Mattermost key only when that place is empty
  under the Antimatter key in both `HKLM` and `HKCU`. So one value directly under the Antimatter key, in either hive,
  hides all the values directly under the Mattermost key: when you start setting Antimatter policies, move the
  others across too.
- The app reads the policies when it starts: restart it after a change.

### Windows: Group Policy and Intune

The administrative templates are in [`resources/windows/gpo`](resources/windows/gpo) (and in the `gpo` folder of the
installed app): copy `antimatter.admx` and `en-US/antimatter.adml` to the domain's central store
(`\\<domain>\SYSVOL\<domain>\Policies\PolicyDefinitions`), then find the policies under **Administrative
Templates** > **Antimatter**, in the computer or the user configuration. In Intune, import them in **Devices** >
**Configuration** > **Import ADMX**, then create a profile from the imported template.
[`example-policies.reg`](resources/windows/gpo/example-policies.reg) sets the same values from a script.

### Windows: silent install with the MSI (SCCM, Intune, scripts)

The MSI takes public properties that write the same machine policies (`HKLM\SOFTWARE\Policies\Antimatter`):

```powershell
msiexec /i antimatter-desktop-<version>-win-x64.msi /qn SERVERURL=https://chat.example.com SERVERNAME=Chat DEFAULTUSERNAME='%USERNAME%' AUTOUPDATE=0 SERVERMANAGEMENT=0
```

| Property | Writes | Default |
|---|---|---|
| `SERVERURL` | a server in `DefaultServerList` | none |
| `SERVERNAME` | the name of its tab | `Antimatter` |
| `DEFAULTUSERNAME` | `DefaultUsername`; pass `%USERNAME%` as is, the app replaces it for each person (single quotes in PowerShell, `%%USERNAME%%` in a `.bat` file, so the shell running the install doesn't replace it with its own account) | none |
| `AUTOUPDATE` | `EnableAutoUpdater` (0 or 1) | not set: an MSI install doesn't check for updates |
| `SERVERMANAGEMENT` | `EnableServerManagement` (0 or 1) | not set: people can add servers |

A property that isn't given writes nothing, so it doesn't override Group Policy. Uninstalling the MSI removes the
values it wrote, and so does upgrading it: give the same properties to every version's install (SCCM and Intune keep
the command line of the deployment), or set the policies with Group Policy or Intune instead. To uninstall:
`msiexec /x antimatter-desktop-<version>-win-x64.msi /qn`. Installing the MSI removes the `.exe` copy of the user
running the install, if there is one.

The Intune "Windows app (Win32)" type takes the same command line; for the "Line-of-business app" type, add the
properties to its command-line arguments.

### macOS: MDM

The app reads the managed preferences of its bundle id, `chat.antimatter.desktop`, with the keys above.
[`resources/mac/mdm/antimatter.mobileconfig`](resources/mac/mdm/antimatter.mobileconfig) is an example profile for
Jamf, Intune, Kandji and the others; most of them also take the keys alone as a custom settings payload for
`chat.antimatter.desktop` ([`example-managed-preferences.plist`](resources/mac/mdm/example-managed-preferences.plist)).

### Linux: policy file

The app reads `/etc/antimatter-desktop/policies.json`, with the keys above
([example](resources/linux/policies.example.json)). Deploy it with Ansible, Puppet or any configuration tool, owned by
root and readable by everyone. The Flatpak needs to see the host's `/etc`:
`sudo flatpak override --system --filesystem=host-etc:ro chat.antimatter.desktop`. See
[`resources/linux`](resources/linux/README.md).

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
