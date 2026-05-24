# GREENHOUSE_ATTRIBUTABLE_LATENESS_V1 — Atraso imputable + Trazabilidad de reprogramación

| Campo | Valor |
|---|---|
| Status | Accepted (modelo; implementación por tasks derivadas) |
| Created | 2026-05-23 por sesión deep-dive OTD/freeze + skills ICO + arquitectura + Notion |
| Owner domain | `delivery \| ico \| integrations \| payroll \| reliability` |
| Scope | Cómputo de atraso (lateness) de tareas de delivery, su efecto en OTD%/bono, y la trazabilidad de reprogramaciones |
| Supersede | El freeze/thaw a medio construir en fórmulas Notion (`Días de retraso`, `frozenDays`/`elYp` roto) — ver ISSUE-081 |
| Cross-refs | ISSUE-081 · OTD_V1 · CYCLE_TIME_V1 · CT_SLO_PCT_V1 · CUMPLIMIENTO_V1 · TASK-908 · TASK-912 · GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1 · GREENHOUSE_METRIC_SPEC_PATTERN_V1 · GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1 · GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1 |

---

## 1. Contexto / problema

Hoy "días de retraso" (y la clasificación OTD que de él deriva) **cuenta tiempo que no es imputable a la agencia**: cuando una tarea espera al cliente (`Listo para revisión`), está `Bloqueado`, o está `En pausa`, el reloj sigue corriendo. Como ese atraso alimenta `otd_pct → calculateOtdBonus`, **el bono penaliza al colaborador por demoras ajenas**. Está activo en producción (ISSUE-081).

Causa estructural: las fórmulas Notion son **stateless** — no recuerdan el historial de transiciones. El intento de freeze/thaw en Notion depende de campos manuales de un solo casillero + un acumulador (`elYp`) que **fue borrado** → `frozenDays` siempre 0 → el descuento nunca ocurre. Y `Bloqueado`/`En pausa` nunca se congelaron (devuelven 0 y rebotan). Detalle completo: ISSUE-081.

En paralelo existe un mecanismo de **reprogramación** (mover la fecha límite, guardar la original, contar `Días reprogramados`) que el operador usa para trazabilidad y mejora continua. Hoy es una resta-foto (vigente − original) sin historial, sin conteo de movidas y, sobre todo, **sin motivo**.

## 2. Decisión

**Modelar dos conceptos canónicos separados, cada uno con su propia fuente de eventos append-only, que NUNCA se fusionan en un solo número:**

1. **Atraso imputable** — días tarde vs la *fecha justa*, con el reloj **congelado** durante estados no imputables (`Listo para revisión`, `Bloqueado`, `En pausa`), multi-ciclo. Alimenta OTD% → bono.
2. **Trazabilidad de reprogramación** — historial de cambios de `due_date`: cuántas veces, cuándo, de→a, y **por qué**. Alimenta retro/mejora/severidad y define la *fecha justa*.

**La bisagra**: el **motivo** de cada reprogramación decide contra qué fecha se mide el atraso (cliente→fecha nueva; interno→fecha original).

### Alternativas rechazadas

- *Reconectar `elYp` / arreglar la fórmula Notion* — no resuelve multi-ciclo, ni `Bloqueado`/`En pausa`, ni el motivo, ni la doble fuente BQ. Tapa el agujero.
- *Un solo número que incluya freeze + reprogramación* — mezcla dimensiones ortogonales (anti-patrón lumping).
- *Computar en fórmulas Notion* — viola el boundary canónico (Notion = OS / Greenhouse = motor); Notion stateless ya demostró que no puede.
- *Workers de Notion para el compute* — Beta, pricing inestable, prohibido para path de bono (notion-platform hard rule #8).

## 3. Las dos fuentes de eventos

### 3.1 `task_status_transitions` — REUSA (TASK-908)
Captura cada cambio de estado con timestamp, append-only, multi-ciclo. Provee los intervalos en `{Listo para revisión, Bloqueado, En pausa}` para el freeze. No se crea nada nuevo — primitiva canónica existente. **Canonical primitive vs new: reuse.**

### 3.2 `task_due_date_changes` — NUEVO (sibling de TASK-912)
Log append-only de cambios de `due_date`. Mismo patrón de captura: webhook `page.properties_updated` filtrado por `Fecha límite` → re-fetch (nunca confiar el payload) → HMAC → echo-loop filter → persist. Campos:

```
task_source_id, workspace_id, changed_at,
previous_due_date, new_due_date, days_delta (derivado),
status_at_change,            -- estado al momento del cambio (insumo de inferencia de motivo)
reason_code,                 -- enum CHECK: client_requested | scope_change |
                             --             external_blocker | internal_not_prioritized | other
reason_source,               -- inferred | operator_confirmed
source_event_id (UNIQUE partial — idempotencia)
```

Reemplaza el casillero único `Fecha límite original` + `Días reprogramados`:
- fecha original = `previous_due_date` del primer evento; nº reprogramaciones = count; desplazamiento neto = vigente − original; **historial por movida** = los eventos.

Triggers anti-UPDATE/anti-DELETE (append-only). CHECK enum cerrado en `reason_code` y `reason_source`.

## 4. Atraso imputable — definición canónica

```
fecha_justa = fecha_original
            + Σ days_delta de reprogramaciones FORWARD con reason ∈ {client_requested, scope_change}

atraso_imputable = max(0,
      días_calendario(fin, fecha_justa)
    − tiempo en {Listo para revisión, Bloqueado, En pausa} posterior a fecha_justa)

  fin = completed_at  (o now() si abierta)
```

Mismo algoritmo de resta de intervalos que `calculateCycleTime` (CYCLE_TIME_V1 §4.1), con tres diferencias canónicas:
1. el reloj arranca en la **fecha (deadline)**, no en "En curso";
2. set de exclusión = los **3 estados de freeze** (Cycle Time solo excluye `Bloqueado`);
3. solo cuenta intervalos **posteriores** a la fecha justa.

> **Distinción canónica vs Cycle Time**: el tiempo en revisión del cliente se **EXCLUYE** del atraso (no penalizar a la agencia) pero se **INCLUYE** en Cycle Time (calendario real). `En pausa` se excluye del atraso pero NO de Cycle Time. Documentar siempre para no confundir los sets.

## 5. Anti-doble-descuento — partición disjunta de motivos

| Motivo de reprogramación | ¿Extiende `fecha_justa`? | ¿Lo maneja el freeze? |
|---|---|---|
| `client_requested` / `scope_change` | **Sí** (mueve la promesa) | No |
| `external_blocker` | No | Sí (estado `Bloqueado`) |
| (espera de revisión) | No | Sí (estado `Listo para revisión`) |
| (pausa) | No | Sí (estado `En pausa`) |
| `internal_not_prioritized` | No (slip de agencia) | No |

**Invariante**: las razones que extienden `fecha_justa` (cliente/scope) son **disjuntas** de los estados que congela el freeze. Por construcción, ningún wall-clock interval se cuenta en ambos. Reprogramar citando un bloqueo es higiene operativa pero **no cambia la atribución** — el freeze ya lo maneja.

## 6. Motivo: inferido + confirmado

- Greenhouse **infiere** el motivo desde `status_at_change` + transiciones recientes (¿estaba Bloqueado? ¿venía de Cambios solicitados? ¿llevaba rato En pausa/Sin empezar?).
- El operador **confirma o corrige** en Notion (select `Motivo de reprogramación`).
- **Para el bono solo se usa el motivo confirmado** (cambia contra qué fecha mide). Sin confirmar → default conservador + reliability signal `reschedules_pending_reason`. Honest degradation, nunca inventar.

## 7. OTD bucket reason-aware → bono

Recalcular los 4 buckets usando `fecha_justa` + freeze: `on_time` (atraso=0), `late_drop` (cerrada, atraso>0), `overdue` (abierta, pasó fecha_justa neto de freeze), `carry_over` (abierta, dentro de fecha_justa). Computado en Greenhouse (VIEW canónica + helper `calculateAttributableLateness`), feed a `otd_pct → calculateOtdBonus`, writeback a Notion. **No es input nuevo al bono — es corrección del existente** → estrangulador + sign-off HR.

## 8. Severidad (retro/management, NO bono)

Tiers ordinales transparentes (no score caja-negra), derivados de los dos logs:

| Tier | Patrón |
|---|---|
| 🟢 | a tiempo, sin reprogramar |
| 🟠 | reprogramada (cliente/scope) y a tiempo vs fecha justa, o slip chico |
| 🔴 | tarde vs original sin reprogramar, o reprogramada interna pero llegó |
| 🔴🔴 | reprogramada interna y aún tarde (te diste plazo y fallaste) |

Dimensiones acompañantes: nº reprogramaciones, desplazamiento total, mix de motivos. Fuera del bono — el bono ya se autorregula vía la regla motivo→fecha (no se castiga dos veces).

## 9. Naming (3 capas)

| Capa | Convención |
|---|---|
| Interno (PG/BQ/código) | explícito: `attributable_days_late`, `task_due_date_changes`, `fair_deadline`, `reschedule_reason` |
| Notion (visible al usuario) | **amigable, sin prefijo**: `Días de retraso`, `Días reprogramados`, `Reprogramaciones`, `Motivo de reprogramación` |
| Señal read-only | vía **permiso Notion + descripción**, no por el nombre; `[GH]` solo transitorio durante shadow |

Convención a canonizar para todas las propiedades `[GH] *` (ADR chico aparte — follow-up).

## 10. Boundary canónico (Notion = OS / Greenhouse = motor)

- **Notion captura**: cambios de estado, cambios de `due_date`, motivo confirmado por operador.
- **Greenhouse computa**: atraso imputable, fecha justa, buckets, severidad.
- **Greenhouse devuelve**: propiedades read-only (amigables) vía writeback. Cero compute en fórmulas Notion.

## 11. Scoring 5-pillar (ICO) + 4-pillar (arquitectura)

| Pilar | Veredicto |
|---|---|
| **Safety** | Toca el bono → estrangulador + shadow ≥30d + 8 stop-gates + sign-off HR. Motivo confirmado (no inferido) para decisiones que afectan plata. |
| **Robustness** | Multi-ciclo por event logs; invariante anti-doble-descuento por partición disjunta; degradación honesta (motivo unknown → conservador + signal). |
| **Resilience** | Feature-flag por fase; rollback <5min; fórmulas Notion legacy 90d en paralelo; reliability signals (shadow parity, reschedules pending reason, freeze/reschedule overlap). |
| **Scalability** | Event logs escalan; mismo patrón ya probado (TASK-908/912); soporta N tenants. |
| **Auditability** ⭐ | Cada valor de atraso reproducible desde los dos logs + motivo; snapshot por período. |

## 12. Migración (estrangulador — toca el bono)

1. **Foundation**: captura `task_due_date_changes` + inferencia de motivo + propiedad `Motivo de reprogramación` (sibling TASK-912). Backfill best-effort de la fecha original desde `Fecha límite original` existente.
2. **Compute en shadow**: `calculateAttributableLateness` + VIEW + bucket reason-aware, **shadow mode** (log + paridad vs `otd_pct` actual), reliability signal `shadow_paridad_otd_attributable`. Sin tocar el bono.
3. **Writeback** de las propiedades amigables a Notion (aún shadow para el bono).
4. **Cutover del OTD-bono** → fuente corregida. Requiere los 8 stop-gates + sign-off HR + ≥30d shadow verde + umbral de calidad de datos de motivo.
5. Backward compat 90d: fórmulas Notion legacy en paralelo.

## 13. Hard rules (anti-regresión)

- **NUNCA** fusionar atraso imputable y reprogramación en un solo número.
- **NUNCA** extender `fecha_justa` por motivos que ya maneja el freeze (Bloqueado/revisión/pausa) — doble descuento.
- **NUNCA** usar motivo inferido (sin confirmar) para una decisión que afecta el bono.
- **NUNCA** computar en fórmulas Notion — Greenhouse motor, Notion OS.
- **NUNCA** flipear la fuente del OTD-bono sin los 8 stop-gates + sign-off HR + shadow verde.
- **NUNCA** confiar el payload del webhook — siempre re-fetch.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'integrations.notion' | 'delivery', ...)`.
- **SIEMPRE** `task_due_date_changes` append-only (anti-UPDATE/DELETE).
- **SIEMPRE** degradación honesta: sin datos → `unavailable`, nunca 0 silencioso.
- **SIEMPRE** documentar que el set de exclusión del atraso difiere del de Cycle Time.

## 14. Open questions (defaults V1 + lo que sigue abierto)

1. **`En pausa` incondicional**: V1 congela siempre (decisión del operador), + reliability/retro signal "tiempo significativo En pausa por motivo interno" como contrapeso honesto. Re-evaluar si emerge abuso.
2. **Histórico sin motivo** (reprogramaciones pre-captura): default `legacy_unknown` → medido vs **vigente** (no castigar retroactivo). Confirmar.
3. **¿Severidad llega a CVR/scorecard cliente** o es solo retro interno V1? → V1 solo retro interno; CVR es follow-up.
4. ~~**Sky**: verificar fórmulas Sky.~~ **RESUELTA 2026-05-23**: el modelo es **estándar y tenant-agnóstico por diseño** — el compute vive en Greenhouse (no en fórmulas Notion per-tenant) y aplica idéntico a cada teamspace (Efeonce, Sky, futuros). No se requiere verificar ni replicar fórmulas Notion per-tenant; el estado canónico de status + el log de `due_date` son los mismos para todos. Cualquier teamspace nuevo lo hereda sin trabajo adicional.
5. **`days_late` a nivel PROYECTO** (detectado 2026-05-23 en review de surfaces): el home "Proyectos atrasados" ([load-at-risk-watchlist.ts](../../src/lib/home/loaders/load-at-risk-watchlist.ts)) y project detail leen `greenhouse_delivery.projects.days_late` crudo (rollup project-level desde fórmula Notion, sin freeze) — camino aparte del bucket per-task. ¿Se recomputa como rollup del atraso imputable de sus tareas, o queda crudo? El modelo V1 cubre atraso **por tarea**; el rollup de proyecto es decisión a cerrar (probable follow-up task).
6. **Inconsistencia enum vs counts de `carry_over`** (detectado 2026-05-23): los counts agregados (`carry_over_count` en `metrics_by_*`, flags `is_carry_over` en `v_tasks_enriched`) SÍ trackean carry_over y se superficiean en Person 360 + Account 360, pero el enum per-task `performance_indicator_code` no lo maneja limpio (gap heredado de `OTD_V1` §12). TASK-922 debe **unificar** el bucket per-task con los counts agregados (un solo clasificador reason-aware que produzca los 4 buckets consistentes en ambas capas).

> **Nota de review de surfaces (2026-05-23)**: toda la familia OTD que hoy ve el portal (Person 360, Account 360, Agency, Space, SLA, Nexa, home at-risk) se computa **sin freeze** desde `v_tasks_enriched` (`delivery_signal` raw + `performance_indicator_code` synced de la fórmula Notion rota). Como todas leen agregados materializados, **corregir el compute en `v_tasks_enriched`/materializador corrige todas las surfaces de una sola vez** (single point of correction, patrón VIEW canónica + helper). Excepción: el `days_late` project-level (open question 5) es un camino separado.

## 15. Roadmap por tasks derivadas

Secuencia canónica de 4 movimientos independientes (detalle en §16):

- **TASK-923 (M1)** — Greenhouse pasa a ser el **clasificador autoritativo del bucket OTD**, en modo **paridad** (replica la semántica cruda actual, sin freeze) escrito a la columna nueva `gh_otd_bucket`, **shadow**. Legacy intacto, bono intacto. **Independiente — puede ir primero** (solo necesita `completed_at`/`due_date`/`status`, que ya existen). Cero impacto en nómina.
- **TASK-921 (M0)** — Captura `task_due_date_changes` + inferencia de motivo + propiedad Notion `Motivo de reprogramación` (foundation, sibling TASK-912).
- **TASK-922 (M2)** — Helper `calculateAttributableLateness` (freeze + reason-aware) sobre el clasificador **ya GH-owned por TASK-923**; escribe el bucket corregido en `gh_otd_bucket`, **shadow** + reliability signals. **Depende de TASK-923 + TASK-921.**
- **Cutover del OTD-bono (M3, futura gateada)** — flip de la fuente de `otd_pct` → columna GH reason-aware. **Único movimiento que toca el bono.** Requiere ≥30d shadow + 8 stop-gates + sign-off HR. **No puede ocurrir dentro de los 7 días de la próxima nómina.**
- **Follow-ups (no creados aún — strangler)**:
  - Spec de métrica nueva `ATTRIBUTABLE_LATENESS_V1.md` + Delta a `OTD_V1.md` (bucket reason-aware) — owner: TASK-922.
  - **Spec nueva de trazabilidad de reprogramación** (Días reprogramados + motivo, event-log-backed) — owner: derivar de TASK-921 al cerrar (gap detectado 2026-05-23, ver §17).
  - **Spec/sección nueva de severidad** (tiers 🟢/🟠/🔴/🔴🔴) — owner: task de superficies retro (futura, gap detectado 2026-05-23, ver §17).
  - Delta a `CUMPLIMIENTO_V1.md` (hereda OTD% reason-aware) — owner: TASK-922.
  - ADR chico de convención de naming `[GH]`.
  - Rollup `days_late` project-level (open question 5).
- Cierra/contribuye a **ISSUE-081**.

## 17. Esto redefine la familia OTD — gobernanza de specs

> **Declaración canónica (2026-05-23)**: este ADR **no es un fix puntual de "días de retraso"** — es una **redefinición de la familia de métricas OTD**. No cambia los nombres de las métricas, pero sí (a) **cómo se computan** varias (bucket assignments con freeze + clasificador GH-owned), (b) agrega **dimensiones nuevas** (motivo de reprogramación, severidad, atraso imputable). La familia **velocidad** (Cycle Time, CT SLO%, Throughput, Pipeline Velocity) **NO se toca** — blast radius acotado a OTD + reprogramación.

**La redefinición es en papel + shadow hasta M3** (§16): en producción las métricas conservan su definición actual hasta el cutover gateado. La familia "se redefine" en specs y en la columna shadow `gh_otd_bucket`, no en lo que el bono lee hoy.

### 17.1 Tratamiento de specs por métrica (canon ICO: "1 métrica = 1 spec", "NUNCA modificar V1 retroactivo — Delta/V2 append-only", "spec canonical first")

| Métrica | ¿Redefinida? | Tratamiento de spec | Owner |
|---|---|---|---|
| Los 4 buckets (on_time/late_drop/overdue/carry_over) | Sí (clasificador GH + freeze + unifica enum/counts) | Delta a `OTD_V1.md` | TASK-922 |
| OTD% (`otd_pct`) | Sí (semántica — valores cambian) | Delta a `OTD_V1.md` | TASK-922 |
| Días de retraso (`days_late`) | Sí (concepto nuevo: imputable) | **nuevo** `ATTRIBUTABLE_LATENESS_V1.md` | TASK-922 |
| OCF (overdue_carried_forward) | Sí (derivado de overdue) | Delta a `OTD_V1.md` | TASK-922 |
| Cumplimiento | Sí (alias de OTD%) | Delta a `CUMPLIMIENTO_V1.md` (cross-ref) | TASK-922 |
| Días reprogramados / Reprogramada | Sí (snapshot → event-log historial) | **nuevo** spec trazabilidad de reprogramación | TASK-921 (derivar al cerrar) |
| Motivo de reprogramación | Nuevo (dimensión) | parte del spec de reprogramación | TASK-921 |
| Severidad (tiers) | Nueva | **nuevo** spec/sección de severidad | task superficies retro (futura) |
| Cycle Time / CT SLO% / Throughput / Pipeline Velocity | **No** | sin cambio | — |

### 17.2 Regla de gobernanza

Ninguna métrica de la familia OTD puede cambiar su **cómputo** (M2/M3) sin que su **spec** refleje la redefinición **primero** (Delta append-only o V2 bump). El cómputo y la spec se mueven juntos, o la spec gana. Las métricas con Delta a `OTD_V1.md` se agrupan en un solo Delta append-only fechado, no en ediciones retroactivas dispersas.

## 16. Movimiento del clasificador OTD (Notion → Greenhouse) — descomposición canónica

> **Decisión disparadora (2026-05-23)**: review de surfaces reveló que **el clasificador del bucket OTD vive en Notion** (`Indicador de Performance` formula → synced como `performance_indicator_code`; Greenhouse solo lo cuenta vía `normalizePerformanceIndicatorCode`, NO recomputa). Es un boundary violation (clasificador crítico que alimenta el bono en una fórmula Notion). No se puede aplicar freeze sin que Greenhouse **recompute** el bucket → mover el clasificador es **prerequisito** del fix, no un extra.

### 16.1 Garantía de nómina (constraint duro)

La próxima nómina corre **100% sobre legacy por construcción**: el bono lee `otd_pct` derivado del `performance_indicator_code` synced de Notion. Los movimientos M0/M1/M2 escriben **solo en una columna nueva** (`gh_otd_bucket`) que el bono NO lee → matemáticamente no pueden alterar `otd_pct`. El único movimiento que toca el bono (M3) es gateado (≥30d shadow + sign-off HR) y no puede ocurrir en 7 días.

### 16.2 Los 4 movimientos (cada uno con su flag)

| Mov | Qué hace | ¿Cambia números? | ¿Toca bono? | Depende de |
|---|---|---|---|---|
| **M0** captura (TASK-921) | eventos `due_date` + transiciones | no | no | TASK-912 |
| **M1** ownership PARIDAD (TASK-923) | GH computa bucket replicando semántica cruda actual → columna `gh_otd_bucket` shadow | **no** (idéntico) | **no** | nada (puede ir primero) |
| **M2** freeze/imputable (TASK-922) | freeze + reason-aware sobre clasificador GH-owned → mismo `gh_otd_bucket` | sí (en shadow) | **no** | M1 + M0 |
| **M3** cutover bono (futura gateada) | flip fuente `otd_pct` → columna GH | sí | **SÍ** | M2 + ≥30d shadow + HR |

**Por qué M1 separado de M2**: M1 prueba el movimiento Notion→Greenhouse con **cero cambios de número** (de-risk del plumbing). M2 aísla el cambio semántico (freeze) medible. Dos puertas reversibles chicas en vez de una irreversible grande.

### 16.3 Dual-column coexistence (mecanismo de seguridad)

- `performance_indicator_code` (legacy, synced de Notion) → **el bono lee esta hasta M3**.
- `gh_otd_bucket` (nueva, GH-computed en `v_tasks_enriched`) → **shadow only hasta M3**.
- Reliability signal `notion.metrics.shadow_paridad_otd_classifier`: M1 target ~100% paridad; M2 divergencia esperada (freeze) medida + revisada, no es falla.
- Rollback de cualquier movimiento = el bono sigue leyendo la columna legacy. Trivial.

### 16.4 Dónde vive el clasificador (primitiva canónica)

- **Un helper TS canónico** `classifyOtdBucket(inputs)` (pure) con modo **freeze-aware togglable**: M1 = freeze off (paridad), M2 = freeze on. Un solo helper, no dos.
- **Mirror BQ** como expresión `gh_otd_bucket` en `v_tasks_enriched` (computada GH-side, NO synced) + **test de paridad TS↔SQL** (mismo patrón `cycle_time_days`/`calculateCycleTime`).
- Satisface boundary (Notion = OS / Greenhouse = motor) + patrón VIEW canónica + helper + signal.

### 16.5 Paridad en M1 (preciso)

GH classifier V1 replica la semántica **efectiva actual**: `on_time`/`late_drop` por `completed_at vs due_date` crudo (≈ lo que Notion produce hoy con `frozenDays=0`); `overdue`/`carry_over` por `now vs due_date` crudo. El gating `esMesActual` de la fórmula Notion **se replica en M1** (para paridad) y **se elimina en M2** (el filtro de período del registry ya hace el scoping; el gating por mes calendario es redundante).

### 16.6 Hard rules del movimiento

- **NUNCA** M1 cambia un número que el bono ve — columna `gh_otd_bucket` exclusivamente.
- **NUNCA** el bono lee `gh_otd_bucket` antes de M3 (gateado).
- **NUNCA** ningún movimiento dentro de los 7 días de nómina toca `otd_pct`.
- El helper TS es source of truth; la expresión BQ lo espeja con test de paridad.
- La fórmula Notion `Indicador de Performance` queda como display legacy hasta ≥90d post-cutover.

### 16.7 Delta 2026-05-24 — M1 SHIPPED (TASK-923)

M1 cerró en `develop` (directo, sin branch, override operador). Estado por slice:

- **Helper canónico** `classifyOtdBucket(inputs)` + `buildOtdBucketSql()` en `src/lib/notion-metrics/classify-otd-bucket.ts` (+ `otd-bucket-types.ts`, `OTD_BUCKET_FORMULA_VERSION='otd_bucket_v1.0'`). Modo freeze-off (paridad). 21 tests: fixture matrix + freeze toggle + paridad TS↔SQL.
- **Flag** `isOtdClassifierGhShadowEnabled()` (`OTD_CLASSIFIER_GH_SHADOW_ENABLED`, default OFF) en `otd-classifier-flags.ts`.
- **Reliability signal** `notion.metrics.shadow_paridad_otd_classifier` (PG-based, moduleKey `delivery`, kind `drift`) en `src/lib/reliability/queries/notion-metrics-otd-classifier-parity.ts`, wired en `get-reliability-overview.ts`. Mide paridad sobre tareas COMPLETADAS (`on_time`/`late_drop`, buckets estables now()-independientes); divergencia en abiertas = esperada, no falla. Severity: ≤2% ok / ≤10% warning / >10% error.
- **BQ mirror** `gh_otd_bucket` shadow column: `v_tasks_enriched` VIEW (additive) + `delivery_task_monthly_snapshots` DDL + `REQUIRED_COLUMN_MIGRATIONS` + INSERT/SELECT del materializer (`schema.ts` + `materialize.ts`).

**Verificación**: full suite 5239 passed, build green, tsc clean. Signal LIVE contra PG real → **100% paridad (198/198)**. BQ dry-run + SELECT read-only confirmaron materialización (`on_time` 192 / `carry_over` 149 / `overdue` 13 / `late_drop` 6 / NA 4931). Bono + `otd_pct` + `performance_indicator_code` intactos.

**Desbloquea M2** (TASK-922): el helper freeze-aware togglable ya existe GH-owned; M2 solo flipea freeze on + reason-aware sobre el mismo `gh_otd_bucket`.

### 16.8 Delta 2026-05-24 — M0 SHIPPED (TASK-921)

M0 cerró en `develop` (directo, sin branch, override operador). La captura de cambios de fecha límite + motivo de reprogramación está construida (flag OFF). Estado:

- **Tabla** `greenhouse_delivery.task_due_date_changes` append-only (migration `20260524100613341`). Triggers anti-DELETE + anti-UPDATE excepto columnas de motivo (`reason_code`/`reason_source`/`reason_confidence` mutables para confirmación operador). CHECK enums + UNIQUE partial `source_event_id`. Verificada live: 16 cols, 2 triggers, 4 indexes.
- **Helper de inferencia** `inferRescheduleReason()` en `src/lib/delivery/reschedule-reason-inference.ts` (pure). Partición disjunta §5: `external_blocker`/`client_requested`/`internal_not_prioritized`/`unspecified`. `scope_change` NUNCA inferido (solo operador). + vocabulario Notion option↔code. 16 tests.
- **Captura**: **reusa** `notion.task.page_change_signal` (webhook `notion-status-transitions` de TASK-912, ya ON en prod) con un 2do consumer `notionDueDateChangeCaptureProjection` — NO segundo endpoint/HMAC. Re-fetch (`fetchPageDueDate`) → workspace autoritativo → persist-if-changed (baseline seed backfilled de `Fecha límite original`) → motivo inferido o `operator_confirmed` (lee select Notion) + confirmation-only path. 16 tests.
- **Flag propio** `NOTION_DUE_DATE_CAPTURE_ENABLED` (default OFF) — necesario porque el webhook de TASK-912 ya está ON; sin él el merge capturaría inmediato.
- **2 reliability signals** (subsystem `delivery`): `delivery.reschedule.capture_lag` + `delivery.reschedule.pending_reason_confirmation`. SQL verificados live (steady 0/null).

**Decisiones de diseño**: writeback-de-sugerencia a Notion (mostrar el motivo inferido en la propiedad) **DEFERIDO a follow-up** (mirror TASK-927) — es el componente más pesado (Cloud Tasks + echo-loop) y NO es lo que TASK-922 consume; el path de CONFIRMACIÓN del operador SÍ está (el consumer LEE `Motivo de reprogramación`). `days_delta` computado en TS (no `EXTRACT(EPOCH FROM date-date)`, gate TASK-893).

**Verificación**: 32 tests focales nuevos + lint + tsc verdes (test pre-existente roto en develop `ai/build-prompt.test.ts` ajeno a M0). NO computa atraso — eso es TASK-922.

**Desbloquea M2** (TASK-922): el compute de atraso imputable ya tiene su fuente de eventos de fecha + motivo confirmado.

### 16.9 Delta 2026-05-24 — M2 SHIPPED (TASK-922, shadow)

M2 cerró en `develop` (directo, sin branch, override operador). El cómputo de atraso imputable + bucket reason-aware está construido en **shadow** (flag OFF). Estado:

- **Helper canónico** `calculateAttributableLateness(inputs)` (`src/lib/notion-metrics/calculate-attributable-lateness.ts`, pure): fairDeadline (COALESCE original/vigente + Σ extensiones confirmadas cliente/scope) + resta de freeze posterior (3-estado, clamp, mirror cycle-time) + dataStatus (valid/unavailable/legacy_unknown). 16 tests.
- **`classifyOtdBucket` extendido** con `applyMonthGate?:boolean` (default true=M1 paridad; M2=false). M2 reusa el clasificador — single source of truth. 26 tests (21 M1 intactos).
- **Shadow table** `greenhouse_delivery.task_attributable_lateness_shadow` (migration `20260524104127717`, UPSERT per task): `fair_deadline` + `attributable_days_late` + `frozen_days_excluded` + `bucket_attributable` (freeze ON) + `bucket_no_freeze` (baseline paridad) + `bucket_legacy` + `data_status`.
- **Consumer reactivo** `notion_attributable_lateness_compute`: trigger `notion.task.status_transitioned` → re-lee PG (tasks + transitions + due_date_changes) → `reconstructFreezeIntervals` → helper → UPSERT. 11 tests.
- **2 reliability signals** (subsystem `delivery`): `attributable_lateness.shadow_paridad` (% buckets que el freeze cambia; ok ≤30%) + `attributable_lateness.freeze_reschedule_overlap` (invariante anti-doble-descuento, steady=0). `reschedule.pending_reason_confirmation` se reusa de TASK-921.
- **Flag** `ATTRIBUTABLE_LATENESS_OTD_ENABLED` (default OFF) → consumer no-op, bono intacto.

**Decisión de diseño clave**: el output M2 vive en **PG shadow table + consumer reactivo** (patrón RpA V2), **NO en columnas BQ** (a diferencia del `gh_otd_bucket` de M1). El freeze multi-ciclo (3-estado, clamp post-fairDeadline) + fairDeadline (desde reschedules con reason confirmado) no es un CASE BQ mantenible en paridad — el helper TS es source of truth. Esto preserva el `gh_otd_bucket` de M1 intacto (su signal de paridad sigue válido) y diverge del hint BQ de la spec original con rationale documentado.

**Verificación**: 53 tests focales nuevos (helper 16 + classify +5 + consumer 11 + … ) + lint + tsc verdes; signals verificados live contra PG (steady 0). NO toca el bono (shadow).

**Camino restante para cerrar ISSUE-081**: M3 (cutover bono) — task futura gated (8 stop-gates + sign-off HR + ≥30d shadow verde + activación de captura M0/M1). Para que el shadow acumule datos: el operador activa `NOTION_DUE_DATE_CAPTURE_ENABLED` (M0) + `ATTRIBUTABLE_LATENESS_OTD_ENABLED` (M2).
