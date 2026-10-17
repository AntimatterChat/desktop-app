// Copyright (c) 2026-present Antimatter contributors. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'fs';
import path from 'path';

import {HKEY, enumerateValues} from 'registry-js';

import {Logger} from 'common/log';

const log = new Logger('InstallType');

/**
 * How the app was installed:
 * - nsis: the .exe installer (per user, in %LOCALAPPDATA%\Programs), which people update themselves
 * - msi: the .msi package (per machine, in Program Files), deployed and updated by an administrator
 * - portable: the Windows .zip, or a development build
 * - other: macOS and Linux
 */
export type InstallType = 'nsis' | 'msi' | 'portable' | 'other';

// The MSI package writes its install folder here (InstallDir), see scripts/msi_project_created.js
export const MSI_INSTALL_REGISTRY_PATH = 'SOFTWARE\\Antimatter\\Desktop';
export const MSI_INSTALL_DIR_VALUE = 'InstallDir';

export type InstallProbe = {
    platform: NodeJS.Platform;
    execPath: string;
    env: NodeJS.ProcessEnv;
    fileExists: (file: string) => boolean;
    readMsiInstallDir: () => string | undefined;
};

const normaliseWindowsPath = (value: string) => path.win32.normalize(value).replace(/\\+$/, '').toLowerCase();

const isInsideWindowsFolder = (dir: string, folder: string) => {
    const normalisedDir = normaliseWindowsPath(dir);
    const normalisedFolder = normaliseWindowsPath(folder);
    return normalisedDir === normalisedFolder || normalisedDir.startsWith(`${normalisedFolder}\\`);
};

export function detectInstallType(probe: InstallProbe): InstallType {
    if (probe.platform !== 'win32') {
        return 'other';
    }

    const dir = path.win32.dirname(probe.execPath);
    const exeName = path.win32.basename(probe.execPath).replace(/\.exe$/i, '');

    // The NSIS installer leaves its uninstaller next to the app ("Uninstall Antimatter.exe"); the MSI doesn't
    if (probe.fileExists(path.win32.join(dir, `Uninstall ${exeName}.exe`))) {
        return 'nsis';
    }

    const msiInstallDir = probe.readMsiInstallDir();
    if (msiInstallDir && normaliseWindowsPath(msiInstallDir) === normaliseWindowsPath(dir)) {
        return 'msi';
    }

    // An MSI built before the InstallDir value, or a copy an administrator put in Program Files: managed per machine
    const programFolders = [probe.env.ProgramFiles, probe.env['ProgramFiles(x86)'], probe.env.ProgramW6432].
        filter((folder): folder is string => Boolean(folder));
    if (programFolders.some((folder) => isInsideWindowsFolder(dir, folder))) {
        return 'msi';
    }

    return 'portable';
}

const readMsiInstallDir = () => {
    try {
        const value = enumerateValues(HKEY.HKEY_LOCAL_MACHINE, MSI_INSTALL_REGISTRY_PATH)?.
            find((item) => item.name === MSI_INSTALL_DIR_VALUE)?.data;
        return typeof value === 'string' ? value : undefined;
    } catch (error) {
        log.debug('Cannot read the MSI install folder', {error});
        return undefined;
    }
};

let cachedInstallType: InstallType | undefined;

export function getInstallType(): InstallType {
    if (!cachedInstallType) {
        cachedInstallType = detectInstallType({
            platform: process.platform,
            execPath: process.execPath,
            env: process.env,
            fileExists: fs.existsSync,
            readMsiInstallDir,
        });
        if (cachedInstallType === 'msi') {
            log.info('Installed per machine (MSI): update notifications are off unless the EnableAutoUpdater policy is 1, the administrator deploys the updates');
        } else {
            log.debug('Install type', {installType: cachedInstallType});
        }
    }
    return cachedInstallType;
}

/**
 * Whether the app checks for new versions and tells people about them.
 *
 * - The build can turn it off (buildConfig.enableUpdateNotifications), and so can the EnableAutoUpdater policy (0).
 * - An MSI (per machine) copy doesn't by default: the people using it usually can't install software, and the .exe
 *   would add a second, per-user copy. EnableAutoUpdater = 1 turns it on (and the update is then the .msi).
 */
export function isUpdateCheckAllowed({buildEnabled, policyEnabled, installType}: {
    buildEnabled?: boolean;
    policyEnabled?: boolean;
    installType: InstallType;
}): boolean {
    if (!buildEnabled) {
        return false;
    }
    if (policyEnabled === false) {
        return false;
    }
    if (installType === 'msi') {
        return policyEnabled === true;
    }
    return true;
}

/**
 * The Windows package an update downloads: the per-user .exe, except for an MSI install, which stays on the MSI.
 */
export function getWindowsUpdatePackage(installType: InstallType): 'exe' | 'msi' {
    return installType === 'msi' ? 'msi' : 'exe';
}
