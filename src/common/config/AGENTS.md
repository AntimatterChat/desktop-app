# src/common/config/ — Configuration System

`Config` (`index.ts`) reads/writes `config.json`, merging build config, policy-managed config (GPO/MDM), and user preferences into a single resolved configuration.

## Config versioning

Supports V0 through V4 with automatic migration via `upgradePreferences.ts`. Additionally, `migrationPreferences.ts` handles one-time item-level migrations tracked via a separate JSON file.

## Policy-managed configuration (`policyConfigLoader.ts`)

- **Windows**: Registry values under `SOFTWARE\Policies\Antimatter`, HKLM first (a machine policy wins over HKCU),
  falling back per key to `SOFTWARE\Policies\Mattermost`. Set by Group Policy (ADMX templates in
  `resources/windows/gpo`) or by the MSI public properties (`scripts/msi_project_created.js`).
- **macOS**: CFPreferences of the bundle id (`chat.antimatter.desktop`) set by MDM profiles, via `cf-prefs`
  (examples in `resources/mac/mdm`).
- **Linux**: the JSON file `/etc/antimatter-desktop/policies.json` (or `/run/host/etc/...` in a Flatpak), same keys as
  macOS (example in `resources/linux`).

Keys: `DefaultServerList`, `DefaultUsername` (prefilled on the login page of the predefined servers by
`app/views/loginPrefill.ts`; `%VAR%` environment variables are expanded), `EnableServerManagement`,
`EnableAutoUpdater`, `TrustedEmbeddedMediaOrigins`. Unset policies are left out of the result, so they don't hide the
build config. Policy values override user preferences and cannot be changed by the user. The policies are read once,
at startup.

## Install type and updates (`installType.ts`)

`getInstallType()` tells the Windows `.exe` (NSIS, per user: its uninstaller sits next to the app) from the `.msi`
(per machine: the MSI records `InstallDir` under `HKLM\SOFTWARE\Antimatter\Desktop`, or the app is in Program
Files). `Config.canUpgrade` uses `isUpdateCheckAllowed()`: an MSI copy doesn't check for updates unless
`EnableAutoUpdater` is 1, and its update download is then the `.msi`; every other copy downloads the `.exe`.

## Build config (`buildConfig.ts`)

Compile-time constants: `defaultServers`, `enableServerManagement`, `enableUpdateNotifications`, `updateNotificationURL`, `managedResources`, `allowedProtocols`, and various external links. Used for white-labelling.

## Config directory

| Platform | Path |
|---|---|
| Windows | `%userprofile%\AppData\Roaming\Mattermost` |
| Linux | `~/.local/share/Mattermost` or `~/.config/Mattermost` |
| macOS (DMG) | `~/Library/Application Support/Mattermost` |
| macOS (App Store) | `~/Library/Containers/Mattermost.Desktop/Data/Library/Application Support/Mattermost` |

In dev mode, the app name is `Electron`, so the directory is `Electron` instead of `Mattermost`. This does not affect Mac App Store.

## Adding a new config property

1. Add the field to the `ConfigV4` type in `src/types/config.ts`.
2. Set its default value in `defaultPreferences.ts`.
3. Add a Joi validation rule in `src/common/Validator.ts` under the appropriate config schema.
4. If it should be policy-managed, add the registry/MDM key mapping in `policyConfigLoader.ts`.
5. If it needs a migration from an older format, add a migration step in `migrationPreferences.ts`.
6. Access via `Config.propertyName` — the `Config` class dynamically exposes all `CombinedConfig` fields through a getter proxy.

Example — adding an `enableMyFeature` boolean:

```typescript
// 1. src/types/config.ts — add to ConfigV4:
enableMyFeature: boolean;

// 2. defaultPreferences.ts — set default:
const defaultPreferences: ConfigV4 = {
    // ...existing fields...
    enableMyFeature: true,
};

// 3. Validator.ts — add to the configV4DataSchemaV4 Joi object:
enableMyFeature: Joi.boolean().default(true),

// 6. Usage anywhere in the main process:
import Config from 'common/config';
if (Config.enableMyFeature) { /* ... */ }
```
