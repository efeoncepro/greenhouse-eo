# TASK-491 — ZapSign Adapter + Webhook Convergence

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Code complete (foundation) — smoke real ZapSign con un signature_request producer = TASK-1024`
- Rank: `TBD`
- Domain: `documents`
- Blocked by: `none` (TASK-490 ✅ complete)
- Branch: `task/TASK-491-zapsign-adapter-webhook-convergence`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir la integración actual de ZapSign en un adapter canónico de la nueva capa de firma, alineado al webhook bus del repo, con reconciliación operativa, secretos managed y captura del artifact firmado hacia el registry documental.

## Why This Task Exists

El token ya fue validado y TASK-461 demostró que ZapSign sirve para producción. Lo que falta es robustecer la integración para que no sea una lane aislada de MSA: callbacks canónicos, adapter formal, reconciliación y persistencia del artifact final dentro de Greenhouse.

## Goal

- Formalizar ZapSign como primer provider soportado.
- Converger sus callbacks al modelo canónico de webhooks del repo.
- Asegurar que los signed docs entren al registry/versioning común.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/tasks/complete/TASK-461-msa-umbrella-clause-library.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

Reglas obligatorias:

- no crear rutas webhook one-off fuera del contrato canónico salvo bridge temporal explícito
- secretos y base URLs salen de env/Secret Manager, nunca de `data/`
- el adapter debe tolerar retries, duplicados y reconciliación por polling si el webhook falla

## Dependencies & Impact

### Depends on

- `TASK-490`
- `src/lib/integrations/zapsign/client.ts`
- `data/api_zapsign.txt` solo como evidencia manual local

### Blocks / Impacts

- `TASK-495`
- futuros documentos HR o laborales con firma

### Files owned

- `src/lib/integrations/zapsign/**`
- `src/lib/webhooks/**`
- `src/app/api/webhooks/**`
- `src/lib/signatures/**`

## Current Repo State

### Already exists

- cliente ZapSign funcional
- token operativo validado en producción
- secreto publicado en Secret Manager y refs sembradas en Vercel

### Gap

- la integración no está reexpresada como adapter de plataforma
- falta reconciliación y normalización de webhook events
- el path hacia artifact/document version común no está cerrado

## Scope

### Slice 1 — Provider adapter

- traducir create/status/download/cancel a la API neutral de signatures

### Slice 2 — Webhook convergence

- registrar endpoint canónico, mapping de eventos, dedupe y persistencia inbox

### Slice 3 — Reconciliation

- job/manual action para resync de requests y artifacts incompletos

## Out of Scope

- segundo provider de firma
- gestor documental UI
- template rendering

## Acceptance Criteria

- [x] ZapSign queda encapsulado detrás de un adapter provider-neutral (`zapSignSignatureAdapter` implementa el port `SignatureProviderAdapter` de TASK-490)
- [x] los eventos entrantes usan el webhook contract canónico del repo (handler `zapsign` en el bus `processInboundWebhook` + inbox dedupe; la ruta one-off fue removida)
- [x] la descarga del signed doc alimenta la capa documental común (vault privado `signature_signed_document` para el aggregate; `master_agreement` para el lane legacy)

## Verification

- `pnpm lint` ✓ (0)
- `pnpm tsc --noEmit` ✓ (0)
- `pnpm build` ✓ — ver Handoff
- `pnpm test` ✓ — ver Handoff
- smoke real ZapSign: pendiente (requiere crear un `signature_request` real vía TASK-1024 o un producer de prueba; el lane MSA sigue vivo y ejercita el handler en prod)

## Closing Protocol

- [x] `Lifecycle` y carpeta sincronizados (→ `complete/`)
- [x] `docs/tasks/README.md` actualizado
- [x] `Handoff.md` actualizado con secretos/riesgos/runtime notes

## Delta 2026-06-05 — Implementación (adapter + webhook convergence + reconcile)

Implementado en `develop` (sin branch, autorizado). 3 slices. Continuación directa de TASK-490 (que dejó el port + el `notImplementedSignatureAdapter`).

### Open Questions resueltas (pre-execution)

El spec era un esqueleto sin `## Open Questions`. Discovery (reutilizando el arch review ZapSign/MSA de TASK-1023) + `greenhouse-backend` resolvieron las decisiones implícitas:

- **OQ-1 ¿Converger al bus canónico o ruta one-off?** → **CONVERGER**. Borré la ruta dedicada `/api/webhooks/zapsign`; registré el handler `zapsign` en el bus (`webhook_endpoints` + `processInboundWebhook`). La URL no cambia (la genérica `[endpointKey]` la toma). Gano inbox dedupe + status tracking gratis. Lo exige el spec ("converger callbacks al modelo canónico").
- **OQ-2 ¿Cómo no romper MSA?** → **Dispatch cascade**: (1) `signature_requests` por `provider_document_token` → aggregate nuevo; (2) fallback MSA por token → `syncMasterAgreementSignature` (lógica verbatim del route viejo); (3) else ignore. Coexistencia (invariante TASK-490), zero-risk.
- **OQ-3 ¿auth_mode?** → `bearer` + secret `ZAPSIGN_WEBHOOK_SHARED_SECRET` (ya configurado en los 3 envs). Extendí el `verifyAuth` genérico con un fallback aditivo `x-zapsign-webhook-secret` (cero impacto en otros providers) → preserva el auth EXACTO del route viejo (Bearer **o** header custom) → ZapSign no se reconfigura.
- **OQ-4 ¿Descarga inline o async?** → **inline** (mirror MSA, vivo en prod) + reconcile como safety-net (Slice 3). Volumen bajo; el spec exige "reconciliación por polling si el webhook falla".
- **OQ-5 ¿DOCX?** → extendí `createZapSignDocument` con `base64_docx` (completa la dimensión `signable_format` declarada en TASK-490; default `pdf`).
- **OQ-6 ¿bridge `ready_for_signature` (contracting → signature_request)?** → **fuera de scope** (es TASK-1024). El aggregate queda cableado + ejercido por el lane MSA (live) + tests.

### Slice 1 — ZapSign provider adapter (commit `a234eeeec`)

`src/lib/integrations/zapsign/signature-adapter.ts` implementa el port: `createDocument` (`getAssetById` → `downloadGreenhouseStorageObject` read sin side-effects → base64 → `createZapSignDocument` con signers mapeados + metadata source) + `getDocumentState` (`getZapSignDocument` → `status-map.ts` puro a estado canónico). Extendí el client con `base64Docx`. **Fix legítimo TASK-490** (bug latente que el adapter activó): `sendSignatureRequest` perdía el `signer_name` (pasaba `name:''`) → ahora selecciona + pasa nombre + orderGroup. 13 tests status-map.

### Slice 2 — Webhook convergence (commit `f834559c0`)

Migración `20260605215340232` seedea `webhook_endpoints` (`endpoint_key='zapsign'`, `bearer`). Handler `src/lib/webhooks/handlers/zapsign.ts` (dispatch cascade) + registro en `handlers/index.ts` + **borrada** la ruta one-off `src/app/api/webhooks/zapsign/route.ts` (que shadow-eaba el bus). `verifyAuth` extendido (`x-zapsign-webhook-secret`). 6 tests del cascade.

### Slice 3 — Reconciliation (commit `27cab0090`)

`src/lib/integrations/zapsign/apply-state.ts`: helper compartido `applyZapSignStateToSignatureRequest` (re-fetch autoritativo + descarga signed PDF al vault + apply monotónico) usado por el webhook Y el reconcile → recovery byte-idéntico (la descarga satisface el CHECK `completed ⇒ signed_document_asset_id`). `reconcileZapSignSignatureRequest(id)` + endpoint admin `POST /api/admin/documents/signature-requests/[id]/reconcile` (`requireAdminTenantContext` + `can documents.signature_request:manage`) + CLI `scripts/signatures/reconcile.ts` (`--id` | `--sweep --older-than-days`).

### Notas de runtime / secretos

- **Secretos** (ya configurados en GCP Secret Manager + Vercel los 3 envs): `ZAPSIGN_API_TOKEN`, `ZAPSIGN_WEBHOOK_SHARED_SECRET`, `ZAPSIGN_API_BASE_URL`. **Cero secretos nuevos**.
- **Cero eventos/capabilities nuevos**: reusa los 7 `signature.request.*` v1 + la capability `documents.signature_request` de TASK-490.
- **Reliability**: el reconcile lleva a steady los signals `documents.signature_request.{pending_overdue,failed,signed_artifact_missing}` (TASK-490).
- **Pendiente smoke real**: el aggregate nuevo no tiene producer hasta TASK-1024 (bridge contracting → `createSignatureRequest`); el lane MSA sigue ejercitando el handler en prod.

