# BAI Work

<p align="center">
  <img src="src/asset/img/bai-work.png" width="104" alt="BAI Work icon">
</p>

BAI Work is a desktop agent workbench built around the BAI Code runtime. It
focuses on software engineering tasks such as coding, debugging, architecture
design, document generation, planning, reviews, automation, and tool-assisted
workflows.

## Highlights

- **BAI Code core**: packages and invokes the official `baicode` CLI, with a
  small BAI Work bridge for desktop threads, live progress, estimated usage,
  and generated artifacts.
- **BAI providers first**: built-in support for the official BAI API plus
  custom OpenAI-compatible providers.
- **Project workflow**: project-scoped conversations, workspace selection, Git
  context, file references, side conversations, checkpoints, and review
  surfaces.
- **Engineering guardrails**: bundled BAI Work guardrails and Hermes-derived
  skills, an EBAI mapping installer, installable Agent-Reach, and optional
  external MCP servers.
- **Desktop app**: macOS-first Electron application with packaged runtime
  resources and local-only service defaults.

## Quick Start

```bash
npm install
npm run dev
```

For a packaged macOS directory build:

```bash
npm run dist:mac:dir
```

The app stores local preferences and runtime files under the BAI Work
application data directory. API keys are credentials and should not be
committed.

## Runtime

BAI Work keeps a stable local `/v1/*` desktop boundary for the renderer while
forwarding runtime work to BAI Code and the configured BAI-compatible chat
completion endpoint.

The public BAI Code documentation currently documents the `baicode` CLI and
does not publish the full desktop local service contract for sessions, event
streams, permissions, and questions. BAI Work therefore includes a small
compatibility bridge for the desktop UI and keeps that gap explicit in runtime
errors.

Cache-hit telemetry is displayed as unavailable when the runtime does not
report it; BAI Work does not invent a zero hit rate.

## Project Documents

- [BAI Work technical whitepaper (PDF)](docs/whitepaper/bai-work-whitepaper.pdf)
- [BAI Work technical whitepaper (LaTeX source)](docs/whitepaper/bai-work-whitepaper.tex)
- [BAI Work project presentation (PPTX)](docs/presentation/BAI-Work-Project-Deck.pptx)

## Release

Release artifacts use the `BAI-Work-${version}-${os}-${arch}` naming scheme.
See `electron-builder.config.cjs` and `scripts/` for macOS, Windows, Linux, and
R2 publishing helpers.

## Notices

BAI Work is a derivative desktop workbench with a BAI Code-based runtime. Keep
upstream notices and license requirements intact when redistributing.
