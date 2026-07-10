# Implementation Plan: BAI Work Runtime Integration

## Summary

Use the existing Electron/React desktop shell as BAI Work and connect it to BAI
Code through a minimal runtime adapter. Keep the renderer contract stable,
prioritize Mac Intel / x64 packaging, and expose clear unavailable states for
BAI Code capabilities that are not yet documented as desktop service APIs.

## Key Decisions

- Keep the renderer-facing `/v1/*` boundary stable.
- Use BAI Work and BAI Code terminology in public docs and UI.
- Treat BAI API keys and provider tokens as secrets.
- Build and verify Mac Intel / x64 first.
- Defer Apple Silicon and Windows iteration until the Intel build stabilizes.
- Keep EBAI hooks disabled unless explicitly enabled for a trusted workspace.

## Implementation Phases

1. Branding: update public metadata, docs, menus, icons, and release names.
2. Runtime: adapt BAI Code CLI/runtime availability behind the desktop boundary.
3. Packaging: bundle Mac Intel `BAI-Code-Runtime` and verify x86_64 output.
4. EBAI: install commands, agent commands, common rules, and disabled hooks.
5. Validation: run typecheck, targeted tests, Mac Intel package smoke, and
   runtime resource checks.

## Verification

- `npm run typecheck`
- `npm run test -- src/main/packaging-config.test.ts src/main/runtime/bai-work-adapter.test.ts src/main/services/ecc-mapping-service.test.ts`
- `npm run dist:mac:dir`
- `file "dist/mac/BAI Work.app/Contents/MacOS/BAI Work"`
