# TASK-458 — Honest-label quick fix: reframe "Pipeline" sub-tab (TASK-351)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-458-honest-label-pipeline-fix`
- Legacy ID: `follow-up a TASK-351`
- GitHub Issue: `none`

## Summary

Quick fix UI (1-2h) para dejar de prometer "forecast comercial" en la tab actual de TASK-351. Renombrar labels + tooltips para que sea honesta mientras llega la reframe completa (TASK-457). Evita malinterpretación operativa de ejecutivos que miren el pipeline actual como forecast real.

## Why This Task Exists

TASK-351 shipó a producción una tab "Pipeline" que materializa a grain de quote, pero el forecast comercial correcto es grain de deal. Entre el deploy actual y la entrega de TASK-457 (que requiere TASK-453 + 456), pueden pasar varias semanas. Durante ese tiempo, quien vea la tab puede interpretar los números como forecast real cuando en realidad es tracking de contratos/documentos en proceso.

Esta task es **zero-risk cosmética**: no toca backend ni lógica, solo reetiqueta + agrega un disclaimer.

## Goal

- Sub-tab "Pipeline" renombrada a "Contratos activos" (o similar, validar con UX-writing)
- Tooltip/alert explicando que la vista es grain quote, no forecast de deals
- Referencia a TASK-457 para la vista completa cuando esté disponible
- No se modifica ningún endpoint, materializer, ni projection

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- No tocar backend, solo UI + copy
- Copy debe pasar por `greenhouse-ux-writing` skill
- No romper tests existentes

## Normative Docs

- `src/views/greenhouse/finance/CommercialIntelligenceView.tsx` (TASK-351)

## Dependencies & Impact

### Depends on

- TASK-351 complete (ya está)

### Blocks / Impacts

- Sub-tab rename será re-cambiado por TASK-457 — está OK, esto es interino
- Usuarios que vean la tab ya no interpretarán números como forecast comercial

### Files owned

- `src/views/greenhouse/finance/CommercialIntelligenceView.tsx` (solo labels + tooltip)
- `src/config/greenhouse-nomenclature.ts` (opcional, si se surfacea labels allí)

## Current Repo State

### Already exists

- TASK-351 deploy activo en prod
- Tab outer "Cotizaciones" con 3 sub-tabs
- Sub-tab "Pipeline" con 4 KPIs + tabla

### Gap

- Label "Pipeline" sugiere forecast comercial cuando es grain quote
- Sin disclaimer, nadie sabe la limitación

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice único — Rename + disclaimer

- Sub-tab title: "Pipeline" → **"Contratos activos"** (confirmar con ux-writing)
- Agregar `Alert severity='info'` al tope del sub-tab con copy del estilo: "Esta vista lista contratos (cotizaciones) en curso. El forecast comercial completo por deal llegará con la próxima iteración."
- Tooltip en los KPIs "Pipeline abierto" / "Pipeline ponderado" clarificando que el agregado es por contrato, no por oportunidad comercial
- Opcional: agregar chip "beta" o "preview" en la tab

## Out of Scope

- Cualquier cambio en backend, migrations, stores, projections
- Cambios en sub-tabs "Rentabilidad" y "Renovaciones"
- Nuevos filtros o columnas
- Rename de la tab outer "Cotizaciones" (eso lo hace TASK-457)

## Detailed Spec

### Copy propuesto (validar con `greenhouse-ux-writing`)

- Sub-tab label: `Contratos activos`
- Alert al tope del tab:
  > Esta vista muestra contratos en curso a grain de cotización. Para forecast comercial completo por deal (incluyendo oportunidades pre-quote), revisa la próxima release de Pipeline comercial unificado.
- Tooltip en KPI "Pipeline abierto":
  > Suma de montos cotizados en contratos activos (draft, enviada, aprobada). No incluye deals sin cotización emitida.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Sub-tab "Pipeline" muestra label nuevo
- [ ] Alert informativo visible al tope
- [ ] Tooltips en KPIs añadidos
- [ ] No se tocó backend (diff solo en UI files)
- [ ] Tests existentes pasan sin cambios

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Validación manual en staging: abrir `/finance/intelligence` → tab "Cotizaciones" → sub-tab

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo de impacto cruzado con TASK-457 (esta task será absorbida cuando TASK-457 cierre)

## Follow-ups

- TASK-457 — reframe completa absorbe este quick fix

## Open Questions

- ¿Qué label exacto usa ux-writing? "Contratos activos" vs "Contratos en curso" vs "Pipeline documental". Resolver en Discovery invocando el skill.
