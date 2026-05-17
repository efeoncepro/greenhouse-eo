# Greenhouse Metric Spec Pattern V1

> **ADR canonical** — formaliza que cada métrica crítica de delivery (ICO + futuras) tiene un spec dedicado en `docs/architecture/metrics/<METRIC>_V1.md` que es **single source of truth** de su definición, fórmula, helper, agregado, semántica, threshold, writeback y casos edge.

| Campo | Valor |
|---|---|
| Status | Accepted |
| Decision date | 2026-05-17 |
| Author | Operador + arch reasoning sesión 2026-05-17 |
| Scope | Documentación de métricas de delivery (ICO) y patrón replicable a métricas Finance/HR/etc. con misma criticidad contractual |
| Cross-refs | `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` · `Contrato_Metricas_ICO_v1.md` · `Greenhouse_ICO_Engine_v1.md` · `docs/architecture/metrics/METRICS_INDEX.md` |

---

## 1. Decisión canonical

**1 métrica crítica = 1 spec canonical dedicado** en `docs/architecture/metrics/<METRIC>_V1.md`.

Las métricas críticas son contractuales con:

- **Clientes** (QBR, CVR, SLAs, Revenue Enabled)
- **Equipo** (bonificaciones, compensación variable, OKRs)
- **Negocio** (P&L attribution, scorecards, decisiones operativas)

Merecen el mismo rigor de spec que cualquier domain canonical (P&L Engine, Payment Orders, Auth Resilience, Reliability Control Plane).

---

## 2. Por qué este pattern (problema actual)

Pre-decisión 2026-05-17, para entender una métrica como RpA un agente necesita leer **6 fuentes distintas**:

1. `Contrato_Metricas_ICO_v1.md` línea ~13-19 (definición vieja)
2. Mismo doc Delta 2026-05-17 sección A.1 + A.5 (decisiones recientes)
3. `Greenhouse_ICO_Engine_v1.md` sección RpA + § A.5.4.0 (conceptual aspiracional)
4. `metric-registry.ts:226-249` (código runtime)
5. TASK-901 Slice 1 (helper canonical)
6. TASK-908 Slice 3.5 (foundation `countCorrectionTransitions`)

Plus el ADR boundary `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`.

**Consecuencias del problema**:

- Drift documental constante (e.g. Engine doc dice "Throughput = weekly_rate/4" pero código dice "monthly_count")
- Onboarding lento (nuevo agente necesita 30 min para entender 1 métrica)
- Riesgo de duplicar/contradecir definiciones cross-doc
- Cambios a una métrica requieren editar 3-5 lugares → drift inevitable
- Imposible un grep canonical "qué hace RpA hoy"

---

## 3. Pattern canonical

### 3.1 Estructura física

```text
docs/architecture/metrics/
  _TEMPLATE.md                # template canonical 12 secciones obligatorias
  METRICS_INDEX.md            # índice maestro (status, writeback state, helper, cross-refs)
  RPA_V1.md                   # Rounds per Asset
  OTD_V1.md                   # On-Time Delivery
  FTR_V1.md                   # First-Time Right
  CUMPLIMIENTO_V1.md          # Cumplimiento (dual meaning canonical)
  CYCLE_TIME_V1.md            # Cycle Time
  CT_SLO_PCT_V1.md            # Cycle Time SLO %
  THROUGHPUT_V1.md            # Throughput mensual
  PIPELINE_VELOCITY_V1.md     # Pipeline Velocity (ratio)
  ITERATION_VELOCITY_V1.md    # Iteration Velocity
  BCS_V1.md                   # Brief Clarity Score
  TTM_V1.md                   # Time-to-Market
```

### 3.2 Template canonical (12 secciones obligatorias)

Toda spec de métrica en `docs/architecture/metrics/<METRIC>_V1.md` debe tener estas 12 secciones, en este orden:

1. **Definición canonical** — qué mide en lenguaje simple es-CL (1-2 párrafos sin jerga técnica)
2. **Fórmula canonical** — cómo se computa (código = source of truth; spec lo refleja)
3. **Inputs canonical** — qué datos consume + de dónde vienen (eventos, columnas DB, properties Notion)
4. **Helper canonical** — file:line del helper TS server-only que computa per-task
5. **Agregado canonical** — file:line del registry SQL que computa per-período per-member
6. **Semántica de casos edge** — qué cuenta / qué no cuenta + razonamiento operativo
7. **Estados / dataStatus** — enum cerrado de estados (`valid` / `unavailable` / `suppressed` / `low_confidence`)
8. **Threshold canonical + benchmark** — umbrales de salud + comparación industria
9. **Writeback a Notion** — target property, estado V1/V2/N.A. de la migración, cross-ref a task de writeback
10. **Histórico de decisiones** — append-only, una entrada por Delta date (formato `## Delta YYYY-MM-DD — <título>`)
11. **Cross-refs** — tasks que tocan la métrica + ADRs + otros metric specs relacionados
12. **Open questions deliberadamente NO resueltas** — qué quedó fuera de V1 + por qué + bajo qué condición se resolvería

### 3.3 Roles redefinidos de docs existentes

| Doc | Rol post-migración |
|---|---|
| `Contrato_Metricas_ICO_v1.md` | **Narrativa de negocio + contratos cross-métrica** (Revenue Enabled, palancas, CSC, tier matrix, policy observed/range/estimated). Referencia los specs canonicalmente sin duplicar definiciones de métrica individual. |
| `Greenhouse_ICO_Engine_v1.md` | **Framework conceptual enterprise** (drivers operativos, 3 niveles, cadena causal, narrativa pitch). Referencia los specs canonicalmente sin duplicar definiciones implementacionales. |
| `docs/architecture/metrics/<METRIC>_V1.md` | **Source of truth de la métrica** — fórmula, helper, agregado, semántica, threshold, writeback, estados. |
| `metric-registry.ts` | **Runtime contract** alineado con specs. Cualquier divergencia se resuelve actualizando el código + el spec en el mismo PR. |
| `METRICS_INDEX.md` | **Índice maestro** — lista las N métricas con status, writeback state, helper canonical, cross-refs. Equivalente al `DECISIONS_INDEX.md` para métricas. |

---

## 4. Hard rules canonical

- **NUNCA** crear una métrica crítica nueva sin spec canonical en `docs/architecture/metrics/<METRIC>_V1.md` desde el día 1. Lo demás (registry entry, helper, tests, signals) viene después o en paralelo, pero el spec es prerequisito.
- **NUNCA** duplicar la definición de una métrica entre Contrato + Engine doc + spec canonical. **El spec canonical es la única fuente** post-migración. Contrato y Engine doc referencian con links.
- **NUNCA** modificar la fórmula/semántica/threshold de una métrica sin actualizar paralelamente: (a) el spec canonical (`<METRIC>_V1.md`), (b) el código (`metric-registry.ts` + helper), (c) `METRICS_INDEX.md` si cambia el estado del writeback. Drift entre los 3 = bug.
- **NUNCA** dejar el spec canonical con drift conocido vs código. Cuando el código cambia, el spec se actualiza en el mismo PR (Delta date appended).
- **NUNCA** mezclar 2 métricas en un mismo spec. Cada métrica tiene SU propio archivo.
- **NUNCA** borrar entradas históricas del spec (sección "Histórico de decisiones"). Append-only para preservar audit trail de evolución de la métrica.
- **SIEMPRE** que una task toque una métrica, referenciar el spec canonical en `Normative Docs` + `Dependencies & Impact` + `Files owned`. La task NO redefine la métrica — describe los cambios al spec.
- **SIEMPRE** que se cree un spec canonical nuevo, agregar entrada en `METRICS_INDEX.md` + entrada en `DECISIONS_INDEX.md` (si la métrica introduce decisión arquitectónica nueva, no solo si formaliza la existente).
- **SIEMPRE** que el código de una métrica cambie de manera que afecte semántica observable (no solo refactor interno), bump menor del spec (V1.1, V1.2) o mayor (V2) si cambia shape contractual.

---

## 5. Migración progresiva canonical

NO migramos las 11 métricas de una vez. La migración es **strangler pattern** alineada con cuando cada métrica se toca:

| Fase | Métrica | Driver de creación del spec | Spec target |
|---|---|---|---|
| 1 | RpA | Sesión 2026-05-17 (decisión boundary + TASK-901 + TASK-908) | `RPA_V1.md` |
| 2 | FTR | Misma sesión (decisión delegación a calculateRpa + TASK-909) | `FTR_V1.md` |
| 3+ | OTD, Cumplimiento, Cycle Time, CT SLO%, Throughput, Pipeline Velocity, Iteration Velocity, BCS, TTM | A medida que cada TASK las toque (TASK-902/903/904/908/910+) | `<METRIC>_V1.md` cada una |

**Regla de creación**: cuando una task nueva toca una métrica que NO tiene spec canonical, el primer slice de la task crea el spec antes de tocar código. Sin spec previo = trabajo no canonical.

**Regla de migración progresiva del Contrato + Engine doc**: cada vez que un spec canonical nuevo aparece, las secciones equivalentes en Contrato + Engine doc agregan nota `> **Migrado a `<METRIC>_V1.md` el YYYY-MM-DD** — esta sección queda como referencia histórica, ver spec canonical para definición vigente.` y eventualmente se simplifican a 2-3 líneas + cross-ref.

---

## 6. Defense in depth canonical

| Capa | Mecanismo |
|---|---|
| **Convención** | Esta ADR + `_TEMPLATE.md` + `METRICS_INDEX.md` |
| **CI gate (futuro)** | Script `scripts/ci/metric-spec-coverage-gate.mjs` que verifica que toda entrada `id: '<metric>'` en `metric-registry.ts` tiene un spec canonical en `docs/architecture/metrics/<METRIC>_V1.md`. Modo `warn` durante migración, `error` post Phase 11 |
| **Lint rule (futuro)** | `greenhouse/no-metric-definition-outside-spec` modo `warn` — detecta strings de definición de métrica en Contrato/Engine doc que duplican spec canonical |
| **Code review** | Cualquier PR que toque `metric-registry.ts` debe tocar también el spec canonical correspondiente (humano enforcement durante Phase 1-N; mecánico post Phase 11) |
| **Onboarding** | Nuevo agente lee METRICS_INDEX.md como punto de entrada; cada métrica que necesita entender → leer el spec canonical (1 doc, 5 min) |

---

## 7. Cross-references canonical

- `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — ADR boundary Notion = OS / Greenhouse ICO Engine = motor (prerequisito conceptual)
- `docs/architecture/metrics/_TEMPLATE.md` — template canonical (12 secciones)
- `docs/architecture/metrics/METRICS_INDEX.md` — índice maestro
- `Contrato_Metricas_ICO_v1.md` — narrativa de negocio + contratos cross-métrica (referencia los specs)
- `Greenhouse_ICO_Engine_v1.md` — framework conceptual (referencia los specs)
- `src/lib/ico-engine/metric-registry.ts` — runtime contract
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` — política canonical de ADRs
- TASK-901 / TASK-908 / TASK-909 — primeras tasks que consumen el pattern

---

## 8. Open questions deliberadamente NO resueltas en V1

- **Aplicabilidad fuera de ICO**: ¿Finance metrics (MRR, ARR, CAC, LTV) merecen el mismo pattern? Probablemente sí cuando emerja necesidad — el pattern es replicable. Por ahora V1 cubre solo métricas de delivery (ICO).
- **Versionado semver de specs**: V1 usa `V1.md`, `V1.1` para minor (semántica preservada), `V2.md` cuando cambia shape contractual. ¿Cuándo exactamente saltar V2 vs V1.x? Caso a caso por ahora; codificar regla cuando emerja segundo V2 real.
- **Lint rule mecánica**: V1 enforcement es humano (code review). CI gate + lint rule quedan como follow-up post Phase 5+ (cuando suficientes specs existan para que valga la pena el tooling).
- **Auto-generación de spec template desde registry entry**: ¿script `pnpm metric:scaffold <name>` que crea el spec con secciones pre-pobladas? Posible follow-up cuando emerja necesidad.

---

## 9. Histórico de decisiones

### 2026-05-17 — V1 Accepted

- Pattern canonical formalizado post deep-dive sesión RpA/FTR/Cycle Time
- Disparador: fragmentación de definiciones cross-doc detectada al intentar implementar TASK-909 (FTR drift Engine doc vs código)
- Primeras 2 specs creadas: `RPA_V1.md` + `FTR_V1.md`
- ADR boundary `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` queda como prerequisito conceptual de este ADR (boundary define ownership; este ADR define documentación)
