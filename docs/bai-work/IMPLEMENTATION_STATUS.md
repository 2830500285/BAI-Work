# BAI Work Implementation Status

## Architecture

BAI Work is an Electron desktop workbench built around BAI Code. The renderer
uses a stable local `/v1/*` desktop boundary while the main process adapts BAI
Code runtime behavior through `src/main/runtime/bai-work-adapter.ts`.

## Implemented

- Public product branding, package metadata, app icon, artifact names, and
  release naming use BAI Work.
- Mac Intel / x64 packaging bundles `BAI-Code-Runtime`.
- Mac Apple Silicon / arm64 and Windows / x64 packaging bundle platform-only
  `BAI-Code-Official` wheelhouses for Python 3.10-3.13.
- BAI provider defaults use `https://api.b.ai/v1`.
- BAI Code configuration is passed through local settings and environment
  variables without hard-coded credentials.
- Runtime unavailable states are explicit when official BAI Code desktop
  service capabilities are not published.
- EBAI mapping can install commands, agent commands, common rules, and a disabled
  hooks manifest into the BAI Code user directory.
- Hooks are generated disabled by default and require an explicit trusted
  workspace before execution is enabled.

## Verification

- TypeScript: `npm run typecheck`
- Focused tests:
  `npm run test -- src/main/packaging-config.test.ts src/main/runtime/bai-work-adapter.test.ts src/main/services/ecc-mapping-service.test.ts`
- Production build: `npm run build`
- Mac Intel directory package smoke: `npm run dist:mac:dir`
- Mac Apple Silicon package: `npm run dist:mac:arm64`
- Windows x64 package: `npm run dist:win`
- Packaged app architecture check:
  `file "dist/mac/BAI Work.app/Contents/MacOS/BAI Work"`
- Packaged runtime check: confirm
  `dist/mac/BAI Work.app/Contents/Resources/BAI-Code-Runtime` exists.
- Diff hygiene: `git diff --check`

## Release Matrix

- Mac Intel x64, Mac Apple Silicon arm64, and Windows x64 have native CI builds
  and packaged runtime health smokes.
- Release assets are published together under GitHub release `v0.1.1`.
- Apple Silicon and Windows require a supported system Python to bootstrap the
  bundled official BAI Code wheelhouse.
- Keep credentials out of source, logs, snapshots, and packaged resources.

## Secret Handling

Do not commit BAI API keys, provider tokens, local auth files, or private
machine paths. Use local environment variables or the app settings store only.
