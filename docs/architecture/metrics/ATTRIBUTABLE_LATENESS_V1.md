# `Atraso imputable` — Attributable Lateness — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | Atraso imputable (attributable days late) + bucket OTD reason-aware |
| Metric ID (registry) | `attributable_days_late` (shadow) — no en registry productivo hasta cutover |
| Spec version | V1 |
| Status | Accepted (shadow) |
| Owner domain | `delivery|ico` |
| Created | 2026-05-24 by sesión TASK-922 (M2) |
| Last updated | 2026-05-24 |
| Writeback state | `shadow` (flag `ATTRIBUTABLE_LATENESS_OTD_ENABLED` default OFF; cutover del bono = task futura gated) |
| Cross-refs | ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` (§4 fórmula, §5 anti-doble-descuento, §7 bucket, §16 movimientos) · OTD_V1 (bucket corregido) · CYCLE_TIME_V1 §4.1 (patrón de intervalos, set de exclusión DISTINTO) · TASK-921 (`task_due_date_changes` + motivo) · TASK-908/912 (`task_status_transitions`) · TASK-923 (`classifyOtdBucket`) · ISSUE-081 |

---

## 1. Definición canonical

El **atraso imputable** mide SOLO el slip atribuible a la agencia: días posteriores a la **fecha justa** (compromiso real con el cliente) menos el tiempo en estados de **freeze** (espera de cliente / bloqueo externo / pausa). Corrige el atraso **bruto** que hoy alimenta OTD/bono (incluye demoras no imputables — causa raíz de ISSUE-081).

## 2. Fórmula canonical

### 2.1 Per-task (compute individual)

```
fecha_justa = COALESCE(fecha_original, fecha_vigente)
            + Σ days_delta de reprogramaciones FORWARD con reason CONFIRMADO ∈ {client_requested, scope_change}

atraso_imputable = max(0,
      días_calendario(fin, fecha_justa)
    − tiempo en {Listo para revisión, Bloqueado, En pausa} POSTERIOR a fecha_justa)

  fin = completed_at  (o asOf si abierta)
```

Mismo algoritmo de resta de intervalos que `calculateCycleTime` (CYCLE_TIME_V1 §4.1) con **tres diferencias canónicas** (ADR §4):
1. el reloj arranca en la **fecha justa**, no en "En curso";
2. set de exclusión = los **3 estados de freeze** (Cycle Time solo excluye `Bloqueado`);
3. solo cuenta intervalos **posteriores** a la fecha justa.

> **Distinción vs Cycle Time**: el tiempo en revisión del cliente y `En pausa` se **EXCLUYEN** del atraso (no penalizar a la agencia) pero se **INCLUYEN** en Cycle Time (calendario real).

### 2.2 Bucket OTD reason-aware

Los 4 buckets se recalculan con `fecha_justa` + freeze vía `classifyOtdBucket` (freeze ON, `applyMonthGate: false`): `on_time` (atraso=0), `late_drop` (cerrada, atraso>0), `overdue` (abierta, pasó fecha justa neto de freeze), `carry_over` (abierta, dentro). **No es input nuevo al bono — es corrección del existente.**

### 2.3 Versionado de fórmula

`ATTRIBUTABLE_LATENESS_FORMULA_VERSION = 'attributable_lateness_v1.0'`. Bump en cambio semántico.

## 3. Inputs canonical

- `greenhouse_delivery.tasks`: `due_date`, `original_due_date`, `completed_at`, `task_status`, `performance_indicator_code` (legacy baseline).
- `greenhouse_delivery.task_status_transitions` (TASK-908/912): reconstrucción de intervalos de freeze.
- `greenhouse_delivery.task_due_date_changes` (TASK-921): extensiones de fecha justa (solo `reason_source='operator_confirmed'`).

### 3.1 Boundary canonical Notion ↔ Greenhouse

Notion = OS (captura due_date + estado + motivo). Greenhouse = motor (computa atraso + bucket). El bucket corregido se escribe de vuelta solo al cutover (gated).

## 4. Helper canonical (per-task compute)

`calculateAttributableLateness(inputs)` en `src/lib/notion-metrics/calculate-attributable-lateness.ts` (server-only, pure). Delega el bucket a `classifyOtdBucket` (single source of truth). El consumer reactivo `notion_attributable_lateness_compute` reconstruye intervalos + reschedules desde PG y persiste en `task_attributable_lateness_shadow`.

### 4.1 Anti-doble-descuento (ADR §5)

Solo `client_requested`/`scope_change` extienden la fecha justa; esos motivos son **disjuntos** de los estados de freeze. El freeze clampa a post-fairDeadline → ningún wall-clock se cuenta dos veces. Signal `delivery.attributable_lateness.freeze_reschedule_overlap` (steady=0) es defensa-en-profundidad.

## 7. Estados / dataStatus

- `valid`: medición precisa.
- `unavailable`: sin historial de transiciones o sin fecha base → NO 0 falso (honest degradation, ADR §42).
- `legacy_unknown`: reprogramación extending sin confirmar → conservador (mide vs fecha vigente, no vs la justa especulativa). Solo el motivo **confirmado** alimenta el bono (ADR §6).

## 9. Writeback / cutover

Shadow V1: `task_attributable_lateness_shadow` (PG), flag `ATTRIBUTABLE_LATENESS_OTD_ENABLED` default OFF. **NO mirror BQ del freeze** (multi-ciclo no es CASE BQ mantenible; el helper TS es source of truth — patrón RpA V2). El cutover del bono (flip `otd_pct` → columna GH) es una task futura gated: 8 stop-gates + sign-off HR + ≥30d shadow verde (ADR §16.2 M3).

## 10. Histórico de decisiones (append-only)

### 2026-05-24 — V1 created (TASK-922 M2, shadow)

Helper + classifyOtdBucket reason-aware (applyMonthGate) + shadow table + consumer reactivo + 2 signals. Flag OFF. Reusa el patrón RpA V2 (helper + snapshot + consumer) en vez de mirror BQ (freeze demasiado complejo para paridad SQL mantenible).

## 11. Cross-refs

ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` · OTD_V1 (Delta bucket reason-aware) · CYCLE_TIME_V1 §4.1 · RPA_V1 (patrón writeback) · TASK-921/908/912/923.

## 12. Open questions deliberadamente NO resueltas en V1

- Cutover del bono (M3) — task futura gated.
- Severidad/tiers retro (ADR §8) — task futura.
- Mirror BQ del atraso (si emerge consumer BQ-nativo) — evaluar al cutover.
