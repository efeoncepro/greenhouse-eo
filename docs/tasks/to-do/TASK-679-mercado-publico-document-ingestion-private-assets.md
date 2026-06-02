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
- Blocked by: `TASK-674`, `TASK-675`, `TASK-678`
- Branch: `task/TASK-679-mercado-publico-documents-assets`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Productiviza la recuperacion de adjuntos de Mercado Publico: descubre referencias desde APIs/fichas publicas, descarga documentos por un carril autorizado cuando sea permitido, persiste metadata y guarda assets privados con hashes, versionado y controles de acceso. Compra Agil v2 ya expone metadata de adjuntos, pero no descarga binaria oficial documentada.

## Why This Task Exists

Licitalab y otros productos muestran adjuntos porque combinan la API con la ficha publica o flujos autenticados del portal. Greenhouse ya valido el enfoque WebForms para licitaciones, y el 2026-05-30 valido que Compra Agil v2 devuelve `documentos[].id` y `documentos[].nombre`; sin embargo, la API v2 no documenta descarga de binarios y los endpoints internos del portal requieren sesion/Bearer. Aun no hay storage durable, control de duplicados ni policy legal/operativa para documentos.

## Goal

- Persistir metadata de documentos por oportunidad.
- Descargar y almacenar assets privados con hash y content metadata.
- Exponer readers seguros para UI/IA sin filtrar documentos entre tenants.
- Diferenciar explicitamente documentos `discovered` metadata-only de documentos `downloaded`.

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
- Para Compra Agil v2, persistir `documentos[].id`/`documentos[].nombre` como metadata oficial, pero no marcar `downloaded` si no hay binario.
- No usar endpoints internos `servicios-compra-agil.mercadopublico.cl/v1/*` como backend productivo sin autorizacion explicita; si se exploran, deben quedar como `blocked`/`requires_user_session`.
- Usar `greenhouse-agent`; si se crean API routes, sumar `vercel:nextjs`.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/research/TASK-673-findings.md`

## Dependencies & Impact

### Depends on

- `TASK-674`
- `TASK-675`
- `TASK-678`
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
- Compra Agil v2 API oficial expone metadata de documentos:
  - `5756-282-COT26` -> `1540510 / CARROS.pdf`
  - `1195-39-COT26` -> `68071 / ANEXO ADQUISICIÓN DE MATERIALES ELÉCTRICOS EXPO PATAGONIA.docx`
- Smokes 2026-05-30:
  - rutas probables de descarga en `api2.mercadopublico.cl` devolvieron `403 Missing Authentication Token`;
  - endpoints internos del portal `servicios-compra-agil.../v1/compra-agil/*/descargar*` devolvieron `401 Unauthorized` o `503` sin sesion.

### Gap

- No hay tabla de documentos.
- No hay storage privado de archivos.
- No hay reader/API tenant-aware de documentos.
- No hay carril autorizado confirmado para descargar binarios de adjuntos Compra Agil.

## Scope

### Slice 1 — Document Metadata

- Crear tabla de documentos/versiones segun contrato de `TASK-674`.
- Persistir filename, content type, size, hash, source reference y download status.
- Soportar filas metadata-only para Compra Agil v2 con `source_document_id`, `filename`, `source_surface='mercado_publico_compra_agil_v2'` y estado `discovered`/`blocked` hasta que exista descarga autorizada.

### Slice 2 — Asset Storage

- Implementar storage adapter privado usando patron existente del repo si existe; si no, documentar decision.
- Descargar con retry, dedupe por hash y limites de tamano.
- Para Compra Agil, implementar descarga solo si existe contrato oficial/autorizado; si no, persistir estado `blocked` o `requires_user_session` con motivo auditable.

### Slice 3 — Secure Readers

- Crear readers tenant-aware para listar documentos y obtener signed/access-controlled download.
- Agregar tests de auth/tenant isolation.
- La UI/API debe distinguir `Adjunto detectado` de `Archivo descargado` y no ofrecer descarga cuando no hay asset.

## Out of Scope

- Extraccion IA de requisitos.
- UI completa.
- Extension Chrome.
- Automatizar endpoints internos Compra Agil bearer-protected desde backend sin contrato oficial.

## Acceptance Criteria

- [ ] Los documentos se pueden descubrir y persistir por oportunidad.
- [ ] La descarga es idempotente y no duplica assets por hash.
- [ ] Readers/API filtran por `space_id` y capability de descarga.
- [ ] Estados de documento diferencian `discovered`, `downloaded`, `failed`, `blocked`.
- [ ] Compra Agil v2 queda representada como metadata-only cuando no exista descarga binaria autorizada.

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
