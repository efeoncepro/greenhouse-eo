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
- For compact editorial FAQs that need schema, use semantic `kind: "faq"` in the `GutenbergArticleSpec`; Content Factory emits native `core/details` plus governed `FAQPage` JSON-LD from the same `items[]`. Use raw `kind: "details"` only for non-schema disclosures. Keep the question in `<summary>`, the complete answer as child blocks, and let the global TOC target the parent FAQ H2 unless a reviewed outline decision says otherwise. `core/accordion` is available in the 2026-07-15 runtime, but use it only when grouped/exclusive accordion behavior is a real requirement.
- Do not hand-author `core/html`; the validator only allows generated `application/ld+json` structured data from semantic capabilities such as `kind: "faq"` and blocks FAQPage questions that do not match visible summaries.
- `status=block` from validation is a hard stop; `status=warning` requires review.
- For Glitch POV, use `{ kind: 'glitchDrop', lines: [...] }` (block `efeoncepro/glitch-drop`, implemented
  2026-09-28); it is an editorial aside, not a quote. 1–4 plain-text lines, no links or markup, and the paragraphs
  before/after must not repeat it (validator warning `glitch_drop_redundant_with_neighbor`). The marker recipe below
  («Glitch Drop por marcador») is historical/fallback only.
- Before authoring, check «Inventario live y brecha (2026-09-28)» and «Extensión de GutenbergArticleSpec
  (implementada)» below: the spec now emits 12 kinds (plus heading/TOC/CTA by structure) including `glitchDrop`,
  `buttons`, `embed.caption` and `table.style: 'stripes'`; native `core/video` and the Glitch §6 post pieces are
  still not expressible.

## Direct editorial SVG lane

Infographics and diagrams may be delivered as SVG directly when the format decision in
`content-marketing-studio/references/deterministic-editorial-infographics.md` passes. For Efeonce-branded pieces,
also apply `content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md`.

- Keep editable source SVG separate from the sanitized delivery SVG.
- Block scripts, event handlers, `foreignObject`, remote resources and uncontrolled fonts before upload.
- Require explicit `viewBox`, `width` and `height`; inspect all text and shapes for clipping.
- For Efeonce body infographics, keep all brand information in the footer: source/as-of left; official
  `public/branding/` wordmark + canonical `efeoncepro.com` bubble right. No brand asset belongs in the header.
- Use the canonical bubble geometry at build time; do not upload or link a second dependent SVG.
- Upload through the governed Media Library path, then read back attachment ID, MIME, URL, bytes and metadata.
- Prefer a normal image block/attachment reference for a standalone SVG. Inline SVG requires an explicit,
  sanitized runtime contract; never paste arbitrary SVG markup into a generated spec.
- Use `<picture>` only when theme or viewport art direction requires distinct files. Keep one semantic `<img>`
  fallback with `src`, descriptive filename, dimensions and one ALT. Verify `currentSrc`, reserved ratio and CLS.
- Outlined SVG text does not replace HTML semantics. Keep thesis/data in caption, nearby copy or a linked/visible
  long description; complex diagrams need short ALT plus an equivalent long alternative.
- Read back anonymous GET `200`, `image/svg+xml`, crawlability, cache/encoding and DOM ALT/caption. Confirm that
  attachment-page behavior does not create an unintended indexable duplicate.
- Preserve raster derivatives only for OG/social/compatibility or when measured delivery weight favors raster.
- Keep a dedicated raster for featured, Yoast Article image, OG and Twitter previews.
- Publishing remains private/draft until human authorization and live QA.

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

**Slashing (fixed 2026-09-28).** `wp_insert_post()` and `update_post_meta()` expect slashed input and run
`wp_unslash()`. The write eval now wraps the payload in `wp_slash()`; before that, any `\uXXXX` escape WordPress keeps
in block attributes (glitch-drop `content`, an embed URL with `&`, FAQ JSON-LD `\u003c`) would have lost its backslash
on `--send`. Verified with a PHP harness that unslashes like core: stored `post_content` identical to the draft.

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

## Inventario live y brecha (as-of 2026-09-28)

Inventario **sólo lectura** vía `pnpm public-website:wpcli -- --eval-file … --wp-user 12` (registro de bloques,
estilos, patrones y `parse_blocks` recursivo). Repetirlo antes de extender el builder: estos números caducan.

**Runtime:** WordPress 7.1.2 · tema clásico `ohio-child`/`ohio` (sin `theme.json`, no es block theme) · supports
`align-wide`, `responsive-embeds`, `editor-styles`, `wp-block-styles` · paleta del editor = presets de Ohio
(`brand-color` `#023c70`, `beige_dark`, `dark_strong`, `dark_light`, `grey_strong`), **no** AXIS · tamaños
`extra-small 13` … `larger 20`.

| Qué | Conteo | Detalle |
|---|---|---|
| Bloques registrados | 220 | 116 `core/*`, 87 `jetpack/*`, 5 `premium-content/*`, 7 Yoast, 1 `efeoncepro/glitch-drop` (dinámico, attrs `content` + `label`), CF7, ActiveCampaign, HubSpot embed, VideoPress |
| Estilos de bloque (registro PHP) | 4 | sólo Jetpack (`field-radio`/`field-checkbox-multiple`: `list`, `button`). Ni Ohio ni `efeonce-editorial-blocks` registran estilos |
| Estilos declarados en `block.json` | — | `core/button` fill/outline · `core/image` rounded · `core/quote` plain · `core/separator` wide/dots · `core/table` stripes · `core/social-links` |
| Patrones registrados | 18 | 11 core (query + navigation overlay) y 7 formularios Jetpack. **Cero** patrones editoriales; **cero** patrones de usuario (`wp_block`) |
| Posts publicados | 44 | total del sitio |

**Uso real** (posts de Glitch, term 183, 10 posts; y los 20 publicados más recientes):

- Glitch agregado: `paragraph` 305 · `heading` 78 · `image` 56 · **`efeoncepro/glitch-drop` 34** (6 posts; 8 por
  edición desde la #14) · `quote` 25 (en #12/#13 como POV de respaldo y, desde la #14, sólo para la caja de fecha) ·
  `list` 11 · `separator` 10 · Yoast TOC 9 · `embed` 5 · `video` 2 · `table` 1.
- Glitch Flash 251941 (Content Factory): paragraph 23, heading 9, list 5, TOC, image 1, table 1, glitch-drop 1,
  separator 1. Sin pullquote, sin details, sin CTA en botón.
- 20 recientes: además `pullquote` 12, `table` 14, `details` 4, `html` (FAQ JSON-LD) 1, `columns`/`group`/`gallery`/
  `buttons` sólo en 249768 (autoría manual previa a Content Factory), `essential-blocks/testimonial` 1.
- Estilos usados en todo el sitio: `table.is-style-stripes` 2, `separator` wide/dots/default 3,
  `buttons.is-style-fill_content` 2 (clase custom **no registrada**), `core/button.is-style-fill` + `brand-color` 2.
- Deuda observada: `essential-blocks/testimonial` vive en 249768 pero su plugin **no está activo**;
  `leadin/hubspot-form-block` en 4 posts antiguos (formulario de suscripción del blog).
- El plugin `efeonce-editorial-blocks` en vivo es **v0.1.0** (archivos del 2026-07-05): el callout es el **v1**
  de TASK-1337. El v2 aprobado (ver `efeonce-graphic-line` → Glitch §6) **no está desplegado**.

### Brecha: qué sabe emitir Content Factory vs. qué hay

`GutenbergArticleSpec` emite 12 kinds de bloque: `paragraph`, `list`, `details`, `faq`, `table` (+ `style: 'stripes'`),
`quote`, `pullquote`, `separator`, `image`, `embed` (YouTube, + `caption`), **`glitchDrop`** y **`buttons`** (ambos
desde 2026-09-28), más heading/TOC por estructura y CTA en párrafo. El validador acepta además `group`, `columns`,
`column`, `spacer`, `gallery`, pero **no hay kind** que los emita.

| Clase | Bloques / estilos | Nota |
|---|---|---|
| **Ya soportado y usado** | heading anclado, paragraph rich text, list, table (+caption), image (+caption, `sources`, `linkDestination`), separator, Yoast TOC, `faq`/`details` | base del Flash y de Creative Workflows |
| **Soportado desde 2026-09-28** | `glitchDrop` (`efeoncepro/glitch-drop`), `embed.caption`, `table.style: 'stripes'`, `buttons` (fill/outline) | ver «Extensión de GutenbergArticleSpec (implementada)» |
| **Soportado pero no usado** | `pullquote`, `quote` como cita real, `details` sin schema, lista ordenada, `image.linkDestination=media`, `embed` YouTube | el Flash los tenía disponibles y no los usó; revisar en cada spec antes de pedir bloques nuevos |
| **No soportado y valioso** | `core/video` nativo con caption (Glitch #16/#17) · piezas del post Glitch aprobadas en §6 (apertura navy, escaleta, banner de suscripción, «El hilo de la semana», cierre) | las piezas de §6 **no existen** como bloque ni como estilo: primero hay que registrarlas en `efeonce-editorial-blocks` (estilos de `core/group` o patrones sincronizados); sólo después Content Factory puede emitirlas |
| **Valor medio, a demanda** | `core/columns` (comparación lado a lado), `core/code` (posts técnicos, 2 históricos), `separator` wide/dots, `image` rounded | preferir `table` a columnas para comparar; columnas exigen revisión de apilado a 390 px |
| **No recomendado** | `core/cover` y `core/media-text` (texto sobre imagen/contraste y CSS de Ohio sin probar) · `core/tabs`/`accordion` (esconde contenido; `details` ya cubre) · `core/footnotes` (vive en post meta, el write path sólo escribe `post_content`) · `yoast/faq-block` (duplica `kind: 'faq'`) · `yoast/how-to-block` (Google retiró el rich result HowTo) · `yoast-seo/breadcrumbs`/`related-links`/`estimated-reading-time` en el cuerpo (chrome del tema) · formularios `leadin`/Jetpack/CF7 (los formularios van por Growth Forms) · resto de Jetpack (`subscriptions`, `related-posts`, `slideshow`, `image-compare`…) · `spacer` (hack de CSS) · clases custom no registradas (`is-style-fill_content`) · colores/tamaños inline de la paleta Ohio para imitar AXIS | razón en cada fila; reabrir sólo con decisión explícita |

## Glitch Drop por marcador — receta histórica / fallback (probada en 251941, 2026-09-28)

**Ya no es el camino normal.** Desde 2026-09-28 el spec emite el bloque con `{ kind: 'glitchDrop', lines }` (sección
siguiente). Esta receta queda como registro de cómo se hizo 251941 y como fallback sólo para insertar un drop en un
post **ya escrito que no se regenera desde su spec** (p. ej. un post manual). Nunca se escribe el comentario del
bloque a mano.

1. En el spec, en el lugar exacto del drop, poner un párrafo marcador con texto único `__GLITCH_DROP__` (uno por
   drop; si hay varios, `__GLITCH_DROP_1__`, `__GLITCH_DROP_2__`…). El spec valida y se escribe privado con
   `run --send --author-id <id>` como siempre.
2. Snapshot previo del `post_content` (p. ej. `tmp/<slug>-<post_id>-snapshot-<ts>.html`, gitignored).
3. Eval PHP gobernado (`pnpm public-website:wpcli -- --eval-file ./tmp/<script>.php --wp-user 12`):
   - guards: post ID esperado, `_greenhouse_manifest_id` esperado, `post_status` esperado y **exactamente un**
     bloque marcador por cada drop; si no, abortar sin escribir;
   - `parse_blocks($post->post_content)` → reemplazar el `core/paragraph` marcador por
     `['blockName' => 'efeoncepro/glitch-drop', 'attrs' => ['content' => $drop], 'innerBlocks' => [], 'innerHTML' => '', 'innerContent' => []]`;
   - `$drop` en nowdoc UTF-8 (nunca `\uXXXX` ni `json_encode` para el texto); frases separadas por `<br>`;
     **sin enlaces** dentro del drop: el enlace va en el párrafo siguiente;
   - `serialize_blocks()` → `wp_update_post(wp_slash(['ID' => $id, 'post_content' => $new]))` (sin `wp_slash`
     WordPress quita las barras del JSON del atributo);
   - readback: el marcador ya no existe, `has_block('efeoncepro/glitch-drop')`, conteo de drops esperado.
4. WordPress serializa el atributo con `<`→`\u003c`, `>`→`\u003e`, `&`→`\u0026` y deja los acentos en UTF-8:
   `<!-- wp:efeoncepro/glitch-drop {"content":"…\u003cbr\u003e…"} /-->`. Es el formato de los posts reales
   (Glitch #17, 251605, 8 drops).
5. QA en vivo: un `<aside class="… gh-glitch-drop">` visible por drop (`offsetHeight > 0`; Ohio oculta los `aside`
   sin el override del plugin) y **lectura de redundancia**: el párrafo vecino no puede repetir la frase del drop.
   En 251941 la QA encontró la frase duplicada tras el callout y hubo que corregir el párrafo.

## Extensión de GutenbergArticleSpec (implementada 2026-09-28)

Código: `article-authoring.ts` (kinds), `gutenberg-glitch-drop.ts` (serialización del drop + redundancia),
`gutenberg-blocks.ts` (`serializeGutenbergBlockAttributes`), `gutenberg-validator.ts`, `gutenberg-capability-registry.ts`,
`gutenberg-pattern-catalog.ts`, `draft-write-eval.ts` (`wp_slash`). Tests: `__tests__/gutenberg-glitch-drop.test.ts`,
`__tests__/article-authoring-editorial-blocks.test.ts`, `__tests__/draft-write-eval.test.ts`. Dry-run end to end con
los cuatro tipos: `validation=pass`, cero findings.

### 1. `glitchDrop` → `efeoncepro/glitch-drop`

```json
{ "kind": "glitchDrop", "lines": [
  "Durante mucho tiempo la regla fue sencilla: si la tarea importaba, ibas al modelo más grande.",
  "La pregunta ya no es «¿cuál es el mejor modelo?», sino «¿para qué tarea necesito de verdad el más caro?»."
] }
```

- 1–4 líneas de **texto plano** (no rich text). Se rechazan antes de armar markup: HTML (`<a`, `<strong>`…),
  URLs (`https://`, `www.`), saltos de línea, caracteres de control y la barra invertida (rompe el reemplazo
  `\"` de WordPress). `a < b` con espacio es texto y pasa.
- Render: cada línea se escapa como la guarda el editor (`&`, `<`, `>` → entidades; comillas literales), se unen con
  `<br>` y el atributo se serializa **igual que `serialize_block_attributes()`** de WordPress:
  `<!-- wp:efeoncepro/glitch-drop {"content":"…\u003cbr\u003e…"} /-->`. Probado byte a byte contra el drop real de
  251941 y comparado contra la función PHP de core en casos con `--`, `&`, `"`, `<>`, U+2028/2029, tab y salto.
- Validador: el bloque está en el allowlist **sólo con su forma gobernada**. `block` si no es self-closing
  (`glitch_drop_not_self_closing`), si trae atributos distintos de `content`/`label` (`glitch_drop_attrs_unsupported`),
  si `content` está vacío (`glitch_drop_content_missing`), si trae enlace (`glitch_drop_link_not_allowed`) o HTML
  distinto de `<br>` (`glitch_drop_html_not_allowed`); `warning` con más de 4 líneas (`glitch_drop_too_many_lines`).
- **Redundancia** (`glitch_drop_redundant_with_neighbor`, warning): se compara cada línea y cada oración de la línea
  (≥ 4 palabras) contra el bloque de texto vecino (`paragraph`, `list`, `quote`, `pullquote`) anterior y siguiente del
  mismo nivel, saltando heading/separator/spacer/TOC; cualquier otro bloque corta la búsqueda. Texto normalizado (sin
  acentos, minúsculas, sin puntuación). Dispara si ≥ 60 % de los 4-gramas de la unidad están en el vecino **o** si
  comparten una racha literal de ≥ 8 palabras. Calibrado con 251941: la línea 2 contra el párrafo original comparte
  14/16 4-gramas (0,875); el párrafo corregido no dispara.
- Pendiente: el aviso «post fuera de la categoría Glitch» de la propuesta **no** se implementó (el spec no lleva
  categorías); `post-deep-inspection` todavía marca el bloque como `third_party_block_preserve_until_serialization_known`.

### 2. `embed.caption`

```json
{ "kind": "embed", "provider": "youtube", "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "caption": [{ "text": "Fuente: " }, { "text": "Anthropic", "href": "https://www.anthropic.com/news" }] }
```

Rich text con enlaces seguros; render `…<div class="wp-block-embed__wrapper">URL</div><figcaption class="wp-element-caption">…</figcaption></figure>`
(la forma real de Glitch #17). Sin caption el markup no cambia. De paso, la URL ahora se valida (`https:` y host
`youtube.com`/`www.`/`m.`/`youtu.be`; si no, `content_factory_article_embed_url_invalid`) y se escapa en el wrapper y
en los atributos. `core/video` nativo sigue pendiente.

### 3. `table.style: 'stripes'`

```json
{ "kind": "table", "style": "stripes", "headers": ["Modelo", "Uso"], "rows": [["Sonnet 5.5", "Agentes"]],
  "caption": "Fuente: anuncio de Anthropic." }
```

Render `<!-- wp:table {"className":"is-style-stripes"} -->` + `<figure class="wp-block-table is-style-stripes">`. Otro
valor → `content_factory_article_table_style_invalid`. Revisar Ohio a 390 px en tablas anchas.

### 4. `buttons`

```json
{ "kind": "buttons", "items": [
  { "text": "Suscríbete a Glitch", "href": "https://efeoncepro.com/glitch/" },
  { "text": "Escríbenos", "href": "mailto:hola@efeoncepro.com", "variant": "outline" }
] }
```

- 1–3 botones; `href` sólo `https:`, `http:` o `mailto:` (URL absoluta); `variant` cerrado: `fill` (estilo por
  defecto de core, **sin clase**) u `outline` (`is-style-outline`). Texto plano sin markup. Sin colores, tamaños ni
  clases propias: no hay campo para pedirlos.
- Render idéntico al editor: `<!-- wp:buttons -->` → `<div class="wp-block-buttons">` con los `wp:button` separados
  por línea en blanco, cada uno `<div class="wp-block-button[ is-style-outline]"><a class="wp-block-button__link wp-element-button" href="…">…</a></div>`.
- Validador (warnings, para no bloquear refresh de posts heredados como 249768): `button_style_not_governed` ante
  `backgroundColor`/`textColor`/`gradient`/`style`/`fontSize`/`fontFamily`/`borderColor` o clases fuera de
  `is-style-fill`/`is-style-outline`; `button_link_not_governed` si el destino no es http(s)/mailto.
- La decisión de si el CTA de suscripción de Glitch va en botón o en el banner aprobado de §6 sigue abierta.

### 5. Pendiente (no implementado)

- `{ kind: 'video'; mediaId; url; caption?; poster? }` para `core/video` con media real.
- **Piezas Glitch de §6** (apertura navy, escaleta, banner de suscripción, «El hilo de la semana», cierre):
  **prerrequisito de runtime**, no de builder. Primero registrar en `efeonce-editorial-blocks` estilos de
  `core/group` (`register_block_style`) o patrones sincronizados con CSS de AXIS/`glitchLine`; recién entonces un
  `kind: 'glitchSection'` con `variant` cerrado. Mismo plugin que debe subir el callout a v2 (el atributo `content`
  del drop no cambia con el v2).
