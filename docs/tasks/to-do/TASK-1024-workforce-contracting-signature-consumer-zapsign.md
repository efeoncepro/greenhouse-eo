# TASK-1024 — Workforce Contracting Studio: Signature consumer (ZapSign via EPIC-001)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Epic: Workforce Contracting Studio (ADR `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` §7, §12.3)
- Created: 2026-06-05

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
