---
"@bentoguard/sdk": patch
---

- Removed Socket Reachability Scan from CI as it requires an Enterprise plan.
- Added a new GitHub Action to send Telegram notifications when an Issue, Pull Request, or Security Advisory is created.
- Fixed the Vitepress documentation `base` path to correctly deploy on GitHub Pages.
- Fixed the `release-tag` workflow so that it correctly recognizes GitHub Merge commits and successfully tags new releases.
- Added a `prepack` script to `package.json` to ensure the SDK source code is automatically compiled into the `dist` folder before publishing to NPM.
