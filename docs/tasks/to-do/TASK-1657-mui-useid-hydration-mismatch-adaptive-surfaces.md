# TASK-1657 — Hardening de UI Platform destapado por TASK-1308

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `hardening`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `develop` (Greenhouse; sin worktrees)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Dos defectos de PLATAFORMA que `TASK-1308` destapó y cerró con parches locales, dejando la
causa raíz viva para cualquier superficie futura. Van juntos porque son el mismo trabajo:
misma capa (UI Platform), mismos archivos vecinos (`src/libs/styles`, `primitives/`), mismo
perfil y mismos gates de cierre. Partirlos habría duplicado lifecycle y cierre documental
para día y medio de trabajo.

**(A) Mismatch de hidratación por `useId`.** Todo control MUI de formulario que viva dentro del subárbol de una surface recipe puede
producir **mismatch de hidratación**: el `htmlFor` del label lo deriva MUI de `useId`, y
`useId` calcula el identificador desde la RUTA DEL ÁRBOL — que no es la misma en servidor
y en cliente cuando la recipe adapta su composición midiendo el contenedor. Reproducible
sólo en anchos donde la adaptación cambia el árbol (390px en el caso fuente).

**(B) Los findings inevitables de `ui:code-lint` en charts.** `raw-hex` e `inline-font-size`
son estructuralmente imposibles de evitar en un chart a canvas: los HEX son los fallbacks
obligatorios de `resolveChartColor` (con `cssVariables: true` el theme devuelve una CSS var
que un canvas no sabe pintar) y los `fontSize` son config de canvas, donde una variante de
Typography no aplica. Los arrastran `SeoRankEvolutionChart` (11) y `KeywordOpportunityMap`
(15), y los arrastrará todo chart nuevo.

## Why This Task Exists

### (A) — hidratación

Encontrado en `TASK-1308` (`/admin/growth/seo/keywords`) por el gate de runtime del GVC,
tras **tres corridas** con el mismo síntoma intermitente. El mensaje de React llega truncado
en el manifest; el elemento sólo apareció extrayendo el `trace.zip`:

```
+ htmlFor="_R_4plaalctd9bn5ritpet5rl8nlknelb_"
- htmlFor="_R_j6l9aljll5esnebn5rknel2nlknelb_"
```

Se cerró **declarando ids estables en los cinco controles de esa pantalla** — el remedio
correcto para esos controles, pero un parche por superficie. La causa raíz sigue viva y no
tiene detección: cualquier `CustomTextField`, `CustomAutocomplete`, `Select` o
`TablePagination` dentro de una recipe adaptativa puede reintroducirlo, y **sólo se ve en
el viewport donde la adaptación cambia el árbol**.

⚠️ El síntoma es engañoso: aparece intermitente y se confunde con un artefacto de Fast
Refresh del dev server (durante TASK-1308 se descartó como tal dos veces antes de
reproducirlo dos corridas seguidas).

### (B) — el gate que dejó de significar algo

El costo real de los findings de chart no es el ruido: es que **un equipo que ve 15 hallazgos
esperados en cada chart deja de leer la salida**, y el día que aparezca un HEX que sí es
deuda va a pasar desapercibido. El linter ya tiene el concepto que falta —
`CANONICAL_COLOR_SOURCE_FILES`, la allow-list de archivos donde el literal es legítimo— pero
no hay un módulo de tokens de canvas que pueda entrar en ella.

## Goal

**(A)**

- Determinar si la causa es la recipe/CompositionShell (render distinto en cliente) o el
  propio contrato de `useId` bajo `dynamic(ssr:false)`, con evidencia.
- Cerrarlo en el PRIMITIVE, no por consumer: o la recipe deja de alterar el árbol entre
  pasadas, o los wrappers `Custom*` derivan ids deterministas.
- Detección: que un consumer nuevo no pueda reintroducirlo en silencio.

**(B)**

- Un módulo canónico con los fallbacks de color y la escala de `fontSize` del canvas.
- Los dos charts vigentes consumiéndolo, sin literales propios y **sin cambio visual**.
- El módulo en la allow-list del linter con su razón; los charts NUNCA.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/ui-platform/PRIMITIVES.md` — contrato de primitives y wrappers `Custom*`.
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` — la recipe y su adaptación.
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` — `quality.runtime.failOnHydrationWarning`.

Reglas obligatorias:

- **NUNCA** cerrarlo con `suppressHydrationWarning`: apaga el detector, no el defecto.
- **NUNCA** resolver la adaptación con `useMediaQuery` en el camino del render — es la misma
  familia de bug (medir en cliente lo que el servidor no sabe).
- El fix vive en el primitive; declarar ids por consumer se queda como cinturón, no como
  solución.
- **NUNCA** meter los archivos de chart a `CANONICAL_COLOR_SOURCE_FILES`: eso apagaría el
  gate justo donde hay que vigilarlo. Lo que entra es el MÓDULO de tokens, no sus consumers.
- Los fallbacks siguen siendo fallbacks: el valor vivo sale del theme vía `resolveChartColor`.
  El HEX es el plan B para cuando el theme devuelve una CSS var que el canvas no entiende.

## Normative Docs

- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/tasks/complete/TASK-1308-growth-seo-keyword-opportunities-ui.md` (caso fuente)

## Dependencies & Impact

### Depends on

- Ninguna. Es hardening de plataforma.

### Blocks / Impacts

- (A) Cualquier superficie con formulario dentro de una recipe. El blast radius es el portal.
- (B) `TASK-1309` (site audit UI) y `TASK-1310` (dashboard cliente) traen charts nuevos:
  cerrarlo antes evita que nazcan con la misma deuda.

### Files owned

- `src/components/greenhouse/primitives/surface-system/**`
- `src/@core/components/mui/TextField.tsx` · `Autocomplete.tsx` [verificar]
- `src/libs/styles/chart-tokens.ts` (nuevo) [verificar nombre canónico]
- `src/views/greenhouse/admin/growth/seo/performance/SeoRankEvolutionChart.tsx`
- `src/views/greenhouse/admin/growth/seo/keywords/KeywordOpportunityMap.tsx`
- `scripts/ci/ui-code-lint.mjs` (allow-list + regla de detección de ids)

## Current Repo State

### Already exists

- `TASK-1308` cerró sus cinco controles con ids declarados (`seo-keywords-*`) — patrón a
  generalizar o a reemplazar.
- El GVC ya detecta el síntoma (`failOnHydrationWarning: true`), pero sólo si el scenario
  captura el viewport donde ocurre.

### Gap

- No hay lint ni test que impida un control sin id dentro de una recipe.
- No está determinado si la recipe altera el árbol o si el disparador es otro.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `src/components/greenhouse/primitives/surface-system/**` + wrappers `src/@core/components/mui/**` (portal Next.js)
- Future candidate home: `ui-package`
  - Contrato de primitives: mismo destino que el resto de la UI Platform. Metadata de diseño; no autoriza crear el paquete.
- Boundary: (A) el fix vive en la recipe o en los wrappers `Custom*`; los consumers NO declaran ids como solución (sólo como cinturón heredado de TASK-1308). (B) el módulo de tokens es la ÚNICA fuente de fallbacks de canvas; sólo él entra a la allow-list del linter.
- Server/browser split: **es el corazón del problema** — el defecto nace de que el árbol renderizado en servidor difiere del de cliente. Cualquier arreglo tiene que producir el MISMO árbol en las dos pasadas, no compensar la diferencia.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

`Backend impact: none` — es hidratación de UI. No toca schema, reader, command ni ruta API.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reproducir y aislar

- Scenario GVC mínimo con un `CustomTextField` dentro de una recipe, a 390px, sin nada más.
- Confirmar con `trace.zip` cuál es el nodo y qué difiere.
- Determinar el disparador: adaptación de la recipe vs `dynamic(ssr:false)` vs otro.

### Slice 2 — Cerrar en el primitive

- Según el hallazgo: estabilizar el árbol de la recipe entre pasadas, o derivar ids
  deterministas en los wrappers `Custom*`.

### Slice 3 — Detección

- Regla en `ui-code-lint` o test de plataforma que falle si un control de formulario dentro
  de una recipe no declara `id`.
- Barrido del portal: cuántas superficies están expuestas hoy.

### Slice 4 — (B) Tokens de canvas

- `chart-tokens.ts` con fallbacks de color y escala de `fontSize` derivada del SoT
  tipográfico, cada valor con su razón.
- Los dos charts vigentes lo consumen; cero literales propios.
- El módulo entra a la allow-list con su comentario; los charts no.
- GVC de ambas rutas: los charts se ven IGUAL. Si algo cambia, es bug de la migración.

**Independiente de los slices 1-3**: puede cerrarse aunque la investigación de (A) quede
abierta. Es aditivo e inerte.

## Out of Scope

- Rediseñar la recipe o CompositionShell.
- Cambiar colores o tamaños de los charts: (B) es refactor, no rediseño.
- Tocar las superficies ya parchadas (TASK-1308) más allá de simplificarlas si el fix del
  primitive las hace innecesarias.

## Detailed Spec

`useId` de React es estable **sólo si el árbol de componentes es idéntico entre servidor y
cliente**. MUI lo usa para vincular label↔control (`htmlFor`/`id`). Si la recipe monta una
estructura distinta tras medir el contenedor, la ruta cambia y el id también. El resultado
es un `htmlFor` roto en el HTML servido: para un lector de pantalla, un label que no apunta
a su control.

## Rollout Plan & Risk Matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El fix del primitive rompe la adaptación por ancho | UI | medium | GVC de las superficies que más dependen de density | visual-gate |
| La regla de lint genera ruido masivo | DX | medium | modo warn primero, barrido y luego error | CI |
| El disparador resulta ser otro | scope | medium | Slice 1 es de investigación con evidencia, no de fix | — |
| La migración de tokens cambia un color sin querer | UI | medium | GVC antes/después de ambas rutas de chart | visual-gate |
| La allow-list se usa después para tapar deuda real | DX | low | sólo el módulo entra, nunca un consumer | code review |

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del scenario | <5 min | si |
| Slice 2 | revert del primitive | <5 min | si |
| Slice 3 | regla a warn | <5 min | si |

### Production verification sequence

1. GVC de 3 superficies con formulario dentro de recipe, a 390px, `failOnHydrationWarning`.
2. Cero warnings de hidratación en dos corridas consecutivas (una sola puede engañar).

### Out-of-band coordination required

- N/A — repo-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] (A) El disparador está identificado con evidencia (trace, no hipótesis).
- [ ] El fix vive en el primitive, no en los consumers.
- [ ] Existe detección que impide reintroducirlo en silencio.
- [ ] Dos corridas consecutivas de GVC a 390px sin warnings de hidratación.
- [ ] (A) Barrido documentado de cuántas superficies estaban expuestas.
- [ ] (B) Módulo canónico con fallbacks y escala, cada valor con su razón.
- [ ] (B) Los dos charts lo consumen; el módulo en la allow-list y los charts NO.
- [ ] (B) `pnpm ui:code-lint` limpio sobre ambos charts, y GVC sin diferencia visual.

## Verification

- `pnpm local:check`
- `pnpm fe:capture <scenario> --env=local` ×2
- `pnpm ui:code-lint src/views/greenhouse/admin/growth/seo/**`
- `pnpm fe:capture growth-seo-performance --env=local`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `ui-platform/PRIMITIVES.md` con el invariante nuevo
