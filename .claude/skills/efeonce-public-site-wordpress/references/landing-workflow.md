# Public Landing Workflow

Use this reference for any Efeonce public landing page on WordPress/Ohio/Elementor.

## Start from the landing's need

Operator doctrine (2026-10-18): each landing has its own need, and its design pattern is built from that need, never
the other way around. Before choosing sections, order, color, type or interactions, establish:

- **Audience:** who arrives and what they already know.
- **Funnel stage:** discovery, comparison or decision; it sets how much the page explains versus asks.
- **Offer:** what is sold or proposed on this page, and its unit (diagnostic, meeting, audit, quote).
- **Proof available:** the real evidence this landing can show (cases, numbers, partner status, methodology); never
  invent it to fill a slot borrowed from another page.
- **The decision:** the one thing the visitor must decide here, and which conversion answers it.

Derive the composition from those answers, then design it (canvas/Claude Design) for that need.

Existing landings (Inbound, Performance, Medios, Content, HubSpot, Creativa…) are references for **mechanisms and
lessons**, not layouts to copy. Their sections, order, hero, palette, button skins and dialog look belong to each of
them; do not start from one and fill it in, and do not describe any of them as the site's pattern or template.

Reusable mechanisms are optional building blocks; each landing decides whether to use them and skins them its own way:

- Source-led compiler core + gates (`lib/source-led-compiler.cjs`, `verify-source-led-compilers.cjs`,
  `verify-source-led-render.php`): `references/source-led-elementor-patterns.md` §Shared source-led core.
- Scoped release rail (package → deploy → publish → rollback with SHA guards and snapshots): the landing files
  under `references/landings/`.
- Native meeting launcher of the shared base (`<gh-meeting-cta>`): `references/source-led-elementor-patterns.md`.
- Site-wide `EfeonceMention` (`a.axis-mention`, AXIS `efeonce.mention`) for links to Efeonce services: `docs/architecture/public-site/PRIMITIVES.md`.
- Growth Forms / Growth CTA integration: `references/growth-forms-wordpress.md` and skill `greenhouse-growth-ctas`.

## Standard Loop

1. **Identify the surface**
   - Confirm URL, `postId`, slug, title, status, and whether the page is live.
   - Check `references/landing-registry.md` and the landing-specific file under `references/landings/`.
   - If the landing is not registered, create a small operational note before making repeatable changes.

2. **Inspect before editing**
   - Read the applicable canonical docs and current landing file.
   - Inspect Elementor tree: ids, `elType`, `widgetType`, classes, page settings and custom CSS.
   - Inspect Ohio metas and runtime computed styles. Do not infer brand values from Elementor kit defaults alone.
   - For visual work, observe the live page with Playwright/GVC discipline before authoring changes.
   - If the approved source (canvas/Claude Design) contains a form, map every control to the Growth Forms
     renderer **before** approving or implementing it, and tell the operator about any true gap before
     publishing: `references/growth-forms-wordpress.md` §Canvas-designed forms.

3. **Choose the mutation rail**
   - Elementor structure/settings: use `Document::save()`.
   - Page-scoped visual CSS: prefer `_elementor_page_settings.custom_css` when the fix belongs to the page.
   - Runtime plugin/widget code: work in `efeoncepro/efeonce-public-site-runtime` and deploy through the governed rail.
   - Emergency file edits on Kinsta require backup, cache purge, verification, and backport.
   - **Replacing an image or audio that a widget renders from the plugin folder:** the rendered URL must carry
     `?ver=filemtime` (helper `versioned_plugin_asset_url` in the Contacto widgets). Plugin assets ship with a
     one-year `max-age`; a fixed URL keeps serving the old file to every returning visitor even after the CDN
     refreshes (caso `/contacto/` 2026-10-16: «sigue la foto mala»). Purging Kinsta does not clear browsers.
   - **Replacing a media-library image (OG/social):** sideload a NEW attachment with a new filename and repoint
     the Yoast metas; never overwrite the file in place (CDN and social scrapers cache by URL). Snapshot the metas
     first and leave featured-image metas as they were unless the user asks (Contacto keeps `_thumbnail_id` empty).

4. **Protect unrelated surfaces**
   - Do not touch Home unless explicitly requested.
   - Do not revive discarded/trash legacy pages.
   - Do not touch a landing hero unless the user explicitly asks or the requested section is the hero.
   - Preserve landing-specific hashes, featured-image metas, JSON-LD, forms, and CTA destinations.

5. **Backup**
   - Snapshot `_elementor_data`, `_elementor_page_settings`, `_thumbnail_id`, relevant Ohio metas, and any widget hash.
   - For file edits, create a timestamped backup before upload.

6. **Mutate minimally**
   - Use semantic `gh-*` classes for Greenhouse-recognizable modules.
   - Prefer Ohio/Elementor native widgets and controls before custom CSS.
   - For dark or light bands under Ohio's fixed lateral widgets, use Ohio's native section scheme classes on the actual section/root element before styling the widgets directly:
     `clb__dark_section`, `clb__light_section`, or `clb__dark_section_fixed`.
     Ohio's runtime observes those classes and toggles `.dynamic-typo` surfaces such as `.elements-bar`, `.social-bar`, color switcher, search/scroll controls, and header dynamic typography between `light-typo` and `dark-typo`.
     Do not force lateral widget contrast with custom `.elements-bar`, `.social-bar`, `.color-switcher`, header, wrapper, or runtime scroll scripts unless the native mechanism is proven unavailable.
   - For Ohio headers, choose the variant from the first viewport background and verified page metas, not from screenshots: dark hero uses the `header-3` dark overlay contract (`light_variant`, `custom` menu settings, first/root `clb__dark_section`, and `page_header_menu_text_typo` stored as JSON string for first paint); light hero uses the inherit/light-background contract with no dark-section trigger. See `docs/documentation/public-site/wordpress-ohio-elementor-layout.md#playbook-variantes-de-header-ohio`.
   - Do not introduce global selectors for local page rhythm, cards, badges, or hero fixes.
   - For AI-generated visual assets inside widget placeholders, map the asset
     by semantic slot id and keep the placeholder as fallback. Prefer optimized
     WebP covers/frames when the parent component already supplies motion; do
     not default to multiple autoplay videos just because a slot is labelled
     `Reel` or `Historia`.
   - For Home-like sticky editorial lanes, prefer Ohio's native `-sticky-block` pattern over Elementor Pro sticky effects:
     apply `-sticky-block` to the lane/column itself, give that lane viewport height, center the inner content, keep page wrappers `overflow:visible`, and make the lane static on mobile. Do not place sticky only on a small inner node, and do not leave an ancestor such as `.site-content` with `overflow-y:auto`; it becomes the sticky scroll container. Verify active sticky samples and the final stop with Playwright.

7. **Pre-live check, then purge and verify**
   - Before writing a new or rebuilt body live, render it inside the real Ohio page contract: take a live
     page that already has the target contract (e.g. Home `251731`), swap its `.entry-content` for the
     locally rendered modules (Creativa: `php tests/creativa-modules.test.php render` with
     `EO_PLUGIN_URL=file://…`) and capture 1440/390 with Playwright. A local-only render misses theme
     interactions; on Creativa this caught Ohio's `.e-con-full.e-parent` `left:16px` offset, Ohio's `ul`
     reset removing intended bullets, oversized display type on phones and a screenshot in the wrong theme.
   - Purge Kinsta cache after live mutations.
   - Hard-reload or freshly navigate the real URL before the smoke. An already open tab can retain
     the previous custom-element JavaScript bundle even after the server and Kinsta cache changed;
     verify the current bundle/version before attributing behavior to the new runtime.
   - Verify desktop and mobile 390px.
   - Check `scrollWidth == clientWidth` or report exact overflow.
   - For UI/copy changes, inspect computed typography, spacing, overlaps, hover/focus/reduced-motion where relevant.
   - For lazy-loaded media, verify both the long section capture and
     slot-by-slot viewport paint when the screenshot looks blank but the DOM
     reports loaded images.
   - For forms, verify validation states and that no unintended lead/submission is created.

8. **Close**
   - Update only the canonical docs/references whose contract changed.
   - Run the relevant gate(s).
   - Use `greenhouse-documentation-governor` for implementation, incident, rollout, workflow, or skill changes.

## New Landing Intake

When a new landing appears, add an entry to `references/landing-registry.md` and create:

```text
references/landings/<slug>.md
```

Minimum landing file sections:

- URL/postId/status/owner.
- The need it answers (audience, funnel stage, offer, proof, decision) — see §Start from the landing's need.
- Do-not-touch surfaces and retired pages.
- Section map with root ids/classes.
- Special widgets/assets/forms.
- Hero/featured-image/hash guardrails.
- Required verification commands.
- Known rollback path.

Keep landing files factual and compact. Put detailed narrative in `docs/documentation/public-site/`.
