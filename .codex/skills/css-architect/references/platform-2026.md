# Referencia — features de plataforma 2025-2026

⚠️ **Ésta es la página más volátil de la skill.** Varias features son Chrome-only o "expected", y los
artículos de "lo nuevo de CSS" **sobre-reportan Chrome**. La columna de estado tiene fecha de
verificación (2026-07-27); si vas a comprometerte con una en producción, **reverifica los tres motores
y los targets reales del repo**. Ver `../SOURCES.md`.

Ordenadas por qué tan seguro es usarlas hoy.

---

## Nivel 1 — interop, usables sin fallback

### `@starting-style` + `transition-behavior: allow-discrete`

**Baseline 2026.** Anima la entrada desde `display: none` sin timers ni doble rAF.

```css
.popover {
  opacity: 1;
  transition: opacity 200ms, display 200ms allow-discrete;
}
@starting-style {
  .popover:popover-open { opacity: 0; }
}
```

Reemplaza el patrón de "montar con `display:block`, esperar un frame, agregar la clase". Es el
mecanismo canónico para transiciones de popover, dialog y cualquier elemento que aparece.
La duración y la curva las decide `motion-design`.

### `text-wrap: balance` / `pretty`

`balance` para títulos cortos (el navegador limita cuántas líneas balancea, típicamente ~6);
`pretty` para párrafos (evita huérfanas). No son intercambiables: `balance` en un párrafo largo no
hace nada.

### `text-box: trim-both cap alphabetic`

Recorta el espacio invisible de las métricas de fuente. Es el centrado óptico que se hacía con
márgenes negativos a ojo. Chrome 133, Safari 18.2 — el más maduro de los "nuevos".
Decisión tipográfica: `typography-design`.

### `stretch` como valor de tamaño

`width: stretch` / `height: stretch` — llena el bloque contenedor. Baseline 2025. Reemplaza los trucos
de `width: -webkit-fill-available`.

### Unidades `rcap`, `rch`, `rex`, `ric`

Como `cap`/`ch`/`ex`/`ic` pero **relativas a la raíz**. Precisión tipográfica sin arrastrar el
tamaño de fuente del contexto.

### `field-sizing: content`

```css
textarea { field-sizing: content; max-block-size: 12rem; }
```

Autosize nativo de `textarea` e inputs. Borra una librería o un `useEffect` que medía `scrollHeight`.
**Pon siempre un `max-*`**, o crece sin límite.

---

## Nivel 2 — interop reciente, verifica targets

### Container queries solo por nombre

```css
@container sidebar { .card { grid-auto-flow: column; } }
```

Sin condición de tamaño. Chrome 149, Safari 26.4, Firefox 148.

### `@scope`

Chrome 134, Firefox en desarrollo a 2026-07. Ver `cascade-scope-layers.md`.

### `shape()`

```css
clip-path: shape(from 0% 0%, line to 100% 0%, curve to 100% 100% with 50% 50%);
```

Geometría responsiva con unidades dinámicas (`rem`, `calc()`) — lo que `path()` nunca permitió porque
solo aceptaba coordenadas absolutas. Chrome 137; `shape-outside` con `xywh()`/`rect()` llegó a interop
(Chrome 150, Safari 18, Firefox 149).

### `sibling-index()` / `sibling-count()`

```css
.item { transition-delay: calc(sibling-index() * 40ms); }
```

Escalonado sin escribir el índice en el DOM ni pasar `--i` por style inline. Chrome 136.
La coreografía es de `motion-design`; el mecanismo es éste.

### Relative color syntax + `contrast-color()`

Ver `color-and-theming.md`. Relative color llegó a Baseline 2026; `contrast-color()` va más atrás
(Firefox 146, Safari 26).

### Cross-document view transitions

```css
@view-transition { navigation: auto; }
```

Transiciones entre navegaciones completas (MPA), sin SPA. Chrome 134, Safari 18.2.
Complementos: `view-transition-class`, tipos, y `view-transition-group: nearest` (Chrome 136) para
conservar 3D y clipping en grupos anidados.

⚠️ **En Next.js App Router**, `useId` cambió su prefijo en React 19.2 (`:r:` → `_r_`) justamente por
compatibilidad con view transitions — los `:` rompían selectores. Si ves IDs raros en un selector, es
esto.

### `reading-flow`

```css
.grid { display: grid; reading-flow: grid-rows; }
```

Corrige el orden de tabulación y de lector de pantalla en flex/grid cuando el orden visual difiere del
orden del DOM. Chrome 137.

☠️ **Esto cambia el orden de foco.** No es una decisión de layout: es una decisión de accesibilidad.
**Cualquier uso pasa por `a11y-architect`.** Y ojo con el orden de causalidad: si necesitas
`reading-flow`, primero pregúntate si el DOM debería estar en otro orden.

---

## Nivel 3 — Chrome-only o en camino. No comprometerse todavía.

| Feature | Estado 2026-07 | Qué promete |
|---|---|---|
| **`if()`** | Chrome 137 | condicionales en valores: `if(media(...): a; else: b)` |
| **`@function`** | Chrome 137 | funciones propias: `@function --name(args) { @return … }` |
| **`@mixin` + `@apply`** | Chrome 146 esperado | bloques reutilizables de declaraciones |
| **`corner-shape`** | Chrome 142 | `round`, `bevel`, `notch`, `scoop`, `squircle` — más allá de `border-radius` |
| **Gap decorations** | Chrome 147 esperado | líneas en los gaps de grid/flex, en ambos ejes |
| **`attr()` tipado** | Chrome 133 | leer atributos como color/length/number, no solo string |
| **`popover=hint`** | Chrome 135 | popovers efímeros que no cierran a los demás (tooltips) |

**Cómo tratarlas:** son excelentes para prototipos, demos internas y superficies con un solo target de
navegador. En producción multi-navegador, o hay fallback o no van. Y si alguien te dice "esto ya es
estándar" citando un artículo, mira la fecha y los tres motores.

`@function` y `@mixin` en particular tientan a reconstruir Sass en CSS nativo. Antes de eso,
pregúntate si el problema no lo resuelve mejor una custom property o una capa.

---

## Lo que estas features borran

Inventario de dependencias que dejan de ser necesarias. Útil al auditar un repo:

| Si el repo tiene… | Hoy es… |
|---|---|
| Floating UI / Popper / tippy | anchor positioning + `popover` |
| ResizeObserver para layout de componente | container queries |
| IntersectionObserver para saber si un sticky pegó | scroll-state container queries |
| librería de animación solo para entradas/salidas | `@starting-style` + `allow-discrete` |
| JS que calcula color de texto por luminancia | `contrast-color()` |
| generador de paleta en build | relative color syntax |
| autosize de textarea | `field-sizing: content` |
| índice en el DOM para escalonar animaciones | `sibling-index()` |
| polyfill de transición entre páginas | cross-document view transitions |
| `z-index` en escalada para modales | top layer (`<dialog>` / `popover`) |

Cada fila es una dependencia menos, un bug menos y menos JS en el bundle. **Pero** cada una tiene una
fila de soporte en la tabla de arriba: verifica antes de prometer el borrado.
