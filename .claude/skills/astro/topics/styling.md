# Styling

Astro's default is **scoped `<style>`** per component. For a design system, layer
global CSS variables (tokens) under component-scoped styles. Tailwind is a
first-class option via the Vite plugin.

## Scoped styles (default)

A `<style>` in a `.astro` component is scoped by a hashed attribute — no leakage.

```astro
<div class="card">…</div>
<style>
  .card { padding: var(--space-4); border-radius: var(--radius-lg); }
</style>
```

- Scoped by default; add `is:global` to opt a block out (resets, tokens).
- `define:vars` passes server values into styles as CSS custom properties:
  ```astro
  <style define:vars={{ accent: brand.color }}>.bar { background: var(--accent); }</style>
  ```

## Design tokens = CSS custom properties

Put tokens on `:root` in one global stylesheet, imported once (in the layout).
Components consume `var(--token)`. This is how the AXIS brand travels into
efeonce-think — the tokens are **copied** into the Astro repo (not imported from
Greenhouse), then referenced as CSS vars. See `efeonce-overlay.md`.

```css
/* src/styles/tokens.css — imported once in the base layout */
:root {
  --color-navy-900: #0b1b3a;
  --color-teal-400: #2dd4bf;
  --space-4: 1rem;
  --radius-lg: 12px;
}
:root[data-theme='dark'] { /* dark overrides */ }
```

```astro
---
import '../styles/tokens.css'
---
```

## Tailwind v4 (via Vite plugin — NOT the old integration)

Modern Astro uses Tailwind v4 through the Vite plugin. The legacy
`@astrojs/tailwind` integration is deprecated — do not use it.

```bash
npm install tailwindcss @tailwindcss/vite
```

```js
// astro.config.mjs
import tailwind from '@tailwindcss/vite'
export default defineConfig({ vite: { plugins: [tailwind()] } })
```

```css
/* src/styles/global.css */
@import 'tailwindcss';
```

Then import `global.css` once in your base layout. Tailwind v4 config is
CSS-first (`@theme`), not `tailwind.config.js`.

## Global stylesheets & order

Import CSS in a component/layout; Astro bundles and hashes it. Import order
matters for cascade — import tokens/reset before component styles. A single base
`Layout.astro` importing the global sheets is the clean pattern.

## Choosing an approach

| Use | For |
|---|---|
| Scoped `<style>` | Component-local styling — the default |
| CSS vars on `:root` | Design tokens / theming (light/dark) |
| `is:global` | Resets, base element styles, third-party overrides |
| Tailwind v4 | Utility-first velocity; still consumes the same token vars |

Don't mix three styling systems randomly. Pick tokens-as-CSS-vars + scoped
styles, **or** tokens + Tailwind v4, and stay consistent.

## Accessibility & theming

- Theme via `:root[data-theme='dark']` overrides of the same tokens; toggle by
  stamping `data-theme` on the root (works with static + View Transitions).
- Meet WCAG contrast on both themes — compose with `a11y-architect` /
  `typography-design`. Don't hardcode HEX in components; resolve from tokens.

## Hard rules

- **NEVER** use the deprecated `@astrojs/tailwind` integration — use
  `@tailwindcss/vite` (Tailwind v4).
- **NEVER** hardcode brand HEX in a component — reference a token CSS var.
- **NEVER** name a component/decorative class like a Tailwind utility (`.p-4`,
  `.m-2`, `.w-8`, `.gap-1`, `.top-0`…) — it collides with the utility of the same
  name and silently restyles the element (a `.p-8` particle gets `padding: 2rem`).
  Prefix distinctively (`.bk`, `.orbit`, `.dot`). See `reference/gotchas.md`.
- **SIEMPRE** import tokens/reset before component styles (cascade order).
- For efeonce-think, keep AXIS tokens as a copied SoT file and reference vars —
  see `efeonce-overlay.md`.
