# Agentic Blogpost End to End

Use this reference when an agent must carry a WordPress article from an approved
brief or `GutenbergArticleSpec` through governed private creation, editorial and
SEO enrichment, human-authorized publication, and live verification. It
distills the production path proven by the Creative Workflows post `251363`;
case-specific IDs and values are evidence, never reusable defaults.

Also load `content-factory-gutenberg.md` for Content Factory commands, block
recipes, and existing-post refresh rules.

## Non-negotiable Invariants

- Start dry. Generation, assembly, and validation do not authorize a WordPress
  write.
- Every production mutation needs explicit human authorization for its current
  phase. Authorization to create or update a private post is not authorization
  to publish it.
- The governed creation path always ends at `private`. Publication is a separate
  operation and must fail closed.
- Set `author_id` to the verified human editorial author. The integration user
  may execute the operation but must never become the visible post author.
- Use one stable `manifestId` for one logical article. Re-runs must resolve to
  the same post instead of creating a duplicate.
- Take a restorable snapshot before every update to an existing post, author
  profile, taxonomy assignment, media assignment, or publication state.
- Prefer native, governed Gutenberg blocks. Do not hand-write block markup or
  add a custom block when the existing Content Factory composition can express
  the editorial need.
- Never expose credentials, infrastructure endpoints, session material, or
  environment values in specs, snapshots, logs, screenshots, or this workflow.
- WordPress and independent readback are the runtime source of truth. A local
  command returning success is not publication evidence.

## 1. Define the Publication Contract

Before authoring, record the intended contract in a local, gitignored run
artifact or the governed editorial artifact already assigned to the work:

- article purpose, audience, search intent, primary query, and CTA;
- editorial owner and verified WordPress `author_id`;
- H1/title, lowercase kebab-case slug, excerpt, SEO title, meta description, and
  desired index policy;
- one existing category, Yoast primary category, and a curated tag set;
- canonical surface decision between WordPress and Think;
- required body media, featured image, social image, ALT, captions, and source
  lineage;
- human approver for private write and a separate human approver for publish;
- rollback owner and the critical checks that trigger automatic unpublish.

Do not infer personal author facts, taxonomy, canonical ownership, or permission
to publish from the article text.

## 2. Preflight Existing State and Duplicates

Inspect before creating anything:

- Search all WordPress post states, including private, draft, published, trash,
  and revisions, by `manifestId`, slug, normalized title, and intended canonical.
- Probe WordPress category/permalink variants and the equivalent Think routes.
  Decide which surface owns the canonical before publication.
- Resolve category and tag IDs from current runtime data. Do not create a second
  term because capitalization or accents differ.
- Verify the intended human author exists, is active, and has the expected
  public display identity.
- Inspect related posts for internal-link opportunities and accidental topic or
  search-intent duplication.

Any existing post with the same manifest, slug, canonical intent, or materially
equivalent content is a stop condition until the operator chooses reuse,
refresh, redirect, consolidation, or a distinct canonical strategy.

## 3. Author Native Gutenberg and Validate

Build a `GutenbergArticleSpec`, then use Content Factory to assemble the block
document. WordPress owns the H1 through `post_title`; body content starts at H2
or lower and must preserve heading order.

Use the governed native vocabulary, including `core/heading`,
`core/paragraph`, `core/list`, `core/quote`, `core/pullquote`, `core/image`,
`core/separator`, and `yoast-seo/table-of-contents`. Use a populated Yoast TOC
whose links resolve to deterministic heading anchors. Treat `core/freeform` as
legacy inspection debt, not generated content.

For inline citations and contextual links:

- represent content as structured `{ text, href? }` segments in supported
  paragraphs, list items, and CTA text;
- allow only `http:`, `https:`, and `mailto:` destinations;
- let Content Factory escape text and attributes;
- reject unsupported protocols, raw anchors, scripts, inline handlers, and
  arbitrary HTML.

If the spec cannot represent a required caption, block, or semantic structure,
extend the governed builder and validator with tests before authoring. Do not
bypass the model with hand-written Gutenberg markup.

Run dry assembly first:

```bash
pnpm public-website:content-factory:run -- \
  --spec <article-spec.json> \
  --out <validated-draft.json>
```

`validation=block` is a hard stop. `validation=warning` requires explicit review
and a recorded reason before any warning override. Confirm block count, heading
outline, TOC targets, media count, links, excerpt, slug, SEO fields, and index
policy in the generated artifact.

## 4. Governed Private Write

Choose a stable manifest that identifies the logical article, not a particular
draft revision. Keep it lowercase and within the write path's accepted format.
Do not change it to evade `already_exists`.

With explicit authorization for a private write:

```bash
pnpm public-website:content-factory:run -- \
  --spec <article-spec.json> \
  --send \
  --author-id <verified-editorial-user-id> \
  --manifest <stable-manifest-id>
```

The governed path must:

- reject an invalid author, manifest, slug, article kind, or blocked validation;
- create exactly one `post` with `post_status=private`;
- persist the human `post_author` plus Content Factory ownership and manifest
  metadata;
- write title, slug, excerpt, native Gutenberg content, SEO title, and SEO
  description as raw UTF-8;
- return machine-readable readback with outcome, post ID, status, author, and
  parsed block count;
- return `already_exists` on an idempotent re-run.

After creation, resolve all later work from the returned post ID and manifest.
Never create a second post to apply a revision.

## 5. Snapshot Before Enrichment or Revision

Before updating the private post, capture a complete, timestamped, gitignored
snapshot with at least:

- post ID, status, type, title, slug, excerpt, content, author, dates, and
  modified version;
- categories, tags, Yoast primary category, and permalink;
- featured media, attachment IDs used in body content, and media metadata;
- SEO title, description, focus phrase, robots, canonical override, and social
  metadata exposed for the post;
- Content Factory ownership and manifest metadata;
- parsed block tree, heading outline, links, fingerprints, and block count.

If author-entity metadata will change, take a separate snapshot scoped to that
exact WordPress user. Build and inspect the rollback operation before applying
the forward mutation.

For updates, assert the expected post ID, manifest, ownership marker, source
fingerprint, and current status before writing. Abort on drift. Apply the
smallest mutation through an authenticated governed REST operation when the
fields are exposed; otherwise use the repository WP-CLI wrapper with a reviewed
eval file. Always perform an independent readback after the write.

## 6. Media Contract

Resolve real WordPress Media Library assets before the post references them.
For every asset, verify:

- attachment ID, current media URL, MIME type, dimensions, file size, and source
  lineage;
- the correct attachment author and ownership context;
- descriptive ALT based on the image's purpose, not a filename or keyword list;
- attachment caption and visible Gutenberg caption when editorial context needs
  one;
- no duplicate upload with the same source fingerprint or editorial role.

Body images use native `core/image` with the real attachment ID and URL. If a
visible caption is required but the current spec cannot emit it, stop and extend
the governed renderer first.

Assign featured and social media deliberately:

- use an inspected, social-safe raster asset rather than an unrelated global
  fallback;
- verify the featured attachment is the intended `primaryImageOfPage` and the
  Open Graph image;
- verify format, dimensions, aspect ratio, ALT/caption, and anonymous delivery;
- preserve source masters and derivative lineage outside the post body.

## 7. Yoast Metadata and Author Entity

Post-level SEO must be explicit and independently read back:

- H1 and SEO title serve their different jobs;
- meta description is factual, concise, and aligned with the article;
- focus phrase matches the editorial/search decision;
- primary category matches the visible category and permalink strategy;
- canonical and robots are intentional for the current state;
- featured/social media does not fall back to a global image.

Verify the Article author resolves to the intended Yoast `Person` entity. Review
display name, biography, profile URL, `sameAs`, `jobTitle`, `worksFor`,
`knowsAbout`, and author SEO title/description. Personal claims require human
confirmation.

Use REST first for fields it actually exposes. If Yoast user metadata is absent
from REST, do not assume a successful profile update changed the schema entity.
Use the governed Kinsta/WP-CLI path only after:

1. confirming the exact user ID and intended values with the human owner;
2. snapshotting that user's current metadata remotely;
3. reviewing a user-scoped mutation and rollback;
4. applying only the approved fields;
5. reading the values back through WP-CLI;
6. purging the relevant cache after authorization; and
7. confirming the resulting public `Person` node independently.

Never replace the full user metadata set or derive author identity from another
user with a similar display name.

## 8. Slug, Category, Tags, and Canonical Surface

- Keep the slug stable, lowercase, and kebab-case.
- Treat category as URL architecture because the current post permalink includes
  category. Changing category on a published post requires redirect, canonical,
  archive, breadcrumb, and internal-link analysis.
- Assign one intentional category and align the Yoast primary category.
- Use only useful, existing tags. Reject demo, typo, duplicate, and near-synonym
  tags; an empty curated set is better than taxonomy noise.
- Check archive cards, excerpt, featured image, breadcrumb, related content, and
  search discovery before publish.
- Probe WordPress and Think for duplicate routes and equivalent content. A
  canonical conflict blocks publication until one surface clearly owns the URL
  and the other is absent, redirected, consolidated, or intentionally excluded
  from indexing.

## 9. Private Review Gate

Before requesting publication authorization, verify both access contexts:

**Authenticated readback and render**

- status remains `private`;
- title, slug, author, content, taxonomy, excerpt, media, and Yoast fields match
  the approved artifact;
- Gutenberg parses without recovery warnings or unexpected freeform content;
- body images, captions, TOC, CTA, and editor preview render correctly.

**Anonymous readback**

- the future permalink is not publicly readable;
- no body, metadata, media attachment page, feed entry, archive card, or search
  result leaks the private article;
- protected SEO output remains non-indexable.

Do not purge public cache merely to make a private draft appear. Resolve preview
access through the authenticated path.

## 10. Human Authorization and Fail-closed Publication

Request a distinct, explicit human decision that names the post, final title,
slug/canonical, target status, and accepted residual risks. Silence, earlier
approval of the brief, or approval of the private write is not publication
authorization.

The publish operation must have the latest snapshot and rollback ready. Its
critical contract includes:

- exact post ID, manifest, human author, final fingerprint, and `private` source
  state;
- resolved WordPress/Think canonical ownership;
- approved taxonomy, featured/social media, SEO, author entity, and links;
- no blocking editorial, legal, rights, privacy, or factual finding;
- a defined cache purge and independent readback sequence.

Publish through a governed authenticated operation. Immediately purge the
relevant Kinsta cache and execute the critical live checks. On the first failed
critical check, automatically restore `private`, purge again, verify anonymous
non-disclosure, and report the failure. Do not leave a partially verified post
public and do not retry until the cause is corrected.

## 11. Live Readback and Cache Verification

After publication, compare authenticated WordPress data and a fresh anonymous
request. Both must agree on the final revision.

Verify:

- public status and anonymous success response;
- one canonical URL with no conflicting canonical tag;
- intended `index, follow` robots state;
- valid `Article` or `BlogPosting`, `WebPage`, `BreadcrumbList`, publisher,
  author `Person`, and primary image relationships;
- Open Graph article type, title, description, canonical URL, image, dimensions,
  and large-image social card;
- current title, excerpt, category, author, dates, body, CTA, and media;
- no stale private marker, old revision, old social image, or global fallback;
- cache stability across a second anonymous read after purge.

If cache or anonymous and authenticated readback disagree, publication is not
complete. Revert to private when the mismatch affects content, identity,
indexability, canonical, schema, or social representation.

## 12. Links, Anchors, and Duplicate Checks

Extract unique internal and external links from the final rendered article,
including CTA and media links. Check redirects and final destinations.

- Confirm zero known `404` or `5xx` destinations.
- Treat anti-automation `403` responses and timeouts as unresolved until a
  browser or human check establishes the destination; record residual evidence
  instead of calling them healthy.
- Verify all TOC and in-page anchors resolve to unique elements.
- Confirm internal links use the canonical route and do not point to previews,
  obsolete categories, or redirected drafts.
- Re-run WordPress manifest/slug/title searches and Think route probes after
  publication. No second indexable copy may exist.

## 13. Playwright Desktop and Mobile

Review an authenticated private preview before publication and a fresh anonymous
render after publication. Use at least desktop `1440x1000` and mobile `390x844`,
plus GVC when the article is visual or layout-sensitive.

Assert and inspect:

- one visible H1 and no body-authored H1;
- `scrollWidth <= clientWidth` at both viewports;
- every body and featured image loads with non-zero natural dimensions;
- TOC link count matches valid unique destinations;
- headings, lists, quotes, captions, evidence, disclosures, and CTA are visible;
- no article/footer collision, clipping, unreadable overlay, or mobile overlap;
- canonical, robots, schema, and Open Graph are present in the anonymous page;
- browser console and page errors are empty;
- screenshots show the intended first viewport, body composition, and ending.

GVC full-page images do not replace the explicit horizontal overflow
measurement.

## 14. Rollback Rules

- Failed private revision: restore the complete pre-mutation post snapshot and
  independently read it back.
- Failed author-entity update: restore only the snapshotted fields for the exact
  user, purge the relevant cache, and re-check the `Person` node.
- Failed publication: restore `private` automatically, purge cache, and verify
  anonymous non-disclosure.
- Accidental duplicate creation: do not delete blindly. Confirm manifest and
  ownership, preserve evidence, then trash only the agent-owned duplicate with
  explicit authorization.
- Media rollback must not delete shared attachments. Remove assignments first;
  delete only proven agent-owned, unreferenced assets with authorization.

Record what changed, what was restored, and any remaining external cache or
indexing risk.

## Definition of Done

- [ ] Final spec, research, claims, rights, CTA, and visible author were approved.
- [ ] Content Factory validation passed with reviewed warnings and no blockers.
- [ ] Gutenberg uses governed native blocks, a populated TOC, and safe rich text.
- [ ] Stable manifest re-run returns the existing post; no duplicate was created.
- [ ] Human `author_id`, post ownership, status, and block readback match.
- [ ] Post remained private through editorial, media, taxonomy, SEO, and author review.
- [ ] Current post and any changed author metadata have restorable snapshots.
- [ ] ALT, captions, body images, featured media, and Open Graph image were verified.
- [ ] Slug, category, primary category, tags, archives, and permalink were reviewed.
- [ ] Yoast title, description, focus phrase, robots, canonical, and schema passed.
- [ ] Yoast author `Person` resolves to human-confirmed current data.
- [ ] WordPress and Think duplicate checks found one canonical indexable surface.
- [ ] Authenticated private readback/render passed and anonymous access did not leak.
- [ ] Separate human publication authorization was recorded.
- [ ] Publish rollback was prepared and critical checks ran fail-closed.
- [ ] Kinsta cache purge and repeated anonymous/authenticated readback agreed.
- [ ] Link check found no confirmed broken links; unresolved responses were reviewed.
- [ ] Playwright desktop and mobile passed render, TOC, image, console, and overflow checks.
- [ ] Final anonymous robots, canonical, schema, Open Graph, and social image passed.
- [ ] Rollback evidence and residual risks were recorded without sensitive material.

Only then report the article as published and operational. Otherwise use the
precise state: `private review pending`, `publication blocked`, `rolled back to
private`, or `code/content complete; runtime verification pending`.
