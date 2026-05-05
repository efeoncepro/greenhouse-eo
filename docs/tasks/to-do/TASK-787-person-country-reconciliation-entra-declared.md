# TASK-787 — Person Country Reconciliation (Entra ↔ Declared)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `governance`
- Epic: `EPIC-010`
- Status real: `Diseño`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-787-person-country-reconciliation`
- GitHub Issue: `none`

## Summary

Cuando el colaborador declara una direccion legal con `country_code` distinto al `members.location_country` que Entra/SCIM sincronizo desde Microsoft Graph, hoy el sistema NO reconcilia ambos. Lo declarado se persiste en `person_addresses` (correcto, identidad legal), pero `members.location_country` sigue mostrando lo de Entra (correcto, identidad operacional). Esa coexistencia esta bien hasta que alguien las disagree-ee — ahi necesita governance, no override silencioso.

## Why This Task Exists

Durante la implementacion de TASK-784 propuse un cascade que prefiriera lo declarado sobre Entra. El usuario observo (correctamente) que eso rompe el modelo SCIM/Entra: el siguiente sync revierte el override silenciosamente, generando un boomerang. Mismo bug class que TASK-785 documenta para `role_title`.

La solucion robusta no es elegir una fuente sobre la otra — es **reconciliar** con governance visible:

1. Visibilidad: HR ve que ambas fuentes disagree (banner inline + reliability signal).
2. Decision: HR elige reconciliar pidiendo a TI actualizar Entra (write-back via Microsoft Graph) o pidiendo al colaborador corregir lo declarado.
3. Audit: cada reconciliacion queda en audit log con motivo + actor.

## Goal

- Detectar drift entre `members.location_country` (Entra) y direccion legal declarada por el colaborador.
- Exponer drift a HR en `/people/[slug]` › Identidad legal con accion accionable.
- Reliability signal `identity.legal_profile.country_drift_with_entra` (kind=drift, severity=warning, steady=0).
- (Opcional, si capability esta lista) write-back a Entra via Microsoft Graph PATCH `/users/{id}` con audit log.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/tasks/to-do/TASK-785-workforce-role-title-source-of-truth-governance.md` (mismo patron — extender governance shape)

## Dependencies & Impact

### Depends on
- `src/lib/person-legal-profile/country-defaults.ts` — agregar `getDeclaredCountry`, `computeCountryReconciliation`.
- `src/lib/entra/profile-sync.ts` — patron PATCH para write-back.
- `src/app/api/hr/people/[memberId]/legal-profile/route.ts` — extender response con `countryReconciliation`.
- `src/views/greenhouse/people/tabs/PersonLegalProfileSection.tsx` — banner inline.

### Files owned
- `src/lib/person-legal-profile/country-reconciliation.ts` (nuevo)
- `src/lib/reliability/queries/identity-country-drift.ts` (nuevo)
- `src/views/greenhouse/people/tabs/legal-profile-hr/HrCountryDriftBanner.tsx` (nuevo)
- migracion para `entra_writeback_queue` si se decide async write-back

## Scope

### Slice 1 — Detect + expose
- Helper `getDeclaredCountry(profileId)` lee la direccion legal verified/pending mas reciente.
- Helper `computeCountryReconciliation(entra, declared)` retorna shape `{ entraCountry, declaredCountry, status, hasDrift, declaredVerified }`.
- Endpoint GET `/api/hr/people/[memberId]/legal-profile` extiende response con `countryReconciliation`.
- UI HR muestra banner inline cuando `hasDrift=true`.
- Performance: helpers usan secuencial pattern (no Promise.all) para no exhaust el pool.

### Slice 2 — Reliability signal
- `identity.legal_profile.country_drift_with_entra` (kind=drift, severity=warning si count > 0).
- Steady state = 0 (todos sincronizados).
- Wire-up en `getReliabilityOverview` bajo modulo `identity`.

### Slice 3 — Reconciliation actions (sin write-back)
- Banner ofrece 2 botones:
  1. "Pedir a TI actualizar Entra" → genera evento outbox `identity.country.entra_correction_requested` + email/teams a TI.
  2. "Pedir a {colaborador} corregir lo declarado" → notifica al colaborador via email/teams.
- Ambas acciones quedan en audit log.
- NO escribe directamente en Entra.

### Slice 4 (futuro, requiere capability) — Direct write-back to Entra
- Capability `identity.entra.write` (least privilege).
- Microsoft Graph PATCH `/users/{userId}` con `country` field.
- Outbox event `identity.entra.country.updated` v1 con audit completo.
- Reliability signal `identity.entra.writeback_dead_letter` si la PATCH falla.

## Out of Scope
- Reconciliacion de OTROS atributos (job_title — ese es TASK-785, mismo patron).
- Auto-resolve sin intervencion HR.

## Acceptance Criteria
- [ ] Drift Entra ↔ declared visible en `/people/[slug]` con banner.
- [ ] Reliability signal `identity.legal_profile.country_drift_with_entra` activo.
- [ ] Acciones de reconciliacion quedan en audit log.
- [ ] Tests unitarios de `computeCountryReconciliation` cubren los 5 estados (synced, drift, pending_declaration, entra_missing, none).
- [ ] Endpoint GET sigue siendo estable bajo concurrencia (queries secuenciales, no Promise.all).

## Verification
- `pnpm test src/lib/person-legal-profile/`
- `pnpm pg:doctor`
- `pnpm staging:request /api/hr/people/<member>/legal-profile`
- Verificar `expectedCountry` y `countryReconciliation` en el JSON.
- Banner aparece cuando member tiene `location_country='US'` y declara dirección en `'CL'`.

## Open Questions
- ¿La accion "pedir a TI actualizar Entra" deberia abrir un ticket en el sistema de TI, o solo notificar via email/teams?
- ¿Deberia haber un cooldown entre re-notificaciones para evitar spam al colaborador / TI?
