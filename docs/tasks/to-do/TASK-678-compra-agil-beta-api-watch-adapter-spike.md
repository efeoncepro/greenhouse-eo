# TASK-678 — Compra Agil Beta API Watch And Adapter Spike

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
- Branch: `task/TASK-678-compra-agil-beta-api-watch`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Monitorea y documenta la Beta API oficial de Compra Agil anunciada por ChileCompra para mayo 2026, comparandola contra el carril COT mensual. Si el contrato es accesible y estable, deja especificado un adapter futuro sin reemplazar prematuramente la fuente COT.

## Why This Task Exists

El research encontro senales oficiales de una Beta API de Compra Agil, pero al 2026-04-26 el contrato productivo no estaba disponible como endpoint publico estable. Greenhouse necesita estar listo para adoptarla sin construir sobre endpoints internos bearer-protected del SPA.

## Goal

- Verificar disponibilidad/documentacion oficial de la Beta API.
- Comparar cobertura, freshness, auth, rate limits y campos contra COT.
- Proponer adapter y plan de convivencia si procede.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:

- Usar solo fuentes oficiales o contratos autorizados.
- No consumir endpoints internos del SPA como dependencia productiva.
- Si se investiga internet, citar fuentes y fechas exactas.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-674`

### Blocks / Impacts

- Puede crear una task de implementacion futura para adapter Beta API.
- Ajusta `TASK-677` si la Beta API reemplaza o complementa COT.

### Files owned

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `Handoff.md`

## Current Repo State

### Already exists

- Research con hallazgo de Beta API y datasets COT.

### Gap

- No hay contrato oficial versionado de Beta API en repo.
- No hay decision de adopcion o convivencia.

## Scope

### Slice 1 — Official Contract Check

- Buscar documentacion oficial actualizada.
- Verificar auth, endpoints, formatos, rate limits y terminos de uso.

### Slice 2 — Coverage Comparison

- Comparar campos Beta API vs COT y OC.
- Identificar si permite freshness diaria/near-real-time.

### Slice 3 — Adapter Recommendation

- Documentar decision: esperar, adoptar como complementaria, o reemplazar COT parcialmente.
- Crear follow-up implementation task si procede.

## Out of Scope

- Implementar adapter productivo.
- Scraping o automatizacion de portal.

## Acceptance Criteria

- [ ] `RESEARCH-007` contiene estado actualizado de Beta API con fecha.
- [ ] Queda decision documentada sobre usar/no usar/esperar.
- [ ] Si hay endpoint usable, queda task follow-up creada o explicitamente descartada.

## Verification

- Revision manual de fuentes citadas.
- `rg -n "Beta API|Compra Agil|COT_" docs/research docs/architecture docs/tasks`

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] Research actualizado con fuentes y fecha.

## Follow-ups

- Adapter productivo Beta API si el contrato oficial esta disponible.
