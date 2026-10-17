# Policies for Antimatter Desktop on Linux

Linux has no policy store like Group Policy or macOS managed preferences, so the app reads a JSON file:
`/etc/antimatter-desktop/policies.json`. It has the same keys as the macOS managed preferences:

| Key | Type | What it does |
|---|---|---|
| `DefaultServerList` | array of objects with `name` (tab name) and `url` | Adds servers people can't remove |
| `DefaultUsername` | string; `%USER%` is replaced by the account name | Fills the username on the login page of those servers |
| `EnableServerManagement` | boolean | `false`: people can only use the servers above |
| `EnableAutoUpdater` | boolean | `false`: never check for new versions |
| `TrustedEmbeddedMediaOrigins` | array of objects with `serverOrigin` and `embeddedOrigin` | Camera and microphone permissions for embedded content |

```bash
sudo install -d /etc/antimatter-desktop
sudo install -m 644 policies.example.json /etc/antimatter-desktop/policies.json   # then edit it
```

Deploy it with your configuration management tool (Ansible, Puppet, Salt...) like any file under `/etc`. Keep it
owned by root and not writable by the users. The app reads it when it starts: restart it after a change. A file that
isn't valid JSON is ignored (the app logs a warning).

The Flatpak sandbox doesn't see the host's `/etc`. Give it read access, and the app reads the file from
`/run/host/etc/antimatter-desktop/policies.json`:

```bash
sudo flatpak override --system --filesystem=host-etc:ro chat.antimatter.desktop
```
