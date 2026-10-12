# Antimatter Desktop App Testing

## Automated tests

* Unit tests: `npm run test:unit` (Jest, next to the code as `*.test.js` and `*.test.ts`).
* End-to-end tests: `npm run e2e` (Playwright, in `e2e/`), which builds the app for tests and runs it against a
  server.

## Manual testing

To test a pre-release:

1. Install it from the [releases page](https://github.com/AntimatterChat/desktop-app/releases).
2. Add your Antimatter server (or a test server) and log in.
3. Check the server management (adding, editing, removing and reordering servers), the settings, notifications,
   downloads, deep links (`antimatter://`), calls and screen sharing, and the tray icon.
4. File an [issue](https://github.com/AntimatterChat/desktop-app/issues/new) for each bug found, with the steps to
   reproduce it, the app and server versions and your operating system.
