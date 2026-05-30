# TASK-678 — Compra Agil v2 Beta API Adapter Spike

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `research+implementation-spike`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-674`
- Branch: `task/TASK-678-compra-agil-beta-api-watch`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Documenta y prototipa el adapter oficial de Compra Agil v2 Beta publicado por ChileCompra en mayo 2026, comparandolo contra el carril COT mensual. La API ya esta disponible en `api2.mercadopublico.cl` y autentica con el ticket canonico de Mercado Publico mediante header HTTP `ticket`.

## Why This Task Exists

El research encontro senales oficiales de una Beta API de Compra Agil, y el 2026-05-30 se valido que el contrato oficial ya esta publicado y responde con el ticket canonico `greenhouse-mercado-publico-ticket`. Greenhouse necesita adoptarla como carril live/near-real-time sin construir sobre endpoints internos bearer-protected del SPA y sin perder el valor historico/backfill del dataset mensual COT.

## Goal

- Congelar el contrato oficial de API Compra Agil v2 Beta.
- Comparar cobertura, freshness, auth, rate limits y campos contra COT.
- Proponer/prototipar adapter y plan de convivencia con COT y OC.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:

- Usar solo fuentes oficiales o contratos autorizados.
- No consumir endpoints internos del SPA como dependencia productiva.
- Usar header `ticket: <ticket>` para Compra Agil v2; no query param `ticket=`.
- Resolver el ticket via `MERCADO_PUBLICO_TICKET_SECRET_REF`/Secret Manager o fallback local, sin imprimirlo.
- Manejar `429`, paginacion, retries acotados y watermarks por `fechas.fecha_ultimo_cambio`.
- Tratar `documentos[].id` y `documentos[].nombre` como metadata descubierta; no asumir descarga binaria por API v2.
- No consumir endpoints internos `servicios-compra-agil.mercadopublico.cl/v1/*` para adjuntos desde backend productivo sin autorizacion explicita.
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
- Documentacion oficial ChileCompra: `Documentacion_API_Compra_Agil.pdf`, version 3.0, mayo 2026.
- Smoke 2026-05-30:
  - API clasica `licitaciones.json?estado=activas&ticket=...`: `HTTP 200`, `Cantidad=4210`.
  - API Compra Agil v2 `GET /v2/compra-agil` con header `ticket`: `HTTP 200`, `success=OK`.
  - Rango `2026-05-29..2026-05-30`: `total_resultados=3114`, `total_paginas=312`, `items_count=10`.
  - Detalle Compra Agil v2 expone adjuntos como metadata: `documentos[].id` y `documentos[].nombre` (ej. `CARROS.pdf`, `ANEXO ADQUISICIÓN DE MATERIALES ELÉCTRICOS EXPO PATAGONIA.docx`).
  - Smokes contra rutas probables de descarga en `api2.mercadopublico.cl` devolvieron `403 Missing Authentication Token`; la guia oficial no documenta endpoint de descarga de adjuntos.
  - Bundle SPA referencia endpoints internos de adjuntos, pero sin sesion devuelven `401 Unauthorized` o `503`; no son contrato productivo.

### Gap

- No hay adapter productivo ni types/runtime helpers para Compra Agil v2.
- No hay decision cerrada de convivencia live API v2 + COT mensual + OC `Tipo=AG`.
- No hay carril oficial de descarga binaria de documentos Compra Agil; solo metadata de adjuntos por API v2.

## Scope

### Slice 1 — Official Contract Freeze

- Versionar resumen operativo del contrato oficial, incluyendo auth, endpoints, filtros, paginacion, estados, campos y errores.
- Confirmar headers/cuota observables sin imprimir el ticket.

### Slice 2 — Coverage Comparison

- Comparar campos Beta API vs COT y OC.
- Identificar si permite freshness diaria/near-real-time.
- Documentar cobertura de documentos: metadata visible por API v2, descarga no documentada, endpoints internos no autorizados.

### Slice 3 — Adapter Recommendation

- Documentar decision: adoptar API v2 como live source y mantener COT para historico/backfill/benchmark, salvo hallazgo contrario.
- Crear follow-up implementation task si procede.
- Definir estado `documents_discovered_only` o equivalente hasta que `TASK-679` resuelva descarga autorizada.

## Out of Scope

- Implementar adapter productivo.
- Scraping o automatizacion de portal.

## Acceptance Criteria

- [ ] `RESEARCH-007` contiene estado actualizado de Beta API con fecha.
- [ ] Queda decision documentada sobre API v2 live + COT historico/backfill + OC reconciliation.
- [ ] Si hay endpoint usable, queda task follow-up creada o explicitamente descartada.
- [ ] El plan de adapter cubre secret resolution, `429`, paginacion, watermarks y honest degradation.
- [ ] El plan documenta que adjuntos Compra Agil v2 son metadata-only hasta resolver descarga autorizada.

## Verification

- Revision manual de fuentes citadas.
- `rg -n "Beta API|Compra Agil|COT_|documentos\\[\\]|adjuntos" docs/research docs/architecture docs/tasks`

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] Research actualizado con fuentes y fecha.

## Follow-ups

- Adapter productivo Beta API si el contrato oficial esta disponible.
