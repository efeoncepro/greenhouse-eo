---
name: tailwind-engineer
description: >-
  Especialista en Tailwind CSS v4 (CSS-first) para el ecosistema Efeonce. Decide cómo un valor de
  diseño llega a ser una utilidad: theme (`@theme`, namespaces, reset), utilidades propias
  (`@utility` con `--value()`/`--modifier()`), variantes (`@variant`, `@custom-variant`), capas,
  detección de contenido (`@source`) y el pipeline SSOT → theme → clase. Enruta por DIALECTO: los
  tres repos del ecosistema usan Tailwind v4 con reglas mutuamente ilegales, y la skill carga el
  perfil del repo antes de escribir una sola clase. Cubre también auditoría y debugging de CSS
  Tailwind roto (referencia circular en `@theme inline`, orden de capas, utilidad que no se
  materializa, escala vaciada, colisión con CSS-in-JS).
  Triggers: "tailwind", "@theme", "@utility", "@variant", "@source", "utility-first", "className",
  "clase de tailwind", "tokens.ts", "theme:generate", "arbitrary value", "valor arbitrario",
  "no me toma la clase", "por qué no aplica el estilo", "migrar CSS a tailwind", "v4", "utilidad
  custom", "escala tipográfica tailwind", "purge", "content detection".
---

# Tailwind Engineer — v4 CSS-first, por dialecto

> **Boundary (scope of this skill).** Esta skill decide **cómo se materializa un valor de diseño
> como utilidad**: theme, namespaces, utilidades propias, variantes, capas y el pipeline
> SSOT → `@theme` → clase.
> **NO decide qué valor debe existir** — eso es `design-system-governance` (ciclo de vida del token)
> y `modern-ui` (qué patrón visual).
> **NO decide CSS fuera de Tailwind** — cascada, especificidad, `@scope`, anchor positioning y
> debugging de cascada son de `css-architect`.
> **NO escribe el markup ni el componente** — eso es `html-react-engineer`.
> **NO reemplaza al orquestador**: en UI nueva de producto, `greenhouse-ai-design-studio` manda y
> esta skill es un **lane de materialización**, no la fase de diseño.

**Sello de frescura: núcleo verificado as-of 2026-07.** Los **mecanismos** de v4 (CSS-first, `@theme`,
`@utility`, capas, namespaces) son estables. Lo **volátil** es qué utilidades existen: v4.2 y v4.3
agregaron familias nuevas (scrollbar, lógicas extendidas, `zoom-*`, `tab-*`, `font-features-*`,
`@container-size`, paletas mauve/olive/mist/taupe). **Antes de afirmar que una utilidad no existe,
reverifica** — ver `SOURCES.md`.

---

## 0. Regla cero — identificá el dialecto ANTES de escribir una clase

No hay "Tailwind del ecosistema". Hay **tres dialectos**, y una clase legal en uno es ilegal o
inexistente en otro. Antes de tocar nada:

```bash
# ¿qué repo es y qué motor usa?
cat package.json | grep -E '"(tailwindcss|@tailwindcss/[a-z]+|next|astro|vite|@mui/material)"'
ls tailwind.config.* 2>/dev/null || echo "sin config JS — CSS-first (correcto en v4)"
grep -rn "@import 'tailwindcss\|@import \"tailwindcss\|@theme\|@source\|@plugin" --include="*.css" src/ | head
```

| Señal | Dialecto | Perfil a cargar |
|---|---|---|
| `@mui/material` + `@tailwindcss/postcss` + `tailwindcss-logical` | **greenhouse-eo** | `profiles/greenhouse-eo.md` |
| `@tailwindcss/vite` + `tokens.ts` + `theme:generate` + sin MUI | **efeonce-globe** | `profiles/efeonce-globe.md` |
| `astro` + `@tailwindcss/vite` + `@import 'tailwindcss'` pelado | **astro (think / web)** | `profiles/astro-think.md` |
| ninguna de las anteriores | repo nuevo | `profiles/greenfield.md` |

**Cargá el perfil y leelo entero.** Contiene el SSOT, qué está prohibido, qué gates corren y cuál es
el idiom local. Sin eso vas a escribir código que compila y está mal.

Las tres diferencias que más queman:

1. **La dirección del SSOT se invierte.** En Globe: `tokens.ts` → `@theme` generado → utilidad. En
   greenhouse-eo: theme MUI → `--mui-palette-*` → `@theme` que las consume → utilidad. Proponer
   "agreguemos el color al `@theme`" es correcto en un repo y es *saltarse el SSOT* en el otro.
2. **La escala default existe o no existe.** Globe hace `--color-*: initial` y vacía los namespaces:
   las utilidades de la escala de fábrica **no existen ahí**. En greenhouse-eo y en Astro sí existen.
3. **El dialecto de spacing cambia.** greenhouse-eo usa `tailwindcss-logical`: el idiom local son
   propiedades lógicas, no las físicas. Escribir las físicas *funciona* y por eso es peligroso —
   pasa el build y rompe la consistencia RTL del repo. Ver el perfil para la tabla de equivalencias.

---

## 1. Router — qué cargar según lo que estés haciendo

```
├─ Vas a escribir/editar clases en un repo ....... profiles/<dialecto>.md   ← SIEMPRE primero
├─ Vas a tocar el theme, agregar un token,
│  crear una utilidad o una variante ............. references/v4-directives.md
├─ Algo no aplica, no se genera, o se ve mal
│  con el build verde ............................ references/debugging.md   ← empezá por el §Triage
├─ Vas a migrar una superficie de CSS→Tailwind ... references/migration.md
└─ ¿Sigue vigente lo que voy a afirmar? ......... SOURCES.md
```

---

## 2. El modelo mental de v4 en 6 líneas

1. **La config es CSS.** No hay `tailwind.config.js` en ninguno de los tres repos; `@config` existe
   solo como compatibilidad legacy y no se usa acá.
2. **`@theme` no es "variables CSS".** Cada variable de theme en un namespace conocido **genera
   utilidades**. `--color-brand: #…` crea `bg-brand`, `text-brand`, `border-brand`, etc. Una variable
   en `:root` **no genera nada** — solo es un valor.
3. **El namespace decide qué utilidad nace.** `--color-*`, `--text-*`, `--font-weight-*`, `--leading-*`,
   `--tracking-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--animate-*`, `--breakpoint-*`,
   `--container-*`, `--spacing-*`, `--blur-*`, `--aspect-*`, `--perspective-*`, `--zoom-*`,
   `--tab-size-*`. Poner un color en `--text-*` no da error: da una utilidad de tamaño de fuente con
   un color adentro.
4. **El contenido se detecta solo.** Sin `content:`. Escanea el árbol del proyecto respetando
   `.gitignore`. Se acota con `@source`, `@source not` y `@source inline(...)`.
5. **Las capas ordenan la pelea.** `@layer theme, base, components, utilities` — quien va después
   gana a igual especificidad. Este orden se declara **antes** del primer `@import`.
6. **Las utilidades propias van en `@utility`, no en `@layer components`.** `@utility` entra a la capa
   `utilities` y hereda todo el sistema de variantes (`hover:`, `lg:`, `dark:`) gratis.

---

## 3. Hard rules (NUNCA / SIEMPRE) — cross-dialecto

Estas valen en los tres repos. Las específicas están en cada perfil.

- **NUNCA declares un valor de diseño dentro de `className`.** Ni color, ni px, ni ms, ni rem. El
  valor sale del theme; el theme sale del SSOT. Un valor arbitrario es un token que nadie gobierna,
  invisible para el design system y para el dark mode.
- **El único arbitrario aceptable es una REFERENCIA a un token**, no una declaración: la sintaxis
  `utilidad-(--nombre-de-token)` consume el token; la sintaxis con corchetes y un literal adentro lo
  declara. La primera es legal, la segunda no.
- **NUNCA aliasees un nombre de theme contra sí mismo.** Si el nombre es idéntico a ambos lados de la
  declaración, es una referencia circular: el valor colapsa al inicial del navegador y **el build
  queda verde**. Es la patología más cara del ecosistema; está medida y documentada en ADR-016.
  Ver `references/debugging.md` §P1.
- **NUNCA edites a mano un archivo de theme generado.** Se regenera desde su fuente y hay un gate que
  compara carácter por carácter.
- **NUNCA dejes dos motores de estilo activos en la misma superficie.** O está en CSS propio, o está
  en Tailwind. Convivencia parcial = la colisión que originó ADR-016 (seis en una sola sesión).
- **NUNCA escribas ejemplos de clases dentro de un archivo `.ts`/`.tsx` del árbol escaneado**,
  comentarios incluidos: Tailwind los lee como texto plano y **no ignora comentarios**, así que el
  ejemplo se materializa como utilidad real. Es ADR-016 §6, medido. En `.md` el riesgo es menor pero
  **no nulo** — ver `references/debugging.md` §P5 para qué se materializa y qué no (medido en
  `4.1.17`). Ante la duda: `@source not`, o el ejemplo va fuera del árbol.
- **SIEMPRE** token nuevo → SSOT primero, nunca al revés.
- **SIEMPRE** que una utilidad "no funcione", corré el triage de `references/debugging.md` antes de
  agregar `!important`, subir especificidad o duplicar la regla. Las cinco patologías conocidas se
  ven iguales desde afuera y tienen causas distintas.
- **SIEMPRE** que agregues una familia de utilidades propia, preferí `@utility` funcional con
  `--value()` sobre N utilidades sueltas: una definición cubre theme + bare + arbitrario.

---

## 4. Decisiones frecuentes, resueltas

| Necesito… | Hacé | No hagas |
|---|---|---|
| un color/tamaño/radio nuevo | agregalo al SSOT del repo y regenerá/consumilo desde `@theme` | declararlo en la clase |
| un valor que varía en runtime (JS, estado, dato) | variable CSS en el elemento + utilidad que la referencia | recomputar clases string |
| un patrón repetido de 6 clases | evaluá primero si es un **componente**; si es puramente presentacional y transversal, `@utility` | `@apply` para "limpiar" el JSX |
| estilos en un `<style>` de framework o CSS module | `@reference` a la hoja principal, luego `@apply` | reimportar `tailwindcss` (duplica todo el CSS) |
| una variante propia (tema, data-attr, estado) | `@custom-variant` | selectores ad-hoc en CSS global |
| condicionar por tamaño del contenedor | container queries (`@container` + variantes `@sm:`) | breakpoints de viewport para un componente |
| que una utilidad gane sobre CSS-in-JS | mirá el perfil: en greenhouse-eo el import ya viene con el modificador de importancia | agregar `!` a mano en cada clase |

**Sobre `@apply`:** es la salida de emergencia, no el estilo de la casa. Legítimo en: hojas de terceros
que no podés tocar, CSS modules de un starter-kit heredado, y `@reference` en bloques `<style>`.
Ilegítimo como forma de "ordenar" JSX — ahí perdés el sistema de variantes y creás una capa de
indirección que ningún grep encuentra.

---

## 5. Sinergias — quién decide qué

| Skill | Decide | Frontera con ésta |
|---|---|---|
| `greenhouse-ai-design-studio` | el loop completo de UI nueva, artefactos, gate de score | **Es el orquestador.** Esta skill es un lane suyo; no re-declara el gate ni GVC. |
| `design-system-governance` | qué token existe, se deprecia o cambia; multi-brand | Ella gobierna el **token**; ésta gobierna **cómo el token llega a ser clase**. Token nuevo entra por ella. |
| `css-architect` | cascada, capas, especificidad, `@scope`, anchor, container queries a nivel CSS | Ella es dueña del **CSS que Tailwind emite y con el que convive**. Si el bug es de cascada y no de utilidad, es de ella. |
| `html-react-engineer` | markup semántico y composición del componente | El `className` vive en su JSX; el **contenido** del `className` es de ésta. |
| `modern-ui` | qué patrón visual, qué se ve premium, jerarquía | Decide **qué** construir; ésta **con qué** se escribe. |
| `typography-design` | qué peso, escala, medida, numerales | Ella define la escala; ésta la expresa como namespace `--text-*` / `--font-weight-*` / `--leading-*`. |
| `a11y-architect` | contraste, foco, targets, forced-colors | Un token que no pasa contraste es un problema de ella; que exista como utilidad, de ésta. |
| `motion-design` | duración, curva, coreografía | Ella define el valor; ésta lo expone como `--ease-*` / `--animate-*` y prohíbe la duración literal en la clase. |
| `greenhouse-globe` | producto Globe: spine, capabilities, dispatch, rollout | Dueña del producto; **no** del motor de estilos. Para el payload cliente, ésta + ADR-016. |
| `astro` | integración Astro, islas, build | Ella cablea el plugin; ésta decide el theme y las clases. |

⚠️ **NO** cablees `greenhouse-ux-writing`: gobierna el microcopy del portal, no el estilo. Es un error
frecuente por proximidad de nombre.

---

## 6. Cierre — antes de dar por terminado

- [ ] Cargué el **perfil del dialecto** y respeté su SSOT.
- [ ] Cero valores de diseño literales en `className`. Los arbitrarios que quedan son **referencias**
      a token.
- [ ] Si agregué token: entró por el SSOT, y si el repo genera theme, **regeneré** y el gate pasa.
- [ ] Si agregué utilidad/variante propia: está en `@utility`/`@custom-variant`, no en un CSS suelto.
- [ ] No dejé dos motores activos en la misma superficie.
- [ ] Ningún ejemplo con literal quedó dentro del árbol escaneado.
- [ ] Corrí los gates del perfil (tipografía, color, motion, espaciado, theme generado) y el visual
      diff si migré una superficie.

## Version

- **v1.0** — 2026-07-27 — Pinea Tailwind v4.3 (verificado 2026-07-27), los tres dialectos del
  ecosistema (greenhouse-eo `4.1.17` / efeonce-globe `4.3.3` / efeonce-think `4.3.2`), ADR-016 como
  ley del dialecto Globe, y las cinco patologías de debugging medidas en producción.
