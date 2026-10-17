# Source-led Elementor patterns

Load for Claude Design ports and later visual iterations of modular public pages. These are reusable
lessons, not a live-state ledger. Architecture: `docs/architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md`;
primitive ownership: `docs/architecture/public-site/PRIMITIVES.md`. Dated Home evidence, hashes and rollback
belong in `references/landings/home-claude-design-preview.md` and the linked audit.
Content Ops compiler/host evidence: `docs/architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md`
and `references/landings/content-marketing.md`. Second canvas compiler (Agencia de Medios, 2026-10-16):
`references/landings/agencia-de-medios.md`; third (HubSpot v2, 2026-10-16, with a page layer and a mobile dock):
`references/landings/hubspot-services.md`; fourth (Performance Marketing, 2026-10-17): `references/landings/performance-marketing.md`.

## Shared source-led core (2026-10-17)

Medios and Performance now share one core; new canvas landings must use it instead of cloning a compiler.

- **Compiler:** `scripts/public-website/lib/source-led-compiler.cjs` owns stages 2–3 (schema + template per section,
  repeaters, Growth Form fields in `formModule`, Service/FAQPage fields in `serviceModule`, scoped CSS, optional
  unscoped `page.css`, `used-assets.json`). A landing script owns only stage 1 (expand its canvas into
  `section[data-gh-module]` + `tabCss`) and calls `compileSourceLedLanding({ landing, sourceDir, source, assets, $,
  modules, tabCss, formModule, serviceModule, faq, serviceDefaults, pageLayer })`.
- **Widget base:** runtime `includes/widgets/class-eo-source-led-landing-base.php`
  (`EO_Source_Led_Landing_Base_Widget`). A landing base only declares `LANDING`, `TITLE_PREFIX`, `KEYWORDS`,
  `FORM_MODULE` and defines `eo_<landing>_register_assets()`; definitions are cached per landing + module.
- **Gates (both must pass before any package):** `node scripts/public-website/verify-source-led-compilers.cjs`
  (re-compiles every migrated landing into a scratch root and compares byte by byte with the runtime plugin) and
  `php scripts/public-website/verify-source-led-render.php` (fingerprint of name/title/keywords/deps/controls and four
  render probes per module; diff before/after a base change must be empty; a one-character change is detected).
- **Core release:** `build-source-led-core-package.cjs <live baseline>` → `deploy-source-led-core-package.php`
  (contract `source-led-core-release.v1`, allowlist of the three base files, previous-SHA guard, backup tar). The
  shared base is written **before** the landing bases so no request loads a base without its parent. Deployed
  2026-10-17 21:25 UTC (backup `/tmp/eo-source-led-core-before-20261017-212544.tar` on Kinsta); live module HTML of
  Medios (16) and Performance (10) identical before/after. The Medios and Performance packages also ship the shared base.
- **Republisher:** `republish-source-led-page.php <spec.json> <page-custom.css>` with specs in
  `<landing>-source/republish.json`. Requires `expectedDataSha` to write; keeps each module's live widget settings
  (`preserveWidgetSettings`, default true); does nothing when the rebuilt tree, custom CSS and featured image already
  match (`unchanged`); `dryRun` reports `sameTree/sameCss/keptWidgetSettings`; `force` saves anyway (canary). It fills
  `post_featured_image`, restores and verifies `_thumbnail_id` after `Document::save()`, snapshots tree/settings/
  thumbnail/page metas, checks protected pages and global chrome, rebuilds the Yoast indexable and warns
  (`primaryImageWarning`) when the page has no featured image. Live canary 2026-10-17 on Performance: same hash
  `687fa928…`, thumbnail `252002` kept.
- **Yoast primary image over http:** a CLI save makes Elementor write its `post_content` HTML copy with plugin image
  URLs over `http://` (`EO_ELEMENTOR_WIDGETS_URL` is computed at plugin load, without HTTPS context; forcing
  `$_SERVER['HTTPS']` later does not change it). When a page has no featured image, Yoast takes the schema
  `primaryImageOfPage` from that copy. Fix = featured image (use the OG attachment): HubSpot `244079` repaired
  2026-10-17 with `251991` (`repair-landing-primary-image.php`, snapshot `_gh_primary_image_repair_before_20261017_212620`).
  Contacto `20729` still serves an http plugin image because it keeps no featured image; giving it its OG image is
  the operator's call. Systemic option (not done): make the plugin URL constant scheme-aware.

## Source fidelity without losing editability

1. Extract and read the source HTML/CSS/JS, not only screenshots. Inventory sections, anchors, media,
   responsive breakpoints and trigger/state/cleanup for every interaction.
2. Distinguish source design from approved exceptions. Preserve existing Ohio header/footer unless
   explicitly in scope; wireframe labels, placeholder form success and invented proof are not finished copy.
3. Look up public-site primitives, then decide `reuse | extend | new`. Agency's pattern is separate
   semantic server-rendered widgets with versioned schemas/templates, not one HTML widget or one opaque
   module selector. Its Home has 16 body modules plus Experience; that count is not a rule for new pages.
4. One schema drives native controls, import and PHP rendering. Use text, number, URL, Media, select and
   repeaters with context escaping; do not expose arbitrary HTML/code as the editing surface. Preserve
   the document's approved overrides when changing defaults or migrating schemas.
5. Mount per widget idempotently. Rerender/removal must abort listeners, disconnect observers, cancel
   timers/frames and remove active overlays/playback. Editor/reduced-motion mode shows content without
   waiting for a reveal, does not clone rails, and does not contact video providers.

## Compiling design exports with custom directives

- Inspect the parsed tree before treating an export as ordinary HTML. A standards-oriented parser can
  relocate unknown wrappers such as `sc-for` inside a table; XML parsing can instead absorb content after
  HTML void tags such as `<br>`. Content Ops uses Cheerio's htmlparser2 path with `xmlMode:false` to retain
  its directive structure and HTML semantics. This is an artifact-specific adapter, not a universal
  parser default. Compare row/cell content and text after void tags with the approved source.
- Compile trusted, approved source expressions locally into PHP initial markup, native control schemas
  and a bounded client enhancement. Do not ship the design interpreter or evaluate arbitrary editor text.
  Check all interactive states when collecting editable copy/media/links, not only the initial render.
- Keep server markup and client patches structurally compatible. Adjacent text nodes may be coalesced
  by the browser; verify real hydration rather than relying on generated string equality.
- Treat an embedded renderer's host as opaque. Preserve its actual DOM node across parent updates,
  including during initial hydration; skipping child reconciliation alone is insufficient if the host
  itself can be replaced. Test that typed fields, validation and step state survive neighboring controls.
  Growth Forms owns the field contract; use `references/growth-forms-wordpress.md` for its gates.

### Canvas (`.dc.html`) → static native modules

Agencia Creativa (`scripts/public-website/compile-creativa-elementor-source.cjs`, source
`scripts/public-website/creativa-source/Main.dc.html`) compiles a live canvas into schema-driven widgets;
Agencia de Medios (`compile-medios-elementor-source.cjs`, source `medios-source/Main.dc.html`) is the second
compiler built on the same pattern and HubSpot v2 (`compile-hubspot-v2-elementor-source.cjs`, source
`hubspot-v2-source/`) the third. Expand every dynamic part of the canvas into static, editable markup; do
not ship the canvas runtime:

- Interactive tabs → one repeater whose row has two parts, rendered into `%%repeat_<key>__tab%%` and
  `%%repeat_<key>__panel%%`, with `%%row_first%%` for the initial pressed state. Bounded JS switches them
  (click + arrow keys); CSS hides non-first panels until JS marks `data-ready`.
- Selectors written as conditional branches (`sc-if` on a state variable, e.g. Medios' Commerce/B2B and
  platform pickers) are tabs too: one panel per branch, state carried by `aria-pressed` on the buttons. Do
  not hand-write the pressed look: generate the on/off CSS from the styles the canvas itself applies to the
  selected and unselected button, keyed on `[aria-pressed="true"|"false"]`, so the compiled page keeps the
  canvas' exact selection treatment.
- Marquee duplicates: remove them from the source and let JS recreate them as `aria-hidden` loop copies
  (see Continuous rails).
- Live imports of other canvases (e.g. Creative Studio screens) → screenshots captured locally with
  Playwright in the theme the canvas uses; check that theme in the capture.
- A designed form → Growth Forms host card (`<greenhouse-form>`); the host never draws fields. Map each
  canvas control to the renderer before publishing (`references/growth-forms-wordpress.md`). The renderer
  paints for a light background (`color-scheme="light"`): if the canvas drew the form card on a dark
  section, make the card paper (Medios: `#f7f8f6`, with its own title and the trust line under the form)
  instead of forcing dark tokens into the renderer.
- Images inside an SVG (`<image href>`, e.g. isotypes placed in a diagram) are not found by the regular
  `<img>`/background asset pass. Map them explicitly to the uploaded asset base (Medios: `%%asset_base%%`)
  and check that each one paints on the live page.
- Decorative glyphs marked `aria-hidden` (bullets, dots, arrows drawn as text) are markup, not copy: keep
  them out of the editable controls so the editor exposes only real text.
- An SVG data meter → a server-drawn number field, not an image of a number.
- Repeater rows whose markup differs → explicit layout variants. Name row field labels by role
  (what the field is in every row), never by the first row's copy.
- Name template tokens so they cannot collide with schema field keys. The renderer substitutes a field's value
  into any `%%token%%` of the same name, so a token that matches a field is silently replaced by that field's
  value (HubSpot v2: the dock's Growth CTA slot is `%%meeting_launcher%%` for that reason).

#### Scoping the canvas CSS and the page layer

The compiler scopes the canvas CSS under the landing root (`.gh-hsv2`, `.gh-medios`, …) so nothing leaks to
Ohio or other pages. Two rules keep that scoping honest:

- Rewrite `html`/`body` only as **element selectors**, never as substrings. A loose regex turned `.panel-body`
  into `body` and stripped every panel's padding (HubSpot v2, 2026-10-16). After compiling, grep the output for
  class names that contain `body`/`html` and compare a padded component against the source.
- The scoper also rewrites `body` in the host layer, so a rule that genuinely must reach outside the landing
  (`timeline-scope` on `body`, Ohio's bottom bar, other theme chrome) cannot live there. Keep it in a separate
  page layer (`page.css`) that the compiler appends **without** scoping, and guard every rule with
  `:has(.<root> …)` (for example `body:has(.gh-hsv2 .mdock)`) so it only matches the page that carries the
  landing. Keep that layer minimal and comment why each rule escapes the scope.

## Native editorial revisions

- For Home-specific message, comparison evidence, FAQ emphasis and copy persistence, load
  `references/home-editorial-maintenance.md`. Preserve the distinction between generic craft and
  approved page-instance values.

- Keep approved page-instance overrides separate from source defaults. A copy pass uses registered
  controls and a guarded `Document::save()` patch; it does not rebuild the source export. For a
  source-keyed lookup such as Content Ops, preserve control keys, original types and `sourceValue`.
- Inventory hidden states as well as visible text: tabs, annotations, statuses and copied/email drafts
  must resolve the same edited values. Test the actual clipboard with real paragraph breaks and wait
  for its asynchronous confirmation; visual text alone cannot certify copied output.
- Before adding CSS to balance a text column against a form, consider concise copy at the existing
  type scale. Check both form steps and intermediate width, not only the initial desktop column heights.
  Keep field copy and success copy in the form's governed contract; preserve consent and routing.

## Pinned narrative navigation

- A chapter click must select its destination directly and keep it selected during programmatic scroll.
  Temporarily suppress scroll-to-state synchronization for that travel; after release, ordinary user
  scrolling must resume chapter selection. Test a distant tab through the complete transition, not just
  its immediate `aria-selected` value. Preserve the approved pin duration and background behavior.
- Derive document scroll targets from document coordinates (`getBoundingClientRect().top + scrollY`),
  accounting for the actual header and stage geometry; `offsetTop` is relative to its offset parent.
- Gate pinning by usable viewport height as well as width. Mobile, short viewports, reduced motion and
  JavaScript-off must retain readable chapters in normal flow; do not turn the fallback into blank space.

## Scroll-driven reveals and mobile docks

- A reveal bound to the scroll (`animation-timeline: view()`) must **finish when the element is fully in view**:
  end its range at `entry 70%`–`entry 100%`, never at `cover N%`. A range that ends at `cover 35–60%` keeps
  cards, titles and bars mid-animation (offset, faded) while the visitor is reading them (HubSpot v2,
  2026-10-16). Check a frame with each element fully on screen, not only the entering edge.
- A mobile dock (fixed capsule with the page's exits, e.g. «Agendar reunión» + «Ir al formulario») can be
  shown and hidden by scroll alone: name a `view-timeline` on the hero and one on the destination section,
  hoist both names with `timeline-scope` on `body` (from the page layer, since the hero lives in another
  module), and animate the dock with two ranges: in on the hero's `exit`, out on the destination's `entry`.
  Keep every button ≥ 44 px (48 px in practice), and `display:none` on desktop.
- Without scroll-timeline support (`@supports not (animation-timeline: view())`) the dock stays always visible;
  lift it above the theme's fixed bottom chrome instead of letting them overlap.
- In a hidden browser pane, `getComputedStyle` on a scroll-driven animation can return an old frame
  (`opacity:0`) for an element that paints fine. Force a style recalculation or take a screenshot before
  concluding the dock or a reveal is broken (Performance, 2026-10-17).
- Ohio's bottom bar `.elements-bar.left` (light/dark switch) shares that corner. While the dock shows, move it
  aside with the same timelines from the page layer and bring it back from the destination on; verify both
  are never on screen at the same time at 390 px.
- A Growth CTA can be one of the dock's buttons. Publish it as `embedded` + `minimal`, and in the host CSS,
  scoped to the dock, hide `.ghc-content`/`.ghc-dismiss`, set the card to `display:flex; gap:0` with no
  padding/border/background/shadow, and give `.ghc-primary` the dock button's size and colors
  (`--gh-cta-reserve` = button height). Without surface/key the slot must fall back to a plain link (HubSpot v2:
  `/agenda/`); a slot with neither should collapse (`:not(:has(...)){display:none}`). The CTA keeps its own
  dialog and its conversion is the server receipt (`gh_meeting_*`), never the click. One CTA and one surface
  per landing, published by `scripts/growth/publish-*-meeting-cta.ts` (key 0600 in `.auth/`, passed to the page
  republisher; rerunning it rotates the key): skill `greenhouse-growth-ctas` and
  `docs/manual-de-uso/growth/operar-motor-cta.md` own that contract.

## Composition and Ohio integration

- Native scheme markers govern Ohio chrome. Scope content contrast to the module and expose a heading
  color for dark sections; do not recolor nested accent spans or global H2s to repair one heading.
- Ohio full-width gutter compensation can win against a lower-specificity page rule even when both use
  `!important`. Inspect computed position and the winning selector in the real theme, then target only
  the affected page's owned Elementor containers. Keep inner content gutters and native chrome intact;
  clipping horizontal overflow alone does not correct a shifted section or certify responsive layout.
- Ohio resets `ul` `list-style`; a list the source shows with disc bullets needs a module-scoped
  `list-style` restore. Source display sizes that fit a desktop canvas can overflow phones: give
  display type a mobile clamp and check 390 before publishing.
- Test filled CTA normal, sustained hover, focus and reduced motion. Ohio's `-undash` opts a link out of
  `links-underline`; changing only `background-color` does not remove its animated background image.
  The same `.links-underline a:hover` rule animates a background underline on **every** link, including whole
  cards wrapped in an `<a>`: HubSpot v2's linked cards turned white on hover. Neutralize it in the host layer
  inside the landing scope (background image/size reset on the module's links), never globally, and test
  sustained hover on each linked card type.
- A strikethrough over text that wraps (a "before" value in a comparison) must stay on every line. If the
  struck element is a flex item it becomes a block and the line only crosses its box; wrap the text in an
  inline span and add `box-decoration-break: clone` (with `-webkit-` prefix) so each line fragment gets its own
  decoration. In a comparison that stacks on mobile, put the row label before each row
  (`[role=rowheader]{order:-1}`) so the reader knows what each pair compares.
- Static figures in display type (`+90`, `−56%`) need `white-space: nowrap`; an animated counter built on
  `@property` must land exactly on the source value (HubSpot v2's ended at 89) — check its final frame.
- A glow should fade to transparent within its own box. A tall clipped circular gradient can look like
  a hard green rectangle on tablet; a section-sized ellipse fixes the source of that seam.
- Size a hero mark relative to its orbit/core, keep the same parallax depth, and inspect containment
  at the intermediate width where the graphic shrinks. Desktop-only success is insufficient.
- A sticky FAQ's help/CTA belongs inside its aside. Stack at the appropriate tablet breakpoint and
  disable sticky in short viewports; check after scroll, not only at section entry. A two-column section
  whose title column sits beside a long list (FAQ, diagnostic beside its form) reads best with that title
  column `position: sticky` from 1000 px and stacked below; Medios applies it to both.
- A page created with `wp_insert_post` (not cloned in the editor) inherits Ohio's blog defaults, including
  the sidebar. Copy every `page_*` / `_page_*` meta from a published landing with the right chrome (Medios
  copied 164 from Agencia Creativa `249582`), snapshot the previous values first, then verify header,
  footer and full width live.
- Reuse a CTA composition with a scoped modifier for a compact destination CTA. Remove superseded
  repeater/data controls when intentionally retiring cards; hide optional notices with a native select
  when the operator asks to hide rather than delete. Preserve a recoverable content snapshot.

## Brand marks, media and shared proof

- Prefer official repository SVGs or existing Media assets. Inspect painted artwork: filenames can
  misidentify the visible brand, and landscape thumbnails are not automatically suitable for lightboxes.
- Preserve SVG geometry/provenance. Choose the negative mark on dark surfaces and use native Media
  controls with constrained dimensions and `object-fit:contain`; do not substitute a generic icon.
- Compare inline wordmarks to adjacent text at desktop, tablet and mobile; painted size matters more
  than the image box. Preserve aspect ratio, prevent flex shrink and permit wrapping in narrow table
  headers when needed. Scope the correction to the owning module and verify SSR plus hydration.
- CMS/provider logo groups need official provenance, local assets and editable Media/text controls.
  Name the supported examples without implying partnership, certification or an exclusive platform list.
- A monochrome brand mark that must inherit category/hover ink can use an alpha mask with
  `background-color:currentColor`. An external SVG `<img>` does not inherit the parent's text color;
  test both normal and sustained hover, and do not recolor multicolor marks this way.
- Reuse `EO_Logo_Marquee_Widget::render_marquee()` for trust strips and proof-only avatar groups.
  When replacing initials with logos, migrate hover selectors to the shared semantic avatar classes;
  retain lift/scale/halo/stacking and remove transforms under reduced motion. Verify existing consumers.

## Continuous rails

- Measure one complete original set including its trailing gap as the distance from the first original
  to its corresponding first clone. `translateX(-50%)` is only correct for a compatible track geometry.
- Size copies for viewport plus a full animation period (and gap), independent of the number of source
  items. Rebuild after viewport width changes; remove previous copies first so rerenders do not multiply them.
- Keep copies inert and `aria-hidden`, remove copied IDs, and prepare images near the viewport. In editor
  and reduced motion, keep originals readable with no animation or copies.
- Verify both directions immediately before/after a full loop and at a width greater than one source set.
  Inspect the painted right edge and faded areas, not just total `scrollWidth`. A lazy original offscreen
  can be unloaded while its visible copy is healthy; diagnose visible decoded images, not a global count.

## Optional service destinations

- Discover the published, semantically relevant landing; do not invent routes or link every card to
  a generic contact page. No matching destination means no link.
- Use a native optional URL per repeater row. Default must be an array even when empty. A blank value
  retains a static card; a valid value renders one semantic heading link with a CSS-expanded hit area,
  external/nofollow attributes and visible focus. Do not add JS navigation or duplicate tab stops.
- Verify actual clicks, unsafe-URL rejection, empty rows, filters and responsive layout. A `tabindex`
  or correct anchor in HTML is not proof of a completed keyboard traversal.

## Click-loaded YouTube dialog

- Extend Experience rather than replacing the hero button or creating a parallel modal runtime.
  Native `<dialog>.showModal()` supplies top-layer modality; use a labeled surface, visible 44 px close
  target, responsive 16:9 stage and a real external fallback. Keep decorative chrome restrained.
- URL remains editable as a native URL control. Parse HTTPS with an explicit YouTube host/path allowlist
  and an 11-character ID; reject credentials, arbitrary hosts/ports, malformed IDs and unsafe schemes.
  Build the embed URL from the accepted ID rather than injecting the supplied string as iframe HTML.
- Create one `youtube-nocookie.com` iframe only after a user click, never at initial render or in editor;
  no provider SDK is needed. `autoplay=1` requests playback after that click, not background autoplay.
- Close/cancel/backdrop/unmount removes the iframe (stops sound), restores the captured body scroll
  state and returns focus to a still-connected trigger. Test replacement while open as well as normal close.
- Nocookie is not a promise of zero third-party processing after playback. Keep provider/privacy wording
  honest; do not invent duration, demo status or video content. HTTP/oEmbed availability is not playback proof.
- Parent-document Escape does not prove Escape inside a cross-origin player. Test initial focus, Tab
  into/out of provider controls, Escape there, X/backdrop, fullscreen and focus return separately. If the
  automation cannot advance focus, record the exact gap and keep keyboard certification pending.

## Evidence ladder and recovery

Use `references/elementor-mutation.md` for identity/hash/snapshot/Document::save/metas/readback/cache.
Deploy only manifest-listed runtime files with previous/new hashes and scoped backups, not unrelated WIP.
Keep "create" and "change" as different scripts. A new-page publisher only creates and refuses when the slug
already exists (Medios: `publish-medios-elementor-page.php`); changing that page's body later needs a
republisher that reads the current content hash, refuses if it differs from the expected one, and snapshots
before saving. Never rerun a creator to update a live page.

Release-rail lessons (Performance Marketing, 2026-10-17):

- `pnpm public-website:wpcli` forwards only files (`--input-file`) to the eval as `$args`; there is no
  `-- <arg>` passthrough. Pass a page id as a file, and let each script accept either a numeric id or a path
  to a file that holds it.
- In PHP lines that chain several assignments (`$id = …; $source = …;`), a trailing `//` comment silences
  every assignment after it. It happened on Performance and the «Source identity drift» guard stopped the
  script before any write: keep one assignment per line when annotating, and keep identity guards first.
- If a runtime file you ship (e.g. the widget loader) carries other sessions' uncommitted changes, build the
  package from the working tree only after `diff` proves live == working tree, and commit only your own hunk
  (stage a blob with `git hash-object -w` + `git update-index --cacheinfo`), never the foreign WIP.
- Retiring a legacy URL in the same release (301, chains, menu): `references/taxonomy-permalink-migrations.md`
  §4 (Yoast Premium redirect rail). A `?utm_` that survives the 301 does so through the mu-plugin `efeonce-redirect-query-passthrough`,
  not through Yoast.
- Re-saving a page through `$document->save( [ 'elements' => …, 'settings' => $document->get_settings() ] )` from
  WP-CLI deletes the featured image: the page-settings payload lacks a filled `post_featured_image`, and Elementor
  treats the empty control as «remove thumbnail». `_elementor_data` and the render stay byte-identical, so a hash check
  does not catch it; Yoast then falls back to the first content image, built with `http://` because `plugins_url()` is
  http in CLI. Any republisher must read `_thumbnail_id` first and restore/verify it after `save()` (seen on
  Performance 2026-10-17, restored to `252002`). The visual editor does not do this: it loads the control from the post.

1. PHP renderer and native control-registration tests (including URL defaults and escaping).
2. JS lifecycle tests for mount/replacement/removal, editor/reduced, filter and player cleanup.
3. Real Elementor registration/render probe and semantic CMS readback.
   Pre-live, run the host-swap harness from `references/landing-workflow.md` §7 on the new body; it caught
   Ohio's gutter offset, the `ul` reset, oversized phone type and a wrong screenshot theme on Creativa.
4. Fresh public Browser render, actual clicks/playback, sustained hover, scroll, 1280/890/390 layout,
   reduced motion, overflow and console observations; add wider rail samples when needed.
5. Authenticated Elementor edit/save/reload remains its own gate. Server probes cannot certify that UI.

Current executable anchors: runtime `tests/agency-modules.test.php` and `tests/creativa-modules.test.php`; main-repo
`scripts/public-website/agency-elementor-lifecycle.test.cjs` and
`scripts/public-website/verify-agency-elementor-contract.php`. Counts evolve with schema changes: verify
the current schema, not an old audit's total. Captures with host-emulation scaling need DOM geometry and
an explicit caveat; do not claim a physical 1:1 mobile screenshot or unseen motion from a static frame.
