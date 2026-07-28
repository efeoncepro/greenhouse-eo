# Referencia — directivas y funciones de Tailwind v4

Verificado 2026-07-27 contra la doc oficial (`tailwindcss.com/docs/functions-and-directives`,
`/docs/theme`, `/docs/adding-custom-styles`). Ver `../SOURCES.md`.

---

## `@theme` — donde un token se vuelve utilidad

```css
@import "tailwindcss";

@theme {
  --color-avocado-500: oklch(0.84 0.18 117.33);
  --font-display: "Satoshi", "sans-serif";
  --breakpoint-3xl: 120rem;
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
}
```

Genera utilidades (`bg-avocado-500`, `text-avocado-500`, `font-display`, `3xl:*`, `ease-fluid`) **y**
las variables CSS correspondientes.

> Una variable en `:root` **no genera nada**. Es solo un valor. La diferencia entre `:root` y `@theme`
> es la diferencia entre "hay un valor" y "hay una utilidad".

### Namespaces completos

| Namespace | Genera | Namespace | Genera |
|---|---|---|---|
| `--color-*` | `bg-`, `text-`, `border-`, `fill-`… | `--breakpoint-*` | variantes `sm:`, `md:`… |
| `--font-*` | `font-sans`, `font-display` | `--container-*` | `@sm:`, `max-w-md` |
| `--text-*` | `text-xl` (tamaño) | `--spacing-*` | `px-4`, `m-8`, `max-h-16` |
| `--font-weight-*` | `font-bold` | `--radius-*` | `rounded-sm`, `rounded-xl` |
| `--tracking-*` | `tracking-wide` | `--shadow-*` | `shadow-md` |
| `--leading-*` | `leading-tight` | `--inset-shadow-*` | `inset-shadow-xs` |
| `--ease-*` | `ease-out` | `--drop-shadow-*` | `drop-shadow-md` |
| `--animate-*` | `animate-spin` | `--blur-*` | `blur-md` |
| `--aspect-*` | `aspect-video` | `--perspective-*` | `perspective-near` |
| `--zoom-*` | `zoom-compact` (v4.3) | `--tab-size-*` | `tab-github` (v4.3) |

⚠️ El namespace decide **qué tipo** de utilidad nace. Poner un color en `--text-*` no da error: da una
utilidad de tamaño de fuente cuyo valor es un color. Falla en silencio.

### Las tres opciones

```css
@theme        { --color-primary: #f00; }              /* utilidad + variable */
@theme inline { --font-sans: var(--font-inter); }     /* NO resuelve al definir */
@theme static { --color-secondary: var(--color-blue-500); } /* emite aunque no se use */
```

**`inline` resuelve un gotcha de scoping real.** Sin `inline`, la variable se resuelve **donde se
define**, no donde se usa:

```html
<!-- SIN inline — no funciona como esperás -->
<div style="--font-sans: var(--font-inter, sans-serif);">
  <div style="--font-inter: Inter; font-family: var(--font-sans);">
    <!-- usa sans-serif: --font-sans se resolvió arriba, donde --font-inter no existía -->
  </div>
</div>
```

`inline` emite `.font-sans { font-family: var(--font-inter) }` — la resolución ocurre en el elemento.
Es el caso típico de fuentes inyectadas por el framework (`next/font`).

☠️ **La trampa mortal de `inline`:** si el nombre es **idéntico a ambos lados**, es una referencia
circular. `@theme inline { --text-xs: var(--text-xs) }` compila verde y rinde `text-xs` a 16px. Ver
`debugging.md` §P1 — está prohibido por ADR-016 §3.

### Resetear namespaces

```css
@theme {
  --color-*: initial;      /* borra toda la escala de color de fábrica */
  --color-brand: #3f3cbb;  /* y ahora solo existe la tuya */
}

@theme {
  --*: initial;            /* borra TODO el theme default */
  --spacing: 4px;
}
```

Es lo que hace `efeonce-globe`. Consecuencia: las utilidades de la escala de fábrica **dejan de
existir** y usarlas no produce error, produce nada.

---

## `@source` — acotar la detección de contenido

```css
@source "../node_modules/@my-company/ui-lib";   /* incluir algo fuera del árbol */
@source not "../**/*.test.ts";                  /* excluir */
@source inline("bg-red-500 bg-green-500");      /* forzar clases que el scanner no ve */
```

v4 no tiene `content:`. Escanea el árbol respetando `.gitignore`, **como texto plano, sin ignorar
comentarios**. Por eso un ejemplo de clase en un `.md` o en un comentario `.ts` se materializa.
`@source inline(...)` es la salida cuando las clases se construyen dinámicamente y el scanner no
puede verlas — pero antes de usarlo, preguntate si la construcción dinámica es necesaria.

---

## `@utility` — utilidades propias con el sistema de variantes gratis

### Simple

```css
@utility content-auto { content-visibility: auto; }

@utility scrollbar-hidden {
  &::-webkit-scrollbar { display: none; }
}
```

Funciona con `hover:`, `lg:`, `dark:` y toda variante custom automáticamente.

### Funcional con `--value()`

```css
@utility tab-* { tab-size: --value(--tab-size-*); }        /* desde theme */
@utility tab-* { tab-size: --value(integer); }             /* bare tipado */
@utility tab-* { tab-size: --value('inherit','initial'); } /* literales */
@utility tab-* { tab-size: --value([integer]); }           /* arbitrario */
```

Tipos para bare: `number`, `integer`, `ratio`, `percentage`.
Tipos para arbitrario: `absolute-size`, `angle`, `bg-size`, `color`, `family-name`, `generic-name`,
`image`, `integer`, `length`, `line-width`, `number`, `percentage`, `position`, `ratio`,
`relative-size`, `url`, `vector`, `*`.

**Las tres formas juntas** (las declaraciones que no resuelven se omiten):

```css
@utility tab-* {
  tab-size: --value([integer]);
  tab-size: --value(integer);
  tab-size: --value(--tab-size-*);
}
```

**Valor por defecto** (v4.3) — permite la utilidad sin argumento:

```css
@utility tab-* { tab-size: --value(integer, --default(4)); }
/* .tab → 4 ; .tab-2 → 2 */
```

**Modificadores con barra** — mismo mecanismo con `--modifier()`:

```css
@utility text-* {
  font-size:   --value(--text-*, [length]);
  line-height: --modifier(--leading-*, [length], [*]);
}
/* text-lg/8 */
```

**Negativas** — utilidad separada:

```css
@utility -inset-* { inset: --spacing(--value(integer) * -1); }
```

**Fracciones** — tipo `ratio`:

```css
@utility aspect-* { aspect-ratio: --value(--aspect-ratio-*, ratio, [ratio]); }
/* aspect-square, aspect-3/4, aspect-[7/9] */
```

### `@utility` vs `@layer components`

`@utility` entra a la capa **utilities** (igual que las de fábrica): otras utilidades pueden pisarla,
y hereda variantes. `@layer components` entra a **components**: cualquier utilidad le gana.
**Para algo que se comporta como utilidad, siempre `@utility`.**

---

## `@variant` y `@custom-variant`

```css
/* aplicar una variante dentro de tu CSS */
.my-element {
  background: white;
  @variant dark { background: black; }
}

/* v4.3: apiladas y compuestas */
.button {
  background: var(--color-sky-500);
  @variant hover:focus { background: var(--color-sky-600); }  /* apilada */
  @variant hover, focus { background: var(--color-sky-600); } /* compuesta */
}

/* definir una variante propia */
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));
/* → theme-midnight:bg-black */
```

`@custom-variant` es la forma correcta de expresar temas, `data-*` de estado y modos de producto. Un
selector ad-hoc en CSS global hace lo mismo pero sin el sistema de variantes.

---

## `@apply` y `@reference`

```css
.select2-dropdown { @apply rounded-b-lg shadow-md; }
```

```css
/* en un <style> de Vue/Svelte o un CSS module */
@reference "../../app.css";
h1 { @apply text-2xl font-bold; }
```

**`@reference` importa la hoja principal "para consultar", sin duplicar el CSS.** Sin él, reimportar
`tailwindcss` dentro de un bloque `<style>` duplica todo el output. Si el bloque solo necesita el
theme default: `@reference "tailwindcss"`.

Con subpath imports de `package.json`:

```json
{ "imports": { "#app.css": "./src/css/app.css" } }
```
```css
@reference "#app.css";
```

---

## Funciones

```css
.a { color: --alpha(var(--color-lime-300) / 50%); }
/* → color-mix(in oklab, var(--color-lime-300) 50%, transparent) */

.b { margin: --spacing(4); }
/* → calc(var(--spacing) * 4) */
```

En valores arbitrarios: `py-[calc(--spacing(4)-1px)]`.

`theme('spacing.12')` está **deprecada** — usá la variable CSS.

---

## Sintaxis de valores en la clase

| Forma | Qué es | ¿Permitida? |
|---|---|---|
| `bg-(--mi-token)` | **referencia** a variable | ✅ es el escape correcto |
| `bg-(image:--page-backdrop)` | referencia con tipo | ✅ |
| `bg-[#4db8ff]` | **declaración** de valor | ❌ token no gobernado |
| `p-[13px]`, `duration-[220ms]` | declaración | ❌ |
| `bg-red-500!` | modificador de importancia | ⚠️ solo con razón escrita; en greenhouse-eo el import ya lo trae |

La regla no es "corchetes malos, paréntesis buenos": es **referenciar vs declarar**. `bg-[var(--x)]`
también referencia, pero la forma con paréntesis es la canónica en v4.

---

## Compatibilidad legacy (no usar en repos nuevos)

```css
@config "../../tailwind.config.js";   /* config JS legacy */
@plugin "@tailwindcss/typography";    /* plugin JS legacy */
```

`corePlugins`, `safelist` y `separator` **no son soportados** en v4. `@plugin` sí se usa
legítimamente en `greenhouse-eo` para `tailwindcss-logical`.

---

## Novedades por versión (para no reinventar lo que ya existe)

**v4.3 (2026-05-08):** utilidades de scrollbar (`scrollbar-thin|auto|none`, `scrollbar-thumb-*`,
`scrollbar-track-*`, `scrollbar-gutter-auto|stable|both`) · `@container-size` (container queries que
consideran la altura, habilita unidades `cqb`) · `zoom-*` · `tab-*` · `@variant` apilado/compuesto ·
`--default()`.

**v4.2:** paletas `mauve`, `olive`, `mist`, `taupe` · plugin webpack de primera clase (2.17x vs
PostCSS) · lógicas extendidas en el core (`mbs-*`, `mbe-*`, `pbs-*`, `pbe-*`, `block-*`, `inline-*`,
`max-block-*`, `min-inline-*`, `inset-s|e|bs|be-*`, `border-bs|be-*`, `scroll-mbs-*`, `scroll-pbe-*`)
· `font-features-*` (OpenType sin CSS custom).

⚠️ Las lógicas del core **se solapan con el plugin `tailwindcss-logical`** que usa `greenhouse-eo`.
Si ese repo sube a ≥4.2, verificá si el plugin sigue haciendo falta antes de asumirlo — y ojo con la
diferencia de nombres (`is-full` del plugin vs `inline-full` del core).
