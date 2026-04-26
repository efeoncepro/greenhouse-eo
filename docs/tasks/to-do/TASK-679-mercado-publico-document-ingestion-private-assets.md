# TASK-679 — Mercado Publico Document Ingestion And Private Assets

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
- Blocked by: `TASK-674`, `TASK-675`
- Branch: `task/TASK-679-mercado-publico-documents-assets`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Productiviza la recuperacion de adjuntos de Mercado Publico: descubre referencias desde fichas publicas, descarga documentos por WebForms cuando sea permitido, persiste metadata y guarda assets privados con hashes, versionado y controles de acceso.

## Why This Task Exists

Licitalab y otros productos muestran adjuntos porque combinan la API con la ficha publica. Greenhouse ya valido el enfoque en helper, pero aun no hay storage durable, control de duplicados ni policy legal/operativa para documentos.

## Goal

- Persistir metadata de documentos por oportunidad.
- Descargar y almacenar assets privados con hash y content metadata.
- Exponer readers seguros para UI/IA sin filtrar documentos entre tenants.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `space_id` en metadata y queries.
- Los assets deben ser privados; no guardar URLs publicas temporales como fuente de verdad.
- Verificar terminos de uso y respetar robots/limites razonables.
- Usar `greenhouse-agent`; si se crean API routes, sumar `vercel:nextjs`.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/research/TASK-673-findings.md`

## Dependencies & Impact

### Depends on

- `TASK-674`
- `TASK-675`
- `src/lib/integrations/mercado-publico/tenders.ts`

### Blocks / Impacts

- `TASK-685`
- `TASK-683`

### Files owned

- `migrations/`
- `src/lib/integrations/mercado-publico/`
- `src/lib/commercial/public-procurement/`
- `src/app/api/commercial/`

## Current Repo State

### Already exists

- Helper de discovery/descarga WebForms en `src/lib/integrations/mercado-publico/tenders.ts`.

### Gap

- No hay tabla de documentos.
- No hay storage privado de archivos.
- No hay reader/API tenant-aware de documentos.

## Scope

### Slice 1 — Document Metadata

- Crear tabla de documentos/versiones segun contrato de `TASK-674`.
- Persistir filename, content type, size, hash, source reference y download status.

### Slice 2 — Asset Storage

- Implementar storage adapter privado usando patron existente del repo si existe; si no, documentar decision.
- Descargar con retry, dedupe por hash y limites de tamano.

### Slice 3 — Secure Readers

- Crear readers tenant-aware para listar documentos y obtener signed/access-controlled download.
- Agregar tests de auth/tenant isolation.

## Out of Scope

- Extraccion IA de requisitos.
- UI completa.
- Extension Chrome.

## Acceptance Criteria

- [ ] Los documentos se pueden descubrir y persistir por oportunidad.
- [ ] La descarga es idempotente y no duplica assets por hash.
- [ ] Readers/API filtran por `space_id` y capability de descarga.
- [ ] Estados de documento diferencian `discovered`, `downloaded`, `failed`, `blocked`.

## Verification

- `pnpm migrate:up`
- Tests de document reader/downloader.
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- Smoke con una licitacion publica de prueba sin imprimir secretos.

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] schema snapshot/db types actualizados si aplica.
- [ ] Docs funcionales/operativas actualizadas si cambia flujo visible.

## Follow-ups

- `TASK-685`
