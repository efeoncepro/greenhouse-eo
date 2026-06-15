# TASK-1139 — Nexa data-aware suggested prompts: enriquecimiento (Tier 2.1)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `nexa|platform|ai|ui`
- Blocked by: `none` (TASK-1087 Tier 2 ya en `develop`)
- Branch: `task/TASK-1139-nexa-data-aware-prompts-enrichment`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Enriquece los prompts sugeridos data-aware de Nexa (Tier 2, TASK-1087) con las recomendaciones de cierre de esa task: (1) **affordance visual por categoría** usando el `hint` que el contrato ya devuelve, (2) **entrypoint correcto** (finance vs agency) propagado de la página al composer, (3) **cache de ruta** corto para no re-leer compact-signals en cada apertura, y (4) **reliability signal** que observe las fallas inesperadas del path data-aware. Todo aditivo, detrás del mismo flag `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED`.

## Why This Task Exists

TASK-1087 dejó el data-aware **funcional pero mínimo**: las cards data-aware se ven idénticas a las de plantilla (el `hint` viaja en el contrato pero la UI no lo usa), el composer defaultea `entrypointContext='agency'` aunque la página sea de finanzas, no hay cache a nivel endpoint (cada apertura del chat dispara los sub-readers no cacheados de compact-signals), y no hay señal que avise si el path data-aware empieza a fallar por un error real (hoy solo `captureWithDomain` suelto). Estas son las recomendaciones explícitas del cierre de TASK-1087 — suben el "wow", la corrección y la observabilidad sin cambiar el contrato ni el diseño aprobado.

## Goal

- La card de un prompt data-aware muestra un ícono/acento sutil según su `hint` (`anomaly`/`pending`/`risk`/`kpi`) — distingue visualmente "esto viene de una señal real" sin romper la grilla aprobada del empty hero.
- El composer recibe el `entrypointContext` real de la página (`agency` para `/agency/...`, `finance` para `/finance/clients/...`) → la projection del workspace usa la visibilidad correcta de facets.
- El endpoint cachea su payload corto (TTL ~30s, keyed por subject+entityId+context) → aperturas repetidas del chat no re-disparan account360/finance/projects.
- Un reliability signal observa las **fallas inesperadas** del path data-aware (reader error, no el fallback normal por "sin señal") → degradación visible, no silenciosa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & ALIGNMENT
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- **Nexa Intelligence — capa `experience`**: `docs/architecture/nexa-intelligence/experience/suggested-prompts.md` (SSOT del Tier 1/1.5/2). Cualquier cambio de código del dominio `suggested-prompts` exige actualizar este doc (gate `pnpm nexa:doc-gate`).
- **Reliability Control Plane**: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (patrón de signal: key + kind + severity + reader + wire-up).
- **UI Platform / state-design**: la affordance del `hint` respeta el contrato visual aprobado (tokens AXIS, sin HEX/px inline) y la grilla del empty hero (TASK-1078).

## Normative Docs

- `docs/architecture/nexa-intelligence/experience/suggested-prompts.md`
- `docs/architecture/nexa-intelligence/manifest.json` (dominio `suggested-prompts`)
- `DESIGN.md` (tokens + iconografía Tabler)

## Dependencies & Impact

- **Depende de:** TASK-1087 (composer + contrato + hook + endpoint + flag) ya en `develop`.
- **Impacta a:** `src/lib/nexa/suggested-prompts-contract.ts` (el `hint` ya existe; sin cambio de shape), `NexaFloatingPanel` (render del hint), `nexa-page-context.tsx` + 2 páginas org (declaran entrypoint), `suggested-prompts-data-aware.ts` (entrypoint + cache), `route.ts` (cache), nuevo reader de reliability.
- **Archivos owned:** `src/lib/nexa/suggested-prompts-data-aware.ts`, `src/app/api/nexa/suggested-prompts/route.ts`, `src/lib/nexa/use-data-aware-suggested-prompts.ts`, `src/views/greenhouse/nexa/floating-chat/NexaFloatingPanel.tsx`, `src/lib/nexa/nexa-page-context.tsx`, `src/lib/nexa/suggested-prompts.ts`, `src/lib/reliability/queries/nexa-suggested-prompts-data-aware-degraded.ts` (nuevo).

## Current Repo State

- **Already exists:** contrato `nexa-suggested-prompts.v1` con `hint?` por prompt (`suggested-prompts-contract.ts`); composer + endpoint + hook + flag; `NexaContextScope` declara `entityName`/`contextKey`/`entityId`/`entityKind`; el reader `readOrganizationWorkspaceCompactSignalsSafely` acepta `entrypointContext`; la projection cachea 30s in-memory (pero compact-signals NO cachea su payload de resultado).
- **Gap:** el panel ignora `hint` (cards idénticas); el composer hardcodea `entrypointContext: input.entrypointContext ?? 'agency'` y la página no declara su entrypoint; sin cache a nivel endpoint; sin reliability signal del path.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — SCOPE & SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope (slices)

- **Slice 1 — Hint affordance en la card del empty hero.** El panel mapea `hint → { icon, tono }` (token AXIS, no HEX) y lo pinta sutil en la card de un prompt data-aware. El hook pasa a devolver los prompts data-aware con su `hint` (no solo el texto). Loop de diseño (`state-design`/`modern-ui`) + GVC desktop+mobile. Cero cambio cuando no hay data-aware (cards de plantilla intactas).
- **Slice 2 — Entrypoint correcto página→composer.** `NexaContextScope` declara `entrypoint?: 'agency' | 'finance'` (derivable de la ruta si la página no lo fuerza); el hook lo manda como `?entrypoint=`; el endpoint lo valida y lo pasa al composer. Las 2 páginas org lo declaran (`agency` en `OrganizationEnterpriseWorkspaceRuntime`, `finance` en la finance client page si usa el shell).
- **Slice 3 — Cache de ruta corto.** Cache in-memory TTL ~30s keyed por `subjectId:context:entityId:entrypoint` en el endpoint (o en el composer), con la misma degradación honesta. No cachear `template_fallback` (barato + evita pegar fallback stale tras un flip).
- **Slice 4 — Reliability signal `nexa.suggested_prompts.data_aware_degraded`.** Reader que cuenta las **fallas inesperadas** del path (reader error capturado vía `captureWithDomain('agency', { source: 'nexa_suggested_prompts_*' })`) en las últimas 24h — kind `incident`/`drift`, severity warning si >0, steady=0. Wire-up en `get-reliability-overview`. NO mide el fallback normal por "sin señal" (eso es comportamiento esperado, no incidente).

## Out of Scope

- **WebMCP `navigator.modelContext`** (recomendación #4 de TASK-1087): la API de navegador es experimental/no estable → NO se puede shippear end-to-end hoy. El `entityRef` del contrato ya queda preparado. Forward-looking, follow-up cuando la API sea Baseline.
- **Payroll data-aware** (parte de recomendación #1): no existe hoy una página de nómina entity-scoped que declare `NexaContextScope` con un id de período. Requiere (a) una página/superficie de período que declare el contexto + (b) un reader de "pendientes de cierre de nómina" (finiquitos por ratificar, variaciones). Follow-up con su propio diseño.
- Cambiar el contrato `nexa-suggested-prompts.v1` (el `hint` ya existe; esta task lo consume, no lo cambia).
- Tocar el render de la conversación de Nexa (system prompt, providers, tools) — esta task es solo los starters.

## Detailed Spec

- **Slice 1:** mapa canónico `HINT_AFFORDANCE: Record<NexaSuggestedPromptHint, { icon: string; color: keyof Palette }>` — p.ej. `anomaly → tabler-alert-triangle / warning`, `risk → tabler-flame / error`, `pending → tabler-clock / info`, `kpi → tabler-chart-dots / primary`. El hook `useDataAwareSuggestedPrompts` devuelve `Array<{ text; hint? }>` (no `string[]`); el panel pinta el ícono a la izquierda del texto, tono sutil (alpha), respetando reduced-motion y el hover existente. Microcopy: ninguna (solo iconografía). GVC obligatorio (UI visible).
- **Slice 2:** `NexaPageContextValue` += `entrypoint?: 'agency' | 'finance'`. El composer deja de defaultear `'agency'` ciego: usa el declarado, con fallback a `'agency'`. Validación en la ruta (`ENTRYPOINT_CONTEXTS`).
- **Slice 3:** primitive de cache simple (Map + timestamp, TTL 30_000ms), patrón espejo de la projection cache. Solo cachea `source === 'data_aware'` (o el payload completo salvo cuando el flag flip debería invalidar — TTL corto lo cubre). Clave incluye `entrypoint`.
- **Slice 4:** reader `getNexaSuggestedPromptsDataAwareDegraded` en `src/lib/reliability/queries/` — fuente: incidentes Sentry domain `agency` con tag `source IN ('nexa_suggested_prompts_data_aware','nexa_suggested_prompts_route')` (mismo patrón que otros signals que leen incidentes por tag). Si no hay fuente Sentry-queryable barata, degradar honesto a severity `unknown` (no inventar). Wire-up en `get-reliability-overview.ts`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slices independientes; orden recomendado 2 → 3 → 1 → 4 (entrypoint + cache son backend puro y desbloquean la UI; el signal cierra). Slice 1 (UI) requiere el loop GVC antes de declararse listo.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| La affordance rompe la grilla aprobada del empty hero | UI Nexa | Baja | Loop GVC desktop+mobile + cero cambio cuando no hay data-aware | GVC frame mirado |
| Cache pega un payload stale tras flip del flag | endpoint | Baja | TTL 30s + no cachear `template_fallback` | n/a (TTL corto) |
| Entrypoint incorrecto cambia la visibilidad de facets | composer | Baja | Validar contra `ENTRYPOINT_CONTEXTS`, fallback `agency` | anti-oracle del reader (ya existe) |
| Signal sin fuente queryable | reliability | Media | Degradar a `unknown` honesto, no inventar | el propio signal |

### Feature flags / cutover

Mismo flag `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED` (ya ON en local + staging por TASK-1087). Cero flag nuevo. Aditivo: con el flag off, todo este enriquecimiento es inerte.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 UI | revert commit | <2 min | Sí |
| 2 entrypoint | revert commit (composer vuelve a default `agency`) | <2 min | Sí |
| 3 cache | revert commit | <2 min | Sí |
| 4 signal | revert commit (solo lectura) | <2 min | Sí |

### Production verification sequence

1. Local (flag ON): abrir Nexa en una ficha de cliente con señal → cards con ícono por categoría; endpoint cacheado (2da apertura sin re-fetch de readers); finance client page usa entrypoint `finance`.
2. Staging (flag ON): GVC desktop+mobile + signal en steady=0.
3. Prod: parte del próximo release develop→main (no en esta task).

### Out-of-band coordination required

Ninguna. Sin migraciones, sin env nuevas, sin Azure/GCP.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una card de prompt data-aware renderiza un ícono según su `hint`; una card de plantilla (Tier 1/1.5) NO cambia (sin ícono nuevo).
- [ ] La finance client page resuelve el composer con `entrypointContext='finance'` (verificable en el request `?entrypoint=finance`).
- [ ] Una segunda apertura del chat dentro de 30s no re-dispara los sub-readers de compact-signals (cache hit).
- [ ] Existe el reader `getNexaSuggestedPromptsDataAwareDegraded` wireado en el overview de reliability, steady=0.
- [ ] Con el flag off, todo el enriquecimiento es inerte (cards de plantilla, sin fetch).
- [ ] `pnpm nexa:doc-gate` verde (doc de capa `experience/suggested-prompts.md` actualizado con el Delta).

## Verification

- `pnpm local:check` + tests focales (hint mapping del hook, entrypoint passthrough, cache hit/expiry, reader del signal).
- GVC desktop+mobile de la card con `hint` (UI visible) — frame mirado.
- `pnpm nexa:doc-gate` + `pnpm test` (full) + `pnpm build`.

## Closing Protocol

- `Lifecycle: complete` + mover a `complete/` + sync `README.md` + `TASK_ID_REGISTRY.md`.
- Delta en `experience/suggested-prompts.md` (la affordance del hint + entrypoint + cache + signal).
- `changelog.md` + `Handoff.md`.

## Follow-ups

- **WebMCP `navigator.modelContext`** cuando sea Baseline: la página expone su contexto al asistente y Nexa lo consume; el `entityRef` ya está listo.
- **Payroll data-aware**: requiere página de período entity-scoped + reader de pendientes de cierre.
- **Telemetría `source` por turno** (TASK-1129): registrar `data_aware` vs `template_fallback` por mensaje para medir la tasa de uso real (mejor fuente para un signal de fallback-rate que el incidente de Slice 4).
