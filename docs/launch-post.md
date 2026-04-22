# Launch Post Draft

I just open-sourced `crestron-dm-gui-tool`, a browser-based control surface for the Crestron DM-MD8x8 matrix switcher.

It gives me a lightweight web UI for routing, status inspection, EDID and HDCP views, network and system queries, plus a raw terminal for direct CTP commands when needed.

This is the initial public beta release, `0.0.2 Beta`. It is confirmed against the DM-MD8x8, and similar DM matrix switchers may work but are still untested.

Repo: https://github.com/dieteradant/crestron-dm-gui-tool

Highlights:

- browser-based routing and status UI
- starts safely with no baked-in device host
- screenshot, install instructions, and `.env.example` included
- Apache 2.0 licensed
- Issues are enabled for bug reports and feedback

Important note:

- this is an unofficial tool and is not affiliated with or endorsed by Crestron
- there is no built-in auth layer, so it should stay on trusted networks

If you use a DM-MD8x8 and give it a try, I’d be interested in bug reports, compatibility notes, and feedback on what would make the next beta more useful.
