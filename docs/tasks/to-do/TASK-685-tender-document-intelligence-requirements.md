# TASK-685 — Tender Document Intelligence And Requirement Extraction

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-679`, `TASK-682`
- Branch: `task/TASK-685-tender-document-intelligence`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Procesa documentos de oportunidades publicas para extraer requisitos, plazos, entregables, garantias, criterios de evaluacion y riesgos, manteniendo evidencia trazable al archivo fuente. Alimenta scoring y decision, pero no reemplaza revision humana.

## Why This Task Exists

Nombre, descripcion e items no bastan para decidir postular. Las bases y anexos contienen requisitos criticos. Greenhouse necesita IA/document intelligence con trazabilidad y controles para no inventar obligaciones.

## Goal

- Crear pipeline de extraccion de requisitos desde documentos descargados.
- Persistir findings con evidencia, confidence y source offsets cuando sea posible.
- Exponer resultados a scoring/workbench.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- La IA debe guardar evidencia y confidence; no escribir conclusiones sin fuente.
- No usar documentos entre tenants.
- Usar `greenhouse-agent`; si se agrega UI/copy, sumar skills UI/copy.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`

## Dependencies & Impact

### Depends on

- `TASK-679`
- `TASK-682`

### Blocks / Impacts

- Mejora `TASK-683` y `TASK-684`.
- Puede ajustar scoring V2.

### Files owned

- `src/lib/commercial/public-procurement/`
- `migrations/`
- `src/app/api/commercial/`

## Current Repo State

### Already exists

- Document ingestion quedara definido por `TASK-679`.

### Gap

- No hay extraction pipeline ni modelo de requisitos.

## Scope

### Slice 1 — Requirement Model

- Crear schema para extracted requirements/findings.
- Definir categorias: eligibility, technical, financial, legal, deadline, deliverable, evaluation, risk.

### Slice 2 — Extraction Pipeline

- Implementar text extraction para formatos soportados.
- Implementar extractor rules-first y preparar LLM optional con evidencia.

### Slice 3 — Surface To Consumers

- Exponer reader para workbench/scoring.
- Agregar recalculo de scoring con document signals si procede.

## Out of Scope

- Generar propuesta completa.
- Postular automaticamente.
- Reemplazar revision legal/comercial.

## Acceptance Criteria

- [ ] Cada finding referencia documento fuente.
- [ ] Pipeline es reejecutable e idempotente.
- [ ] Failures por documento no abortan toda la oportunidad.
- [ ] Findings pueden ser consumidos por UI o scoring.

## Verification

- Tests de parser/extractor con fixtures.
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- Smoke con documento publico no sensible.

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] Docs actualizadas si se agrega policy IA.

## Follow-ups

- Scoring V2 o proposal assistant future task.
