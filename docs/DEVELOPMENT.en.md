# Development Workflow

[Simplified Chinese](./DEVELOPMENT.zh-CN.md)

This document defines how developers should work in this repository, especially
around the default branch, pull requests, and release validation.

## Development Baseline

- `main` is the active development and release branch.
- Short-lived feature branches are encouraged for non-trivial changes.
- Native release validation covers Mac Intel x64, Mac Apple Silicon arm64, and
  Windows x64.
- Platform artifacts must be built and smoke-tested on matching GitHub-hosted
  runner architectures.

## Recommended Workflow

1. Update your local repository.
2. Switch to `main`.
3. Pull the latest changes from `main`.
4. Create an optional feature branch from `main` for your work.
5. Implement and validate your changes locally.
6. Open a PR back into `main` if review is needed.
7. Merge after review and passing checks.

## Example Commands

### Sync `main`

```bash
git checkout main
git pull origin main
```

### Create a feature branch from `main`

```bash
git checkout main
git pull origin main
git checkout -b feat/short-description
```

### Push your branch

```bash
git push origin feat/short-description
```

## Required Validation Before PR

At minimum, run:

```bash
npm run typecheck
npm run build
npm run test
```

If your change affects runtime behavior or UI, also run:

```bash
npm run dev
```

For packaging work, use the matching target:

```bash
npm run dist:mac:dir
npm run dist:mac:arm64
npm run dist:win
```

Mac and Windows release workflows additionally validate the executable
architecture, bundled BAI Code resources, offline wheel installation, and a
packaged-app `/health` smoke.

## PR Quality Standard

A PR should be:

- focused on one main purpose
- easy to review
- supported by validation results
- documented when behavior changes

Your PR description should include:

- what changed
- why it changed
- how you verified it
- a video or GIF if UI behavior changed
- unit tests added or updated if project logic changed

## Change Scope Standard

Prefer:

- one topic per PR
- minimal unrelated formatting churn
- no opportunistic refactors unless they are necessary for the change

Avoid:

- mixing docs, refactors, and feature work without explanation
- large undocumented behavior changes
- bypassing normal review for risky changes

## Localization Standard

If you change user-facing text:

- update English and Chinese strings together when possible
- keep wording consistent across docs and UI

## Documentation Standard

Update documentation when changes affect:

- setup
- commands
- runtime requirements
- branch strategy
- release behavior
- contributor workflow

## Release Notes

Release commands:

- `npm run dist:mac` for Mac Intel DMG/ZIP artifacts
- `npm run dist:mac:arm64` for Mac Apple Silicon DMG/ZIP artifacts
- `npm run dist:win` for the Windows x64 NSIS installer

Authoritative release validation runs in `.github/workflows/release.yml`,
`release-mac-arm64.yml`, and `release-windows.yml` on native runners.

## Suggested Branch Naming

Examples:

- `feat/runtime-settings`
- `fix/connection-probe`
- `docs/bilingual-readme`
- `refactor/chat-store`

## Maintainer Notes

If maintainers later adjust protected branches, required reviewers, automated
gates, or cross-platform release targets, this document should be updated to
match the repository rules.
