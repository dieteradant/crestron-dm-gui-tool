# Changelog

## 0.0.3 Beta - unreleased

- added SSH console transport alongside raw CTP
- UI and card inventory now size themselves from the connected chassis, adding DM-MD16x16 support
- refreshed browser UI with design tokens and matrix usability improvements
- closed repository gaps: lint, tests, CI smoke test, and dependency security updates
- consolidated the connection state payload and API error handling into shared server helpers
- command completion is now driven solely by the connection's prompt event instead of a duplicated buffer scan in the command queue
- command queue results report `timedOut`/`disconnected`; the routing grid flags incomplete switcher responses instead of silently rendering partial data
- commands queued while disconnected now fail after a bounded wait instead of hanging forever, and the in-flight command completes early when the connection drops
- extracted the Express app into `server/app.js` so the API is testable without hardware; added unit tests for the command queue, API integration tests, and client helper tests
- API endpoints validate ports and ranges against known device capabilities, and string fields that reach CTP command lines reject whitespace and control characters
- requests while the switcher is disconnected now return 503 instead of 500
- CI now runs the test suite and lint on Node.js 18 and 22
- documented that SSH host key verification is disabled and CTP traffic is cleartext

## 0.0.2 Beta - 2026-04-23

- initial public beta release
- prepared the repository for open-source release
- removed hardcoded device defaults from the public runtime
- added legal, installation, and support documentation
