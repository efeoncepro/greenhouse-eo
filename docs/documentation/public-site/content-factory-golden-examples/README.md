# Public Site Content Factory Golden Examples

Golden examples are agent-facing artifacts that show the exact contract shape a
Codex/Claude/Nexa agent should produce before any WordPress draft write.

Rules:

- Keep examples as local artifacts only; they do not publish or write WordPress.
- Validate every `contentFactoryGeneratedDraft.v1` example with:
  `pnpm public-website:content-factory:validate -- --file <path>`.
- Use `pnpm public-website:content-factory:patterns` to inspect the current
  `gutenbergBlockPatternCatalog.v1` before creating or refreshing a post.
- Prefer Gutenberg block comments and governed blocks for posts.
- Avoid `core/freeform` in new drafts, even though legacy posts use it.
- Match the Efeonce blogpost composition profile: intro, TL;DR/list,
  `yoast-seo/table-of-contents`, H2/H3 outline, enrichment blocks and governed
  metadata. See `../gutenberg-post-authoring-recipes.md`.
- Treat image/video as media slots until a real WordPress media ID or valid
  source URL is resolved; do not invent asset IDs in golden examples.
- Keep secrets, private client data and unpublished campaign details out of
  golden examples.
