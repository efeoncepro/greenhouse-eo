# Elementor Mutation Rail

Use this reference when changing Elementor pages, page-scoped CSS, or Ohio page metas.

## Required Write Path

Normal Elementor mutations must use:

```php
$document = \Elementor\Plugin::$instance->documents->get($post_id);
$document->save([
  'elements' => $elements,
  'settings' => $settings,
]);
```

Do not write `_elementor_data` directly unless doing emergency recovery with explicit approval.

Run PHP through the repo wrapper:

```bash
pnpm public-website:wpcli -- --eval-file ./tmp/<script>.php --wp-user 12
```

## Before Save

Capture:

- post id, title, slug, status;
- `_elementor_data`;
- `_elementor_page_settings`;
- `_thumbnail_id`;
- `get_the_post_thumbnail_url()`;
- `page_header_title_background_type`;
- `page_header_title_background_*`;
- any landing-specific widget hashes;
- relevant Yoast/schema/meta if the change can affect SEO.

## After Save

- Re-check the protected metas and hashes.
- Do not treat missing `wp-content/uploads/elementor/css/post-<id>.css` immediately after save as failure. Elementor may delete generated CSS/cache; render the public page to regenerate.
- Purge Kinsta cache after live mutation.
- Verify in browser at desktop and mobile 390px.

## Structural Rules

- Existing pages mix Elementor `container`, legacy `section`, `column`, and `widget`. Support all shapes.
- Identify nodes by `id`, `elType`, `widgetType`, classes, title/content fingerprint, and parent context. Treat path as diagnostic only.
- Elementor node ids are not DOM anchors. `id`, `data-id`, and `.elementor-element-<id>` identify Elementor internals; a public URL hash target requires the Advanced CSS ID (`_element_id`) and must be verified with `document.getElementById()`.
- Prefer Ohio widgets already common on the site: `ohio_heading`, `ohio_service_table`, `ohio_icon_box`, `ohio_button`, `ohio_counter`, `ohio_clients_logo`, `ohio_badge`, `ohio_testimonial`, `ohio_recent_posts`, `ohio_recent_projects`.
- For full-width backgrounds with balanced inner content, first try native Elementor section controls such as `layout=boxed` + `content_width`.
- Use semantic classes such as `gh-section-*`, `gh-widget-*`, `gh-slot-*`, and landing-specific `gh-<landing>-*`.

## Visual Debug Order

1. Widget type and native controls.
2. Elementor page settings and generated `post-<id>.css`.
3. Ohio page meta and `--clb-*` runtime variables.
4. Browser computed CSS at desktop and mobile 390px.
5. Visual evidence: screenshots, visible bounding boxes, gaps between painted pixels, animation phases, and asset canvases. DOM gap/CSS values alone are not sufficient for logo strips, marquees, carousels, or masked/faded modules.
6. Child theme or page-scoped CSS only when native controls do not own the problem.

Useful Ohio controls to check before CSS:

- `ohio_button`: `title_color`, `button_color`, `border_color`, `title_hover_color`, `button_hover_color`, `border_hover_color`, `border_radius`, `drop_shadow`, `drop_shadow_intensity`.
- Cards/proof modules: `tilt_effect`, `drop_shadow`, `drop_shadow_intensity`, `card_effect`, `bg_color`, `bg_hover_color`, `overlay_color`, `border_color`.
- `ohio_heading`: `heading_color`, `subtitle_color`, `highlighted_color`, `highlighter_color`, `highlighted_animation`.
- Motion-heavy widgets: `ohio_recent_projects`, `ohio_recent_posts`, `ohio_carousel`, `ohio_video`, `ohio_dynamic_text`, `ohio_marquee`, `ohio_vertical_slider`.

Visual guardrails:

- Blue brand should dominate; green/teal is an accent, not a new base theme.
- Keep runtime typography: Inter body, DM Sans headings/buttons.
- Fix hover/active states in widget controls first.
- Motion must be subtle, enterprise-grade, and reduced-motion aware.

## Common Hazards

- `Document::save()` can affect metas outside the edited widget on published Ohio pages. Protect `_thumbnail_id`, especially when `page_header_title_background_type=featured`.
- Elementor/Ohio may repeat ids across containers and widgets. Use semantic classes + text/structure when selecting.
- Elementor data may already be valid JSON. When reading `_elementor_data`, try `json_decode($raw, true)` first and use `wp_unslash()` only as fallback; unconditional unslash can corrupt copied HTML/copy strings.
- Page-level `!important` rules can override correct widget HTML/CSS; verify computed style.
- Elementor post CSS can load after plugin or child-theme CSS. For typography/rhythm fixes, verify computed styles in the browser at desktop and mobile, especially `letter-spacing` on nested spans.
- Absolute Ohio header elements such as inactive wide submenus can create false horizontal `scrollWidth` during visual captures. Identify off-screen offenders before blaming the section under test; scope any guard to the page and preserve hover/focus behavior.
- Marquee/logo bugs are often composition bugs, not keyframe bugs: check set width versus viewport, number of duplicated sets, `translate()` fraction, animation duration, effective item widths, visible asset pixels, internal whitespace in the files, mask/fades, and empty wrappers.
- Do not globally patch `#masthead`, footer, sidebar, or hero layers to hide a section seam.
