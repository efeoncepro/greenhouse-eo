# TASK-810 — Engagement Anti-Zombie CHECK Constraint (NOT VALID + VALIDATE Atomic)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `migration`
- Epic: `EPIC-014`
- Status real: `Diseño aprobado`
- Domain: `commercial / data-quality`
- Blocked by: `TASK-801, TASK-803, TASK-809`
- Branch: `task/TASK-810-engagement-anti-zombie-check-constraint`

## Summary

CHECK constraint `services_engagement_requires_decision_before_120d` que rechaza UPDATEs que mantengan `engagement_kind != 'regular'` activo > 120 días sin outcome registrado. Aplicado con patrón canónico **NOT VALID + VALIDATE atomic** (TASK-708/766/774) para no bloquear backfill. Es la última línea de defensa anti-zombie — complementa el reliability signal `commercial.engagement.zombie` (que detecta) con prevención mecánica (que rechaza).

## Approved Mockup Context

- Mockup del programa aprobado por usuario el 2026-05-07.
- Ruta: `/agency/sample-sprints/mockup`.
- Artefactos: `src/app/(dashboard)/agency/sample-sprints/mockup/page.tsx` y `src/views/greenhouse/agency/sample-sprints/mockup/SampleSprintsMockupView.tsx`.
- El CHECK anti-zombie debe cerrarse después de que la UI aprobada permita resolver outcomes legítimos; la constraint no debe crear un dead end operativo.

## Why This Task Exists

Sin este CHECK, un Sample Sprint mal-cerrado puede quedar `status='active'` indefinidamente, contaminando KPIs (active backlog) + drenando capacity warning queries + acumulando deuda silenciosa. El reliability signal `zombie` (TASK-807) detecta el problema pero no lo previene — solo alerta. El CHECK constraint hace que el sistema rechace mecánicamente la situación zombie, forzando al operador a registrar un outcome (converted/adjusted/dropped/cancelled).

## Goal

- Constraint `services_engagement_requires_decision_before_120d` agregado vía NOT VALID + VALIDATE atomic.
- Backfill verificado: cero filas violan el constraint pre-VALIDATE (si hay zombies legacy, resolverlos manualmente antes de aplicar).
- Constraint VALIDATE exitoso post-cleanup.
- Documentación del runbook "qué hacer cuando UPDATE rechaza" (operador debe primero registrar outcome).

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.3.

Patrones canónicos:

- TASK-708 — NOT VALID + VALIDATE atomic en migrations.
- TASK-766/774 — mismo patrón aplicado a finance constraints.

Reglas obligatorias:

- Migration aplica con `NOT VALID` primero (no escanea tabla, no bloquea writes).
- Verificar count de violations: `SELECT COUNT(*) FROM greenhouse_core.services WHERE NOT (...check...)` debe retornar 0.
- Si hay violations, resolverlas (registrar outcomes para zombies históricos) antes de VALIDATE.
- VALIDATE escanea tabla bajo SHARE UPDATE EXCLUSIVE — permite reads/writes mientras valida.
- Después de VALIDATE, el constraint es enforced para futuros UPDATEs.

## Slice Scope

Migration (DDL):

```sql
-- Step 1: ADD CONSTRAINT NOT VALID (no escanea, no bloquea)
ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_engagement_requires_decision_before_120d
  CHECK (
    engagement_kind = 'regular'
    OR (engagement_kind <> 'regular' AND (
      (status = 'active' AND start_date >= CURRENT_DATE - INTERVAL '120 days')
      OR EXISTS (
        SELECT 1 FROM greenhouse_commercial.engagement_outcomes o
        WHERE o.service_id = services.service_id
      )
      OR status IN ('cancelled','closed')
    ))
  ) NOT VALID;

-- Step 2: verificar violations (manual gate antes de VALIDATE)
-- Si count > 0, resolver outcomes manualmente para zombies legacy.

-- Step 3: VALIDATE (escanea bajo SHARE UPDATE EXCLUSIVE)
ALTER TABLE greenhouse_core.services
  VALIDATE CONSTRAINT services_engagement_requires_decision_before_120d;
```

Pre-flight script (`scripts/commercial/preflight-zombie-check.ts`):

- Cuenta engagements que violan el CHECK.
- Lista cada uno con: service_id, client_id, engagement_kind, start_date, days_since_start.
- Reporte para operador: "estos N engagements deben tener outcome antes de aplicar VALIDATE".

Tests:

- Migration test (en CI): aplica NOT VALID → verifica violations count → si 0, aplica VALIDATE → verifica enforced.
- Constraint test: intenta UPDATE que viola constraint → expected error.
- Constraint test: UPDATE legítimo (con outcome registrado) → success.

Runbook (en spec o `docs/operations/runbooks/engagement-zombie-handling.md`):

- "Si UPDATE rechaza con `services_engagement_requires_decision_before_120d`":
  1. Verificar engagement: `SELECT * FROM services WHERE service_id = '<id>'`.
  2. Decidir outcome real (con stakeholder): converted, adjusted, dropped, cancelled_by_client/provider.
  3. Registrar outcome via UI `/agency/sample-sprints/[id]/outcome` o helper TS `recordOutcome`.
  4. UPDATE permitido después.

## Acceptance Criteria

- Pre-flight script reporta count = 0 antes de VALIDATE.
- Migration aplica NOT VALID + VALIDATE en CI.
- Constraint test rechaza UPDATEs zombie + permite UPDATEs legítimos.
- Runbook documentado.
- `pnpm test` + `pnpm migrate:up` verde.

## Dependencies

- Blocked by: TASK-801 (services.engagement_kind), TASK-803 (engagement_outcomes table), TASK-809 (UI debe estar lista para que operadores puedan resolver zombies legacy).
- Bloquea: ninguna — es el slice final del Epic.

## References

- Spec: §3.3
- Patrón: TASK-708/766/774 NOT VALID + VALIDATE atomic
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`
