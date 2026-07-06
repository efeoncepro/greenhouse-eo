# Public Landing Workflow

Use this reference for any Efeonce public landing page on WordPress/Ohio/Elementor.

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

3. **Choose the mutation rail**
   - Elementor structure/settings: use `Document::save()`.
   - Page-scoped visual CSS: prefer `_elementor_page_settings.custom_css` when the fix belongs to the page.
   - Runtime plugin/widget code: work in `efeoncepro/efeonce-public-site-runtime` and deploy through the governed rail.
   - Emergency file edits on Kinsta require backup, cache purge, verification, and backport.

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
   - Do not introduce global selectors for local page rhythm, cards, badges, or hero fixes.

7. **Purge and verify**
   - Purge Kinsta cache after live mutations.
   - Verify desktop and mobile 390px.
   - Check `scrollWidth == clientWidth` or report exact overflow.
   - For UI/copy changes, inspect computed typography, spacing, overlaps, hover/focus/reduced-motion where relevant.
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
- Do-not-touch surfaces and retired pages.
- Section map with root ids/classes.
- Special widgets/assets/forms.
- Hero/featured-image/hash guardrails.
- Required verification commands.
- Known rollback path.

Keep landing files factual and compact. Put detailed narrative in `docs/documentation/public-site/`.
