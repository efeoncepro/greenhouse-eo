# Referencia — color, custom properties y theming

⚠️ **Antes de recomendar color moderno, mirá en qué repo estás.** El overlay de `modern-ui` en
`greenhouse-eo` **desactiva OKLCH, `color-mix()` y P3 dentro del portal**: ahí el color sale del theme
MUI/AXIS y punto. Esta página aplica a Globe, a los sitios Astro y a superficies fuera del portal.
La dueña del **valor** del token siempre es `design-system-governance`.

---

## Custom properties — lo que casi nadie usa bien

### El default de `var()` no es un fallback de errores

```css
color: var(--brand, #333);   /* #333 solo si --brand NO está definida */
```

Si `--brand` está definida **con un valor inválido**, no cae al default: cae a `unset`. Por eso las
custom properties sin tipar producen bugs raros — cualquier string es "válido" hasta que se usa.

### `@property` — tipar la variable

```css
@property --shadow-strength {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 5%;
}
```

Tres cosas que solo se consiguen tipando:

1. **Animar la variable.** Una custom property sin tipo **no se puede interpolar**: la transición salta.
   Con `@property` y un `syntax` numérico, sí. Es el desbloqueo real para gradientes y sombras animadas.
2. **Valor inicial garantizado**, sin depender de que alguien la declare.
3. **Control de herencia** (`inherits: false`) para que no se filtre a los hijos.

### El scope de una custom property es el elemento

```css
.card { --pad: 1rem; padding: var(--pad); }
.card.dense { --pad: 0.5rem; }        /* re-declaración, no override de la propiedad */
```

Es el mecanismo más limpio para variantes: el componente lee **una** variable, y las variantes cambian
la variable, no las reglas. Menos selectores, menos especificidad.

**Corolario para container/style queries:** una variable declarada en el contenedor es consultable por
style query. Densidad, tono y variante se propagan sin que cada hijo lea una clase.

---

## Espacios de color

```css
--brand: oklch(0.72 0.11 178);
```

**OKLCH** (`L` claridad 0-1, `C` croma, `H` matiz 0-360). Por qué importa: es **perceptualmente
uniforme**. En HSL, dos colores con la misma `L` se ven con brillos distintos; en OKLCH no. Eso hace
que una escala generada programáticamente se vea pareja, que un `color-mix()` no pase por barro, y que
el contraste sea predecible.

### `color-mix()`

```css
background: color-mix(in oklab, var(--brand) 20%, transparent);
border-color: color-mix(in oklab, var(--brand), black 15%);
```

Un color base + mezclas > doce tokens de opacidad hechos a mano. Ojo: **mezclá en `oklab`/`oklch`**,
no en `srgb`, o vas a ver los grises sucios del mix lineal.

### Relative color syntax

```css
--brand-hover: oklch(from var(--brand) calc(l - 0.08) c h);
--brand-muted: oklch(from var(--brand) l calc(c * 0.4) h);
```

Deriva variantes del token base **sin recalcular nada a mano**. Interop en todos los motores
(Baseline 2026, verificado 2026-07). Es la herramienta que hace innecesaria la mitad de un generador
de paletas.

### `light-dark()`

```css
:root { color-scheme: light dark; }
.card { background: light-dark(#fff, #111); color: light-dark(#111, #eee); }
```

Un tema, sin duplicar el bloque de reglas. **Requiere `color-scheme`** declarado, y por eso mismo los
controles nativos (scrollbars, inputs, `<select>`) se adaptan solos.

Limitación real: solo cubre dos modos. Para multi-brand o más de dos temas, seguís necesitando
variables por tema — pero podés combinar: variables por marca + `light-dark()` por modo.

### `contrast-color()`

```css
.badge { background: var(--tone); color: contrast-color(var(--tone)); }
```

El navegador elige el texto legible según la luminancia del fondo. Mata el patrón de "función JS que
decide si el texto va negro o blanco". Es de las más nuevas (Firefox 146, Safari 26 — verificado
2026-07): **verificá antes de usarla sin fallback**.

⚠️ **`contrast-color()` no reemplaza una auditoría de contraste.** Garantiza legibilidad, no un ratio
WCAG concreto ni la coherencia de marca. El ratio lo audita `a11y-architect`.

---

## Estrategia de theming

Tres capas, y confundirlas es el origen de la mayoría de los sistemas de color inmantenibles:

```css
@layer tokens {
  :root {
    /* 1. primitivos — el catálogo. Nadie los usa directo en un componente. */
    --blue-500: oklch(0.62 0.19 250);
    --gray-900: oklch(0.21 0.01 250);

    /* 2. semánticos — la intención. Es lo que los componentes consumen. */
    --color-surface: light-dark(#fff, var(--gray-900));
    --color-action: var(--blue-500);
    --color-on-action: contrast-color(var(--blue-500));
  }

  /* 3. de componente — solo si hace falta un punto de extensión */
  .card { --card-padding: 1rem; }
}
```

- **Un componente nunca consume un primitivo.** Si `.button` usa `--blue-500`, el día que cambia la
  marca hay que tocar cada componente.
- **El dark mode se resuelve en la capa semántica.** Si aparece un `.dark .button` estás resolviendo
  el tema en el componente y vas a duplicarlo N veces.
- **Nombrá por intención, no por apariencia.** `--color-danger`, no `--color-red`. El día que el rojo
  de peligro pasa a naranja, el nombre sigue siendo verdad.

En un repo con Tailwind, el punto donde el token semántico se vuelve utilidad es `@theme` →
`tailwind-engineer`.

---

## Forced colors / alto contraste de Windows

```css
@media (forced-colors: active) {
  .badge { border: 1px solid; }   /* el borde sobrevive; el background no */
}
```

En forced-colors el sistema **reemplaza** colores. Lo que desaparece: fondos decorativos, sombras,
gradientes, bordes de color. Consecuencia práctica: **cualquier estado comunicado solo por color
desaparece**. Un chip que se distingue únicamente por su `background` deja de distinguirse.

`forced-color-adjust: none` existe pero úsalo solo donde el color **es** la información (una muestra
de color, un gráfico). La auditoría es de `a11y-architect`.

---

## Errores frecuentes

| Error | Por qué duele |
|---|---|
| escala de grises en HSL | los pasos no se ven parejos; en OKLCH sí |
| opacidad para "aclarar" un color | `opacity` afecta al elemento entero, hijos incluidos. Para aclarar el color usá `color-mix()` |
| tokens de color con nombre de apariencia | `--color-red` que ahora es naranja |
| dark mode con clases duplicadas | dos sistemas de color que se desincronizan solos |
| `color-mix` en `srgb` | grises sucios en el medio de la mezcla |
| custom property sin `@property` que se quiere animar | no interpola: salta |
| gradiente en `srgb` entre complementarios | pasa por gris. `in oklab` lo arregla |
