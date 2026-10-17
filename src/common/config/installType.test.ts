// Copyright (c) 2026-present Antimatter contributors. All Rights Reserved.
// See LICENSE.txt for license information.

import type {InstallProbe} from './installType';
import {detectInstallType, getWindowsUpdatePackage, isUpdateCheckAllowed} from './installType';

jest.mock('registry-js', () => ({
    HKEY: {HKEY_LOCAL_MACHINE: 'HKEY_LOCAL_MACHINE'},
    enumerateValues: jest.fn(() => []),
}));

const windowsEnv = {
    ProgramFiles: 'C:\\Program Files',
    'ProgramFiles(x86)': 'C:\\Program Files (x86)',
    ProgramW6432: 'C:\\Program Files',
    LOCALAPPDATA: 'C:\\Users\\maya\\AppData\\Local',
};

const probe = (overrides: Partial<InstallProbe>): InstallProbe => ({
    platform: 'win32',
    execPath: 'C:\\Users\\maya\\AppData\\Local\\Programs\\antimatter-desktop\\Antimatter.exe',
    env: windowsEnv,
    fileExists: () => false,
    readMsiInstallDir: () => undefined,
    ...overrides,
});

describe('common/config/installType', () => {
    describe('detectInstallType', () => {
        it('is "other" on macOS and Linux', () => {
            expect(detectInstallType(probe({platform: 'darwin', execPath: '/Applications/Antimatter.app/Contents/MacOS/Antimatter'}))).toBe('other');
            expect(detectInstallType(probe({platform: 'linux', execPath: '/opt/Antimatter/chat.antimatter.desktop'}))).toBe('other');
        });

        it('recognises the .exe (NSIS) install from its uninstaller next to the app', () => {
            const fileExists = jest.fn((file: string) => file === 'C:\\Users\\maya\\AppData\\Local\\Programs\\antimatter-desktop\\Uninstall Antimatter.exe');
            expect(detectInstallType(probe({fileExists}))).toBe('nsis');
        });

        it('recognises the MSI install from the folder it recorded, wherever it is', () => {
            const execPath = 'D:\\Apps\\Antimatter\\Antimatter.exe';
            expect(detectInstallType(probe({execPath, readMsiInstallDir: () => 'D:\\Apps\\Antimatter\\'}))).toBe('msi');
            expect(detectInstallType(probe({execPath, readMsiInstallDir: () => 'd:\\apps\\antimatter'}))).toBe('msi');
        });

        it('does not take the folder an MSI recorded for another copy', () => {
            const execPath = 'D:\\Portable\\Antimatter\\Antimatter.exe';
            expect(detectInstallType(probe({execPath, readMsiInstallDir: () => 'C:\\Program Files\\Antimatter\\'}))).toBe('portable');
        });

        it('takes a copy in Program Files without an uninstaller for a per-machine (MSI) install', () => {
            expect(detectInstallType(probe({execPath: 'C:\\Program Files\\Antimatter\\Antimatter.exe'}))).toBe('msi');
            expect(detectInstallType(probe({execPath: 'C:\\Program Files (x86)\\Antimatter\\Antimatter.exe'}))).toBe('msi');
        });

        it('does not mistake a folder whose name starts like Program Files', () => {
            expect(detectInstallType(probe({execPath: 'C:\\Program Files Extra\\Antimatter\\Antimatter.exe'}))).toBe('portable');
        });

        it('prefers the uninstaller over the folder (a per-machine NSIS install)', () => {
            const fileExists = (file: string) => file === 'C:\\Program Files\\Antimatter\\Uninstall Antimatter.exe';
            expect(detectInstallType(probe({execPath: 'C:\\Program Files\\Antimatter\\Antimatter.exe', fileExists}))).toBe('nsis');
        });

        it('is "portable" for the zip anywhere else', () => {
            expect(detectInstallType(probe({execPath: 'C:\\Users\\maya\\Downloads\\antimatter\\Antimatter.exe'}))).toBe('portable');
        });
    });

    describe('isUpdateCheckAllowed', () => {
        it('checks for updates by default, except for an MSI install', () => {
            expect(isUpdateCheckAllowed({buildEnabled: true, installType: 'nsis'})).toBe(true);
            expect(isUpdateCheckAllowed({buildEnabled: true, installType: 'portable'})).toBe(true);
            expect(isUpdateCheckAllowed({buildEnabled: true, installType: 'other'})).toBe(true);
            expect(isUpdateCheckAllowed({buildEnabled: true, installType: 'msi'})).toBe(false);
        });

        it('never checks when the EnableAutoUpdater policy is 0', () => {
            for (const installType of ['nsis', 'msi', 'portable', 'other'] as const) {
                expect(isUpdateCheckAllowed({buildEnabled: true, policyEnabled: false, installType})).toBe(false);
            }
        });

        it('checks for an MSI install when the EnableAutoUpdater policy is 1', () => {
            expect(isUpdateCheckAllowed({buildEnabled: true, policyEnabled: true, installType: 'msi'})).toBe(true);
        });

        it('never checks when the build turns update notifications off, whatever the policy', () => {
            expect(isUpdateCheckAllowed({buildEnabled: false, policyEnabled: true, installType: 'nsis'})).toBe(false);
            expect(isUpdateCheckAllowed({buildEnabled: undefined, installType: 'nsis'})).toBe(false);
        });
    });

    describe('getWindowsUpdatePackage', () => {
        it('points updates to the .exe, and an MSI install to the .msi', () => {
            expect(getWindowsUpdatePackage('nsis')).toBe('exe');
            expect(getWindowsUpdatePackage('portable')).toBe('exe');
            expect(getWindowsUpdatePackage('msi')).toBe('msi');
        });
    });
});
