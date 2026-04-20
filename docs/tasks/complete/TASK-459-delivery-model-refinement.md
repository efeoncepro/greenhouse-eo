# TASK-459 — Delivery Model Refinement (Commercial + Staffing Orthogonal)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Done`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-459-delivery-model-refinement`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Desambiguar el `pricing_model` actual de quotation en **dos dimensiones ortogonales**: `commercial_model` (`retainer` / `project` / `one_off` — cómo se cobra y cuándo expira) y `staffing_model` (`named_resources` / `outcome_based` / `hybrid` — qué se vende). Este split corresponde al **delivery model del quote** y es independiente del `CommercialModelCode` ya existente en pricing governance (`on_going` / `on_demand` / `hybrid` / `license_consulting`).

## Why This Task Exists

El campo actual `pricing_model` colapsa dos ejes que **no son mutuamente excluyentes**. Un retainer puede ser staff-augmentation (equipo dedicado mensual) o outcome-based (deliverables mensuales). Hoy el enum `staff_aug / retainer / project` fuerza elegir uno y pierde la dimensión complementaria.

En un negocio 85% retainer como Efeonce, donde muchos retainers son staff-aug, esta ambigüedad hace que:
- Cost attribution no distingue retainer stable vs staff-aug pass-through
- Profitability tracking interpreta drift igual en ambos casos (debería ser distinto)
- Pipeline/UI no puede filtrar por "retainers outcome-based" separado de "retainers staff-aug"
- Renewal lifecycle no diferencia "retainer auto-renueva" vs "staff-aug renueva por head"

## Goal

- `quotations` tiene `commercial_model` + `staffing_model` como campos separados
- Valores legacy de `pricing_model` migrados heurísticamente (ver Detailed Spec)
- APIs downstream exponen ambos ejes (`quotes`, pipeline, profitability, renewals, deal pipeline)
- Snapshots de TASK-455 capturan ambos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Retrocompat: `pricing_model` legacy puede quedar como alias derivado pero dejar de ser fuente de verdad
- Valores de enum **cerrados**: no permitir texto libre, para consistencia downstream
- Migración idempotente + backfill heurístico documentado
- No reutilizar ni mezclar el `commercialModel` del pricing engine v2; ese enum vive en otro dominio semántico

## Normative Docs

- `src/types/db.d.ts` — current quotation schema
- `src/lib/commercial/pricing-governance-types.ts` — `CommercialModelCode` de pricing governance (no reutilizable para esta task)
- TASK-460 — Contract entity (usará estos campos)
- TASK-462 — MRR/ARR (depende de `commercial_model=retainer`)

## Dependencies & Impact

### Depends on

- `greenhouse_commercial.quotations` ya existe

### Blocks / Impacts

- TASK-455 — snapshot incluirá ambos campos
- TASK-456 — surface de deal pipeline queda afectada y debe poder exponer ambos ejes
- TASK-457 — UI filtros + columnas
- TASK-460 — Contract hereda `commercial_model` + `staffing_model` del quote
- TASK-462 — MRR/ARR filtra por `commercial_model = 'retainer'`

### Files owned

- `migrations/[verificar]-task-459-delivery-model-split.sql`
- `src/lib/commercial/governance/contracts.ts` (agregar enums)
- `src/lib/finance/quotation-canonical-store.ts` (extender reader/writer)
- `src/lib/finance/pricing/*.ts` (usar nuevos campos en decisiones)
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- `greenhouse_commercial.quotations.pricing_model` con enum `staff_aug / retainer / project`
- `QUOTATION_PRICING_MODELS` const en `src/lib/commercial/governance/contracts.ts`
- `CommercialModelCode` en pricing governance con valores `on_going / on_demand / hybrid / license_consulting`

### Gap

- Una quote retainer-con-staff-aug se modela como `pricing_model='staff_aug'` pierdiendo el hecho de que es recurrent; o como `pricing_model='retainer'` perdiendo el hecho de que es T&M.
- Downstream (cost attribution, profitability, renewal) aplica una sola lógica por valor del enum, no puede diferenciar los cruces reales.
- `quotation-canonical-store` todavía no expone `pricingModel` en list/detail y el path de sync canónico degrada algunos casos a `'project'`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + enum + backfill heurístico

- Agregar columnas:
  - `commercial_model text` con CHECK IN (`'retainer'`, `'project'`, `'one_off'`)
  - `staffing_model text` con CHECK IN (`'named_resources'`, `'outcome_based'`, `'hybrid'`)
- Backfill desde `pricing_model`:
  - `'retainer'` → `commercial_model='retainer'`, `staffing_model='outcome_based'`
  - `'staff_aug'` → `commercial_model='retainer'`, `staffing_model='named_resources'`  (asumo staff-aug default retainer porque es dedicado mensual)
  - `'project'` → `commercial_model='project'`, `staffing_model='outcome_based'`
- Documentar en Delta que el backfill es heurístico; flagear para revisión manual casos borderline vía query post-deploy

### Slice 2 — Types + stores + API surfacing

- Extender `QUOTATION_PRICING_MODELS` const y agregar `COMMERCIAL_MODELS` + `STAFFING_MODELS`
- Extender `quotation-canonical-store.ts` reader + writer
- Extender payload de publishers (TASK-347, TASK-351) con ambos campos
- Incluir `pricingModel` legacy derivado + ambos campos nuevos en responses JSON de quotes

### Slice 3 — Downstream consumers

- `quotation-pipeline-snapshots` — agregar columnas `commercial_model` + `staffing_model` (re-materialize for consistency)
- `quotation-profitability-snapshots` — idem
- `deal-pipeline-snapshots` — agregar rollup derivado desde la latest quote / latest active quote
- `renewals` hereda el surfacing desde `quotation_pipeline_snapshots`
- TASK-455 snapshot shape incluir ambos campos

## Out of Scope

- Deprecar completamente `pricing_model` — queda como alias derivado pero no se borra en este corte
- UI de filtros (eso lo hace TASK-457 una vez que los campos existan)
- Contract entity (TASK-460)

## Detailed Spec

### Migration

```sql
ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS commercial_model text,
  ADD COLUMN IF NOT EXISTS staffing_model text;

UPDATE greenhouse_commercial.quotations
SET commercial_model = CASE pricing_model
      WHEN 'retainer' THEN 'retainer'
      WHEN 'staff_aug' THEN 'retainer'
      WHEN 'project' THEN 'project'
      ELSE 'one_off'
    END,
    staffing_model = CASE pricing_model
      WHEN 'retainer' THEN 'outcome_based'
      WHEN 'staff_aug' THEN 'named_resources'
      WHEN 'project' THEN 'outcome_based'
      ELSE 'hybrid'
    END
WHERE commercial_model IS NULL;

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_commercial_model_valid
    CHECK (commercial_model IN ('retainer', 'project', 'one_off')) NOT VALID,
  ADD CONSTRAINT quotations_staffing_model_valid
    CHECK (staffing_model IN ('named_resources', 'outcome_based', 'hybrid')) NOT VALID;
```

### Semantic matrix

`commercial_model` en esta task describe el contrato comercial del quote y **no** debe confundirse con `CommercialModelCode` del pricing engine.

| `commercial_model` × `staffing_model` | Ejemplo Efeonce |
|---|---|
| retainer × named_resources | Equipo dedicado T&M mensual (staff-aug retainer) |
| retainer × outcome_based | Retainer mensual con deliverables (ej. managed content) |
| retainer × hybrid | Retainer con resources nombrados + extras por volumen |
| project × named_resources | Proyecto con equipo asignado (raro) |
| project × outcome_based | Proyecto fixed-price por entregables |
| project × hybrid | Proyecto mixto con parte fija + T&M |
| one_off × * | Asesoría puntual, workshop único |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration idempotente aplica sin errores
- [ ] 100% de quotes existentes tienen ambos campos poblados
- [ ] Distribución resultante auditable vía query (ver Delta)
- [ ] API devuelve ambos campos
- [ ] Publishers de outbox incluyen ambos campos en payload

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Query post-deploy: `SELECT commercial_model, staffing_model, COUNT(*) FROM greenhouse_commercial.quotations GROUP BY 1,2 ORDER BY 3 DESC`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo impacto cruzado con TASK-455, TASK-456, TASK-457, TASK-460, TASK-462

## Follow-ups

- Dejar `pricing_model` como computed column o alias cuando se confirme que no quedan consumers directos
- Revisar manualmente los casos donde el backfill heurístico no es correcto (ej. staff-aug que fueron proyectos puntuales)

## Open Questions

- ¿Cuántos casos actuales son realmente `staff_aug` pero NO retainer (proyectos de staff-aug con fin definido)? Si >10% del volumen, ajustar heurística del backfill.
