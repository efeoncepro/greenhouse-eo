# TASK-754 — Payment Profiles V3 Hardening (Vault externo + Micro-deposit verification)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Alto` (security)
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-749`
- Branch: `task/TASK-754-payment-profiles-vault-and-verification`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hardening de seguridad del módulo Payment Profiles: integración real de
`vault_ref` con GCP Secret Manager (o KMS) para que `account_number_full`
salga de la base de datos, y verificación de cuenta nueva con
micro-deposit antes de marcar el perfil como `active`. Reduce el blast
radius en caso de filtración y previene errores de captura de datos.

## Why This Task Exists

V1 dejó `vault_ref` como columna placeholder y guarda `account_number_full`
en plano (enmascarado por default en queries, pero la fuente de verdad es
la fila). Si una fila se filtra (backup robado, query mal escrita, log
mal capturado), el atacante tiene la cuenta completa.

Stripe, PayPal y Wise resuelven esto con dos prácticas:

1. **Vault externo**: el dato sensible vive en un servicio dedicado (KMS/
   Secret Manager). La tabla solo guarda un `vault_ref` opaco. El acceso
   al dato real requiere una segunda autenticación + audit + rate limit.
2. **Verificación de cuenta**: antes de marcar `active`, depositar un
   micro-monto (1 peso, 1 centavo USD) y pedir al beneficiario que
   confirme el monto recibido. Previene captura mal hecha de datos
   bancarios y double-checks que la cuenta es realmente del beneficiario.

## Goal

- Integración real de vault con GCP Secret Manager: `account_number_full` se mueve a Secret Manager, queda solo `vault_ref` en la tabla
- Reveal-sensitive ahora hace fetch al vault con second-factor auth (re-prompt password o passkey)
- Verificación de cuenta opcional con micro-deposit (registro manual del monto recibido por el beneficiario) antes de transitar a `active`
- Audit log captura cada acceso al vault con motivo + actor + IP + UA

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Secret Manager IAM debe restringir acceso a un service account dedicado del runtime de Greenhouse — nunca al usuario directamente
- Vault refs deben tener formato canónico `gh-payment-profile-<profileId>` para trazabilidad
- Migration del schema debe ser aditiva: NO borrar `account_number_full` hasta que TODO esté migrado
- Backfill: rotación gradual con dual-write durante el cutover
- Verificación con micro-deposit es opcional (flag por perfil) — algunos rails no lo soportan (Deel, manual_cash)

## Dependencies & Impact

### Depends on

- `TASK-749` (V1)
- GCP Secret Manager habilitado en project `efeonce-group` (ya existe)
- Service account `greenhouse-portal@` con permisos `secretmanager.secretVersionAccessor`

### Blocks / Impacts

- Reduce blast radius de incidentes de seguridad
- Habilita compliance con SOC2/PCI scope reduction
- Impacta `revealPaymentProfileSensitive` helper

### Files owned

- `migrations/<timestamp>_task-754-payment-profiles-vault-required.sql`
- `src/lib/finance/beneficiary-payment-profiles/vault.ts`
- `src/lib/finance/beneficiary-payment-profiles/verification.ts`
- `src/app/api/admin/finance/payment-profiles/[profileId]/verify-deposit/route.ts`
- `scripts/finance/migrate-account-numbers-to-vault.ts`

## Scope

### Slice 1 — Vault module

- Helper `vault.write({profileId, accountNumber})` → escribe a Secret Manager con secret name `gh-payment-profile-{profileId}`, devuelve `vault_ref`
- Helper `vault.read({vaultRef, actorUserId, reason})` → fetch del Secret Manager + audit log entry
- Helper `vault.delete({vaultRef})` → cuando se cancela un perfil
- Test con mock del SM client

### Slice 2 — Migración gradual

- Backfill script: para cada profile con `account_number_full IS NOT NULL AND vault_ref IS NULL`:
  - Escribir al vault, capturar el `vault_ref`
  - UPDATE row con `vault_ref`
  - NO borrar `account_number_full` aún (dual-write)
- Migration final (después de validación): NULL out `account_number_full` para todos los rows con `vault_ref` populated
- Helper de read prefiere vault sobre column si ambos existen

### Slice 3 — Reveal con second factor

- `revealPaymentProfileSensitive` chequea capability + valida que el caller pasó un `passkey_challenge_id` o re-confirmación de password
- Endpoint `/reveal-sensitive` ahora rechaza si no viene el segundo factor
- UI: dialog de reveal pide re-confirmación

### Slice 4 — Micro-deposit verification (opcional)

- Schema: agregar columna `verification_status` (`unverified | pending_verification | verified | failed`) y `verification_amount`, `verification_attempts`
- Solo rails que soportan (bank_transfer, wire) usan este flujo. Deel/manual_cash skip.
- Trigger: al crear perfil → registrar monto random ($1-$5) → marcar `pending_verification`
- Endpoint: el operator registra que envió el deposit (no automatizamos el envío en V3, eso es V4)
- Endpoint: el beneficiario confirma el monto recibido (vía Mi Greenhouse personal, link en email)
- Solo después de `verified` se permite aprobar el perfil

## Out of Scope

- Envío automático del micro-deposit (queda como V4 cuando integremos directo con bancos)
- Splits multi-currency (TASK-755)
- Bulk operations (TASK-755)

## Acceptance Criteria

- [ ] `account_number_full` está en Secret Manager para todos los perfiles activos
- [ ] Reveal sensitive requiere second factor + audit
- [ ] Verificación con micro-deposit funciona end-to-end para bank_transfer
- [ ] Helper `vault.read` falla con error claro si no hay capability + reason

## Verification

- `pnpm vitest run src/lib/finance/beneficiary-payment-profiles`
- `pnpm exec eslint src/lib/finance/beneficiary-payment-profiles`
- `pnpm build`
- Backfill manual en staging: validar que cada profile tiene vault_ref
- Smoke: reveal → ver dato → confirmar audit log

## Closing Protocol

- [ ] Lifecycle, archivo, README, Handoff, changelog
- [ ] Verificar TASK-749 reveal-sensitive sigue funcionando (regression)
- [ ] Documentar nuevo flujo en manual de uso
