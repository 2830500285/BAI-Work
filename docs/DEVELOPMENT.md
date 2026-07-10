# Development Workflow

[简体中文](./DEVELOPMENT.zh-CN.md)

This document defines how developers should work in this repository, especially
around the default branch, pull requests, and release validation.

## Development Baseline

- `main` is the active development and release branch.
- Short-lived feature branches are encouraged for non-trivial changes.
- The current product iteration validates Mac Intel / x64 first.
- Apple Silicon and Windows builds should wait until the Intel build is stable.

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

For packaging work in the current iteration, verify the Mac Intel directory
build:

```bash
npm run dist:mac:dir
file "dist/mac/BAI Work.app/Contents/MacOS/BAI Work"
```

The executable should report `Mach-O 64-bit executable x86_64`.

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

Current local release focus:

- `npm run dist:mac:dir` for Mac Intel directory smoke builds
- `npm run dist:mac` for Mac Intel dmg/zip artifacts
- `npm run release:mac` for Mac Intel GitHub release flow

Apple Silicon and Windows release paths remain available as helper scripts, but
they are not the default iteration target until the Mac Intel build is stable.

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
