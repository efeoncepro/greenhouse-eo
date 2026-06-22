# TASK-1221 — RpA V2 Flip B: cutover del bono (BONUS_USE_RPA_V2, Efeonce → Sky)

## ⚠️ Delta 2026-06-22 — el gate de validación NO es "paridad vs V1" (V1 es la fuente mala)

Análisis profundo con data real (sesión CEO) → ver `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` Delta 2026-06-22 + bug-class catalog BUG-CLASS-005. Resumen:

- **NUNCA validar V2 contra V1 / `client_change_round_final` / "paridad ≥95%".** V1 es un Rollup de Notion sobre una DB de correcciones creadas a mano → inexacto por diseño, **deprecado a propósito** (es la razón de existir de V2). Compararlos es circular.
- **El motor V2 cuenta correcto** (7/7 correcciones de estado reales). No hay que cambiarlo ni re-basarlo en el contador.
- **La precondición del cutover es OPERATIVA:** que el equipo **mueva siempre** la tarea a "Cambios solicitados" cuando hay corrección (ahora load-bearing del bono). + avisarle al equipo.
- **Gate correcto (reemplaza el de abajo):** validación por **ground truth confirmado por el operador** sobre un mes shadow + acotar residuo de muestreo (BUG-CLASS-003). El cutover NO procede hasta eso.

Las secciones de Scope/Acceptance/Open Questions de abajo que mencionan "paridad ≥95%" quedan supersedidas por este gate.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `payroll`
- Blocked by: `TASK-917 (Flip A: rpa_avg_v2 materializado + señal shadow_paridad_rpa)`
- Branch: `task/TASK-1221-rpa-v2-bonus-cutover-flip-b`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Flip B del strangler RpA V2: cambiar la **fuente del bono** de `metrics_by_member.rpa_avg` (V1, fórmula legacy Notion) a `rpa_avg_v2` (motor Greenhouse), vía el flag per-tenant `BONUS_USE_RPA_V2` en `calculateRpaBonus` — **Efeonce primero, Sky después de verde**. Es el único movimiento del programa que toca nómina. Reversible en <5min (flag flip + redeploy; legacy `rpa_avg` intacto). Carve-out de TASK-917 (ex-Slices 3-4). El motor V2 ya está vivo en Efeonce+Sky; falta el agregado mensual (TASK-917 Flip A) y este flip.

## Why This Task Exists

El motor V2 corrige el RpA roto del incidente TASK-877 (3.168 tareas Sky con `rpa=null` 10 meses sin alerta). Pero hasta que el **bono** lea V2, la corrección no llega a la plata. `calculateRpaBonus` hoy lee el legacy `rpa_avg`; este task introduce el switch gated. Se separó de TASK-917 (Flip A, display) porque tocar nómina exige su propio gate, su rollout gradual per-tenant y la decisión de criterio del CEO — distinto del flip de display que no tiene riesgo de pago.

**Estado real verificado (2026-06-22):** V2 vivo en Efeonce+Sky (captura desde 2026-05-21, compute `task_rpa_snapshots`, writeback `[GH] RpA v2`). El shadow-compare per-tarea (TASK-917 delta 2026-06-18) mostró que la **cohorte enteramente cubierta ya pasa ≥95%** (Efeonce 98.1%, Sky 95.5%); las pre-captura arrastran sesgo negativo (V2 subcuenta correcciones previas a la captura) — exactamente lo que el gate forward-accumulation excluye.

## Goal

- Flag per-tenant `BONUS_USE_RPA_V2` en `calculateRpaBonus` / `fetch-kpis-for-period` (lee `rpa_avg_v2` cuando ON, `rpa_avg` cuando OFF).
- Cutover gradual: Efeonce primero, Sky tras Efeonce verde.
- Cada flip reversible <5min (flag + redeploy; `rpa_avg` legacy intacto).
- Reconciliación del bono mes 1 post-flip + sign-off CEO registrado.
- Resolver la decisión de criterio (paridad-vs-correctitud) antes del flip.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` — §3 (Fase D bonus cutover), §3.1 coexistencia, §5 señal paridad, los 8 stop-gates
- `docs/architecture/metrics/RPA_V1.md` — §13.1 (bonus banded proration, null-not-zero contract)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato del bono

Reglas obligatorias:

- **NUNCA** flip global directo: Efeonce primero → Sky tras verde (greenhouse-ico hard rule).
- **NUNCA** cortar bono a V2 sin el agregado `rpa_avg_v2` + señal `shadow_paridad_rpa` (TASK-917) verdes.
- Legacy `rpa_avg` **intacto** durante y post-cutover (coexistencia 90+ días; rollback <5min).
- Flip B **solo** sobre períodos enteramente cubiertos por la captura activa (forward-accumulation; el backfill histórico NO es viable — sin API Notion de property-history). **Gate duro.**
- Fuera de ventana de nómina; kill-switch verificado en staging antes de prod.
- `BONUS_USE_RPA_V2` nuevo → registrar en `FEATURE_FLAG_STATE_LEDGER.md` (mismo PR).

## Normative Docs

- Skill MANDATORIA `greenhouse-payroll-auditor` (toca el bono / KPI ICO).
- Skill `greenhouse-ico` (semántica RpA, 8 stop-gates, migration playbook).
- TASK-915 (umbrella cutover), TASK-917 (Flip A — bloqueante), TASK-916/912/901 (compute/captura).

## Dependencies & Impact

### Depends on

- **TASK-917 (Flip A)** — `metrics_by_member.rpa_avg_v2` poblado member×mes + señal `shadow_paridad_rpa`. **Bloqueante duro.**
- `calculateRpaBonus` ([src/lib/payroll/bonus-proration.ts](src/lib/payroll/bonus-proration.ts)) — consumer del bono (hoy lee `rpa_avg`).
- `fetch-kpis-for-period` ([src/lib/payroll/fetch-kpis-for-period.ts](src/lib/payroll/fetch-kpis-for-period.ts)) — resuelve `rpaAvg` para el bono.

### Blocks / Impacts

- Desbloquea TASK-1218 (RpA explainability — gated por el cutover de RpA V2).
- Cierra la migración RpA V2 (umbrella TASK-915) salvo cleanup V1 (Fase E, opcional).
- Impacta nómina: el bono RpA de Efeonce (luego Sky) pasa a V2.

### Files owned

- `src/lib/payroll/bonus-proration.ts` (switch de fuente gated)
- `src/lib/payroll/fetch-kpis-for-period.ts` (lee `rpa_avg_v2` cuando flag ON)
- Flag `BONUS_USE_RPA_V2` (resolver per-tenant) + `FEATURE_FLAG_STATE_LEDGER.md`
- Tests del bono (`bonus-proration`)

## Current Repo State

### Already exists

- Motor V2 vivo en Efeonce+Sky (captura + compute + writeback `[GH] RpA v2`).
- `calculateRpaBonus` + `fetch-kpis-for-period` (leen `rpa_avg` V1 hoy; sin rama V2 ni flag — verificado 2026-06-22).
- Campo `rpa_avg_v2` declarado en `metrics_by_member` (poblado por TASK-917).

### Gap

- No existe `BONUS_USE_RPA_V2` ni rama V2 en el path del bono.
- Sin reconciliación / sign-off del cutover.
- Decisión de criterio (paridad-vs-correctitud) sin tomar.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command` (path del bono)
- Source of truth afectado: fuente de `rpaAvg` en `calculateRpaBonus` (`rpa_avg` → `rpa_avg_v2` gated)
- Consumidores afectados: `payroll bono RpA (Efeonce, luego Sky)`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `calculateRpaBonus` (sin cambio de signature — §3.1 ADR), null-not-zero contract (RPA_V1 §13.1).
- Contrato nuevo: flag per-tenant `BONUS_USE_RPA_V2` + rama de fuente.
- Backward compatibility: `gated` — default OFF = V1 (byte-equivalente); ON per-tenant = V2.
- Full API parity: el bono reusa el agregado canónico `rpa_avg_v2` (TASK-917); cero recompute.

### Data model and invariants

- Entidades: lee `metrics_by_member.rpa_avg_v2`; NO muta materializaciones; legacy `rpa_avg` intacto.
- Invariantes:
  - Flip solo sobre períodos enteramente cubiertos por la captura (forward-accumulation).
  - Efeonce primero → Sky tras verde (nunca simultáneo).
  - `rpa_avg` legacy nunca se borra (rollback path).
  - null-not-zero: V2 null → "Pendiente", NUNCA 0 (que inflaría/deflaría bono).
- Tenant/space boundary: flag resuelto per-tenant.
- Idempotency/concurrency: el cálculo del bono ya es determinístico por período; el flag no cambia eso.
- Audit/outbox/history: el bono ya audita; registrar qué fuente (V1/V2) se usó por período (trazabilidad de reconciliación).

### Migration, backfill and rollout

- Migration posture: `none` (switch de lectura; `rpa_avg_v2` lo materializa TASK-917).
- Default state: `flag OFF` (V1) — flip per-tenant manual bajo gate.
- Backfill plan: N/A (forward-accumulation; NO backfill histórico — no viable).
- Rollback path: `BONUS_USE_RPA_V2=false` + redeploy ops-worker (<5min); `rpa_avg` intacto.
- External coordination: **sign-off del CEO** (es la autoridad; no gate HR/Finance externo) + reconciliación del bono mes 1.

### Security and access

- Auth/access gate: el cálculo del bono es server-side (payroll); el flag es env/config, no user-facing.
- Sensitive data posture: `payroll` — afecta montos de bono; máximo cuidado, rollout gradual.
- Error contract: si `rpa_avg_v2` falta para un member×mes elegible → degradación honesta (no 0); no pagar con dato inventado.
- Abuse/rate-limit posture: N/A.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/payroll` (bonus-proration) verde.
- DB/runtime checks: shadow compare `rpa_avg_v2` vs `rpa_avg` sobre el período cerrado (cohorte cubierta) ≥95%; verificar `payroll_entries.kpi_rpa_avg` cambia de fuente solo con flag ON.
- Integration checks: staging — flip ON Efeonce, recalcular bono de un período de prueba, confirmar usa V2; flip OFF → vuelve a V1.
- Reliability signals/logs: `shadow_paridad_rpa` (de TASK-917) verde sostenido antes del flip.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Default OFF = V1 byte-equivalente; ON per-tenant = V2.
- [ ] Flip solo sobre período enteramente cubierto por captura (gate forward-accumulation).
- [ ] Reconciliación del bono mes 1 + sign-off CEO registrado antes de declarar pass.
- [ ] Rollback <5min verificado en staging.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Decisión de criterio + flag + rama V2 (gated, OFF)

- Resolver con el CEO la **decisión de criterio**: ¿el cutover se juzga por "paridad ≥95% vs V1" o por "correctitud" (V2 reemplaza a V1 aunque diverja)? Documentar la resolución (define el gate de salida).
- Introducir `BONUS_USE_RPA_V2` (resolver per-tenant) + rama en `fetch-kpis-for-period`/`calculateRpaBonus`: `useRpaV2 ? rpa_avg_v2 : rpa_avg`. Default OFF. Registrar en el ledger de flags.
- Tests: OFF = V1 byte-equivalente; ON = lee V2; null-not-zero preservado.

### Slice 2 — Flip B Efeonce (gated)

- Verificar gate: `shadow_paridad_rpa` verde sobre período cubierto + criterio resuelto + fuera de ventana de nómina.
- Flip `BONUS_USE_RPA_V2=true` solo Efeonce; reconciliar bono mes 1; sign-off CEO; kill-switch listo.

### Slice 3 — Flip B Sky (tras Efeonce verde)

- Repetir para Sky una vez Efeonce está verde + reconciliado (≥1 mes). Sky justo en la línea (95.5%) → atención extra.

## Out of Scope

- Materializar `rpa_avg_v2` / señal de paridad / display (TASK-917 Flip A).
- Captura / compute / writeback (TASK-912 / TASK-916).
- Borrar `rpa_avg` legacy (Fase E, 90+ días post-cutover, opcional).
- Explicabilidad de RpA (TASK-1218 — esta task la desbloquea).

## Detailed Spec

Patrón canónico del ADR Strangler §3:

```ts
// src/lib/payroll/fetch-kpis-for-period.ts
const useRpaV2 = await isBonusUseRpaV2Enabled(tenantId)  // flag per-tenant
const rpaAvg = useRpaV2 ? row.rpa_avg_v2 : row.rpa_avg
```

`calculateRpaBonus` no cambia de signature (sigue recibiendo `rpaAvg`). El gate de salida exacto (≥95% paridad cohorte cubierta vs "correctitud") lo fija la decisión de criterio del Slice 1.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-917 (Flip A) **MUST** estar complete (`rpa_avg_v2` + `shadow_paridad_rpa` verdes) antes de Slice 1.
- Slice 1 (criterio + flag OFF) → Slice 2 (Efeonce) → Slice 3 (Sky). NUNCA Sky antes de Efeonce verde + reconciliado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Bono pagado con V2 no validado | payroll | media | Gate `shadow_paridad_rpa` verde + criterio resuelto + Efeonce primero + sign-off CEO | `shadow_paridad_rpa` |
| V2 subcuenta correcciones (BUG-CLASS-003 muestreo) → infla bono | payroll | media | Gate forward-accumulation (solo período cubierto); sesgo negativo conocido y acotado | `shadow_paridad_rpa` (sesgo) |
| Ambos clientes a V2 simultáneo | payroll | alta si simultáneo | Efeonce primero, Sky tras verde + reconciliado | reclamos / disputes |
| `rpa_avg_v2` null para member elegible → bono mal | payroll | baja | null-not-zero honesto (Pendiente, no 0); no pagar con inventado | — |

### Feature flags / cutover

- `BONUS_USE_RPA_V2` (resolver per-tenant), default OFF. Flip = env var + redeploy ops-worker. Rollback = OFF + redeploy (<5min). Registrar en `FEATURE_FLAG_STATE_LEDGER.md`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (flag inerte OFF) | <10 min | sí |
| Slice 2 | `BONUS_USE_RPA_V2=false` (Efeonce) + redeploy | <5 min | sí (`rpa_avg` intacto) |
| Slice 3 | `BONUS_USE_RPA_V2=false` (Sky) + redeploy | <5 min | sí |

### Production verification sequence

1. Confirmar TASK-917 verde: `rpa_avg_v2` poblado + `shadow_paridad_rpa` verde sobre período cubierto.
2. Criterio resuelto + documentado (CEO).
3. Staging: flip Efeonce ON → recalcular bono período prueba → usa V2; flip OFF → vuelve a V1.
4. Prod Efeonce (fuera de ventana de nómina): flip ON → reconciliar bono mes 1 → sign-off CEO.
5. Tras Efeonce verde + reconciliado (≥1 mes): repetir para Sky.
6. Monitor `shadow_paridad_rpa` + disputes 30d post-flip por tenant.

### Out-of-band coordination required

- **Sign-off del CEO** (autoridad del cutover) + reconciliación del bono mes 1 por tenant. Coordinar el flip fuera de ventana de nómina.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `BONUS_USE_RPA_V2` per-tenant en el path del bono; default OFF = V1 byte-equivalente.
- [ ] Decisión de criterio (paridad-vs-correctitud) resuelta y documentada (CEO).
- [ ] Flip Efeonce: bono lee V2 (`payroll_entries.kpi_rpa_avg` de V2) + reconciliación mes 1 + sign-off CEO registrado.
- [ ] Flip Sky solo tras Efeonce verde + reconciliado.
- [ ] Cada flip reversible <5min verificado en staging; `rpa_avg` legacy intacto.
- [ ] `BONUS_USE_RPA_V2` registrado en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] `pnpm vitest run src/lib/payroll` verde.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (bonus-proration + full suite al cierre)
- `pnpm build`
- Shadow compare período cerrado (cohorte cubierta) + smoke staging con flag flips

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado (cambio de comportamiento del bono)
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` actualizado (`BONUS_USE_RPA_V2`)
- [ ] chequeo de impacto cruzado (TASK-915 umbrella, TASK-917, TASK-1218 desbloqueada)
- [ ] `greenhouse-payroll-auditor` + `greenhouse-documentation-governor` + `greenhouse-qa-release-auditor`

## Follow-ups

- TASK-1218 (RpA explainability) queda desbloqueada tras este cutover.
- Cleanup V1 `rpa_avg` (Fase E, 90+ días post-cutover stable, opcional).

## Open Questions

- **Decisión de criterio:** ¿paridad ≥95% vs V1, o correctitud (V2 reemplaza aunque diverja)? El CEO la resuelve en Slice 1; define el gate de salida. Recomendación: correctitud sobre cohorte cubierta (V1 es la fórmula defectuosa que se reemplaza), con `shadow_paridad_rpa` como monitor, no como veto.
