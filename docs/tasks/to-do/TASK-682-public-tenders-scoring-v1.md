# TASK-682 — Public Tenders Scoring V1

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-675`, `TASK-677`, `TASK-680`
- Branch: `task/TASK-682-public-tenders-scoring-v1`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementa scoring deterministico y explicable para oportunidades publicas usando nombre, descripcion, items, comprador, fechas, documentos y catalogo Greenhouse. El resultado debe priorizar oportunidades accionables sin inventar metricas inline ni depender de un LLM como fuente primaria.

## Why This Task Exists

El POC validado mostro que hacer match solo por nombre/descripcion es insuficiente; items y documentos aumentan precision. Para escalar hay que guardar scores, explanations y version de reglas por oportunidad.

## Goal

- Crear motor de scoring V1 explicable y versionado.
- Persistir score, confidence, reasons y matched services/items.
- Separar senales deterministicas de futuras senales IA.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:

- No calcular metricas ejecutivas inline en UI.
- Scoring debe ser reproducible por version de regla.
- Toda query filtra por `space_id`.
- Usar `greenhouse-agent` antes de escribir backend.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/research/TASK-673-findings.md`

## Dependencies & Impact

### Depends on

- `TASK-675`
- `TASK-677`
- `TASK-680`
- Catalogos comerciales existentes bajo `src/lib/commercial/`.

### Blocks / Impacts

- `TASK-683`
- `TASK-684`
- `TASK-686`
- `TASK-687`

### Files owned

- `src/lib/commercial/public-procurement/`
- `migrations/`
- `src/lib/commercial/`

## Current Repo State

### Already exists

- POC/finding del matcher en `docs/research/TASK-673-findings.md`.
- Catalogos comerciales en `src/lib/commercial/`.

### Gap

- No hay scoring productivo, persistencia de explanations ni recalculo versionado.

## Scope

### Slice 1 — Scoring Contract

- Definir feature inputs, weights, thresholds y explanation schema.
- Crear tabla de match explanations si no existe segun `TASK-674`.

### Slice 2 — Engine

- Implementar scorer deterministico con tokens normalizados.
- Incluir nombre, descripcion, items y metadata de procedimiento.
- Preparar extension futura a documentos IA.

### Slice 3 — Recompute And Tests

- Agregar recompute por opportunity/run/rules version.
- Tests con fixtures del POC.

## Out of Scope

- UI de ranking.
- LLM/IA de documentos.
- Creacion automatica de deals o quotes.

## Acceptance Criteria

- [ ] Cada oportunidad puede tener score y explanation versionados.
- [ ] El scoring usa items ademas de nombre/descripcion cuando existen.
- [ ] Recompute es idempotente.
- [ ] Tests cubren matches positivos, falsos positivos y codigos desconocidos.

## Verification

- `pnpm migrate:up` si hay DDL.
- Tests focalizados del scorer.
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] schema snapshot/db types actualizados si aplica.

## Follow-ups

- `TASK-683`
- `TASK-685`
