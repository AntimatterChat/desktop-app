# Group Policy templates for Antimatter Desktop

`antimatter.admx` and `en-US/antimatter.adml` are the administrative templates of the Antimatter desktop app, for
Group Policy and Intune. They set values under `HKLM\SOFTWARE\Policies\Antimatter` (computer configuration) or
`HKCU\SOFTWARE\Policies\Antimatter` (user configuration). The installed app also has them, in its `gpo` folder.

| Policy | Registry value | What it does |
|---|---|---|
| Servers | `DefaultServerList` subkey, one string value per server: name = tab name, data = URL | Adds servers people can't remove |
| Username to prefill | `DefaultUsername` (string, `%USERNAME%` and other variables are replaced) | Fills the username on the login page of those servers |
| Let people add and remove servers | `EnableServerManagement` (DWORD 0 or 1) | 0: only the servers above |
| Notify about new versions | `EnableAutoUpdater` (DWORD 0 or 1) | 0: never check for updates; 1: check, even for an MSI install |
| Trusted embedded media origins | `TrustedEmbeddedMediaOrigins` subkey, JSON strings | Camera and microphone permissions for embedded content |

A machine policy wins over a user policy. Server lists from both are combined.

Policies set for the Mattermost desktop app, under `SOFTWARE\Policies\Mattermost`, keep working, but the app falls back
to them place by place, not setting by setting. The three places are the values directly under the key
(`DefaultUsername`, `EnableServerManagement`, `EnableAutoUpdater`), the `DefaultServerList` subkey and the
`TrustedEmbeddedMediaOrigins` subkey. The app reads a place from the Mattermost key only when that place is empty under
the Antimatter key in both `HKLM` and `HKCU`. So one value directly under the Antimatter key, in either hive, hides all
the values directly under the Mattermost key: when you start setting Antimatter policies, move the others across too.

`example-policies.reg` sets the same values without Group Policy (`reg import example-policies.reg`, as an
administrator), for a test machine or a deployment script.

## Group Policy (domain)

1. Copy `antimatter.admx` to the central store, `\\<domain>\SYSVOL\<domain>\Policies\PolicyDefinitions`, and
   `en-US\antimatter.adml` to its `en-US` folder (or, on a single computer, to `C:\Windows\PolicyDefinitions`).
2. In the Group Policy Management Editor, open **Computer Configuration** (or **User Configuration**) >
   **Policies** > **Administrative Templates** > **Antimatter**.
3. Edit a policy, choose **Enabled**, and fill it in. For **Servers**, click **Show** and add one line per server:
   the value name is the tab name, the value is the server URL (`https://chat.example.com`).

## Intune

**Devices** > **Configuration** > **Import ADMX**: import `antimatter.admx` with `en-US\antimatter.adml`, then create
a profile from **Templates** > **Imported Administrative templates** and set the Antimatter policies.

## A single computer

`gpedit.msc` (Windows Pro and Enterprise) shows the templates once they are in `C:\Windows\PolicyDefinitions`. Windows
Home has no `gpedit.msc`: use `example-policies.reg`, or the open source [Policy Plus](https://github.com/Fleex255/PolicyPlus).

Restart the app after a policy change: it reads the policies when it starts.
