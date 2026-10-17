# Managed preferences for Antimatter Desktop on macOS

The app reads its policies from the managed preferences of its bundle id, `chat.antimatter.desktop` (CFPreferences),
with the same names as the Windows policies:

| Key | Type | What it does |
|---|---|---|
| `DefaultServerList` | array of dicts with `name` (tab name) and `url` (strings) | Adds servers people can't remove |
| `DefaultUsername` | string; `%USER%` is replaced by the macOS account name | Fills the username on the login page of those servers |
| `EnableServerManagement` | boolean | `false`: people can only use the servers above |
| `EnableAutoUpdater` | boolean | `false`: never check for new versions |
| `TrustedEmbeddedMediaOrigins` | array of dicts with `serverOrigin` and `embeddedOrigin` (strings) | Camera and microphone permissions for embedded content |

The app reads them when it starts: restart it after a change.

## With an MDM (Jamf, Intune, Kandji, Mosyle...)

`antimatter.mobileconfig` is an example configuration profile. Edit the values, give it your own
`PayloadIdentifier` and `PayloadUUID` values (`uuidgen` makes new UUIDs), and upload it as a custom profile. Most MDMs
also take the keys alone, as a "preference domain" or "custom settings" payload for `chat.antimatter.desktop`: use
the content of `example-managed-preferences.plist` for that.

## On a test Mac, without an MDM

1. Copy the plist into Managed Preferences, named after the bundle id:

   ```bash
   sudo cp example-managed-preferences.plist "/Library/Managed Preferences/chat.antimatter.desktop.plist"
   sudo chmod 644 "/Library/Managed Preferences/chat.antimatter.desktop.plist"
   ```

2. Restart the Antimatter desktop app.

To undo it: `sudo rm "/Library/Managed Preferences/chat.antimatter.desktop.plist"`. (macOS may remove files it didn't
install there itself; a profile is the reliable way.)

The bundle id comes from `appId` in `electron-builder.ts`. The Mattermost desktop app's managed preferences
(`com.mattermost.desktop`) aren't read: move them to the Antimatter domain.
