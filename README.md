# crestron-dm-gui-tool

Browser-based control surface for a Crestron DM-MD8x8 matrix switcher.

This project provides a lightweight Node.js server and browser UI for routing, status inspection, EDID and HDCP views, network/system queries, and raw console access over the device's CTP interface.

Current release line: `0.0.2 Beta`

![Routing matrix screenshot](docs/assets/app-screenshot.png)

## Status and Compatibility

- Public release status: initial beta
- Confirmed target: `DM-MD8x8`
- Similar Crestron DM matrix switchers may work, but they are untested.
- The response parsing in this repo is tuned to output formats observed on DM-MD8x8 firmware `v4.102`.

## Features

- Video, audio, USB, AV, and AVU routing controls
- Card, status, EDID, HDCP, network, and system views
- Error log and reboot actions
- Raw terminal panel for direct CTP commands
- Browser UI with live connection status

## Security Model

- There is no authentication or authorization layer in this app.
- The raw command endpoint and terminal view can issue direct device commands.
- Run it only on a trusted local network or behind your own access controls.
- Do not expose it directly to the public internet.
- If you find a security issue, follow the disclosure guidance in [SECURITY.md](SECURITY.md).

## Requirements

- Node.js `18+`
- Network reachability from the host running this app to the switcher
- A switcher with CTP access enabled

## Installation

```bash
git clone https://github.com/dieteradant/crestron-dm-gui-tool.git
cd crestron-dm-gui-tool
npm ci
cp .env.example .env
```

Edit `.env` as needed, then start the server:

```bash
npm start
```

Open `http://localhost:3000` in your browser unless you changed `SERVER_PORT`.

If `SWITCHER_HOST` is left blank, the web UI starts in a disconnected state and you can connect to a device from the header panel after the app loads.

## Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `SWITCHER_HOST` | No | empty | Hostname or IP of the target switcher. Leave blank to start disconnected. |
| `SWITCHER_PORT` | No | `41795` | CTP port used for the switcher connection. |
| `SERVER_PORT` | No | `3000` | Local port for the Node.js web server. |

## Usage Notes

- Start disconnected if you do not want any default device assumptions in the repo or runtime.
- Use the `Connect` control in the header to point the UI at a different device without restarting the server.
- The terminal tab is intended for engineering and troubleshooting. It exposes raw device interaction.

## Known Limitations

- The UI and parsers were built around DM-MD8x8 behavior and firmware responses.
- Other hardware families or firmware versions may return different output formats.
- There is no multi-user coordination, access control, or audit trail.

## Legal and Trademark Notice

This project is an independent, unofficial tool. It is not affiliated with, endorsed by, or sponsored by Crestron Electronics, Inc.

Crestron, DigitalMedia, DM-MD8x8, and related marks are trademarks of Crestron Electronics, Inc.

This software is provided as-is, without warranty of any kind. Use it at your own risk, especially on production AV systems.

## Commercial Support

Commercial support, custom integration work, and private adaptations are available at `dieter@adant.io`.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
