// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import semver from 'semver';

import {COMPATIBLE_MATTERMOST_DESKTOP_VERSION} from 'common/compatibleVersion';

import {SessionAttributeCollector} from './sessionAttributeCollector';

jest.mock('electron', () => ({
    __esModule: true,
    app: {getVersion: jest.fn(() => '0.9.0')},
}));

jest.mock('common/servers/serverManager', () => ({
    __esModule: true,
    default: {getServer: jest.fn()},
}));

describe('main/sessionAttributes/collector/sessionAttributeCollector', () => {
    // The server's access policies compare client_version against Mattermost Desktop versions
    it('reports the Mattermost-compatible version as the client version, not the Antimatter one', () => {
        const version = new SessionAttributeCollector().getClientVersion();
        expect(version).toBe(COMPATIBLE_MATTERMOST_DESKTOP_VERSION);
        expect(version).not.toBe('0.9.0');
        expect(semver.gte(version, '5.0.0')).toBe(true);
    });
});
