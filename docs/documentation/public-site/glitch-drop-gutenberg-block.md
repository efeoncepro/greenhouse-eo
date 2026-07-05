# Glitch Gutenberg Block Contract

## Purpose

`Glitch` is the editorial POV module used inside the weekly Efeonce blog
series `Glitch de la semana`.

Today, the POV is represented as a quote-like block inside each news item. That
is useful visually, but semantically wrong: a Glitch is not a citation from
an external source. It is Efeonce's interpretation of the signal, risk,
opportunity or practical business implication behind the news.

The long-lived target is a dedicated Gutenberg block, not a styled `core/quote`.

## Status

- Current runtime: existing posts may still use quote/freeform fragments.
- Target block: `efeoncepro/glitch-drop`.
- Visible/editorial name: `Glitch`.
- Target owner: a public-site/editorial WordPress plugin, tentatively
  `efeonce-editorial-blocks`.
- Implementation state: planned; no runtime block exists yet.
- Canonical docs:
  - This contract.
  - `docs/documentation/public-site/gutenberg-post-authoring-recipes.md` for
    post authoring rules.
  - `docs/architecture/public-site/PRIMITIVES.md` for public-site primitive
    governance.

## Editorial Contract

Use `Glitch` when a news item needs Efeonce's POV, especially:

- why the news matters for business, marketing, revenue, operations or AI
  adoption;
- what signal is hidden behind the headline;
- what a founder, CMO, RevOps, sales, agency or product team should do next;
- where hype is misleading or where a shift creates an opportunity.

Do not use it for:

- direct quotes from a person, report or article;
- generic summaries of the news;
- source attribution;
- decorative pull text;
- claims without enough context or source in the surrounding news item.

Authoring shape:

- Label: default visible label `Glitch`.
- Content: one short paragraph is preferred; two compact paragraphs are allowed
  when the POV needs a tradeoff.
- Tone: sharp, useful and specific. Avoid filler like "esto demuestra que".
- Voice: Efeonce editorial voice, using `tú` where directly addressing the
  reader.
- Evidence: if the POV depends on a claim, the surrounding news item must carry
  the source link or context. The block itself should not become a citation
  container.

## Technical Recommendation

Build the block as a Gutenberg block inside a plugin rather than the theme.

Reason:

- the content contract should survive theme changes;
- WordPress can discover/register the block server-side;
- block assets can be loaded only when the block is present;
- future design changes can apply globally without opening each post.

Recommended scaffold:

```bash
npx @wordpress/create-block@latest glitch-drop \
  --namespace=efeoncepro \
  --variant dynamic \
  --wp-env \
  --textdomain=efeonce-editorial-blocks
```

Recommended metadata:

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "efeoncepro/glitch-drop",
  "title": "Glitch",
  "category": "text",
  "description": "Efeonce editorial POV for a news item in Glitch de la semana.",
  "keywords": ["glitch", "pov", "opinion", "insight"],
  "textdomain": "efeonce-editorial-blocks",
  "attributes": {
    "content": {
      "type": "string",
      "source": "html",
      "selector": ".gh-glitch-drop__content",
      "role": "content"
    },
    "label": {
      "type": "string",
      "default": "Glitch"
    },
    "tone": {
      "type": "string",
      "default": "insight",
      "enum": ["insight", "risk", "opportunity", "operator"]
    }
  },
  "supports": {
    "align": false,
    "html": false,
    "spacing": {
      "margin": true
    }
  },
  "editorScript": "file:./index.js",
  "editorStyle": "file:./index.css",
  "style": "file:./style-index.css",
  "render": "file:./render.php"
}
```

Use `apiVersion: 3` from the start. WordPress is moving the post editor toward
the iframe model; declaring all editor/front-end styles in `block.json` avoids
style loss inside the editor canvas.

## Rendering Contract

The front-end should render as a semantic aside:

```html
<aside class="wp-block-efeoncepro-glitch-drop gh-glitch-drop gh-glitch-drop--insight" aria-label="Glitch">
  <p class="gh-glitch-drop__label">Glitch</p>
  <div class="gh-glitch-drop__content">...</div>
</aside>
```

Dynamic rendering is recommended:

- `block.json` declares `"render": "file:./render.php"`.
- `render.php` uses `get_block_wrapper_attributes()`.
- PHP sanitizes attributes with WordPress escaping APIs.
- The editor still stores the content attribute so authors can edit/reload
  without losing data.

Why dynamic:

- design/markup improvements can roll out to all existing Glitch blocks;
- less risk of "Invalid block" when improving wrapper markup;
- the block can later add editorial metadata without rewriting all posts.

Fallback:

- If the implementation chooses to save fallback markup for plugin-off
  resilience, keep it minimal and stable.
- Any future static markup change must ship a `deprecated` migration in JS.

## Editor Experience

The editor should make the correct usage obvious:

- Inserter title: `Glitch`.
- Placeholder: `Escribe el POV de Efeonce sobre esta noticia...`.
- Toolbar: only rich text controls needed for short editorial emphasis.
- Sidebar controls:
  - `Label` only if editors truly need variants; otherwise keep fixed.
  - `Tone` as a small enum if styling/meaning differs.
- Do not expose arbitrary color controls in V1.
- Do not allow raw HTML editing for the block.

## Accessibility

Minimum contract:

- Wrapper element: `aside`.
- Accessible name: `aria-label` from the label, default `Glitch`.
- Visible label must not be the only semantic cue; the aside carries the role.
- Decorative icons, if added later, use empty `alt` or `aria-hidden="true"`.
- Color/tone must not be the only distinction. Tone can alter label/icon/copy,
  but the content remains understandable without color.

## Styling Contract

The block should feel like an editorial aside, not an external quote:

- root class: `.gh-glitch-drop`;
- BEM children: `.gh-glitch-drop__label`, `.gh-glitch-drop__content`;
- tone modifiers: `.gh-glitch-drop--insight`, `--risk`, `--opportunity`,
  `--operator`;
- scoped CSS only; do not target `blockquote` globally;
- responsive behavior must hold at mobile 390px with no page overflow;
- motion is not required in V1. If introduced later, guard with
  `prefers-reduced-motion`.

### Approved visual direction (TASK-1337, operator-approved 2026-07-04)

Canonical visual spec: `docs/ui/wireframes/TASK-1337-glitch-gutenberg-block.md`
(`## Visual Design Spec` + `## Motion`). Implementation follows it; the summary
below is the load-bearing subset.

- Pattern: an editorial callout (GitHub `Note` / Stripe callout family), not a
  quote and not a promo widget. Strip citation codes (quotation mark, italic
  body, centered pull-text, bare rule, `— source`); apply authored-annotation
  codes.
- `.gh-glitch-drop__label` renders the **brand wordmark** (`glitch-light.svg`) at
  eyebrow scale (~18–20px tall), not plain text. The consuming runtime is
  WordPress, so copy the SVG into the plugin (`efeonce-editorial-blocks/**`) and
  keep the visible/accessible name `Glitch`.
- Surface: faint navy-tinted panel — `color-mix(in oklch, #022a4e, white 95%)`
  (≈`#f1f4f7`). No gradient, no heavy shadow. `border-radius: 12px`, padding
  `20–24px` desktop / `16px` mobile, vertical margin `~32px`.
- Accent: `3px` left bar in navy `#022a4e` (or navy @ 60–70%).
- Color a11y (hard rule): Glitch green `#6ec207` is ~2.25:1 on white — below the
  4.5:1 text floor and the 3:1 UI-component floor. Use it **only as the isotype
  inside the wordmark**, never for text, borders, separators or state. Navy ink
  + panel tint carry all functional separation.
- Body: `.gh-glitch-drop__content` is upright regular `400` (never italic), at
  the Ohio blog body size or one step up (~18px) — it is primary content, not a
  footnote. `line-height: 1.5–1.6`, left-aligned.
- Tone variants (`insight|risk|opportunity|operator`): deferred in V1; if added
  later, change only a small secondary signal, never the whole card color, and
  never as the only cue.
- Dark context: swap to `glitch-dark.svg` (white wordmark) on a solid-navy
  surface; ship light in V1 (Ohio blog is light).

## Migration Strategy

Recommended rollout:

1. Build and test the block plugin in local WordPress.
2. Insert the block in one private/draft Glitch post and verify editor reload +
   front-end render.
3. Publish in the next Glitch edition only after manual editorial review.
4. Keep historical quote-based Glitch POV blocks untouched until there is a
   migration task.
5. If migrating old posts, inspect each post first and convert only blocks that
   clearly represent Efeonce POV, not real citations.

Do not automatically convert all `core/quote` blocks. Some are actual quotes.

## Verification Checklist

Before calling V1 ready:

- `npm run build` or equivalent block build passes.
- The block appears in the inserter.
- Insert -> save -> reload editor creates no "Invalid block" warning.
- Front-end output matches editor intent.
- Styles load inside the editor iframe and on the front-end.
- Mobile 390px has no horizontal overflow.
- Existing quote/freeform blocks in old posts are not broken.
- Kinsta cache purge and rollback path are known before any live plugin change.

## Implementation (as-built, V1 — TASK-1337, 2026-07-04)

The block was implemented in the public-site runtime repo. This section is the
authoritative as-built contract; where it differs from the earlier
recommendations above, the as-built wins (the recommendations are kept for
history + rationale).

- Plugin: **new** `efeonce-editorial-blocks` (dedicated editorial-blocks
  plugin — no existing plugin is a Gutenberg-blocks host; `eo-elementor-widgets`
  is Elementor). Path in runtime repo:
  `wp-content/plugins/efeonce-editorial-blocks/`.
- Block source: `src/glitch-drop/` → `block.json`, `index.js`, `render.php`,
  `style.css`, `glitch-mark.svg`. Registered server-side via
  `register_block_type( __DIR__ . '/src/glitch-drop' )` on `init`.
- **Build-less on purpose.** The runtime is a raw-file deploy rail to Kinsta with
  no bundler step, so `index.js` is hand-authored against the `wp.*` globals
  (`wp.blocks`, `wp.blockEditor`, `wp.element`, `wp.i18n`) — no JSX, no
  `@wordpress/scripts`. This matches the repo convention (PHP + raw assets) and
  avoids committing/serving compiled artifacts that nothing rebuilds on deploy.
- **`content` has no `source`** (stored in the block comment delimiter), not the
  earlier `source: html` suggestion. Reason: the block is **dynamic**
  (`save() => null`, `render.php` owns markup). A dynamic block with
  `source: html` + `save: null` would have no saved markup to read the source
  from and would lose the content. Delimiter storage persists the content and
  reloads without an "Invalid block" warning.
- **`tone` deferred** (not in `block.json`). Restraint: no second accent /
  variant without clear semantics in V1.
- **Single `style.css`** referenced as `"style"` (loads in both the editor
  iframe and the front-end), not separate `editorStyle`/`style`. One scoped
  ruleset under `.gh-glitch-drop`; never targets `blockquote`.
- **Label = wordmark via CSS.** `.gh-glitch-drop__label` is image-replaced with
  `glitch-mark.svg` (`background: url(./glitch-mark.svg)`), the literal `Glitch`
  text kept in the DOM for resilience and `aria-hidden="true"` in markup (the
  `<aside>` carries `aria-label`). One rule works in editor + front-end; no JS
  URL plumbing, no PHP SVG string. `glitch-mark.svg` is a byte-exact copy of
  `greenhouse-eo/public/branding/glitch/glitch-light.svg`.
- **`aria-label` appended explicitly** on the `<aside>` (outside
  `get_block_wrapper_attributes()`) so it is present regardless of the helper's
  attribute-merge behaviour across WP versions.
- Verified (static): `php -l`, `block.json` schema, `node --check index.js`, SVG
  well-formed, and a deterministic render harness (10 checks — `<aside>` not
  `<blockquote>`, canonical + `gh-glitch-drop` classes, `aria-label`, label
  `aria-hidden`, content preserved, empty-content guard, custom label).
- **Verified (live, operator-approved 2026-07-04).** Deployed to Kinsta
  (`wp-content/plugins/efeonce-editorial-blocks/`, byte-exact) and **activated**
  on production efeoncepro.com (WP **7.0**, PHP 8.2), then verified end-to-end
  via governed WP-CLI (`pnpm public-website:wpcli`): block registered (title
  `Glitch`, render_callback + editorScript + style handles wired); a private
  test post parsed with `parse_blocks` as recognized (**no invalid block**),
  `has_block` true; `do_blocks` rendered the semantic `<aside>` with
  `aria-label="Glitch"`, `.gh-glitch-drop`, **no `<blockquote>`**, content
  preserved; UTF-8 confirmed via isolated `render_block`; the private test post
  was force-deleted (clean rollback). No local WP / no automated deploy lane was
  needed — the governed SSH WP-CLI wrapper reaches the live runtime.
- **Residual verification (visual, not blocking).** In-editor UI insert/save/
  reload by a human, and an in-Ohio browser capture (desktop + mobile 390px, no
  horizontal overflow) with CSS applied. The CSS is scoped + static-validated
  and the live markup is confirmed; capture on the first real Glitch draft (or
  a temporary authenticated private post). Runbook:
  `docs/manual-de-uso/public-site/glitch-editorial-block.md`.

## Sources Consulted

- WordPress Block Editor Handbook: `block.json` metadata.
- WordPress Block Editor Handbook: static vs dynamic rendering.
- WordPress Block Editor Handbook: block attributes and serialization.
- WordPress Block Editor Handbook: block deprecations.
- WordPress Code Reference: `register_block_type_from_metadata()`.
- WordPress Code Reference: `get_block_wrapper_attributes()`.
- `@wordpress/create-block` package docs.
