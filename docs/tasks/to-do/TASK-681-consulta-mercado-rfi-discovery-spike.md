# TASK-681 — Consulta al Mercado / RFI Discovery Spike

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `policy`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-674`
- Branch: `task/TASK-681-consulta-mercado-rfi-discovery`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Investiga profundamente como Mercado Publico expone consultas al mercado/RFI/RF y si pueden descubrirse via API oficial, datos abiertos o ficha publica. La salida es una decision documentada y, si procede, una task de implementacion separada.

## Why This Task Exists

RFI no es lo mismo que licitacion ni Compra Agil: puede ser inteligencia de mercado, no una postulacion inmediata. Greenhouse debe modelarla sin forzarla al pipeline de bid/no-bid si la fuente y lifecycle son diferentes.

## Goal

- Confirmar fuentes oficiales disponibles para RFI/RF.
- Mapear campos, lifecycle y documentos asociados.
- Decidir si entra en el mismo agregado productivo o en un carril posterior.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:

- Citar fuentes oficiales y fecha de consulta.
- No convertir endpoints internos o UI scraping en contrato productivo sin decision explicita.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`

## Dependencies & Impact

### Depends on

- `TASK-674`

### Blocks / Impacts

- Puede generar task de ingesta RFI.
- Ajusta `TASK-680` si aparecen codigos nuevos.

### Files owned

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `Handoff.md`

## Current Repo State

### Already exists

- Research inicial menciona RFI/RF como familia pendiente.

### Gap

- No esta confirmado el endpoint/fuente oficial ni el grano de RFI.

## Scope

### Slice 1 — Source Discovery

- Revisar documentacion oficial y datos abiertos.
- Probar busquedas no destructivas si hay endpoint/documento publico.

### Slice 2 — Domain Mapping

- Documentar como se diferencian RFI, RFP/RFQ y Compra Agil.
- Proponer mapping a `commercial_motion`.

### Slice 3 — Decision

- Actualizar research/arquitectura.
- Crear follow-up implementation task si corresponde.

## Out of Scope

- Ingesta productiva.
- UI.
- Automatizar respuestas.

## Acceptance Criteria

- [ ] Queda documentado si RFI/RF es descubrible y por que fuente.
- [ ] Queda decision sobre incluirlo en el agregado V1 o postergar.
- [ ] Codigos nuevos quedan propuestos para `TASK-680`.

## Verification

- Revision manual de fuentes.
- `rg -n "RFI|Consulta al Mercado|RF" docs/research docs/architecture docs/tasks`

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.

## Follow-ups

- Task de ingesta RFI si la fuente es viable.
