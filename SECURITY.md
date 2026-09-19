# Security Policy

## Supported Version

Security fixes, if any, will be handled against the current `main` branch.

## Deployment Expectations

- This project does not include authentication or authorization.
- It is intended for trusted local networks or environments with external access controls.
- Do not expose it directly to the public internet.
- CTP console traffic is sent in cleartext over TCP port 41795.
- The SSH transport accepts any device host key (`hostVerifier` is unconditionally permissive), so it does not protect against on-path impersonation of the switcher. Only use it on networks you trust.

## Reporting a Vulnerability

If you find a security issue, do not open a public GitHub issue with exploit details.

Report it privately to `dieter@adant.io` with:

- a short description of the issue
- affected version or commit
- reproduction steps
- any logs or screenshots needed to understand impact
