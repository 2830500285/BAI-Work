---
name: bai-work-token-efficiency
description: BAI Work token-efficiency defaults for concise replies, compact shell output, and safe optional use of RTK/Caveman-style workflows.
---

# BAI Work Token Efficiency

Use this skill when the user asks to save tokens, keep context lean, reduce cost, run long coding sessions, or avoid noisy command output.

## Response Policy

- Be concise by default. Keep conclusions, commands, file paths, and verification results; remove filler, praise, repeated restatement, and broad speculation.
- Preserve technical accuracy. Do not shorten code, exact errors, API names, file paths, model names, or commands in a way that changes meaning.
- Use normal professional language unless the user explicitly asks for Caveman mode. Short output should not become unclear output.
- For high-risk actions, security findings, migrations, destructive commands, credentials, releases, and legal/compliance text, prefer clarity over compression.

## Context Policy

- Read the smallest useful set of files. Prefer `rg`, `rg --files`, targeted `sed`, and narrow `git diff` over broad dumps.
- Avoid re-reading unchanged files in the same task. If a summary or previous read is enough, use it.
- For large files, inspect structure first, then read focused ranges.
- Report only decisive command output. Summarize long logs and quote the shortest exact failing line.

## Shell Output Policy

When `rtk` is installed and available on `PATH`, prefer compact RTK commands for noisy inspections:

- Use `rtk git status`, `rtk git diff`, and `rtk git log` for Git state.
- Use `rtk grep`, `rtk find`, and `rtk read` for repository inspection when full output is unnecessary.
- Use `rtk vitest`, `rtk tsc`, `rtk test <cmd>`, or `rtk err <cmd>` for test, typecheck, lint, and build output.

Do not run `rtk init -g`, install shell hooks, edit global shell profile files, or modify global agent settings unless the user explicitly asks for that setup.

## Tool Selection

- RTK is best for compact shell/test/build output.
- Caveman is best when the user wants aggressively terse replies or slash-command style compression.
- Prompt-only token rules are best for light default concision.
- OpenWolf-style read hooks and router-style model gateways require external runtime integration; do not enable them silently.

## Completion Style

End with what changed, what was verified, and any remaining risk. Keep it short.
