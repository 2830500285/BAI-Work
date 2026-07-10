# Model Provider Presets

## Context

BAI Work keeps model supplier configuration in the existing
`ModelProviderProfileV1` shape. A provider profile stores the display name,
base URL, endpoint format, model IDs, capability metadata, and optional media
capabilities used by chat, Write, and background automation.

The current BAI Work build ships a conservative built-in provider catalog:

- one default BAI provider
- OpenAI-compatible chat completions as the default endpoint format
- editable provider fields after creation
- no preconfigured non-BAI legacy providers

Preset providers remain opt-in. The first-run flow and Settings > Providers can
add known presets, but credentials are still stored only in local settings and
are never embedded in the application package.

## Built-In Provider

BAI:

- id: `bai`
- display name: `BAI`
- base URL: `https://api.b.ai/v1`
- endpoint format: OpenAI-compatible Chat Completions
- docs: `https://docs.b.ai/baicode/BAI-code-introduction/`
- API key entry point: `https://b.ai/`
- default models:
  - `claude-sonnet-4-6`
  - `gpt-5.2`
  - `gpt-5-mini`
  - `gpt-5-nano`
  - `gemini-3-pro-preview`
  - `deepseek-v3.2`
  - `kimi-k2-thinking`

The defaults are not locked. Users can edit base URLs, endpoint formats, and
model IDs if BAI publishes new endpoints or if they need a compatible gateway.

## Runtime Relationship

The provider preset feeds the BAI Work desktop runtime adapter. BAI Code is
launched or probed as the `baicode` CLI, while BAI Work exposes the local
desktop HTTP/SSE contract needed by the renderer.

As of the current public BAI Code documentation, the CLI documents one-shot
prompt, resume, model, base URL, and API key options, but it does not document a
desktop local service contract for sessions, events, permissions, or questions.
BAI Work therefore keeps a small compatibility bridge for thread/turn APIs and
routes model calls through the configured BAI-compatible chat completions
endpoint.
