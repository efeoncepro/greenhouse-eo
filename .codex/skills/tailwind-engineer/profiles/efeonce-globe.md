# Perfil: efeonce-globe — Tailwind generado desde `tokens.ts` (ADR-016)

> Repo: `/Users/jreye/Documents/efeonce-globe`, app `apps/studio-client` · `tailwindcss@4.3.3` +
> `@tailwindcss/vite@4.3.3` · Vite 8.1.5 SPA · React 19.2.8 + **React Compiler 1.0.0 (pin exacto)** ·
> **sin Next, sin MUI, sin PostCSS, sin CSS-in-JS**. Verificado 2026-07-27.

**Éste es el dialecto normativo.** Su ley es
`greenhouse-eo/docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md`
(**ADR-016, `Accepted` 2026-07-27, dueño TASK-1485**). La doc gobernante de Globe vive en
**Greenhouse**, nunca en `efeonce-globe/docs/**`.

Contexto que no se negocia: **Globe es un producto comercial de Efeonce** (ADR-010). Su estadio de
rollout es internal-only, pero eso **no autoriza** bajar la vara de infra, UX ni calidad. Estadio ≠
naturaleza.

## El pipeline — SSOT hacia adelante, nunca al revés

```
src/tokens/tokens.ts                    ← SSOT (502 líneas, export GLOBE_TOKENS)
      ↓  src/styles/theme-from-tokens.ts  (themeCss(), clasifica POR REGLA, no por lista)
      ↓  pnpm theme:generate              (scripts/generate-tailwind-theme.mjs)
src/styles/globe-theme.generated.css    ← @theme con valores literales — GENERADO
      ↓  @import desde src/styles/tailwind.css
utilidades
```

Gate: `src/gates/tailwind-theme.test.ts` compara el archivo generado **carácter por carácter** contra
lo que produce el generador. Si olvidaste regenerar, el build está rojo antes del merge.

**`theme:generate` NO corre en el build, a propósito.** Comentario del propio generador: *"un build que
reescribe su propia fuente esconde el cambio en vez de mostrarlo"*. Se corre a mano al tocar un token.

## Cableado del motor

```css
/* src/styles/tailwind.css */
@layer theme, base, legacy, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);
@import './globe-theme.generated.css';
@source not "../**/*.test.ts";
@source not "../**/*.test.tsx";
```

Tres decisiones deliberadas, cada una con su razón medida:

1. **Preflight fuera.** Solo `theme.css` + `utilities.css`. El payload ya tiene reset propio en
   `base.css`; importar preflight sería un segundo reset global sobre superficies que aún están en
   CSS propio.
2. **`legacy` va ENTRE `base` y `components`.** Ponerla primera fue un error **medido**:
   `.capability-button` cayó de 11,52px/600 a 16px/400. El orden se declara antes del primer `@import`.
3. **`@source not` sobre los tests.** Cierra el bug de ADR-016 §6: el gate estaba *emitiendo* los
   literales que prohíbe, porque Tailwind lee los `.ts` como texto plano y **no ignora comentarios**.

## Los namespaces están VACIADOS

```css
@theme {
  --color-*: initial;  --font-*: initial;   --text-*: initial;
  --font-weight-*: initial; --leading-*: initial; --tracking-*: initial;
  --radius-*: initial; --shadow-*: initial; --inset-shadow-*: initial;
  --drop-shadow-*: initial; --ease-*: initial; --animate-*: initial; --blur-*: initial;

  --color-canvas: #030c26;  --color-canvas-raised: #061443;
  --color-surface: rgba(11,26,78,.5);  --color-text: #eaf0ff;
  --color-action: #4db8ff;  --color-warm: #ff6500;  /* … */
}
```

**Consecuencia dura:** la escala de fábrica **no existe acá**. `text-red-500`, `text-lg`,
`rounded-md`, `shadow-sm`, `ease-out` — ninguna se genera. Si escribís una, **no aparece nada** y el
build queda verde. Es la patología P4 de `../references/debugging.md`.

Antes de usar cualquier utilidad tematizada, mirá qué tokens existen:

```bash
grep -o "^\s*'--[a-z0-9-]*'" apps/studio-client/src/tokens/tokens.ts | sort
```

## Las 8 prohibiciones de ADR-016

1. **NUNCA un valor de diseño literal en `className`.** Ni color, ni px, ni rem, ni ms — incluida la
   duración de la escala de fábrica, porque su valor no es del SSOT.
2. **El único arbitrario permitido es una REFERENCIA a token**, no una declaración:
   `duration-(--duration-short)`, `bg-(image:--page-backdrop)`. Con corchetes y literal adentro, no.
3. **NUNCA `@theme inline { --text-xs: var(--text-xs) }`** — nombre idéntico a ambos lados = referencia
   circular. Medido: `text-xs`→16px, `rounded-sm`→0px, `font-display`→Times, **con el build verde**.
4. **NUNCA edites `globe-theme.generated.css` a mano.** Se regenera; el gate lo detecta.
5. **NUNCA documentes un anti-patrón dentro del árbol escaneado** (incluidos comentarios en `.ts`).
6. **NUNCA migres una superficie sin referencia de diff visual previa.**
7. **NUNCA dejes dos motores activos en la misma superficie.** O CSS propio, o Tailwind.
8. **NUNCA importes primitives de Greenhouse, MUI o AXIS** dentro de `apps/studio-client` (sigue de
   ADR-014). Globe tiene su propio sistema; el cruce es una violación de frontera de producto.

Y la positiva: **SIEMPRE token nuevo → `tokens.ts` primero**, nunca al revés.

## Los 4 gates (no 3)

Color · motion · **tipografía** · **espaciado/medidas**. Reescribirlos fue precondición del ADR, no
follow-up. Más el gate del theme generado.

```bash
cd apps/studio-client
pnpm theme:generate     # si tocaste tokens.ts
pnpm test               # incluye src/gates/*.test.ts
```

## Legacy conviviendo — dónde está la frontera hoy

`apps/studio-web/src/producer-ui.ts` son **211 KB / 687 líneas** de CSS-in-TS (`producerStyles`),
inyectadas por `app.ts:2267` dentro de `@layer legacy{…}`. Esa es la superficie **no migrada**.

⚠️ **El ADR va un paso atrás del código.** Declara "motor listo, ninguna superficie migrada", pero los
commits de TASK-1552 (`852b9b1`, `5b7cb3f`, `512dcbc`) indican que la región piloto ya empezó.
**Verificá el estado real antes de afirmarlo** — `git log --oneline -15` y mirá qué superficies
importan de `tailwind.css`.

Referencia obligatoria al migrar el composer:
`greenhouse-eo/docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md` (valores exactos, para migrar
sin reinterpretar) y `architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md` (SSOT del
motion, dueña TASK-1523).

## Notas de React

React Compiler `1.0.0` está **pineado exacto** y activo vía `@rolldown/plugin-babel`. No agregues
`useMemo`/`useCallback`/`React.memo` manuales por performance: el compiler lo hace, y la memoización
manual puede impedirle optimizar. Precondición del ADR-014: `eslint-plugin-react-hooks` v7 limpio.
Para lo demás, ver `html-react-engineer`.
