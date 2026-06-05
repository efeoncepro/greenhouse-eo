# TASK-490 — Signature Orchestration Foundation

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Code complete (foundation) — adapter ZapSign + webhook = TASK-491`
- Rank: `TBD`
- Domain: `documents`
- Blocked by: `none` (era TASK-489 — desacoplado por OQ-A)
- Branch: `task/TASK-490-signature-orchestration-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

> **EPIC-017 alignment 2026-05-31:** esta task bloquea nuevos workflows de firma iniciados desde People/Workforce, pero no bloquea visualizacion read-only de documentos o signature status ya registrado. Person 360 debe consumir la capa provider-neutral, no ZapSign directo. Ver `TASK-964`.

Crear la capa provider-neutral de firma electrónica para que Greenhouse modele requests, signers, estados, eventos y artifacts firmados sin acoplar la semántica del negocio a ZapSign o a un flujo exclusivo de MSA.

## Why This Task Exists

La firma ya apareció en Finance con ZapSign, pero todavía como una necesidad de MSA. Eso no escala a contratos laborales, anexos, work orders o cualquier otro documento que requiera signers múltiples, reintentos, cancelación o auditoría. Esta task separa el dominio "signature orchestration" del provider.

## Goal

- Introducir `signature_request` como agregado transversal del repo.
- Modelar signers, estados y trail de eventos con semántica neutral.
- Permitir que el documento firmado vuelva al registry canónico como nueva versión.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

Reglas obligatorias:

- la orquestación no debe depender de un provider único
- la auditoría de eventos debe sobrevivir a retries, callbacks tardíos y reconciliaciones
- el documento firmado final vuelve a Greenhouse como asset/version canónica

## Dependencies & Impact

### Depends on

- `TASK-489`
- `src/lib/storage/greenhouse-assets.ts`
- webhook bus canónico

### Blocks / Impacts

- `TASK-491`
- `TASK-495`
- futuros flujos HR y Legal

### Files owned

- `migrations/**`
- `src/lib/signatures/**`
- `src/app/api/**` si nacen routes shared
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- primer uso de ZapSign en TASK-461
- asset pipeline para PDFs privados
- webhook infrastructure canónica documentada

### Gap

- no existe modelo común de `signature_request`
- signers y estados viven implícitos en payloads de provider
- no hay contrato para múltiples dominios consumidores

## Scope

### Slice 1 — Schema

- `signature_requests`
- `signature_request_signers`
- `signature_request_events`

### Slice 2 — Runtime

- create/cancel/reconcile signature request
- attach signer list
- publish domain events reutilizables

### Slice 3 — Document bridge

- cuando la firma se complete, registrar artifact firmado como nueva versión documental

## Out of Scope

- adapter específico de ZapSign
- UI final de seguimiento
- plantillas/rendering

## Acceptance Criteria

- [x] existe un agregado reusable para firma electrónica independiente del provider (`signature_requests` + hexagonal `SignatureProviderAdapter` port)
- [x] el trail de eventos soporta conciliación y callbacks fuera de orden (`signature_request_events` append-only + `applyProviderStatus` monotónico + `reconcileSignatureRequest`)
- [x] el artifact firmado se integra con el registry documental canónico (private asset context `signature_signed_document` + `signed_document_asset_id` FK; el bridge consumer del dominio liga la versión — late-binding TASK-489)

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- tests unitarios sobre state transitions

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado

## Delta 2026-06-05 — Hardening pre-execution (arch-architect) + Open Questions resueltas

El spec original es un esqueleto. Discovery (reutilizando la investigación ZapSign/MSA del arch review de TASK-1023) + arch-architect overlay resuelven las decisiones implícitas con la opción más robusta. **Sin cambio de objetivo**: aggregate provider-neutral + signers + trail + bridge del artefacto firmado.

### Open Questions resueltas

- **OQ-A — "Blocked by TASK-489" pero TASK-489 no existe.** → **DESACOPLADO** (consistente con el arch review de TASK-1023). El artefacto firmado se guarda como **private asset (TASK-721)** referenciado por `signature_requests.signed_document_asset_id`; el evento `signature.request.completed` lo lleva, y el **dominio consumidor** (caso de contratación → `signed_pdf_asset_id`; MSA → `signed_document_asset_id`) lo liga vía consumer reactivo. El "nuevo version en el registry" (TASK-489) es **late-binding** cuando aterrice. **TASK-490 NO requiere TASK-489.** `Blocked by` → `none`.
- **OQ-B — frontera provider (TASK-490 vs TASK-491).** → TASK-490 = aggregate provider-neutral + runtime (create/cancel/reconcile) + el **port** `SignatureProviderAdapter` (interface, DI inyectable como el adapter Claude de contracting). TASK-491 = el adapter ZapSign real + webhook bus canónico. TASK-490 ships un adapter mock/no-op para testear el aggregate en aislamiento. Guarda `provider` (enum, V1 `zapsign`) + `provider_document_token` + `provider_payload` (raw, para reconciliación).
- **OQ-C — link al dominio iniciador.** → `signature_requests.source_kind` (enum: `contracting_case`, `master_agreement`, extensible) + `source_ref` (aggregate id). El dominio consumidor reacciona al evento `completed` (consumer reactivo keyed por source_kind). El platform NO conoce specifics de contracting/MSA.
- **OQ-D — moduleKey/domain nuevos vs reuse.** → **Identidad dedicada `documents`** (EPIC-001 es plataforma transversal documento+firma, boundary distinto de commercial/finance/hr): `captureWithDomain('documents')` + reliability module `documents` + entitlements module `documents`. Future TASK-489 registry rollea acá también.
- **OQ-E — asset context del PDF firmado.** → nuevo context `signature_signed_document` (TASK-490 lo declara; TASK-491 guarda los bytes descargados ahí). Access: HR ∪ Finance ∪ admin ∪ own member ∪ own client (mirror contracting).
- **OQ-F — migración del lane MSA al nuevo aggregate.** → **Out of scope.** El aggregate nuevo coexiste con las columnas inline de `master_agreements` + su webhook. El consumer contracting (TASK-1024) usa el aggregate nuevo. Migrar MSA es follow-up (no rompe nada).

### Decisiones de schema

- Schema: **`greenhouse_core`** (transversal, consistente con el `greenhouse_core.documents` de TASK-489).
- 3 tablas: `signature_requests` (aggregate + state machine) + `signature_request_signers` (per-signer) + `signature_request_events` (append-only audit, anti-UPDATE/DELETE triggers — patrón TASK-765).
- State machine: `draft → sent → partially_signed → completed | cancelled | failed | expired`. Signers: `pending → signed | declined`. CHECK enums + trail trio.
- Idempotency: `signature_requests.idempotency_key UNIQUE`; reconcile re-lee el provider (out-of-order callbacks safe).

### `Blocked by`: `none` (era TASK-489 — desacoplado por OQ-A).

## Delta 2026-06-05 — Implementación (foundation code complete)

Implementado en `develop` (sin branch, autorizado). 3 slices + verificación. El adapter ZapSign real + el webhook inbound + el bridge `ready_for_signature` (workforce_contracting → signature_request) son **TASK-491** (este foundation ships el port + un `notImplementedSignatureAdapter` que lanza 503 hasta entonces).

### Slice 1 — Schema + asset context + types + state machine (commit `c23a2a942`)

- Migración `20260605210419134_task-490-signature-orchestration.sql` (+3 tablas → 430 total): `signature_requests` (PK `signature_request_id`, enum `provider`/`status`, `source_kind`/`source_ref` polimórfico, `document_asset_id`/`signed_document_asset_id`/`audit_report_asset_id` FK, `provider_payload` JSONB, `idempotency_key` UNIQUE, CHECK `status<>'completed' OR signed_document_asset_id IS NOT NULL`) + `signature_request_signers` (enum `role`/`status`) + `signature_request_events` (append-only, triggers anti-UPDATE/DELETE). Indexes: provider_token (partial), source, pending.
- Asset context canónico `signature_signed_document` (retention `document_vault`, prefix `signature-signed-documents`) + `canAccessSignatureSignedDocumentAsset` (own member / own client / HR / Finance / admin).
- `src/lib/signatures/types.ts` + `state-machine.ts` (`OPERATOR_TRANSITIONS` strict + `applyProviderStatus` monotónico/out-of-order tolerant) + `state-machine.test.ts` (8 tests).

### Slice 2 — Runtime + provider port + commands (commit `49cb29c06`)

- `provider-port.ts`: `SignatureProviderAdapter` interface (DI) + `notImplementedSignatureAdapter` (503 hasta TASK-491).
- `store.ts`: `getSignatureRequestById`/`ByProviderToken`/`ByIdempotencyKey` + `listSignersForRequest` (dual-mode `client?`, `forUpdate`).
- `commands.ts`: `createSignatureRequest` (idempotente), `sendSignatureRequest` (adapter DI), `cancelSignatureRequest`, `applyProviderSignatureUpdate` (webhook/reconcile core — monotónico, idempotente, emite el status event solo en cambio real), `reconcileSignatureRequest` (re-lee provider). Todos atómicos dual-mode en `withGreenhousePostgresTransaction`, append-only event + outbox in-tx.
- `event-catalog.ts`: `AGGREGATE_TYPES.signatureRequest` + 7 `signature.request.*` EVENT_TYPES.

### Slice 3 — Identidad `documents` (commit `d08b2f52d`)

- `captureWithDomain` domain `documents`.
- Entitlements module `documents` + capability `documents.signature_request` (read/create/update/manage) + runtime grant (hr ∪ EFEONCE_ADMIN ∪ FINANCE_ADMIN; invariant TASK-873/935 — grant-coverage test verde).
- Reliability module `documents` + 3 signals (`pending_overdue`/lag, `failed`/drift, `signed_artifact_missing`/data_quality) wired en `get-reliability-overview`; incident-mapping hints + priority.
- EVENT_CATALOG Delta: 7 `signature.request.*` v1.

### Verificación

- `pnpm exec tsc --noEmit`: **0 errores**.
- `pnpm lint`: **0**.
- `pnpm test` (full) + `pnpm build`: ver Handoff (gate de cierre canónico, TASK-490 toca registries compartidos).
- Focal: `state-machine.test.ts` (8) + `capability-grant-coverage.test.ts` + `registry-store.test.ts` (21 total) verdes.

### Pendiente (TASK-491 / follow-up)

- Adapter ZapSign real (`base64_pdf`/`base64_docx`) + webhook inbound (firma callbacks → `applyProviderSignatureUpdate`).
- Bridge `ready_for_signature` (workforce_contracting case → `createSignatureRequest` + `sendSignatureRequest`).
- Routes operador-facing (`/api/documents/signature-requests/**`) gated por `documents.signature_request` + mapeo a `canonicalErrorResponse` (los `SignatureValidationError.code` ya son es-CL + statusCode).
- Capabilities registry DB seed (mirror TASK-872 pattern) cuando aterrice la primera route can()-checked.
