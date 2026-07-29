# SOURCES — css-architect

> **Regla:** los **fundamentos** de CSS (cascada, especificidad, herencia, contextos) no se
> reverifican: son estables desde hace décadas. Lo que **sí** rota es el **soporte de features
> nuevas**. Si vas a afirmar "esto ya se puede usar" o "esto todavía no", y la fila tiene más de ~3
> meses, reverifica y actualiza el `as-of`.
>
> **Última revisión completa: 2026-07-27.**

## Tabla de volatilidad

| Tema | Volatilidad | Reverificar antes de afirmar… | Dónde vive |
|---|---|---|---|
| Cascada, especificidad, herencia, `!important`, contextos de apilamiento | **estable** | — | `references/cascade-scope-layers.md` |
| `@layer`, `:where()`, `:is()`, `:has()`, nesting | **estable** (interop desde 2023-24) | — | idem |
| `@scope` | **semestral** | soporte en Firefox | idem |
| Container queries (size / style / scroll-state) | **semestral** | style queries y scroll-state, que van más atrás que size | `references/layout-and-containment.md` |
| Anchor positioning | **trimestral** | soporte real y `position-try` | idem |
| Color moderno (OKLCH, `color-mix`, `light-dark`, `contrast-color`, relative color) | **trimestral** | `contrast-color()` y relative color, los más nuevos | `references/color-and-theming.md` |
| `if()`, `@function`, `@mixin`, `corner-shape`, `shape()`, gap decorations | **volátil (mensual)** | **todo** — varias son Chrome-only o "expected" | `references/platform-2026.md` |
| View transitions (mismo doc / cross-document) | **semestral** | cross-document y `view-transition-class`/types | idem |
| Política del repo (qué está permitido en greenhouse-eo) | **por task** | el overlay del repo desactiva features globales | overlay |

## Fuentes

| Fuente | Qué se tomó | Verified |
|---|---|---|
| [nerdy.dev — CSS Recently In All Browsers](https://nerdy.dev/CSS-recently-in-all-browsers) (**art. 2026-04-26**) | interop confirmado de: anchor positioning; `@scope` (incl. "donut"); **container queries solo por nombre, sin condición de tamaño** (Chrome 149, Safari 26.4, Firefox 148); `shape()`; `shape-outside` con `xywh()`/`rect()` (Chrome 150, Safari 18, Firefox 149); `view-transition-class` y types; unidades `rcap`/`rch`/`rex`/`ric` | 2026-07-27 |
| [modern-css.com — What's New](https://modern-css.com/whats-new/) | catálogo con estado por navegador: `@mixin`/`@apply` (Chrome 146 esperado), cross-document VT (Chrome 134, Safari 18.2), gap decorations (Chrome 147 esperado), `reading-flow` (Chrome 137), relative color interop (**Baseline 2026**), `contrast-color()` (Firefox 146, Safari 26), `@scope` (Chrome 134), customizable select `appearance: base-select` (Chrome 134), invoker commands (Chrome 135), scroll-state CQ (Chrome 133), `sibling-index()`/`sibling-count()` (Chrome 136), `text-box` (Chrome 133, Safari 18.2), `if()` (Chrome 137), `@function` (Chrome 137), `attr()` tipado (Chrome 133), `shape()` (Chrome 137), `stretch` (Baseline 2025), `corner-shape` (Chrome 142), `popover=hint` (Chrome 135), `@starting-style` (**Baseline 2026**), `view-transition-group: nearest` (Chrome 136) | 2026-07-27 |
| [MDN — Anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning) · [`position-anchor`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-anchor) · [Anchored container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning/Anchored_container_queries) | mecánica de `anchor-name` / `position-anchor` / `anchor()` / `position-area` / `position-try`; consultar si el contenedor está anclado y con qué fallback | 2026-07-27 |
| [MDN — Container size and style queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_size_and_style_queries) | `container-type`, `container-name`, style queries | 2026-07-27 |
| [Baseline 2026 — resumen](https://www.buildmvpfast.com/blog/web-platform-baseline-2026-new-features-browser-support) · [Modern CSS 2026](https://www.alexcloudstar.com/blog/modern-css-2026-features/) | anchor positioning estable en Chrome 130+/Safari 18+/Firefox 130+; container queries widely available desde 2023; encuadre "CSS state-aware / context-aware" | 2026-07-27 |
| [CSS Wrapped 2025 (Chrome)](https://chrome.dev/css-wrapped-2025/) | contexto de qué entró en 2025 | 2026-07-27 |

⚠️ **Sesgo a corregir en las fuentes secundarias:** los artículos de "lo nuevo de CSS" **sobre-reportan
Chrome**. Varias filas de arriba son Chrome-only o "expected". Antes de usar una feature en producción,
verifica **los tres motores** y los targets reales del repo. `if()`, `@function`, `@mixin`,
`corner-shape` y gap decorations están en esa categoría a 2026-07.

## Política del ecosistema (runtime > doc)

El overlay de `modern-ui` en `greenhouse-eo` **desactiva explícitamente** recomendaciones globales:
OKLCH, `color-mix()` y P3 no aplican dentro del portal, porque el color sale del theme MUI/AXIS. Eso
**no invalida** esta skill: aplica a Globe, a los sitios Astro y a cualquier superficie fuera del
portal. **Antes de recomendar color moderno, mira en qué repo estás.**

## Mitos que NO se citan

- **"`@layer` es lo mismo que `!important` ordenado."** No: `!important` **invierte** el orden de capas.
  Un `!important` en una capa temprana gana a un `!important` de una tardía. Ver
  `references/cascade-scope-layers.md`.
- **"Los IDs no se usan nunca."** El problema del ID no es el ID: es su especificidad (1,0,0). Como
  hook de JS o ancla de `commandfor` es correcto; como selector de estilo casi nunca.
- **"CSS-in-JS es más lento por definición."** Depende de si extrae en build o inyecta en runtime. Si
  vas a argumentar performance, mide en el repo.
- **"`:has()` es caro."** Fue cierto en las primeras implementaciones. Hoy está optimizado; si
  sospechas, mide antes de evitarlo por reputación.
- **"Hay que usar `will-change` para que sea fluido."** `will-change` permanente crea capas de
  composición que consumen memoria. Es una herramienta puntual, no un adorno.
