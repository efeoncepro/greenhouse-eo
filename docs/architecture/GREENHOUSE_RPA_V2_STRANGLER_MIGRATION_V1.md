# GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1

> **Status**: Accepted (con Delta canonical 2026-05-17 post-Bomba-1)
> **Date**: 2026-05-17
> **Authors**: sesión deep-dive CEO + arch-architect + greenhouse-ico + notion-platform skills
> **Scope**: Delivery / ICO / Integrations / Payroll downstream consumer / Reliability
> **Supersedes**: ninguno (extiende `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` + `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` + `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`)
> **Precondición canonical**: `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1.md` ⭐ (cierra Bomba 1)
> **Implementation tasks**: TASK-901 (RpA V2 carril paralelo) + bloqueada por TASK-908 + TASK-910

---

## Delta 2026-05-17 — Bomba 1 cerrada (status divergence cross-tenant)

**Bomba detectada en sesión live post-ship original**: auditoría manual de schemas Notion reveló que el "evento canonical de corrección" (`Listo para revisión → En Feedback`) **solo existía en Sky** — Efeonce usaba `Listo para revisión → Cambios Solicitados`. Plus property name divergente (`Estado` vs `Estado 1`), enum values distintos, estados Efeonce-only sin equivalente Sky, y un estado Sky (`Tomado`) que era tag de responsable mal puesto como status.

**Resolución canonical**: ADR nuevo `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1.md` declara los **11 estados canonical universales** que TODOS los teamspaces Notion comparten, en una property unificada `Estado`. Sin per-tenant mapping, sin adapter layer — Notion mismo opera con vocabulary canonical.

**Cambios canonical a este ADR derivados del Delta**:

1. **Evento canonical de corrección actualizado**: `Listo para revisión → Cambios solicitados` (universal cross-tenant, NO solo Sky)
2. **Naming canonical V2 sin cambios** — sigue válido (helper `calculateRpaV2`, columna `rpa_avg_v2`, property `[GH] RpA v2`)
3. **Schema `task_status_transitions` simplificado** (TASK-908 owned): NO requiere columnas `canonical_from_status` + `canonical_to_status` separadas — el status raw Notion ya es canonical post-cleanup
4. **Helper `countCorrectionTransitions(taskId)`** consume directo:
   ```sql
   WHERE from_status = 'Listo para revisión'
     AND to_status = 'Cambios solicitados'
   ```
   Funciona idéntico en todos los tenants.
5. **Reliability signal nuevo recomendado V1.1**: `notion.task.status_drift_from_canonical` (kind=drift, warning si emerge estado non-canonical en algún teamspace).
6. **Fase 0 nueva agregada al roadmap**: cleanup Notion canonical (operador-side, ~1-2 días) ejecutado **antes** de Fase A. Detalle en `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1.md §5`.

**Hard rules adicionales derivadas**:

- **NUNCA** consumir status de Notion sin haber verificado que el teamspace tiene los 11 canonical sincronizados (per ADR lifecycle §7 hard rule 5).
- **NUNCA** introducir variants de spelling en transición canonical de corrección — el canonical literal es `'Listo para revisión'` → `'Cambios solicitados'`.

**Impacto en lo firmado en commit `d1fa620a` original**:

- ✅ TL;DR + decisiones canonical generales del ADR → siguen válidas
- ✅ Naming canonical V2 (`calculateRpaV2`, etc.) → sigue válido
- ✅ 5 Fases canonical (A-E) → siguen válidas (+ Fase 0 nueva pre-A)
- ✅ Garantía operativa cutover bonus reversible <5min → sigue válida
- ⚠️ Premisa del evento canonical de corrección → **CORREGIDA** vía este Delta
- ⚠️ Schema `task_status_transitions` → **SIMPLIFICADO** (no requiere doble columna)

---

## Original ADR content (intacto post-Delta)

---

## 0. TL;DR canonical

El motor de cómputo de **RpA migra de Notion formula → Greenhouse canonical helper** vía **Strangler Fig pattern** (Fowler 2004): V2 nuevo corre **completamente en paralelo** al V1 actual durante 5-7 meses, ambos visibles, **sin tocar bonus payroll** hasta cutover explícito gated por feature flag + paridad signal ≥95% sustained + HR/Finance sign-off escrito.

**Garantía operativa central**: `calculateRpaBonus` sigue leyendo `metrics_by_member.rpa_avg` (V1) durante toda la migración. Cutover bonus = **una sola línea de código** que cambia la fuente a `metrics_by_member.rpa_avg_v2`, **gated por feature flag granular per-tenant**, **reversible en <5 min** via env var flip.

**Decisión arquitectónica lead**: NO big-bang, NO migration in-place, NO destructive rename. Coexistencia activa V1 + V2 mínimo 90 días post-cutover stable antes de evaluar cleanup V1. Cleanup V1 puede deferirse permanentemente si emerge cualquier doubt.

---

## 1. Contexto y motivación

### Bug class fuente (TASK-877 follow-up, 2026-05-16)

Sky Airline tuvo **3,168 tareas en 10 meses con `rpa = null` 100%** porque:
- La fórmula RpA vive en Notion como property formula editable
- Sin git history, sin tests, sin code review, sin observability
- El sync legacy `notion-bq-sync` perdía silenciosamente el value durante 10 meses
- Bug detectado solo cuando un operador reportó UI rota

Esto invalidó cualquier confianza en el path actual de compute RpA. Nómina Sky proyectada perdía bonus RpA silenciosamente todo ese período.

### Por qué strangler y no migration in-place

Una migration tradicional (modificar la fórmula Notion, o cambiar el sync legacy) tendría blast radius inmediato sobre el path bonus payroll productivo. Cualquier bug en la nueva fórmula → bonus mal calculado → pago incorrecto a colaboradores → escalación HR + legal.

Strangler resuelve esto:
- V1 sigue corriendo intacto durante toda la migración (path bonus seguro)
- V2 corre en paralelo con su propia infraestructura
- Comparación activa V1 vs V2 antes de cutover
- Cutover gradual per-tenant con feature flag
- Rollback <5 min si emerge problema post-cutover
- Coexistencia indefinida post-cutover (V1 disponible como fallback histórico)

Es exactamente lo que `greenhouse-ico` skill canoniza ("**Strangler migration mandate** — NO big-bang. Pilot Efeonce → Sky → otros progresivo. Backward compat 90+ días").

### Por qué AHORA y no esperar

- Cada día con fórmula Notion editable es deuda compuesta
- Pattern strangler V2 es la fundación de toda migración ICO futura (TASK-902 OTD, TASK-903 FTR, TASK-904 Cumplimiento heredan)
- Pero NO es urgente — strangler permite progress sin presión sobre bonus actual

---

## 2. Alternativas rechazadas

| Alternativa | Razón rechazo |
|---|---|
| **Migration in-place** (modificar fórmula Notion + sync legacy) | Blast radius inmediato a bonus payroll productivo |
| **Rip-and-replace** (eliminar V1 + reemplazar con V2 en single deploy) | Rollback imposible sin downtime; viola greenhouse-ico hard rule "backward compat 90+ días" |
| **Big-bang multi-tenant** (cutover Efeonce + Sky simultáneo) | Sin pilot validation period; greenhouse-ico hard rule "NUNCA flip global directo" |
| **Notion Worker para compute V2** | Workers Beta = liability path bonus; Sentry domain gap; documentación incompleta runtime limits |
| **External Agents API para compute V2** | Alpha waitlist + LLM-driven (no determinístico) — métrica crítica needs determinism canonical |
| **Compute en consumer downstream** (e.g. inline en ICO materializer) | Viola SSOT — RpA semantics tendrían que vivir cross-consumers |
| **Cleanup inmediato V1 post-cutover** | Sin ventana de rollback; viola greenhouse-ico 90+ días contrato; greenhouse-ico hard rule "NUNCA romper backward compatibility" |

---

## 3. La decisión canonical — V2 strangler shape

### 3.1 Naming convention canonical V2

| Asset | V1 actual (NO se toca) | V2 nuevo (paralelo) |
|---|---|---|
| Helper TS | (no existe — fórmula Notion) | `calculateRpaV2(inputs): Promise<RpaV2Result>` |
| Constante versión | implícito `'rpa_v1.0'` | `RPA_FORMULA_VERSION = 'rpa_v2.0'` |
| Notion property display | `RpA` (formula editable existente) | `[GH] RpA v2` (number, read-only Greenhouse) |
| BQ column | `ico_engine.metrics_by_member.rpa_avg` | `ico_engine.metrics_by_member.rpa_avg_v2` (NUEVA) |
| Reliability signal namespace | (V1 no tiene — sync legacy opaco) | `notion.metrics.<name>_v2` |
| Outbox events | (V1 no emite) | `notion.task.rpa_v2_recompute_requested v1`, `notion.task.rpa_v2_written v1` |
| Writeback log filter | (V1 no escribe) | `notion_metrics_writeback_log WHERE metric_name='rpa_v2'` |
| Cloud Tasks queue | (V1 no usa) | `notion-writeback-v2` (isolated rate budget) |
| Webhook endpoint | (V1 no captura events) | `/api/webhooks/notion-tasks` (reuse infra, emit V2 events) |
| Feature flags | (V1 sin flag — siempre on) | `NOTION_RPA_V2_COMPUTE_ENABLED`, `NOTION_RPA_V2_WRITEBACK_ENABLED`, `BONUS_USE_RPA_V2` |

**Decisión semántica explícita**: el sufijo `"v2"` queda visible para el operador. Cleanup V1 (post 90d+ stable) renombra `[GH] RpA v2 → [GH] RpA` final + drop legacy property `RpA`. Pero solo entonces.

### 3.2 Tabla canonical de coexistence (cada layer en paralelo)

| Layer | V1 (NO se toca) | V2 (paralelo) | Coexistence |
|---|---|---|---|
| **Source primario** | Notion property `Correcciones` rollup | `greenhouse_delivery.task_status_transitions` PG (TASK-908) | V2 desde día 1 |
| **Compute** | Notion formula engine | `calculateRpaV2(taskId)` helper canonical | Permanente durante shadow + cutover |
| **Sync path** | `notion-bq-sync` legacy → BQ raw | webhook → outbox → reactive consumer | Independiente |
| **BQ column** | `metrics_by_member.rpa_avg` | `metrics_by_member.rpa_avg_v2` (nueva) | Ambas pobladas mismo nightly materializer |
| **Writeback log** | (V1 no escribe) | `notion_metrics_writeback_log` con `metric_name='rpa_v2'` | Solo V2 |
| **Bonus calc** | `calculateRpaBonus(kpis.rpa_avg, ...)` | (mismo helper, sin cambio de signature) | V1 hasta cutover flag flip |
| **UI Notion operador** | Property `RpA` (la que ven hoy) | Property `[GH] RpA v2` (nueva al lado) | Ambas visibles durante shadow + cutover |
| **Reliability signals** | (V1 no tiene) | 7 signals `_v2` + 1 paridad cross-version | Solo V2 |

### 3.3 Bonus payroll isolation — el contrato canonical

```typescript
// src/lib/payroll/fetch-kpis-for-period.ts (Slice cutover Fase D)
const useRpaV2 = await isBonusUseRpaV2Enabled(tenantId)  // feature flag per-tenant

const rpaAvg = useRpaV2 ? row.rpa_avg_v2 : row.rpa_avg
// El resto del flow NO cambia — el helper calculateRpaBonus sigue igual
```

**Estados del flag `BONUS_USE_RPA_V2`**:

| Estado | Comportamiento bonus | Cuándo |
|---|---|---|
| `false` global (default V1 + V2 shadow) | Lee `rpa_avg` (V1) | Mientras V2 esté en shadow mode |
| `false` global + V2 writeback enabled | Lee `rpa_avg` (V1) | V2 escribiendo a Notion pero bonus sigue V1 |
| `true` per Efeonce only | Efeonce lee V2; Sky sigue V1 | Pilot tenant cutover gradual |
| `true` per Efeonce + Sky | Ambos leen V2 | Full cutover |
| `false` (rollback) | Vuelve a V1 todos los tenants | Si V2 emerge bug post-cutover |

**Garantía canonical**: el flag flip = una sola variable env + redeploy ops-worker (~5 min). Reversible inmediato. Bonus payroll runtime nunca queda en estado intermedio inconsistente.

---

## 4. Las 5 fases canonical

```
═══ FASE A — Build paralelo (V2 invisible al operador) ═══
  Build infra V2 completa. Sky/Efeonce/operador no ven nada nuevo.
  Bonus payroll sigue V1 100%.
  Duración: ~6-8 semanas
  Slices: S0 (foundation) + S1 (calculateRpaV2 helper) + S2 (webhook L1) + S3 (materializer extension)
  Gate de salida: rpa_avg_v2 poblado nightly por al menos 14 días + tests anti-regresión 100% verde

═══ FASE B — Shadow mode (V2 invisible Notion, comparación activa) ═══
  V2 compute corre en reactive consumer pero NO PATCH a Notion.
  Signal canonical paridad mide V1 vs V2 en cada per-member-month.
  Operador no ve nada nuevo. Bonus sigue V1.
  Duración: 7-14 días con paridad ≥95% sustained
  Slices: S4 (shadow consumer + paridad signal)
  Gate de salida: notion.metrics.rpa_v2_vs_v1_paridad ≥95% durante 7d consecutivos

═══ FASE C — Writeback V2 (Notion property visible, bonus sigue V1) ═══
  V2 escribe `[GH] RpA v2` en Notion.
  Operadores ven la nueva property al lado del RpA original.
  Pueden comparar visualmente, reportar discrepancias.
  Bonus sigue V1 100%.
  Duración: 14-30 días observation period
  Slices: S5 (Cloud Tasks queue + bulk writer) + S6 (Notion schema setup) + S7 (writeback flag flip) + S8 (nightly safety net)
  Gate de salida: signals steady 14d + zero dead-letter + zero operador feedback "está mal"

═══ FASE D — Bonus cutover (gradual per-tenant) ═══
  Flag BONUS_USE_RPA_V2=true per-tenant secuencial.
  Efeonce primero, observación 30 días + HR reconciliation, después Sky.
  V1 sigue corriendo en paralelo (no se toca).
  Duración: 60 días total (30d Efeonce + 30d Sky)
  Slices: S9 (Efeonce flag flip + HR reconciliation) + S10 (Sky flag flip + HR reconciliation)
  Gate de salida: bonus Efeonce + Sky reconciliados mes 1 post-flip + 0 disputes HR

═══ FASE E — Cleanup V1 (90+ días post-cutover stable, OPCIONAL) ═══
  Solo si Fase D verde + 90 días stable + 0 reliability alerts + HR sign-off escrito.
  Drop V1 column + delete formula Notion + rename V2 a canonical name.
  PUEDE DEFERIRSE PERMANENTEMENTE si emerge cualquier doubt.
  Duración: ~1 semana cleanup + 1 mes observación post-cleanup
  Slices: S11-S15 (drop column + rename + cleanup Notion property + ADR final + lint promote)
  Gate de salida: 30 días post-cleanup sin alerts + post-mortem documentado
```

**Timeline total realista**: 5-7 meses Fase A → Fase D verde. Cleanup Fase E opcional, decisión deferred hasta 6 meses post-D.

---

## 5. Signal canonical de paridad cross-version

**Por qué es crítico**: durante Fase B + C, la única forma de validar que V2 es correcto es comparando contra V1 (V1 es el ground truth operacional aunque sea frágil).

```typescript
// src/lib/reliability/queries/notion-metrics-rpa-v2-vs-v1-paridad.ts
export const getRpaV2VsV1Paridad = async (): Promise<ReliabilitySignal> => {
  const result = await bigQuery.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE ABS(rpa_avg - rpa_avg_v2) < 0.01) AS paridad_count,
      COUNT(*) FILTER (WHERE ABS(rpa_avg - rpa_avg_v2) >= 0.01) AS drift_count,
      AVG(ABS(rpa_avg - rpa_avg_v2)) AS avg_abs_diff,
      MAX(ABS(rpa_avg - rpa_avg_v2)) AS max_abs_diff
    FROM ico_engine.metrics_by_member
    WHERE rpa_avg IS NOT NULL
      AND rpa_avg_v2 IS NOT NULL
      AND period_year = EXTRACT(YEAR FROM CURRENT_DATE)
      AND period_month = EXTRACT(MONTH FROM CURRENT_DATE)
  `)

  const paridadPct = result.paridad_count / result.total

  return {
    signalId: 'notion.metrics.rpa_v2_vs_v1_paridad',
    severity: paridadPct >= 0.95 ? 'ok' : paridadPct >= 0.80 ? 'warning' : 'error',
    value: paridadPct,
    steadyState: '≥ 0.95',
    subsystemId: 'Integrations · Notion · Metrics',
    description: `V2 vs V1 paridad ${(paridadPct * 100).toFixed(1)}% (${result.drift_count} miembros divergen)`
  }
}
```

**Gate canonical pre-cutover bonus** (Fase D): este signal debe estar `ok` (≥95%) **durante 7 días consecutivos** antes de cualquier `BONUS_USE_RPA_V2=true` flag flip.

Si paridad < 95% sustained:
1. Investigar root cause — ¿bug en V2? ¿bug en V1 que V2 expone? ¿semantic gap legítimo?
2. Si V1 estaba mal y V2 corrige → documentar en ADR Delta + HR debate "¿bonus se ajusta retroactivo?"
3. Si V2 tiene bug → fix antes de avanzar slice
4. NO avanzar Fase D hasta resolver

---

## 6. Por qué V1 puede quedar para siempre

**Decisión canonical opt-in**: cleanup V1 (Fase E) **es opcional**. Greenhouse puede legítimamente mantener V1 + V2 coexistiendo permanentemente como defensive depth.

### Trade-off

| Aspecto | Cleanup V1 (Fase E ejecutada) | Mantener V1 permanente |
|---|---|---|
| Costo BQ steady-state | Ahorra ~30% compute en materializer | +30% compute permanente |
| Sync legacy `notion-bq-sync` | Puede deprecate | Sigue corriendo daily |
| Fórmula Notion `RpA` | Borrada en data sources | Permanece (operador puede ver) |
| Rollback ventana | Cerrada post-cleanup | Permanente — siempre puedes flip flag back |
| Audit cross-method | Solo post-mortem snapshots | Permanente cross-comparison disponible |
| Clarity model | Single source of truth canonical | Coexistence ambigua "¿cuál es el actual?" |

### Recomendación canonical

- **NO decidir cleanup V1 hasta Fase D + 6 meses sin incidente**
- Si emerge cualquier doubt (anomalía, reporte operador, HR disagreement) → diferir cleanup
- Si Fase D + 6 meses corre 100% verde + cero rollbacks + HR explícitamente firma OK → ejecutar Fase E
- Cleanup es **decisión separada**, no automática post-Fase D

---

## 7. 5-pillar ICO scoring (greenhouse-ico contract)

### Safety
- Defense in depth 7 capas (HMAC + echo-loop + allowlist + inbox dedup + hash dedupe + capability + audit log)
- 3 feature flags graduados (compute → writeback → bonus) — cada uno revertible independiente
- Bonus calc filtra `tenant_type='demo'` (TASK-910 — dual layer)
- Cutover bonus = una línea código gated por flag — reversible <5 min
- HR + Finance sign-off escrito + allowlist explícita pre-flip
- 8 stop-gates ADR migration aplicados per fase

### Robustness
- Helper `calculateRpaV2` pure + deterministic + idempotente
- Hash dedupe → idempotency cross-replay
- Re-fetch obligatorio (nunca confiar payload Notion)
- Honest degradation: `dataStatus='unavailable'` NUNCA falsea como `0` real
- V1 sigue corriendo intacto — failure de V2 nunca rompe bonus actual

### Resilience
- Cloud Tasks retry + dead letter automatic
- Nightly safety net Cloud Run Job atrapa at-most-once delivery losses
- Snapshot BQ pre-flip restorable <1h
- Rollback <5min (env var flip + redeploy Cloud Run)
- 3 kill switches independientes (compute / writeback / bonus flag)
- V1 permanece como permanent fallback durante toda la migración + 90+ días post

### Scalability
- Rate limit Notion 3 req/sec → Cloud Tasks 2.5 req/sec (15% safety margin)
- BQ aggregation lineal — adequate Sky scale
- Multi-tenant native — agregar tenant = config + secret, no refactor
- Pattern strangler reusable por TASK-902 (OTD) / TASK-903 (FTR) / TASK-904 (Cumplimiento) sin redesign
- Forward-compat Frame.io signals (V3+) — extensión `TaskInputsForRpa` sin breaking change

### Auditability ⭐ (ICO-specific)
- Cada KPI V2 reproducible desde `task_status_transitions` (immutable) + `notion_metrics_writeback_log` (append-only) + snapshot BQ
- `RpaV2Result.evidenceTransitionIds` permite re-construir cálculo exacto post-hoc
- Cross-version comparison V1 vs V2 permanente durante migration (audit-ready)
- `formula_version` bump → historia preservada per version
- HR puede reproducir bonus de cualquier período histórico re-corriendo `calculateRpaV2`

---

## 8. Dependencies & impact

### Depends on (hard prerequisites)

- **TASK-908 Slices 0-3.5 SHIPPED** — `task_status_transitions` table + `countCorrectionTransitions` helper. Sin esto, `calculateRpaV2` retorna `unavailable` para todo.
- **TASK-910 verde 4 semanas runtime demo** — gate canonical pre-Fase B (ADR migration strategy stop-gate #3.2).
- Outbox publisher canonical (TASK-773) — Cloud Scheduler + ops-worker.
- ops-worker reactive consumer infra (TASK-771 pattern).
- Sentry domain `integrations.notion` registered (TASK-844 cross-runtime).
- GCP Secret Manager: `notion-integration-token-greenhouse-metrics` + per-tenant signing secrets.

### Blocks / impacts downstream

- **TASK-902 (OTD writeback strangler V2)** — reusa este ADR pattern verbatim.
- **TASK-903 (FTR writeback strangler V2)** — delega a `calculateRpaV2` (FTR = pass si RpA === 0).
- **TASK-904 (Cumplimiento strangler V2)** — mismo pattern.
- **Bonus calculation** `calculateRpaBonus` (existente) — NO cambia signature; solo cambia fuente del input via flag.
- **Person 360 + Pulse + ICO scorecards** — NO cambian (siguen leyendo `metrics_by_member`).

### Files owned

- `src/lib/notion-metrics/calculate-rpa-v2.ts` + tests (mirror pattern del `calculate-rpa.ts` planeado V1 original)
- `src/lib/notion-metrics/types.ts`
- `src/lib/notion-metrics/config.ts` (INPUT_PROPS_ALLOWLIST)
- `src/lib/webhooks/handlers/notion-tasks.ts` + tests
- `src/app/api/webhooks/notion-tasks/route.ts`
- `src/lib/sync/projections/notion-status-transition-capture.ts` (L1)
- `src/lib/sync/projections/notion-metrics-writeback-v2.ts` (L4)
- `services/ops-worker/server.ts` (+ endpoint `/notion-metrics/single-writeback-v2`)
- `services/notion-metrics-writeback-job/` (nightly Cloud Run Job, L5)
- 8 reliability signal readers (`notion.metrics.*_v2` + `rpa_v2_vs_v1_paridad`)
- Migrations: `<timestamp>_metrics_by_member_add_rpa_avg_v2.sql` + `<timestamp>_notion-metrics-writeback-foundation.sql`

---

## 9. Hard rules canonical (anti-regresión)

1. **NUNCA** modificar V1 path durante Fases A–D — formula Notion `RpA`, sync legacy, materializer column `rpa_avg`, bonus calc reading V1 — TODO intacto.
2. **NUNCA** flip `BONUS_USE_RPA_V2=true` sin 7d signal `rpa_v2_vs_v1_paridad` ≥95% steady + HR/Finance sign-off escrito + allowlist tenant explícita.
3. **NUNCA** decidir cleanup V1 pre Fase D + 6 meses sin doubt.
4. **NUNCA** romper paridad signal cross-version — si emerge drift, investigar antes de avanzar slice.
5. **NUNCA** flipear flag a `true` simultáneo en >1 tenant — Efeonce primero, observación 30d, después Sky.
6. **SIEMPRE** que operador reporta "[GH] RpA v2 = X está mal", tratar como signal de drift legítimo → investigar antes de defender V2.
7. **SIEMPRE** que un tenant pase a `BONUS_USE_RPA_V2=true`, run HR reconciliation manual del primer mes post-flip antes de extender a otros tenants.
8. **SIEMPRE** snapshot BQ pre-flip + restorable <1h verified antes de cualquier Fase D slice.
9. **SIEMPRE** preservar formula Notion `RpA` legacy mínimo 90 días post-Fase D stable.
10. **SIEMPRE** que emerja métrica nueva strangler (TASK-902 OTD V2, etc.), reusar este ADR pattern verbatim — NO inventar variantes.

---

## 10. Open questions deliberadamente NO decididas

### 10.1 Ventana de cómputo per-task (lifetime vs period-scoped)
- **Default V1**: lifetime — RpA es atributo intrínseco de la task, no del mes
- **Confirma con HR antes de flip Fase D**

### 10.2 Tareas que cruzan meses
- **Default V1**: mes de `completed_at` (coherente con OTD)
- **Audit pre-flip si emerge edge cases**

### 10.3 Re-asignación mid-task
- **Default V1**: owner final (snapshot al `completed_at`) — coherente con materializer actual

### 10.4 Backfill histórico Sky (3,200 tareas pre-TASK-908 deploy)
- **Default V1**: forward-only — Sky tasks pre-deploy aparecen como `dataStatus='unavailable'` en V2
- **Implicación**: durante shadow + cutover, paridad V1 vs V2 solo aplica a tasks completadas post-deploy. Tasks históricas quedan solo V1.
- **Alternativa V1.1**: backfill best-effort opt-in si HR pide audit cross-version histórico

### 10.5 ¿Cleanup V1 alguna vez?
- **Default V1**: NO — diferir indefinidamente. V1 permanente como defensive depth.
- **Trigger para revisitar**: 6 meses Fase D verde sin incidente + HR explícitamente firma cleanup OK
- **Si NO cleanup**: costo +30% BQ compute permanente. Justificable como insurance.

### 10.6 ¿Bonus impact assessment formal pre-Fase D?
- RpA YA es input bonus desde TASK-758 era. Migration NO cambia fórmula bonus — solo cambia origen del input.
- **Decisión canonical**: HR sign-off informal escrito + ADR Delta — NO requiere re-firma formal porque semantics no cambian.

### 10.7 ¿Workers Notion para algún layer post Beta GA?
- V1 Cloud Run gana en todos los layers (Sentry integration nativa, multi-target writes, observability)
- **Trigger para revisitar**: Workers GA + Sentry integration + cost analysis
- **No bloquea Fase A-E V1**

---

## 11. Next review trigger

| Evento | Acción |
|---|---|
| TASK-908 Slices 0-3.5 SHIPPED | Activar Fase A S1 |
| TASK-910 demo 4 semanas runtime verde | Activar Fase B |
| Fase B signal paridad ≥95% sustained 7d | Activar Fase C |
| Fase C operación 14d verde + zero dead-letter | Activar Fase D Efeonce |
| Fase D Efeonce 30d verde + HR reconciliation OK | Activar Fase D Sky |
| Fase D Sky 30d verde + HR reconciliation OK | Evaluar Fase E (probable: deferir) |
| Workers Notion → GA | Revisitar §10.7 |
| Frame.io integration ship | Bumpear RPA_FORMULA_VERSION → `rpa_v3.0` con extended inputs |

---

## 12. Cross-refs canonical

- **ADRs predecesores**:
  - `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — boundary canonical Notion vs Greenhouse
  - `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` — 8 stop-gates + strangler mandate
  - `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md` — spec V1 pattern
  - `GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md` — flujo bonus consumer

- **Metric specs**:
  - `docs/architecture/metrics/RPA_V1.md` — spec canonical de la métrica
  - `docs/architecture/metrics/FTR_V1.md` — delega a calculateRpa (TASK-909 cuando llegue)

- **Tasks implementación**:
  - `docs/tasks/to-do/TASK-901-canonical-notion-metric-compute-v1-rpa.md` — implementation owner V2 strangler
  - `docs/tasks/to-do/TASK-908-ico-status-transition-tracking-canonical-cycle-time.md` — foundation prerequisito
  - `docs/tasks/to-do/TASK-910-notion-demo-teamspace-migration-sandbox.md` — gate canonical pre-Fase B

- **Skills canonical**:
  - `~/.claude/skills/arch-architect/` — 4-pillar framework + strangler pattern reference
  - `~/.claude/skills/greenhouse-ico/` — 5-pillar ICO + migration playbook
  - `~/.claude/skills/notion-platform/` — Notion API + Developer Platform 2026

- **Code references** (TBD post-Fase A ship):
  - `src/lib/notion-metrics/calculate-rpa-v2.ts`
  - `src/lib/reliability/queries/notion-metrics-rpa-v2-vs-v1-paridad.ts`

- **Pattern fuente**:
  - Martin Fowler 2004 — "Strangler Fig Application" (canonical reference)
  - Greenhouse internal precedent: TASK-758 era bonus computation strangler (similar pattern)

---

## 13. Pattern reusable por futuras métricas ICO

Este ADR establece el **template canonical** para migración progresiva de cualquier métrica ICO desde Notion formula → Greenhouse canonical:

```
TASK-901 (RpA V2 strangler) ← este ADR
  ↓ pattern verbatim
TASK-902 (OTD V2 strangler) — futura, mismo pattern
  ↓ pattern verbatim
TASK-903 (FTR V2 strangler) — futura, delega a calculateRpaV2
  ↓ pattern verbatim
TASK-904 (Cumplimiento V2 strangler) — futura, mismo pattern
  ↓ pattern verbatim
TASK-905+ (Cycle Time, Throughput, Pipeline Velocity, etc.) — futuras, mismo pattern
```

Cada métrica nueva:
- Hereda naming convention V2 + sufijo `_v2`
- Hereda Fases A-E con ajustes específicos del shape de la métrica
- Hereda 5-pillar ICO scoring + 9 hard rules anti-regresión
- Hereda decisión de cleanup deferred indefinidamente como default

**El ADR único cubre todas las migraciones progresivas ICO de Notion → Greenhouse**. Cada task individual referencia esta ADR + agrega specifics propios de su métrica.

---

## 14. Aprobación y registro

- **Decisión canonical aprobada**: 2026-05-17 por CEO Greenhouse (Julio Reyes Rangel)
- **Skills invocadas pre-decisión**: `arch-architect` (Greenhouse overlay) + `greenhouse-ico` + `notion-platform`
- **Frameworks aplicados**: 4-pillar arch + 5-pillar ICO + 5-pillar notion-platform + strangler fig pattern + investigation protocol + boundary check
- **Registrado en**: `docs/architecture/DECISIONS_INDEX.md` entry #68
- **Próxima revisión**: cuando TASK-908 + TASK-910 prerequisitos cierren — activar Fase A

---

**End of ADR**
