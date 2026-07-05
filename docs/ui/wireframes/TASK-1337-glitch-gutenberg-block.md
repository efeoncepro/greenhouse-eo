# TASK-1337 — Glitch Gutenberg Block

## Meta

- Status: `draft`
- Owner task: `TASK-1337`
- Motion contract: `docs/ui/motion/TASK-1337-glitch-gutenberg-block-motion.md`
- Product Design asset: `none`
- Intended consumers: Efeonce blog editors writing `Glitch de la semana`; future AI Content Factory Gutenberg drafts.
- Copy source: local editorial block contract, `docs/documentation/public-site/glitch-drop-gutenberg-block.md`
- Primitive decision: `new` public-site semantic Gutenberg block, visible/editorial name `Glitch`, technical block `efeoncepro/glitch-drop`
- UI ready target: `no`

## Brief

- Primary user: Efeonce editor/author composing a weekly Glitch post in Gutenberg.
- User moment: after summarizing a news item, the editor adds Efeonce's POV on why it matters.
- Job to be done: insert a clearly branded editorial aside that is not semantically an external quote.
- Primary decision signal: the reader can distinguish source/news summary from Efeonce commentary at a glance.
- Non-goals: full redesign of Glitch posts, automated migration of historical quotes, dynamic news sourcing, AI generation of the POV.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Block wrapper | Semantic aside around the POV | `aside.wp-block-efeoncepro-glitch-drop.gh-glitch-drop` | Gutenberg block attributes |
| 1 | Label | Identify the module as Efeonce commentary via the brand wordmark | `.gh-glitch-drop__label` rendering `glitch-light.svg` at eyebrow scale (~18px) | `label` attribute, default `Glitch` |
| 2 | Content | Editable POV copy | `RichText` editor + `.gh-glitch-drop__content` render | `content` attribute |
| 3 | Tone marker | Optional visual/semantic tone without changing meaning | `gh-glitch-drop--{tone}` | `tone` enum |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `public_site.glitch.block.label.default` | label | `Glitch` | none | Visible label and accessible name default |
| `public_site.glitch.block.placeholder` | editor placeholder | `Escribe el POV de Efeonce sobre esta noticia...` | none | Editor-only prompt |
| `public_site.glitch.block.description` | inserter/help | `POV editorial de Efeonce para una noticia de Glitch de la semana.` | none | Spanish version of block description if exposed |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Glitch | Authored POV content | none | Front-end/editor normal state |
| loading | none | none | none | Static/editor block does not need loading state |
| empty | Glitch | Placeholder in editor only | Fill content | Empty front-end content should not publish |
| partial | Glitch | Content plus default label/tone | none | Missing optional label/tone falls back safely |
| error | none | Block validation warning from editor/runtime | Re-open in editor or rollback plugin | No custom front-end error UI in V1 |
| denied | none | none | none | Access handled by WordPress editor permissions |

## Visual Design Spec

Grounded in `modern-ui` + `typography-design` (invoked 2026-07-04). Runtime target: WordPress/Ohio, light reading context on `efeoncepro.com/blog`.

### Pattern decision

`Glitch` is an **editorial callout** (the GitHub `Note` / Stripe docs callout / Notion callout family), **not** a quote and **not** a promotional widget. Governing rule: strip every visual code of a *citation* (decorative quotation mark, italic body, large centered pull-text, bare vertical rule, `— source` attribution) and apply the codes of an *authored annotation with its own brand*. This single decision resolves both task tensions at once — it separates the block from `core/quote` and keeps it from reading as an ad unit (consistent with `Motion type: none`).

### Anatomy

```text
┌─────────────────────────────────────────────────────────┐
│ ▍  [ᯤ Glitch]        ← brand wordmark, eyebrow scale ~18px │
│ ▍                                                          │
│ ▍  Efeonce POV in normal upright body (NOT italic),        │
│ ▍  left-aligned, navy ink on a faint navy-tinted panel.    │
│ ▍  One or two short paragraphs. Owned voice, no "— source".│
└─────────────────────────────────────────────────────────┘
   ▍ = left accent (navy)   · panel = navy tint ~5%   · radius 12px
```

- Container: card at article-column width (not narrow/inset like a pull-quote), `border-radius: 12px`, padding `20–24px` desktop / `16px` mobile, vertical margin `~32px` to separate it from the news item it comments on.
- Surface: faint navy-tinted panel — `color-mix(in oklch, #022a4e, white 95%)`. No gradient, no heavy shadow (those are what would read "promo").
- Left accent: `3px` bar, navy (see color contract for why not green).
- Label = the **brand wordmark** (`glitch-light.svg`) at eyebrow scale (~18px tall), top-left. Replaces the quote's decorative quotation mark with ownable identity. The shipped SVGs (`public/branding/glitch/glitch-{light,dark}.svg`) exist for exactly this; the consuming runtime is WordPress, so copy the asset into the plugin (`efeonce-editorial-blocks/**`) rather than referencing greenhouse-eo `public/`.

### Color contract

`#6ec207` (Glitch green) on white measures **~2.25:1** — below the 4.5:1 text floor and below the 3:1 UI-component floor. Therefore green is a **brand spark only**, never a functional/text/separator color. Real visual separation is carried by navy ink + the panel tint.

| Role | Token / value | Contrast |
|---|---|---|
| Label + body ink | navy `#022a4e` | ~14:1 on panel ✔ |
| Left accent bar | navy `#022a4e` (or navy @ 60–70%) | ✔ |
| Spark / isotype | green `#6ec207` — **only inside the wordmark** | decorative |
| Surface | `color-mix(in oklch, #022a4e, white 95%)` | — |

One accent, neutral ramp around it. Restraint is the meta-pattern.

### Typography contract

- Label: rendered as the wordmark (graphic). Text fallback only: `GLITCH`, caps, `letter-spacing: 0.06–0.08em`, semibold, navy — the *overline* role (the one legitimate caps case).
- Body POV — **the #1 differentiator**: regular `400`, **upright (never italic)**. Size = equal to or one step above the Ohio blog body (~18px), **not smaller** — it is primary content, not a footnote. `line-height: 1.5–1.6`, left-aligned, inherits the column measure (~66ch). Proportional numerals (running prose).

### Differentiation contract

- vs. `core/quote`: wordmark not quotation mark · upright body not italic · left-aligned not centered · tinted panel not bare rule · no attribution line.
- vs. ad / promo widget: no gradient, no strong shadow, no pill CTA, no "sponsored"-style badge, single accent color, generous whitespace. Editorial, not attention-grabbing.

### Responsive

- 390px: same card, `16px` padding, wordmark stays eyebrow scale, body wraps, `scrollWidth === clientWidth` (no page horizontal overflow).

### Dark context (future, not V1)

If ever rendered on a dark surface: swap to `glitch-dark.svg` (white wordmark), surface = solid navy, green spark unchanged. Keep the tokens ready but **ship light in V1** (Ohio blog is light).

### Tone variants — deferred in V1

`tone` (insight/risk/opportunity/operator) is deferred. Restraint forbids a 2nd/3rd accent without clear semantics. If introduced later it must change only a small secondary signal (e.g. a short descriptor word beside the wordmark), never the whole card color, and never as the only cue (pair with label/icon/copy).

## Motion

Canonical contract: `docs/ui/motion/TASK-1337-glitch-gutenberg-block-motion.md`. V1 has **no authored motion**.

- Front-end block: static on load. No enter fade, no reveal, no pulsing accent, no hover effect (the front-end block is non-interactive).
- Editor: native Gutenberg focus/selection only; nothing authored on top.
- Reduced motion: nothing to guard — there is no authored effect, so output is identical under `prefers-reduced-motion: reduce`.
- Rationale: the block is editorial commentary; stability + semantic clarity beat attention capture, and any motion would push it toward the "promo widget" reading the design explicitly avoids.
- Future-conditional (out of V1 scope): motion may be added later **only** if it solves a real comprehension or feedback problem, **only** as a subtle compositor-only enter transition (`opacity`/`transform`) guarded by `prefers-reduced-motion`, never decorative accent motion — and requires an updated motion contract before implementation.

## Accessibility Contract

- Heading order: no heading in the block by default; the visible `Glitch` label is a paragraph/eyebrow, not an H tag.
- Chart/table alternatives: N/A.
- Aria labels: wrapper carries `aria-label="Glitch"` unless a custom label is intentionally provided.
- Focus notes: editable `RichText` field must remain keyboard reachable in Gutenberg; no custom focus trap.
- Color-independent state labels: tone may alter style but the label/content must remain understandable without color.

## Implementation Mapping

- Route / surface: WordPress Gutenberg post editor and front-end blog posts on `efeoncepro.com/blog`.
- Primitives: new public-site semantic Gutenberg block; registry entry `Glitch`.
- Variants / kinds: V1 tone enum `insight|risk|opportunity|operator` only if implementation confirms value; otherwise defer tones and ship one default variant.
- Component candidates:
  - `Edit` component using `useBlockProps`, `RichText`, optional `InspectorControls`.
  - `render.php` using `get_block_wrapper_attributes()`.
  - `block.json` with `apiVersion: 3`.
- Copy source: local one-off inside block package in V1, mirrored in this ledger; graduate to shared content factory copy only if reused by automation.
- Data reader / command: none.
- API parity: N/A; no business action.
- Access / capability: WordPress editor permissions only.
- Runtime consumers:
  - Human-authored Glitch posts.
  - Future `post_draft_gutenberg` generation via TASK-1123/content factory after block exists.
- Print/email/PDF considerations: no V1 output beyond blog HTML.
- GVC markers: root may include `data-capture="glitch-block"` in draft/private verification if safe for production markup; otherwise use CSS selector `.gh-glitch-drop`.

## GVC Scenario Plan

- Scenario file: create a proportional public-site WordPress/Playwright verifier or manual capture script during implementation.
- Route: private/draft Glitch test post URL in local/staging WordPress.
- Viewports: desktop `1440x1000`, laptop `1280x900`, mobile `390x844`.
- Required steps:
  - Insert `Glitch` block in Gutenberg.
  - Save draft/private post.
  - Reload editor and confirm no invalid block warning.
  - Open front-end preview and capture block in context.
- Required captures: editor canvas, front-end desktop block, front-end mobile block.
- Required `data-capture` markers: `glitch-block` if implemented; otherwise selector evidence.
- Assertions: block exists once, label is `Glitch`, wrapper is an `aside`, no `blockquote` wrapper, no page horizontal overflow.
- Scroll-width checks: assert `scrollWidth === clientWidth` on front-end desktop and mobile 390px.
- Accessibility/focus checks: keyboard can reach/edit content in editor; front-end aside has accessible name.
- Reduced-motion evidence: no authored visual effects in V1.

## Design Decision Log

- Decision: visible/editorial name is `Glitch`; technical slug remains `efeoncepro/glitch-drop`.
- Alternatives considered: keep using `core/quote`; create only a quote style variation; visible name `Glitch Drop`.
- Why this pattern: `Glitch` is shorter and more ownable for readers/editors, while a dedicated block fixes the quote semantics.
- Reuse / extend / new primitive: new public-site Gutenberg block; quote style is allowed only as temporary fallback before implementation.
- Decision (visual, 2026-07-04): render as an editorial callout (GitHub `Note` / Stripe callout family), not a quote and not a promo widget; see `## Visual Design Spec`.
- Decision (label): the `.gh-glitch-drop__label` renders the brand wordmark (`glitch-light.svg`) at eyebrow scale, not plain text, replacing the quote's decorative quotation mark with ownable identity.
- Decision (color a11y): Glitch green `#6ec207` is ~2.25:1 on white, so it is a brand spark inside the wordmark only — never text, border or state color; navy `#022a4e` + panel tint carry all functional separation.
- Decision (body): POV body is upright regular `400` (never italic) at blog-body size or one step up — the primary tell that separates it from `core/quote`.
- Decision (motion): V1 ships no authored motion; rationale + future-conditional captured in `## Motion` and the canonical motion contract.
- Open risks: plugin location/build rail, exact local/staging WordPress test flow, whether tone variants add enough value for V1.
- Follow-up: historical quote migration only after V1 proves stable in new posts.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Charts have table/text alternatives or are marked N/A.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for a new scenario file or manual verifier.
- [ ] Design decision log explains reuse/extend/new before runtime code starts.
