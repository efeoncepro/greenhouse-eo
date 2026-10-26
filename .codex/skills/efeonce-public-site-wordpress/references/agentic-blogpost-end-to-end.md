# Agentic Blogpost End to End

Use this reference when an agent must carry a WordPress article from an approved
brief or `GutenbergArticleSpec` through governed private creation, editorial and
SEO enrichment, human-authorized publication, and live verification. It
distills the production path proven by the Creative Workflows post `251363`
and the Glitch Flash post `251941` (§15); case-specific IDs and values are
evidence, never reusable defaults.

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
`core/table`, `core/separator`, and `yoast-seo/table-of-contents`. Use a populated Yoast TOC
whose links resolve to deterministic heading anchors. Treat `core/freeform` as
legacy inspection debt, not generated content.

Pullquotes (`efeonce-editorial-blocks` 0.8.0, live 2026-10-25): default to the
«Destacado» variant for the section's own thesis (no quotation marks, the
landing phrase as a complete idea in `strong`, `tone` to match the background);
use `variant: "cita"` only for a real attributed quote with `cite`. 1–2 per
post, never consecutive. Rules and spec shape: `content-factory-gutenberg.md`
→ «Blog editorial styles».

Charts (`efeoncepro/chart` «Gráfico Efeonce», 0.9.0, live 2026-10-25): use
`kind: "chart"` only when a comparison, trend or share is clearer as a figure
than as a sentence. Title = the conclusion, source always (illustrative data
marked as such), one highlighted entity, `pie` only for ≤ 8 parts of a total.
The numbers also ship as an HTML table. Ten kinds and limits:
`content-factory-gutenberg.md` → «Gráfico Efeonce».

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

When a remote eval needs a local asset or payload, use the repeatable
`--input-file <path>` option on `public-website:wpcli`. The wrapper copies inputs
to remote `/tmp`, passes their paths in PHP `$args`, and cleans them with the eval
file. Do not open a parallel ad hoc SCP path.

WordPress may canonicalize emoji in raw content. A confirmed example is
`🍏` becoming `&#x1f34f;` before the frontend renders `img.emoji[alt="🍏"]`.
Accept this only after proving the exact byte diff and unchanged structure; do
not weaken the normal post hash guard. Para comparar el contenido guardado con el
autorado (QA de fusión, 2026-10-26), normaliza las entidades en los dos lados
antes de calcular el hash: la diferencia sólo por emojis no es drift.

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

Use `linkDestination=media` selectively for text-bearing diagrams that need
full-resolution reading on mobile. Keep ordinary editorial photography at
`none` unless the click has a clear reader job. A measurement comparison should
prefer semantic `core/table` over a screenshot when native markup can express it.

Assign featured and social media deliberately:

- use an inspected, social-safe raster asset rather than an unrelated global
  fallback;
- verify the featured attachment is the intended `primaryImageOfPage` and the
  Open Graph image;
- verify format, dimensions, aspect ratio, ALT/caption, and anonymous delivery;
- a new Marketing con Manzanitas post enters the `/blog/` slider and the «Para leer con calma» rail **on its own**
  (newest posts with image, not Glitch/Novedad; rail = the 4 newest reads ≥ 12 min or podcast), so publishing ships
  **three uploads**, each with its `alt`, all planned without `--apply` and applied only with the operator's go:
  1. **cover** = featured + Yoast OG (+ X fallback, schema `primaryImageOfPage`, the square «Te puede interesar»
     related-posts thumbnail): one JPEG 2400 × 1260 (canvas 1200 × 630) < 300 KB, text inside the central square
     x 285–915, uploaded with `scripts/public-website/blog-post-cover-apply.php` (dry run → apply, guards, snapshot);
  2. **slider `hero`** (`_eo_hero_image`): WebP 2:1 2400 × 1200 cropped from the textless plate, with
     `pnpm public-website:blog-home hero <post> --light "…" --bold "…" --image <webp> --alt "…"`. Without it the
     slider title falls over the cover's baked-in text;
  3. **rail card** (`_eo_card_image` / `_eo_card_focus`, live 0.4.5): the plate PNG 2560 × 1440 as is, with
     `pnpm public-website:blog-home card <post> --image <plate> --alt "…" --focus "84% 30%"`. The featured image
     never changes for the card (it stays the OG image). A post under 12 minutes skips this upload. `84% 30%` es
     el foco de una placa con el sujeto a la derecha; si el sujeto cae en otro lugar, recalcúlalo con la fórmula de
     `blog-home-operation.md` (caso 248398, 2026-10-26: `71% 50%`);
- sizes, safe zones per surface (cover, slider, card, plate) and OG per platform live in
  `docs/operations/public-site-content-factory/BLOG_ARTICLE_IMAGE_INVENTORY_V1.md`; cover craft in
  `docs/manual-de-uso/creative/producir-portada-de-articulo-del-blog.md`; command detail in `blog-home-operation.md`;
- live QA after the uploads: `og:image` 2400 × 1260 `image/jpeg`, `twitter:card` `summary_large_image` (no
  `twitter:image`: X falls back to `og:image`), the card and the slider at 1440 and 390,
  `pnpm public-website:blog-home verify --browser`, and each network's debugger to refresh its cache.
  `og:image:alt` / `twitter:image:alt` come from `efeonce-editorial-blocks` 0.4.6 (live since 2026-10-24):
  check there is exactly one of each;
- preserve source masters and derivative lineage outside the post body.

For direct SVG infographics, load the governed SVG lane in `content-factory-gutenberg.md` and the SEO contract
in `.codex/skills/seo-aeo/references/editorial-image-seo.md`. A body SVG may be correct while featured/OG stays
raster. Keep one `<img src>` fallback, ALT/caption/long description in HTML, anonymous GET/MIME readback and
viewport/theme/CLS checks. For Efeonce body pieces, wordmark + URL + source/as-of live together in the footer.

## 7. Yoast Metadata and Author Entity

Post-level SEO must be explicit and independently read back:

- `post_title`, rendered H1, SEO title, Open Graph title and schema headline are
  related but distinct outputs. Change the intended editorial title in
  `post_title`; keep `_yoast_wpseo_title` search-oriented when a shorter SERP
  title is useful; read back the live H1, `<title>`, `og:title`, Twitter card
  fallback and schema `headline` independently. Do not infer that changing one
  field updated every surface;
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

For a live category hierarchy or permalink migration, load
`taxonomy-permalink-migrations.md`; it owns the inventory, core term mutation,
Yoast Premium redirect and migration QA contract.

- Keep the slug stable, lowercase, and kebab-case.
- Treat category as URL architecture because the current post permalink includes
  category. Changing category on a published post requires redirect, canonical,
  archive, breadcrumb, and internal-link analysis.
- Assign one intentional category and align the Yoast primary category.
- A hierarchy-only migration must preserve the category term ID and verify the
  Yoast primary category on every affected post. Promote/reparent with
  `wp_update_term()`; never patch term tables with SQL or delete/recreate the
  term.
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

**Coordinación con las sesiones del blog (2026-10-26).** Antes de escribir en el
sitio, avisa a las cuatro sesiones que trabajan el blog y a la de Analytics, que
mantiene `scripts/public-website/blog-post-cover-apply.php`. Desde el 2026-10-26
las cuatro autorizaron **purgar la caché después de republicar contenido** sin
consultarles, siempre que no tengan un despliegue en curso. Un despliegue de
plugin sí se les avisa antes. Esa autorización cubre la purga, no la
publicación: cada publicación sigue necesitando el visto bueno del operador.

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

### Search discovery and index observation

The synchronous publication gate proves that the final URL is crawlable and is
present in the correct Yoast sitemap with an honest `lastmod`. Google indexing
is asynchronous and remains separate from publication success.

- Do not call the retired sitemap ping endpoint; it returns `404`.
- Do not use the Indexing API for generic posts or landing pages. Google limits
  it to `JobPosting` and `BroadcastEvent` inside `VideoObject`.
- Search Console URL Inspection API observes the indexed version only; it does
  not run a live test or request indexing.
- Indexing for a small number of critical URLs is requested through the Search
  Console UI, without any guarantee of timing or inclusion. Agents use
  `pnpm public-website:gsc-index request <url> [--apply]`: a dedicated Chrome
  where a person signed in once; dry run by default, `--apply` only when the
  URL is not on Google or was crawled before its last change, about 10 per
  day, ledger in `scripts/public-website/gsc-indexing/ledger/`. Manual:
  `docs/manual-de-uso/public-site/solicitar-indexacion-search-console.md`.
- Use `0h`, `24h`, and `72h` observations only after the capability described in
  `TASK-1426` exists and has runtime evidence. Until then, do not fabricate an
  automated checkpoint.

Load `.codex/skills/seo-aeo/references/google-search-console-api-indexing.md`
for the capability matrix, OAuth scopes, Platform Properties canary, and source
links.

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
- For a pillar that supports a service landing, verify the intended reciprocal
  link in both directions after any permalink change. Redirects preserve old
  traffic; they do not replace updating owned internal links to the canonical
  URL.
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
- every text-bearing diagram has passed a `100%` source-raster review: no connector crosses copy, lists,
  figures, or ordinals unless semantically intentional; no missing/clipped label; no card/divider collision;
  and no display-punctuation collision;
- no critical diagram labels under Ohio's floating Next Post widget or other
  theme chrome; source-raster and live-composition reviews are separate mandatory gates;
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

## 15. Case Evidence: Glitch Flash 251941 (2026-09-28)

Second complete reference case, and the first Glitch post produced with the new
graphic line end to end (canvas, social, blog). The values below are **example
values from that run**, never defaults for another article.

| Step | What was done | Reusable lesson |
| --- | --- | --- |
| Private write | `content-factory:run --spec … --send --author-id 1`, manifest `greenhouse-cf-glitch-flash-claude-sonnet-5-5` | Same governed path as §4; author = human editorial user |
| Glitch Drop | Marker paragraph `__GLITCH_DROP__` in the spec, then `parse_blocks` → dynamic block with `attrs.content` → `serialize_blocks` → `wp_update_post(wp_slash())`, snapshot first | **Superseded 2026-09-28:** author the callout in the spec as `{ "kind": "glitchDrop", "lines": [...] }` (serialized like WordPress, validated before the write). The marker recipe (`content-factory-gutenberg.md` §Glitch Drop por marcador) is historical/fallback only |
| Media | Featured 16:9 banner (attachment `251943`, 1920×1080) and in-body 1600×900 banner (`251945`, `core/image` at the start of the first H2) uploaded with `wp_upload_bits` + `wp_insert_attachment` through `pnpm public-website:wpcli -- --eval-file … --input-file <png>` | One eval per asset or a reviewed batch; set ALT, caption with the photo credit, and generate attachment metadata; read back ID, URL, MIME, dimensions before referencing it |
| Taxonomy | Category Glitch (term `183`) and `_yoast_wpseo_primary_category` = same term | Primary category must match the visible category because it drives the permalink (`/glitch/<slug>/`) |
| Publication | After explicit authorization, `private` → `publish` with the **current** date (in 251941: `wp_update_post` with `post_date`/`post_date_gmt` = `current_time()` and `edit_date => true`; attachments got `wp_generate_attachment_metadata`, both read back) | A private post already has a `post_date` from its creation; set `post_date`/`post_date_gmt` to the publication moment explicitly and read it back, or the post appears backdated in archives and feeds |
| Cache | `wp cache flush` + `kinsta cache purge --all` | Purge after every live content change, then read anonymously twice |
| Live QA | HTTP 200, canonical, `index, follow`, `og:image` = featured banner, one visible `aside.gh-glitch-drop`, TOC with 9 links, no overflow at 1280 and 390, callout visible (`offsetHeight` 181/360) | §11–§13 apply unchanged |
| Finding | The paragraph right after the callout repeated the drop's sentence; fixed with a new snapshot + governed update | Add an editorial **redundancy read** between each callout/pullquote and its neighbouring paragraphs. Since 2026-09-28 the validator warns `glitch_drop_redundant_with_neighbor` for Glitch Drops (4-gram overlap ≥ 0.6 or ≥ 8 words in a row); pullquotes still need the human read |

Photo rights: third-party launch images were published with credit and without a
license by explicit operator decision for this case. That is not a general
authorization; every future article needs its own rights decision (§1).

## 16. Fusión de dos posts en un pilar (caso 248483 → 248398, 2026-10-26)

Úsalo cuando dos posts compiten por la misma intención y uno absorbe al otro. Los
IDs son evidencia del caso, no valores por defecto. El detalle del caso vive en
`docs/public-site/LOOP_MARKETING_REFRESH_DRAFT_V1.md` §0–§4 y sus deltas.

1. **Inventario de visuales antes de escribir.** Lista los diagramas, videos,
   gráficos, destacados y portadas de los dos originales y decide uno por uno.
   Vuelven los que aportan (en 248398 volvieron el diagrama `Loop-MKT.svg`, media
   248439, y los dos videos de HubSpot). No vuelven los destacados con cifras sin
   fuente. Las portadas se rehacen.
2. **Una sola operación con guardas.** El script del caso (`ai-generations/2026-10-26_loop-marketing/publicacion/merge-publish.php`,
   one-off) verificó 14 guardas sobre los dos posts antes de tocar nada: estado,
   slug, `post_modified_gmt`, sha del contenido, título Yoast, rutas y que no
   hubiera redirecciones previas en el origen ni en el destino.
3. **Respaldo de los dos posts** en opciones `_gh_post_refresh_<id>_<UTC>` (pilar)
   y `_gh_post_merge_<id>_<UTC>` (absorbido).
4. **El absorbido pasa a borrador, nunca a la papelera:** queda recuperable y sale
   del índice y del sitemap. Su slug se conserva.
5. **301 plain de Yoast Premium** (`WPSEO_Redirect_Manager`, ver
   `taxonomy-permalink-migrations.md` §4) desde la ruta del absorbido al pilar,
   creado **después** de pasarlo a borrador. Luego reindexa los dos con el
   `Indexable_Builder` de Yoast.
6. **Lectura de vuelta:** borrador, slug conservado, 301 y metas del pilar.
7. **Enlaces internos al absorbido:** reescríbelos con
   `scripts/public-website/blog-post-content-republish.php` (simulación y después
   `apply`). Si una frase citaba los dos posts, **quita el enlace duplicado** en
   vez de apuntar dos veces al pilar (caso: inbound 244765, «…en ¿Qué es Loop
   Marketing? y en cómo ejecutarlo…»). Actualiza también la spec del repo de cada
   post reescrito.
8. **QA en vivo de la fusión:** 200 en el pilar; 301 en un solo salto desde la URL
   vieja, con y sin barra final y conservando `utm_*`; canonical, `og:image` con
   alt, `summary_large_image` y schema con el titular nuevo; sitemap con `lastmod`
   del día y sin la URL vieja; Playwright en 1440 y 390 (un H1, 0 desborde, 0
   imágenes rotas, iframes y gráficos visibles); `blog-home verify --browser`; y
   `blog-home slider`, que muestra que un post refrescado no entra al slider si su
   fecha no cambió.

**Trampas de QA que aparecieron en el caso:**

- el hash del contenido guardado difiere sólo por emojis (`🍏` → `&#x1f34f;`):
  compara normalizando entidades (§5);
- `apply_filters('the_content')` por wp-cli no resuelve los oEmbed (su caché vive
  en post meta `_oembed_*`); el navegador real sí. Para una vista previa de
  servidor, inyecta los iframes a mano;
- justo después de purgar, la primera lectura anónima puede devolver la versión
  vieja: repite la lectura o agrega `?nc=<ts>` antes de dar por mala la publicación;
- Playwright con `waitUntil: 'networkidle'` agota el tiempo con iframes de
  YouTube: usa `load`;
- un gráfico Efeonce (por ejemplo «7 de cada 100») figura vacío si la prueba no se
  detiene sobre él, porque se dibuja cerca del viewport: haz scroll hasta el
  gráfico y espera antes de capturar.

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
- [ ] Callouts, pullquotes and drops were read against their neighbouring paragraphs; no sentence is repeated.
- [ ] Each pullquote uses the right variant: Destacado for our thesis (bold landing phrase, no quotes), Cita only with a real author in `cite`.
- [ ] Each chart has a conclusion title, a verifiable source, one highlighted entity and its «Ver los datos» table; it rendered in headless Playwright (desktop and 390 px).
- [ ] A post created private and published later carries the publication date, read back from WordPress.
- [ ] En una fusión: visuales de los originales inventariados, absorbido en borrador con 301 de un salto, enlaces internos reescritos sin duplicar y QA de §16 completa.
- [ ] Playwright desktop and mobile passed render, TOC, image, console, and overflow checks.
- [ ] Final anonymous robots, canonical, schema, Open Graph, and social image passed.
- [ ] Final URL appears in the correct sitemap with an honest `lastmod`; any GSC observation is reported separately.
- [ ] Rollback evidence and residual risks were recorded without sensitive material.

Only then report the article as published and operational. Otherwise use the
precise state: `private review pending`, `publication blocked`, `rolled back to
private`, or `code/content complete; runtime verification pending`.
