# OpenAI contribution slide design

## Communication job

By the end of slide 15, hackathon judges should see that BAI Work is led by an OpenAI open-source contributor who can translate upstream Agent infrastructure principles into a defensible desktop product reliability model.

## Options considered

1. Replace slide 15 with a full upstream-to-product proof slide. This preserves the 19-slide pacing and turns a repetitive build-metrics page into a stronger founder-technology credential.
2. Add a twentieth slide. This keeps the build matrix but lengthens the defense and requires a broader narrative reset.
3. Add a small contributor badge to the existing slide. This is the smallest change, but it reduces the contribution to resume decoration and does not explain its relevance to BAI Work.

## Decision

Use option 1. The slide keeps the inherited four-metric and three-row composition:

- The four evidence blocks identify the contributor, merged PR, shipped SDK release, and GPT-5.6 ChatGPT Codex-assisted contribution workflow.
- The three rows map the upstream change to BAI Work's independent implementation of bounded state, deduplicated replay, and timeout recovery.
- The closing strip explicitly states that BAI Work reuses the engineering principle, not the Python implementation.

## Evidence boundary

The [OpenAI repository PR](https://github.com/openai/openai-agents-python/pull/3642) and [v0.17.7 release](https://github.com/openai/openai-agents-python/releases/tag/v0.17.7) publicly prove that `@2830500285` authored PR #3642, that it was merged, and that the release names the author as a first-time contributor. The BAI Work repository independently proves bounded pending state, monotonic event cursors, cross-batch deduplication, SSE resume/backoff, and runtime circuit breaking.

No public source proves that ChatGPT Codex directly embeds this PR. [OpenAI's GPT-5.6 availability note](https://help.openai.com/en/articles/20001354-gpt-56-in-chatgpt) proves only that GPT-5.6 is available in Codex. The slide therefore describes GPT-5.6 ChatGPT Codex as part of the contributor's development and review workflow, and does not claim product-level code adoption.
