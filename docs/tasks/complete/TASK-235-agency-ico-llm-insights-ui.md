# TASK-235 — Agency ICO LLM Insights UI Surfacing

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Implementada y verificada`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-235-agency-ico-llm-insights-ui`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Conectar a UI la salida `aiLlm` ya disponible en `Agency > ICO Engine` para que la lane advisory de `TASK-232` deje de ser solo API/runtime y pase a verse dentro de la tab de Agencia. El objetivo es exponer estado del último run, resumen agregado y una lista compacta de enriquecimientos recientes sin recalcular nada inline.

## Why This Task Exists

`TASK-232` dejó cerrada la lane async LLM del `ICO Engine` y el endpoint de Agencia ya devuelve `aiLlm`, pero la vista actual no la renderiza. El gap real no es de data ni de pipeline: es de surfacing UI. Mientras eso siga así, el runtime existe pero el operador no ve la narrativa, el score agregado ni el estado de procesamiento desde la tab `ICO Engine`.

## Goal

- Hacer visible en `Agency > ICO Engine` el bloque advisory LLM ya persistido por `TASK-232`
- Mantener el patrón `materialized-first` y el contrato `advisory-only`
- Cubrir estados vacíos, parciales y de error honesto sin abrir una surface engañosa

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`

Reglas obligatorias:

- `Agency > ICO Engine` consume salida ya materializada; nunca dispara LLM inline ni recalcula el scoring advisory en el request path.
- La lane sigue siendo `advisory-only` e `internal-only`; no debe desplazar KPIs determinísticos ni trust metadata del `ICO Engine`.
- Si la surface no tiene enrichments disponibles, debe mostrar estado vacío honesto en vez de ocultar silenciosamente el bloque o inventar narrativa.
- Reutilizar componentes, tokens y patrones existentes de Agency/Vuexy antes de crear wrappers nuevos.
- El wiring de UI no debe romper el contrato actual del tab `ICO Engine` ni introducir dependencias con `Nexa` u `Ops Health`.

## Normative Docs

- `docs/tasks/complete/TASK-232-ico-llm-quality-scoring-explanation-pipeline.md`
- `docs/tasks/complete/TASK-217-agency-kpi-trust-propagation-serving-semantics.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-232-ico-llm-quality-scoring-explanation-pipeline.md`
- `src/app/api/ico-engine/metrics/agency/route.ts`
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
- `src/views/agency/AgencyWorkspace.tsx`
- `src/views/agency/AgencyIcoEngineView.tsx`

### Blocks / Impacts

- `docs/tasks/to-do/TASK-154-revenue-pipeline-intelligence.md`
- `docs/tasks/to-do/TASK-159-nexa-agency-tools.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

### Files owned

- `src/views/agency/AgencyWorkspace.tsx`
- `src/views/agency/AgencyIcoEngineView.tsx`
- `src/components/agency/IcoGlobalKpis.tsx`
- `src/components/agency/metric-trust.tsx`
- `src/components/greenhouse/EmptyState.tsx`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Current Repo State

### Already exists

- `src/app/api/ico-engine/metrics/agency/route.ts` ya devuelve `aiLlm` junto a `aiCore`
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` ya entrega `totals`, `latestRun`, `recentEnrichments` y `lastProcessedAt`
- `src/views/agency/AgencyWorkspace.tsx` ya hace fetch del endpoint de Agencia y propaga `icoData` a la vista del tab
- `src/views/agency/AgencyIcoEngineView.tsx` ya tiene shell madura de Agency ICO con cards, report, charts y empty state reutilizable
- `src/lib/operations/get-operations-overview.ts` y `src/lib/nexa/nexa-tools.ts` ya consumen esta lane en otras surfaces internas

### Gap

- `AgencyIcoEngineView` no tipa ni renderiza `aiLlm`, aunque el backend ya lo devuelve
- No existe bloque advisory visible para `latestRun`, `avgQualityScore` o `recentEnrichments`
- No hay estados UI explícitos para `no enrichments yet`, `partial`, `failed` o `last processed`
- La afirmación documental “Agency > ICO Engine expone aiLlm” hoy es cierta a nivel API, pero no a nivel visible de la surface

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — UI contract propagation

- Extender el contrato `AgencyIcoData` para incluir `aiLlm` sin romper consumers actuales
- Confirmar el shape real que llega desde `/api/ico-engine/metrics/agency` y tiparlo en la vista de Agencia
- Mantener el fetch actual de `AgencyWorkspace` sin abrir rutas ni readers nuevos

### Slice 2 — Advisory block in Agency ICO

- Renderizar un bloque visible dentro de `Agency > ICO Engine` con:
  - estado del último run
  - total de enriquecimientos
  - `avgQualityScore`
  - timestamp de último procesamiento
  - lista compacta de `recentEnrichments`
- Reutilizar patrones visuales del tab actual y componentes compartidos antes de crear piezas nuevas

### Slice 3 — Honest states and UI hardening

- Cubrir vacío, parcial y fallo de la lane LLM con copy honesto y jerarquía clara
- Evitar que el bloque compita con los KPIs base del engine o con el scorecard mensual
- Ajustar docs mínimas si sigue existiendo wording que sugiera visibilidad UI ya cerrada cuando en realidad solo era exposición API

## Out of Scope

- Cambiar prompts, modelo, provider policy o el worker async de `TASK-232`
- Agregar surfaces LLM nuevas en `Space 360`, `Organization`, `People` o client-facing routes
- Recalcular KPIs `ICO` inline o mezclar el bloque LLM con el trust model determinístico
- Abrir nuevos endpoints, migraciones o storage para esta lane

## Detailed Spec

La surface debería vivir dentro de `src/views/agency/AgencyIcoEngineView.tsx` como bloque complementario al tab actual, no como tab nueva ni route separada.

El bloque esperado debe leer únicamente del payload ya disponible:

- `aiLlm.totals.total`
- `aiLlm.totals.succeeded`
- `aiLlm.totals.failed`
- `aiLlm.totals.avgQualityScore`
- `aiLlm.latestRun.status`
- `aiLlm.latestRun.startedAt`
- `aiLlm.latestRun.completedAt`
- `aiLlm.recentEnrichments[]`
- `aiLlm.lastProcessedAt`

Comportamiento recomendado:

- si `aiLlm.totals.total > 0`, mostrar resumen + lista corta de enriquecimientos recientes
- si `latestRun.status = 'partial'` o `failed > 0`, mostrar semántica visual clara pero no alarmista
- si no hay enrichments todavía, mostrar un empty state o placeholder explícito dentro del tab ICO
- el bloque debe sentirse “advisory” y no reemplazar los cards determinísticos ya visibles

La copia y composición visual deben apoyarse en:

- `src/components/greenhouse/EmptyState.tsx`
- `src/components/greenhouse/SectionErrorBoundary.tsx`
- `src/components/agency/metric-trust.tsx`
- componentes MUI/Vuexy ya presentes en `AgencyIcoEngineView`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Agency > ICO Engine` renderiza un bloque visible para `aiLlm` usando solo output persistido
- [ ] La vista muestra estado vacío honesto cuando la lane aún no tiene enrichments
- [ ] La UI expone al menos `latestRun`, `avgQualityScore` y `recentEnrichments` sin romper KPIs existentes
- [ ] No se agregan rutas, queries inline ni llamadas directas al provider LLM desde la surface

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Validación manual en `/agency?tab=ico`

## Closing Protocol

- [ ] Actualizar `docs/architecture/Greenhouse_ICO_Engine_v1.md` si la documentación sigue diciendo “Agency expone aiLlm” sin distinguir API vs UI visible
- [ ] Actualizar `docs/changelog/CLIENT_CHANGELOG.md` si el bloque advisory queda visible para operadores en Staging/Production

## Follow-ups

- Evaluar surfacing equivalente en `Space 360` o `Organization ICO` si el bloque demuestra valor operativo
- Si el patrón visual queda reusable, extraerlo a componente shared de Agency en una task posterior

## Open Questions

- Confirmar durante Discovery si el bloque vive mejor antes de charts, debajo del performance report o como panel lateral del tab `ICO Engine`
