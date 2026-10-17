// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'fs';

import {getPreferenceValue as getCFPreferenceValue} from 'cf-prefs';
import {enumerateValues} from 'registry-js';

import policyConfigLoader, {expandPolicyVariables, LINUX_POLICY_FILES} from 'common/config/policyConfigLoader';

jest.mock('registry-js', () => {
    return {
        HKEY: {
            HKEY_LOCAL_MACHINE: 'HKEY_LOCAL_MACHINE',
            HKEY_CURRENT_USER: 'HKEY_CURRENT_USER',
        },
        enumerateValues: jest.fn().mockImplementation((hive, key) => {
            if (hive === 'HKEY_LOCAL_MACHINE') {
                if (key.endsWith('DefaultServerList')) {
                    return [
                        {name: 'server-lm-1', data: 'http://server-lm-1.com'},
                        {name: 'server-lm-2', data: 'http://server-lm-2.com'},
                    ];
                }
                if (key.endsWith('TrustedEmbeddedMediaOrigins')) {
                    return [
                        {name: 'jitsi-lm', data: JSON.stringify({serverOrigin: 'https://chat-lm.example.com', embeddedOrigin: 'https://meet-lm.example.com'})},
                    ];
                }
                if (key.includes('SOFTWARE\\Policies\\Antimatter')) {
                    return [
                        {name: 'EnableServerManagement', data: 1},
                        {name: 'EnableAutoUpdater', data: 0},
                        {name: 'DefaultUsername', data: 'lm-user'},
                    ];
                }
                return [];
            }
            if (hive === 'HKEY_CURRENT_USER') {
                if (key.endsWith('DefaultServerList')) {
                    return [
                        {name: 'server-cu-1', data: 'http://server-cu-1.com'},
                        {name: 'server-cu-2', data: 'http://server-cu-2.com'},
                    ];
                }
                if (key.endsWith('TrustedEmbeddedMediaOrigins')) {
                    return [
                        {name: 'jitsi-cu', data: JSON.stringify({serverOrigin: 'https://chat-cu.example.com', embeddedOrigin: 'https://meet-cu.example.com'})},
                    ];
                }
                if (key.includes('SOFTWARE\\Policies\\Antimatter')) {
                    return [
                        {name: 'EnableServerManagement', data: 0},
                        {name: 'EnableAutoUpdater', data: 1},
                        {name: 'DefaultUsername', data: 'cu-user'},
                    ];
                }
                return [];
            }
            if (key.includes('Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize')) {
                return [{name: 'AppsUseLightTheme', data: 1}];
            }
            return [];
        }),
    };
});

jest.mock('cf-prefs', () => ({
    getPreferenceValue: jest.fn().mockImplementation((key) => {
        if (key === 'DefaultServerList') {
            return [
                {name: 'server-a', url: 'https://a.com'},
                {name: 'server-b', url: 'https://b.com'},
            ];
        }
        if (key === 'TrustedEmbeddedMediaOrigins') {
            return [
                {serverOrigin: 'https://chat.example.com', embeddedOrigin: 'https://meet.example.com'},
            ];
        }
        if (key === 'EnableServerManagement') {
            return true;
        }
        if (key === 'EnableAutoUpdater') {
            return false;
        }
        return undefined;
    }),
}));

describe('common/config/policyConfigLoader', () => {
    let originalPlatform;

    beforeEach(() => {
        originalPlatform = process.platform;
    });

    afterEach(() => {
        Object.defineProperty(process, 'platform', {value: originalPlatform});
    });

    describe('getPolicyConfig', () => {
        describe('Windows', () => {
            beforeEach(() => {
                Object.defineProperty(process, 'platform', {value: 'win32'});
            });

            it('returns merged servers from both hives and lets the machine policy (LM) win over the user one (CU)', () => {
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.servers).toHaveLength(4);
                expect(data.servers).toContainEqual({name: 'server-lm-1', url: 'http://server-lm-1.com'});
                expect(data.servers).toContainEqual({name: 'server-cu-1', url: 'http://server-cu-1.com'});

                // A user can't lift a restriction the machine policy sets
                expect(data.enableServerManagement).toBe(true);
                expect(data.enableUpdateNotifications).toBe(false);
                expect(data.defaultUsername).toBe('lm-user');
                expect(data.trustedEmbeddedMediaOrigins).toContainEqual({
                    serverOrigin: 'https://chat-lm.example.com',
                    embeddedOrigin: 'https://meet-lm.example.com',
                });
                expect(data.trustedEmbeddedMediaOrigins).toContainEqual({
                    serverOrigin: 'https://chat-cu.example.com',
                    embeddedOrigin: 'https://meet-cu.example.com',
                });
            });

            it('handles undefined from one hive', () => {
                enumerateValues.mockImplementation((hive, key) => {
                    if (key.includes('Antimatter') && !key.includes('DefaultServerList')) {
                        return hive === 'HKEY_LOCAL_MACHINE' ? [{name: 'EnableServerManagement', data: 1}] : [];
                    }
                    return [];
                });
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.enableServerManagement).toBe(true);
            });

            it('handles registry error in one hive', () => {
                enumerateValues.mockImplementation((hive, key) => {
                    if (key.includes('Antimatter') && hive === 'HKEY_CURRENT_USER') {
                        throw new Error('Registry access error');
                    }
                    if (key.includes('Antimatter') && !key.includes('DefaultServerList')) {
                        return [{name: 'EnableServerManagement', data: 1}];
                    }
                    if (key.endsWith('DefaultServerList')) {
                        return hive === 'HKEY_LOCAL_MACHINE' ? [{name: 's', data: 'http://s.com'}] : [];
                    }
                    return [];
                });
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.enableServerManagement).toBe(true);
                expect(data.servers).toHaveLength(1);
            });

            it('handles malformed server data', () => {
                enumerateValues.mockImplementation((hive, key) => {
                    if (key.endsWith('DefaultServerList')) {
                        return [
                            {name: 'server-1', data: null},
                            {name: 'server-2', data: 'http://server-2.com'},
                        ];
                    }
                    return [];
                });
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.servers.length).toBeGreaterThanOrEqual(2);
                expect(data.servers[0]).toEqual({name: 'server-1', url: null});
                expect(data.servers[1]).toEqual({name: 'server-2', url: 'http://server-2.com'});
            });

            it('filters malformed trusted embedded media registry data', () => {
                enumerateValues.mockImplementation((hive, key) => {
                    if (key.endsWith('TrustedEmbeddedMediaOrigins') && hive === 'HKEY_LOCAL_MACHINE') {
                        return [
                            {name: 'valid-1', data: JSON.stringify({serverOrigin: 'https://chat.example.com', embeddedOrigin: 'https://meet.example.com'})},
                            {name: 'invalid-json', data: '{not-json'},
                            {name: 'missing-origin', data: JSON.stringify({serverOrigin: 'https://chat.example.com'})},
                            {name: 'not-string', data: 1},
                        ];
                    }

                    return [];
                });
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.trustedEmbeddedMediaOrigins).toEqual([
                    {serverOrigin: 'https://chat.example.com', embeddedOrigin: 'https://meet.example.com'},
                ]);
            });

            it('uses the user policy when the machine has none', () => {
                enumerateValues.mockImplementation((hive, key) => {
                    if (key === 'SOFTWARE\\Policies\\Antimatter' && hive === 'HKEY_CURRENT_USER') {
                        return [{name: 'EnableAutoUpdater', data: 0}];
                    }
                    return [];
                });
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.enableUpdateNotifications).toBe(false);
            });

            it('reads the DefaultUsername policy and replaces the environment variables in it', () => {
                const originalUsername = process.env.AM_POLICY_TEST_USERNAME;
                process.env.AM_POLICY_TEST_USERNAME = 'maya';
                try {
                    enumerateValues.mockImplementation((hive, key) => {
                        if (key === 'SOFTWARE\\Policies\\Antimatter' && hive === 'HKEY_LOCAL_MACHINE') {
                            return [{name: 'DefaultUsername', data: '%AM_POLICY_TEST_USERNAME%@example.com'}];
                        }
                        return [];
                    });
                    expect(policyConfigLoader.getPolicyConfig().defaultUsername).toBe('maya@example.com');
                } finally {
                    if (originalUsername === undefined) {
                        delete process.env.AM_POLICY_TEST_USERNAME;
                    } else {
                        process.env.AM_POLICY_TEST_USERNAME = originalUsername;
                    }
                }
            });

            it('leaves out the policies that are not set, so they do not hide the build config', () => {
                enumerateValues.mockImplementation(() => []);
                const data = policyConfigLoader.getPolicyConfig();
                expect(data).not.toHaveProperty('enableServerManagement');
                expect(data).not.toHaveProperty('enableUpdateNotifications');
                expect(data).not.toHaveProperty('defaultUsername');
                expect(data.servers).toEqual([]);
            });

            it('falls back to the Mattermost policy key when the Antimatter key holds nothing', () => {
                enumerateValues.mockImplementation((hive, key) => {
                    if (hive !== 'HKEY_LOCAL_MACHINE') {
                        return [];
                    }
                    if (key === 'SOFTWARE\\Policies\\Mattermost\\DefaultServerList') {
                        return [{name: 'legacy', data: 'https://legacy.example.com'}];
                    }
                    if (key === 'SOFTWARE\\Policies\\Mattermost') {
                        return [{name: 'EnableAutoUpdater', data: 0}, {name: 'EnableServerManagement', data: 0}];
                    }
                    return [];
                });
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.servers).toEqual([{name: 'legacy', url: 'https://legacy.example.com'}]);
                expect(data.enableUpdateNotifications).toBe(false);
                expect(data.enableServerManagement).toBe(false);
            });

            it('ignores the Mattermost policy key when the Antimatter key is set', () => {
                enumerateValues.mockImplementation((hive, key) => {
                    if (hive !== 'HKEY_LOCAL_MACHINE') {
                        return [];
                    }
                    if (key === 'SOFTWARE\\Policies\\Antimatter\\DefaultServerList') {
                        return [{name: 'antimatter', data: 'https://chat.example.com'}];
                    }
                    if (key === 'SOFTWARE\\Policies\\Antimatter') {
                        return [{name: 'EnableAutoUpdater', data: 1}];
                    }
                    if (key.startsWith('SOFTWARE\\Policies\\Mattermost')) {
                        return key.endsWith('DefaultServerList') ? [{name: 'legacy', data: 'https://legacy.example.com'}] : [{name: 'EnableAutoUpdater', data: 0}];
                    }
                    return [];
                });
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.servers).toEqual([{name: 'antimatter', url: 'https://chat.example.com'}]);
                expect(data.enableUpdateNotifications).toBe(true);
            });

            it('returns consistent data from multiple calls', () => {
                const first = policyConfigLoader.getPolicyConfig();
                const second = policyConfigLoader.getPolicyConfig();
                expect(second.servers).toHaveLength(first.servers.length);
                expect(second.enableServerManagement).toBe(first.enableServerManagement);
            });
        });

        describe('macOS', () => {
            beforeEach(() => {
                Object.defineProperty(process, 'platform', {value: 'darwin'});
            });

            it('returns servers and booleans from managed preferences', () => {
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.servers).toEqual([
                    {name: 'server-a', url: 'https://a.com'},
                    {name: 'server-b', url: 'https://b.com'},
                ]);
                expect(data.enableServerManagement).toBe(true);
                expect(data.enableUpdateNotifications).toBe(false);
                expect(data.trustedEmbeddedMediaOrigins).toEqual([
                    {serverOrigin: 'https://chat.example.com', embeddedOrigin: 'https://meet.example.com'},
                ]);
            });

            it('reads DefaultUsername and integer booleans from managed preferences', () => {
                getCFPreferenceValue.mockImplementation((key) => {
                    if (key === 'DefaultUsername') {
                        return ' maya ';
                    }
                    if (key === 'EnableAutoUpdater') {
                        return 0;
                    }
                    if (key === 'EnableServerManagement') {
                        return 1;
                    }
                    return undefined;
                });
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.defaultUsername).toBe('maya');
                expect(data.enableUpdateNotifications).toBe(false);
                expect(data.enableServerManagement).toBe(true);
            });

            it('ignores a DefaultUsername that is not a string', () => {
                getCFPreferenceValue.mockImplementation((key) => (key === 'DefaultUsername' ? ['maya'] : undefined));
                expect(policyConfigLoader.getPolicyConfig()).not.toHaveProperty('defaultUsername');
            });

            it('returns empty servers and undefined booleans when no managed prefs', () => {
                getCFPreferenceValue.mockImplementation(() => undefined);
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.servers).toEqual([]);
                expect(data.enableServerManagement).toBeUndefined();
                expect(data.enableUpdateNotifications).toBeUndefined();
            });

            it('handles cf-prefs throw gracefully', () => {
                getCFPreferenceValue.mockImplementation((key) => {
                    if (key === 'DefaultServerList') {
                        throw new Error('cf-prefs error');
                    }
                    return undefined;
                });
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.servers).toEqual([]);
            });

            it('returns no trusted embedded media origins when the macOS value is not an array', () => {
                getCFPreferenceValue.mockImplementation((key) => {
                    if (key === 'TrustedEmbeddedMediaOrigins') {
                        return {serverOrigin: 'https://chat.example.com', embeddedOrigin: 'https://meet.example.com'};
                    }

                    return undefined;
                });
                const data = policyConfigLoader.getPolicyConfig();
                expect(data.trustedEmbeddedMediaOrigins).toEqual([]);
            });
        });
    });

    describe('getPolicyConfig on Linux', () => {
        let readFileSync;

        beforeEach(() => {
            Object.defineProperty(process, 'platform', {value: 'linux'});
            readFileSync = jest.spyOn(fs, 'readFileSync');
        });

        afterEach(() => {
            readFileSync.mockRestore();
        });

        const enoent = () => {
            const error = new Error('ENOENT: no such file or directory');
            error.code = 'ENOENT';
            throw error;
        };

        it('reads /etc/antimatter-desktop/policies.json', () => {
            readFileSync.mockImplementation((file) => {
                if (file === '/etc/antimatter-desktop/policies.json') {
                    return JSON.stringify({
                        DefaultServerList: [{name: 'Chat', url: 'https://chat.example.com'}, 'not a server'],
                        DefaultUsername: 'maya',
                        EnableServerManagement: false,
                        EnableAutoUpdater: false,
                        TrustedEmbeddedMediaOrigins: [{serverOrigin: 'https://chat.example.com', embeddedOrigin: 'https://meet.example.com'}, {serverOrigin: 1}],
                    });
                }
                return enoent();
            });
            const data = policyConfigLoader.getPolicyConfig();
            expect(LINUX_POLICY_FILES[0]).toBe('/etc/antimatter-desktop/policies.json');
            expect(data.servers).toEqual([{name: 'Chat', url: 'https://chat.example.com'}]);
            expect(data.defaultUsername).toBe('maya');
            expect(data.enableServerManagement).toBe(false);
            expect(data.enableUpdateNotifications).toBe(false);
            expect(data.trustedEmbeddedMediaOrigins).toEqual([{serverOrigin: 'https://chat.example.com', embeddedOrigin: 'https://meet.example.com'}]);
        });

        it('reads the host file from a Flatpak sandbox', () => {
            readFileSync.mockImplementation((file) => {
                if (file === '/run/host/etc/antimatter-desktop/policies.json') {
                    return JSON.stringify({EnableAutoUpdater: false});
                }
                return enoent();
            });
            expect(policyConfigLoader.getPolicyConfig().enableUpdateNotifications).toBe(false);
        });

        it('sets no policy without a policy file', () => {
            readFileSync.mockImplementation(enoent);
            const data = policyConfigLoader.getPolicyConfig();
            expect(data.servers).toEqual([]);
            expect(data).not.toHaveProperty('enableServerManagement');
            expect(data).not.toHaveProperty('enableUpdateNotifications');
            expect(data).not.toHaveProperty('defaultUsername');
        });

        it('ignores a policy file that is not valid JSON, or not an object', () => {
            readFileSync.mockReturnValue('{"EnableAutoUpdater": false');
            expect(policyConfigLoader.getPolicyConfig()).not.toHaveProperty('enableUpdateNotifications');

            readFileSync.mockReturnValue('[false]');
            expect(policyConfigLoader.getPolicyConfig()).not.toHaveProperty('enableUpdateNotifications');
        });

        it('ignores values of the wrong type', () => {
            readFileSync.mockReturnValue(JSON.stringify({EnableAutoUpdater: 'no', DefaultServerList: {name: 'x'}, DefaultUsername: 42}));
            const data = policyConfigLoader.getPolicyConfig();
            expect(data).not.toHaveProperty('enableUpdateNotifications');
            expect(data).not.toHaveProperty('defaultUsername');
            expect(data.servers).toEqual([]);
        });
    });

    describe('expandPolicyVariables', () => {
        it('replaces environment variables, whatever their case', () => {
            expect(expandPolicyVariables('%USERNAME%@example.com', {USERNAME: 'maya'})).toBe('maya@example.com');
            expect(expandPolicyVariables('%username%', {USERNAME: 'maya'})).toBe('maya');
            expect(expandPolicyVariables('%USERDOMAIN%\\%USERNAME%', {USERDOMAIN: 'LUMEN', USERNAME: 'maya'})).toBe('LUMEN\\maya');
        });

        it('keeps a value without variables', () => {
            expect(expandPolicyVariables('maya', {})).toBe('maya');
            expect(expandPolicyVariables('50% off', {})).toBe('50% off');
        });

        it('gives nothing when a variable is not set, rather than a literal %NAME%', () => {
            expect(expandPolicyVariables('%AM_NOT_SET_ANYWHERE%@example.com', {})).toBeUndefined();
        });

        it('falls back to the account name for the username variables', () => {
            const os = require('os');
            const userInfo = jest.spyOn(os, 'userInfo').mockReturnValue({username: 'maya'});
            try {
                expect(expandPolicyVariables('%USER%', {})).toBe('maya');
                expect(expandPolicyVariables('%USERNAME%', {})).toBe('maya');
            } finally {
                userInfo.mockRestore();
            }
        });
    });

    describe('getAppsUseLightTheme', () => {
        it('returns true when AppsUseLightTheme is 1 on Windows', () => {
            Object.defineProperty(process, 'platform', {value: 'win32'});
            enumerateValues.mockImplementation((hive, key) => {
                if (key.includes('Themes\\Personalize')) {
                    return [{name: 'AppsUseLightTheme', data: 1}];
                }
                return [];
            });
            expect(policyConfigLoader.getAppsUseLightTheme()).toBe(true);
        });

        it('returns false when AppsUseLightTheme is 0 on Windows', () => {
            Object.defineProperty(process, 'platform', {value: 'win32'});
            enumerateValues.mockImplementation((hive, key) => {
                if (key.includes('Themes\\Personalize')) {
                    return [{name: 'AppsUseLightTheme', data: 0}];
                }
                return [];
            });
            expect(policyConfigLoader.getAppsUseLightTheme()).toBe(false);
        });

        it('returns true when registry key missing on Windows', () => {
            Object.defineProperty(process, 'platform', {value: 'win32'});
            enumerateValues.mockImplementation(() => []);
            expect(policyConfigLoader.getAppsUseLightTheme()).toBe(true);
        });

        it('returns true on non-Windows', () => {
            Object.defineProperty(process, 'platform', {value: 'darwin'});
            expect(policyConfigLoader.getAppsUseLightTheme()).toBe(true);
        });

        it('returns true when registry access throws on Windows', () => {
            Object.defineProperty(process, 'platform', {value: 'win32'});
            enumerateValues.mockImplementation((hive, key) => {
                if (key.includes('Themes\\Personalize')) {
                    throw new Error('Registry error');
                }
                return [];
            });
            expect(policyConfigLoader.getAppsUseLightTheme()).toBe(true);
        });
    });
});
