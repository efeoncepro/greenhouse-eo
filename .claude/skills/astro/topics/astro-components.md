# `.astro` components

The native component format. Renders on the server (build or request), ships
**zero JS**, and is the default building block. Reach for a framework component
(island) only when you need client interactivity.

## Anatomy

```astro
---
// Component Script — runs on the server. Never ships to the client.
import Card from './Card.astro'
interface Props { title: string; score: number }
const { title, score } = Astro.props
const tone = score >= 70 ? 'good' : score >= 40 ? 'mid' : 'low'
---
<!-- Component Template — HTML + JSX-like expressions -->
<Card>
  <h2>{title}</h2>
  <span class={`score score--${tone}`}>{score}</span>
</Card>

<style>
  /* Scoped to THIS component by default */
  .score { font-variant-numeric: tabular-nums; }
  .score--low { color: var(--color-danger); }
</style>
```

- The `---` fence is the **frontmatter / component script** — server-only.
- Templating is JSX-like but it's HTML: use `class` (not `className`), and native
  HTML attributes.
- `Astro.props` is typed from the `Props` interface.

## Slots

```astro
---
// Layout.astro
---
<header><slot name="header" /></header>
<main><slot /></main>            {/* default slot */}
<footer><slot name="footer">© Efeonce</slot></footer>  {/* fallback content */}
```

```astro
<Layout>
  <h1 slot="header">Título</h1>
  <p>Contenido va al slot por defecto</p>
</Layout>
```

## Key directives on markup

| Directive | Does |
|---|---|
| `class:list={[...]}` | Conditional classes: `class:list={['btn', { active: isActive }]}` |
| `set:html={raw}` | Inject raw HTML (sanitize first — XSS risk) |
| `set:text={value}` | Inject as text (escaped) |
| `is:global` (on `<style>`) | Opt a style block out of scoping |
| `define:vars={{ color }}` | Pass server values into `<style>`/`<script>` as CSS vars |
| `is:inline` (on `<script>`) | Leave a script untouched (not bundled/hoisted) |

```astro
<style define:vars={{ accent: brand.color }}>
  .bar { background: var(--accent); }
</style>
```

## Scoped styles

`<style>` blocks are scoped to the component by a hashed attribute — no leakage,
no BEM gymnastics. Use `is:global` sparingly for genuinely global rules (resets,
tokens). For design tokens, prefer CSS custom properties on `:root` in a global
stylesheet (see `topics/styling.md`).

## Client `<script>` in a `.astro` file

A plain `<script>` is bundled, hoisted, and runs on the client **once** — but
it's not an island (no framework, no props reactivity). Good for tiny vanilla
enhancements (a `<details>` toggle, copy-to-clipboard). For anything stateful,
use a framework island instead.

```astro
<script>
  // bundled + type-checked; runs client-side
  document.querySelectorAll('[data-copy]').forEach((el) => { /* ... */ })
</script>
```

## `.astro` vs framework island — the rule

- Static markup, server data, zero interactivity → **`.astro`** (zero JS).
- Needs state / events / effects on the client → **framework island** with
  `client:*`.
- Don't use a React component to render static markup — that's shipping a runtime
  for nothing.

## Astro 7 strictness

The Rust compiler no longer auto-corrects invalid HTML. Unclosed tags
(`<p>Hello`) and bad nesting (`<p><div>…</div></p>`) now **error** with a
file+line. Fix the markup — this is catching real bugs. `compressHTML` defaults
to `'jsx'`, so whitespace between inline elements is stripped; add explicit
`{' '}` or a literal space if you need it (see `reference/gotchas.md`).
