# Changelog

## 0.0.3 Beta - 2026-06-07

- Added ESLint (flat config) + Prettier + editorconfig
- Added `npm run lint`, `format`, `format:check`, `test:cov`, `audit` scripts
- Added express-rate-limit on raw `/api/command` and all mutation endpoints (`/route/*`, etc.)
- Added CONTRIBUTING.md and GitHub issue/PR templates
- Expanded CI to run lint + format check + tests + coverage + smoke + audit on every PR/push
- Added tests for CommandQueue, DeviceCapabilitiesService, route integration (supertest), and transport modules
- Fixed audit: 0 moderate+ vulnerabilities (after `npm audit fix`)
- Minor parser/connection cleanups for lint (unused vars, regex escape)
- README-claimed error log + reboot endpoints were already present in server + client API
- Updated CHANGELOG

## 0.0.2 Beta - 2026-04-23

- initial public beta release
- prepared the repository for open-source release
- removed hardcoded device defaults from the public runtime
- added legal, installation, and support documentation
