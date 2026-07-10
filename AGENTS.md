# BAI Work Agent Guide

This guide is for AI agents working in this repository. Keep it aligned with
the current BAI Work product shape before changing runtime, providers,
settings, or packaging.

## Project Facts

- Product name: `BAI Work`.
- App type: Electron + React + TypeScript desktop app.
- Current product iteration targets Mac Intel / x64 first.
- Runtime strategy: the desktop shell talks to BAI Code through
  `src/main/runtime/bai-work-adapter.ts`.
- The packaged Mac Intel app should bundle `BAI-Code-Runtime`.
- Apple Silicon and Windows packaging helpers remain for later validation after
  the Intel build stabilizes.

## Provider Policy

- User-facing defaults should use BAI and BAI Code terminology.
- BAI API keys, model IDs, and base URLs are credentials/configuration, not
  source constants.
- Do not hard-code API keys, log them, commit them, or put them in snapshots.
- Do not configure Git, npm, Bun, or system proxy settings globally. If a proxy
  is needed, scope it to the single command.

## Important Paths

- Renderer UI: `src/renderer/src`
- Main process and IPC: `src/main`
- Shared settings/contracts: `src/shared`
- BAI runtime adapter: `src/main/runtime/bai-work-adapter.ts`
- BAI Code runtime resources: `resources/bai-code-runtime`
- Official BAI Code wheelhouse resources: `resources/bai-code-official`
- BAI Work documentation: `docs/`

## Runtime And API Notes

- Keep direct local chat available without requiring an IM channel first.
- Keep the renderer-facing `/v1/*` desktop boundary stable while the main
  process adapts BAI Code underneath.
- Local runtime services should listen on `127.0.0.1` and use a random
  token/password.
- Settings should prefer BAI Code concepts and BAI provider configuration.
- If an official BAI Code desktop service contract is not available, expose a
  clear unsupported/unavailable state instead of pretending the capability
  exists.

## Coding Rules

- Make surgical changes that directly support the requested behavior.
- Prefer existing project patterns and shared schemas over ad hoc string
  handling.
- Avoid speculative abstractions.
- Do not reformat unrelated files.
- Remove only dead code made obsolete by this work unless the user asks for
  broader cleanup.
- Keep new content ASCII unless user-facing Chinese text or surrounding files
  require otherwise.

## Validation

- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Unit tests: `npm run test`
- Mac Intel directory package smoke: `npm run dist:mac:dir`
- Packaging checks should confirm that `dist/mac/BAI Work.app` is an x86_64 app
  and contains `BAI-Code-Runtime`.
- For source/resource cleanup, scan for old product/provider names while
  excluding generated dependency directories such as `node_modules`, `dist`, and
  `out`.

## Git Hygiene

- Check `git status --short --branch` before committing.
- Do not commit build artifacts, extracted apps, temporary logs, local auth
  files, or API keys.
- If unrelated user changes are present, work with them and do not revert them.
