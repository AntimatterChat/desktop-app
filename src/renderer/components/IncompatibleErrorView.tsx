// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FormattedMessage} from 'react-intl';

import ErrorView from 'renderer/components/ErrorView';

// The oldest Antimatter server this app works with; any Mattermost server from 9.4 on works too.
const MIN_ANTIMATTER_VERSION = '0.9.0';

type Props = {
    appName?: string;
    url?: string;
    handleLink: () => void;
    handleUpgradeLink: () => void;
};

export default function IncompatibleErrorView({appName, url, handleLink, handleUpgradeLink}: Props) {
    const header = (
        <FormattedMessage
            id='renderer.components.errorView.incompatibleServerVersion'
            defaultMessage='Incompatible server version'
        />
    );

    const subHeader = (
        <>
            <FormattedMessage
                id='renderer.components.errorView.serverVersionIsIncompatible'
                defaultMessage={'The {appName} Server you are accessing is incompatible with this version of the {appName} Desktop App. To connect to this server, please try the following:'}
                values={{
                    appName,
                }}
            />
        </>
    );

    const bullets = (
        <>
            <li>
                <FormattedMessage
                    id='renderer.components.errorView.troubleshooting.upgradeServer'
                    defaultMessage='<link>Upgrade the server</link> to {appName} {minVersion} or later. Mattermost Server 9.4 or later also works.'
                    values={{
                        appName,
                        minVersion: MIN_ANTIMATTER_VERSION,
                        link: (msg: React.ReactNode) => (
                            <a
                                href='#'
                                onClick={handleUpgradeLink}
                            >
                                {msg}
                            </a>
                        ),
                    }}
                />
            </li>
        </>
    );

    const contactAdmin = (
        <FormattedMessage
            id='renderer.components.errorView.contactAdminUpgrade'
            defaultMessage='If the issue persists, contact your {appName} Administrator or IT department to upgrade this {appName} Server.'
            values={{
                appName,
            }}
        />
    );

    return (
        <ErrorView
            header={header}
            subHeader={subHeader}
            bullets={bullets}
            contactAdmin={contactAdmin}
            handleLink={handleLink}
            url={url}
        />
    );
}
