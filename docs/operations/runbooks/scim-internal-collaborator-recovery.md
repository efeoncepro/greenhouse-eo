# SCIM Internal Collaborator Recovery Runbook (TASK-872)

> **Audience:** EFEONCE_ADMIN, DEVOPS_OPERATOR, HR operators
> **Domain:** identity / workforce
> **Spec:** `docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md`
> **Arch:** `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` §TASK-872 V1 contract

## Overview

Esta task introduce un primitive atomic para materializar `client_user + identity_profile + member + person_membership` desde un SCIM CREATE elegible. Esta runbook cubre los **5 escenarios canónicos** de recovery operativo.

Comportamiento canónico de producción (post-merge, sin flags flippeadas todavía):

- `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=false` (default) → SCIM CREATE corre legacy `createUser` (solo crea `client_user`). Behavior idéntico a pre-TASK-872.
- `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=false` (default) → payroll engine no filtra por `workforce_intake_status`. Behavior idéntico a pre-TASK-872.
- `SCIM_ELIGIBILITY_FUNCTIONAL_PATTERNS_ENABLED=false` (V1.0) → reservado para V1.1, no consumido todavía.

## Reliability signals canonical

| Signal | Steady | Cuándo dispara | Recovery |
| --- | --- | --- | --- |
| `identity.scim.users_without_identity_profile` | 0 | client_user internal sin identity_profile_id linkeado | Escenario 1 |
| `identity.scim.users_without_member` | 0 (excl. Felipe/Maria pre-backfill) | client_user internal elegible sin member | Escenario 2 |
| `identity.scim.ineligible_accounts_in_scope` | <5 últimos 7d | Cuentas funcionales/bots en scope Entra | Escenario 5 |
| `identity.scim.member_identity_drift` | 0 | Cascade D-2 detectó drift identity_profile_id ⇄ azure_oid | Escenario 3 |
| `workforce.scim_members_pending_profile_completion` | 0 | Members SCIM con ficha pendiente >7d | Escenario 4 |
| `identity.scim.allowlist_blocklist_conflict` | 0 | Overrides allow ⊕ deny activos para mismo target | Escenario 6 |

## Escenario 1 — Dead_letter de un evento outbox SCIM

**Síntoma**: signal `identity.scim.users_without_member` > 0 sostenido + `scim_sync_log.error_message` con stack trace.

**Diagnóstico**:

```sql
SELECT scim_id, external_id, email, error_message, created_at
FROM greenhouse_core.scim_sync_log
WHERE operation = 'CREATE'
  AND response_status >= 500
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC LIMIT 20;
```

**Recovery**:

1. Identifica el `external_id` que falló.
2. Trigger Entra `provisionOnDemand` para reintentar:

   ```bash
   # Microsoft Graph CLI o portal Azure
   POST /v1.0/servicePrincipals/<sp-id>/synchronization/jobs/<job-id>/provisionOnDemand
   { "parameters": [...{ "key": "Principal", "value": "<userObjectId>" }] }
   ```

3. Verifica que el primitive resuelvió (`scim_sync_log.response_status = 201` post-retry).
4. Si falla repetidamente con `MemberIdentityDriftError` → Escenario 3.

**Validación post-recovery**:

```sql
SELECT cu.user_id, cu.identity_profile_id, cu.member_id, m.workforce_intake_status
FROM greenhouse_core.client_users cu
LEFT JOIN greenhouse_core.members m ON m.member_id = cu.member_id
WHERE cu.microsoft_oid = '<external_id>';
```

Esperado: 1 row con `identity_profile_id`, `member_id` no NULL + `workforce_intake_status='pending_intake'`.

## Escenario 2 — Backfill apply Felipe Zurita + Maria Camila Hoyos (Sesión 2)

**Síntoma**: signal `identity.scim.users_without_member` = 2 (Felipe + Maria) tras merge TASK-872.

**Pre-condiciones**:

1. ✅ Slices 1-7 mergeadas + deployed a staging.
2. ✅ Staging: smoke `provisionOnDemand` test user humano → verify primitive ejecuta + 6 entities + outbox events.
3. ✅ Flag `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true` flippeado staging + corrida payroll mock excluye `pending_intake`.
4. ✅ HR signoff: workflow "completar ficha" acordado.
5. ✅ Comunicación a Felipe + Maria: "Vas a aparecer en People/HR con badge ficha pendiente".

**Recovery (Sesión 2, no en sesión actual)**:

Backfill script TBD V1.1. V1.0 path manual:

```sql
-- 1. Verifica state actual
SELECT user_id, scim_id, email, microsoft_oid, identity_profile_id, member_id, tenant_type, active
FROM greenhouse_core.client_users
WHERE email IN ('fzurita@efeoncepro.com', 'mchoyos@efeoncepro.com');
```

Esperado: ambos con `identity_profile_id` no NULL, `member_id` NULL.

Para aplicar el primitive:

```bash
# V1.1 backfill script (TBD)
SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=true \
  pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/scim/backfill-internal-collaborators.ts \
  --apply --allowlist fzurita@efeoncepro.com,mchoyos@efeoncepro.com
```

V1.0 manual path: invocar `provisionInternalCollaboratorFromScim()` desde Node REPL con los datos canónicos. Solo EFEONCE_ADMIN.

**Validación post-apply**:

```sql
SELECT cu.user_id, cu.member_id, m.workforce_intake_status, m.azure_oid
FROM greenhouse_core.client_users cu
JOIN greenhouse_core.members m ON m.member_id = cu.member_id
WHERE cu.email IN ('fzurita@efeoncepro.com', 'mchoyos@efeoncepro.com');
```

Esperado:
- `member_id` poblado.
- `workforce_intake_status='pending_intake'`.
- `azure_oid` matches `client_users.microsoft_oid`.

Reliability signal `identity.scim.users_without_member` debe bajar de 2 → 0.

## Escenario 3 — Member identity drift (cascade D-2)

**Síntoma**: signal `identity.scim.member_identity_drift` > 0 + `scim_sync_log.error_message` contiene `'member_identity_drift'`.

**Causa raíz canónica**: cascade D-2 detectó que un member existente apunta a otra `identity_profile_id` distinta a la esperada. 3 kinds posibles:

- `profile_oid_mismatch`: member matched por profile_id pero su `azure_oid` actual ≠ external_id del SCIM request.
- `oid_profile_mismatch`: member matched por azure_oid pero su `identity_profile_id` ≠ profileId esperado.
- `email_profile_mismatch`: member matched por email (legacy pre-SCIM) pero `identity_profile_id` ≠ profileId esperado.

**Diagnóstico**:

```sql
SELECT scim_id, external_id, email, error_message
FROM greenhouse_core.scim_sync_log
WHERE operation = 'CREATE'
  AND error_message LIKE 'member_identity_drift%'
ORDER BY created_at DESC LIMIT 20;
```

Identifica el `member_id` involucrado del error_message (e.g. `member_identity_drift: oid_profile_mismatch`).

```sql
SELECT m.member_id, m.identity_profile_id AS current_profile,
       m.azure_oid AS current_oid, m.primary_email, m.active
FROM greenhouse_core.members m
WHERE m.member_id = '<member_id_from_error>';
```

**Recovery (admin endpoint TBD V1.1)**:

V1.0 path: humano resuelve manualmente vía SQL UPDATE con audit row + decisión documentada.

Opción A — reassign member a expected profile:

```sql
UPDATE greenhouse_core.members
SET identity_profile_id = '<expected_profile_id>',
    azure_oid = '<expected_external_id>',
    updated_at = NOW()
WHERE member_id = '<member_id>';
```

Opción B — crear nuevo member (legacy era una persona distinta):

Se requiere TASK derivada con investigación de doble identidad. NO ejecutar sin investigación.

**Validación post-resolución**:

Reintentar `provisionOnDemand` Entra para el user. Signal `member_identity_drift` debe bajar a 0 cuando no hay más logs `member_identity_drift` en últimos 30 días.

## Escenario 4 — Member pending_intake > 30 días sin completar

**Síntoma**: signal `workforce.scim_members_pending_profile_completion` = error (max_age_days >= 30).

**Causa raíz**: HR no completó la ficha laboral de un colaborador creado vía SCIM.

**Diagnóstico**:

```sql
SELECT m.member_id, m.display_name, m.primary_email, m.created_at,
       EXTRACT(DAY FROM (NOW() - m.created_at))::int AS age_days
FROM greenhouse_core.members m
WHERE m.workforce_intake_status = 'pending_intake'
ORDER BY m.created_at ASC;
```

**Recovery (3 opciones según caso)**:

- **Opción A (más común)**: HR completa los datos faltantes (compensation_packages, contract_terms, person_legal_profile) + invoca admin endpoint para transición pending_intake → completed.

  Admin endpoint V1.1 TBD: `POST /api/admin/workforce/members/[memberId]/complete-intake` con capability `workforce.member.complete_intake`.

  V1.0 manual:

  ```sql
  UPDATE greenhouse_core.members
  SET workforce_intake_status = 'completed',
      updated_at = NOW()
  WHERE member_id = '<member_id>';
  ```

- **Opción B (member ya no aplica)**: archivar el member sin completar.

  ```sql
  UPDATE greenhouse_core.members
  SET active = FALSE, status = 'inactive', updated_at = NOW()
  WHERE member_id = '<member_id>';
  ```

- **Opción C (member en revisión)**: estado intermedio `in_review` mientras HR consolida datos.

  ```sql
  UPDATE greenhouse_core.members
  SET workforce_intake_status = 'in_review', updated_at = NOW()
  WHERE member_id = '<member_id>';
  ```

  Note: `in_review` sigue gateado por el payroll engine (flag enabled). Member NO entra a payroll hasta `completed`.

**Validación**:

```sql
SELECT workforce_intake_status, COUNT(*) FROM greenhouse_core.members GROUP BY 1;
```

Signal debe converger a `count=0` para members >30 días `pending_intake`.

## Escenario 5 — Ineligible accounts excesivas en scope Entra

**Síntoma**: signal `identity.scim.ineligible_accounts_in_scope` >5 últimos 7 días.

**Causa raíz**: grupo Entra "Efeonce Group" incluye buzones funcionales, service accounts, bots, o guests #EXT# que SCIM intenta provisionar.

**Diagnóstico**:

```sql
SELECT email, error_message, COUNT(*) AS attempts
FROM greenhouse_core.scim_sync_log
WHERE operation = 'CREATE'
  AND (error_message LIKE 'functional_account%' OR error_message LIKE 'name_shape%')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY 1, 2
ORDER BY attempts DESC;
```

**Recovery (2 paths)**:

- **Opción A — reducir scope Entra (preferido)**:

  1. Microsoft 365 admin center → Identity → Enterprise Applications → "GH SCIM" → Provisioning → Settings → Scope.
  2. Modify "Sync only assigned users and groups" filter para excluir buzones funcionales.
  3. Verifica nuevo scope con Entra `provisionOnDemand` para un test user.

- **Opción B — admin allowlist override**:

  Si la cuenta funcional ES legítima (e.g. shared mailbox que necesita SCIM client_user para algún workflow), agregar override allow:

  ```bash
  # Admin endpoint TBD V1.1: POST /api/admin/scim/eligibility-overrides
  # V1.0 manual:
  INSERT INTO greenhouse_core.scim_eligibility_overrides (
    override_id, scim_tenant_mapping_id, match_type, match_value,
    effect, reason, granted_by
  ) VALUES (
    'scim-override-' || gen_random_uuid(),
    'scim-tm-efeonce',
    'email',
    'support@efeoncepro.com',
    'allow',
    'Shared mailbox legítimo para workflow de tickets — aprobado IT 2026-MM-DD',
    '<admin_user_id>'
  );
  ```

  Esto bypassea L2 (functional regex) y permite SCIM creation full primitive.

**Validación**: signal debe bajar a <5 últimos 7 días post-fix.

## Escenario 6 — Allowlist ⊕ Blocklist conflict

**Síntoma**: signal `identity.scim.allowlist_blocklist_conflict` > 0.

**Causa raíz**: 2 admins crearon overrides para el mismo target, uno con effect='allow' y otro con 'deny'. Hard rule canonical: deny gana, pero requiere resolución humana.

**Diagnóstico**:

```sql
SELECT a.override_id AS allow_id, a.granted_by AS allow_by, a.reason AS allow_reason,
       d.override_id AS deny_id, d.granted_by AS deny_by, d.reason AS deny_reason,
       a.match_type, a.match_value
FROM greenhouse_core.scim_eligibility_overrides a
INNER JOIN greenhouse_core.scim_eligibility_overrides d
  ON a.scim_tenant_mapping_id = d.scim_tenant_mapping_id
 AND a.match_type = d.match_type
 AND a.match_value = d.match_value
WHERE a.effect = 'allow' AND a.effective_to IS NULL
  AND d.effect = 'deny' AND d.effective_to IS NULL;
```

**Recovery**:

Discusión con ambos admins → decidir cuál override mantener → supersede el otro:

```bash
# Admin endpoint TBD V1.1: DELETE /api/admin/scim/eligibility-overrides/[id]
# V1.0 manual: usar supersedeScimEligibilityOverride helper o SQL:
UPDATE greenhouse_core.scim_eligibility_overrides
SET effective_to = NOW(), updated_at = NOW()
WHERE override_id = '<override_to_remove>';

INSERT INTO greenhouse_core.scim_eligibility_override_changes (
  change_id, override_id, change_kind, actor_user_id, reason
) VALUES (
  'scim-override-change-' || gen_random_uuid(),
  '<override_to_remove>',
  'superseded',
  '<admin_user_id>',
  'Resolución conflict allow ⊕ deny — discusión interna 2026-MM-DD'
);
```

**Validación**: signal debe bajar a 0.

## Operational invariants

- **NUNCA** ejecutar DELETE physical sobre `scim_eligibility_overrides`. Solo supersede via `effective_to` + audit row.
- **NUNCA** modificar manualmente `client_users.member_id` sin verificar drift D-2 primero (puede ocultar drift real).
- **NUNCA** flippear `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true` en producción sin: (1) smoke staging con member pending_intake synthetic + corrida payroll mock; (2) coordinación HR sobre workflow complete_intake.
- **NUNCA** desactivar reliability signals porque "están alertando". Los signals SON los detectores. Si un signal está en error, ese es el bug a arreglar.

## Escalation

- Drift D-2 con causa raíz desconocida → escalar a EFEONCE_ADMIN + crear issue `ISSUE-### scim member identity drift root cause`.
- Backfill apply Felipe/Maria fallido tras 3 intentos → escalar a comm Slack/Teams + revisar `scim_sync_log` detalle del error.
- Signals quedando en error >24h sin actor → escalar a DEVOPS_OPERATOR para revisión platform health.
