# Referencia — cascada, capas, scope, especificidad

Los fundamentos de esta página son **estables**: no se reverifican. Lo único con fecha es el soporte de
`@scope` (ver `../SOURCES.md`).

---

## Triage — por qué gana esa regla

Corré esto **en orden**. Saltar al paso 4 y subir especificidad es cómo se degrada un sistema de CSS.

### 1. ¿La regla existe y matchea?

DevTools → Styles. Si la regla **no aparece en absoluto** (ni tachada), el problema no es la cascada:

- el selector no matchea (typo, estado, elemento equivocado);
- el archivo no se cargó, o se cargó y el bundler lo tree-shakeó;
- es una utilidad que nunca se generó (→ `tailwind-engineer` → `references/debugging.md` §P4/P5);
- el elemento está en un Shadow DOM y el CSS de afuera no entra.

### 2. ¿Está en una `@layer`?

**CSS fuera de toda capa gana a TODO lo que está en capas**, sin importar especificidad ni orden.
Esta es la causa más subestimada del ecosistema: un `.css` de terceros importado suelto pisa el sistema
entero y en DevTools se ve como "una regla más".

```css
/* orden: quien va después gana, a igual especificidad */
@layer reset, vendor, base, components, utilities;

@import url('vendor.css') layer(vendor);   /* ← lo ajeno también va en capa */
```

Reglas de capas que hay que tener internalizadas:

- El **orden de declaración** de los nombres es lo que manda, no el orden de las reglas.
- **Capas anidadas**: `@layer components.card { … }`.
- **Sin nombre** (`@layer { … }`) crea una capa anónima al final; evitalo, no se puede referenciar.
- ☠️ **`!important` INVIERTE el orden de capas.** Un `!important` en `reset` le gana a un `!important`
  en `utilities`. Es lo contrario de lo que casi todos asumen, y por eso `!important` dentro de un
  sistema con capas es especialmente destructivo.

### 3. ¿Hay `@scope` en juego?

Entre dos reglas de **igual especificidad**, `@scope` desempata por **proximidad**: gana la del scope
más cercano al elemento. Esto sucede antes de mirar el orden del documento.

### 4. Especificidad

Se cuenta `(a, b, c)` = (IDs, clases/atributos/pseudo-clases, elementos/pseudo-elementos). Se comparan
de izquierda a derecha; **no hay acarreo**: 11 clases (0,11,0) nunca superan un ID (1,0,0).

| Selector | Especificidad |
|---|---|
| `*`, `:where(...)` | 0,0,0 |
| `li` | 0,0,1 |
| `.card` | 0,1,0 |
| `.card:hover`, `[data-open]` | 0,2,0 / 0,1,0 |
| `#app` | 1,0,0 |
| `:is(.a, #b)` | **1,0,0** (toma el peor del argumento) |
| `:not(.a)` | 0,1,0 (toma el del argumento) |
| estilo inline | gana a todo salvo `!important` |

**`:where()` es la herramienta clave.** Especificidad cero → estilos base trivialmente sobrescribibles:

```css
:where(.card) .title { font-weight: 600; }   /* 0,0,1 — cualquiera lo pisa */
.card .title         { font-weight: 600; }   /* 0,2,0 — pelea */
```

⚠️ **Con nesting nativo, `&` propaga especificidad.** Anidar tres niveles produce selectores que no
escribirías a mano. Si el CSS anidado "gana demasiado", desanidalo o envolvé con `:where()`.

### 5. Herencia y contextos

Si la regla gana y aun así no se ve el efecto:

- **¿La propiedad se hereda?** Sí: `color`, `font-*`, `line-height`, `visibility`, `cursor`,
  `text-align`, custom properties. No: `display`, `border`, `padding`, `background`, `width`.
  Para forzar: `inherit`. Para resetear: `initial` / `unset` / `revert` / `revert-layer`.
- **`revert-layer`** devuelve el valor que tendría según las capas anteriores. Es el reset correcto
  dentro de un sistema por capas, mejor que `unset`.
- **¿Hay un contexto que la encierra?** Ver `layout-and-containment.md`: stacking context,
  containing block, formatting context y containment cambian qué es posible, no quién gana.

---

## `@scope` — aislamiento real

```css
/* alcance simple */
@scope (.card) {
  img { border-radius: 8px; }
}

/* "donut": corta antes de los componentes anidados */
@scope (.card) to (.card__nested, .widget) {
  img { border-radius: 8px; }   /* no toca imágenes dentro de .widget */
}
```

Qué resuelve, en concreto:

1. **Fuga de estilos hacia componentes hijos** — el problema que BEM atacaba con nombres.
2. **Proximidad como criterio de desempate** — dos temas anidados, gana el más cercano, sin subir
   especificidad.
3. **Especificidad baja por defecto** — el prelude del scope **no** suma especificidad al selector.

Cuándo **no** usarlo: como reemplazo de una arquitectura de capas (son ortogonales), o para "arreglar"
un estilo que se pisa (eso es el paso 2 del triage).

---

## Patologías conocidas

### `!important` en escalada

**Síntoma:** el archivo tiene 40 `!important` y cada cambio nuevo necesita uno más.
**Causa:** alguien ganó una pelea con fuerza bruta y el siguiente tuvo que hacer lo mismo.
**Fix:** capas. Movés lo que debe perder a una capa temprana y lo que debe ganar a una tardía, y
borrás los `!important` de a tandas verificando visualmente.

**Los dos `!important` legítimos:** utilidades que por contrato deben ganar (es exactamente lo que
hace `greenhouse-eo` con el modificador `important` en sus dos `@import`), y pisar estilos inline de
terceros que no controlás.

### `z-index: 9999` que no funciona

**Nunca** es un número insuficiente. El elemento está en un **contexto de apilamiento** cuyo padre
tiene un z-index menor; adentro de ese contexto, el máximo del hijo sigue estando por debajo.

Crean contexto de apilamiento: `position` + `z-index` distinto de `auto`, `opacity < 1`, `transform`,
`filter`, `backdrop-filter`, `will-change`, `isolation: isolate`, `contain: paint|layout|strict`,
`mix-blend-mode`, y estar en el **top layer**.

**Diagnóstico:** subí por los ancestros buscando el primero que cree contexto. Ese es el que hay que
ajustar. **Fix preventivo:** `isolation: isolate` en el componente, para que su apilamiento interno no
dependa del resto de la página.

**Escape real:** si el elemento tiene que estar por encima de todo (modal, popover, tooltip), el
**top layer** lo resuelve de raíz: `<dialog>` con `showModal()` o el atributo `popover` salen de la
cascada de apilamiento por completo. Ver `html-react-engineer`.

### El estilo se ve distinto en dos lugares

Descartá en este orden: (1) el componente hereda algo distinto en cada lugar (font, color, `direction`);
(2) hay una container query o un breakpoint distinto; (3) un ancestro crea un formatting context
distinto (flex vs grid vs block cambia márgenes y tamaños); (4) hay dos motores de estilo y en un
lugar gana uno y en el otro el otro.

### CSS que "desaparece" en producción

Casi siempre es build, no cascada: orden de `@import` distinto al del bundle, CSS modules con hashing
que cambia el orden, o code splitting que carga las hojas en otro orden. **El orden de capas declarado
arriba de todo inmuniza contra esto**, porque el orden pasa a depender del nombre y no de la posición
del archivo.

---

## Arquitectura recomendada

```css
/* una sola línea, arriba de todo, antes del primer @import */
@layer reset, vendor, base, tokens, components, utilities, overrides;
```

| Capa | Qué va | Quién la escribe |
|---|---|---|
| `reset` | normalización / preflight | plataforma |
| `vendor` | CSS de terceros, siempre importado con `layer()` | plataforma |
| `base` | elementos sin clase (`h1`, `a`, `table`) | plataforma |
| `tokens` | `:root` con custom properties, `@property` | `design-system-governance` |
| `components` | componentes propios (idealmente con `@scope`) | producto |
| `utilities` | utilidades atómicas | `tailwind-engineer` |
| `overrides` | excepciones **con comentario que diga por qué y hasta cuándo** | quien la necesite |

Si `overrides` tiene más de un puñado de reglas, dejó de ser una excepción y se volvió el sistema real.
Eso es una señal, no un estado estable.
