# Referencia — layout, contención y contextos

Fundamentos estables. El soporte de container queries avanzadas y anchor positioning tiene fecha: ver
`../SOURCES.md`.

---

## Container queries — el componente responde a su región

```css
.sidebar { container-name: sidebar; container-type: inline-size; }

.card { display: grid; gap: 1rem; }
@container sidebar (inline-size > 30rem) {
  .card { grid-auto-flow: column; }
}
```

### Los cuatro tipos

| `container-type` | Qué permite consultar | Costo |
|---|---|---|
| `inline-size` | ancho (lo habitual) | contención de tamaño en un eje |
| `size` | ancho **y alto** | requiere alto definido; más restrictivo |
| `normal` | solo **style queries** y `scroll-state` | sin contención de tamaño |
| `scroll-state` | `stuck`, `snapped`, `scrollable` | — |

⚠️ **`container-type: inline-size` aplica contención**: el contenedor deja de dimensionarse por su
contenido en ese eje. Es la causa #1 de "puse container-type y se rompió el layout".

### Solo por nombre, sin condición (2026)

```css
@container sidebar { .card { grid-auto-flow: column; } }
```

Interop confirmado: Chrome 149, Safari 26.4, Firefox 148. Útil para "estoy dentro de X" sin importar
el tamaño. **Verificá contra los targets del repo antes de usarlo sin fallback.**

### Style queries

```css
.panel { container-name: panel; }
@container panel style(--density: compact) {
  .row { padding-block: 0.25rem; }
}
```

Permiten que un contenedor propague **intención** (densidad, tono, variante) sin que cada hijo lea una
clase. Va más atrás en soporte que las de tamaño.

### Scroll-state

```css
.header { container-type: scroll-state; position: sticky; top: 0; }
@container scroll-state(stuck: top) {
  .header__shadow { opacity: 1; }
}
```

Reemplaza el patrón de `IntersectionObserver` + clase para saber si un sticky está pegado. También
`snapped: x|y|block|inline` y `scrollable: top|bottom|…`.

### Unidades

`cqw`, `cqh`, `cqi` (inline), `cqb` (block), `cqmin`, `cqmax`. Las de bloque necesitan un container de
tipo `size`; en Tailwind v4.3 eso lo habilita `@container-size`.

**Regla:** un componente reutilizable **nunca** decide su layout interno con un breakpoint de viewport.
El viewport describe la pantalla; el componente vive en una región.

---

## Anchor positioning — tethering sin JS

Reemplaza el trabajo entero de Floating UI / Popper.

```css
.trigger { anchor-name: --menu-trigger; }

.menu {
  position: fixed;
  position-anchor: --menu-trigger;
  position-area: block-end span-inline-start;   /* colocación declarativa */
  margin-block-start: 0.5rem;

  /* fallbacks cuando no entra en el viewport */
  position-try-fallbacks: flip-block, flip-inline;
}
```

Piezas:

- **`anchor-name`** en el ancla, **`position-anchor`** en el posicionado.
- **`anchor()`** para cálculo fino: `top: anchor(bottom)`, `left: anchor(start)`.
- **`position-area`** para la colocación en la grilla implícita 3×3 alrededor del ancla.
- **`position-try-fallbacks` / `@position-try`** para reintentos cuando no cabe.
- **`anchor-size()`** para dimensionar en función del ancla (menú del ancho del trigger).

**Combina con el top layer.** El caso completo es `popover` + anchor positioning: el popover sale del
apilamiento (adiós `z-index`) y el anchor lo posiciona (adiós JS). El elemento y su comportamiento son
de `html-react-engineer`; el posicionamiento es de acá.

**Anchored container queries:** se puede consultar si el contenedor está anclado y qué fallback de
`position-try` se aplicó — útil para cambiar el estilo de la flecha de un tooltip según el lado en el
que terminó.

Soporte: estable en Chrome 130+, Safari 18+, Firefox 130+ (verificado 2026-07; los fallbacks avanzados
van un poco atrás).

---

## Grid y subgrid

**Subgrid** resuelve el problema real: alinear elementos **entre** tarjetas hermanas.

```css
.cards { display: grid; grid-template-columns: repeat(3, 1fr); }
.card  { display: grid; grid-template-rows: subgrid; grid-row: span 3; }
```

Ahora los títulos, cuerpos y footers de las tres cards se alinean entre sí, aunque el contenido tenga
alturas distintas. Sin subgrid esto requería alturas fijas o JS.

Otros patrones que valen:

```css
/* columnas que se adaptan sin media queries */
grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));

/* el min() evita el desborde en pantallas angostas — auto-fit solo se rompe ahí */
```

- **Grid con áreas nombradas** documenta el layout mejor que cualquier comentario.
- **`place-content` / `place-items`** para centrar sin trucos.
- **`gap`** funciona en flex, grid y columns. **Nunca** márgenes para separar hermanos en un contenedor
  moderno.
- **Gap decorations** (líneas en los gaps, tipo `column-rule` en ambos ejes) están en camino —
  Chrome 147 esperado. No las uses todavía sin verificar.

---

## Contextos que cambian lo posible

Cuatro contextos distintos, se confunden entre sí constantemente:

| Contexto | Lo crea | Qué determina |
|---|---|---|
| **Stacking context** | `z-index`+`position`, `opacity<1`, `transform`, `filter`, `will-change`, `isolation`, `contain`, top layer | quién se dibuja encima |
| **Containing block** | `position: relative/absolute/fixed`, y **cualquier `transform`/`filter`/`perspective`** para descendientes `fixed` | respecto de qué se posiciona un absoluto |
| **Formatting context** (BFC) | `display: flow-root`, `flex`, `grid`, `overflow != visible`, `contain` | colapso de márgenes, floats |
| **Containment** | `contain`, `content-visibility`, `container-type` | qué puede el navegador saltarse |

☠️ **La trampa más cara:** un `transform` en un ancestro hace que un descendiente `position: fixed` se
posicione **respecto de ese ancestro**, no del viewport. Un modal "fixed" que aparece en el lugar
equivocado casi siempre es esto — típicamente un `transform` de animación en un wrapper.

---

## Contención y performance

```css
.card { content-visibility: auto; contain-intrinsic-size: auto 220px; }
```

`content-visibility: auto` hace que el navegador se salte el render de lo que está fuera de pantalla.
**`contain-intrinsic-size` no es opcional**: sin él, el scrollbar salta porque el navegador asume
altura 0.

`contain: layout | paint | size | style | strict | content` — cada valor promete algo distinto. `size`
es el más peligroso: promete que el tamaño no depende del contenido, y si mentís, el elemento colapsa.

`will-change` es una herramienta **puntual**: puesto de forma permanente crea capas de composición que
consumen memoria. Ponelo justo antes de animar y sacalo después, o no lo pongas.

> Medir es de `web-perf-design`. Acá está el mecanismo; el presupuesto es de ella.

---

## Sticky que no pega

Checklist, en orden:

1. ¿Tiene un valor de `top`/`bottom`/`inset-block-start`? Sin eso, `sticky` no hace nada.
2. ¿Algún **ancestro** tiene `overflow: hidden|auto|scroll`? Sticky se pega dentro del ancestro
   scrolleable más cercano; si ese ancestro no scrollea, nunca se pega.
3. ¿El padre tiene altura suficiente para que haya recorrido?
4. ¿Está en un contenedor flex/grid donde el `align-items: stretch` le da la altura completa? Entonces
   no tiene espacio para moverse.

---

## Overflow y scroll

- **`overflow-x: auto` con contenido ancho** es la forma correcta de contener tablas, diagramas y
  bloques de código. **El body de la página nunca debe scrollear horizontalmente.**
- **`overscroll-behavior: contain`** evita el scroll chaining (que el scroll de un panel siga en la
  página al llegar al final). Obligatorio en drawers, modales y listas internas.
- **`scroll-margin` / `scroll-padding`** para que los anclas no queden bajo un header sticky.
- **`scrollbar-gutter: stable`** evita el salto de layout al aparecer el scrollbar. En Tailwind v4.3
  hay utilidad para esto.
- **`text-wrap: balance`** para títulos cortos (el navegador limita el número de líneas que balancea),
  **`text-wrap: pretty`** para párrafos (evita huérfanas). No los intercambies.
