# Directives reference

Every Astro template directive, grouped. See `topics/islands-hydration.md` for
the hydration decision logic and `topics/view-transitions.md` for transitions.

## Client (hydration) — on framework components

| Directive | Hydrates when |
|---|---|
| `client:load` | Immediately on page load (above-fold / critical) |
| `client:idle` | On `requestIdleCallback`; `client:idle={{timeout: 500}}` to bound |
| `client:visible` | On `IntersectionObserver`; `client:visible={{rootMargin: '200px'}}` to pre-warm |
| `client:media="(query)"` | When the media query matches |
| `client:only="react"` | Client-only, never SSR'd (must name the framework) |

## Server islands

| Directive | Effect |
|---|---|
| `server:defer` | Defer this component to a separate per-request fetch; use a `slot="fallback"` for the placeholder |

## Template value directives — on any element

| Directive | Effect |
|---|---|
| `set:html={value}` | Inject raw HTML (sanitize — XSS) |
| `set:text={value}` | Inject escaped text |
| `class:list={[...]}` | Conditional class list: `['a', { b: cond }]` |
| `define:vars={{ k }}` | Expose server values to `<style>`/`<script>` as CSS vars |

## `is:` directives

| Directive | On | Effect |
|---|---|---|
| `is:global` | `<style>` | Opt the block out of scoping |
| `is:inline` | `<script>`/`<style>` | Leave untouched (not bundled/hoisted/processed) |
| `is:raw` | element | Treat children as raw text (no expression parsing) |

## Transition directives (with `<ClientRouter />`)

| Directive | Effect |
|---|---|
| `transition:name="x"` | Shared-element morph target across pages (same name both sides) |
| `transition:animate="fade\|slide\|none\|<custom>"` | Animation for the element |
| `transition:persist` | Keep the element's DOM/state across navigation |

## Prefetch attribute (not a directive, but adjacent)

| Attribute | Effect |
|---|---|
| `data-astro-prefetch` | Prefetch this link; value `hover\|tap\|viewport\|load` overrides default |
| `data-astro-reload` | Force a full page reload for this link (bypass ClientRouter) |

## Quick reminders

- `class` not `className`; `for` not `htmlFor` — it's HTML, not React.
- `client:only` **must** name the framework: `client:only="react"`.
- `set:html` is the XSS surface — sanitize untrusted input.
