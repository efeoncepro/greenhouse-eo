# TASK-243 — Nexa Insights en Person 360

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `people`
- Blocked by: `none`
- Branch: `task/TASK-243-nexa-insights-person-360`
- Legacy ID: `none`

## Summary

Agregar el bloque `NexaInsightsBlock` a la surface visible de actividad/inteligencia del Person 360 para que cada miembro del equipo vea los insights AI donde aparece como contributor o root cause. Los enrichments ya existen con `member_id`; faltaba el reader scoped y la integración UI en la surface actualmente montada.

## Why This Task Exists

Person 360 Intelligence muestra métricas delivery (RpA, OTD, FTR), capacity y trends para un miembro, pero no explica las desviaciones ni sugiere acciones. Si un miembro tiene RpA alto, el operador ve el número pero no sabe si es por un proyecto específico, por sobrecarga, o por briefs deficientes. Los root cause enrichments del ICO Engine ya identifican miembros como contributors — falta surfacearlos en el contexto de la persona.

## Goal

- Person 360 Intelligence muestra insights AI donde el miembro aparece en señales
- Las narrativas con @mentions proveen contexto navegable (Space, otros miembros)
- No se crean nuevas señales — se reutilizan enrichments filtrados por `member_id`

## Architecture Alignment

Revisar y respetar:
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — contrato de la capa
- `docs/architecture/GREENHOUSE_MENTION_SYSTEM_V1.md` — formato de @mentions

Reglas obligatorias:
- Reader filtra por `member_id`
- Advisory-only: disclaimer obligatorio

## Dependencies & Impact

### Depends on
- `src/components/greenhouse/NexaInsightsBlock.tsx` — componente existente
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — reader (necesita scope por member)
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx` — surface visible a modificar
- Enrichments en `greenhouse_serving.ico_ai_signal_enrichments` con campo `member_id`

### Blocks / Impacts
- Cualquier miembro con señales verá insights en su perfil

### Files owned
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx` — agregar NexaInsightsBlock en la surface visible de actividad/inteligencia
- `src/app/api/people/[memberId]/intelligence/route.ts` — extender payload con summary Nexa del miembro
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — modificar: agregar `readMemberAiLlmSummary(memberId, year, month)`

## Current Repo State

### Already exists
- `NexaInsightsBlock` reutilizable
- `readAgencyAiLlmSummary()` (reader agency-level)
- `PersonActivityTab` visible y `PersonIntelligenceTab` como referencia de layout
- Enrichments con `member_id` (puede ser null para señales a nivel Space)

### Gap
- No existe reader scoped por `member_id`
- Person 360 no mostraba insights AI en la surface visible

## Scope

### Slice 1 — Reader scoped por Member
- Agregar `readMemberAiLlmSummary(memberId, periodYear, periodMonth)` a `llm-enrichment-reader.ts`
- Filtro: `WHERE member_id = $1`

### Slice 2 — Integración en Person 360 Intelligence
- Agregar `NexaInsightsBlock` en la surface visible de Person 360 (`activity`)
- Posicionar al inicio, antes de las métricas delivery

## Out of Scope
- Crear nuevas señales scoped por member
- Modificar NexaInsightsBlock
- Reabrir tabs legacy o rediseñar la navegación de Person 360

## Acceptance Criteria
- [x] `readMemberAiLlmSummary(memberId)` retorna enrichments filtrados por member
- [x] Person 360 Activity muestra `NexaInsightsBlock` con insights del miembro
- [x] Miembro sin enrichments muestra empty state
- [x] `pnpm build` y `pnpm lint` sin errores

## Verification
- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build`
- `pnpm vitest run src/lib/ico-engine/ai/llm-enrichment-reader.test.ts 'src/app/api/people/[memberId]/intelligence/route.test.ts' src/views/greenhouse/people/tabs/PersonActivityTab.test.tsx`
- Validación visual: `/people/[memberId]?tab=activity` → bloque Nexa visible al inicio

## Closing Protocol
- [x] Actualizar `docs/architecture/Greenhouse_ICO_Engine_v1.md` con delta

## Audit Corrections — 2026-04-16

- La spec original asumía una tab visible `Intelligence`, pero el repo hoy expone esa surface bajo `activity`; `helpers.ts` redirige `intelligence -> activity` y `PersonTabs.tsx` no monta `PersonIntelligenceTab`.
- La fuente de verdad del DDL para `ico_ai_signal_enrichments` no es `docs/architecture/schema-snapshot-baseline.sql`, porque ese snapshot no incluye esta tabla; para este dominio se debe contrastar con la migración `20260404123559856_task-232-ico-llm-enrichments.sql` y `src/types/db.d.ts`.
