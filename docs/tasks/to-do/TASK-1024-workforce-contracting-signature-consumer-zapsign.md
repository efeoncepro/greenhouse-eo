# TASK-1024 — Workforce Contracting Studio: Signature consumer (ZapSign via EPIC-001)

## Status

- Lifecycle: `to-do`
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

- Caso con PDF aprobado → enviado a ZapSign via EPIC-001 → webhook converge estado → PDF firmado + audit ingeridos como private assets.
- 3 signals operativos; `pnpm test`/`build` verdes; verificación con caso real coordinada.
