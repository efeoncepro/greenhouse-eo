# Source-led Elementor patterns

Load for Claude Design ports and later visual iterations of modular public pages. These are reusable
lessons, not a live-state ledger. Architecture: `docs/architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md`;
primitive ownership: `docs/architecture/public-site/PRIMITIVES.md`. Dated Home evidence, hashes and rollback
belong in `references/landings/home-claude-design-preview.md` and the linked audit.

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

## Composition and Ohio integration

- Native scheme markers govern Ohio chrome. Scope content contrast to the module and expose a heading
  color for dark sections; do not recolor nested accent spans or global H2s to repair one heading.
- Test filled CTA normal, sustained hover, focus and reduced motion. Ohio's `-undash` opts a link out of
  `links-underline`; changing only `background-color` does not remove its animated background image.
- A glow should fade to transparent within its own box. A tall clipped circular gradient can look like
  a hard green rectangle on tablet; a section-sized ellipse fixes the source of that seam.
- Size a hero mark relative to its orbit/core, keep the same parallax depth, and inspect containment
  at the intermediate width where the graphic shrinks. Desktop-only success is insufficient.
- A sticky FAQ's help/CTA belongs inside its aside. Stack at the appropriate tablet breakpoint and
  disable sticky in short viewports; check after scroll, not only at section entry.
- Reuse a CTA composition with a scoped modifier for a compact destination CTA. Remove superseded
  repeater/data controls when intentionally retiring cards; hide optional notices with a native select
  when the operator asks to hide rather than delete. Preserve a recoverable content snapshot.

## Brand marks, media and shared proof

- Prefer official repository SVGs or existing Media assets. Inspect painted artwork: filenames can
  misidentify the visible brand, and landscape thumbnails are not automatically suitable for lightboxes.
- Preserve SVG geometry/provenance. Choose the negative mark on dark surfaces and use native Media
  controls with constrained dimensions and `object-fit:contain`; do not substitute a generic icon.
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

1. PHP renderer and native control-registration tests (including URL defaults and escaping).
2. JS lifecycle tests for mount/replacement/removal, editor/reduced, filter and player cleanup.
3. Real Elementor registration/render probe and semantic CMS readback.
4. Fresh public Browser render, actual clicks/playback, sustained hover, scroll, 1280/890/390 layout,
   reduced motion, overflow and console observations; add wider rail samples when needed.
5. Authenticated Elementor edit/save/reload remains its own gate. Server probes cannot certify that UI.

Current executable anchors: runtime `tests/agency-modules.test.php`; main-repo
`scripts/public-website/agency-elementor-lifecycle.test.cjs` and
`scripts/public-website/verify-agency-elementor-contract.php`. Counts evolve with schema changes: verify
the current schema, not an old audit's total. Captures with host-emulation scaling need DOM geometry and
an explicit caveat; do not claim a physical 1:1 mobile screenshot or unseen motion from a static frame.
