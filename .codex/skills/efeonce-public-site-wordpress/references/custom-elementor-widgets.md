# Custom Elementor Widgets

Use this reference when adding or changing custom widgets for the public WordPress site.

## Plugin Container

Canonical plugin:

```text
efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets
```

Do not create a new plugin for each widget. Add:

- a widget class under `includes/widgets/`;
- one entry to `EO_Widgets_Loader::$widgets`;
- per-widget assets through `get_style_depends()` / `get_script_depends()` when assets are local;
- schema/data markers when the widget is governed by Greenhouse manifests.

The shared Elementor category is `Greenhouse`.

## Public-Site Primitives Registry

Reusable public-site modules are canonized in:

```text
docs/architecture/public-site/PRIMITIVES.md
```

Use that registry before creating page-local Elementor HTML/CSS for a repeated pattern. It is the public-site counterpart to the private Greenhouse UI Platform primitives; do not treat `docs/architecture/ui-platform/PRIMITIVES.md` or `src/components/greenhouse/primitives/**` as the runtime source for WordPress components.

The current registry includes `ComparisonTable`, `GrowthFormEmbed`, `LogoMarquee`, and the `BrandProofAvatarGroup` pattern. `BrandProofAvatarGroup` now has two consumers (AEO `/aeo-2/` and About `/about-us-efeonce/` hero). If it is reused again or needs editor controls, graduate it to a widget or governed `LogoMarquee` option and update the registry.

## Widget Types

### Server-rendered semantic widget

Example: `greenhouse_comparison_table`.

The widget owns the markup, styles, accessibility, responsive behavior, and optional microinteractions.

Use this for durable, reusable public-site modules that Ohio/Elementor native widgets cannot express safely.

### Host adapter widget

Example: `greenhouse_growth_form`.

The widget only emits a host element and loads a governed external renderer. The real contract lives in Greenhouse.

Use this when WordPress is only the shell and must not own fields, validations, or destinations.

## Deployment Rail

For plugin code:

- edit in the runtime repo;
- lint/check PHP/JS before upload;
- deploy through the governed rail or documented emergency `scp` path;
- reset OPcache when needed;
- purge Kinsta cache;
- verify regression pages that use existing widgets.

## Guardrails

- Scope CSS under a widget root marker, not bare utility class names.
- Use semantic HTML and accessible names for icons/graphics.
- Guard motion with `prefers-reduced-motion`.
- Avoid table-row/cell transforms; animate child spans/icons instead.
- Use `filemtime()` or another cache-busting version for local widget assets.
- If a widget exposes agent-governed settings, define a single `theme_schema()`/manifest contract and keep Greenhouse schema in parity.
