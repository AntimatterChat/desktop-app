// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {app} from 'electron';
import semver from 'semver';

import MainWindow from 'app/mainWindow/mainWindow';
import ModalManager from 'app/mainWindow/modals/modalManager';
import {COMPATIBLE_MATTERMOST_DESKTOP_VERSION} from 'common/compatibleVersion';
import ServerManager from 'common/servers/serverManager';
import {getLocalPreload} from 'main/utils';

import {
    handleAppVersion,
    handleWebAppInfo,
    handleWelcomeScreenModal,
    handleMainWindowIsShown,
    handleToggleSecureInput,
    handleShowSettingsModal,
} from './intercom';

jest.mock('electron', () => ({
    app: {
        getName: () => 'Antimatter',
        getVersion: () => '0.9.0',
        setSecureKeyboardEntryEnabled: jest.fn(),
        once: jest.fn(),
        removeListener: jest.fn(),
    },
}));
jest.mock('main/secureStorage', () => ({
    setSecret: jest.fn(),
    deleteSecret: jest.fn(),
    getSecret: jest.fn(),
}));

jest.mock('app/serverHub', () => ({}));
jest.mock('common/config', () => ({
    setServers: jest.fn(),
}));
jest.mock('main/notifications', () => ({}));
jest.mock('common/servers/serverManager', () => ({
    setViewIsOpen: jest.fn(),
    getAllServers: jest.fn(),
    hasServers: jest.fn(),
    addServer: jest.fn(),
    editServer: jest.fn(),
    removeServer: jest.fn(),
    getServer: jest.fn(),
    getView: jest.fn(),
    getLastActiveTabForServer: jest.fn(),
}));
jest.mock('main/utils', () => ({
    getLocalPreload: jest.fn(),
}));
jest.mock('common/views/viewManager', () => ({}));
jest.mock('app/mainWindow/modals/modalManager', () => ({
    addModal: jest.fn(),
    addPriorityModal: jest.fn(),
}));
jest.mock('app/mainWindow/mainWindow', () => ({
    get: jest.fn(),
    once: jest.fn(),
    on: jest.fn(),
}));

jest.mock('./app', () => ({}));

describe('main/app/intercom', () => {
    describe('app versions', () => {
        it('gives web content (the desktop API\'s getAppInfo) the Mattermost-compatible version', () => {
            expect(handleWebAppInfo()).toEqual({name: 'Antimatter', version: COMPATIBLE_MATTERMOST_DESKTOP_VERSION});
        });

        it('gives the app\'s own windows the real Antimatter version', () => {
            expect(handleAppVersion()).toEqual({name: 'Antimatter', version: '0.9.0'});
        });

        it('passes the web apps\' and the Calls plugin\'s version checks with app version 0.9.0', () => {
            // The web apps' DesktopAppAPI copies getAppInfo's version to window.desktop.version this way
            const desktopVersion = semver.valid(semver.coerce(handleWebAppInfo().version));
            expect(semver.gte(desktopVersion, '5.0.0')).toBe(true);
            expect(semver.gte(desktopVersion, '4.7.0')).toBe(true);

            // The Calls plugin's desktopGTE(5, 5), for the desktop API join flow
            const {major, minor} = semver.parse(desktopVersion);
            expect(major > 5 || (major === 5 && minor >= 5)).toBe(true);

            // The real version would fail them
            expect(semver.gte(semver.coerce(handleAppVersion().version), '5.0.0')).toBe(false);
        });
    });

    describe('handleWelcomeScreenModal', () => {
        beforeEach(() => {
            getLocalPreload.mockReturnValue('/some/preload.js');
            MainWindow.get.mockReturnValue({});

            ServerManager.hasServers.mockReturnValue(false);
        });

        it('should show welcomeScreen modal', async () => {
            const promise = Promise.resolve({});
            ModalManager.addModal.mockReturnValue(promise);

            handleWelcomeScreenModal();
            expect(ModalManager.addModal).toHaveBeenCalledWith('welcomeScreen', 'antimatter-desktop://renderer/welcomeScreen.html', '/some/preload.js', {prefillURL: undefined}, {}, true);
        });
    });

    describe('handleMainWindowIsShown', () => {
        it('MM-48079 should not show onboarding screen or server screen if GPO server is pre-configured', () => {
            getLocalPreload.mockReturnValue('/some/preload.js');
            MainWindow.get.mockReturnValue({
                isVisible: () => true,
                once: jest.fn(),
            });
            ServerManager.hasServers.mockReturnValue(true);

            handleMainWindowIsShown();
            expect(ModalManager.addModal).not.toHaveBeenCalled();
        });
    });

    describe('handleShowSettingsModal', () => {
        beforeEach(() => {
            getLocalPreload.mockReturnValue('/some/preload.js');
            MainWindow.get.mockReturnValue({});
        });

        it('should open settings modal using addPriorityModal', () => {
            handleShowSettingsModal();
            expect(ModalManager.addPriorityModal).toHaveBeenCalledWith('settingsModal', 'antimatter-desktop://renderer/settings.html', '/some/preload.js', null, {});
        });

        it('should not open settings modal if no main window', () => {
            MainWindow.get.mockReturnValue(null);
            handleShowSettingsModal();
            expect(ModalManager.addPriorityModal).not.toHaveBeenCalled();
        });
    });

    describe('handleToggleSecureInput', () => {
        beforeEach(() => {
            MainWindow.get.mockReturnValue({
                isFocused: () => true,
            });
        });

        afterEach(() => {
            jest.resetAllMocks();
        });

        it('should not fire for OSes that are not macOS', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', {
                value: 'linux',
            });

            handleToggleSecureInput({}, true);

            Object.defineProperty(process, 'platform', {
                value: originalPlatform,
            });

            expect(app.setSecureKeyboardEntryEnabled).not.toHaveBeenCalled();
        });

        it('should not fire if window is not focused', () => {
            MainWindow.get.mockReturnValue({isFocused: () => false});
            handleToggleSecureInput({}, true);

            expect(app.setSecureKeyboardEntryEnabled).not.toHaveBeenCalled();
        });
    });
});
