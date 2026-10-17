// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * The upstream Mattermost Desktop App version this fork is based on.
 *
 * Antimatter Desktop has its own version numbers (app.getVersion(), 0.9.0 for the first beta), but the servers, the
 * web apps (Fusion and classic) and plugins such as Calls compare the desktop app's version against Mattermost
 * Desktop versions to turn features on (for example "desktop >= 5.0.0" for the browser history, ">= 4.7.0" for the
 * search, the server's MinimumDesktopAppVersion). The same way the Antimatter server reports a Mattermost-compatible
 * version, everything a server or web content reads (the "Mattermost/<version>" user-agent token, the desktop API's
 * getAppInfo, the session attributes) gets this version instead. People keep seeing the real Antimatter version
 * (About, the update checker, the Settings window, the logs).
 *
 * Raise it when an upstream Mattermost Desktop release is merged, never lower it.
 */
export const COMPATIBLE_MATTERMOST_DESKTOP_VERSION = '6.4.0';
