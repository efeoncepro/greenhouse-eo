# TASK-810 — Engagement Anti-Zombie DB Guard

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `migration`
- Epic: `EPIC-014`
- Status real: `Cerrada`
- Domain: `commercial / data-quality`
- Blocked by: `TASK-801, TASK-803, TASK-809`
- Branch: `task/TASK-810-engagement-anti-zombie-check-constraint`

## Summary

Guard DB `services_engagement_requires_decision_before_120d` que rechaza INSERT/UPDATEs que mantengan `engagement_kind != 'regular'` activo > 120 días sin outcome ni lineage registrado. Discovery TASK-810 corrigió el diseño original: PostgreSQL no permite subqueries dentro de `CHECK`, por lo que el enforcement canónico debe ser un trigger `BEFORE INSERT OR UPDATE` con `ERRCODE check_violation`, siguiendo el patrón anti-zombie de TASK-765. Es la última línea de defensa anti-zombie — complementa el reliability signal `commercial.engagement.zombie` (que detecta) con prevención mecánica (que rechaza).

## Approved Mockup Context

- Mockup del programa aprobado por usuario el 2026-05-07.
- Ruta: `/agency/sample-sprints/mockup`.
- Artefactos: `src/app/(dashboard)/agency/sample-sprints/mockup/page.tsx` y `src/views/greenhouse/agency/sample-sprints/mockup/SampleSprintsMockupView.tsx`.
- El guard anti-zombie debe cerrarse después de que la UI aprobada permita resolver outcomes legítimos; el trigger no debe crear un dead end operativo.

## Why This Task Exists

Sin este guard, un Sample Sprint mal-cerrado puede quedar `status='active'` indefinidamente, contaminando KPIs (active backlog) + drenando capacity warning queries + acumulando deuda silenciosa. El reliability signal `zombie` (TASK-807) detecta el problema pero no lo previene — solo alerta. El trigger hace que el sistema rechace mecánicamente la situación zombie, forzando al operador a registrar un outcome o transition lineage (converted/adjusted/dropped/cancelled).

## Goal

- Trigger `services_engagement_requires_decision_before_120d` agregado en `greenhouse_core.services`.
- Backfill/preflight verificado: cero filas violan el predicado antes de instalar el trigger (si hay zombies legacy, resolverlos manualmente antes de aplicar).
- SQL smoke confirma que el trigger rechaza zombies y permite updates legítimos con outcome/lineage o status cerrado/cancelado.
- Documentación del runbook "qué hacer cuando UPDATE rechaza" (operador debe primero registrar outcome).

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.3. Drift resuelto en TASK-810: el mecanismo correcto es trigger, no CHECK, porque el predicado necesita consultar `engagement_outcomes` / `engagement_lineage`.

Patrones canónicos:

- TASK-708 — NOT VALID + VALIDATE atomic en migrations.
- TASK-766/774 — mismo patrón aplicado a finance constraints.

Reglas obligatorias:

- Migration usa trigger `BEFORE INSERT OR UPDATE` con error legible y `ERRCODE check_violation`.
- Verificar count de violations con el mismo predicado antes de aplicar.
- Si hay violations, resolverlas (registrar outcomes para zombies históricos) antes de aplicar el trigger.
- Después de aplicar, el trigger se enforcea para futuros INSERT/UPDATEs.

## Slice Scope

Migration (DDL corregido):

```sql
CREATE OR REPLACE FUNCTION greenhouse_core.assert_engagement_requires_decision_before_120d()
RETURNS TRIGGER AS $$
BEGIN
  -- Rechaza Sample Sprints activos >120d sin outcome ni lineage.
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER services_engagement_requires_decision_before_120d
  BEFORE INSERT OR UPDATE ON greenhouse_core.services
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_engagement_requires_decision_before_120d();
```

Pre-flight script (`scripts/commercial/preflight-zombie-check.ts`):

- Cuenta engagements que violan el predicado del guard.
- Lista cada uno con: service_id, space_id, organization_id, engagement_kind, start_date, days_since_start.
- Reporte para operador: "estos N engagements deben tener outcome antes de aplicar el guard".

Tests:

- Migration smoke: verifica violations count → aplica trigger → verifica enforced.
- Trigger test: intenta UPDATE que viola guard → expected error.
- Trigger test: UPDATE legítimo (con outcome/lineage registrado o status cerrado/cancelado) → success.

Runbook (en spec o `docs/operations/runbooks/engagement-zombie-handling.md`):

- "Si UPDATE rechaza con `services_engagement_requires_decision_before_120d`":
  1. Verificar engagement: `SELECT * FROM services WHERE service_id = '<id>'`.
  2. Decidir outcome real (con stakeholder): converted, adjusted, dropped, cancelled_by_client/provider.
  3. Registrar outcome via UI `/agency/sample-sprints/[id]/outcome` o helper TS `recordOutcome`.
  4. UPDATE permitido después.

## Acceptance Criteria

- Pre-flight script reporta count = 0 antes de instalar el trigger.
- Migration aplica el trigger anti-zombie en dev/staging.
- Trigger test rechaza UPDATEs zombie + permite UPDATEs legítimos.
- Runbook documentado.
- `pnpm test` focal + `pnpm pg:connect:migrate` verde.

## Dependencies

- Blocked by: TASK-801 (services.engagement_kind), TASK-803 (engagement_outcomes table), TASK-809 (UI debe estar lista para que operadores puedan resolver zombies legacy).
- Bloquea: ninguna — es el slice final del Epic.

## References

- Spec: §3.3
- Patrón: TASK-708/766/774 NOT VALID + VALIDATE atomic
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`

## Implementation Notes

- Implementado 2026-05-07 en `develop`.
- Migration: `migrations/20260507183122498_task-810-engagement-anti-zombie-trigger.sql`.
- Guard real: trigger `services_engagement_requires_decision_before_120d` + function `greenhouse_core.assert_engagement_requires_decision_before_120d()`.
- Drift resuelto: el CHECK original con `EXISTS` no era viable en PostgreSQL; se preserva el contrato funcional con trigger.
- Preflight: `scripts/commercial/preflight-zombie-check.ts` retorno `violationCount=0` en runtime live.
- SQL smoke transaccional con rollback: update zombie rechazado; update con outcome permitido; insert cerrado permitido.
- Validacion ejecutada: `pnpm pg:connect:migrate`, `pnpm pg:doctor`, preflight script, SQL smoke rollback, focal Vitest, `pnpm exec tsc --noEmit --pretty false`, `pnpm lint`, `pnpm test`, `pnpm build`.
