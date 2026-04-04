# TASK-218 - ICO Time-to-Market & Activation Evidence Contract

## Delta 2026-04-04 — implementación cerrada

- `TASK-218` ya dejó operativo el primer contrato runtime de `TTM`.
- Se creó `src/lib/ico-engine/time-to-market.ts` como helper canónico para:
  - selección de evidencia de inicio y activación
  - clasificación `available`, `degraded`, `unavailable`
  - propagación de `confidenceLevel` y `qualityGateReasons`
- `src/lib/campaigns/campaign-metrics.ts` ahora publica `timeToMarket` dentro del payload de campaña y respeta tenant isolation por `space_id`.
- `src/views/greenhouse/campaigns/CampaignDetailView.tsx` ya muestra `TTM`, evidencia seleccionada y estado de confianza como primer consumer visible.
- La policy actual queda cerrada así:
  - inicio = proxy operativo (`briefing` / `project start` / campaign start / task created / planned start)
  - activación = evidencia observada preferente (`actual_launch_date` o publicación/activación detectada) con fallbacks proxy/planned
- No se abrió migración nueva:
  - esta slice cierra contrato + consumer inicial
  - registry/materialization/agency-wide rollout quedan para lanes posteriores del engine

## Delta 2026-04-04

- `TASK-218` fue auditada contra runtime real antes de implementación.
- La corrección principal de contrato es esta:
  - `TTM` no parte desde cero
  - ya existen foundations parciales en campañas, delivery y arquitectura `ICO`
  - el gap real es cerrar el measurement model canónico y la policy de evidencia de activación
- Estado real auditado:
  - `greenhouse_core.campaigns` ya tiene `campaign_type`, `planned_launch_date` y `actual_launch_date`
  - `greenhouse_core.campaign_project_links` ya une campañas con proyectos por `space_id`
  - `greenhouse_delivery.projects` y `greenhouse_delivery.tasks` ya entregan fechas, fases, estados y contexto suficiente para evidence stitching
  - `src/lib/campaigns/campaign-store.ts` ya expone launch dates en runtime
  - `src/lib/capability-queries/helpers.ts` ya expone `Early Launch Advantage`, pero hoy lo deriva heurísticamente desde `OTD` vs industria y no desde `TTM`
  - `src/lib/campaigns/campaign-metrics.ts` y `src/app/api/projects/[id]/ico/route.ts` siguen siendo consumers parciales/legacy que no conocen `TTM`
  - `src/lib/ico-engine/schema.ts` ya define `ai_metric_scores` como foundation futura para señales tipo `BCS`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md` ya habla de `pipeline_activation`, pero ese contrato no está materializado todavía como `TTM`
  - la referencia `../Greenhouse_Portal_Spec_v1.md` no está disponible en este workspace
- Implicación operativa:
  - esta task debe enfocarse en:
    - contrato de `brief efectivo`
    - contrato de `activation evidence`
    - modelado runtime de `TTM`
    - propagation hacia readers/consumers estratégicos
    - cutover de consumers heurísticos o parciales que hoy comunican `Early Launch` sin base canónica
  - no debe asumir que `TASK-220` ya resolvió `BCS`
  - debe dejar fallback/source policy explícita cuando no exista señal madura de intake

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Implementada`
- Rank: `5`
- Domain: `delivery / ico / activation`

## Summary

Formalizar `Time-to-Market (TTM)` como métrica puente canónica de `ICO`, definiendo qué significa `brief efectivo`, qué significa `asset activo en mercado`, qué evidencias de activación son válidas y cómo se calcula de forma auditable por `space`, campaña y período.

## Why This Task Exists

`Contrato_Metricas_ICO_v1` define `TTM` como una de las métricas puente que conecta la operación con `Revenue Enabled`.

Hoy Greenhouse ya tiene drivers operativos relevantes (`OTD`, `FTR`, `RpA`, `cycle time`), pero todavía no institucionaliza completamente:

- el evento de inicio válido del flujo (`brief aprobado`)
- el evento real de salida a mercado (`activation`)
- la evidencia que respalda esa activación
- la semántica para medir días ganados y soportar `Early Launch Advantage`

`TASK-215` ya deja un patrón canónico de runtime para señales operativas sensibles:

- `valid`
- `low_confidence`
- `suppressed`
- `unavailable`

Si `TTM` necesita estado de calidad o evidencia parecida, debe reusar esa disciplina y no inventar un vocabulario paralelo.

Sin ese contrato, no se puede sostener `Revenue Enabled` más allá de narrativa.

## Goal

- Definir un contrato canónico para `TTM`.
- Unificar fuentes y evidencia de activación.
- Habilitar una base auditable para `Early Launch Advantage`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Reglas obligatorias:

- `TTM` no puede depender de heurísticas UI locales.
- la activación debe tener evidencia trazable y fuente explícita.
- si no existe evidencia suficiente, el estado debe ser `unavailable` o `degraded`, no un falso positivo.

## Dependencies & Impact

### Depends on

- `TASK-214`
- `TASK-216`
- `TASK-217`
- `TASK-188`
- `TASK-213`
- `TASK-220`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`

### Impacts to

- `TASK-221`
- `TASK-222`
- `Agency`
- `Creative Hub`
- `Campaigns`
- `QBR / CVR`
- futuros readers de performance y activation

### Files owned

- `src/lib/ico-engine/*`
- `src/lib/agency/*`
- `src/lib/campaigns/*`
- `src/lib/capability-queries/*`
- `src/app/api/projects/[id]/ico/route.ts`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`

## Current Repo State

### Ya existe

- `Cycle Time` y `OTD` ya tienen carriles más maduros
- el contrato maestro ya declara `TTM` como métrica puente
- `greenhouse_core.campaigns` ya tiene `planned_launch_date`, `actual_launch_date` y `campaign_type = 'launch'`
- `greenhouse_core.campaign_project_links` ya conecta campañas con proyectos reales
- `greenhouse_delivery.projects` y `greenhouse_delivery.tasks` ya exponen fechas y estados operativos que pueden servir como evidence sources
- `src/lib/campaigns/campaign-store.ts` ya resuelve launch dates para runtime portal
- `Creative Hub` ya muestra una surface de `Early Launch Advantage`, aunque hoy sea heurística y no canónica

### Gap actual

- no existe source policy canónica cerrada para `TTM`
- no existe contrato de activación soportado por evidencia trazable y jerarquizada
- no existe un measurement model runtime cerrado para `brief efectivo -> asset live`
- no existe decisión explícita de entidad ancla (`campaign`, `project`, `campaign+project`)
- `TTM` no existe todavía en `ICO_METRIC_REGISTRY`, `schema.ts`, `materialize.ts` ni `read-metrics.ts`
- no existe tabla/read-model de evidencia de activación en BigQuery o PostgreSQL
- ya existen consumers que comunican `Early Launch` sin base canónica de `TTM`

## Scope

### Slice 1 - Start event contract

- definir qué fecha inicia `TTM`
- explicitar estados y bordes de `brief efectivo`
- declarar fallback mientras `BCS` e intake governance sigan abiertos en `TASK-220`

### Slice 2 - Activation evidence contract

- definir qué fuentes y pruebas cuentan como activación válida
- formalizar confianza y fallback por canal/fuente
- distinguir evidencia observada vs evidencia inferida

### Slice 3 - Runtime metric contract

- modelar `TTM` como métrica de engine / serving
- dejarla lista para consumers estratégicos y `Revenue Enabled`

## Out of Scope

- calcular directamente `Revenue Enabled`
- integrar todas las plataformas de activación en una sola lane
- rediseñar superficies comerciales

## Acceptance Criteria

- [x] `TTM` tiene definición canónica inicial de start event y activation event
- [x] La activación se respalda en evidencia trazable por fuente
- [x] El runtime puede distinguir `available`, `degraded` y `unavailable` para `TTM`
- [x] `TTM` queda listo como insumo serio para `Early Launch Advantage`

## Verification

- `pnpm exec vitest run src/lib/ico-engine/time-to-market.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `rg -n "new Pool\\(" src`
- `pnpm lint`
- `pnpm build`
