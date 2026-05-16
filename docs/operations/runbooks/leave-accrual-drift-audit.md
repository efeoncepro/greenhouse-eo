# Runbook — TASK-895 Audit script: `leave-accrual-drift`

> **Tipo de documento:** Runbook operativo
> **Version:** 1.0
> **Creado:** 2026-05-16 por Claude Opus (TASK-895 V1.1a Slice 4)
> **Spec canonica:** [TASK-895](../../tasks/in-progress/TASK-895-leave-accrual-participation-aware.md)
> **ADR canonica:** [GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md](../../architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md) (Delta 2026-05-16 §"TASK-895 V1.1a S0")

---

## Para que sirve

Cuantifica el bug class **sobreacumulación de feriado legal CL Art 67 CT** sin mutar nada. Reporta, por miembro, cuántos días acumulados de mas tiene hoy `greenhouse_hr.leave_balances` versus lo que el resolver canonical TASK-895 (participation-aware) computaría.

Es la herramienta canonical para:

1. **Pre-flag-ON gate**: antes de habilitar `LEAVE_PARTICIPATION_AWARE_ENABLED=true` en producción, correr el script en staging + producción readonly para entender el blast radius. Decidir allowlist de members afectados para el primer ciclo.
2. **Post-flag-ON verification**: tras flippear el flag + re-seed de balances, correr el script con `--target-year=<current>` y esperar drift = 0.
3. **Auditoría forense**: HR/Legal pueden pedir output para cuantificar overpago histórico ("¿cuántos días de mas pagamos en finiquito por miembro X en 2025?").

---

## Antes de empezar

- Confirma que tienes acceso al Cloud SQL Proxy: `pnpm pg:connect:status` debe responder OK.
- Confirma `.env.local` con `GREENHOUSE_POSTGRES_HOST=127.0.0.1` + `PORT=15432` + ops password.
- Verifica que la rama tiene el primitive `src/lib/leave/participation-window/` mergeado (TASK-895 S1+S2 SHIPPED).

---

## Comando canonico

```bash
# Levanta proxy
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432 &

# Corre el audit (read-only, NUNCA muta)
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/leave/audit-accrual-drift.ts \
  --target-year=2026 \
  --output=audit-leave-accrual-2026.json
```

### Flags

| Flag | Default | Descripcion |
| --- | --- | --- |
| `--target-year=<N>` | current year | Year a auditar. Use año pasado para auditoría histórica. |
| `--output=<path>` | stdout only | Si se especifica, escribe el JSON al archivo (además de stdout). |
| `--limit=<N>` | 500 | Máximo número de members a auditar. |
| `--member-ids=id1,id2,id3` | (todos) | Restringe a una lista específica de member_ids (csv). |

---

## Que significa el output

```json
{
  "summary": {
    "targetYear": 2026,
    "driftNoiseFloorDays": 0.01,
    "membersScanned": 4,
    "membersWithDrift": 4,
    "membersDegraded": 0,
    "totalDriftDays": 46.52,
    "maxDriftDays": 15,
    "avgDriftDays": 11.63
  },
  "items": [...]
}
```

| Campo | Significado |
| --- | --- |
| `targetYear` | Year auditado. |
| `driftNoiseFloorDays` | Threshold mínimo para reportar drift (default 0.01 días). |
| `membersScanned` | Cuántos miembros se evaluaron (post-filter activo + CL + monthly_accrual + balance > 0). |
| `membersWithDrift` | Cuántos miembros tienen drift > noise floor (sobreacumulación o subadjudicación). |
| `membersDegraded` | Cuántos miembros el resolver devolvió `degradedMode=true` (no debe usarse para decisiones). |
| `totalDriftDays` | Suma de drift días (positivo = legacy sobreacumula, negativo = subadjudica). |
| `maxDriftDays` | Mayor drift observado en un miembro. |
| `avgDriftDays` | Promedio de drift entre miembros con drift > 0. |

### Items per miembro

```json
{
  "memberId": "valentina-hoyos",
  "displayName": "Valentina Hoyos",
  "hireDate": "2025-09-09",
  "year": 2026,
  "leaveTypeCode": "vacation",
  "policy": "full_year_dependent",
  "policyAnnualDays": 15,
  "legacyAllowanceDays": 15,
  "participationAwareAllowanceDays": 14.94,
  "driftDays": 0.06,
  "eligibleDays": 363,
  "firstServiceCycleDays": 365,
  "firstDependentEffectiveFrom": "2026-02-01",
  "reasonCodes": ["hired_mid_year_dependent"],
  "degradedMode": false,
  "degradedReason": null
}
```

| Campo | Significado |
| --- | --- |
| `policy` | Decision canonical del resolver: `full_year_dependent` / `partial_dependent` / `no_dependent` / `unknown`. |
| `legacyAllowanceDays` | Lo que está hoy en `leave_balances.allowance_days` (computed con `hire_date` ancla). |
| `participationAwareAllowanceDays` | Lo que el resolver canonical TASK-895 computaría. |
| `driftDays` | `legacy − participation_aware`. Positivo = sobreacumulación. Negativo = subadjudicación (raro). |
| `eligibleDays` | Numerador canonical (días con vínculo dependent CL en el year, post exit truncation). |
| `firstServiceCycleDays` | Denominador canonical (preserves formula legacy bit-for-bit cuando no hay transiciones). |
| `firstDependentEffectiveFrom` | Earliest `effective_from` de un cv qualifying (`indefinido`/`plazo_fijo` + `chile` + `internal`). |
| `reasonCodes` | Por qué la policy quedó así (`hired_mid_year_dependent`, `contractor_to_dependent_transition`, etc.). |

---

## Como interpretar resultados

### Caso 1: `policy = no_dependent` y `driftDays > 0`

Significado: el miembro hoy tiene days acumulados en `leave_balances` pero el resolver dice que NO acumula feriado legal CL (porque no tiene compensation_version dependent CL este year — e.g. es honorarios o contractor).

**Acción**: validar con HR si el miembro es realmente honorarios. Si lo es, el drift es **falsa acumulación** que debería ser cero. Activar flag + re-seed resuelve.

### Caso 2: `policy = partial_dependent` y `driftDays > 0`

Significado: el miembro tuvo transición contractor↔dependent mid-year. Legacy ancla en `hire_date`; resolver canonical solo cuenta el periodo dependent real.

**Acción**: validar con HR el caso (lo más común — Felipe Zurita, Maria Camila Hoyos pattern). Si HR confirma la transición, el drift es real y representa overpago futuro al finiquito si no se corrige.

### Caso 3: `policy = full_year_dependent` y `driftDays > 0`

Significado: el miembro tuvo vínculo dependent CL durante todo el year, pero hay pequeño drift de redondeo (típicamente < 0.1 días).

**Acción**: aceptable. Ruido del rounding entre legacy y canonical. NO requiere acción.

### Caso 4: `degradedMode = true`

Significado: el resolver no pudo decidir (PG fallo, TASK-890 fallo, etc.).

**Acción**: investigar logs `captureWithDomain('payroll', ...)` para entender el degraded. NO usar este item para decisiones de finiquito.

---

## Plan canonico pre-flag-ON-producción

1. **Staging 30 días sustained**: correr el script semanalmente en staging. Esperar drift = 0 después de re-seed + flag ON.
2. **Producción readonly**: una vez staging verde, correr en producción readonly (sin habilitar flag). Documentar el output en `Handoff.md`.
3. **HR + Legal signoff**: HR review el output. Decide allowlist explícita para flag-ON producción.
4. **Activación gradual**: flag-ON solo para members allowlist. Re-correr el script post activación. Verificar drift = 0 para esos members.
5. **Ampliar progresivamente**: agregar members al allowlist en lotes (e.g. 5 miembros/semana) hasta cubrir todo el roster CL active.

---

## Que NO hacer

- **NO** corras el script con flag `--apply` o intentar hacer mutación inline. Es read-only. Mutación auditada llega en V1.2 con capability `leave.balances.reconcile`.
- **NO** uses el output para autorizar pagos directos. Es información — la decisión operacional sigue siendo de HR.
- **NO** ignores `membersDegraded > 0`. Si el resolver falló en algún miembro, esos casos requieren manual review.
- **NO** corras el script en producción sin pasar por `--limit=<N>` razonable para evitar overload PG (default 500 es OK para Greenhouse hoy).

---

## Referencias técnicas

- [Spec TASK-895](../../tasks/in-progress/TASK-895-leave-accrual-participation-aware.md)
- [ADR canonical](../../architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md) (Delta 2026-05-16 §TASK-895)
- [Resolver canonical](../../../src/lib/leave/participation-window/resolver.ts)
- [Signal canonical](../../../src/lib/reliability/queries/leave-accrual-overshoot-drift.ts)
- [Script audit](../../../scripts/leave/audit-accrual-drift.ts)
