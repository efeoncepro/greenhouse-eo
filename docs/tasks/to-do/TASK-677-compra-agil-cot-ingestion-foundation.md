# TASK-677 — Compra Agil Monthly COT Ingestion Foundation

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
- Blocked by: `TASK-674`, `TASK-678`, `TASK-680`
- Branch: `task/TASK-677-compra-agil-cot-ingestion`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementa la ingesta durable de Compra Agil desde archivos mensuales `COT_<YYYY-MM>.zip` de datos abiertos ChileCompra, normalizando cotizaciones, items/ofertas y links a OC. Tras la publicacion y validacion de la API Compra Agil v2 Beta el 2026-05-30, este carril debe tratarse como historico/backfill/benchmark y fallback, no como la unica fuente oficial live.

## Why This Task Exists

El research inicial valido que Compra Agil existia como dataset mensual COT antes de tener API oficial disponible. Aunque la API Compra Agil v2 Beta ya autentica con el ticket canonico de Mercado Publico, el dataset COT sigue siendo necesario para historico mensual, backfills, benchmarks y reconciliacion de brechas si la Beta degrada.

## Goal

- Descargar, validar, parsear y persistir archivos COT mensuales como carril historico/backfill/benchmark/fallback.
- Normalizar `CodigoCotizacion`, items, fechas, comprador, proveedor/oferta y `CodigoOC`.
- Soportar replay idempotente y freshness mensual.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/schema-snapshot-baseline.sql`

Reglas obligatorias:

- El parser debe manejar CSV `;` y encoding Latin-1/Windows-1252.
- No depender de endpoints internos del SPA `compra-agil.mercadopublico.cl`.
- Toda escritura debe ser idempotente por `space_id + CodigoCotizacion + row grain`.
- Usar `greenhouse-agent` antes de escribir backend/DB.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`

## Dependencies & Impact

### Depends on

- `TASK-674`
- `TASK-678`
- `TASK-680`
- Dataset oficial `https://transparenciachc.blob.core.windows.net/trnspchc/COT_<YYYY-MM>.zip`

### Blocks / Impacts

- `TASK-682`
- `TASK-683`
- `TASK-686`
- `TASK-687`

### Files owned

- `migrations/`
- `src/lib/integrations/mercado-publico/compra-agil/`
- `src/lib/commercial/public-procurement/`
- `src/app/api/cron/`
- `scripts/`

## Current Repo State

### Already exists

- Research con smoke de `COT_2026-03.zip`, columnas y volumen aproximado.
- Research actualizado 2026-05-30 con API Compra Agil v2 Beta oficial validada via `api2.mercadopublico.cl` y header `ticket`.

### Gap

- No hay downloader/parser ni tablas conformed para Compra Agil.
- No hay policy de retention para raw zip/csv.
- La decision operativa debe venir de `TASK-678`: API v2 como live source, COT mensual como historico/backfill/benchmark/fallback y OC como cierre/post-award.

## Scope

### Slice 1 — Raw Download And Validation

- Descargar mensual por periodo.
- Validar checksum/tamano/estructura cuando sea posible.
- Registrar run, periodo, bytes, filas y errores de parseo.

### Slice 2 — Parser And Conformed Upsert

- Parsear COT1/COT2 segun columnas reales.
- Upsert de oportunidades Compra Agil, supplier quotes/items y OC links sin sobreescribir campos live ya observados por API v2 con datos mensuales mas antiguos.
- Mantener raw row hash para idempotencia y drift detection.

### Slice 3 — Operations

- Agregar script de replay por periodo.
- Documentar SLA mensual, fallback y manejo de archivos faltantes.

## Out of Scope

- Implementar API v2 Beta live adapter o modificar su source-of-truth decision (ver `TASK-678`).
- Web scraping del portal Compra Agil.
- UI.
- Postulacion/cotizacion automatica.

## Acceptance Criteria

- [ ] Un periodo COT puede reingestarse sin duplicados.
- [ ] El sync registra runs/watermarks por periodo.
- [ ] Las oportunidades Compra Agil quedan marcadas como RFQ-like o motion canonica definida.
- [ ] `CodigoOC` queda disponible para reconciliacion con `TASK-676`.
- [ ] Errores de encoding/filas corruptas no abortan todo el lote si pueden aislarse.

## Verification

- `pnpm migrate:up`
- Test unitario de parser con fixture pequeno.
- Test de idempotencia de upsert.
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado con periodo probado.
- [ ] Docs operativas actualizadas.
- [ ] schema snapshot/db types actualizados si aplica.

## Follow-ups

- `TASK-678`
- `TASK-682`
