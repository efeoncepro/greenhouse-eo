# TASK-1170 — Cutover del bono OTD a atraso imputable (flip gateado, post-nómina)

## Delta 2026-06-19 — prerequisito TASK-1169 COMPLETE (shadow)

TASK-1169 cerró (ruta **B′-PG**, ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16.10-16.11). Disponible para consumir:

- **Tabla shadow** `greenhouse_delivery.otd_attributable_member_month_shadow` (member×month, OTD legacy + corregido + counts + `data_status`).
- **Helper** `computeOtdAttributableMemberMonth` / `materializeOtdAttributableMemberMonth` (`src/lib/notion-metrics/otd-attributable-member-month.ts`).
- **Reconciliación** `scripts/reconcile-otd-attributable-member-month.ts` (blast radius).
- **Signal** `delivery.attributable_lateness.member_month_paridad` (comparabilidad de cohorte, steady=0; usar como stop-gate del flip).

**Hallazgos que recalibran la urgencia de esta task:**

1. **El freeze capturado hoy NO mueve la cohorte productiva del bono** (reconciliación 2026-04/05/06: 0 member-months cambian tier de bono). → **el cutover no tiene urgencia material por ahora**; antes de flipear conviene esperar a que el freeze tenga impacto real (o decidir que no lo tendrá).
2. **El baseline legacy del bono se computa LIVE** (el `metrics_by_member` materializado de períodos cerrados está stale). El flip debe re-materializar con la lógica corregida; no asumir que el materializado vigente es el baseline.
3. **El freeze mejora el OTD por DOS mecanismos** (numerador `late_drop→on_time` + denominador `overdue→carry_over`), no solo el primero.
4. **Pendiente de rollout antes del flip:** correr el materializador periódicamente para acumular el reloj ≥30d sobre data comparable, y ampliar la cobertura del M2 shadow sobre la cohorte (flags M0/M2 + backfill).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- Backend impact: `reader`
- Epic: `optional`
- Status real: `EL CUTOVER. Único movimiento que toca el bono / la nómina. NO tomar hasta que TASK-1169 (ajustes + reconciliación) esté verde + ≥30d shadow verde member-month + 8 stop-gates + sign-off CEO. Separada de TASK-1169 por decisión del CEO (2026-06-19): "no puedo hacer el cutover ahora así".`
- Rank: `TBD`
- Domain: `delivery|ico|payroll|integrations|reliability`
- Blocked by: `TASK-1169 (alineación cohorte + reconciliación member-level confiable) — DEBE estar completa y verde. + ≥30d shadow verde a nivel member-month + 8 stop-gates canónicos + sign-off CEO documentado. NO antes.`
- Branch: `task/TASK-1170-otd-bono-cutover-flip-gated`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Ejecutar el **flip del bono OTD**: cambiar la fuente del `otd_pct` que alimenta `calculateOtdBonus` desde el bucket legacy (`performance_indicator_code`, semántica cruda) hacia el **bucket corregido por atraso imputable** alineado a la cohorte del bono (producido por TASK-1169). Es el **único movimiento que toca el bono / la nómina** y el que cierra **ISSUE-081** en producción.

Flip **gateado, per-cliente (Efeonce primero), default OFF**, detrás de los **8 stop-gates** canónicos del estrangulador + **sign-off del CEO** (cubre el stop-gate 3.5 HR/Finance — confirmado 2026-06-19). Incluye snapshot pre-flip restorable, kill-switch <5 min y runbook. **No se ejecuta dentro de la ventana de nómina.**

## Why This Task Exists

El motor de atraso imputable corrige la causa raíz de ISSUE-081 (el bono penaliza al colaborador por demoras de cliente/bloqueos/pausas). TASK-1169 deja la corrección **alineada a la cohorte del bono, reconciliada y en shadow**. Esta task es el paso final: conectar esa corrección al bono real.

Se separó de TASK-1169 porque el cutover es un flujo crítico y delicado que el CEO **no hará hasta tener todo verde** — y mezclarlo con los ajustes preparatorios arriesga ejecutar el flip antes de tiempo. Aquí vive **solo** el flip + su aparato de seguridad.

## Goal

- Flag de cutover **per-cliente** (`OTD_BONUS_CUTOVER_ENABLED` global + `_EFEONCE`/`_SKY`), default OFF, mirror de `isNotionRpaWritebackEnabled`.
- Costura: el `otd_pct` lee el bucket corregido (de TASK-1169) cuando el flag está ON para el workspace; legacy cuando OFF. `calculateOtdBonus` y el agregado `otd_pct` **no cambian** (solo el origen del bucket).
- Backward-compat: legacy (`performance_indicator_code` + fórmula Notion) preservado ≥90 días post-flip.
- Snapshot pre-flip restorable (<1h) + kill-switch (<5 min) + runbook.
- Flip **Efeonce primero**, fuera de ventana de nómina; Sky ≥30d después con reconciliación propia.
- Cierre de ISSUE-081 en producción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §16 (M3) + §16.1 garantía de nómina + §16.6 hard rules.
- `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` §3 — los **8 stop-gates** obligatorios.
- `docs/architecture/metrics/OTD_V1.md` / `metrics/ATTRIBUTABLE_LATENESS_V1.md` — la spec y el cómputo se mueven juntos.
- `docs/architecture/GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md` — `calculateOtdBonus` (consumer; NO se modifica).
- Skills MANDATORIAS al tomar: `greenhouse-ico`, `greenhouse-payroll-auditor`, `greenhouse-production-release` (si el flip va por promoción), `arch-architect`.

Reglas obligatorias:

- **NUNCA** ejecutar el flip dentro de los 7 días de ventana de nómina (ADR §16.6).
- **NUNCA** flipear sin: TASK-1169 verde + ≥30d shadow verde member-month + 8 stop-gates + reconciliación HR <1% (o deltas explicados) + sign-off CEO en `Handoff.md`.
- **NUNCA** flipear ambos clientes simultáneamente — Efeonce primero, Sky ≥30d después.
- **NUNCA** borrar/sobrescribir `performance_indicator_code` synced ni la fórmula Notion legacy (≥90d).
- **NUNCA** modificar `calculateOtdBonus` ni el agregado `otd_pct` — el cutover cambia solo la **fuente del bucket**.
- **SIEMPRE** gate de cierre: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` + suite ICO en verde.

## Normative Docs

- `metrics/OTD_V1.md` + `metrics/ATTRIBUTABLE_LATENESS_V1.md` — Delta §cutover al ship.
- `docs/operations/runbooks/otd-bono-cutover.md` — runbook (a crear en Slice de runbook).

## Dependencies & Impact

### Depends on

- **TASK-1169 ✅ requerida** — corrección alineada a cohorte + reconciliación member-level confiable + signal member-month + reloj ≥30d.
- ≥30d shadow verde member-month + 8 stop-gates + sign-off CEO.

### Blocks / Impacts

- Cierra **ISSUE-081** en producción.
- Impacta `otd_pct` → `calculateOtdBonus` → `payroll_entries` (el bono mensual). Blast radius medido por TASK-1169.
- Surfaces que leen OTD (Person/Account 360, Agency, SLA, Nexa) ven el número corregido al cutover.

### Files owned

> Estimado — `[verificar]` cada path durante Discovery al tomar la task.

- `src/lib/ico-engine/shared.ts` — costura: fuente del bucket (`CANONICAL_*_SQL`) detrás del flag — MODIFY
- `src/lib/notion-metrics/otd-classifier-flags.ts` — flag de cutover per-cliente — MODIFY/NEW
- `src/lib/payroll/fetch-kpis-for-period.ts` — verificar que `otd_pct` toma la fuente nueva post-flip (sin cambio de firma)
- `scripts/notion-metrics/restore-snapshot-otd.ts` — snapshot pre-flip restorable — NEW
- `docs/operations/runbooks/otd-bono-cutover.md` — runbook + kill-switch — NEW
- `docs/architecture/metrics/{OTD_V1,ATTRIBUTABLE_LATENESS_V1}.md` — Deltas

## Current Repo State

### Already exists

- Path del bono (`metrics_by_member` → `calculateOtdBonus`) verificado; `calculateOtdBonus` es puro (solo escalar) → no requiere cambios.
- Patrón de flag per-cliente: `isNotionRpaWritebackEnabled` / `isNotionFtrWritebackEnabled`.

### Gap

- La corrección alineada a cohorte (la produce TASK-1169) — **prerequisito**.
- No existe flag de cutover, snapshot restorable, runbook ni el flip.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (toca el bono / nómina + switch de source of truth)
- Impacto principal: `reader` (cambia la fuente del bucket que computa `otd_pct`)
- Source of truth afectado: `otd_pct` (BQ) consumido por `calculateOtdBonus`
- Consumidores afectados: `payroll` (bono) + surfaces que leen OTD
- Runtime target: `production` (flip gateado per-cliente, fuera de nómina)

### Contract surface

- Contrato existente a respetar: `calculateOtdBonus` + agregado `otd_pct` — NO se modifican
- Contrato nuevo o modificado: fuente del bucket por tarea detrás del flag de cutover
- Backward compatibility: `gated` (flag OFF; legacy preservado ≥90d)
- Full API parity: el bono lee el primitive canónico `otd_pct`; cutover server-side puro

### Data model and invariants

- Entidades afectadas: la fuente corregida de TASK-1169, `v_tasks_enriched`/`metrics_by_member`
- Invariantes:
  - `otd_pct` con flag OFF byte-idéntico al legacy (test de paridad)
  - el cutover cambia solo el origen del bucket, nunca el agregado ni `calculateOtdBonus`
  - flip per-cliente, Efeonce primero, fuera de nómina
- Tenant/space boundary: per-cliente (efeonce/sky)
- Idempotency/concurrency: cambio de fuente de lectura; materialización ICO idempotente
- Audit/outbox/history: dual-column ≥90d + signals member-month + snapshot pre-flip restorable

### Migration, backfill and rollout

- Migration posture: `none`/`additive` (la materialización corregida la trae TASK-1169)
- Default state: `flag OFF` (cero impacto en bono hasta el flip)
- Backfill plan: reconciliación HR dry-run pre-flip (de TASK-1169); sin mutación destructiva
- Rollback path: flag `_EFEONCE` OFF (<5 min) + restore snapshot (<1h) si ya corrió nómina
- External coordination: sign-off CEO + comms Delivery + (ruta A) coordinación TASK-927/sync

### Security and access

- Auth/access gate: sin superficie nueva; lectura ICO ya gateada
- Sensitive data posture: `payroll` (impacta el bono — crítico)
- Error contract: `captureWithDomain(err, 'delivery'|'integrations.notion', ...)`
- Abuse/rate-limit posture: N/A (lectura interna)

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` + suite ICO + test de paridad flag-OFF
- DB/runtime checks: snapshot restore verificado; reconciliación HR <1%
- Integration checks: (ruta A) `[GH] OTD` synced en `v_tasks_enriched`
- Reliability signals/logs: paridad member-month
- Production verification sequence: ver §Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados (hecho arriba).
- [ ] Invariantes, tenant/access boundary e idempotencia explícitos (hecho arriba).
- [ ] Migration/backfill/rollback proporcional al riesgo (hecho arriba).
- [ ] Evidencia runtime/DB listada (hecho arriba).
- [ ] Dominio payroll con errores canónicos, audit/signal y sin fugas de data cruda.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que tome la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Gate de entrada (NO tomar la task hasta cumplirlos)

1. **TASK-1169 completa y verde** — corrección alineada a cohorte + reconciliación member-level confiable + signal member-month.
2. **≥30 días de shadow verde member-month** (no por-tarea).
3. **8 stop-gates canónicos** (`GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` §3).
4. **Reconciliación HR <1%** (o cada delta explicado) + **sign-off CEO** en `Handoff.md`.
5. **Fuera de ventana de nómina** (no en los 7 días de cierre).

## Scope

### Slice 1 — Flag de cutover per-cliente

`isOtdBonusCutoverEnabled(workspaceId)` — global `OTD_BONUS_CUTOVER_ENABLED` + `_EFEONCE`/`_SKY` (default OFF), mirror `isNotionRpaWritebackEnabled`.

### Slice 2 — Costura de fuente (detrás de flag)

`CANONICAL_*_SQL` en `shared.ts` leen el bucket corregido (de TASK-1169) cuando el flag está ON; legacy cuando OFF. Test de paridad: flag OFF → `otd_pct` byte-idéntico.

### Slice 3 — Snapshot pre-flip restorable

`scripts/notion-metrics/restore-snapshot-otd.ts` + snapshot BQ `ico_engine_backup.metrics_by_member_otd_<date>` (incluye `payroll_entries` proyectado). Restore <1h verificado.

### Slice 4 — Kill switch + runbook

Verificar en staging: flag ON→OFF restaura legacy <5 min sin redeploy. Runbook `otd-bono-cutover.md` (paridad post-flip, rollback verbatim, escalación HR, qué reportar al cliente).

### Slice 5 — Docs + sign-off

Deltas `OTD_V1.md` / `ATTRIBUTABLE_LATENESS_V1.md`; CLAUDE.md (M3 shipped al cierre); `Handoff.md` con sign-off CEO + allowlist de miembros impactados.

### Slice 6 — Flip Efeonce + monitor

Fuera de nómina, con gate de entrada verde: flip `_EFEONCE` ON. Monitor 30d (signals + reconciliación mes 1). Sky NO se toca aquí.

## Out of Scope

- **Los ajustes de cohorte/atribución/reconciliación** → TASK-1169 (prerequisito).
- **Flip de Sky** → slice/task posterior, ≥30d después de Efeonce verde.
- **Cambios a `calculateOtdBonus`** (thresholds/proración).
- Motivos `operator_confirmed` → follow-up TASK-921.

## Detailed Spec

La costura es quirúrgica: `calculateOtdBonus` recibe un escalar `otdPercent` y no sabe su origen. La cadena `bucket por tarea → otd_pct → getMetricValue → calculateOtdBonus` solo cambia en el **origen del bucket** (las `CANONICAL_*_SQL` de `shared.ts`), detrás del flag per-cliente. Todo aguas abajo byte-idéntico. La fuente corregida la produce TASK-1169 (alineada a cohorte mensual/miembro).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Gate de entrada → Slice 1 (flag) → 2 (costura, paridad OFF) → 3 (snapshot) → 4 (kill-switch+runbook) → 5 (docs+sign-off) → 6 (flip Efeonce). El flip (6) no ocurre sin 1-5 verdes + gate de entrada + fuera de nómina.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Bono cambia mal | payroll | media | reconciliación member-level <1% (TASK-1169) + snapshot restorable | reconciliación mes 1 |
| Flip dentro de ventana de nómina | payroll | baja | hard rule + checklist | calendario nómina |
| Flip Sky junto con Efeonce | payroll | baja | per-cliente flag + hard rule | flag audit |
| Drift paridad post-flip | delivery | media | signal member-month + dual-column ≥90d | `shadow_paridad_otd_*` |

### Feature flags / cutover

- `OTD_BONUS_CUTOVER_ENABLED` (global, default OFF) + `_EFEONCE`/`_SKY` (per-cliente, ganan sobre global). Revert = flag a false. <5 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 (flag) | revert PR | <10 min | sí |
| 2 (costura) | flag OFF → legacy | <5 min | sí |
| 3 (snapshot) | revert PR | <10 min | sí |
| 4 (runbook) | revert doc | inmediato | sí |
| 5 (docs) | revert doc | inmediato | sí |
| 6 (flip Efeonce) | flag OFF → legacy + restore snapshot si ya corrió nómina | <5 min / <1h | sí |

### Production verification sequence

1. Slice 2 flag OFF en staging+prod → `otd_pct` byte-idéntico (paridad).
2. Reconciliación member-level (TASK-1169) <1% o deltas explicados.
3. Snapshot pre-flip + restore <1h en staging.
4. Kill-switch ON→OFF <5 min en staging.
5. Flip `_EFEONCE` en prod fuera de nómina → monitor + reconciliación mes 1.
6. Sky ≥30d después.

### Out-of-band coordination required

- **Sign-off CEO** (cubre stop-gate 3.5) + allowlist de miembros + diff bono pre/post en `Handoff.md`.
- Comms a Delivery/colaboradores: el OTD ahora descuenta tiempo no imputable.
- (Ruta A) propiedad `[GH] OTD` + ingestión en sync (TASK-927).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Gate de entrada cumplido (TASK-1169 verde + ≥30d shadow verde member-month + 8 stop-gates + sign-off CEO + fuera de nómina).
- [ ] Flag `OTD_BONUS_CUTOVER_ENABLED` global + per-cliente, default OFF; con OFF `otd_pct` byte-idéntico (test de paridad).
- [ ] Snapshot pre-flip restorable <1h verificado.
- [ ] Kill-switch ON→OFF <5 min verificado en staging + runbook publicado.
- [ ] Flip ejecutado fuera de nómina; solo Efeonce.
- [ ] Legacy (`performance_indicator_code` + fórmula Notion) intacto ≥90d.
- [ ] `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` + suite ICO verdes; `pnpm build` verde.
- [ ] Deltas docs + CLAUDE.md (M3 shipped) + changelog; ISSUE-081 cerrado.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test` (full) · `pnpm build`
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding`
- Monitor post-flip: signals member-month + reconciliación mes 1.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` (sign-off CEO + allowlist + diff) + `changelog.md`
- [ ] chequeo de impacto cruzado (TASK-1169/921/922/923/927 + ISSUE-081)
- [ ] CLAUDE.md: M3 shipped + cerrar ISSUE-081

## Follow-ups

- **Flip de Sky** (≥30d post-Efeonce verde, reconciliación propia).
- Retiro de la fórmula Notion legacy (≥90d post-flip).
- Severidad/tiers retro del atraso (ADR §8).

## Open Questions

- **¿El flip va por flag runtime o por promoción/release control plane?** (define si se invoca `greenhouse-production-release`).
- **¿Se acepta "freeze-only" en V1** o se espera a que fluyan los motivos `operator_confirmed`? (depende del blast radius de TASK-1169).
