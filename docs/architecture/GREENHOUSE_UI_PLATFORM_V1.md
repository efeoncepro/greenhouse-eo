# Greenhouse EO — UI Platform Architecture V1

> **Version:** 1.3
> **Created:** 2026-03-30
> **Updated:** 2026-04-20 — v1.3: Floating UI (`@floating-ui/react` 0.27) introducido como stack oficial de positioning para popovers (TASK-509). Primer consumer: `TotalsLadder`. TASK-510 backlog migra el resto. Ver Delta 2026-04-20b abajo.
> **Updated:** 2026-04-20 — v1.2: `TotalsLadder` primitive extiende su API con `addonsSegment?: { count, amount, onClick, ariaExpanded } | null` (TASK-507) para renderizar un segmento interactivo inline dentro de la ladder de ajustes. Pattern: acciones contextuales viven con sus datos, no como chips flotantes separados. Ver Delta 2026-04-20 abajo.
> **Updated:** 2026-04-19 — v1.1: registry de primitives `src/components/greenhouse/primitives/` gana 3 componentes nuevos extraídos de `QuoteSummaryDock` (TASK-505). Ver Delta 2026-04-19 abajo.
> **Audience:** Frontend engineers, UI/UX architects, agents implementing views

---

## Overview

Greenhouse EO es un portal Next.js 16 App Router con MUI 7.x envuelto por el starter-kit Vuexy. Este documento es la referencia canónica de la plataforma UI: stack, librerías disponibles, patrones de componentes, convenciones de estado, y reglas de adopción.

## Delta 2026-05-02 — Copy System Contract (TASK-265)

Toda string visible al usuario en Greenhouse EO vive en una de **dos capas canónicas**, separadas por propósito y locale-aware desde día uno. Cualquier hardcode en JSX es drift y será bloqueado por la rule ESLint `greenhouse/no-untokenized-copy` (modo `error` post cierre TASK-408).

### Las dos capas

| Capa | Path | Propósito | Locale-aware |
|---|---|---|---|
| **Product nomenclature** | `src/config/greenhouse-nomenclature.ts` | Lenguaje propio del producto: Pulse, Spaces, Ciclos, Mi Greenhouse, Torre de control. Navegación. Labels institucionales del shell. | No (es-CL only por design) |
| **Functional shared microcopy** | `src/lib/copy/` (TASK-265) | CTAs base, estados operativos, loading/processing, empty states, meses, aria-labels, errores genéricos, feedback toasts, tiempo relativo. | Sí (`es-CL` default, `en-US` stub para TASK-266) |

### API pública del módulo de microcopy

```ts
import { getMicrocopy } from '@/lib/copy'

const t = getMicrocopy() // default 'es-CL'

// CTAs
<Button>{t.actions.save}</Button>           // 'Guardar'
<Button variant='outlined'>{t.actions.cancel}</Button>  // 'Cancelar'

// Estados
<Chip label={t.states.pending} />           // 'Pendiente'
<Chip label={t.states.approved} />          // 'Aprobado'

// Loading
{isLoading && <Typography>{t.loading.saving}</Typography>}  // 'Guardando...'

// Empty states
<EmptyState
  title={t.empty.firstUseTitle}             // 'Aún no hay nada por aquí'
  hint={t.empty.firstUseHint}               // 'Empieza creando tu primer registro'
/>

// aria-labels
<IconButton aria-label={t.aria.closeDialog}>  {/* 'Cerrar diálogo' */}
  <i className='ri-close-line' />
</IconButton>

// Meses
const monthLabel = t.months.short[monthIndex] // 'Ene' .. 'Dic'
const fullMonth = t.months.long[monthIndex]   // 'Enero' .. 'Diciembre'

// Tiempo relativo (functions)
<span>{t.time.minutesAgo(5)}</span>          // 'Hace 5 minutos'
<span>{t.time.minutesAgo(1)}</span>          // 'Hace 1 minuto'
```

### Decision tree (donde escribir copy nuevo)

```
¿Es product nomenclature (Pulse, Spaces, Ciclos, Mi Greenhouse, Torre de control)?
  → src/config/greenhouse-nomenclature.ts

¿Es navegación, label institucional del shell, o categoría de notificación?
  → src/config/greenhouse-nomenclature.ts (TASK-408 migra notification-categories ahí)

¿Es microcopy funcional reusada en >3 surfaces (CTAs, estados, loading, empty, aria)?
  → src/lib/copy/dictionaries/es-CL/<namespace>.ts
  → Si namespace no existe, agregalo a types.ts + dictionaries/es-CL/index.ts

¿Es copy de dominio específico (e.g., un empty state propio de payroll)?
  → Cerca del dominio (helper o componente) pero PASA por skill greenhouse-ux-writing para validar tono.
```

### Casos por tipo

**1. Product nomenclature** — `greenhouse-nomenclature.ts`

```ts
import { GH_NAVIGATION, GH_NEXA, GH_PRICING } from '@/config/greenhouse-nomenclature'

<MenuItem>{GH_NAVIGATION.spaces}</MenuItem>
```

**2. Shared microcopy** — `src/lib/copy/`

```tsx
import { getMicrocopy } from '@/lib/copy'

const t = getMicrocopy()

<TextField label='Nombre del proyecto' />  // ❌ drift — disparará la rule
<TextField label={t.actions.save} />        // ❌ drift semántico — el label NO es 'Guardar' acá
<TextField label={GH_NAVIGATION.projectName} />  // ✅ si es nomenclature
<TextField label='Nombre del proyecto' />  // ✅ válido si es domain-specific Y pasa por skill greenhouse-ux-writing
```

**3. Domain-specific copy** — cerca del dominio

```ts
// src/lib/payroll/copy.ts (ejemplo)
import type { ChileEmployeeKind } from './types'

export const PAYROLL_DOMAIN_COPY: Record<ChileEmployeeKind, string> = {
  dependent: 'Trabajador dependiente',
  honorarios: 'Boleta a honorarios',
  international: 'Colaborador internacional'
}
```

Esto es válido pero requiere review por skill `greenhouse-ux-writing` para tono.

### Reglas duras

- **NUNCA** duplicar texto entre `greenhouse-nomenclature.ts` y `src/lib/copy/`. Si una string es nomenclatura, vive solo en nomenclature; si es microcopy funcional, vive solo en copy.
- **NUNCA** importar `src/lib/copy/` con `import 'server-only'`. La capa debe ser usable client-side también.
- **NUNCA** agregar namespaces nuevos a `src/lib/copy/` sin que >3 surfaces los reusen.
- **NUNCA** escribir copy nuevo sin invocar la skill `greenhouse-ux-writing` para validar tono es-CL.
- **SIEMPRE** mantener paridad de claves entre todos los locales (`es-CL`, `en-US`). Cuando TASK-266 active i18n real, esa paridad permite traducción sin tocar consumers.

### Enforcement mecánico

ESLint rule `greenhouse/no-untokenized-copy` (TASK-265 Slice 5a) detecta:

| Pattern | Mensaje accionable |
|---|---|
| `aria-label='X'` literal | Use `getMicrocopy().aria.<key>` |
| `{ label: 'Pendiente' }` en status maps | Use `getMicrocopy().states.<key>` |
| `'Cargando...'` / `'Guardando...'` literales | Use `getMicrocopy().loading.<key>` |
| `'Sin datos'` / `'Sin resultados'` literales | Use `getMicrocopy().empty.<key>` |
| `label`/`placeholder`/`helperText`/`title`/`subtitle` literales en JSX | Use `getMicrocopy()` o `greenhouse-nomenclature.ts` |

Excluidos por scope: `src/components/theme/**`, `src/@core/**`, `src/app/global-error.tsx`, `src/app/public/**`, `src/emails/**`, `src/lib/finance/pdf/**`, tests.

Modo: `warn` durante TASK-265 + sweeps TASK-407/408. Promueve a `error` al cierre TASK-408.

### Coordinación con i18n (TASK-266)

`src/lib/copy/` está locale-aware desde día uno (`Locale = 'es-CL' | 'en-US'`). Cuando TASK-266 / TASK-430 active i18n real:

1. Traducir las claves en `src/lib/copy/dictionaries/en-US/<namespace>.ts` (hoy re-exporta es-CL como semilla)
2. Conectar `getMicrocopy(locale)` a la fuente de locale (sesión user, persistencia tenant per TASK-431)
3. La API pública NO cambia → consumers no reescriben nada

### Coordinación con Kortex (Slice 4 — exploratorio)

La separación capas (product nomenclature vs functional microcopy) habilita extracción futura del copy institucional reusable a un paquete compartible con Kortex sin arrastrar lenguaje de producto Greenhouse:

- **Reusable para Kortex** (cuando confirme consumo): `src/lib/copy/` (microcopy funcional shared) + capa institucional de `greenhouse-nomenclature.ts` (login, brand neutral, common actions, categorías genéricas).
- **NO reusable**: metáforas de producto Greenhouse, navegación específica, labels de módulos exclusivos (Pulse, Spaces, Ciclos, Mi Greenhouse, Torre de control).

Esta task (TASK-265) NO crea adapter ejecutable para Kortex; solo deja la separación conceptual y el namespace de microcopy listo para extracción cuando Kortex confirme roadmap de consumo.

### Foundation (TASK-265 entregables)

- `src/lib/copy/types.ts` — tipos canónicos (Locale, MicrocopyDictionary, namespaces)
- `src/lib/copy/dictionaries/es-CL/` — dictionary completo es-CL (9 namespaces seed)
- `src/lib/copy/dictionaries/en-US/` — stub (re-exporta es-CL hasta TASK-266)
- `src/lib/copy/index.ts` — API pública (`getMicrocopy`)
- `eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs` — gate ESLint
- `~/.claude/skills/greenhouse-ux-writing/skill.md` — skill governance (tono, anti-patterns, decision tree)

## Delta 2026-05-01 — Operational Data Table Density Contract (TASK-743)

Toda tabla operativa con celdas editables inline o > 8 columnas vive bajo el contrato de densidad canonico. Resuelve el overflow horizontal contra `compactContentWidth: 1440` de manera declarativa, robusta y escalable.

- **Spec canonica**: [`GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md`](./GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md).
- **Doc funcional**: `docs/documentation/plataforma/tablas-operativas.md`.
- **Primitivas**:
  - `src/components/greenhouse/data-table/density.ts` — tokens de las 3 densidades (`compact` / `comfortable` / `expanded`).
  - `src/components/greenhouse/data-table/useTableDensity.tsx` — hook + provider que resuelve densidad efectiva.
  - `src/components/greenhouse/data-table/DataTableShell.tsx` — wrapper canonico con container queries, sticky-first column, scroll fade.
  - `src/components/greenhouse/primitives/InlineNumericEditor.tsx` — primitiva editable canonica (reemplaza `BonusInput`).
- **Lint gate**: `greenhouse/no-raw-table-without-shell`.
- **Visual regression**: `e2e/visual/payroll-table-density.spec.ts`.

Reglas duras estan en `CLAUDE.md` y `AGENTS.md` (seccion "Operational Data Table Density Contract").

## Delta 2026-04-26b — ESLint 9 flat config (TASK-514)

Migramos `eslint 8.57.1` (legacy `.eslintrc.js`) a **`eslint 9.39.4` con flat config (`eslint.config.mjs`)**. ESLint 8 entró en maintenance mode en 2024; flat config es el default desde 2024 y todos los plugins modernos convergieron a él (`typescript-eslint 8.59`, `eslint-plugin-import 2.32`, `eslint-config-next 16`, `eslint-config-prettier 10`).

### Foundation

- `eslint.config.mjs` reemplaza a `.eslintrc.js` como **única fuente de configuración** del linter.
- Stack actualizado:
  - `eslint@9.39.4`
  - `@eslint/js@9.39.4`
  - `@eslint/eslintrc@^3.3.5` (FlatCompat — disponible para casos edge, no usado en producción).
  - `typescript-eslint@8.59.0` (metapackage flat-ready) + `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`.
  - `eslint-config-next@16.2.4` (provee config flat nativo en `eslint-config-next/core-web-vitals`).
  - `eslint-plugin-import@2.32.0`, `eslint-config-prettier@10.1.8`, `eslint-import-resolver-typescript@4.4.4`.
- Scripts simplificados:
  - `"lint": "eslint ."` (drop `--ext` flag — flat config controla files vía `files` en cada bloque).
  - `"lint:fix": "eslint . --fix"`.

### Reglas custom preservadas 1:1

Las convenciones del repo siguen vigentes sin cambios semánticos:

- `padding-line-between-statements` (var/const/let → blank line; consts → multiline-block-like → blank line; etc.).
- `lines-around-comment` (comment block precedido por blank line; allowBlockStart, allowObjectStart, allowArrayStart).
- `newline-before-return`.
- `import/newline-after-import: { count: 1 }`.
- `import/order` con groups, pathGroups (`react`, `next/**`, `~/**` external before; `@/**` internal).
- `@typescript-eslint/consistent-type-imports: error`.
- `@typescript-eslint/no-unused-vars: error`.
- `jsx-a11y/alt-text`, `react/display-name`, `react/no-children-prop`, `@next/next/no-img-element`, `@next/next/no-page-custom-font`: off (legacy).

### Reglas explícitamente desactivadas (out-of-scope para esta migración)

`eslint-config-next 16` agrega el bundle del **React Compiler / React 19** que introduce reglas estrictas nuevas (pertenecientes a `react-hooks/*`):

- `react-hooks/set-state-in-effect`
- `react-hooks/incompatible-library`
- `react-hooks/refs`
- `react-hooks/preserve-manual-memoization`
- `react-hooks/immutability`
- `react-hooks/static-components`, `component-hook-factories`, `error-boundaries`, `gating`, `globals`, `purity`, `unsupported-syntax`, `use-memo`, `config`, `fbt`, `fire`, `todo`

Quedan **`off`** porque la spec exige migración 1:1 (mismo baseline pre/post). Adoptarlas requiere refactors per-componente coordinados — abrir task aparte cuando el equipo apunte al React Compiler.

`react-hooks/rules-of-hooks` y `react-hooks/exhaustive-deps` (las clásicas) siguen activas como antes.

`import/no-anonymous-default-export` también queda off (nuevo en `eslint-plugin-import 2.32` que dispara sobre `eslint.config.mjs` y otros bundlers config files).

### Composición del config flat

```js
// eslint.config.mjs (resumen)
export default [
  { ignores: [/* generated, vendored, docs, etc. */] },
  ...nextCoreWebVitals,           // Next 16 + react-hooks + jsx-a11y + import (registered)
  ...tseslint.configs.recommended, // typescript-eslint metapackage
  { rules: { /* convenciones del portal */ } },
  { files: ['**/*.ts', '**/*.tsx', 'src/iconify-bundle/**'], rules: { /* TS-only overrides */ } },
  prettierConfig                    // disable rules conflicting with prettier (last)
]
```

**Por qué NO se importa `eslint-plugin-import` directo**: `eslint-config-next/core-web-vitals` ya lo registra. Importarlo otra vez dispara `Cannot redefine plugin "import"`. Las reglas `import/*` (incluido `import/order` y `import/newline-after-import`) viven en el bloque de reglas custom y se evalúan correctamente porque el plugin ya está disponible.

### Files

- `package.json` — bump deps + scripts.
- `eslint.config.mjs` (NUEVO).
- `.eslintrc.js` — DELETED.

### Adopción

- Cualquier nuevo dev override va al objeto custom rules de `eslint.config.mjs` (no agregar archivos `.eslintrc.*` nuevos).
- Para overrides per-directorio, usar bloques flat con `files: ['src/foo/**']` + `rules: { ... }`.
- Para temporalmente silenciar una regla en un archivo concreto, mantener `// eslint-disable-next-line <rule>` (sin cambios — flat config respeta la sintaxis).

## Delta 2026-04-26 — Server state con React Query (TASK-513)

Adoptamos **`@tanstack/react-query` 5.x** como capa canónica de server state del portal. Es el cache layer estándar 2024-2026 (Vercel, Linear, Stripe, Ramp, Notion, Resend, shadcn). Reemplaza progresivamente el patrón `useState + useEffect + fetch` disperso por una cache global con invalidación coordinada, refetch on focus, dedup automático y devtools.

### Foundation

- **Mount canónico**: `src/components/providers/QueryClientProvider.tsx` instancia un `QueryClient` por árbol cliente y monta `ReactQueryDevtools` solo cuando `NODE_ENV !== 'production'`. Lo envuelve `src/components/Providers.tsx` adentro del `ThemeProvider`.
- **Defaults sanos**:
  - `staleTime: 30s` — evita refetch en cada mount.
  - `gcTime: 5min` — libera memoria pero conserva cache mientras navegamos.
  - `refetchOnWindowFocus: true` — vuelta al tab = datos frescos sin ceremonia.
  - `retry: 1` — segunda chance en errores transitorios sin spam.
  - `throwOnError: false` — los consumers renderizan su propio error UI con `query.error` (estilo del portal).
- **Devtools**: solo en development; botón en `bottom-left` para no chocar con el builder dock (top-right) ni con el sonner Toaster.

### Query keys factory

Todos los query keys viven en `src/lib/react-query/keys.ts` siguiendo la convención oficial de TanStack: tuplas tipadas `as const`, una rama por dominio (`finance`, `people`, ...), con `all`, `lists()`, `list(filters)`, `details()`, `detail(id)`. Consumers importan vía:

```ts
import { qk } from '@/lib/react-query'

useQuery({
  queryKey: qk.finance.quotes.list({ status: 'draft' }),
  queryFn: () => fetchQuotes({ status: 'draft' })
})

queryClient.invalidateQueries({ queryKey: qk.finance.quotes.all })
```

**Regla dura**: no inventar query keys ad-hoc en hooks de consumer. La invalidación coordinada depende de tener un solo lugar canónico donde se declaren los keys de cada recurso.

### Hooks canónicos (custom)

Cada recurso server-side tiene su hook custom en `src/hooks/use<Resource>.ts` que envuelve `useQuery` con su queryKey, queryFn y overrides apropiados de cache. Tres ejemplos shipping en V1:

| Hook | Endpoint | Override |
|---|---|---|
| `useQuotesList(filters)` | `/api/finance/quotes` | defaults |
| `usePricingConfig()` | `/api/finance/quotes/pricing/config` | `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus: false` (catalog data) |
| `usePeopleList()` | `/api/people` | defaults |

### Migration cheatsheet

Antes:

```tsx
const [data, setData] = useState<X | null>(null)
const [loading, setLoading] = useState(true)

const load = useCallback(async () => {
  const res = await fetch('/api/x')
  if (res.ok) setData(await res.json())
}, [])

useEffect(() => { void load(); setLoading(false) }, [load])
```

Después:

```tsx
import useX from '@/hooks/useX'

const { data, isPending: loading } = useX()
```

Mutaciones (crear, actualizar, borrar) invalidan el query desde el callback:

```tsx
const queryClient = useQueryClient()

await fetch('/api/x', { method: 'POST', ... })
void queryClient.invalidateQueries({ queryKey: qk.x.all })
```

### Reglas de adopción

- **No migrar todo de un golpe** — adopción es progresiva, slice por slice. Esta task ship 3 ejemplos y deja el patrón documentado.
- **Custom hook por recurso** — no exponer `useQuery` crudo en consumers. El custom hook centraliza el queryKey, queryFn, types y los overrides de cache que el recurso amerita.
- **Invalidación, no refetch manual** — al mutar un recurso, llamar `queryClient.invalidateQueries({ queryKey: qk.<resource>.all })` desde el `onSuccess` de la mutación (no via prop callback al child).
- **`isPending` cubre el "loading inicial"** — cuando ya hay data en cache, el query es "background refresh" y `isFetching` lo refleja sin tumbar el UI.
- **Errores en el consumer** — leer `query.error`; el provider mantiene `throwOnError: false` para no forzar Error Boundaries.
- **Para CRUD optimistic, usar `useMutation`** con `onMutate` + `onSettled` + `setQueryData` — patrón canónico de TanStack.
- **No reintroducir Redux Toolkit / RTK Query** — `@reduxjs/toolkit` y `react-redux` quedan installed pero unused (legacy del Vuexy starter); son candidatos a remover en un follow-up cuando se confirme que ningún flujo del portal los consume.

### Files

- `package.json` — add `@tanstack/react-query@^5.100.5` + `@tanstack/react-query-devtools@^5.100.5`.
- `src/components/providers/QueryClientProvider.tsx` (NUEVO).
- `src/components/Providers.tsx` — wrap children con QueryClientProvider.
- `src/lib/react-query/keys.ts` (NUEVO).
- `src/lib/react-query/index.ts` (NUEVO).
- `src/hooks/useQuotesList.ts` (NUEVO).
- `src/hooks/usePricingConfig.ts` (NUEVO).
- `src/hooks/usePeopleList.ts` (NUEVO).
- `src/views/greenhouse/finance/QuotesListView.tsx` — consume `useQuotesList`.
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` — consume `usePricingConfig`.
- `src/views/greenhouse/people/PeopleList.tsx` — consume `usePeopleList` + `invalidateQueries` desde `CreateMemberDrawer onSuccess`.

### Follow-ups documentados

- SSR hydration patterns (Next 16 App Router + react-query) cuando emerja un consumer que se beneficie del prefetch desde el server component.
- Audit y eventual remoción de `@reduxjs/toolkit` + `react-redux` del `package.json`.
- Migración progresiva del resto de fetches (~100+ lugares) en olas por dominio: finance, hr, agency, admin.
- `useMutation` canónico para los flujos save/issue del Quote Builder con optimistic updates.

## Delta 2026-04-25c — `react-toastify` → `sonner` (TASK-512)

Reemplazamos `react-toastify 11.0.5` por **sonner 2.0** como librería canónica de toasts del portal. Sonner es el estándar 2024-2026 que usan Vercel, Linear, Resend y shadcn: stack visual moderno (pinch effect tipo iOS notifications), bundle ~4 KB (vs ~30 KB de react-toastify), `toast.promise()` integrado, swipe dismiss en mobile, keyboard shortcut `Alt+T`, y theme bridge con CSS vars.

### Mount canónico

`src/components/Providers.tsx` monta `<Toaster />` una sola vez con la configuración global del portal:

```tsx
import { Toaster } from 'sonner'

<Toaster
  position='top-right'
  richColors
  closeButton
  theme='system'
  duration={4000}
/>
```

- `position='top-right'` preserva el placement convención del portal (mismo que tenía `react-toastify` desde antes).
- `richColors` activa el tinted background semántico (success, error, warning, info), alineado con la paleta usada en TASK-505 (summary dock primitives) y TASK-615 (quote builder).
- `closeButton` ofrece dismiss visible.
- `theme='system'` deja a sonner adoptar light/dark según `prefers-color-scheme`.
- `duration={4000}` es el default; consumers individuales sobreescriben con `duration: <ms>` cuando necesitan más o menos tiempo.

### API consumer (95% compatible)

Los 60 consumers existentes solo cambiaron la línea de import:

```diff
- import { toast } from 'react-toastify'
+ import { toast } from 'sonner'
```

`toast.success`, `toast.error`, `toast.info`, `toast.warning` y `toast(...)` siguen funcionando idénticos. Diferencias relevantes con la API de `react-toastify`:

- **`autoClose: <ms>` → `duration: <ms>`** — sonner usa `duration`. Cinco callsites en `QuoteBuilderShell.tsx` migrados.
- **`position` por toast NO existe** — la posición se define globalmente en `<Toaster />`. Los cinco overrides `position: 'bottom-right'` se eliminaron; toda toast usa el placement global `top-right`.
- **`hideProgressBar` no aplica** — sonner no tiene barra de progreso.
- **`toast.promise(fn, { loading, success, error })`** existe nativo en sonner — preferirlo a flujos manuales loading/success/error cuando el async work tiene latencia visible.
- **`toast.dismiss(id?)`** y **`toast.loading(...)`** existen — usar para cancelaciones o estados pendientes.

### Reglas

- **Nunca instalar otro toast container** — el mount global de Providers.tsx es el único.
- **Nunca importar de `react-toastify`** — el package fue removido de `package.json` (TASK-512).
- **Para tests**, mockear `'sonner'` en lugar de `'react-toastify'`:
  ```ts
  vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }
  }))
  ```
- **Theme integration**: sonner respeta CSS vars. No reintroducir wrapper styled como el viejo `AppReactToastify` — `richColors` cubre el caso semántico y el resto fluye con el `<Toaster theme='system' />`.
- **Custom JSX dentro del toast**: `toast.message('título', { description: 'cuerpo' })` reemplaza al `toast.info(<div>...)` con JSX. Evitar JSX inline en toasts.

### Files

- `package.json` — drop `react-toastify@11.0.5`, add `sonner@^2.0.7`.
- `src/components/Providers.tsx` — mount Toaster sonner.
- `src/libs/styles/AppReactToastify.tsx` — DELETED.
- 59 archivos de `src/views/*` — codemod del import.
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` — `autoClose` → `duration`, drop `position` (5 callsites).
- `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx` — mock `'sonner'`.

## Delta 2026-04-25 — Navigation transitions con View Transitions API (TASK-525)

Activamos la **CSS View Transitions API** nativa del browser para transiciones de ruta same-document en App Router. Cero bundle adicional — es API del browser. Es el patrón 2024-2026 que usan Vercel Geist, Astro, Next docs y GitHub Issues redesign.

### Activación

- `next.config.ts` declara `experimental: { viewTransition: true }`. Next 16 expone el flag a App Router para que las navegaciones same-document corran dentro de `document.startViewTransition()` automáticamente.
- Browser support: Chrome 111+ / Edge 111+ / Safari 18+. Firefox sin soporte aún → cae a navegación instantánea sin error.
- `prefers-reduced-motion: reduce` está honrado en dos capas:
  1. `globals.css` aplica `animation: none !important` a todos los `::view-transition-*` cuando reduced-motion está activo.
  2. El helper `startViewTransition` también revisa `matchMedia` antes de invocar al browser, así callers con update functions costosas no pagan ni el snapshot.

### Helper canónico

`src/lib/motion/view-transition.ts` exporta `startViewTransition(update)`:

```ts
import { startViewTransition } from '@/lib/motion/view-transition'

await startViewTransition(() => {
  router.push(`/finance/quotes/${quoteId}`)
})
```

- SSR-safe: detecta `typeof document === 'undefined'`.
- Feature-detection: si `document.startViewTransition` no existe, ejecuta `update()` directo.
- Reduced-motion: short-circuit antes de tomar el snapshot.
- Errores en `update` no propagan al caller (los swallow para no romper la navegación).

### Hook + Link drop-in

- `src/hooks/useViewTransitionRouter.ts` — wrapper de `useRouter()` que envuelve `push`, `replace` y `back` con el helper. Drop-in para handlers programáticos (`onClick={() => router.push(...)}`).
- `src/components/greenhouse/motion/ViewTransitionLink.tsx` — drop-in para `next/link` que intercepta el click izquierdo simple y delega a `router.push` dentro del transition. Modifier-clicks (cmd/ctrl/shift/middle), `target=_blank` y hrefs no-string caen al comportamiento Link nativo.

### Patterns implementados v1

1. **Finance quotes list → detail**: `QuotesListView` aplica `viewTransitionName: 'quote-identity-{quoteId}'` al número de cotización y `quote-client-{quoteId}` al nombre del cliente; `QuoteDetailView` aplica los mismos nombres a su header. El número y el cliente "viajan" de la fila al header.
2. **Quote detail → edit mode**: el botón "Editar" pasa por `useViewTransitionRouter().push` para que el header del detalle se transforme suavemente en el shell del builder.
3. **People list → detail**: `PeopleListTable` aplica `person-avatar-{memberId}` y `person-identity-{memberId}` al avatar 38px y al nombre; `PersonProfileHeader` reusa los mismos nombres en el avatar 80px y el `Typography variant='h5'` del nombre. El browser hace el morph cross-size automáticamente.

### Reglas de adopción

- **No global**: aplicar `viewTransitionName` solo en patterns donde la continuidad visual aporta — list→detail con identidad compartida, header→edit, modal/drawer open. Cualquier click no necesita transition.
- **Nombres únicos**: `viewTransitionName` debe ser único en el documento al momento del snapshot. Usar siempre `{kind}-{id}` con un identificador estable.
- **Programmatic nav**: usar `useViewTransitionRouter` cuando la fila/CTA navega por `onClick={() => router.push(...)}`.
- **Declarative nav**: cambiar `next/link` por `ViewTransitionLink` solo cuando el destino tiene un elemento con `viewTransitionName` que matchee el origen. Para Links sin morph queda `next/link`.
- **No reabrir framer-motion** para esto: View Transitions actúa al nivel del documento; framer-motion sigue siendo válido para microinteracciones dentro del DOM ya nuevo (counters, layout transitions internas).

### Files

- `next.config.ts` — flag `experimental.viewTransition`.
- `src/lib/motion/view-transition.ts` — helper.
- `src/hooks/useViewTransitionRouter.ts` — hook.
- `src/components/greenhouse/motion/ViewTransitionLink.tsx` — Link drop-in.
- `src/app/globals.css` — keyframes `greenhouse-view-transition-fade-{in,out}` + reduced-motion guard.

## Delta 2026-04-20b — Floating UI como stack oficial de popovers (TASK-509 / TASK-510)

### Decisión de plataforma

`@floating-ui/react` (v0.27+) pasa a ser el stack canónico para cualquier popover nuevo en el portal. Reemplaza progresivamente a `@mui/material/Popper` (basado en popper.js v2, legacy 2019). Es el stack que usan en 2024-2026 Linear, Stripe, Vercel, Radix, shadcn, Notion.

**Motivación**:
- Recuperación de stale-anchor vía `autoUpdate` (ResizeObserver + IntersectionObserver + MutationObserver).
- Middleware composable: `offset`, `flip`, `shift`, `size`, `arrow`, `hide`.
- A11y hooks integrados: `useRole`, `useDismiss`, `useClick`, `useHover`, `useFocus`.
- `FloatingFocusManager` con `returnFocus` — reemplaza boilerplate manual.
- `FloatingPortal` — render al document.body evitando stacking context issues.

### Regla canónica

Un primitive con popover interno **es dueño** del state del popover (anchor + open + dismiss + focus). Consumers pasan solo el contenido como `ReactNode`. Never leak state/anchor across component boundaries.

### Pattern estándar para popover primitive

```tsx
import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole
} from '@floating-ui/react'

const MyPopoverPrimitive = ({ content, ...triggerProps }) => {
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ fallbackAxisSideDirection: 'end' }), shift({ padding: 16 })]
  })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context, { outsidePress: true, escapeKey: true }),
    useRole(context, { role: 'dialog' })
  ])

  return (
    <>
      <Trigger ref={refs.setReference} {...getReferenceProps()} {...triggerProps} />
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} returnFocus>
            <Paper ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
              {content}
            </Paper>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  )
}
```

### Middleware defaults

Para popovers enterprise del portal:
- `offset(8)` — separación de 8px entre reference y floating.
- `flip({ fallbackAxisSideDirection: 'end' })` — si no cabe top-start, cae a bottom-end antes que centrar.
- `shift({ padding: 16 })` — mantiene 16px de viewport padding al hacer shift.

Para tooltips (TASK-510 futuro): agregar `hide()` middleware y `useHover` interaction.

### Convivencia temporal

Hasta que TASK-510 complete la migración platform-wide, `@mui/material/Popper` sigue vigente en: `ContextChip`, `AddLineSplitButton`, `AjustesPopover` (del QuoteLineItemsEditor), `QuoteShortcutPalette`. TASK-510 los absorbe uno por uno.

### Consumers actuales (2026-04-20)

- `TotalsLadder` (TASK-509) — segmento inline de addons.

## Delta 2026-04-20 — TotalsLadder `addonsSegment` prop (TASK-507)

Extensión del primitive `TotalsLadder` para soportar un segmento interactivo inline dentro de la ladder de ajustes. Pattern observado en Notion / Linear / Stripe Billing: cuando un ajuste es **clickeable** (abre un detalle), debe vivir con los otros ajustes, no flotar como chip aparte.

### API extendida

```tsx
import { TotalsLadder, type TotalsLadderAddonsSegment } from '@/components/greenhouse/primitives'

<TotalsLadder
  subtotal={2923500}
  factor={1.15}
  ivaAmount={558345}
  total={3921845}
  currency='CLP'
  addonsSegment={{
    count: 1,
    amount: 196134,
    onClick: event => openAddonsPopover(event),
    ariaExpanded: popoverOpen
  }}
/>
```

### Render

El segmento se inserta en la ladder entre `Subtotal` y `Factor`:

```
Total CLP
$3.921.845
Subtotal $2.923.500  ·  ✨ 1 addon $196.134  ·  Factor ×1,15  ·  IVA $558.345
                          ↑ button: hover primary + underline
```

Affordance de botón:
- Hover → `color: primary.main` + `textDecoration: underline` (150ms).
- Focus-visible → outline primary, offset 2px.
- `aria-expanded` refleja el popover state.
- `aria-haspopup='dialog'`.
- `aria-label` full-sentence: `"N addon{s} aplicado{s} por ${formatMoney(amount)}. Abrir detalle."`.

### Copy del segmento

- `count > 0, amount > 0` → `N addon{s} ${formatMoney(amount)}`.
- `count > 0, amount === 0` → `N addon{s}` (sin amount, caso de addons sugeridos sin aplicar).
- `count === 0` → no renderiza (el segmento se omite de la ladder).

### Consumers
- `QuoteSummaryDock` (TASK-507) — reemplaza el chip redondo de zone 3 por este segmento inline.
- Patrón aplicable a: invoice dock, purchase order footer, contract summary — cualquier dock con total + ajustes clickeables.

## Delta 2026-04-19 — Summary dock primitives extraction (TASK-505)

El rediseño del `QuoteSummaryDock` (sticky-bottom del Quote Builder) extrae 3 primitives reusables al registry canónico de primitives del platform:

```
src/components/greenhouse/primitives/
├── ContextChip.tsx              # pre-existente (TASK-487)
├── ContextChipStrip.tsx         # pre-existente (TASK-487)
├── SaveStateIndicator.tsx       # nuevo (TASK-505)
├── MarginHealthChip.tsx         # nuevo (TASK-505)
├── TotalsLadder.tsx             # nuevo (TASK-505)
└── index.ts
```

### `SaveStateIndicator`

Indicador de save lifecycle para docks sticky-bottom o footers de forms enterprise. Render: dot semantic (8 px) + label principal (`body2`) + caption opcional con contexto.

```tsx
import { SaveStateIndicator, type SaveStateKind } from '@/components/greenhouse/primitives'

<SaveStateIndicator
  state='dirty'                    // 'clean' | 'dirty' | 'saving' | 'saved'
  changeCount={2}                  // opcional, solo para 'dirty'
  lastSavedAt={new Date()}         // opcional, solo para 'saved'
/>
```

Estados y color del dot:
- `clean` — gris `action.disabled`.
- `dirty` — `warning.main`. Caption muestra `N cambios`.
- `saving` — `info.main` + `@keyframes save-dot-pulse` 1200ms infinite. Respeta `prefers-reduced-motion` (cae a opacidad fija).
- `saved` — `success.main`. Caption muestra `ahora` / `hace 12s` / `hace 5m` / fecha corta.

A11y: `aria-live="polite"` en el root + `aria-label` full-sentence que combina label principal + caption.

### `MarginHealthChip`

Status chip semantic con 3 niveles (healthy / warning / critical) para KPIs de health (margen de cotización, contract profitability, pipeline margin, etc.). Pattern enterprise Stripe/Ramp: color + icon + label textual + valor + status word en un solo phrase.

```tsx
import { MarginHealthChip, type MarginClassification } from '@/components/greenhouse/primitives'

<MarginHealthChip
  classification='healthy'         // 'healthy' | 'warning' | 'critical'
  marginPct={0.494}                // 0.0–1.0
  tierRange={{ min: 0.4, opt: 0.5, max: 0.6, tierLabel: 'Tier 3' }}  // opcional
/>
```

Render: `Margen · 49,4% · Óptimo` / `Margen · 32,1% · Atención` / `Margen · 12,5% · Crítico`. Background `alpha(color, 0.12)` + border `alpha(color, 0.28)`. Tooltip con tier range al hover si se pasa `tierRange`. Transitions 150 ms emphasized decelerate.

A11y: `aria-label` con full sentence + tier range legible.

### `TotalsLadder`

Total prominent + adaptive ladder para docks de cotización, invoice, purchase order, contract summary. Single source of truth para "monto grande + ajustes opcionales debajo".

```tsx
import { TotalsLadder, type TotalsLadderCurrency } from '@/components/greenhouse/primitives'

<TotalsLadder
  subtotal={2923500}
  factor={1.15}                    // factor país
  ivaAmount={558345}               // IVA calculado
  total={3921845}
  currency='CLP'
  loading={false}
  totalLabel='Total CLP'           // override opcional
/>
```

Render adaptive:
- Si `total === subtotal && factor ∈ {null, 1} && !ivaAmount` → solo el Total.
- Si hay al menos un ajuste → overline `Total {currency}` + `h4` monto (text.primary, tabular-nums, fontWeight 600) + caption muted one-liner: `Subtotal $X · Factor ×1,15 · IVA $Y`.

Loading: `Skeleton variant='text' width=180 height=40`. Respeta `useReducedMotion()` — con reduced motion el total se renderiza estático en vez de con `AnimatedCounter`.

### Regla de primitives

Componentes bajo `src/components/greenhouse/primitives/`:
1. **Sin domain logic** — no importan de `@/lib/finance`, `@/lib/hr`, `@/lib/commercial`. Toman primitivos tipados y renderizan UI.
2. **Tipos se exportan desde `index.ts`** — consumers importan `{ SaveStateIndicator, type SaveStateKind }` del barrel.
3. **Accessible-by-default** — aria-label, aria-live, prefers-reduced-motion.
4. **Tokens canónicos** — no raw hex, no raw px. `theme.shape.customBorderRadius.*`, `theme.palette.*`, `theme.transitions.*`.
5. **Reusables platform-wide** — nombrar en general, no `Quote*`. Si nace Quote-specific, vive en `src/components/greenhouse/pricing/`.

Esta regla se formaliza con TASK-505 y aplica desde TASK-498 (Sprint 3) en adelante.

## Delta 2026-04-11 — Professional profile patterns and certificate preview (TASK-313)

### SkillsCertificationsTab (shared component, dual-mode)

`src/views/greenhouse/hr/certifications/SkillsCertificationsTab.tsx` is a shared tab component used in both self-service (`/my/profile`) and admin (`/people/:slug`) contexts.

| Mode | Trigger | Capabilities |
|------|---------|-------------|
| `self` | User views own profile | Add/edit/delete own certifications, upload certificate file |
| `admin` | HR/admin views a member | All of the above + verification workflow (verify/reject) |

Mode is resolved at render time via props, not via route. The same component renders in both contexts with conditional actions.

### CertificatePreviewDialog

`src/views/greenhouse/hr/certifications/CertificatePreviewDialog.tsx` — dialog for inline preview of uploaded certificate files.

| File type | Render strategy |
|-----------|----------------|
| PDF (`application/pdf`) | `<iframe>` with `src={signedUrl}` inside `DialogContent` |
| Image (`image/*`) | `<img>` with `object-fit: contain` |
| Other | Download link fallback |

Pattern: `Dialog maxWidth='md' fullWidth` with `DialogContent sx={{ minHeight: 400 }}`. The signed URL is fetched on dialog open, not pre-fetched.

### ProfessionalLinksCard and AboutMeCard

Two sidebar cards for the professional profile section of My Profile and Person Detail:

- **ProfessionalLinksCard** — renders social/professional links (LinkedIn, GitHub, Behance, Dribbble, portfolio, Twitter, Threads) as icon buttons. Only links with a non-empty URL are rendered. Edit mode shows `TextField` inputs per link.
- **AboutMeCard** — renders the `about_me` free-text field as a read-only card with an edit dialog. Markdown is not supported; plain text with line breaks.

Both cards reuse `CustomAvatar`, `CustomIconButton`, and the Card+CardContent Vuexy pattern.

### Reuse of VerifiedByEfeonceBadge and BrandLogo

`VerifiedByEfeonceBadge` — compact badge (`Chip` variant) used in certification cards to indicate verification status. States: `verified` (success), `pending_review` (warning), `rejected` (error), `self_declared` (default/muted).

`BrandLogo` — resolves issuer name to a known brand logo. Used in certification cards to display a recognizable issuer icon alongside the certification name. Falls back to a generic certificate icon when the issuer is not in the known-brands catalog.

### Key files

| File | Purpose |
|------|---------|
| `src/views/greenhouse/hr/certifications/SkillsCertificationsTab.tsx` | Shared certifications tab (self/admin) |
| `src/views/greenhouse/hr/certifications/CertificatePreviewDialog.tsx` | PDF/image inline preview dialog |
| `src/views/greenhouse/hr/certifications/CertificationCard.tsx` | Individual certification card with status badge |
| `src/views/greenhouse/people/cards/ProfessionalLinksCard.tsx` | Social/professional links sidebar card |
| `src/views/greenhouse/people/cards/AboutMeCard.tsx` | About me free-text sidebar card |

## Delta 2026-04-10 — Org chart explorer visual stack (TASK-329)

### Decisión de librería

- `@xyflow/react` queda materializado como engine canónico para el organigrama de HR.
- `dagre` queda materializado como layout jerárquico inicial para distribuir nodos del árbol.
- `ApexCharts` se mantiene para charts numéricos; no debe usarse para simular organigramas con nodos React ricos.

### Regla operativa

- El organigrama es una surface de lectura con zoom, pan, foco y quick actions.
- La edición de jerarquía sigue viviendo fuera del canvas, en `HR > Jerarquía`.
- Los nodos deben reutilizar primitives Greenhouse/Vuexy/MUI del portal antes de crear una estética paralela al resto de HR.

## Delta 2026-04-05 — Permission Sets UI patterns (TASK-263)

### Keyboard-accessible interactive cards

Pattern para cards clickeables que abren un panel de detalle. Usado en la lista de sets de permisos.

```tsx
<Card
  role='button'
  tabIndex={0}
  aria-label={`Ver detalle de ${set.setName}`}
  onClick={() => selectItem(set.id)}
  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectItem(set.id) } }}
  sx={{
    cursor: 'pointer',
    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
    '&:hover': { boxShadow: theme => theme.shadows[4] }
  }}
>
```

Regla: toda `<Card>` con `onClick` debe incluir `role="button"`, `tabIndex={0}`, `onKeyDown` y `focus-visible`.

### Confirmation dialogs para acciones destructivas

Pattern estandar para confirmacion antes de eliminar o revocar:

```tsx
<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth='xs' fullWidth aria-labelledby='confirm-title'>
  <DialogTitle id='confirm-title'>¿Eliminar «{itemName}»?</DialogTitle>
  <DialogContent>
    <DialogContentText>Esta acción no se puede deshacer. [consecuencia específica].</DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
    <Button variant='contained' color='error' onClick={handleConfirm}>Eliminar [objeto]</Button>
  </DialogActions>
</Dialog>
```

Reglas:
- Titulo como pregunta con nombre del objeto entre comillas latinas (« »)
- Body describe la consecuencia, no repite el titulo
- Boton destructivo: `variant='contained' color='error'`, label especifico ("Eliminar set", "Revocar acceso")
- Boton cancelar: sin variant (default), siempre "Cancelar"

### Toast feedback pattern (react-toastify)

```tsx
import { toast } from 'react-toastify'

// Success — auto-dismiss
toast.success('Cambios guardados.')
toast.success('Set de permisos creado.')

// Error — persistent
toast.error('No se pudo guardar. Intenta de nuevo.')
```

Regla: toda operacion de escritura exitosa muestra toast de exito. Copy en espanol, sin exclamaciones, confirma que se hizo.

### Autocomplete user picker

Pattern para asignar usuarios desde un buscador en vez de IDs crudos:

```tsx
<Autocomplete
  multiple
  options={availableUsers}
  getOptionLabel={opt => `${opt.fullName} (${opt.email})`}
  isOptionEqualToValue={(opt, val) => opt.userId === val.userId}
  renderInput={params => <TextField {...params} label='Buscar usuarios' placeholder='Escribe un nombre...' size='small' />}
  renderTags={(value, getTagProps) => value.map((opt, i) => <Chip {...getTagProps({ index: i })} key={opt.userId} label={opt.fullName} size='small' />)}
  noOptionsText='No se encontraron usuarios disponibles'
/>
```

Fuente: `GET /api/admin/views/sets/:setId/users?scope=assignable` retorna lista de usuarios activos.

### SECTION_ACCENT shared constant

Mapa de colores por seccion de governance, exportado desde `src/lib/admin/view-access-catalog.ts`:

```tsx
export const SECTION_ACCENT: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'secondary'> = {
  gestion: 'info', equipo: 'success', finanzas: 'warning', ia: 'secondary',
  administracion: 'primary', mi_ficha: 'secondary', cliente: 'success'
}
```

Importar desde `@/lib/admin/view-access-catalog` en vez de duplicar en cada componente.

### Archivos clave

| Archivo | Proposito |
|---------|-----------|
| `src/views/greenhouse/admin/permission-sets/PermissionSetsTab.tsx` | Tab CRUD de sets de permisos |
| `src/views/greenhouse/admin/users/UserAccessTab.tsx` | Tab "Accesos" en detalle de usuario |
| `src/lib/admin/permission-sets.ts` | CRUD + resolucion de Permission Sets |
| `src/lib/admin/view-access-catalog.ts` | VIEW_REGISTRY, GOVERNANCE_SECTIONS, SECTION_ACCENT |

## Delta 2026-04-05 — Vuexy User View Pattern: sidebar profile + tabs (referencia para Mi Perfil)

Patron enterprise de detalle de usuario extraido del full-version de Vuexy (`apps/user/view`). Aplicable a vistas self-service ("Mi *") donde el usuario ve su propia informacion.

### Estructura en Vuexy full-version

```
# Ubicacion: vuexy-admin-v10.11.1/nextjs-version/typescript-version/full-version/

src/app/[lang]/(dashboard)/(private)/apps/user/view/
  page.tsx                          ← entry point: Grid lg=4/lg=8

src/views/apps/user/view/
  user-left-overview/
    index.tsx                       ← contenedor: UserDetails + UserPlan
    UserDetails.tsx                 ← card: avatar 120px, stats, key-value details, Edit/Suspend
    UserPlan.tsx                    ← card: plan info (no aplica a Greenhouse)
  user-right/
    index.tsx                       ← TabContext + CustomTabList pill style
    overview/
      index.tsx                     ← ProjectListTable + UserActivityTimeline + InvoiceListTable
      ProjectListTable.tsx          ← @tanstack/react-table con fuzzy search
      UserActivityTimeline.tsx      ← MUI Lab Timeline
      InvoiceListTable.tsx          ← tabla de facturas
    security/                       ← ChangePassword, RecentDevice, TwoStepVerification
    billing-plans/                  ← CurrentPlan, PaymentMethod, BillingAddress
    notifications/                  ← tabla de notificaciones
    connections/                    ← conexiones sociales
```

### Patron: Sidebar Profile + Tabbed Content

```
┌────────────────┬──────────────────────────────────────────┐
│  SIDEBAR (4)   │  TABS (8)                                │
│                │  [Overview] [Security] [Billing] [...]    │
│  Avatar 120px  ├──────────────────────────────────────────┤
│  Name          │                                          │
│  Role Chip     │  Tab content                             │
│                │  (dynamic() lazy loaded)                 │
│  Stats:        │                                          │
│  ✓ 1.23k tasks │                                          │
│  ✓ 568 projects│                                          │
│                │                                          │
│  Details:      │                                          │
│  Email: ...    │                                          │
│  Phone: ...    │                                          │
│  Status: ...   │                                          │
│                │                                          │
│  [Edit][Suspend]│                                         │
└────────────────┴──────────────────────────────────────────┘
```

### Decisiones de diseno

| Decision | Justificacion |
|----------|---------------|
| Sidebar 4 + Tabs 8 | Identidad siempre visible; content area maximizada para tablas y forms |
| `CustomTabList pill='true'` | Tabs con pill style coherente con el resto del portal |
| `dynamic()` en cada tab | Lazy loading — solo carga el tab activo, mejor performance |
| Stats con `CustomAvatar` + Typography | Patron reusable de Vuexy: icon avatar + numero + label |
| Key-value details con `Typography font-medium` | Patron consistente: label bold + value regular |
| `OpenDialogOnElementClick` para acciones | Dialogs modales para edit/delete/suspend sin navegacion |

### Diferencia con Person Detail View (TASK-168)

| Aspecto | Person Detail View | User View (Mi Perfil) |
|---------|-------------------|----------------------|
| Layout | Horizontal header full-width + tabs below | Sidebar left + tabs right |
| Uso | Admin ve a otro usuario | Usuario ve su propio perfil |
| Actions | OptionMenu con acciones admin | Edit dialog (o read-only) |
| Stats | `CardStatsSquare` en header | Stats inline en sidebar |
| Tabs | 5 tabs domain-oriented (Profile, Economy, Delivery, Assignments, Activity) | Tabs self-service (Resumen, Seguridad, Mi Nomina, Mi Delivery) |

### Cuando aplicar cada patron

- **Person Detail View (horizontal header)**: cuando un admin o manager ve el perfil de OTRA persona. Necesita max content area para tablas de datos ajenos.
- **User View (sidebar + tabs)**: cuando el usuario ve SU PROPIA informacion. La identidad fija en sidebar refuerza contexto personal.

### Componentes core reutilizables (ya migrados)

| Componente | Archivo | Rol en User View |
|-----------|---------|------------------|
| `CustomAvatar` | `src/@core/components/mui/Avatar.tsx` | Avatar 120px rounded en sidebar |
| `CustomTabList` | `src/@core/components/mui/TabList.tsx` | Tabs con pill style |
| `CustomTextField` | `src/@core/components/mui/TextField.tsx` | Inputs en dialogs de edicion |
| `CustomChip` | `src/@core/components/mui/Chip.tsx` | Chip de rol/estado en sidebar |
| `OpenDialogOnElementClick` | `src/components/dialogs/OpenDialogOnElementClick.tsx` | Edit dialog trigger |
| `CardStatsSquare` | `src/components/card-statistics/CardStatsSquare.tsx` | KPIs compactos |
| `TablePaginationComponent` | `src/components/TablePaginationComponent.tsx` | Paginacion en tablas de tabs |

### Task de implementacion

TASK-257 aplica este patron a Mi Perfil (`/my/profile`).

## Delta 2026-04-04 — TanStack React Table: componentes avanzados extraídos de Vuexy full-version

Se extrajeron los patrones avanzados de tabla del full-version de Vuexy como componentes reutilizables.

### Componentes disponibles

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| `EditableCell` | `src/components/EditableCell.tsx` | Celda editable inline con `onBlur` → `table.options.meta.updateData()` |
| `ColumnFilter` | `src/components/ColumnFilter.tsx` | Filtro por columna: texto (búsqueda) o numérico (min/max range) |
| `DebouncedInput` | `src/components/DebouncedInput.tsx` | Input con debounce 500ms para búsqueda global |
| `TablePaginationComponent` | `src/components/TablePaginationComponent.tsx` | Paginación MUI integrada con TanStack |
| `fuzzyFilter` | `src/components/tableUtils.ts` | Fuzzy filter via `@tanstack/match-sorter-utils` |
| `buildSelectionColumn` | `src/components/tableUtils.ts` | Column definition de checkbox para row selection |
| `getToggleableColumns` | `src/components/tableUtils.ts` | Helper para obtener columnas que pueden ocultarse |
| `getColumnFacetedRange` | `src/components/tableUtils.ts` | Helper para obtener min/max de una columna numérica |

### Patrón de tabla full-featured

```tsx
import { fuzzyFilter, buildSelectionColumn, getToggleableColumns } from '@/components/tableUtils'
import EditableCell from '@/components/EditableCell'
import ColumnFilter from '@/components/ColumnFilter'
import DebouncedInput from '@/components/DebouncedInput'
import TablePaginationComponent from '@/components/TablePaginationComponent'

const table = useReactTable({
  data,
  columns: [buildSelectionColumn<MyRow>(), ...myColumns],
  filterFns: { fuzzy: fuzzyFilter },
  globalFilterFn: fuzzyFilter,
  enableRowSelection: true,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
  getFacetedMinMaxValues: getFacetedMinMaxValues(),
  getPaginationRowModel: getPaginationRowModel(),
  meta: {
    updateData: (rowIndex, columnId, value) => {
      setData(old => old.map((row, i) => i === rowIndex ? { ...row, [columnId]: value } : row))
    }
  }
})
```

### TableMeta augmentation

`tableUtils.ts` augmenta `TableMeta` con `updateData` para que `EditableCell` funcione sin type errors:
```typescript
declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    updateData?: (rowIndex: number, columnId: string, value: unknown) => void
  }
}
```

## Delta 2026-04-04 — PeriodNavigator: componente reutilizable de navegación de período

**Archivo**: `src/components/greenhouse/PeriodNavigator.tsx`

Componente compartido para navegación de período mensual (año + mes). Consolida 3 patrones que estaban duplicados en 7+ vistas.

### Variantes

| Variante | Render | Caso de uso |
|----------|--------|-------------|
| `arrows` (default) | `< [Hoy] Abril 2026 >` | Header de cards, vistas de detalle |
| `dropdowns` | `[Año ▼] [Mes ▼] [Hoy]` | Filtros de período en dashboards |
| `compact` | `< Abr 2026 >` | Inline en tablas o espacios reducidos |

### Props

```typescript
interface PeriodNavigatorProps {
  year: number
  month: number
  onChange: (period: { year: number; month: number }) => void
  variant?: 'arrows' | 'dropdowns' | 'compact'  // default: 'arrows'
  minYear?: number          // default: 2024
  maxYear?: number          // default: currentYear + 1
  showToday?: boolean       // default: true
  todayLabel?: string       // default: 'Hoy'
  size?: 'small' | 'medium' // default: 'small'
  disabled?: boolean
}
```

### Uso

```tsx
import PeriodNavigator from '@/components/greenhouse/PeriodNavigator'

<PeriodNavigator
  year={year}
  month={month}
  onChange={({ year, month }) => { setYear(year); setMonth(month) }}
  variant='arrows'
/>
```

### Vistas candidatas a migrar

Las siguientes vistas usan selectores duplicados que deberían migrarse a `PeriodNavigator`:
- `CostAllocationsView` (dropdowns inline)
- `ProjectedPayrollView` (arrows inline)
- `OrganizationEconomicsTab` (dropdowns inline)
- `OrganizationFinanceTab` (dropdowns inline)
- `OrganizationIcoTab` (dropdowns inline)
- `ClientEconomicsView` (dropdowns inline)
- `PersonActivityTab` (dropdowns inline)

### Accesibilidad

- Botones prev/next tienen `aria-label` ("Mes anterior" / "Mes siguiente")
- Tooltips descriptivos en cada control
- Botón "Hoy" indica si ya estás en el período actual
- `disabled` prop deshabilita todos los controles

## Delta 2026-04-03 — Cost Intelligence Dashboard (cost-allocations redesign)

La vista `/finance/cost-allocations` fue rediseñada de un CRUD vacío a un dashboard de inteligencia de costos:

- Tab 1 "Atribución comercial" (default): KPIs con comparativa vs mes anterior + tabla de clientes con drill-down + donut de composición
- Tab 2 "Ajustes manuales": CRUD original preservado para overrides

Patrón aplicado: fetch paralelo de health actual + health período anterior para computar deltas. Las 4 KPI cards usan `HorizontalWithSubtitle` con `trend`/`trendNumber`/`statusLabel`/`footer` siguiendo el patrón canónico documentado abajo.

Para costos: aumento = `'negative'` (rojo), disminución = `'positive'` (verde). Para conteos (clientes, personas): aumento = `'positive'`.

## Delta 2026-04-03 — GreenhouseFunnelCard: componente reutilizable de embudo

**Archivo**: `src/components/greenhouse/GreenhouseFunnelCard.tsx`

Componente de visualización de embudo/funnel para procesos secuenciales con etapas. Usa Recharts `FunnelChart` + `Funnel` (ya instalado, v3.6).

### Props

```typescript
interface FunnelStage {
  name: string
  value: number
  color?: string                                    // Override de color por etapa
  status?: 'success' | 'warning' | 'error'          // Semáforo override
}

interface GreenhouseFunnelCardProps {
  title: string
  subtitle?: string
  avatarIcon?: string                               // Default: 'tabler-filter'
  avatarColor?: ThemeColor                          // Default: 'primary'
  data: FunnelStage[]
  height?: number                                   // Default: 280
  showConversionBadges?: boolean                    // Default: true
  showFooterSummary?: boolean                       // Default: true
  onStageClick?: (stage: FunnelStage, index: number) => void
}
```

### Paleta secuencial por defecto (cuando no hay semáforo)

| Posición | Token | Hex | Razón |
|----------|-------|-----|-------|
| Etapa 1 (tope) | `primary` | `#7367F0` | Punto de entrada |
| Etapa 2 | `info` | `#00BAD1` | Calificación |
| Etapa 3 | `warning` | `#ff6500` | Punto de decisión |
| Etapa 4 | `error` | `#bb1954` | Punto crítico de conversión |
| Etapa 5+ (fondo) | `success` | `#6ec207` | Completación |

### Footer inteligente

Auto-genera dos insights:
1. **Conversión total**: `lastStage.value / firstStage.value × 100`
2. **Etapa crítica**: la etapa con mayor caída % vs anterior. Si todas ≥ 80% → "Flujo saludable"

### Accesibilidad

- `<figure role="img" aria-label="...">` con `<figcaption class="sr-only">` detallando cada etapa
- Respeta `prefers-reduced-motion` desactivando animaciones
- Cada trapezoide tiene 24px mínimo de altura (target de interacción)
- Labels de texto en cada etapa (no depende solo de color)
- Si `onStageClick` presente: etapas focusables con `tabIndex={0}` y `role="button"`

### Casos de uso

- Pipeline CSC (Delivery): Briefing → Producción → Revisión → Cambios → Entrega
- Pipeline CRM: Leads → Calificados → Propuesta → Negociación → Cierre
- Onboarding: Contacto → Propuesta → Contrato → Setup → Activo
- Cualquier proceso secuencial con `FunnelStage[]`

## Delta 2026-04-03 — Helpers canónicos de comparativa + patrones de KPI cards

### Helpers reutilizables de comparativa

Dos archivos canónicos para cualquier vista que necesite mostrar deltas entre períodos o monedas:

**`src/lib/finance/currency-comparison.ts`** — funciones puras, importable desde client Y server:

| Función | Propósito | Ejemplo de uso |
|---------|-----------|----------------|
| `consolidateCurrencyEquivalents(totals, usdToClp)` | Convierte multi-currency `{ USD, CLP }` a totales consolidados CLP y USD | Cards de Nómina, Finance |
| `computeCurrencyDelta(current, compare, rate, label)` | Computa `grossDeltaPct`, `netDeltaPct`, `compareLabel`, `grossReference`, `netReference` | Cards con "vs oficial" o "vs 2026-03" |
| `payrollTrendDirection(deltaPct)` | Para costos: subir = `'negative'`, bajar = `'positive'` | Prop `trend` de `HorizontalWithSubtitle` |
| `formatDeltaLabel(deltaPct, label)` | `"5% vs 2026-03"` | Prop `trendNumber` de `HorizontalWithSubtitle` |

**`src/lib/payroll/period-comparison.ts`** — server-only, queries PostgreSQL:

| Función | Propósito |
|---------|-----------|
| `getPreviousOfficialPeriodTotals(beforePeriodId)` | Último período oficial (`approved`/`exported`) anterior al dado |
| `getOfficialPeriodTotals(periodId)` | Oficial del mismo período |

Patrón de uso en API routes:
```typescript
import { consolidateCurrencyEquivalents } from '@/lib/finance/currency-comparison'
import { getPreviousOfficialPeriodTotals } from '@/lib/payroll/period-comparison'

const previousOfficial = await getPreviousOfficialPeriodTotals(periodId)
const consolidated = consolidateCurrencyEquivalents(totals, usdToClp)
```

Patrón de uso en views (client):
```typescript
import { computeCurrencyDelta, payrollTrendDirection, formatDeltaLabel } from '@/lib/finance/currency-comparison'

const delta = computeCurrencyDelta(current, compareSource, fxRate, 'vs 2026-03')
// → { grossDeltaPct: 5, netDeltaPct: 3, compareLabel: 'vs 2026-03', grossReference: 3120000, netReference: 2800000 }

<HorizontalWithSubtitle
  trend={payrollTrendDirection(delta.grossDeltaPct)}      // 'negative' (costo subió)
  trendNumber={formatDeltaLabel(delta.grossDeltaPct, delta.compareLabel)}  // "5% vs 2026-03"
  footer={`Anterior: ${formatCurrency(delta.grossReference, 'CLP')}`}
/>
```

### Helpers de tendencia para ICO/Delivery

**`trendDelta()`** en `AgencyDeliveryView.tsx` — helper local para comparativas mes-a-mes en trend arrays:

```typescript
// trendDelta(trend, field) → { text, number, direction, prevLabel } | null
// - text: "+3pp vs Mar" (formatted for display)
// - number: "3pp" (absolute delta for HorizontalWithSubtitle.trendNumber)
// - direction: 'positive' | 'negative' | 'neutral'
// - Para RPA (lower is better), direction is INVERTED: decrease = positive
```

### Patrones de cards Vuexy para data storytelling

1. **Hero KPI** (BarChartRevenueGrowth pattern): `Card` con KPI `h3` grande + `CustomChip` trend + mini bar chart ApexCharts. Usar para la métrica principal de cada vista.
2. **Rich KPI** (`HorizontalWithSubtitle` con todas las props): `trend` + `trendNumber` + `statusLabel`/`statusColor`/`statusIcon` + `footer`. Usar para métricas secundarias con comparativa.
3. **Attention card** (accent left border): `Card` con `borderLeft: 4px solid` color semáforo. Usar para items que requieren acción.

### Regla

Toda vista que muestre métricas operativas debe incluir comparativa vs período anterior. No mostrar números aislados sin contexto.

## Delta 2026-03-31 — Shared uploader pattern

`TASK-173` ya deja un patrón canónico de upload para el portal:
- componente shared `src/components/greenhouse/GreenhouseFileUploader.tsx`
- base visual y funcional:
  - `react-dropzone`
  - `src/libs/styles/AppReactDropzone.ts`

Regla de plataforma:
- si una surface del portal necesita adjuntos, debe intentar reutilizar `GreenhouseFileUploader` antes de crear un uploader propio
- la personalización por módulo debe vivir en props, labels, allowed mime types y aggregate context
- no copiar el demo de Vuexy inline en cada módulo

## Delta 2026-03-30 — View Governance UI ya es parte de la plataforma

`/admin/views` ya no debe leerse como experimento aislado.

La plataforma UI ahora asume un patrón explícito de gobernanza de vistas:
- catálogo de superficies gobernables por `view_code`
- matrix por rol como superficie de administración
- preview por usuario con lectura efectiva
- enforcement page-level/layout-level por `view_code`
- auditoría y overrides como parte del mismo módulo

Esto convierte `Admin Center > Vistas y acceso` en un componente de plataforma, no en una pantalla ad hoc.

## Delta 2026-03-30 — capability modules cliente entran al modelo gobernable

La sección `Módulos` del portal cliente ya no debe tratarse como navegación libre derivada solo desde `routeGroups`.

Estado vigente:
- `cliente.modulos` es el access point gobernable del carril `/capabilities/**`
- el menú solo debe exponer capability modules cuando la sesión conserve esa vista
- el acceso al layout dinámico debe pasar dos checks:
  - `view_code` broad del carril (`cliente.modulos`)
  - autorización específica del módulo (`verifyCapabilityModuleAccess`)

Esto deja explícito que los capability modules son parte del modelo de gobierno del portal y no un apéndice fuera de `/admin/views`.

## Delta 2026-03-31 — Person Detail View: Enterprise Redesign Pattern (TASK-168)

La vista de detalle de persona (`/people/:slug`) fue rediseñada como referencia canónica de un patrón enterprise aplicable a cualquier entity detail view del portal.

### Patrón: Horizontal Profile Header + Consolidated Tabs

Reemplaza el patrón anterior de sidebar izquierdo + contenido derecho con:

```
┌──────────────────────────────────────────────────────────────────┐
│  PROFILE HEADER (full-width Card)                                │
│  Avatar(80px) + Name + Role + Email + Integration Chips          │
│  3x CardStatsSquare (FTE, Hrs, Spaces) + Status Chip + ⚙ Admin  │
├──────────────────────────────────────────────────────────────────┤
│  [Tab1] [Tab2] [Tab3] [Tab4] [Tab5]  ← máx 5-6 tabs, sin scroll │
├──────────────────────────────────────────────────────────────────┤
│  Tab content (full-width, Accordion sections)                    │
└──────────────────────────────────────────────────────────────────┘
```

### Decisiones de diseño validadas (research enterprise UX 2026)

| Decisión | Justificación |
|----------|---------------|
| Header horizontal > sidebar | Top-rail layout maximiza content area ([Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)) |
| Tabs consolidados (9→5) | Máx 5-6 tabs evitan overflow; agrupar por dominio lógico |
| Progressive disclosure (Accordion) | "Carefully sequencing when users encounter features" ([FuseLab 2026](https://fuselabcreative.com/enterprise-ux-design-guide-2026-best-practices/)) |
| Campos vacíos omitidos | Reducir ruido: no renderizar "—" dashes en DOM |
| Admin actions en OptionMenu | Quick actions accesibles desde cualquier tab, sin clutterear la UI |
| Integration status con chips | Texto + icon + color (no solo ✓/✗) para WCAG 2.2 AA |
| Legacy URL redirects | Backward-compatible: `?tab=compensation` → `?tab=economy` |

### Componentes del patrón

| Componente | Archivo | Rol |
|-----------|---------|-----|
| `PersonProfileHeader` | `views/greenhouse/people/PersonProfileHeader.tsx` | Header horizontal con avatar, KPIs, admin OptionMenu |
| `PersonProfileTab` | `views/greenhouse/people/tabs/PersonProfileTab.tsx` | 3 Accordion sections: datos laborales, identidad, actividad |
| `PersonEconomyTab` | `views/greenhouse/people/tabs/PersonEconomyTab.tsx` | Compensación card + nómina accordion + costos accordion |
| `CardStatsSquare` | `components/card-statistics/CardStatsSquare.tsx` | KPI pill compacto en headers |

### Cuándo aplicar este patrón

Usar para **cualquier entity detail view** que tenga:
- Identidad (avatar, nombre, estado)
- 4+ secciones de contenido
- Acciones admin contextuales
- Múltiples dominios de datos (HR, Finance, Delivery, etc.)

Candidatos: Organization Detail, Space Detail, Client Detail, Provider Detail.

### Reglas de Accordion en detail views

- `defaultExpanded` solo para la primera sección (la más usada)
- Secciones sin datos no se renderizan (no empty states dentro de accordions)
- Cada accordion header: `Avatar variant='rounded' skin='light'` + `Typography h6` + subtitle
- Divider entre summary y details
- `disableGutters elevation={0}` en el Accordion interno, Card wrapper con border

## Stack Principal

| Capa | Tecnología | Versión | Rol |
|------|-----------|---------|-----|
| Framework | Next.js App Router | 16.1 | Server/client components, routing, layouts |
| UI Library | MUI (Material UI) | 7.3 | Core components, theme system, sx prop |
| Theme Layer | Vuexy Starter Kit | 5.0 | MUI overrides, card patterns, layout system |
| Styling | Emotion + sx prop | 11.14 | CSS-in-JS, no Tailwind en runtime |
| Charts (compact) | ApexCharts | 3.49 | Sparklines, radial bars, donut, heatmaps |
| Charts (dashboard) | Recharts | 3.6 | Full-width charts, multi-series, tooltips |
| Data Tables | TanStack React Table | 8.21 | Sorting, filtering, pagination, row selection |
| Icons | Iconify (Tabler set) | 2.0 | `tabler-*` icon names via Iconify |
| Font | DM Sans | — | `var(--font-dm-sans)`, monospace para IDs |

## Librerías Disponibles — Inventario Completo

### Activamente usadas

| Librería | Archivos que la usan | Para qué |
|----------|---------------------|----------|
| `@mui/material` + `@mui/lab` | 200+ | Core UI: Button, Card, Table, Dialog, Chip, etc. |
| `recharts` | 15+ | Dashboard charts, trend lines, bar comparisons |
| `apexcharts` / `react-apexcharts` | 10+ | KPI sparklines, radial gauges, donut charts |
| `@tanstack/react-table` | 20+ | Tables con sorting, filtering, pagination |
| `react-toastify` | 17 | Toast notifications (success, error, info) |
| `react-perfect-scrollbar` | 10 | Custom scrollbars en sidebar y paneles |
| `react-use` | 7 | Hooks utilitarios (useDebounce, useMedia, etc.) |
| `date-fns` | 10+ | Formateo y manipulación de fechas |
| `@react-pdf/renderer` | 5+ | Generación de PDFs (recibos, reportes) |
| `@react-email/components` | 6+ | Templates de email transaccional |
| `@assistant-ui/react` | 3+ | Nexa AI assistant UI |
| `@sentry/nextjs` | 4 | Error tracking y observability |
| `lottie-react` | 1+ | Animated illustrations en empty states (dynamic import, SSR-safe) |
| `framer-motion` | 1+ | Micro-interacciones numéricas (AnimatedCounter en KPIs) |

### Instaladas pero NO usadas (oportunidad de activación)

| Librería | Paquetes | Potencial | Módulos beneficiados |
|----------|----------|-----------|---------------------|
| **`react-hook-form`** + **`@hookform/resolvers`** | 2 | **Crítico** | Todo form del portal (30+ forms con useState manual) |
| **`@fullcalendar/*`** | 6 (core, daygrid, timegrid, list, interaction, react) | **Alto** | Calendario operativo, leave management, payroll deadlines, sprints |
| **`react-datepicker`** | 1 (usado en 1 archivo) | **Alto** | Date range filters, override expiration, period selectors |
| **`@formkit/drag-and-drop`** | 1 | **Medio** | View reorder, kanban, priority drag |
| **`@tiptap/*`** | 10 (core, react, starter-kit, extensions) | **Medio** | Rich text editor para notas, descripciones, templates |
| **`react-dropzone`** | 1 | **Medio** | File upload (documentos, avatars, attachments) |
| **`react-colorful`** | 1 (usado en 1 archivo) | **Bajo** | Color picker (ya usado mínimamente) |
| **`react-player`** | 1 | **Bajo** | Video playback (Creative Hub futuro) |
| **`@reduxjs/toolkit`** + **`react-redux`** | 2 | **No recomendado** | Server components + useState son suficientes |
| **`@floating-ui/*`** | 2 | **Bajo** | Positioning (MUI Popper ya lo cubre) |

## Vuexy Component System

### Wrappers (@core/components/mui/)

Vuexy envuelve componentes MUI con estilizado consistente:

| Wrapper | MUI Base | Agrega |
|---------|----------|--------|
| `CustomAvatar` | Avatar | Props `color`, `skin` ('light'/'filled'), `size` |
| `CustomChip` | Chip | Prop `round`, tonal variants |
| `CustomTabList` | TabList | Styled tab navigation |
| `CustomTextField` | TextField | Pre-themed input |
| `CustomIconButton` | IconButton | `variant` ('tonal'/'outlined'/'contained') |
| `CustomBadge` | Badge | `tonal` option |

**Regla:** Siempre usar wrappers Vuexy cuando existan en vez de MUI raw.

### Card Statistics (KPI displays)

| Component | Cuándo usar | Props clave |
|-----------|------------|-------------|
| `HorizontalWithSubtitle` | KPI con trend arrow | `title, stats, subtitle, avatarIcon, avatarColor, trend` |
| `HorizontalWithBorder` | KPI con borde inferior coloreado | `title, stats, trendNumber, avatarIcon, color` |
| `HorizontalWithAvatar` | Métrica simple con ícono | `stats, title, avatarIcon, avatarColor` |
| `Vertical` | Métrica centrada con chip | `title, stats, avatarIcon, chipText, chipColor` |
| `StatsWithAreaChart` | Métrica con sparkline | `stats, title, chartColor, chartSeries` |
| `ExecutiveMiniStatCard` | KPI de Admin Center | `title, value, detail, icon, tone` |

### Layout Patterns

| Pattern | Implementación |
|---------|---------------|
| Section header | `ExecutiveCardShell` con `title` + `subtitle` |
| Outlined card | `Card variant='outlined'` |
| Accent border | `borderLeft: '4px solid'` + palette color |
| KPI row (4 cols) | `Box` con `gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }` |
| Content 8/4 split | `Grid` con `xs={12} md={8}` + `xs={12} md={4}` |
| Entity detail view | `Stack spacing={6}` → ProfileHeader → Tabs → TabContent (full-width) |
| Accordion section | `Card border` → `Accordion disableGutters` → `AccordionSummary` (Avatar+h6) → `Divider` → `AccordionDetails` |

### Admin Center Patterns

| Pattern | Componente | Usado en |
|---------|-----------|----------|
| Domain card | `DomainCard` en `AdminCenterView` | Landing de Admin Center |
| Ops action button | `AdminOpsActionButton` | Cloud & Integrations, Ops Health, Notifications |
| Health chip | `Chip variant='tonal'` con color semáforo | Ops Health, Cloud posture |
| Delivery health bar | `LinearProgress` + `Chip` de estado | Notifications, Webhooks |
| View access matrix | `AdminViewAccessGovernanceView` | `/admin/views` |
| Effective access preview | `AdminViewAccessGovernanceView` | `/admin/views` |

## View Governance Architecture

### Objetivo

Separar:
- navegación broad por `routeGroups`
- autorización fina de superficies por `view_code`

La UI debe ayudar a responder tres preguntas:
1. qué ve un rol hoy
2. qué override tiene un usuario
3. qué terminará viendo realmente esa sesión

### Modelo UI canónico

`/admin/views` debe conservar estas capas:
- **hero + KPIs**
  - registrar cobertura
  - exponer drift entre persistido y fallback
- **matrix por rol**
  - editar `granted/revoked`
  - mostrar origen `persisted` vs `hardcoded_fallback`
- **preview por usuario**
  - baseline visible por rol
  - grants extra por override
  - revokes efectivos
  - auditoría reciente
- **roadmap / follow-on**
  - dejar explícito qué parte del modelo sigue transicional

### Tokens semánticos

Convención operativa para la UI:
- `success`
  - concesión activa
  - grant extra
- `warning`
  - cambio pendiente
  - override activo
- `error`
  - revoke efectivo
  - fallback que aún debe modelarse mejor
- `info`
  - baseline persistido o lectura neutra

### Reglas de UX para matrix y preview

1. La matrix no debe presentarse como pared indiferenciada de checks.
2. Debe existir foco explícito para:
   - cambios pendientes
   - fallback heredado
   - impacto efectivo por usuario
3. El preview debe distinguir siempre:
   - baseline por rol
   - override grant
   - override revoke
4. La auditoría visible debe convivir con la edición; no debe quedar escondida fuera del flujo.
5. Si una vista sigue dependiendo de fallback hardcoded, la UI debe hacerlo visible.

### Regla de implementación

Cuando nazca una nueva superficie gobernable:
- agregar `view_code` en `src/lib/admin/view-access-catalog.ts`
- alinear menú si corresponde
- agregar guard page-level o layout-level
- reflejarla automáticamente en `/admin/views`

No abrir nuevas pantallas visibles relevantes sin decidir al menos una de estas dos posturas:
- `tiene view_code propio`
- `queda explícitamente fuera del modelo porque es una ruta base transversal`

### Excepción documentada actual

`/home` queda explícitamente fuera del modelo de `view_code`.

Razón de plataforma:
- es el landing base de internos vía `portalHomePath`
- funciona como shell de arranque para Nexa, quick access y tareas
- su contenido ya se restringe indirectamente por:
  - módulos resueltos
  - notificaciones visibles
  - rutas destino posteriores

Eso significa:
- no debe aparecer en `/admin/views` como vista gobernable por ahora
- no debe bloquearse con `hasAuthorizedViewCode()` mientras siga siendo la entrada transversal segura de la sesión interna

## State Management

### Patrón actual

| Contexto | Mecanismo | Cuándo |
|----------|-----------|--------|
| Server data | Server Components + `async` | Páginas que leen datos (90% del portal) |
| Client interacción | `useState` + `useReducer` | Forms, toggles, modals |
| Sesión | NextAuth JWT | Identity, roles, routeGroups |
| Tema | MUI ThemeProvider | Dark/light mode |
| Toast | `react-toastify` | Feedback transient |
| Operating entity | `OperatingEntityContext` | Tenant switching |

### Patrón recomendado post-activación

| Contexto | Mecanismo | Cuándo |
|----------|-----------|--------|
| Forms complejos | `react-hook-form` | Forms con validación, dirty tracking, error handling |
| Forms simples | `useState` | Toggle, input simple, modal open/close |
| Server data | Server Components | Sin cambio |
| Estado global client | `useState` + Context | Sin cambio (no necesita Redux) |

## Form Architecture

### Situación actual (deuda técnica)

30+ forms en el portal usan `useState` manual:

```typescript
// Patrón actual — verbose, sin validación declarativa
const [email, setEmail] = useState('')
const [error, setError] = useState('')
const handleSubmit = async () => {
  if (!email) { setError('required'); return }
  // ... submit
}
```

### Patrón objetivo con react-hook-form

```typescript
// Patrón enterprise — declarativo, performante
const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
  defaultValues: { email: '' }
})
const onSubmit = handleSubmit(async (data) => { /* ... */ })
// isDirty tracking automático, no re-render por keystroke
```

### Activación real inicial

- `src/views/Login.tsx`
  - migrado a `react-hook-form` como referencia canónica para credenciales
  - **TASK-130**: loading states enterprise-grade, transición post-auth, errores categorizados
- `src/app/(blank-layout-pages)/auth/forgot-password/page.tsx`
  - migrado a `react-hook-form` como segundo ejemplo liviano de auth form
- Helper canónico inicial:
  - `src/lib/forms/greenhouse-form-patterns.ts`
- Regla práctica vigente:
  - wrappers MUI/Vuexy + helpers reutilizables primero
  - no introducir schemas pesados mientras no exista una necesidad real de Zod/Yup

### Auth form loading states & transitions (TASK-130)

Login.tsx implementa un flujo de estados completo para auth:

| Estado | UI | Interacción |
|--------|-----|-------------|
| **Idle** | Form activo, botones habilitados | Usuario puede interactuar |
| **Validating** | `LoadingButton` con spinner, `LinearProgress` top, inputs deshabilitados | Todo deshabilitado |
| **SSO Loading** | Botón SSO con `CircularProgress` + "Redirigiendo a {provider}...", `LinearProgress` | Todo deshabilitado |
| **Transitioning** | Logo + spinner + "Preparando tu espacio de trabajo...", form oculto | Sin interacción |
| **Error** | `Alert` con severity categorizada + botón cerrar, form re-habilitado | Reintentar |

Componentes MUI usados:
- `LoadingButton` (`@mui/lab`) — botón credenciales con spinner integrado
- `CircularProgress` (`@mui/material`) — loading individual por SSO provider
- `LinearProgress` (`@mui/material`) — señal global indeterminada en top del card
- `Alert` con `onClose` — errores categorizados con severity warning/error

Error categorization (`mapAuthError`):
- `CredentialsSignin` → `login_error_credentials` (severity: error)
- `AccessDenied` → `login_error_account_disabled` (severity: error)
- `SessionRequired` → `login_error_session_expired` (severity: error)
- fetch/network errors → `login_error_network` (severity: warning)
- provider timeout → `login_error_provider_unavailable` (severity: warning)

Loading skeleton para resolución de sesión:
- `src/app/auth/landing/loading.tsx` — Next.js loading convention, logo + spinner + "Preparando tu espacio de trabajo..."
- Elimina pantalla en blanco entre login exitoso y dashboard

### Reglas de adopción

1. **Nuevos forms** → siempre `react-hook-form`
2. **Forms existentes** → migrar cuando se toquen por otra task (no migrar proactivamente)
3. **Forms de 1-2 campos** → `useState` sigue siendo aceptable
4. **Validación** → `@hookform/resolvers` con schemas inline (no Zod — no está instalado)

## Calendar Architecture

### Capacidad disponible (sin usar)

FullCalendar está instalado con 6 paquetes:
- `@fullcalendar/core` — motor
- `@fullcalendar/react` — wrapper React
- `@fullcalendar/daygrid` — vista mes/semana
- `@fullcalendar/timegrid` — vista día con horas
- `@fullcalendar/list` — vista lista
- `@fullcalendar/interaction` — drag, resize, click

### Casos de uso en el portal

| Módulo | Vista | Eventos |
|--------|-------|---------|
| HR / Leave | Calendario de permisos | Leave requests, aprobaciones |
| Payroll | Deadlines operativos | Cierre, cálculo, exportación por período |
| Delivery | Timeline de sprints | Ciclos, milestones, deadlines |
| Calendario operativo | Vista unificada | `src/lib/calendar/operational-calendar.ts` ya existe |

### Reglas de adopción

1. Usar `@fullcalendar/react` como wrapper
2. Eventos vienen de server components (no fetch client-side)
3. Colores del semáforo Greenhouse para estados de eventos
4. Locale `es` para labels en español
5. No mezclar con MUI DatePicker para selección de fechas (FullCalendar es para visualización)

### Activación real inicial

- Wrapper canónico:
  - `src/components/greenhouse/GreenhouseCalendar.tsx`
- Primera vista real:
  - `src/app/(dashboard)/admin/operational-calendar/page.tsx`
  - `src/views/greenhouse/admin/AdminOperationalCalendarView.tsx`
- Fuente de datos inicial:
  - `src/lib/calendar/get-admin-operational-calendar-overview.ts`
  - reutiliza `operational-calendar.ts` + `nager-date-holidays.ts`

## Date Handling

### Librerías disponibles

| Librería | Para qué | Cuándo usar |
|----------|----------|-------------|
| `date-fns` | Formateo, parsing, cálculos | Lógica de negocio, formateo en server |
| `react-datepicker` | Input de fecha en forms | Override expiration, filtros de rango |
| `@fullcalendar` | Visualización de calendario | Vistas de calendario completas |

### Timezone canónica

- Base: `America/Santiago` vía IANA del runtime
- Feriados: `Nager.Date` + overrides en Greenhouse
- Helper canónico: `src/lib/calendar/operational-calendar.ts`

### Date picker canónico inicial

- Wrapper:
  - `src/components/greenhouse/GreenhouseDatePicker.tsx`
- Primer uso real:
  - selector mensual en `AdminOperationalCalendarView`
- Criterio:
  - usar este wrapper para inputs de fecha del portal antes de introducir inputs manuales

## Rich Text (disponible, sin activar)

Tiptap está instalado con 10 paquetes pero sin uso. Potencial para:
- Notas en fichas de persona
- Descripciones de proyectos
- Templates de notificación
- Comentarios en revisiones

No activar hasta que un caso de uso lo requiera explícitamente.

## Drag and Drop (disponible, sin activar)

`@formkit/drag-and-drop` está instalado. Potencial para:
- Reorder de vistas en sidebar (TASK-136)
- Kanban de tareas en Delivery
- Priorización visual de backlog
- Reorder de KPIs en dashboards

Activar cuando un caso de uso lo requiera.

### Activación real inicial

- Wrapper canónico:
  - `src/components/greenhouse/GreenhouseDragList.tsx`
- Primer uso real:
  - reorder local de domain cards en `src/views/greenhouse/admin/AdminCenterView.tsx`
- Persistencia inicial:
  - `localStorage`
- Evolución esperada:
  - mover a preferencias de usuario cuando exista contrato shared de layout personalization

## File Upload (disponible, sin activar)

`react-dropzone` está instalado. Potencial para:
- Upload de documentos en HRIS (TASK-027)
- Avatars de usuario
- Attachments en expense reports (TASK-028)
- Import de CSVs

## Convenciones de Código UI

### Imports

```typescript
// 1. React
import { useState } from 'react'

// 2. Next.js
import Link from 'next/link'

// 3. MUI (con wrappers Vuexy cuando existan)
import Button from '@mui/material/Button'
import CustomTextField from '@core/components/mui/TextField'

// 4. Greenhouse components
import { ExecutiveCardShell } from '@/components/greenhouse'

// 5. Greenhouse config
import { GH_MESSAGES } from '@/config/greenhouse-nomenclature'

// 6. Types
import type { OperationsOverview } from '@/lib/operations/get-operations-overview'
```

### Naming

- Views: `Admin{Feature}View.tsx` (e.g., `AdminNotificationsView.tsx`)
- Components: `{Feature}{Type}.tsx` (e.g., `ViewPermissionMatrix.tsx`)
- Pages: `page.tsx` in route directory
- Tests: co-located `*.test.tsx`

### sx Prop (no className, no styled())

```typescript
// Correcto — sx prop
<Box sx={{ display: 'flex', gap: 2, p: 3 }}>

// Incorrecto — className o styled
<Box className="flex gap-2 p-3">
<StyledBox>
```

## Animation Architecture (TASK-230)

### Stack

| Librería | Wrapper | Uso principal |
|----------|---------|---------------|
| `lottie-react` | `src/libs/Lottie.tsx` | Ilustraciones animadas (empty states, loading, onboarding) |
| `framer-motion` | `src/libs/FramerMotion.tsx` | Micro-interacciones (counters, transitions, layout animations) |

Ambas se cargan via dynamic import o `'use client'` re-export para evitar problemas SSR.

### Accesibilidad — prefers-reduced-motion (obligatorio)

Toda animación nueva DEBE respetar `prefers-reduced-motion: reduce`. El hook canónico:

```tsx
import useReducedMotion from '@/hooks/useReducedMotion'
const prefersReduced = useReducedMotion()
// Si true → renderizar estado final sin animación
```

Cuando `prefersReduced` es `true`:
- `EmptyState` muestra el icono estático (fallback `icon`)
- `AnimatedCounter` renderiza el valor final instantáneamente
- Componentes futuros deben seguir el mismo contrato

### Componentes

#### AnimatedCounter

Transición numérica para KPIs. Anima al entrar en viewport (una vez).

```tsx
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'

<AnimatedCounter value={42} format='integer' />           // "42"
<AnimatedCounter value={1250000} format='currency' />      // "$1.250.000"
<AnimatedCounter value={94.5} format='percentage' />       // "94,5%"
<AnimatedCounter value={42} format='integer' duration={1.2} />  // duración custom
```

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `value` | `number` | (requerido) | Valor numérico final |
| `format` | `'currency' \| 'percentage' \| 'integer'` | `'integer'` | Formato de salida |
| `currency` | `string` | `'CLP'` | Código ISO para formato currency |
| `duration` | `number` | `0.8` | Duración en segundos |
| `locale` | `string` | `'es-CL'` | Locale para Intl.NumberFormat |

Para usar dentro de `HorizontalWithSubtitle` (el prop `stats` acepta `string | ReactNode`):

```tsx
<HorizontalWithSubtitle
  title='DSO'
  stats={<><AnimatedCounter value={42} format='integer' /> días</>}
  subtitle='Days Sales Outstanding'
  avatarIcon='tabler-clock-dollar'
  avatarColor='success'
/>
```

#### EmptyState — prop animatedIcon

```tsx
<EmptyState
  icon='tabler-calendar-off'                    // fallback estático (siempre requerido)
  animatedIcon='/animations/empty-inbox.json'   // Lottie JSON path (opcional)
  title='No hay períodos'
  description='Cambia el filtro para ver otros meses.'
/>
```

- Si `animatedIcon` se pasa y carga correctamente → muestra animación Lottie (64×64px, loop)
- Si falla la carga → fallback silencioso al `icon` estático
- Si `prefers-reduced-motion` → siempre muestra `icon` estático

### Assets Lottie

Directorio: `public/animations/`

| Archivo | Uso |
|---------|-----|
| `empty-inbox.json` | Empty states genéricos (sin datos, sin períodos) |
| `empty-chart.json` | Empty states de charts/visualizaciones |

Para agregar assets nuevos:
1. Descargar JSON desde [LottieFiles](https://lottiefiles.com) (formato Bodymovin JSON, no dotLottie)
2. Guardar en `public/animations/` con nombre descriptivo kebab-case
3. Usar colores neutros o de la paleta Greenhouse (los assets se renderizan tal cual)
4. Tamaño recomendado del canvas: 120×120px

### Reglas de adopción

- **Reutilizar `AnimatedCounter`** antes de crear otro componente de transición numérica
- **Reutilizar `useReducedMotion`** para cualquier animación condicional
- **No importar `framer-motion` directo** — usar `src/libs/FramerMotion.tsx` para re-exports centralizados
- **No importar `lottie-react` directo** — usar `src/libs/Lottie.tsx` (dynamic import SSR-safe)
- **Lottie JSON < 50KB** recomendado para cada asset individual
- **No usar GSAP ni Three.js** para micro-interacciones — están fuera del scope de animación UI (Three.js se reserva para TASK-233 logo animation)
- **El prop `animatedIcon` es opt-in** — no reemplazar empty states masivamente sin validación visual

### Pilotos activos

| Vista | Componente | Instancias |
|-------|-----------|------------|
| Finance Dashboard | `AnimatedCounter` | 3 (DSO, DPO, Ratio nómina/ingresos) |
| Finance Period Closure | `EmptyState` + `animatedIcon` | 2 (períodos vacíos, snapshots vacíos) |

## Error Handling & Feedback Patterns (TASK-236)

### Fetch error states

Toda vista que hace `fetch()` client-side DEBE tener un estado `error` con feedback accionable. Nunca dejar un spinner girando indefinidamente.

```tsx
const [error, setError] = useState<string | null>(null)

const loadData = useCallback(async () => {
  setLoading(true)
  setError(null)
  try {
    const res = await fetch('/api/...')
    const json = await res.json()
    setData(json)
  } catch {
    setError('No pudimos cargar los datos. Verifica tu conexión e intenta de nuevo.')
    setData(null)
  } finally {
    setLoading(false)
  }
}, [...])

// En el render:
{loading ? (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
    <CircularProgress />
    <Typography variant='body2' color='text.secondary'>Cargando datos...</Typography>
  </Box>
) : error ? (
  <EmptyState
    icon='tabler-cloud-off'
    title='No pudimos cargar los datos'
    description={error}
    action={<Button variant='outlined' onClick={() => loadData()}>Reintentar</Button>}
  />
) : /* render normal data */}
```

### Mutation feedback (toasts)

Toda mutación (POST, PATCH, PUT, DELETE) debe mostrar feedback via toast:

```tsx
import { toast } from 'react-toastify'

// Después de mutation exitosa:
toast.success('Cambios guardados')

// En catch de mutation fallida:
toast.error('No se pudieron guardar los cambios. Intenta de nuevo.')
```

### Loading text contextual

Los spinners standalone deben incluir texto descriptivo en español:

- "Cargando servicios..." (no solo CircularProgress sin texto)
- "Cargando detalle del servicio..."
- "Calculando métricas ICO..."

### Empty states para tablas vacías

Toda tabla que puede estar vacía debe usar `EmptyState` (no tabla vacía silenciosa):

```tsx
items.length === 0 ? (
  <EmptyState
    icon='tabler-package-off'
    animatedIcon='/animations/empty-inbox.json'
    title='Sin servicios'
    description='No se encontraron servicios con los filtros seleccionados.'
  />
) : /* render table */
```

### Vistas que ya implementan este patrón

| Vista | Error state | Empty state | Toast | Loading text |
|-------|------------|------------|-------|-------------|
| Agency ServicesListView | Retry button | EmptyState animado | — | Contextual |
| Agency ServiceDetailView | Error/not-found | EmptyState | — | Contextual |
| Agency StaffAugmentationListView | Retry button | EmptyState animado | — | Contextual |
| Agency PlacementDetailView | Error/not-found | EmptyState | Onboarding update | Contextual |
| Agency CreatePlacementDialog | Alert inline | — | Placement creado | — |
| Agency Workspace (3 lazy tabs) | Retry button | — | — | Skeletons |

## Breadcrumbs Pattern (TASK-238)

Para vistas de detalle con jerarquía de navegación, usar **MUI Breadcrumbs** en vez de botones "Volver":

```tsx
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from 'next/link'

<Breadcrumbs aria-label='breadcrumbs' sx={{ mb: 2 }}>
  <Typography component={Link} href='/agency?tab=spaces' color='inherit' variant='body2'
    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
    Agencia
  </Typography>
  <Typography component={Link} href='/agency?tab=spaces' color='inherit' variant='body2'
    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
    Spaces
  </Typography>
  <Typography color='text.primary' variant='body2'>
    {detail.clientName}
  </Typography>
</Breadcrumbs>
```

**Reglas:**
- Breadcrumbs reemplazan botones "Volver a X" — no duplicar ambos
- Cada nivel intermedio es un link, el último nivel es texto estático
- `variant='body2'` para tamaño compacto
- Links con `textDecoration: 'none'` y hover underline
- `aria-label='breadcrumbs'` para accesibilidad
- Implementado en: Agency Space 360, Greenhouse Project Detail, Sprint Detail

## Progressive Disclosure Pattern (TASK-237)

Para vistas data-dense con más de 10 tarjetas en scroll vertical, usar **Accordion colapsable** para agrupar secciones secundarias:

```tsx
<Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
  <Accordion disableGutters elevation={0}>
    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <i className='tabler-heartbeat' style={{ fontSize: 20 }} />
        <Typography variant='h6'>Salud de entrega</Typography>
        <CustomChip size='small' round variant='tonal' color='success' label='Mejorando' />
      </Box>
    </AccordionSummary>
    <AccordionDetails>
      {/* contenido colapsable */}
    </AccordionDetails>
  </Accordion>
</Card>
```

**Reglas:**
- KPIs primarios siempre visibles (no colapsar)
- Charts siempre visibles (no colapsar)
- Scorecards/tablas siempre visibles
- Reports detallados → Accordion colapsado por defecto
- Cada Accordion summary muestra chip con estado/resumen para que el usuario sepa si vale la pena expandir
- Implementado en: Agency ICO Engine tab (3 Accordions para performance report)

## Delta 2026-04-06 — Mi Perfil rich view: Vuexy user-profile pattern (TASK-272)

### Patron aplicado

`/my/profile` implementa el patron de user-profile de Vuexy (`full-version/src/views/pages/user-profile/`) adaptado a un contexto read-only con datos reales del portal.

Se copiaron y adaptaron 9 componentes del full-version en `src/views/greenhouse/my/my-profile/`:

```
src/views/greenhouse/my/my-profile/
  MyProfileView.tsx                 ← orchestrator: fetch paralelo + transformacion + tabs
  MyProfileHeader.tsx               ← gradient banner + avatar + nombre/cargo/departamento
  profile/
    AboutOverview.tsx               ← tab Perfil: "Sobre mi" + contacto + actividad + equipos + colegas
    ActivityTimeline.tsx            ← styled MUI Timeline con solicitudes de permisos
    ConnectionsTeams.tsx            ← cards de equipo y colegas
  teams/                            ← tab Equipos: espacios/clientes asignados
  projects/                         ← tab Proyectos: TanStack table con fuzzy search
  connections/                      ← tab Colegas: miembros del departamento/organizacion
```

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  PROFILE HEADER (full-width)                                     │
│  Gradient banner + Avatar + Nombre + Cargo + Departamento        │
│  Fecha de ingreso + Badges (FTE, equipo, etc.)                   │
├──────────────────────────────────────────────────────────────────┤
│  [Perfil] [Equipos] [Proyectos] [Colegas] [Seguridad]           │
├──────────────────────────────────────────────────────────────────┤
│  Tab content (full-width)                                        │
└──────────────────────────────────────────────────────────────────┘
```

### Tabs

| Tab | Contenido | Componente |
|-----|-----------|------------|
| Perfil | Sobre mi, Contacto, Actividad reciente (timeline), Equipos, Colegas | `AboutOverview` + `ActivityTimeline` + `ConnectionsTeams` |
| Equipos | Espacios/clientes donde esta asignado | teams components |
| Proyectos | Proyectos con progreso y detalle (TanStack table + fuzzy search) | projects components |
| Colegas | Miembros del mismo departamento/organizacion | connections components |
| Seguridad | Configuracion de seguridad (pendiente) | placeholder |

### Data fetching

4 APIs en paralelo desde `MyProfileView.tsx`:

| API | Datos |
|-----|-------|
| `GET /api/my/profile` | person_360: nombre, cargo, departamento, fecha ingreso, contacto |
| `GET /api/my/assignments` | asignaciones activas a espacios/clientes |
| `GET /api/my/leave` | solicitudes de permisos (para activity timeline) |
| `GET /api/my/organization/members` | miembros del departamento/organizacion |

La capa de transformacion en `MyProfileView.tsx` mapea las respuestas de API a props compatibles con los componentes Vuexy adaptados.

### Patron de adaptacion Vuexy → Greenhouse

1. **Copiar** componentes del full-version (`src/views/pages/user-profile/`)
2. **Adaptar** con datos reales del portal (reemplazar datos mock)
3. **Traducir** labels a espanol
4. **Remover** features interactivas no aplicables (connect/disconnect, OptionMenu) para contexto read-only
5. **Preservar** la estructura visual y patrones de MUI/Vuexy

### Componentes Vuexy reutilizados

| Componente Vuexy | Uso en Mi Perfil |
|-------------------|------------------|
| `CustomAvatar` | Avatar en header |
| `CustomChip` | Badges de estado, departamento |
| `CustomTabList` | Tabs con pill style |
| MUI `Timeline` (Lab) | Activity timeline con solicitudes |
| TanStack `useReactTable` + `fuzzyFilter` | Tabla de proyectos con busqueda |

### Diferencia con Person Detail View (TASK-168)

| Aspecto | Person Detail View | Mi Perfil (TASK-272) |
|---------|-------------------|---------------------|
| Layout | Horizontal header + accordions | Gradient banner header + tabs |
| Modelo Vuexy | `apps/user/view` (sidebar + tabs) | `pages/user-profile` (banner + tabs) |
| Uso | Admin ve perfil de OTRA persona | Usuario ve SU propio perfil |
| Interacciones | OptionMenu con acciones admin | Read-only, sin acciones admin |
| Datos | person_360 completo (admin scope) | person_360 propio + asignaciones + permisos |

## Anti-Patterns

- No usar MUI raw cuando existe wrapper Vuexy
- No usar Tailwind classes en runtime (solo PostCSS para global)
- No usar `elevation > 0` en cards internas (usar `variant='outlined'`)
- No mezclar español e inglés en la misma surface
- No hardcodear colores — siempre `theme.palette.*`
- No crear stat displays custom cuando un card-statistics component sirve
- No usar Redux para estado local — `useState` o `react-hook-form`
- No instalar librerías nuevas sin verificar si ya están disponibles en este inventario
- No importar `lottie-react` o `framer-motion` directo — usar los wrappers en `src/libs/`
- No crear animaciones que ignoren `prefers-reduced-motion` — usar `useReducedMotion` hook
