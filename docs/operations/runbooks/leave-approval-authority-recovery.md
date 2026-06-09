# Runbook — Leave Approval Authority Recovery (TASK-1020)

> Recovery auditado de autoridad de aprobación de permisos cuando un
> `approval_delegate` genérico congeló a una delegada como aprobadora efectiva
> de un permiso pendiente, desplazando a la supervisora formal.

- **Owner:** HR / Identity & Access (operador interno con capability HR/admin).
- **Signal asociada:** `hr.leave.invalid_delegated_approval_snapshots`
  (moduleKey `identity`, kind `drift`, **steady = 0**). Severity `error` si > 0.
- **Comando canónico:** `pnpm hr:leave-approval-authority:recover`
  (helper SSOT: `src/lib/hr-core/leave-approval-authority-recovery.ts`).

## Cuándo aplica

La signal `hr.leave.invalid_delegated_approval_snapshots` alerta (> 0), o un
supervisor formal reporta que NO puede aprobar/rechazar un permiso de su reporte
directo y la pila muestra a otra persona como aprobadora.

## 1. Diagnóstico (read-only)

Query de diagnóstico (SQL read-only):

```sql
SELECT s.snapshot_id, s.workflow_entity_id AS leave_request_id, s.subject_member_id,
       s.authority_source, s.formal_approver_member_id, s.effective_approver_member_id,
       s.delegate_responsibility_id, lr.status
FROM greenhouse_hr.workflow_approval_snapshots s
JOIN greenhouse_hr.leave_requests lr ON lr.request_id = s.workflow_entity_id
WHERE s.workflow_domain = 'leave'
  AND s.stage_code = 'supervisor_review'
  AND lr.status = 'pending_supervisor'
  AND (s.authority_source = 'delegation'
       OR s.effective_approver_member_id IS DISTINCT FROM s.formal_approver_member_id);
```

Responsabilidades genéricas `approval_delegate` activas:

```sql
SELECT responsibility_id, member_id AS delegate, scope_id AS supervisor, active, effective_from, effective_to
FROM greenhouse_core.operational_responsibilities
WHERE responsibility_type = 'approval_delegate' AND scope_type = 'member' AND active = TRUE;
```

## 2. Dry-run (no muta)

```bash
pnpm hr:leave-approval-authority:recover --dry-run --supervisor-member-id <supervisor-member-id>
# o JSON machine-readable:
pnpm hr:leave-approval-authority:recover --json --supervisor-member-id <supervisor-member-id>
```

El dry-run lista las responsabilidades inválidas (acción `revoke`) y los
snapshots a reparar con su `before`/`after`. **STOP** si aparecen casos que no
entiendes — investiga antes de aplicar.

## 3. Apply (allowlisted)

El `--apply` requiere al menos un filtro explícito (allowlist anti revoke global):

```bash
pnpm hr:leave-approval-authority:recover --apply \
  --supervisor-member-id <supervisor-member-id> \
  --delegate-responsibility-id <responsibility-id> \
  --leave-request-id <leave-request-id> \
  --reason "TASK-1020 remediación drift autoridad permisos" \
  --actor-user-id <user-id-operador>
```

El apply, en una transacción atómica: revoca la responsabilidad inválida
(lifecycle/audit, NUNCA DELETE), recomputa los snapshots pendientes vía el
resolver canónico (SSOT) → `effective = supervisor formal`,
`authority_source = 'reporting_hierarchy'`, y emite el evento de outbox
`leave_request.approval_authority_recovered` (v1, before/after + actor/reason).
Es **idempotente**: re-ejecutar es no-op.

## 4. Verificación post-apply (read-only)

```sql
-- El snapshot quedó con el supervisor formal como aprobador efectivo:
SELECT effective_approver_member_id, authority_source
FROM greenhouse_hr.workflow_approval_snapshots
WHERE workflow_domain = 'leave' AND stage_code = 'supervisor_review'
  AND workflow_entity_id = '<leave-request-id>';
-- esperado: effective = <supervisor-formal>, authority_source = 'reporting_hierarchy'

-- La responsabilidad inválida quedó revocada:
SELECT active, effective_to FROM greenhouse_core.operational_responsibilities
WHERE responsibility_id = '<responsibility-id>';
-- esperado: active = FALSE, effective_to poblado
```

Confirmar que la signal `hr.leave.invalid_delegated_approval_snapshots` queda
**steady = 0** (Admin > Ops Health / Reliability, módulo Identity & Access).

## 5. Escalation

- Si el dry-run muestra responsabilidades inesperadas o snapshots que no encajan
  con la política → **no aplicar**. Escalar a Identity & Access owner.
- Si tras el apply la signal sigue > 0 → revisar que el deploy del código
  preventivo (Slice 2) esté en el target antes del apply (rollout hard rule).
- NUNCA resolver dando HR/admin broad a la supervisora ni con SQL manual de
  remediación. El supervisor formal aprueba porque es supervisor formal.

## Notas de seguridad

- El comando NO aprueba, rechaza ni cambia el estado de la solicitud.
- La delegación real de aprobación de permisos (cobertura por vacaciones, etc.)
  está FUERA de V1 — el override HR/admin cubre el interín. Cuando se necesite,
  nace como contrato domain-scoped (ADR follow-up).
