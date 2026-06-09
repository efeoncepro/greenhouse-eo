# TASK-1025 — Workforce Contracting Studio: Notification / email templates + reminders

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Epic: Workforce Contracting Studio (ADR `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` §9, §12.5)
- Created: 2026-06-05

## Why

Los emails del Studio son **event-driven**: Contracting emite eventos de dominio; Notification Hub / email adapters entregan. La foundation (TASK-1019) ya emite los eventos base (`ready_for_signature`, `signature_pending_overdue`); faltan las 4 familias de comunicación + el cron de recordatorios.

## Scope

- 4 familias de email (ADR §9), localizadas por destinatario pero **el documento adjunto/renderizado permanece bilingüe**; "Firmado" = confirmación del adapter + evidencia ingerida (sin overclaiming legal):
  | Email | Trigger | Destinatario |
  | --- | --- | --- |
  | Pre-firma | PDF/firma listo | colaborador + firmantes |
  | Post-firma | todos firmaron | colaborador + HR/legal admins |
  | Recordatorio firma pendiente | firmante vencido | firmante pendiente + owner admin |
  | Rechazo/corrección | rechazo o void | owner admin + colaborador si aplica |
- Templates React Email + Resend (patrón existente) con copy canónica es-CL (TASK-265); idempotencia vía `sendEmail({ sourceEventId, sourceEntity })`.
- Cron de recordatorios (Cloud Scheduler / ops-worker, NO Vercel cron async-critical — TASK-775) leyendo el signal `signature_pending_overdue`.
- Projections reactivas sobre los eventos (patrón TASK-771/981), NO envío inline en request path.

## Dependencies & Impact

- **Depende de:** TASK-1024 (eventos de firma) + TASK-1023 (adjunto PDF). TASK-1019 (eventos base).
- **Impacta a:** cierra el loop end-to-end de comunicación del Studio.
- **Archivos owned:** `src/views/emails/WorkforceContracting*.tsx`, projections `src/lib/sync/projections/contracting-*-email.ts`, cron handler.

## Out of Scope

- PDF/firma (TASK-1023/1024). Notificaciones Teams (futuro, si aplica).

## Acceptance

- Las 4 familias disparan por evento, idempotentes, copy es-CL revisada (greenhouse-ux-writing), adjunto bilingüe.
- Recordatorios via cron canónico; verificación con caso real (preview endpoint + render Chromium).

## Delta 2026-06-05 — TASK-1024 ✅ complete: eventos del bridge de firma disponibles

El bridge contrato↔firma (TASK-1024) está complete en `develop`. Esta task ya puede consumir los 3 eventos v1 estables (aggregate `workforce_contracting_case`):
- `workforce.contracting.sent_for_signature` — `{caseId, signatureRequestId}` (caso enviado a firma).
- `workforce.contracting.signature_completed` — `{caseId, signatureRequestId, signatureStatus, signedPdfAssetId}` (caso `fully_signed`; el PDF firmado ya está ligado al caso en `signed_pdf_asset_id`).
- `workforce.contracting.signature_failed` — `{caseId, signatureRequestId, signatureStatus}` (firma falló/expiró).

Registrar un reactive consumer (patrón `registerProjection`) filtrando por estos eventos. NO re-derivar el estado de firma: leer el caso (`signed_pdf_asset_id`, `status`) o el `signature_request`.
