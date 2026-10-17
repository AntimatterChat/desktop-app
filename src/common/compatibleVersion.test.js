// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import semver from 'semver';

import {COMPATIBLE_MATTERMOST_DESKTOP_VERSION} from './compatibleVersion';

describe('common/compatibleVersion', () => {
    it('is a plain release version, which the web apps and the server parse strictly', () => {
        expect(semver.valid(COMPATIBLE_MATTERMOST_DESKTOP_VERSION)).toBe(COMPATIBLE_MATTERMOST_DESKTOP_VERSION);
        expect(semver.prerelease(COMPATIBLE_MATTERMOST_DESKTOP_VERSION)).toBeNull();
    });

    it('is never lower than the Mattermost Desktop version the fork was renumbered from', () => {
        expect(semver.gte(COMPATIBLE_MATTERMOST_DESKTOP_VERSION, '6.4.0')).toBe(true);
    });

    // The checks that turn features on in the web apps (Fusion and classic) and the Calls plugin
    it.each([
        ['4.7.0', 'search.tsx and new_search.tsx'],
        ['5.0.0', 'browser_history.tsx'],
        ['5.3.0', 'Calls: desktopGTE(5, 3)'],
        ['5.5.0', 'Calls: desktopGTE(5, 5)'],
    ])('meets >= %s (%s)', (minimum) => {
        expect(semver.gte(COMPATIBLE_MATTERMOST_DESKTOP_VERSION, minimum)).toBe(true);
    });
});
