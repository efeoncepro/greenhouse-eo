# AI Content Factory and Gutenberg Workflows

Use this reference for Greenhouse AI Content Factory, Gutenberg posts, guided editorial refresh, draft/private clone plans, and content intelligence maps.

Canonical docs:

- `docs/documentation/public-site/public-site-content-factory-end-to-end.md`
- `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- `docs/documentation/public-site/wordpress-blog-content-hub-search.md`
- `docs/manual-de-uso/public-site/operar-wordpress-blog-content-hub-search.md`
- `docs/audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md`
- `docs/documentation/public-site/content-factory-ideation-and-cocreation.md`
- `docs/documentation/public-site/content-factory-golden-examples/README.md`
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
- `docs/tasks/in-progress/TASK-1123-greenhouse-ai-content-factory-agent-kit.md`

## Core Model

- Posts and landings are separate lanes.
- Posts should be Gutenberg/block-first because current Efeonce editorial posts use Gutenberg.
- Landings should be constrained Elementor/Ohio modules unless a reusable custom widget is justified.
- Current WP post permalinks use `/%category%/%postname%/`; category changes can change published URLs.
- There is no assigned WP posts page (`page_for_posts=0`) as of the 2026-07-09 audit; archives/categories/search carry the visible blog experience.
- Ohio parent owns archive/search/single render; the child theme only overrides selected surfaces such as headline/footer and support CSS.
- Native WP search mixes posts, pages, attachments, Elementor landing pages and Ohio portfolio. For content-hub search, plan a post-only/editorial search instead of relying on global search.
- Existing content must be inspected before refresh/fix.
- Refresh/fix works on draft/private clone first. Direct mutation of published content requires explicit task/release approval.
- Treat `blockName` for Gutenberg and `widgetType` for Elementor as builder module identifiers; keep the native field in planning artifacts.

## Required Inspection Before Existing-Content Edits

Build or load a Content Intelligence Map covering:

- post/page id;
- editor model;
- blocks/widgets;
- Ohio/theme metas;
- Elementor settings;
- assets/media;
- SEO/Yoast;
- HubSpot/CTA;
- anchors;
- ownership/freshness/fingerprint.

For content-hub/blog work, additionally inspect:

- current permalink and whether category is part of it;
- category hierarchy and Yoast primary category;
- tag quality and demo/duplicate tags;
- featured image and excerpt quality for Ohio cards;
- whether the post appears in relevant category archives/search;
- sidebar/search impact if the work changes navigation or discovery.

## Commands

Read-only discovery and maps:

```bash
pnpm public-website:content-factory:inspect -- --write
pnpm public-website:content-factory:inspect -- --target <id[:label]> --write
pnpm public-website:content-factory:inspect -- --from-bridge-inspection <path> --write
pnpm public-website:content-factory:inspect-post-deep -- --post-id <id> --write
pnpm public-website:content-factory:patterns
pnpm public-website:content-factory:capabilities
```

Plan-only refresh/fix:

```bash
pnpm public-website:content-factory:refresh-plan -- --inspection <post-deep-inspection.json> --write
pnpm public-website:content-factory:patch-plan -- --refresh-plan <refresh-plan.json> --brief <patch-brief.json> --write
pnpm public-website:content-factory:refresh-draft-plan -- --patch-plan <patch-plan.json> --private --write
```

Generated drafts:

```bash
pnpm public-website:content-factory:plan -- --file ./tmp/content-brief.json --out ./tmp/generated-post-draft.json
pnpm public-website:content-factory:validate -- --file ./tmp/generated-post-draft.json
pnpm public-website:content-factory:smoke-plan -- --file ./tmp/generated-post-draft.json --private --write
```

Fast editorial pullquote lane:

```bash
pnpm public-website:content-factory:post-tool -- edit-pullquote --post-url <url> --near-heading "<heading>" --replacement "<text>" --apply --write
```

## Gutenberg Guardrails

- Do not generate flat paragraph-only drafts.
- WordPress post title owns the H1; generated `post_content` must not include H1.
- Prefer Gutenberg comments and governed blocks.
- Use `yoast-seo/table-of-contents` on long editorial posts when the composition profile requires it.
- Treat `core/freeform` as observable legacy debt for inspection/refresh, not as a generated block for new drafts.
- Validate drafts before any bridge write.
- Author inline links and restrained semantic emphasis as structured rich-text segments (`{ text, href?, strong? }`) in intros, paragraphs, lists and CTAs. Let Content Factory escape them, render `strong: true` as `<strong>` and enforce `http:`, `https:` or `mailto:`; never inject raw anchor or emphasis HTML into a spec.
- `status=block` from validation is a hard stop; `status=warning` requires review.
- For Glitch POV, prefer `efeoncepro/glitch-drop`; it is an editorial aside, not a quote.

## Content Hub / Search Guardrails

- Do not treat current tags as public navigation until demo tags, duplicates and typos are cleaned.
- Do not retaxonomize published posts without a URL/canonical/redirect plan because category participates in permalinks.
- Do not index internal search results; current Yoast behavior is `noindex, follow` and should remain unless a specific SEO decision changes it.
- Do not use the `eo-vibe-coding-api` `blog-hub` scaffold as the final content hub. It is a planning scaffold and still needs real recent-posts/editorial navigation widgets.
- Before refreshing the content hub, plan separate workstreams for editorial taxonomy, demo content cleanup, sidebar/navigation cleanup, post-only search and hub canonical URL.

## Existing Post Refresh Guardrails

- `post-deep-inspection` parses live `post_content` with `parse_blocks()` and emits paths/fingerprints.
- `refresh-plan` is local artifact only: no WordPress call, no write, no clone.
- `patch-plan` validates proposed operations against source fingerprint and block fingerprints.
- `ready_for_draft_clone` only means the artifact can feed a future clone/draft command; it still has not written WordPress.
- `refresh-draft-plan` emits a signed dry-run request for the bridge endpoint; it never sends by itself.
- Future sends require deployed bridge endpoint, writes enabled briefly, shared secret resolution, readback, and rollback evidence.

## Bridge Write Boundary

Draft/private smoke and bridge contracts are dry-run unless explicitly approved:

```bash
pnpm public-website:bridge-draft-contract
```

`--send` requires a configured shared secret and approved production/staging rollout. Do not use it as an ad-hoc write path.

## AI-authored pipeline — ideate → author → validate → run (Slice 8-9, LIVE 2026-07-03)

The full authoring pipeline is **built and verified live end-to-end**. It turns an
idea into a governed, private, operator-authored WordPress post. Canonical docs:
`docs/documentation/public-site/content-factory-ideation-and-cocreation.md` +
`gutenberg-post-authoring-recipes.md`.

### The shared canvas: `GutenbergArticleSpec`

One typed artifact, many co-authors (LLM, Claude Code, Codex, Nexa, human). The
author decides the CONTENT (a spec: `title, slug?, excerpt, seo{title,description},
intro[], sections[{heading, level(2|3), blocks[]}], cta?`); the assembly guarantees
the STRUCTURE. `authorGutenbergDraft(spec)` (in `article-authoring.ts`) →
`contentFactoryGeneratedDraft.v1` with anchored headings + populated Yoast TOC +
escaping + kebab slug + no invented media. Because assembly is deterministic, the
dead-TOC / unanchored-heading defect class cannot reappear.

### Two modes (operator requirement)

- **Autonomous** — `ideateArticleSpec(idea, context)` (`article-ideation.ts`,
  server-only) uses `generateStructuredAnthropic` (canonical `src/lib/ai/`) with
  Efeonce editorial rules baked in (es-CL tuteo, intro→TOC→H2/H3, ≥3 headings,
  ≥2 H2, enrichment, **public-data-only, never invents figures/media**, Yoast SEO
  vars). Verified live (real Claude call → 5×H2 + 2×H3 article, validate=pass).
- **Co-creation** — `reviseArticleSpec(spec, instruction)` steers an existing spec
  with an operator instruction, preserving the rest. Verified live (added the
  requested section, sharpened the CTA). When co-creating in-session, the agent IS
  the LLM — it produces/edits the spec directly.

### CLIs (non-mutating except `run --send`)

```bash
pnpm public-website:content-factory:ideate -- --idea "..." [--audience ...] [--out spec.json]
pnpm public-website:content-factory:ideate -- --revise spec.json --instruction "..."
pnpm public-website:content-factory:author -- --file spec.json        # spec → draft + validate
pnpm public-website:content-factory:run    -- --idea "..."            # DRY: ideate→author→validate
pnpm public-website:content-factory:run    -- --spec spec.json --send --author-id 1  # governed write
```

### Governed write + authorship

`run --send` is the last-mile write. It is **gated**: refuses unless
`validation=pass` (block refuses; warning needs `--allow-warnings`) and requires
`--author-id` (the operator's real WP user). It reuses the sanctioned **wpcli
eval-file** path (the bridge `/v1/drafts` has writes OFF + `production_deploy_apply`
is a blocked capability). The pure builder `draft-write-eval.ts`
(`buildGovernedDraftWriteEval`) creates ONE `post_status=private` post, idempotent
by `manifestId`, with `post_author` = the operator user (NEVER the service user),
ownership + Yoast meta, and a JSON readback. es-CL text is embedded as raw UTF-8
nowdoc — **never `\uXXXX`** (the encoding gotcha that broke the first meta description).

**Operator WP author** = user ID `1` (`jreysgo`, "Julio Reyes"; there is a second
"Julio Reyes" ID `11` from an import — do NOT use). Service/bridge user = ID `12`
(`Greenhouse INTEGRATION`, admin with `edit_others_posts` → can set post_author).

### Live evidence

- Post `250748` — the operator's real "I Know Kung Fu" article (private, authored
  by Julio, TOC fixed in-situ). Publish is the operator's step.
- Post `250770` — orchestrator `--send` smoke (private, author=Julio, idempotent),
  trashed after readback (manifest+owned match).

### Hard rules for agents

- **NEVER** hand-write Gutenberg block markup — use `renderHeadingBlock` /
  `renderYoastTableOfContents` (`gutenberg-blocks.ts`) or `authorGutenbergDraft`.
- **NEVER** emit a Yoast TOC without populated anchor links + `id="h-{slug}"` headings
  (the validator now warns: `blogpost_toc_not_populated`, `blogpost_toc_headings_unanchored`).
- **NEVER** send text to the write path via `JSON.stringify`/`json.dumps` (`\uXXXX`
  breaks accents in PHP) — raw UTF-8 nowdoc only.
- **NEVER** set `post_author` to the service user for editorial posts — use the
  operator's WP user id.
- **NEVER** publish from the pipeline — the write ends at `private`; publishing is
  a human step (auto-publish with guardrails is the separate opt-in TASK-1323).
- **ALWAYS** run `--send` gated on `validation=pass` with an explicit `--author-id`.
