// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'fs';
import os from 'os';

import type {CFPrefValue} from 'cf-prefs';
import {getPreferenceValue as getCFPreferenceValue} from 'cf-prefs';
import type {RegistryValue} from 'registry-js';
import {HKEY, enumerateValues} from 'registry-js';

import {Logger} from 'common/log';

import type {RegistryConfig as RegistryConfigType, Server, TrustedEmbeddedMediaOrigin} from 'types/config';

const log = new Logger('PolicyConfigLoader');

// Group Policy (the ADMX templates in resources/windows/gpo) and the MSI properties write here
export const WINDOWS_REGISTRY_PATH = 'SOFTWARE\\Policies\\Antimatter';

// Read when a setting isn't under the Antimatter key, so the policies a company set for the Mattermost desktop app
// keep working after it switches
export const WINDOWS_LEGACY_REGISTRY_PATH = 'SOFTWARE\\Policies\\Mattermost';

// The machine hive comes first: a machine policy wins over a user policy
const WINDOWS_REGISTRY_HIVE_LIST = [HKEY.HKEY_LOCAL_MACHINE, HKEY.HKEY_CURRENT_USER];

// Linux has no policy store: the administrator writes this JSON file (same keys as the macOS managed preferences).
// The second path is how a Flatpak sandbox sees the host's /etc (with --filesystem=host-etc:ro).
export const LINUX_POLICY_FILES = [
    '/etc/antimatter-desktop/policies.json',
    '/run/host/etc/antimatter-desktop/policies.json',
];

type StructuredPolicyValue = CFPrefValue | null | undefined;

/**
 * Replaces %NAME% with the environment variable NAME, so one policy gives every person their own username
 * (e.g. "%USERNAME%" or "%USERNAME%@example.com" on Windows, "%USER%" on macOS and Linux).
 * Returns undefined when a variable isn't set, so the app never prefills a literal "%USERNAME%".
 */
export function expandPolicyVariables(value: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
    let missing = false;
    const expanded = value.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (match, name: string) => {
        // Windows environment variable names aren't case sensitive
        const envName = Object.keys(env).find((key) => key.toUpperCase() === name.toUpperCase());
        const envValue = envName ? env[envName] : undefined;
        if (envValue) {
            return envValue;
        }
        if (['USER', 'USERNAME', 'LOGNAME'].includes(name.toUpperCase())) {
            try {
                return os.userInfo().username;
            } catch {
                // reported as missing below
            }
        }
        missing = true;
        return match;
    });
    if (missing) {
        log.warn('A variable of the DefaultUsername policy is not set, not using the policy', {value});
        return undefined;
    }
    return expanded.trim() || undefined;
}

export class PolicyConfigLoader {
    private linuxPolicy?: Record<string, unknown>;

    getPolicyConfig = (): Partial<RegistryConfigType> => {
        this.linuxPolicy = process.platform === 'linux' ? this.readLinuxPolicyFile() : undefined;

        const config: Partial<RegistryConfigType> = {
            servers: this.getServerList(),
            enableServerManagement: this.getSingleBooleanValue('EnableServerManagement'),
            enableUpdateNotifications: this.getSingleBooleanValue('EnableAutoUpdater'),
            trustedEmbeddedMediaOrigins: this.getTrustedEmbeddedMediaOrigins(),
            defaultUsername: this.getDefaultUsername(),
        };

        // A policy that isn't set must not hide the build config value
        for (const key of Object.keys(config) as Array<keyof RegistryConfigType>) {
            if (config[key] === undefined) {
                delete config[key];
            }
        }
        return config;
    };

    getAppsUseLightTheme = (): boolean => {
        if (process.platform !== 'win32') {
            return true;
        }
        try {
            const results = enumerateValues(HKEY.HKEY_CURRENT_USER, 'Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize');
            if (!results || results.length === 0) {
                return true;
            }
            return results.find((item) => item.name === 'AppsUseLightTheme')?.data === 1;
        } catch (error) {
            log.debug('Error reading AppsUseLightTheme from registry', error);
            return true;
        }
    };

    private getServerList = (): Server[] => {
        switch (process.platform) {
        case 'win32':
            return this.getWindowsServerList();
        case 'darwin':
        case 'linux':
            return this.getStructuredServerList();
        default:
            return [];
        }
    };

    private getTrustedEmbeddedMediaOrigins = (): TrustedEmbeddedMediaOrigin[] => {
        switch (process.platform) {
        case 'win32':
            return this.getWindowsTrustedEmbeddedMediaOrigins();
        case 'darwin':
        case 'linux':
            return this.getStructuredTrustedEmbeddedMediaOrigins();
        default:
            return [];
        }
    };

    private getDefaultUsername = (): string | undefined => {
        let value: unknown;
        switch (process.platform) {
        case 'win32':
            value = this.getWindowsSingleValue('DefaultUsername');
            break;
        case 'darwin':
        case 'linux':
            value = this.getStructuredValue('DefaultUsername');
            break;
        default:
            return undefined;
        }
        if (typeof value !== 'string' || !value.trim()) {
            return undefined;
        }
        return expandPolicyVariables(value.trim());
    };

    private getWindowsServerList = (): Server[] => {
        const results = this.getWindowsValues('DefaultServerList');
        return results.map((item) => ({name: item.name, url: item.data as string}));
    };

    private getStructuredServerList = (): Server[] => {
        const results = this.getStructuredValue('DefaultServerList');
        if (!Array.isArray(results)) {
            return [];
        }
        return results.
            filter((item): item is Record<string, string> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)).
            map((item) => ({name: item.name, url: item.url}));
    };

    private getWindowsTrustedEmbeddedMediaOrigins = (): TrustedEmbeddedMediaOrigin[] => {
        const results = this.getWindowsValues('TrustedEmbeddedMediaOrigins');
        return results.
            map((item) => this.parseTrustedEmbeddedMediaOrigin(item.data)).
            filter((item): item is TrustedEmbeddedMediaOrigin => Boolean(item));
    };

    private getStructuredTrustedEmbeddedMediaOrigins = (): TrustedEmbeddedMediaOrigin[] => {
        const results = this.getStructuredValue('TrustedEmbeddedMediaOrigins');
        if (!Array.isArray(results)) {
            return [];
        }

        return results.filter((item): item is TrustedEmbeddedMediaOrigin => this.isTrustedEmbeddedMediaOrigin(item));
    };

    private parseTrustedEmbeddedMediaOrigin = (value: RegistryValue['data']): TrustedEmbeddedMediaOrigin | undefined => {
        if (typeof value !== 'string') {
            return undefined;
        }

        try {
            const parsed = JSON.parse(value);
            if (this.isTrustedEmbeddedMediaOrigin(parsed)) {
                return parsed;
            }
        } catch (error) {
            log.debug('Error parsing TrustedEmbeddedMediaOrigins registry value', {error});
        }

        return undefined;
    };

    private isTrustedEmbeddedMediaOrigin = (value: unknown): value is TrustedEmbeddedMediaOrigin => {
        if (!value || typeof value !== 'object') {
            return false;
        }

        const originPair = value as Partial<TrustedEmbeddedMediaOrigin>;
        return typeof originPair.serverOrigin === 'string' && typeof originPair.embeddedOrigin === 'string';
    };

    private getSingleBooleanValue = (valueName: string): boolean | undefined => {
        switch (process.platform) {
        case 'win32':
            return this.getWindowsSingleBooleanValue(valueName);
        case 'darwin':
        case 'linux': {
            const value = this.getStructuredValue(valueName);
            if (typeof value === 'boolean') {
                return value;
            }

            // A profile may give <integer>0</integer> or <integer>1</integer>
            if (typeof value === 'number') {
                return value === 1;
            }
            return undefined;
        }
        default:
            return undefined;
        }
    };

    // Windows registry values are always numbers or strings, so we just check if the value is 1.
    private getWindowsSingleBooleanValue = (valueName: string): boolean | undefined => {
        const value = this.getWindowsSingleValue(valueName);
        return value === undefined ? undefined : (value === 1 || value === '1');
    };

    private getWindowsSingleValue = (valueName: string) => {
        // Both hives can hold the value: the machine hive (read first) wins
        const results = this.getWindowsValues()?.filter((r) => r.name === valueName);
        return results?.[0]?.data;
    };

    /**
     * The values of the policy key (or of one of its subkeys) from both hives, machine first. The Mattermost key is
     * read only when the Antimatter key holds nothing there in either hive.
     */
    private getWindowsValues = (key?: string) => {
        const results = this.readWindowsValues(WINDOWS_REGISTRY_PATH, key);
        if (results.length) {
            return results;
        }
        return this.readWindowsValues(WINDOWS_LEGACY_REGISTRY_PATH, key);
    };

    private readWindowsValues = (root: string, key?: string) => {
        const results: RegistryValue[] = [];
        for (const hive of WINDOWS_REGISTRY_HIVE_LIST) {
            try {
                results.push(...enumerateValues(hive, key ? `${root}\\${key}` : root));
            } catch (e) {
                log.debug('Error accessing the registry', {hive, root, key}, e);
            }
        }
        return results;
    };

    /**
     * A value of the macOS managed preferences (CFPreferences of the app's bundle id) or of the Linux policy file
     */
    private getStructuredValue = (valueName: string): StructuredPolicyValue => {
        if (process.platform === 'linux') {
            return this.linuxPolicy?.[valueName] as StructuredPolicyValue;
        }
        try {
            return getCFPreferenceValue(valueName);
        } catch (error) {
            log.warn(`Nothing retrieved for '${valueName}'`, {error});
            return undefined;
        }
    };

    private readLinuxPolicyFile = (): Record<string, unknown> | undefined => {
        for (const file of LINUX_POLICY_FILES) {
            let content: string;
            try {
                content = fs.readFileSync(file, 'utf8');
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                    log.warn('Cannot read the policy file', {file, error});
                }
                continue;
            }
            try {
                const parsed = JSON.parse(content);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    log.info('Using the policy file', {file});
                    return parsed;
                }
                log.warn('The policy file does not hold a JSON object, ignoring it', {file});
            } catch (error) {
                log.warn('The policy file is not valid JSON, ignoring it', {file, error});
            }
            return undefined;
        }
        return undefined;
    };
}

const policyConfigLoader = new PolicyConfigLoader();
export default policyConfigLoader;
