// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {COMPATIBLE_MATTERMOST_DESKTOP_VERSION} from 'common/compatibleVersion';
import ServerManager from 'common/servers/serverManager';

export class SessionAttributeCollector {
    getClientIPAddress() {
        return '';
    }

    getVPNActive() {
        return '';
    }

    getNetworkInterfaceType() {
        return '';
    }

    getSSID() {
        return '';
    }

    getHardwareId() {
        return '';
    }

    getMDMEnrolled() {
        return '';
    }

    getOSPlatform(): string {
        switch (process.platform) {
        case 'darwin':
            return 'macos';
        case 'win32':
            return 'windows';
        default:
            return process.platform;
        }
    }

    getOSVersion() {
        return process.getSystemVersion();
    }

    // Sent to the server, whose access policies compare it against Mattermost Desktop versions
    getClientVersion() {
        return COMPATIBLE_MATTERMOST_DESKTOP_VERSION;
    }

    getServerFQDN(serverId?: string) {
        if (!serverId) {
            return '';
        }
        const server = ServerManager.getServer(serverId);
        return server?.url.hostname ?? '';
    }

    getClientFQDN() {
        return '';
    }
}
