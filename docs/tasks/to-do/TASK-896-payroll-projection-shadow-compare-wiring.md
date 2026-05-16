# TASK-896 — Payroll Projection Shadow Compare Wiring (TASK-893 V1.1b)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio` (observability + early-detection del bug class projection-vs-final drift)
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-payroll-participation-window-v1.1`
- Status real: `Disenio canonizado por arch-architect + greenhouse-payroll-auditor 2026-05-16`
- Rank: `TBD`
- Domain: `payroll|reliability`
- Blocked by: `TASK-893 V1 SHIPPED` (verde, 2026-05-16)
- Branch: `develop` (zero behavioral change post-merge — flag-gated)
- Legacy ID: `TASK-893 V1.1b`
- GitHub Issue: `none`

## Summary

El signal `payroll.participation_window.projection_delta_anomaly` (TASK-893 Slice 5) existe pero usa proxy weak (cuenta members con `prorationFactor != 1` en projection). La V1.1b implementa shadow compare canonico: snapshot pre-export del projection + diff helper con carve-outs declarativos + cron diario de comparison contra `payroll_entries` cerrado + signal con noise storm guard. Solo emite warning, NUNCA dispara recompute automatico (operador decide via TASK-895 capability `payroll.period.force_recompute`). Threshold canonico: **5% delta relativo OR $10.000 CLP absoluto**. Carve-outs declarativos cubren manual override (TASK-758), bonus ad-hoc, leave mid-period (TASK-895), IMM/UF/ICO refresh. Read-only V1.1b — write path `acceptProjectionDelta(reason)` queda V1.2.

## Why This Task Exists

**Gap detectado en TASK-893 Slice 5 + payroll-auditor verdict 2026-05-16**:

- El signal canonico definido tiene reader proxy weak: cuenta members con `prorationFactor != 1` en `pgGetProjectedPayrollEntries`. NO compara contra realidad post-close. Si el motor TASK-893 tiene un bug regresion (e.g. nuevo edge case que escapa de BL-1), no hay deteccion temprana.
- La logica canonica deseada: cuando un period transita `approved → exported`, comparar el bruto proyectado vs el bruto persistido en `payroll_entries.gross_total` per member-period. Si delta > threshold sin razon explicable, alerta operador.

**Riesgo de falso positivo (payroll-auditor 2026-05-16)**: el payroll real PUEDE diverger legitimamente de la projection por:

1. Bonos ad-hoc agregados post-projection.
2. Manual override TASK-758 con `reason`.
3. Factor de asistencia reducido por leave aprobado post-projection (TASK-895 dependencia logica).
4. Ajustes legales (gratificacion legal cap recomputada con nueva IMM mid-period).
5. ICO snapshot consolidado cambiando entre projection-time y close-time.

**Mitigation canonical**: carve-outs declarativos en `EXPECTED_DELTA_REASONS` array + threshold operativo realista (5%/$10k CLP, NO 3%/$5k — payroll CL tiene variaciones legitimas mayores) + noise storm guard (batch suppression cuando >50 anomalies en 1h).

## Goal

- Persistir `payroll_projection_snapshots` table (append-only via trigger) con `projection_json` per (period_id, member_id, snapshot_ts), retencion 90 dias.
- Helper canonico `computeProjectionFinalDelta(memberId, periodId) → { deltaClp, deltaPct, carveOuts[], isAnomaly }` pure function.
- Cron diario `ops-payroll-shadow-compare` (Cloud Scheduler `*/24h`) que escanea `periods WHERE status='exported' AND exported_at > NOW() - 7 days`, computa delta per member.
- Signal canonico extendido: `payroll.participation_window.projection_delta_anomaly` queries snapshots reales, severity warning >$50k CLP delta sin reason, error >$500k.
- Noise storm guard: batch suppression — si >50 anomalies emergen en 1h, signal escala UNA vez + alerta unica ops, NO una alerta por miembro.
- Flag `PAYROLL_PROJECTION_SHADOW_COMPARE_ENABLED=false` default. Pre-flag-ON gate: staging validation manual de 10 cases muestrales + 0 falsos positivos sustained.
- Zero behavioral change post-merge.

## Dependencies & Impact

- **Depende de**: TASK-893 V1 SHIPPED (3 signals canonical + reliability wiring) + acceso a `pgGetProjectedPayrollEntries` + `payroll_entries` tabla.
- **Impacta a**: signal `payroll.participation_window.projection_delta_anomaly` (reemplaza reader proxy weak con reader real), reliability dashboard `/admin/operations` (signal pasara de always-ok proxy a anomaly real cuando aplique).
- **Archivos owned**:
  - migration `migrations/<ts>_task-896-payroll-projection-snapshots.sql`
  - `src/lib/payroll/participation-window/projection-shadow-compare.ts` (helper canonical)
  - `src/lib/payroll/participation-window/projection-snapshot-writer.ts` (writer al projection path)
  - `services/ops-worker/server.ts` (handler `/payroll/shadow-compare`)
  - `services/ops-worker/deploy.sh` (Cloud Scheduler job `ops-payroll-shadow-compare`)
  - `src/lib/reliability/queries/payroll-participation-window-projection-delta-anomaly.ts` (extender existing)

## Detailed Spec

### Migration `payroll_projection_snapshots`

```sql
-- Up Migration
CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_projection_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  snapshot_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gross_total_clp NUMERIC(14,2) NOT NULL,
  proration_factor NUMERIC(6,4) NOT NULL,
  policy TEXT NOT NULL,
  projection_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payroll_projection_snapshots_period_member_idx
  ON greenhouse_payroll.payroll_projection_snapshots (period_id, member_id, snapshot_ts DESC);

CREATE INDEX payroll_projection_snapshots_retention_idx
  ON greenhouse_payroll.payroll_projection_snapshots (snapshot_ts)
  WHERE snapshot_ts > NOW() - INTERVAL '90 days';

-- Append-only trigger (anti-UPDATE/anti-DELETE) mirror TASK-785/TASK-873 pattern
CREATE OR REPLACE FUNCTION greenhouse_payroll.prevent_update_on_projection_snapshots()
RETURNS TRIGGER AS $$ BEGIN
  RAISE EXCEPTION 'payroll_projection_snapshots is append-only';
END $$ LANGUAGE plpgsql;

CREATE TRIGGER payroll_projection_snapshots_no_update
  BEFORE UPDATE ON greenhouse_payroll.payroll_projection_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_payroll.prevent_update_on_projection_snapshots();

-- DELETE permitido SOLO via retention cron (>90 days). Trigger conditional bypassed via ops role.

GRANT SELECT, INSERT, DELETE ON greenhouse_payroll.payroll_projection_snapshots TO greenhouse_runtime;
```

Anti pre-up-marker bug guard estandar.

### Helper canonical `computeProjectionFinalDelta`

```ts
// src/lib/payroll/participation-window/projection-shadow-compare.ts
import 'server-only'

export interface ProjectionFinalDelta {
  readonly memberId: string
  readonly periodId: string
  readonly projectionGrossClp: number
  readonly finalGrossClp: number
  readonly deltaClp: number
  readonly deltaPct: number
  readonly carveOuts: ReadonlyArray<DeltaCarveOut>
  readonly isAnomaly: boolean
}

export type DeltaCarveOut =
  | 'manual_override'
  | 'ad_hoc_bonus'
  | 'leave_mid_period'
  | 'imm_uf_refresh'
  | 'ico_bonus_refresh'

const ABSOLUTE_THRESHOLD_CLP = 10000
const RELATIVE_THRESHOLD_PCT = 5

export async function computeProjectionFinalDelta(input: {
  memberId: string
  periodId: string
}): Promise<ProjectionFinalDelta> {
  // 1. Read latest projection_snapshot pre-export desde payroll_projection_snapshots.
  // 2. Read payroll_entries.gross_total persistido.
  // 3. Compute deltaClp + deltaPct.
  // 4. Identificar carve-outs:
  //    - manual_override: payroll_entries.manual_override_amount IS NOT NULL
  //    - ad_hoc_bonus: payroll_entries.adjustments_json contains bonus added post-projection
  //    - leave_mid_period: leave_requests aprobados con dates dentro del period post-projection
  //    - imm_uf_refresh: period.recompute_reason='legal_table_refresh'
  //    - ico_bonus_refresh: compensation_requires_ico=true AND ico_snapshot diff
  // 5. isAnomaly = (Math.abs(deltaClp) > ABSOLUTE_THRESHOLD_CLP OR Math.abs(deltaPct) > RELATIVE_THRESHOLD_PCT)
  //              AND carveOuts.length === 0
}
```

### Snapshot writer en projection path

```ts
// src/lib/payroll/participation-window/projection-snapshot-writer.ts
export async function persistProjectionSnapshotIfPreExport(input: {
  periodId: string
  members: ReadonlyArray<ProjectedPayrollEntry>
  periodStatus: PeriodStatus
}) {
  if (!process.env.PAYROLL_PROJECTION_SHADOW_COMPARE_ENABLED) return
  if (input.periodStatus === 'exported') return  // post-export = drift detection target, NO new snapshot.

  // Idempotent: solo persiste si no hay snapshot dentro de los ultimos 5 min
  // (evita storm de snapshots cuando operador refresca projection UI rapido).
  // Pattern: INSERT ... ON CONFLICT DO NOTHING with composite key check.
}
```

Wire en projection path como side effect fail-safe (try/catch + `captureWithDomain('payroll', err, { source: 'projection_snapshot_writer' })` — NEVER bloquea projection rendering).

### Cron Cloud Scheduler

```bash
# services/ops-worker/deploy.sh — agregar job
upsert_scheduler_job \
  --name=ops-payroll-shadow-compare \
  --schedule='0 6 * * *' \
  --timezone=America/Santiago \
  --uri=https://<ops-worker>/payroll/shadow-compare \
  --description='TASK-896 — Daily shadow compare projection vs final'
```

Endpoint en ops-worker via `wrapCronHandler({ name: 'payroll_shadow_compare', domain: 'payroll', run })`.

### Signal extendido

`src/lib/reliability/queries/payroll-participation-window-projection-delta-anomaly.ts`:

- Reader queries `payroll_projection_snapshots` JOIN `payroll_entries` para periods exported ultimos 7 dias.
- Counts members con `isAnomaly=true AND carveOuts.length=0`.
- Severity: warning >0 con delta >$50k, error >0 con delta >$500k.
- Steady state: 0.
- Noise storm guard: si count > 50 en ventana 1h, signal escala UNA vez (cache redis o in-memory counter), NO alerta per-member.

## Verification

- 30+ tests pure function sobre `computeProjectionFinalDelta`: cubren todos los 5 carve-outs, threshold absoluto, threshold relativo, edge cases (delta=0, delta exactly at threshold).
- 10+ tests live integration (skip si no PG) sobre snapshot writer idempotency + retention.
- Reader signal test cubre ok/warning/error/degraded + noise storm guard.
- Cron handler test cubre happy path + dead-letter + retry.
- `pnpm test` + `pnpm build` full antes de cerrar.

## Slicing recomendado

- **S0**: ADR + migration `payroll_projection_snapshots` + types contract.
- **S1**: Snapshot writer + wire en projection path (fail-safe degraded).
- **S2**: Helper `computeProjectionFinalDelta` + carve-out engine (pure, testable).
- **S3**: Cron Cloud Scheduler + ops-worker handler.
- **S4**: Signal reader real (reemplaza proxy weak) + noise storm guard + reliability wiring.
- **S5**: Pre-flag-ON gates: staging validation 10 cases muestrales + 0 falsos positivos sustained 7d.

Cada slice mergeable solo, flag-gated.

## Hard rules (canonizar al cerrar)

- **NUNCA** disparar recompute automatico desde shadow compare. Read-only signal. Operador decide via TASK-895 capability `payroll.period.force_recompute`.
- **NUNCA** persistir projection_snapshot post-export (debe ser pre-export para detectar drift causado por cierre).
- **NUNCA** alertar per-member en shadow compare. Batch suppression obligatorio cuando count > 50 en ventana 1h.
- **NUNCA** modificar threshold (5% / $10k CLP) sin actualizar AMBOS: helper canonical + spec V1.1b + tests anti-regresion + ADR delta.
- **NUNCA** loggear payload completo de projection_json en Sentry (puede contener PII salarial). Use `redactErrorForResponse` + `captureWithDomain('payroll', err, { tags: { source: 'shadow_compare' } })`.
- **NUNCA** dejar snapshots > 90 dias. Retention cron limpia (separate cron, no parte de V1.1b — usar el helper retention canonical TASK-742 si existe, sino spec V1.1b incluye retention basico).
- **SIEMPRE** que un consumer downstream necesite "el projection que vio el operador antes del close", leer el snapshot canonico. Cero recomputacion ad-hoc.

## Open questions (deliberadamente NO en V1.1b)

- ¿Write-path `acceptProjectionDelta(reason)` audited? V1.2 con capability `payroll.projection.accept_delta` + audit table append-only.
- ¿BQ replica del snapshot para analytics historico cross-period? V1.3 si emerge consumer real (cuando alguien pida tendencias year-over-year).
- ¿Snapshot del `payroll_entries` post-close para reverse-shadow-compare (detectar cambios silentes post-close)? Out of scope V1.1b — el state machine TASK-410 ya bloquea recompute post-export salvo `reopened` con audit.
- ¿Carve-out generalizado para "operador hizo override consciente"? V1.2 cuando emerja UI de delta acceptance.

## Skills consultadas

- `arch-architect` (Greenhouse overlay) — 2026-05-16. Veredicto: snapshot pre-export + cron diario + carve-outs declarativos + noise storm guard. Read-only V1.1b, write-path V1.2 separado.
- `greenhouse-payroll-auditor` — 2026-05-16. Veredicto: threshold 5%/$10k CLP (3%/$5k era muy estricto), 5 carve-outs obligatorios, NUNCA dispara recompute auto.

## Referencias

- `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` — V1 spec (TASK-893)
- `src/lib/reliability/queries/payroll-participation-window-projection-delta-anomaly.ts` — signal reader actual a extender
- `src/lib/payroll/participation-window/` — primitive month-scope canonical (TASK-893)
- `services/ops-worker/cron-handler-wrapper.ts` — helper canonical `wrapCronHandler`
- `migrations/20260516114646599_task-895-payroll-period-force-recompute-capability.sql` — pattern para append-only audit log
- `docs/architecture/DECISIONS_INDEX.md` — registrar ADR V1.1b al merge S0
- `CLAUDE.md` — hard rules section TASK-893 (extender al cerrar V1.1b)
