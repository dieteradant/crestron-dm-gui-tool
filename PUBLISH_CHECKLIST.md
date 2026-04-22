# Scrub & Publish Checklist — crestron-dm-gui-tool

A lean, sequential checklist to get this from a private project to a public GitHub repo under Apache 2.0, with optional commercial paths preserved. Do the blockers first — if any fail, stop and resolve before moving on.

---

## 0. Blockers (resolve before anything else)

- [ ] **IP ownership clear.** If any code was written on employer time, on employer hardware, or under a consulting contract: confirm in writing that you own the IP (or have permission to release it). Do not skip this.
- [ ] **No employer confidential info in commits.** Run `git log --all -p | grep -iE '(customer|client|site|internal)'` and scan for anything identifying.
- [ ] **Decide: quiet commercial shop-around first?** If you want to offer this privately to 1–2 integrators before open-sourcing, do that now. Once it's public, that path closes.

---

## 1. Scrub secrets and customer data

- [ ] Delete `.env` from the working tree and confirm it's in `.gitignore`.
- [ ] Create `.env.example` with placeholder values and no real IPs, hostnames, or passwords.
- [ ] `git log -- .env` — if `.env` was ever committed, rewrite history (`git filter-repo` or `git filter-branch`) or start a fresh repo without the old history. A `.env` in old commits is still public.
- [ ] Search the full codebase for hardcoded IPs: `grep -rEn '([0-9]{1,3}\.){3}[0-9]{1,3}' --include='*.js' --include='*.html' .`
- [ ] Search for hardcoded hostnames, customer names, or site codes.
- [ ] Search for embedded credentials: `grep -rEni 'password|passwd|secret|token|api[_-]?key' --include='*.js' .`
- [ ] Remove any non-yours assets (icons, screenshots, diagrams) that came from Crestron materials or a customer.

---

## 2. Legal hygiene

- [ ] Add `LICENSE` file with Apache License 2.0 full text.
- [ ] Add `NOTICE` file with copyright line: `Copyright YYYY Your Name. Licensed under the Apache License, Version 2.0.`
- [ ] Add SPDX header to each source file: `// SPDX-License-Identifier: Apache-2.0`
- [ ] Add trademark disclaimer to README: "Not affiliated with or endorsed by Crestron Electronics, Inc. Crestron, DigitalMedia, DM-MD8x8, and related marks are trademarks of Crestron Electronics, Inc."
- [ ] Add warranty disclaimer: "Provided as-is, without warranty. Use at your own risk on production AV systems."
- [ ] Confirm no Crestron SDK headers, no copied API docs, no bundled firmware, no verbatim command reference tables.

---

## 3. README (minimum viable)

- [ ] One-sentence description (what it is, what hardware it targets).
- [ ] Screenshot or short GIF of the UI. This is the single highest-ROI thing you can add.
- [ ] Hardware compatibility statement (DM-MD8x8 confirmed; others "may work, untested").
- [ ] Quick start: clone → `npm install` → configure `.env` → `npm start`.
- [ ] `.env` variables documented.
- [ ] Default port and where to point a browser.
- [ ] "Not affiliated with Crestron" disclaimer.
- [ ] License badge and link.
- [ ] Optional: "Commercial license and support available — contact <email>" line to preserve that path.

---

## 4. Repo hygiene

- [ ] `.gitignore` covers `node_modules/`, `.env`, `.DS_Store`, editor files, logs.
- [ ] `package.json` `author`, `repository`, `bugs`, `homepage`, and `license: "Apache-2.0"` fields filled in.
- [ ] `package-lock.json` committed.
- [ ] No `node_modules/` in the repo.
- [ ] A single `main` or `master` branch, clean linear history or acceptable merge history.
- [ ] Top-level `CHANGELOG.md` with a `v1.0.0` entry (can be one line).
- [ ] Optional: basic GitHub Actions workflow that runs `npm install` and a smoke test on push. Not required for v1.

---

## 5. Publish

- [ ] Create public GitHub repo under your account.
- [ ] Push `main`. Tag `v1.0.0`.
- [ ] Enable Issues. Disable Discussions unless you want to answer questions (you said minimal time — leave off).
- [ ] Pin the repo to your GitHub profile.
- [ ] Enable GitHub Sponsors or a "Buy me a coffee" link in repo settings (optional, zero ongoing cost).
- [ ] Write a 3-sentence project description for the repo's About field, with topics: `crestron`, `audiovisual`, `av-integration`, `matrix-switcher`, `dm-md8x8`.

---

## 6. Announce (one pass, then walk away)

- [ ] Post to r/crestron with title like "I built an open-source web UI for the DM-MD8x8 — feedback welcome."
- [ ] Post to r/commercialAV.
- [ ] Post to AVNation forum and/or the CresNet community if you're active there.
- [ ] LinkedIn post tagging AV integrator contacts. This is the post most likely to generate commercial inbound.
- [ ] Do NOT cross-post aggressively. One post per venue, answer the first wave of comments, then stop.

---

## 7. Optional — preserve commercial paths

- [ ] Add `COMMERCIAL.md` with one paragraph: "Apache 2.0 covers open-source use. For commercial support, indemnified licensing, or custom integration work, email <address>." Costs nothing to have it there.
- [ ] Reserve a domain name if you might spin it into a product later (e.g., `crestron-dm-ui.com` or a neutral brand).
- [ ] Keep a private fork with any customer-specific work separate from the public repo from day one.

---

## Done criteria

You're done when:
1. A stranger can clone, read the README, configure `.env`, run `npm start`, and reach the UI.
2. No secrets, no customer data, no Crestron-authored material in the repo or history.
3. LICENSE + NOTICE + disclaimer are present.
4. The repo has a screenshot and topics so it's discoverable.

If all four are true, ship it.
