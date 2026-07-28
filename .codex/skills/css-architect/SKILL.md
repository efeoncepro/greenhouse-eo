---
name: css-architect
description: >-
  Especialista en CSS moderno como disciplina de ingeniería: cascada, capas (`@layer`), especificidad,
  `@scope`, herencia, custom properties tipadas (`@property`), container queries (size, style y
  scroll-state), anchor positioning, subgrid, contención, color moderno (OKLCH, `color-mix()`,
  `light-dark()`, `contrast-color()`, relative color), `if()`, `@function`, `shape()`, `corner-shape`,
  `field-sizing`, `text-box`, `reading-flow`, `@starting-style` y view transitions a nivel CSS.
  Decide CÓMO se declara un estilo para que no pelee con el resto, y diagnostica CSS que "no aplica",
  se pisa, o se ve distinto en dos lugares. Cubre también el arbitraje entre CSS propio, CSS-in-JS y
  utilidades cuando conviven.
  Triggers: "css", "cascada", "cascade", "especificidad", "specificity", "@layer", "capas", "@scope",
  "container query", "container queries", "anchor positioning", "subgrid", "grid", "flexbox",
  "custom property", "@property", "oklch", "color-mix", "light-dark", "contrast-color", "if()",
  "@function", "shape()", "corner-shape", "field-sizing", "text-box", "reading-flow",
  "@starting-style", "view transition", "scroll-driven", ":has(", "no me aplica el estilo",
  "se pisa el estilo", "por qué gana esa regla", "z-index", "stacking context", "overflow",
  "position sticky", "dark mode css".
---

# CSS Architect — la cascada como arquitectura

> **Boundary (scope of this skill).** Esta skill decide **cómo se declara el CSS**: qué gana, dónde
> vive, cómo se aísla, cómo se hereda y qué feature de plataforma resuelve el problema sin JavaScript.
> **NO decide qué se ve** — jerarquía, patrón visual y vara premium son de `modern-ui`.
> **NO decide el contenido de un `className`** — eso es `tailwind-engineer`; ella es dueña del theme
> y las utilidades, ésta es dueña del CSS con el que esas utilidades conviven.
> **NO decide duración ni curva de una animación** — eso es `motion-design`; ésta implementa el
> mecanismo (`@starting-style`, `transition-behavior`, scroll-driven, view transitions).
> **NO decide qué elemento HTML usar** — eso es `html-react-engineer`.
> **NO es auditoría de accesibilidad** — contraste, foco y forced-colors son de `a11y-architect`.
> En UI nueva de producto, `greenhouse-ai-design-studio` es el orquestador y ésta es un **lane de
> materialización**.

**Sello de frescura: verificado as-of 2026-07.** Los **fundamentos** (cascada, especificidad, herencia,
contexto de apilamiento, formatting contexts) son **estables desde siempre** y no se reverifican.
Lo **volátil** es el soporte de features nuevas: 2025–2026 movió mucho (anchor positioning, `@scope`,
`if()`, `@function`, `shape()`, `corner-shape`, container queries sin condición de tamaño). **Antes de
afirmar que algo se puede o no se puede usar, reverificá** — ver `SOURCES.md`.

---

## 0. La pregunta que resuelve el 80% de los bugs

Cuando un estilo "no aplica" o "se pisa", la causa está en una de **cinco** capas, y se descartan
**en este orden**:

```
1. ¿La regla existe y matchea el elemento?        → DevTools: ¿aparece, aunque sea tachada?
2. ¿Está en una @layer?                            → CSS sin capa gana a TODO lo que está en capas
3. ¿Quién gana por especificidad?                  → (a,b,c) — y :where() vale 0
4. ¿La propiedad se hereda o no?                   → color/font sí; display/border no
5. ¿Hay un contexto que la encierra?               → stacking, containing block, formatting, containment
```

**El error clásico es saltar al paso 3 y "arreglarlo" subiendo especificidad.** Eso funciona una vez y
deja el sistema peor: la próxima regla tendrá que subir más. Ver `references/cascade-scope-layers.md`
§Triage.

---

## 1. Router — qué cargar

```
├─ Algo no aplica / se pisa / gana la regla equivocada .. references/cascade-scope-layers.md
├─ Layout: grid, subgrid, container queries, anchor,
│  sticky, overflow, contención, stacking ............... references/layout-and-containment.md
├─ Color, dark mode, theming, custom properties ......... references/color-and-theming.md
├─ Features nuevas de plataforma: if(), @function,
│  shape(), corner-shape, field-sizing, text-box,
│  reading-flow, @starting-style, view transitions ...... references/platform-2026.md
└─ ¿Sigue vigente lo que voy a afirmar? ................ SOURCES.md
```

---

## 2. Los cinco principios

### 2.1 Las capas son arquitectura, la especificidad es táctica

`@layer` reordena la cascada **antes** de que la especificidad importe. Una regla de una capa
posterior gana a una de una capa anterior **aunque tenga menos especificidad**. Eso convierte "quién
gana" en una decisión de diseño explícita en vez de una carrera de selectores.

```css
@layer reset, base, components, utilities;
```

**El corolario que casi nadie aplica:** CSS **fuera** de toda capa gana a **todo** lo que está en
capas. Un `.css` de terceros importado suelto pisa tu sistema entero sin que se vea por qué. Meté
todo en capas, incluido lo ajeno:

```css
@import url('vendor.css') layer(vendor);
```

### 2.2 `:where()` es la herramienta de especificidad, no `!important`

`:where()` tiene especificidad **cero**. `:is()` toma la del argumento más específico.

```css
/* especificidad 0,1,0 — fácil de pisar, que es lo que querés en una base */
:where(.card) .title { font-weight: 600; }
```

Usalo para estilos base que deben ser sobrescribibles sin pelea. `!important` es la respuesta correcta
en exactamente dos casos: utilidades que por contrato deben ganar (es lo que hace el import de
`greenhouse-eo`) y sobreescribir estilos inline de terceros que no controlás.

### 2.3 El componente se defiende con `@scope` o con capas, no con nombres largos

```css
@scope (.card) to (.card__nested) {
  img { border-radius: 8px; }
}
```

El "donut" (`to …`) corta la herencia de estilos hacia adentro de componentes anidados: el problema que
BEM resolvía con convenciones de nombre, la plataforma ahora lo resuelve de verdad. `@scope` también
aporta **proximidad**: entre dos reglas de igual especificidad gana la del scope más cercano.

### 2.4 El componente responde a su contenedor, no al viewport

Un breakpoint de viewport describe la pantalla; un componente vive en una región. Si el mismo
componente aparece en un sidebar y en un main, el viewport no sabe nada útil.

```css
.sidebar { container-name: sidebar; container-type: inline-size; }
.card { display: grid; }
@container sidebar (inline-size > 30rem) { .card { grid-auto-flow: column; } }
```

Desde 2026 `@container <nombre>` funciona **sin condición de tamaño** (solo por nombre). Y
`container-type: scroll-state` permite reaccionar a que un elemento esté pegado (`stuck`), encajado
(`snapped`) o a que su contenedor pueda scrollear. Ver `references/layout-and-containment.md`.

### 2.5 Si la plataforma lo hace, no lo hagas con JavaScript

El eje de 2025–2026 es que CSS se volvió **consciente del estado y del contexto**. Cosas que eran JS
y ya no:

| Antes | Ahora |
|---|---|
| Floating UI / Popper para posicionar tooltips y menús | **anchor positioning** |
| medir el contenedor con ResizeObserver | **container queries** |
| librería de animación para entrada desde `display:none` | **`@starting-style` + `transition-behavior: allow-discrete`** |
| calcular índice para animaciones escalonadas | **`sibling-index()` / `sibling-count()`** |
| JS para saber si un sticky está pegado | **scroll-state container queries** |
| elegir color de texto legible por luminancia | **`contrast-color()`** |
| dos temas con clases y duplicación | **`light-dark()`** |
| autosize de textarea | **`field-sizing: content`** |
| centrado óptico a ojo con márgenes negativos | **`text-box: trim-both cap alphabetic`** |
| polyfill de transición entre páginas | **view transitions (mismo doc y cross-document)** |

Cada una borra una dependencia y un bug. **Pero verificá el soporte** antes de comprometerte: varias
son recientes y el ecosistema tiene tres repos con targets distintos.

---

## 3. Hard rules (NUNCA / SIEMPRE)

- **NUNCA subas especificidad ni agregues `!important` para ganar una pelea de cascada** sin haber
  corrido el triage de 5 pasos. El fix casi siempre es de capa o de scope.
- **NUNCA importes CSS de terceros fuera de una capa.** Gana a todo tu sistema por construcción.
- **NUNCA uses un breakpoint de viewport para decidir el layout interno de un componente reutilizable.**
  Es una container query.
- **NUNCA anides selectores "para que gane".** Cada nivel de anidamiento es deuda de especificidad que
  alguien va a pagar.
- **NUNCA declares un valor de diseño (color, tamaño, duración) directamente en una regla** si el
  repo tiene design system. El valor sale del token. Ver `design-system-governance`.
- **NUNCA dejes dos motores de estilo activos en la misma superficie** (CSS propio + utilidades +
  CSS-in-JS peleando). Elegí uno por superficie.
- **NUNCA uses `z-index` sin saber en qué contexto de apilamiento estás.** `z-index: 9999` que no
  funciona es siempre un contexto padre, nunca un número insuficiente.
- **SIEMPRE** declará el orden de capas **una vez, arriba de todo**, antes del primer `@import`.
- **SIEMPRE** que una animación dependa de `display` o de entrada desde `display:none`, usá
  `@starting-style` + `transition-behavior: allow-discrete` en vez de timers.
- **SIEMPRE** que uses una feature de plataforma reciente, verificá el soporte contra los targets
  reales del repo y dejá el fallback escrito (o la decisión de no tenerlo).
- **SIEMPRE** respetá `prefers-reduced-motion` cuando el CSS anime algo — el contrato lo define
  `motion-design`, ésta lo implementa.

---

## 4. Sinergias — quién decide qué

| Skill | Decide | Frontera con ésta |
|---|---|---|
| `greenhouse-ai-design-studio` | el loop de UI nueva, artefactos, gate de score | **Orquestador.** Ésta es un lane; no re-declara su gate ni GVC. |
| `modern-ui` | qué patrón visual, jerarquía, vara premium | Ella decide **qué se ve**; ésta **cómo se declara sin romper el sistema**. |
| `tailwind-engineer` | theme, utilidades, variantes, el `className` | Complementarias: ella emite CSS, ésta gobierna la cascada donde ese CSS aterriza. Bug de utilidad → ella. Bug de cascada → ésta. |
| `design-system-governance` | qué token existe y su ciclo de vida | Ella es dueña del **valor**; ésta de **cómo se declara y hereda**. |
| `typography-design` | escala, peso, medida, numerales | Ella decide; ésta implementa (`text-box`, `font-feature-settings`, fluid type con `clamp()`). |
| `motion-design` | duración, curva, coreografía, contrato reduced-motion | Ella decide; ésta implementa el mecanismo CSS. |
| `a11y-architect` | contraste, foco, targets, forced-colors, reduced-motion | Ella audita; ésta provee `contrast-color()`, `:focus-visible`, `reading-flow`. **Ojo:** `reading-flow` cambia el orden de foco — cualquier uso pasa por ella. |
| `html-react-engineer` | qué elemento, qué markup, el componente | Ella pone el elemento; ésta lo estiliza. `::details-content`, `::picker(select)`, `:popover-open` viven en la frontera: el elemento es de ella, el pseudo es de ésta. |
| `web-perf-design` | presupuesto de performance, LCP, CLS | Ella mide; ésta provee `content-visibility`, `contain`, `will-change` con criterio. |
| `frontend-architect` | topología de render, RSC, hydration | Ella decide dónde corre el CSS (crítico, módulos, streaming); ésta qué dice. |

⚠️ **NO** cablees `motion-design-studio` (video/broadcast) ni `design-studio` (dirección de arte de
imagen): son otro oficio y otro output.

---

## 5. Cierre

- [ ] Todo el CSS —propio y de terceros— está en una capa, y el orden está declarado arriba.
- [ ] No agregué especificidad ni `!important` para ganar; resolví por capa o scope.
- [ ] Los componentes reutilizables responden a su contenedor, no al viewport.
- [ ] Cero valores de diseño literales donde el repo tiene tokens.
- [ ] Las features nuevas que usé están verificadas contra los targets del repo, con fallback escrito
      o decisión explícita de no tenerlo.
- [ ] Si anima: respeta `prefers-reduced-motion`.
- [ ] Si toca orden de foco (`reading-flow`, `order`, `flex-direction: row-reverse`): pasó por
      `a11y-architect`.

## Version

- **v1.0** — 2026-07-27 — Pinea el estado CSS verificado a 2026-07 (anchor positioning, `@scope`,
  container queries sin condición de tamaño, `if()`, `@function`, `shape()`, `corner-shape`,
  `contrast-color()`, relative color interop, `reading-flow`, `@starting-style`, cross-document view
  transitions) y el triage de cascada de 5 pasos.
