# Perfil: greenhouse-eo — Tailwind sobre MUI

> Repo: `/Users/jreye/Documents/greenhouse-eo` · `tailwindcss@4.1.17` + `@tailwindcss/postcss` +
> `tailwindcss-logical@4.1.0` · Next 16.1.1 App Router · MUI 7.3.6 + Emotion.
> Verificado 2026-07-27. **El runtime manda**: si el `package.json` difiere, gana el `package.json`.

## Lo que hay que entender antes de escribir una clase

Este repo es **híbrido real y en uso activo**, no "MUI con Tailwind residual": **685 de 1.491 `.tsx`
tienen `className`**. Las utilidades más usadas hoy son `flex` (493), `items-center` (149), `gap-4`
(71), `gap-2` (61), `font-medium` (59), `justify-between` (41), `is-full` (40).

⚠️ **Dos skills del inventario afirman lo contrario y están desactualizadas**:
`modern-ui/SKILL.md:173` ("MUI first, Tailwind 4 only if not available") y
`web-design-guidelines/SKILL.md:36` ("this repo is MUI 7 + Vuexy, **not** Tailwind"). Ambas se
escribieron antes de que el uso creciera. No cites ninguna de las dos como razón para no usar Tailwind
acá.

**Reparto de responsabilidades vigente** (descriptivo del código real, y es el que hay que respetar):

| Capa | Dueño | Ejemplo |
|---|---|---|
| Layout, spacing, alineación, gaps | **Tailwind** | `flex items-center gap-4` |
| Componente, variantes, estados, theming | **MUI + Emotion** | `<Card>`, `<Button variant>`, `sx` |
| **Color, tipografía, radios, sombras** | **theme MUI** (SSOT) | `theme.palette.*`, `theme.axis.*` |

Convivir `sx={}` y `className` en el mismo componente es **normal acá**, no un olor. Lo que no es
normal es usar Tailwind para pintar color o tipografía saltándose el theme.

## El SSOT va al revés que en Globe

```
theme MUI (mergedTheme / axis-tokens)  ← SSOT
      ↓  emite CSS vars
--mui-palette-*, --mui-shape-customBorderRadius-*
      ↓  las CONSUME
@theme { --color-primary: var(--primary-color); --radius-sm: var(--mui-shape-…); }
      ↓
utilidades  bg-primary, rounded-sm
```

`src/app/globals.css:6-80` es un `@theme` que **importa desde MUI**, no una fuente de verdad.

- **NUNCA agregues un color/radio nuevo directamente al `@theme` de `globals.css`.** Eso crea un valor
  que el theme MUI desconoce, que no existe en dark mode, que `design:lint` no ve y que el Design
  System no puede catalogar. El token entra por `axis-tokens.ts` (SoT) y **desde ahí** se expone.
- Antes de agregar cualquier token, la dueña es `design-system-governance`. Esta skill solo cablea el
  puente `@theme`.

## Dialecto obligatorio: propiedades lógicas

El plugin `tailwindcss-logical` está activo y **es el idiom del repo** (heredado de Vuexy, y coherente
con el RTL que MUI ya soporta vía `stylis-plugin-rtl`). Las físicas *funcionan* — por eso son
peligrosas: pasan el build y rompen la consistencia.

| Físico (no usar acá) | Lógico (usar) | Uso real en el repo |
|---|---|---|
| `w-full` | `is-full` | 40 |
| `h-full` | `bs-full` | 12 |
| `mb-1` | `mbe-1` | 17 |
| `mb-2` | `mbe-2` | 9 |
| `ml-2` / `mr-2` | `mli-2` (inline) / `mis-2` / `mie-2` | 10 |
| `py-3` | `plb-3` | 4 |
| `px-*` | `pli-*` | — |

`is-` = inline-size · `bs-` = block-size · `mbe-` = margin-block-end · `mli-` = margin-inline (ambos) ·
`mis-`/`mie-` = margin-inline-start/end · `plb-` = padding-block.

**Nota v4.2+:** el core ya trae lógicas nativas (`mbs-*`, `mbe-*`, `pbs-*`, `pbe-*`, `block-*`,
`inline-*`, `inset-s/e/bs/be-*`). El repo está en `4.1.17`, así que hoy vienen del plugin. Si el repo
sube a ≥4.2, revisá si el plugin sigue haciendo falta antes de asumirlo.

## El modificador de importancia ya está puesto — no lo repitas

```css
/* src/app/globals.css:1-4 */
@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme) important;
@import 'tailwindcss/utilities.css' layer(utilities) important;
@plugin 'tailwindcss-logical';
```

El `important` de esos dos imports hace que **toda utilidad Tailwind gane sobre Emotion/MUI** por
diseño (es el patrón del starter-kit Vuexy). Consecuencias:

- **NUNCA agregues `!` a una clase individual** para "ganarle a MUI". Ya ganás. Si no estás ganando,
  el problema es otro — corré el triage de `../references/debugging.md`.
- **Cuidado con el efecto inverso**: una utilidad puesta al pasar puede pisar un estado de MUI
  (hover, disabled, selected) que sí querías. Si un componente MUI deja de reaccionar a un estado,
  sospechá de una utilidad tuya antes que del componente.
- **Preflight NO está importado.** El reset de MUI (`CssBaseline`) es el que manda. No asumas los
  defaults de Tailwind sobre `h1`, `ul`, `button`, etc.

## Utilidades de clases

El util del repo es **`classnames@2.5.1`**. **No hay `clsx`, ni `cva`, ni `tailwind-merge`** — el
idiom shadcn/ui no existe acá. No lo introduzcas para una feature: es una decisión de plataforma, va
por `arch-architect` + `design-system-governance`.

Sin `tailwind-merge`, **dos utilidades del mismo grupo en el mismo elemento no se resuelven por orden
de string**: gana la que la cascada decida. No construyas APIs de componente que concatenen clases
del mismo grupo esperando override.

## Anti-patrones específicos de este repo

1. **Pintar color con Tailwind saltándose el theme.** El color sale de `theme.palette.*` /
   `theme.axis.*` (regla dura del repo, ver `CLAUDE.md` §AXIS). Si necesitás el color en una clase,
   tiene que existir como token del `@theme` puente, y ese token viene del SSOT.
2. **Ejemplos de clases en archivos del repo.** No hay `@source` acotando: la detección escanea el
   árbol respetando `.gitignore`, y `docs/**` + `.claude/skills/**` están trackeados. Medido en
   `4.1.17`: las **clases simples** de un `.md` **sí** se materializan (incluso dentro de un bloque de
   código); los **valores arbitrarios con corchetes**, no. En `.ts`/`.tsx` se materializa todo. Ver
   `../references/debugging.md` §P5.
   **Follow-up abierto:** el portal hoy emite utilidades que solo existen en documentación. Acotarlo
   con `@source not "docs/**"` + `@source not ".claude/**"` en `globals.css` es barato y no tiene
   contraindicación conocida — requiere verificar que ninguna clase productiva viva solo en un `.md`.
3. **Reemplazar un componente MUI por un div con utilidades.** Perdés accesibilidad, estados, RTL y el
   theme. La primitive existente gana; ver `greenhouse-product-ui-architect`.
4. **`@apply` para "limpiar" JSX.** Ver §4 del SKILL. Acá además compite con `sx`, que es el idiom
   nativo para eso.

## Gates de cierre

```bash
pnpm design:lint          # contrato de tokens (bloquea en CI vía design-contract.yml)
pnpm local:check:ui       # lint + tsc + design:lint + build
```

Si la superficie es visual y repetible, además scenario GVC — ver `greenhouse-gvc-playwright` y el
gate del orquestador. Esta skill **no reemplaza** el gate de score de `greenhouse-ai-design-studio`.
