# SOURCES — tailwind-engineer

> **Regla:** nunca afirmes de memoria qué versión, utilidad o feature existe. Si el `Verified` de la
> fila tiene más de ~3 meses y la afirmación es load-bearing, reverifica con `WebFetch` a la fuente
> oficial y actualiza el `as-of` inline en la skill.
>
> **Última revisión completa: 2026-07-27.**

## Tabla de volatilidad

| Tema | Volatilidad | Reverificar antes de afirmar… | Dónde vive |
|---|---|---|---|
| Mecánica CSS-first (`@theme`, namespaces, capas, `@utility`) | **estable** | — (no cambió desde v4.0) | `references/v4-directives.md` |
| Catálogo de utilidades disponibles | **volátil (por minor)** | "esa utilidad no existe" / "hay que hacerla a mano" | `SOURCES` ↓ |
| Versión instalada por repo | **volátil** | cualquier cosa versión-dependiente → lee el `package.json`, no esta tabla | `profiles/*.md` |
| Dialecto/SSOT de cada repo | **semestral** | el SSOT o el gate de un repo → verifica contra el runtime | `profiles/*.md` |
| ADR-016 (ley del dialecto Globe) | **por task** | estado de migración de superficies → el ADR va un paso atrás del código | ver §ADR-016 |
| Patologías de debugging | **estable** | — (son propiedades del motor, medidas) | `references/debugging.md` |

## Fuentes

| Fuente | Qué se tomó | Verified |
|---|---|---|
| [Tailwind CSS v4.3 blog](https://tailwindcss.com/blog/tailwindcss-v4-3) | v4.3 (rel. **2026-05-08**): utilidades de scrollbar (`scrollbar-thin/auto/none`, `scrollbar-thumb-*`, `scrollbar-track-*`, `scrollbar-gutter-*`), `@container-size`, `zoom-*`, `tab-*`, `@variant` apilado y compuesto, valores por defecto en utilidades funcionales vía `--default()` | 2026-07-27 |
| [Tailwind CSS v4.2](https://tailwindcss.com/blog/tailwindcss-v4-3) (misma nota) | v4.2: paletas `mauve`/`olive`/`mist`/`taupe`; plugin webpack de primera clase (**2.17x** vs PostCSS); lógicas extendidas (`mbs-*`, `mbe-*`, `pbs-*`, `pbe-*`, `block-*`, `inline-*`, `inset-s/e/bs/be-*`, `border-bs/be-*`, `scroll-mbs-*`…); `font-features-*` | 2026-07-27 |
| [Functions & directives](https://tailwindcss.com/docs/functions-and-directives) | `@import`, `@theme`, `@source`, `@utility`, `@variant`, `@custom-variant`, `@apply`, `@reference`, `@config`, `@plugin`; funciones `--alpha()`, `--spacing()`, `theme()` (deprecada) | 2026-07-27 |
| [Theme variables](https://tailwindcss.com/docs/theme) | opciones `inline` / `static` / (default); reset por namespace `--<ns>-*: initial` y reset total `--*: initial`; lista completa de namespaces; el gotcha de scoping que resuelve `inline` | 2026-07-27 |
| [Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles) | `@utility` simple y funcional; formas de `--value()` (namespace / bare tipado / literal / `[tipo]`); `--modifier()`; `--default()`; negativas con `-*`; fracciones con `ratio`; `@utility` vs `@layer components` | 2026-07-27 |
| [Tailwind v4.1](https://tailwindcss.com/blog/tailwindcss-v4-1) | text-shadow, masks (contexto de qué entró antes) | 2026-07-27 |

## Evidencia del ecosistema (runtime > doc)

Verificado por inspección directa **2026-07-27**. **El runtime manda**: si esto no coincide con el
`package.json` que estás leyendo, gana el `package.json` y hay que actualizar esta tabla.

| Repo | tailwindcss | Motor | SSOT del theme | Config JS |
|---|---|---|---|---|
| `greenhouse-eo` | `4.1.17` (+ `@tailwindcss/postcss` `4.1.17`, `tailwindcss-logical` `4.1.0`) | PostCSS | **theme MUI** (`--mui-palette-*` → `@theme`) | no |
| `efeonce-globe/apps/studio-client` | `4.3.3` (+ `@tailwindcss/vite` `4.3.3`) | Vite | **`src/tokens/tokens.ts`** → `pnpm theme:generate` | no |
| `efeonce-think` | `4.3.2` (+ `@tailwindcss/vite` `4.3.2`) | Vite (Astro) | ninguno (valores literales a mano) | no |

Notas load-bearing:
- **Ninguno de los tres tiene `tailwind.config.*`.** Una respuesta que emita config JS está fuera de
  contrato en los tres.
- **Ninguno tiene `clsx`, `cva`/`class-variance-authority` ni `tailwind-merge`.** El idiom shadcn/ui
  **no existe en este ecosistema**. `greenhouse-eo` usa `classnames@2.5.1`.
- `greenhouse-eo` importa `theme.css` + `utilities.css` con el modificador de importancia (para ganar
  a Emotion) y **no importa preflight**. `efeonce-globe` tampoco importa preflight (reset propio).
  `efeonce-think` sí (`@import 'tailwindcss'` completo).

## ADR-016 — ley del dialecto Globe

`docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md` —
`Accepted` 2026-07-27, dueño `TASK-1485`, supersede parcialmente ADR-014 (solo el motor de estilos).
Es la fuente normativa del perfil `efeonce-globe`. **Reverifica el estado de migración antes de
afirmarlo**: el ADR declara "motor listo, ninguna superficie migrada", pero los commits de TASK-1552
indican que la región piloto ya empezó — el documento va un paso atrás del código.

## Mitos que NO se citan

- **"Tailwind hincha el HTML / no escala."** El argumento es de la era de purge por regex; en v4 la
  detección es del motor y el CSS emitido es proporcional a lo usado. Si vas a objetar Tailwind,
  objeta algo medible en el repo, no esto.
- **"`@apply` es la forma de hacer componentes."** Fue un patrón de v1-v3 que la propia doc desalienta;
  entra a la capa equivocada y pierde variantes. Ver §4 del SKILL.
- **"Hay que declarar `content` / configurar purge."** No en v4.
- **"Tailwind y un design system son incompatibles."** En este ecosistema el theme **es** el design
  system: `@theme` es el punto donde el token se vuelve utilidad.
