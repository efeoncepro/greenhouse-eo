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
| 1 | Label | Identify the module as Efeonce commentary | `.gh-glitch-drop__label` | `label` attribute, default `Glitch` |
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
