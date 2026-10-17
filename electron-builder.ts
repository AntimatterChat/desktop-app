// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
const semver = require('semver');

const pkg = require('./package.json');

function getMacVersions() {
    const stableVersion = semver.coerce(pkg.version)?.version || pkg.version;
    let buildVersion = stableVersion;
    if (process.env.GITHUB_RUN_ID) {
        buildVersion = `${process.env.GITHUB_RUN_ID}${process.env.GITHUB_RUN_ATTEMPT || ''}`;
    } else {
        const match = pkg.version.match(/-[^.]+\.(\d+)$/);
        if (match) {
            buildVersion = match[1];
        }
    }
    return {bundleShortVersion: stableVersion, bundleVersion: buildVersion};
}

const config = {
    appId: 'chat.antimatter.desktop',
    artifactName: '${version}/${name}-${version}-${os}-${arch}.${ext}',
    directories: {
        buildResources: 'src/assets',
        output: 'release',
    },
    extraMetadata: {
        main: 'index.js',
    },
    files: [
        '!node_modules/**/*',
        'node_modules/bindings/**/*',
        'node_modules/file-uri-to-path/**/*',
        'node_modules/macos-notification-state/**/*',
        'node_modules/windows-focus-assist/**/*',
        'node_modules/registry-js/**/*',
        'node_modules/cf-prefs/**/*',
        'node_modules/@koromix/**/*',
        'node_modules/koffi/**/*',
        '!**/node_modules/macos-notification-state/bin/**/*',
        '!**/node_modules/macos-notification-state/build/**/*',
        '!**/node_modules/windows-focus-assist/bin/**/*',
        '!**/node_modules/windows-focus-assist/build/**/*',
        '!**/node_modules/registry-js/bin/**/*',
        '!**/node_modules/registry-js/build/**/*',
        '!**/node_modules/cf-prefs/bin/**/*',
        '!**/node_modules/cf-prefs/build/**/*',
        'node_modules/macos-notification-state/build/**/*.node',
        'node_modules/windows-focus-assist/build/Release/**/*.node',
        'node_modules/registry-js/build/Release/**/*.node',
        'node_modules/cf-prefs/build/Release/**/*.node',
        'node_modules/@koromix/**/*.node',
        {
            from: 'dist',
            to: '.',
            filter: '**/*',
        },
    ],
    protocols: [
        {
            name: 'Antimatter',
            schemes: [
                'antimatter',

                // Mattermost's scheme, still opened for the links people already have
                'mattermost',
            ],
        },
    ],
    beforePack: 'scripts/beforepack.js',
    afterPack: 'scripts/afterpack.js',

    // Adds the public properties for silent installs (SERVERURL, DEFAULTUSERNAME, AUTOUPDATE...) to the MSI
    msiProjectCreated: 'scripts/msi_project_created.js',
    deb: {
        artifactName: '${version}/${name}_${version}-1_${arch}.${ext}',
        synopsis: 'Antimatter Desktop App',
        depends: [
            'libnotify4',
            'libxtst6',
            'libnss3',
        ],
        priority: 'optional',
    },
    asarUnpack: [
        './node_modules/macos-notification-state/build/Release/**/*.node',
        './node_modules/windows-focus-assist/build/Release/**/*.node',
        './node_modules/registry-js/build/Release/**/*.node',
        './node_modules/cf-prefs/build/Release/**/*.node',
        './node_modules/@koromix/**/*.node',
    ],
    linux: {
        category: 'Network;InstantMessaging',
        target: [
            'deb',
            'tar.gz',
            'appimage',
            'rpm',
            'flatpak',
        ],
        appId: 'chat.antimatter.desktop',
        executableName: 'chat.antimatter.desktop',
        icon: 'icons',
        maintainer: 'Antimatter contributors <https://github.com/AntimatterChat/desktop-app>',
        vendor: 'Antimatter',
        desktop: {
            entry: {
                StartupWMClass: pkg.desktopName,
            },
        },
        extraFiles: [
            {
                filter: [
                    'LICENSE.txt',
                    'NOTICE.txt',
                ],
            },
            {
                from: 'src/assets/linux',
                filter: [
                    'create_desktop_file.sh',
                    'app_icon.png',
                    'README.md',
                ],
            },
        ],
    },
    appImage: {
        executableArgs: [' '],
    },
    mac: {
        category: 'public.app-category.productivity',
        target: [
            'zip',
            'dmg',
        ],
        darkModeSupport: true,
        extraResources: [
            {
                filter: [
                    'LICENSE.txt',
                    'NOTICE.txt',
                ],
            },
        ],
        hardenedRuntime: true,
        gatekeeperAssess: true,
        entitlements: './resources/mac/entitlements.mac.plist',
        entitlementsInherit: './resources/mac/entitlements.mac.inherit.plist',
        extendInfo: {
            NSMicrophoneUsageDescription: 'Microphone access is used to capture audio for voice communication and recordings.',
            NSCameraUsageDescription: 'Camera access is used to capture video for video conferencing and recordings.',
            NSFocusStatusUsageDescription: 'Focus status is used by Antimatter to determine whether to send notifications or not.',
            LSFileQuarantineEnabled: true,
        },
        x64ArchFiles: '**/node_modules/@koromix/koffi-darwin-*/darwin_*/koffi.node',
        ...getMacVersions(),
    },
    mas: {
        entitlements: './resources/mac/entitlements.mas.plist',
        entitlementsInherit: './resources/mac/entitlements.mas.inherit.plist',
        entitlementsLoginHelper: './resources/mac/entitlements.mas.inherit.plist',
        provisioningProfile: './mas.provisionprofile',
        extendInfo: {
            ITSAppUsesNonExemptEncryption: false,
            NSUserActivityTypes: ['INSendMessageIntent'],
        },
        singleArchFiles: '*',
        x64ArchFiles: '**/node_modules/@koromix/koffi-darwin-*/darwin_*/koffi.node',
    },
    masDev: {
        provisioningProfile: './dev.provisionprofile',
    },
    dmg: {
        background: 'src/assets/osx/DMG_BG.png',
        contents: [
            {
                x: 135,
                y: 165,
            },
            {
                x: 407,
                y: 165,
                type: 'link',
                path: '/Applications',
            },
        ],
        iconSize: 120,
        iconTextSize: 14,
        window: {
            height: 380,
        },
    },
    win: {
        target: [
            'zip',
            'msi',
        ],
        extraFiles: [
            {
                filter: [
                    'LICENSE.txt',
                    'NOTICE.txt',
                ],
            },
            {
                from: 'resources/windows/gpo',
                to: 'gpo',
            },
        ],
        signExts: ['.dll', '.node'],

        // Azure Trusted Signing, configured from the environment when a signing account is available
        azureSignOptions: process.env.AZURE_CLIENT_ID ? {
            certificateProfileName: process.env.AZURE_SIGN_CERTIFICATE_PROFILE,
            codeSigningAccountName: process.env.AZURE_SIGN_ACCOUNT,
            endpoint: process.env.AZURE_SIGN_ENDPOINT,
            publisherName: process.env.AZURE_SIGN_PUBLISHER,
        } : null,
    },

    // The .exe: installs for the current user only (%LOCALAPPDATA%\Programs), without administrator rights; the
    // update notifications point to it
    nsis: {
        oneClick: true,
        perMachine: false,
    },

    // The .msi: installs for every user of the machine (Program Files), for companies deploying it (SCCM, Intune,
    // Group Policy); such a copy doesn't check for updates unless the EnableAutoUpdater policy is 1
    msi: {
        additionalWixArgs: ['-ext', 'WixUtilExtension'],
        upgradeCode: '{FC1E639B-7BFC-40F8-BD17-633F142321C1}',
        perMachine: true,
    },
    rpm: {
        fpm: ['--rpm-rpmbuild-define', '_build_id_links none', '--rpm-digest=sha256'],
    },
    flatpak: {
        baseVersion: process.env.FLATPAK_BASE_VERSION || '25.08',
        runtimeVersion: process.env.FLATPAK_RUNTIME_VERSION || '25.08',
        useWaylandFlags: true,
    },
};

if (process.env.CI_MAC_ZIP_ONLY) {
    config.mac.target = ['zip'];
    config.mac.gatekeeperAssess = false;
}

// Builds without an Apple certificate (the release workflow): sign ad hoc, because Apple silicon refuses to run
// unsigned code, and leave out notarisation, the hardened runtime and the entitlements that need a provisioning
// profile (macOS kills an ad hoc signed app that claims them).
if (process.env.AM_MAC_ADHOC_SIGN === 'true') {
    Object.assign(config.mac, {
        identity: '-',
        notarize: false,
        hardenedRuntime: false,
        gatekeeperAssess: false,
        entitlements: './resources/mac/entitlements.mac.adhoc.plist',
    });
}

module.exports = config;
