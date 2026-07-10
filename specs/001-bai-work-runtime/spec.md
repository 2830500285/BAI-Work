# Feature Specification: BAI Work Runtime Integration

## User Need

BAI Work should provide a Mac Intel desktop workbench for BAI Code. Users need
to configure BAI credentials, choose models, start project conversations, use
BAI Code commands and skills, and receive clear setup guidance when a runtime
capability is unavailable.

## Functional Requirements

- The app presents itself as BAI Work in public-facing metadata,
  documentation, runtime status, menus, and release artifacts.
- The app stores and uses BAI credentials without committing, logging, or
  packaging secrets.
- The desktop shell can locate or bootstrap the BAI Code runtime used by the
  current platform.
- The renderer-facing `/v1/*` desktop boundary remains stable while the main
  process adapts BAI Code underneath.
- Missing official BAI Code desktop service APIs are reported as unavailable
  with actionable configuration/install guidance.
- EBAI commands, agent commands, rules, and hooks can be mapped into the BAI
  Code user directory.
- EBAI hooks are generated disabled by default and can only be enabled for a
  trusted workspace.

## Success Criteria

- A fresh Mac Intel checkout can run `npm run dist:mac:dir`.
- The packaged app binary is x86_64.
- The packaged app includes `BAI-Code-Runtime`.
- `npm run typecheck` passes.
- Runtime adapter, packaging, branding, and EBAI tests pass.
- No public-facing docs present BAI Work as the old product or runtime.

## Assumptions

- Current product iteration prioritizes Mac Intel / x64.
- Apple Silicon and Windows validation will resume after the Intel build is
  stable.
- Official BAI Code desktop service APIs remain a dependency to confirm before
  claiming full session/event/permission/question parity.
