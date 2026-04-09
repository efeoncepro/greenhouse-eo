# TASK-291 — Brief Clarity Client View

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `7`
- Domain: `agency`
- Blocked by: `TASK-286`
- Branch: `task/TASK-291-brief-clarity-client-view`

## Summary

Crear vista de Brief Clarity Score (BCS) para el client_manager: score por proyecto/campana, breakdown de que falta en los briefs, recomendaciones accionables e impacto cuantificado en RpA. Convierte a Efeonce de proveedor a partner: "tus briefs de 62/100 te cuestan 1.2 rondas extra por asset".

## Why This Task Exists

El BCS se calcula por AI y se persiste en `ico_engine.ai_metric_scores`, pero nunca se muestra al cliente. Empresas grandes tienen procesos de briefing que involucran multiples areas internas y suelen ser deficientes. Si el manager sabe que sus briefs tienen baja claridad, puede mejorar su proceso interno. Es un loop de feedback roto que esta task cierra.

## Goal

- Pagina `/brief-clarity` con BCS por proyecto
- Breakdown visual de que falta en cada brief
- Impacto cuantificado: BCS bajo → rondas extra → costo en tiempo
- Trend mensual de BCS

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §11.2, §14.1 V5
- `docs/architecture/Contrato_Metricas_ICO_v1.md` — BCS contract

Reglas obligatorias:

- Threshold: >= 80/100 = brief efectivo (definido en codigo)
- No exponer prompts, modelos o detalles de AI — solo score, breakdown y recomendaciones

## Dependencies & Impact

### Depends on

- TASK-286 (view code `cliente.brief_clarity`)
- `src/lib/ico-engine/brief-clarity.ts` — BCS engine completo
- `ico_engine.ai_metric_scores` con metric_id `brief_clarity_score`

### Blocks / Impacts

- TASK-301 (Analytics enrichment) — BCS trend

### Files owned

- `src/app/(dashboard)/brief-clarity/page.tsx`
- `src/app/api/brief-clarity/route.ts`
- `src/views/greenhouse/GreenhouseBriefClarity.tsx`

## Current Repo State

### Already exists

- `src/lib/ico-engine/brief-clarity.ts` (413 lineas) — completo
- `resolveBriefClarityMetric()`, `getProjectBriefClarityMetric()`, `getFirstEffectiveBriefDateForProjects()`
- Datos en `ico_engine.ai_metric_scores`: score, passed, breakdown, reasoning, confidence
- Threshold 80/100 definido como constante `BRIEF_CLARITY_PASSING_SCORE`

### Gap

- No hay pagina ni vista client-facing
- No hay API route dedicada
- No hay correlacion BCS-RpA cuantificada (requiere query cruzada)
- No hay trend mensual
- No hay recomendaciones accionables basadas en breakdown

## Scope

### Slice 1 — API route

- Crear `/api/brief-clarity/route.ts`
- Guard: `requireClientTenantContext()`
- Query BCS por proyecto del tenant
- Incluir: score, passed, breakdown, confidence, trend mensual (ultimos 6 meses)

### Slice 2 — Correlacion BCS-RpA

- Query cruzada: para cada proyecto, BCS promedio + RpA promedio
- Calcular impacto estimado: "briefs con BCS <70 tienen RpA 1.2 mayor que briefs con BCS >80"
- Servir como parte de la response de la API

### Slice 3 — Page y view component

- Crear pagina y view
- KPI cards: BCS promedio, % briefs efectivos (>=80), impacto estimado en RpA
- Tabla por proyecto: proyecto, BCS, passed badge, RpA, delta estimado
- Chart: trend mensual de BCS promedio
- Expandible por proyecto: breakdown del ultimo brief con recomendaciones

## Out of Scope

- Crear o modificar el scoring AI
- Mostrar prompts o modelos usados
- Brief editor o submission desde el portal

## Acceptance Criteria

- [ ] Pagina `/brief-clarity` muestra BCS por proyecto con score y passed badge
- [ ] Correlacion BCS-RpA visible: "BCS bajo te cuesta X rondas extra"
- [ ] Trend mensual de BCS con chart
- [ ] Breakdown expandible por proyecto
- [ ] Solo visible para `client_manager`
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Preview con datos reales de BCS

## Closing Protocol

- [ ] Actualizar §14.1 V5 readiness

## Follow-ups

- TASK-301: BCS trend en Analytics
- Recomendaciones AI-generated por brief (task futura)
