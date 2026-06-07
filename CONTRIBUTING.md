# Contributing to crestron-dm-gui-tool

Thank you for your interest in improving this tool.

## Development

- Node.js >= 18
- `npm ci`
- Copy `.env.example` to `.env` (or leave blank to start disconnected)
- `npm start` or `npm run dev`

### Quality gates (run before PR)

```bash
npm run lint
npm run format:check
npm test
npm run test:cov
npm run smoke
npm audit --audit-level=moderate
```

### Testing

- Unit + integration tests live in `test/`
- Use Node's built-in test runner (`node --test`)
- Parser and command behavior tests are the most valuable additions

### Adding support for new hardware/firmware

1. Capture real `VER`, `CARDS`, `DUMPDMROUTEInfo`, and other command output
2. Add or extend cases in `server/ctp/parser.js`
3. Add regression tests in `test/parser.test.js` and/or `test/device-capabilities.test.js`
4. Verify the UI dynamically sizes using the new `inputCount`/`outputCount`

## Pull Requests

- Keep changes focused
- Include or update tests for parser/routing logic
- Run the full quality gate locally
- Update README/CHANGELOG when behavior or configuration changes

## Security

Report vulnerabilities privately per [SECURITY.md](SECURITY.md). Do not open public issues for security problems.

## Code Style

- 2-space indent, semicolons, single quotes (enforced by Prettier + ESLint)
- No new production dependencies without discussion
- Prefer small, pure parser functions over large conditionals

## License

Apache-2.0 — see [LICENSE](LICENSE).
