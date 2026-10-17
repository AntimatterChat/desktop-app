// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {app} from 'electron';
import semver from 'semver';

import {COMPATIBLE_MATTERMOST_DESKTOP_VERSION} from 'common/compatibleVersion';

import {composeUserAgent, isRoutableAddress} from './utils';

jest.mock('electron', () => ({
    app: {},
}));

const ELECTRON_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Antimatter/0.9.0 Chrome/140.0.7339.41 Electron/38.1.0 Safari/537.36';

// How the consumers read the desktop version from the user agent
// The web apps' getDesktopVersion (@mattermost/shared/utils/user_agent, Fusion and classic)
const webAppDesktopVersion = (userAgent: string) => (/Mattermost\/(\d+\.\d+\.\d+)/gm).exec(userAgent)?.[1] || '';

// The web apps' and the Calls plugin's isDesktopApp
const isDesktopApp = (userAgent: string) => userAgent.includes('Mattermost') && userAgent.includes('Electron');

// The server's GetDesktopAppVersion (channels/app/user_agent.go), used for MinimumDesktopAppVersion
const serverDesktopVersion = (userAgent: string) => {
    const idx = userAgent.indexOf('Mattermost/');
    if (idx === -1 || (idx > 0 && userAgent[idx - 1] !== ' ')) {
        return undefined;
    }
    return userAgent.slice(idx + 'Mattermost/'.length).split(/\s+/)[0];
};

describe('main/utils', () => {
    describe('isRoutableAddress', () => {
        describe('IPv4', () => {
            it('accepts a public address', () => {
                expect(isRoutableAddress('IPv4', '203.0.113.5')).toBe(true);
            });

            it('accepts private addresses', () => {
                expect(isRoutableAddress('IPv4', '10.0.0.1')).toBe(true);
                expect(isRoutableAddress('IPv4', '192.168.1.100')).toBe(true);
                expect(isRoutableAddress('IPv4', '172.16.1.100')).toBe(true);
            });

            it('accepts CGNAT (Tailscale) addresses', () => {
                expect(isRoutableAddress('IPv4', '100.64.0.1')).toBe(true);
            });

            it('rejects link-local addresses', () => {
                expect(isRoutableAddress('IPv4', '169.254.10.20')).toBe(false);
            });

            it('rejects the unspecified address', () => {
                expect(isRoutableAddress('IPv4', '0.0.0.0')).toBe(false);
            });
        });

        describe('IPv6', () => {
            it('accepts a global unicast address', () => {
                expect(isRoutableAddress('IPv6', '2001:db8::1')).toBe(true);
            });

            it('accepts unique-local (Tailscale ULA) addresses', () => {
                expect(isRoutableAddress('IPv6', 'fd00::1')).toBe(true);
            });

            it('rejects link-local addresses', () => {
                expect(isRoutableAddress('IPv6', 'fe80::1')).toBe(false);
            });

            it('rejects link-local addresses across the full fe80::/10 range', () => {
                expect(isRoutableAddress('IPv6', 'fe90::1')).toBe(false);
                expect(isRoutableAddress('IPv6', 'febf::1')).toBe(false);
            });

            it('rejects link-local addresses regardless of case', () => {
                expect(isRoutableAddress('IPv6', 'FE80::1')).toBe(false);
            });

            it('rejects link-local addresses with a zone identifier', () => {
                expect(isRoutableAddress('IPv6', 'fe80::1%utun0')).toBe(false);
            });
        });
    });

    describe('composeUserAgent', () => {
        const mockedApp = app as unknown as {getVersion: () => string; userAgentFallback: string};

        beforeEach(() => {
            mockedApp.getVersion = () => '0.9.0';
            mockedApp.userAgentFallback = ELECTRON_USER_AGENT;
        });

        it('reports the Mattermost-compatible version in the Mattermost token and the real one in the Antimatter token', () => {
            const userAgent = composeUserAgent();
            expect(userAgent).toBe(`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.7339.41 Electron/38.1.0 Safari/537.36 Antimatter/0.9.0 Mattermost/${COMPATIBLE_MATTERMOST_DESKTOP_VERSION}`);
            expect(userAgent).not.toContain('Mattermost/0.9.0');
        });

        it('keeps a single Antimatter token', () => {
            expect(composeUserAgent().match(/Antimatter\//g)).toHaveLength(1);
        });

        it('carries a prerelease Antimatter version only in the Antimatter token', () => {
            mockedApp.getVersion = () => '0.9.0-rc-1';
            const userAgent = composeUserAgent();
            expect(userAgent).toContain(' Antimatter/0.9.0-rc-1 ');
            expect(userAgent.endsWith(` Mattermost/${COMPATIBLE_MATTERMOST_DESKTOP_VERSION}`)).toBe(true);
        });

        it('passes the web apps\' desktop version checks with app version 0.9.0', () => {
            const userAgent = composeUserAgent();
            expect(isDesktopApp(userAgent)).toBe(true);
            const version = webAppDesktopVersion(userAgent);
            expect(version).toBe(COMPATIBLE_MATTERMOST_DESKTOP_VERSION);

            // browser_history.tsx needs >= 5.0.0, search.tsx and new_search.tsx >= 4.7.0
            expect(semver.gte(version, '5.0.0')).toBe(true);
            expect(semver.gte(version, '4.7.0')).toBe(true);

            // The real version would fail them
            expect(semver.gte(webAppDesktopVersion('Electron/38.1.0 Mattermost/0.9.0'), '5.0.0')).toBe(false);
        });

        it('gives the server the compatible version for MinimumDesktopAppVersion', () => {
            const version = serverDesktopVersion(composeUserAgent());
            expect(version).toBe(COMPATIBLE_MATTERMOST_DESKTOP_VERSION);
            expect(semver.gte(version ?? '', '5.0.0')).toBe(true);
        });

        it('drops both app tokens in browser mode', () => {
            const userAgent = composeUserAgent(true);
            expect(userAgent).not.toContain('Antimatter');
            expect(userAgent).not.toContain('Mattermost');
        });
    });
});
