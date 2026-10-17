// Copyright (c) 2026-present Antimatter contributors. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Prefills the username on the login page of a server the administrator set, with the DefaultUsername policy.
 *
 * The server's login page (Fusion and the classic web app) has no parameter for it, so the app fills the
 * "loginId" field itself once the page shows it, and only when the field is empty: it never overwrites what the
 * person typed, and they can still change it.
 */

const LOGIN_FIELD_TIMEOUT_MS = 15000;

/**
 * Whether the URL is the login page of the server (which may live under a subpath, like https://example.com/chat)
 */
export function isServerLoginPage(pageURL: URL | undefined, serverURL: URL | undefined): boolean {
    if (!pageURL || !serverURL) {
        return false;
    }
    if (pageURL.origin !== serverURL.origin) {
        return false;
    }
    const serverPath = serverURL.pathname.replace(/\/+$/, '');
    const pagePath = pageURL.pathname.replace(/\/+$/, '');
    return pagePath === `${serverPath}/login`;
}

/**
 * The script run in the login page. The username is embedded as a JSON string literal, so no value can break out of
 * it. It fills the field through the native value setter and an input event, so React sees the change.
 */
export function getLoginPrefillScript(username: string): string {
    return `(() => {
    const username = ${JSON.stringify(username)};
    const fill = () => {
        const input = document.querySelector('input[name="loginId"]');
        if (!input) {
            return false;
        }
        if (input.value || input.dataset.antimatterPrefilled) {
            return true;
        }
        input.dataset.antimatterPrefilled = 'true';
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, username);
        input.dispatchEvent(new Event('input', {bubbles: true}));
        const password = document.querySelector('input[type="password"]');
        if (password && document.activeElement === input) {
            password.focus();
        }
        return true;
    };
    if (fill()) {
        return;
    }
    const observer = new MutationObserver(() => {
        if (fill()) {
            observer.disconnect();
        }
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});
    setTimeout(() => observer.disconnect(), ${LOGIN_FIELD_TIMEOUT_MS});
})();`;
}
