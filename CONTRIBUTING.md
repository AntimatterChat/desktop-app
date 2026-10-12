# Contributing Guidelines

Thank you for your interest in contributing to the Antimatter Desktop App!

## Issues

Before filing an issue on [GitHub](https://github.com/AntimatterChat/desktop-app/issues), please check a few things.

### Does it reproduce in a web browser?
The desktop app is based on Electron, which embeds Chromium, and shows your server's web app. If the problem also
happens in a web browser, it is most likely an issue with the server or its web app: please report it to the
[Antimatter server repository](https://github.com/AntimatterChat/antimatter/issues).

### Try "Clear Cache and Reload"
Some issues go away by reloading the server in the app: press `CMD/CTRL+SHIFT+R`, or select
**View > Clear Cache and Reload** in the menu.

### Write detailed information
If the issue persists, please include:
* How to reproduce it, step by step
* The expected behaviour (or what is wrong)
* Screenshots (for interface issues)
* The Desktop App version (**Help** in the menu, or **Antimatter > About Antimatter** on macOS)
* Your operating system
* The server version (shown in the app's **Help** menu)

## Pull requests

Before submitting a pull request, please make sure that it passes the automated checks:

```
npm run lint:js
npm run check-types
npm run test
```

If you fix a bug, consider adding a unit test so that it does not come back; for a new feature, consider end-to-end
tests too (in `e2e/`).
