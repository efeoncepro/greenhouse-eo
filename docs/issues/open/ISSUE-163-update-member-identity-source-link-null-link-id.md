# ISSUE-163 — `updateMember` (admin) falla al sincronizar `identity_profile_source_links` con `link_id` NULL

## Ambiente

production + staging (base compartida `greenhouse_core`)

## Detectado

2026-09-03, sesión Claude (TASK-1349 recovery), al intentar reactivar a Valentina Hoyos por el command gobernado
`updateMember({ memberId: 'valentina-hoyos', input: { active: true } })` (`src/lib/team-admin/mutate-team.ts`).

## Síntoma

```text
error: null value in column "link_id" of relation "identity_profile_source_links" violates not-null constraint
detail: Failing row contains (null, identity-hubspot-crm-owner-82653513, azure_ad, user, a2334f27-…, …, valentina.hoyos@efeonce.org, Valentina Hoyos, f, f, t, 2026-09-03 17:26:28…)
```

El command **ya había aplicado** el `UPDATE greenhouse_core.members SET active = TRUE` antes de fallar (no corre en
una sola transacción con la sincronización de links), así que dejó un estado parcial: `active=true` con
`status='inactive'`, `contract_end_date` y `assignable` sin restaurar. Además el `member.updated` disparó la
proyección `operating_entity_legal_relationship`, que **reactivó** la relación `employee` terminada de la persona
(`effective_to=NULL`) — resurrección que TASK-1349 sólo blindó para SCIM/backfill, no para esta proyección.

## Causa raíz (hipótesis verificable)

El writer de `identity_profile_source_links` que invoca `updateMember` inserta sin generar `link_id` (columna NOT
NULL sin default). Probablemente sólo se ejercita cuando el member tiene `azure_oid`/email con perfil HubSpot
(`identity-hubspot-crm-owner-*`) — Valentina lo tiene.

## Impacto

- Cualquier `updateMember` admin sobre un member con ese perfil falla y deja escritura parcial.
- La proyección `operating_entity_legal_relationship` reactiva relaciones `employee` terminadas cuando el member
  vuelve a `active=true` (ver `syncOperatingEntityEmployeeLegalRelationshipForMember`, rama `existing.status !== 'active'`),
  lo que contradice «una relación terminada no se reabre; un reingreso es un episodio nuevo».

## Solución propuesta

1. Generar `link_id` en el writer (o `DEFAULT gen_random_uuid()` en la columna) y envolver `updateMember` en una
   sola transacción (member + links + audit + outbox).
2. En `syncOperatingEntityEmployeeLegalRelationshipForMember`: **nunca** reactivar una relación `ended` con
   `effective_to` — crear una nueva (episodio nuevo) o no hacer nada; reactivar sólo si `status='inactive'` sin fecha
   de fin. Coordinar con la guarda de reingreso de TASK-1349 (`findReentryAfterExit`).
3. Test live del command sobre un member con perfil HubSpot.

## Verificación

- `updateMember` con `{active:true}` sobre un member con `identity-hubspot-crm-owner-*` termina sin error y sin
  estado parcial.
- Una relación `ended` con `effective_to` no cambia de estado tras un `member.updated`.

## Estado

Code complete local; rollout y recuperación operativa pendientes. No se declara reparada Valentina hasta readback del comando compensatorio y del consumidor desplegado.

### Corrección 2026-09-03 — Codex

- `updateMember`: member, identity links con ID canónico y outbox auditado en una transacción. BigQuery es espejo postcommit.
- Proyección legal: no reabre episodios terminados/inactivos ni crea employee sobre historia contractor/executive.
- Resolver compartido de reingreso: sólo episodios laborales vigentes; soporte de engagements anclados por profile sin member. Recovery preview y señal usan el mismo criterio.
- Nuevo comando `restoreOffboardingLifecycleAfterReentry`: admin vigente, snapshot/hash, target explícito, transacción, idempotencia y eventos. [Decisión](../../architecture/GREENHOUSE_WORKFORCE_REENTRY_RECOVERY_DECISION_V1.md) y [runbook](../../operations/runbooks/workforce-reentry-recovery.md).
- SQL puntual retirado; no ejecutar la reversión sin verificar el consumidor corregido en runtime.
- Validación local: pruebas de fallo/rollback de commands y proyección, dos pruebas SQL de predicados con CTE sintéticos en transacciones READ ONLY y preview real de Valentina. Los tests no sustituyen la prueba de despliegue.

## Relacionado

- `docs/tasks/in-progress/TASK-1349-offboarding-member-lifecycle-writeback.md` (Delta recovery 2026-09-03)
- `scripts/workforce/restore-offboarding-lifecycle.ts` (reemplazo gobernado del SQL puntual retirado)
- `src/lib/account-360/person-legal-entity-relationships.ts`, `src/lib/team-admin/mutate-team.ts`
