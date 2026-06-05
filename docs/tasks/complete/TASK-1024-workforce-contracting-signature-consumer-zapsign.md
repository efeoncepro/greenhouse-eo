# TASK-1024 — Workforce Contracting Studio: Signature consumer (ZapSign via EPIC-001)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Epic: Workforce Contracting Studio (ADR `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` §7, §12.3)
- Created: 2026-06-05

## Delta 2026-06-05 — Arch review (arch-architect): TASK-490/491 es el primitivo genuino del camino crítico

Revisión con `arch-architect`. La lane ZapSign **ya existe pero es one-off de MSA**: `src/lib/integrations/zapsign/client.ts` (`createZapSignDocument` base64, `getZapSignDocument`, `isZapSignConfigured`), columnas de firma inline en `greenhouse_commercial.master_agreements`, webhook MSA-específico `/api/webhooks/zapsign` (resuelve por `signature_document_token`), secrets `greenhouse-zapsign-api-token` + `greenhouse-zapsign-webhook-shared-secret` operativos.

- El invariante STUDIO ("NUNCA firma paralela; consume EPIC-001") **prohíbe** reusar el cliente ZapSign crudo como 2ª lane estilo-MSA. Contracting DEBE consumir el `signature_requests` aggregate provider-neutral (TASK-490) + adapter (TASK-491) que **generalizan** la lane MSA.
- **Esta task es el motivo por el que TASK-490/491 están en el camino crítico** (no TASK-489/493). Scope mínimo suficiente para firmar: `signature_requests` + `signature_request_signers` + `signature_request_events` (state machine + webhook inbox) + ZapSign adapter (el cliente ya existe → TASK-491 es envolverlo + dedup + reconciliation). La **migración de MSA** a la nueva orquestación + reconciliation polish puede ser follow-up (no bloquea el primer contrato firmado).
- El PDF de entrada lo provee TASK-1023 (case-owned `pdf_asset_id`); el signed PDF + audit report se ingieren como private assets ligados al caso (no al registry genérico todavía).

## Delta 2026-06-05 — TASK-490 + TASK-491 ✅ complete (dependencia lista)

La foundation de firma (TASK-490) y el adapter+webhook ZapSign (TASK-491) están **complete en `develop`**. Lo que TASK-1024 ya puede consumir directamente (cero plumbing de provider):

- **Crear + enviar a firma**: `createSignatureRequest({ sourceKind:'contracting_case', sourceRef: caseId, documentAssetId, signers, ... })` → `sendSignatureRequest({ signatureRequestId }, zapSignSignatureAdapter)` (`src/lib/signatures/commands.ts` + `src/lib/integrations/zapsign/signature-adapter.ts`). El adapter resuelve el PDF del asset (de TASK-1023) → base64 → ZapSign.
- **Callback**: ya converge al bus (`/api/webhooks/zapsign` handler `zapsign`); el **dispatch cascade** detecta el `signature_request` por `provider_document_token` automáticamente (sin tocar el handler), baja el signed PDF al vault `signature_signed_document`, y emite `signature.request.completed` v1.
- **Lo que falta en TASK-1024** (el bridge, NO el provider): (1) el productor — transición del caso a `ready_for_signature` → `createSignatureRequest` + `sendSignatureRequest` (capability `workforce.contracting.send_signature` a seedear); (2) el consumer reactivo de `signature.request.completed` que liga el `signed_document_asset_id` al `case.signed_pdf_asset_id` + avanza el state machine del caso; (3) capability + UI del CTA "Enviar a firma" en el Bilingual Review Desk; (4) smoke real ZapSign end-to-end (el primer producer real del aggregate).
- El signed PDF se liga al **caso** (no al registry genérico TASK-489 todavía — late-binding).

## Why

Tras aprobación + render del PDF firmable (TASK-1023), el documento se envía a firma electrónica. **ZapSign es solo el provider de firma del colaborador** (no source of truth laboral); Greenhouse archiva la evidencia firmada. La firma se orquesta vía EPIC-001 (NO un orquestador paralelo). La foundation reservó los eventos `ready_for_signature` + la capability `send_signature` (a seedear).

## Scope

- Envío del PDF aprobado a ZapSign vía **EPIC-001 signature orchestration** (`TASK-490`) + adapter (`TASK-491`): upload directo `base64_pdf` (10MB max), NO el template feature de ZapSign (prohíbe imágenes/tablas; nuestros contratos las usan).
- Convergencia de estado vía **webhook inbox canónico** (firma del provider via adapter) → actualiza `documentStatus` (`sent_for_signature` → `partially_signed` → `fully_signed` → `registered_external`/`active`). Links de firma **nunca** persistidos como source of truth.
- Ingestar el **PDF firmado + audit report** como private assets ligados a la versión del documento.
- Seedear capability `workforce.contracting.send_signature` (catalog + `runtime.ts` + guard de cobertura) + EFEONCE_ADMIN V0.
- 3 reliability signals (ADR §10): `signature_pending_overdue`, `zapsign_webhook_lag`, `signed_artifact_missing` (steady/bounded).
- Desbloquear acciones `locked` en TASK-1021 (resend reminders, send to signature) + TASK-1022 (abrir firma / descargar firmado).

## Dependencies & Impact

- **Depende de:** EPIC-001 `TASK-490` (signature orchestration) + `TASK-491` (ZapSign adapter/webhooks). TASK-1023 (PDF render). TASK-1019.
- **Impacta a:** TASK-1025 (post-signature + reminder emails consumen estos eventos), TASK-1026 (registro externo DT/REL parte de la evidencia, NO se asume de la firma).
- **Archivos owned:** `src/lib/workforce/contracting/signature/*`, reliability signals `contracting-signature-*.ts`, webhook handler/adapter wiring.

## Out of Scope

- Render del PDF (TASK-1023). Emails (TASK-1025). Registro DT/REL (TASK-1026).

## Acceptance

- [x] Caso con PDF aprobado → enviado a ZapSign via EPIC-001 (producer command + CTA) → webhook converge estado (consumer reactivo) → PDF firmado ligado al caso (`signed_pdf_asset_id`).
- [x] `pnpm test`/`build` verdes (ver Handoff). Signal de desync operativo.
- [ ] Verificación con caso real ZapSign end-to-end (staging, coordinada con el e2e pendiente de TASK-1023: AI draft → aprobar → generar → **enviar a firma** → firmar → caso `fully_signed`).

## Delta 2026-06-05 — Implementación (bridge contrato↔firma, code complete)

Implementado en `develop` (sin branch, autorizado). 3 slices. Consume EPIC-001 (TASK-490/491) — cero plumbing de provider.

### Open Questions resueltas (pre-execution)

El spec no tenía `## Open Questions`; Discovery (2 Explore agents) + `greenhouse-backend` las resolvieron:

- **OQ-1 ¿Quién firma vía ZapSign?** → **SOLO el trabajador**. La firma del representante legal va pre-estampada en el PDF (TASK-863/1023). E-firma del trabajador válida para contratos (≠ finiquito). `signers=[{role:'worker'}]`.
- **OQ-2 ¿Producer automático o CTA?** → **CTA explícito** (`workforce.contracting.send_signature`). El operador revisa el PDF antes de la e-firma.
- **OQ-3 ¿ZapSign API en tx?** → **NO** (TASK-771). 3-fases: crear request draft (tx) → sendSignatureRequest (sin tx) → avanzar caso (tx). El caso avanza solo si ZapSign aceptó.
- **OQ-4 ¿Link case→request?** → columna `signature_request_id` (additiva FK) en el caso.
- **OQ-5 ¿Signals?** → REUSAR `documents.signature_request.{pending_overdue,failed,signed_artifact_missing}` (TASK-490) + 1 nuevo `workforce.contracting.signature_desync` (el único failure mode nuevo del bridge).
- **OQ-6 ¿Link de firma al worker?** → ZapSign le manda email automático. Portal muestra estado + descarga firmado. NO persistir sign_url (invariante spec).
- **OQ-7 ¿Worker sin email?** → fail-closed (es-CL).

### Slice 1 — Producer (commit `e50702ff4`)

Migración `20260605222647887` (capability `send_signature` registry + columna `signature_request_id`). Command `sendContractingCaseToSignature` (3-fases idempotente) + `resolveContractingWorkerSigner` (fail-closed) + endpoint `POST /api/hr/workforce/contracting/[caseId]/send-to-signature` + catalog/runtime grant (EFEONCE_ADMIN V0) + 3 eventos v1 + case type/mapper PDF fields.

### Slice 2 — Reactive consumer (commit `02823a91f`)

Projection `contracting_signature_bridge` (`signature.request.*` filtrado `sourceKind=contracting_case` → re-lee PG → avanza caso + liga signed PDF + emite eventos; idempotente + cubre crash window). Pure `signature-status-map`. Signal `workforce.contracting.signature_desync` (drift, steady=0). También surfaceé `contractingPdfStatusDrift` (TASK-1023 estaba resolved+packed pero no spreadeado — gap latente).

### Slice 3 — UI (commit `648559516`)

CTA "Enviar a firma" en el Bilingual Review Desk (gated capability + `caseStatus=ready_for_signature`) + badge de estado de firma (pendiente/firmado/falló, color+texto) + "Descargar firmado". Reader `getLatestContractingDraftContent` JOIN del caso (caseStatus/pdfAssetId/signedPdfAssetId). Copy es-CL tokenizado.

### Notas runtime / pendiente

- **Cero secretos nuevos** (ZapSign ya en los 3 envs vía TASK-491).
- **Pendiente**: smoke real ZapSign end-to-end (requiere un caso real en `ready_for_signature` + flag `WORKFORCE_CONTRACTING_AI_ENABLED` staging; mismo e2e pendiente que TASK-1023). El backend está completo + testeado; el live verifica el round-trip ZapSign.
- **GVC del CTA**: la captura del botón vivo requiere un caso real en `ready_for_signature` (parte del e2e staging); el desk base ya fue GVC-verificado en TASK-1021 y el CTA reusa sus patrones (Button + OperationalStatusBadge + toast).
