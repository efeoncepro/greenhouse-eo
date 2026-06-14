# Public Site Content Factory Golden Examples

Golden examples are agent-facing artifacts that show the exact contract shape a
Codex/Claude/Nexa agent should produce before any WordPress draft write.

Rules:

- Keep examples as local artifacts only; they do not publish or write WordPress.
- Validate every `contentFactoryGeneratedDraft.v1` example with:
  `pnpm public-website:content-factory:validate -- --file <path>`.
- Prefer Gutenberg block comments and governed blocks for posts.
- Avoid `core/freeform` in new drafts, even though legacy posts use it.
- Keep secrets, private client data and unpublished campaign details out of
  golden examples.

