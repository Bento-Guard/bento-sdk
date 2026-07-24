# @bentoguard/sdk

## 1.3.1

### Patch Changes

- e11a045: - Removed Socket Reachability Scan from CI as it requires an Enterprise plan.
  - Added a new GitHub Action to send Telegram notifications when an Issue, Pull Request, or Security Advisory is created.
  - Fixed the Vitepress documentation `base` path to correctly deploy on GitHub Pages.
  - Fixed the `release-tag` workflow so that it correctly recognizes GitHub Merge commits and successfully tags new releases.
  - Added a `prepack` script to `package.json` to ensure the SDK source code is automatically compiled into the `dist` folder before publishing to NPM.

## 1.3.0

### Minor Changes

- 2c34cb5: - Added VitePress documentation site with comprehensive user and contributor guides.
  - Included system architecture sequence diagrams powered by Mermaid.
  - Fixed Git configuration to properly track documentation files.

## 1.2.11

### Patch Changes

- - Optimized CI workflows by pinning GitHub Action dependencies to specific SHAs for maximum security.
  - Re-configured Prettier and ESLint (supporting both Node.js backend and browser frontend codebases).
  - Added comprehensive team workflow, branching guidelines, and checklists in `docs/workflow-guidelines.md`.

## 1.2.10

### Patch Changes

- - Setup Husky hooks (pre-commit, pre-push) and lint-staged configuration.
  - Added GitHub Issue templates for Bug Reports and Feature Improvements (Markdown and YAML forms).
  - Updated SDK License from MIT to Apache-2.0.
  - Standardized `SECURITY.md` with vulnerability reporting guidelines.
  - Added `CODE_OF_CONDUCT.md` and `CONTRIBUTING.md` to establish community guidelines.
