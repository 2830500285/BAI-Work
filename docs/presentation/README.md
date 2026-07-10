# BAI Work Project Deck

This folder contains the BAI Work project presentation.

## Files

- `BAI-Work-Project-Deck.pptx`: final PowerPoint deck.
- `deck-source.mjs`: JavaScript ES module source that generates the deck with `@oai/artifact-tool`.
- `.artifact-work/`: local artifact-tool workspace, generated previews, layout JSON, montage, and inspection output.

## Deck Structure

The deck has 22 slides:

1. Cover
2. Executive snapshot
3. Problem and need
4. Product positioning
5. Core user workflow
6. Product surface
7. Runtime UX
8. Technical architecture
9. main / preload / renderer responsibilities
10. Runtime adapter
11. BAI Code distribution strategy
12. Official service contract gap
13. Provider and model configuration
14. EBAI mapping
15. EBAI hooks safety
16. Cross-platform build matrix
17. Release chain
18. Security and compliance
19. Verification matrix
20. Current status and risks
21. Roadmap
22. Decision close

## Generate

From the project root:

```bash
node /Users/mac/.codex/plugins/cache/openai-primary-runtime/presentations/26.630.12135/skills/presentations/container_tools/setup_artifact_tool_workspace.mjs \
  --workspace docs/presentation/.artifact-work

node docs/presentation/deck-source.mjs
```

The source writes:

- `docs/presentation/BAI-Work-Project-Deck.pptx`
- `docs/presentation/.artifact-work/preview/slide-*.png`
- `docs/presentation/.artifact-work/layout/slide-*.layout.json`
- `docs/presentation/.artifact-work/BAI-Work-Project-Deck-montage.webp`
- `docs/presentation/.artifact-work/inspect.ndjson`

## Validate

Use the Presentations skill helper scripts:

```bash
python3 /Users/mac/.codex/plugins/cache/openai-primary-runtime/presentations/26.630.12135/skills/presentations/container_tools/slides_test.py \
  docs/presentation/BAI-Work-Project-Deck.pptx

python3 /Users/mac/.codex/plugins/cache/openai-primary-runtime/presentations/26.630.12135/skills/presentations/container_tools/render_slides.py \
  docs/presentation/BAI-Work-Project-Deck.pptx
```

The source also exports a montage for quick visual review:

```bash
open docs/presentation/.artifact-work/BAI-Work-Project-Deck-montage.webp
```

## Validation Result

Last checked on 2026-07-10:

- `node docs/presentation/deck-source.mjs`: passed and generated 22 slides.
- Artifact-tool PNG previews: passed, 22 preview PNG files written under `.artifact-work/preview/`.
- Layout bounds check: passed; all exported layout bounding boxes are within the 1280 x 720 slide canvas.
- PPTX slide count check: passed; the archive contains 22 `ppt/slides/slide*.xml` files.
- `unzip -t docs/presentation/BAI-Work-Project-Deck.pptx`: passed with no compressed data errors.
- Slides 16, 19, 20, 21, and 22 were visually checked after the native Mac
  Apple Silicon and Windows x64 release results were added.
- `slides_test.py` and `render_slides.py`: attempted, but this machine is missing the Python `pdf2image` package required by those helper scripts.

## Notes

- The deck uses the project-owned BAI Work logo at `src/asset/img/bai-work.png`.
- No API key, token, or credential value is included.
- BAI Code service contract risk is intentionally presented as an open product and engineering dependency.
