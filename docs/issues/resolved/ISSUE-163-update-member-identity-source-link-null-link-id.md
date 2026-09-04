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

## Causa raíz confirmada

El writer de `identity_profile_source_links` usado por `updateMember` omitía el `link_id` obligatorio y confirmaba la actualización del member antes de sincronizar identidad. El error dejaba una escritura parcial. La proyección legal, a su vez, trataba un member activo como permiso para reabrir su relación employee histórica.

## Resolución aplicada

1. `updateMember` usa el generador canónico de IDs y confirma member, vínculos de identidad y outbox en una transacción; BigQuery queda como espejo postcommit.
2. La proyección no reabre relaciones terminadas/inactivas ni infiere employee sobre historia contractor/executive. Una nueva contratación exige el command de episodio correspondiente.
3. Executor, recovery preview y señal comparten el resolver de episodios laborales vigentes posteriores; excluyen borradores y episodios futuros.
4. La recuperación por persona exige administrador vigente, snapshot/hash exacto, evidencia, target explícito e idempotencia. Member, asignación, auditoría y eventos se confirman juntos; contratos, acceso y dinero quedan fuera del write set.

## Verificación ejecutada

- Build completo y prepush lint/typecheck aprobados; 41 pruebas unitarias de fallo/rollback, identidad, proyección y recuperación aprobadas; dos pruebas SQL READ ONLY con CTE sintéticos aprobadas.
- CI, CI Deep Verification y Playwright del SHA productivo `a824d073` aprobados.
- Recuperación real de disponibilidad aplicada mediante command auditado; no se ejecutó un `updateMember` redundante sobre Valentina para probarlo.
- Canary real del consumidor: `member.updated` procesado por `operating_entity_legal_relationship` a las 18:42:05Z, relación employee histórica intacta y terminada.
- Readback independiente posterior al deploy: siete categorías protegidas idénticas a snapshots; member y asignación activos; SSO elegible. Login interactivo no ejercitado.

## Estado

Código desplegado en Vercel Production `a824d073` y worker `203fa04ec` (árbol idéntico). Recuperación de Valentina aplicada 18:38:48Z con readback exacto de disponibilidad y siete categorías protegidas intactas. Eventos publicados 18:40:03Z y proyecciones People completadas 18:42:05Z; employee permanece terminado y datos protegidos idénticos. Release `33795564223` cerrado: manifest released 19:30:49Z, health success, watchdog ok y cuatro workers sincronizados. Incidente resuelto; el problema separado de matching de webhooks se documenta en la auditoría. Evidencia en la auditoría de reingreso.

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
