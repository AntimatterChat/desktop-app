// Copyright (c) 2026-present Antimatter contributors. All Rights Reserved.
// See LICENSE.txt for license information.

import vm from 'vm';

import {getLoginPrefillScript, isServerLoginPage} from './loginPrefill';

// Just enough of a page to run the prefill script (the unit tests have no DOM)
class FakeInput {
    name: string;
    type: string;
    dataset: Record<string, string> = {};
    events: string[] = [];
    focused = false;
    private currentValue = '';

    constructor(name: string, type = 'text') {
        this.name = name;
        this.type = type;
    }

    get value() {
        return this.currentValue;
    }

    set value(value: string) {
        this.currentValue = value;
    }

    dispatchEvent(event: {type: string}) {
        this.events.push(event.type);
        return true;
    }

    focus() {
        this.focused = true;
    }
}

function makePage({withLoginField = true} = {}) {
    const loginId = new FakeInput('loginId');
    const password = new FakeInput('password', 'password');
    const observers: Array<{callback: () => void; disconnected: boolean}> = [];
    const page = {
        hasLoginField: withLoginField,
        loginId,
        password,
        observers,
        sandbox: {} as Record<string, unknown>,
    };
    const document = {
        documentElement: {},
        activeElement: loginId as FakeInput | null,
        querySelector: (selector: string) => {
            if (selector === 'input[name="loginId"]') {
                return page.hasLoginField ? loginId : null;
            }
            if (selector === 'input[type="password"]') {
                return page.hasLoginField ? password : null;
            }
            return null;
        },
    };
    class FakeMutationObserver {
        entry: {callback: () => void; disconnected: boolean};
        constructor(callback: () => void) {
            this.entry = {callback, disconnected: false};
            observers.push(this.entry);
        }
        observe() {
            return undefined;
        }
        disconnect() {
            this.entry.disconnected = true;
        }
    }
    page.sandbox = {
        document,
        HTMLInputElement: FakeInput,
        Event: class {
            type: string;
            constructor(type: string) {
                this.type = type;
            }
        },
        MutationObserver: FakeMutationObserver,
        setTimeout: jest.fn(),
    };
    return page;
}

describe('app/views/loginPrefill', () => {
    describe('isServerLoginPage', () => {
        const server = new URL('https://chat.example.com');

        it('matches the login page of the server', () => {
            expect(isServerLoginPage(new URL('https://chat.example.com/login'), server)).toBe(true);
            expect(isServerLoginPage(new URL('https://chat.example.com/login/'), server)).toBe(true);
            expect(isServerLoginPage(new URL('https://chat.example.com/login?redirect_to=%2Fteam'), server)).toBe(true);
        });

        it('matches the login page of a server under a subpath', () => {
            const subpathServer = new URL('https://example.com/chat/');
            expect(isServerLoginPage(new URL('https://example.com/chat/login'), subpathServer)).toBe(true);
            expect(isServerLoginPage(new URL('https://example.com/login'), subpathServer)).toBe(false);
        });

        it('does not match other pages or other origins', () => {
            expect(isServerLoginPage(new URL('https://chat.example.com/team/channels/town-square'), server)).toBe(false);
            expect(isServerLoginPage(new URL('https://chat.example.com/signup_user_complete'), server)).toBe(false);
            expect(isServerLoginPage(new URL('https://evil.example.org/login'), server)).toBe(false);
            expect(isServerLoginPage(new URL('http://chat.example.com/login'), server)).toBe(false);
            expect(isServerLoginPage(undefined, server)).toBe(false);
        });
    });

    describe('getLoginPrefillScript', () => {
        it('fills an empty username field, tells React about it and moves on to the password', () => {
            const page = makePage();
            vm.runInNewContext(getLoginPrefillScript('maya'), page.sandbox);
            expect(page.loginId.value).toBe('maya');
            expect(page.loginId.events).toEqual(['input']);
            expect(page.password.focused).toBe(true);
        });

        it('never overwrites what the person typed', () => {
            const page = makePage();
            page.loginId.value = 'someone-else';
            vm.runInNewContext(getLoginPrefillScript('maya'), page.sandbox);
            expect(page.loginId.value).toBe('someone-else');
            expect(page.loginId.events).toEqual([]);
        });

        it('fills the field only once, so a field the person emptied stays empty', () => {
            const page = makePage();
            vm.runInNewContext(getLoginPrefillScript('maya'), page.sandbox);
            page.loginId.value = '';
            vm.runInNewContext(getLoginPrefillScript('maya'), page.sandbox);
            expect(page.loginId.value).toBe('');
        });

        it('waits for the login page to render the field', () => {
            const page = makePage({withLoginField: false});
            vm.runInNewContext(getLoginPrefillScript('maya'), page.sandbox);
            expect(page.loginId.value).toBe('');
            expect(page.observers).toHaveLength(1);
            expect(page.sandbox.setTimeout).toHaveBeenCalledWith(expect.any(Function), 15000);

            page.hasLoginField = true;
            page.observers[0].callback();
            expect(page.loginId.value).toBe('maya');
            expect(page.observers[0].disconnected).toBe(true);
        });

        it('treats the username as data, never as code', () => {
            const page = makePage();
            const username = '"; globalThis.injected = true; "\\\'`${1}</script> ';
            vm.runInNewContext(getLoginPrefillScript(username), page.sandbox);
            expect(page.sandbox.injected).toBeUndefined();
            expect(page.loginId.value).toBe(username);
        });
    });
});
