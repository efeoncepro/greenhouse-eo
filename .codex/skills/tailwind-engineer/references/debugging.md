# Referencia — debugging de Tailwind v4

Las cinco patologías conocidas **se ven casi iguales desde afuera** ("puse la clase y no pasa nada" o
"se ve mal con el build verde") y tienen causas distintas. Correr el triage cuesta 2 minutos; adivinar
cuesta una tarde. Las tres primeras están **medidas en producción** en este ecosistema.

---

## Triage — en este orden, sin saltarse pasos

```
1. ¿La utilidad EXISTE en el CSS compilado?
   grep -c "\.mi-clase" <output.css>       (o busca en DevTools → Sources)
      NO  → P4 (no se generó) o P5 (no se escaneó)
      SÍ  → sigue

2. ¿Está en el elemento pero tachada en DevTools?
      SÍ  → P2 (capas/especificidad) o P3 (otro motor pisando)

3. ¿Está aplicada, sin tachar, y el valor es raro (16px, 0, Times)?
      SÍ  → P1 (referencia circular)  ← la más cara y la más silenciosa

4. ¿Cambia al hacer hard-reload o al reiniciar el dev server?
      SÍ  → caché del build; no es un bug de CSS
```

---

## P1 — Referencia circular en `@theme inline`

**Síntoma:** el build está **verde**, la clase está aplicada, sin tachar, y el valor es el inicial del
navegador. Medido en Globe: `text-xs` → **16px**, `rounded-sm` → **0px**, `font-display` → **Times**.

**Causa:** el mismo nombre a ambos lados de la declaración.

```css
/* ☠️ referencia circular: --text-xs se define como sí misma */
@theme inline {
  --text-xs: var(--text-xs);
}
```

Con `inline`, Tailwind emite `.text-xs { font-size: var(--text-xs) }`. Esa variable se resuelve en el
elemento, donde lo único que existe es… la misma variable. Sin valor → el navegador cae al inicial. No
hay warning: para el compilador es una declaración perfectamente formada.

**Por qué se cuela:** aparece al "puentear" un SSOT externo. Alguien quiere que `--text-xs` de Tailwind
tome el valor del design system, el DS también lo llama `--text-xs`, y el alias queda apuntándose a sí
mismo.

**Fix:** los nombres tienen que ser **distintos**, o el valor tiene que ser literal.

```css
/* ✅ nombres distintos */
@theme inline { --text-xs: var(--ds-font-size-xs); }

/* ✅ generado desde el SSOT con valores literales — el patrón de Globe */
@theme { --text-xs: 0.72rem; }
```

**Detección rápida:**

```bash
grep -nE '^\s*--([a-z0-9-]+):\s*var\(--\1\)' src/**/*.css
```

**Prohibido por ADR-016 §3.** Si trabajas en Globe, el theme se **genera** — no hay `@theme inline` a
mano que valga.

---

## P2 — Orden de capas / especificidad

**Síntoma:** la utilidad está en el CSS y en el elemento, pero **tachada** en DevTools.

**Causa A — orden de capas.** A igual especificidad gana la capa declarada **después**. El orden se
declara antes del primer `@import`:

```css
@layer theme, base, legacy, components, utilities;
```

Medido en Globe: poner `legacy` **primera** hizo que las utilidades le ganaran a estilos de componente
que sí se querían conservar — `.capability-button` cayó de 11,52px/600 a 16px/400. La posición
correcta de una capa legacy es **entre `base` y `components`**.

**Causa B — CSS sin capa.** Cualquier CSS fuera de `@layer` gana a **todo** lo que está en capas, sin
importar el orden. Un `.css` global importado suelto pisa utilidades sin que se note por qué.

**Causa C — especificidad real.** `.card .title` (0,2,0) le gana a `.text-lg` (0,1,0) aunque venga
antes. Las utilidades son de clase simple: cualquier selector compuesto les gana dentro de la misma
capa.

**Fix:** ajustar la capa, no la especificidad. Subir especificidad o meter `!` arregla el caso y deja
la causa viva para el próximo.

---

## P3 — Otro motor pisando (CSS-in-JS, reset, plugin)

**Síntoma:** funciona en un componente y en otro no. O funciona hasta que el componente entra en un
estado (hover/disabled/selected).

**Causas frecuentes:**

- **Emotion/MUI vs utilidades.** En `greenhouse-eo` los imports llevan el modificador de importancia
  justamente para que Tailwind gane. **Efecto inverso**: una utilidad puesta al pasar pisa un estado
  de MUI que sí querías. Si un componente MUI deja de reaccionar a un estado, sospecha de tu clase
  antes que del componente.
- **Preflight ausente/presente.** `greenhouse-eo` y `efeonce-globe` **no** importan preflight;
  `efeonce-think` **sí**. Asumir los defaults de Tailwind sobre `h1`/`ul`/`button` es correcto en uno
  y falso en los otros dos.
- **Dos motores en la misma superficie.** El caso que originó ADR-016: **seis colisiones medidas en
  una sola sesión**. Regla: la superficie está en CSS propio **o** en Tailwind. No hay convivencia
  parcial estable.
- **Sin `tailwind-merge`** (ninguno de los tres repos lo tiene): dos utilidades del mismo grupo en el
  mismo elemento **no se resuelven por orden del string**. No construyas APIs de componente que
  concatenen clases del mismo grupo esperando override.

---

## P4 — La utilidad no se generó (namespace vaciado o token inexistente)

**Síntoma:** no pasa **nada**. La clase está en el DOM, no existe en el CSS, no hay error.

**Causa A — namespace vaciado.** En `efeonce-globe`:

```css
@theme { --color-*: initial; --text-*: initial; /* … */ }
```

La escala de fábrica **no existe**. `text-lg`, `bg-red-500`, `rounded-md`, `ease-out` no se generan.
Comprueba qué existe realmente:

```bash
grep -o "^\s*'--[a-z0-9-]*'" apps/studio-client/src/tokens/tokens.ts | sort
```

**Causa B — token que nunca existió.** `bg-brand-strong` con `--color-brand-strong` no definido: no
hay utilidad. Tailwind no avisa de utilidades inexistentes; no es un lenguaje con tipos.

**Causa C — namespace equivocado.** El valor está, pero en el namespace que no es. Un color en
`--text-*` genera una utilidad de **tamaño de fuente**.

**Causa D — theme desactualizado.** En repos con generador (Globe): editaste `tokens.ts` y no corriste
`pnpm theme:generate`. El gate `tailwind-theme.test.ts` te lo dice, pero solo al correr los tests.

---

## P5 — No se escaneó (o se escaneó de más)

**Síntoma A:** la clase no se genera y el token **sí** existe. **Síntoma B:** aparecen utilidades en el
CSS compilado que nadie escribió en la UI.

**Causa A — clase construida dinámicamente.** Tailwind escanea texto plano; no ejecuta tu código.

```js
// ☠️ no se genera nada
const cls = `text-${size}`
const color = cond ? 'red' : 'blue'; const c = `bg-${color}-500`

// ✅ strings completos, visibles al scanner
const cls = size === 'lg' ? 'text-lg' : 'text-sm'
```

Salida de emergencia si no hay forma: `@source inline("bg-red-500 bg-green-500")`. Antes de usarla,
pregúntate si la construcción dinámica es necesaria.

**Causa B — se escaneó de más.** Tailwind lee el árbol como texto plano, **sin ignorar comentarios**,
y eso incluye docs, tests y fixtures. Un ejemplo escrito en un archivo del árbol puede materializarse
como utilidad real. Es ADR-016 §6: en Globe, el propio gate estaba emitiendo los literales que
prohibía. Se cierra con:

```css
@source not "../**/*.test.ts";
@source not "../**/*.test.tsx";
```

### Qué se materializa desde un `.md` — medido

Verificado 2026-07-27 contra `tailwindcss@4.1.17` (compilador real, `@source` a un dir con un solo
`.md`):

| Contenido del `.md` | ¿Se materializa? |
|---|---|
| clase simple en prosa (`gap-9`) | **sí** |
| clase simple dentro de un bloque ```` ```html ```` (`gap-13`) | **sí** |
| valor arbitrario en prosa (`p-[13px]`) | no |
| valor arbitrario en backticks | no |
| valor arbitrario dentro de un fence | no |

Lectura: el extractor **no promueve candidatos con corchetes** en markdown, pero **sí** las clases
simples. Consecuencias prácticas:

- Documentar un anti-patrón con corchetes en un `.md` es **seguro hoy**. En un `.ts`/`.tsx`, **no** —
  ahí sí se materializa, que es exactamente el caso de ADR-016 §6.
- Las **clases simples de ejemplo en docs sí engordan el CSS**. En `greenhouse-eo` no hay `@source`
  acotando y `docs/**` + `.claude/skills/**` están trackeados: hoy el portal materializa utilidades
  que solo existen en documentación.
- Es una observación empírica de una versión, no un contrato. Si el repo sube de minor, revalida antes
  de apoyarte en ella.

---

## Comandos útiles

```bash
# ¿existe la utilidad en el output? (Next)
grep -rl "\.is-full" .next/static/css/ 2>/dev/null

# ¿qué tokens tiene el theme del repo?
grep -nE '^\s*--[a-z]+-[a-z0-9-]*:' src/app/globals.css | head -50

# referencia circular
grep -nE '^\s*--([a-z0-9-]+):\s*var\(--\1\)' src/**/*.css

# CSS fuera de capas (gana a todo)
grep -rn "^[.#a-z]" src/**/*.css | grep -v "@layer" | head

# ¿el orden de capas está declarado antes del primer @import?
head -5 src/app/globals.css
```

---

## Regla final

**Nunca cierres un bug de Tailwind con `!`, con especificidad extra o duplicando la regla.** Las cinco
patologías tienen fix estructural y ninguna se arregla con fuerza bruta. Si llegaste a `!important`,
vuelve al paso 1 del triage: estás mirando el síntoma equivocado.
