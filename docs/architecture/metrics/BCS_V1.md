# `BCS` — Brief Clarity Score — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | BCS (Brief Clarity Score) |
| Metric ID (helper) | `brief_clarity_score` (`BRIEF_CLARITY_SCORE_METRIC_ID` en helper) |
| Spec version | V1 |
| Status | Accepted (infrastructure-ready, data-empty V1 — TASK-910 activa AI layer real) |
| Owner domain | `delivery|ico|ai_tooling|revenue_enabled` |
| Created | 2026-05-17 |
| Last updated | 2026-05-17 |
| Writeback state | `not_implemented` (V1 lectura desde `ico_engine.ai_metric_scores` BQ — AI scoring backend pendiente TASK-910) |
| Cross-refs | TASK-220 (contract original) · TTM_V1 (BCS habilita TTM observed) · ITERATION_VELOCITY_V1 (hermana Revenue Enabled) · Contrato §2.3 + Delta 2026-04-04 · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**BCS (Brief Clarity Score)** mide qué tan claro y completo es el brief inicial de un proyecto creativo — antes de empezar producción. Es score numérico `0-100` derivado vía evaluación AI o human del documento brief contra checklist canonical de claridad.

- `BCS = 100` → brief excepcional (toda la info contextual, requisitos, restricciones, deadlines, criterio de éxito claros)
- `BCS = 80` → brief efectivo (canonical threshold de paso) — el equipo puede arrancar con confianza
- `BCS < 80` → brief sub-óptimo — riesgo alto de re-trabajo, demoras, scope creep
- `BCS muy bajo` (e.g. <50) → brief crítico — equipo bloquea producción + retoma de cliente

**A quién le importa**:

- **Equipo creativo**: input directo para decidir si arrancar trabajo o pedir clarificación. Brief malo = más rondas + Cycle Time alto + RpA alto.
- **Cliente**: feedback sobre calidad de su input — si BCS sostenido bajo, problema en el proceso intake del cliente (no del equipo).
- **Producto / Capacity planning**: BCS sostenido bajo indica que **TTM**, **Iteration Velocity**, **OTD%** van a sufrir downstream.
- **Pitch comercial**: BCS habilita el evento `brief efectivo` que es el inicio observado de TTM (Time-to-Market) — input directo a palanca 1 Revenue Enabled (Early Launch Advantage).

---

## 2. Fórmula canonical

### 2.1 Project-level score (lectura desde BQ AI scoring layer)

```text
BCS(project) = score más reciente auditado en ico_engine.ai_metric_scores
                WHERE metric_id = 'brief_clarity_score'
                  AND project_id = $project_id
                ORDER BY processed_at DESC
                LIMIT 1
```

V1 retorna el score más reciente per project — no agrega cross-project.

### 2.2 Threshold canonical de paso

```text
BRIEF_CLARITY_PASSING_SCORE = 80
```

Definido en `src/lib/ico-engine/brief-clarity.ts:7`. Brief con score ≥ 80 → `passed = true` (canonical "brief efectivo"). < 80 → `passed = false`.

### 2.3 Combinación con governance status

```text
finalReadiness(project) = combine(
  BCS.passed (score >= 80),
  governance.readinessStatus  // 'ready' / 'degraded' / 'blocked'
)

Resultado:
  - 'ready' → governance OK + BCS pass
  - 'degraded' → BCS pass pero governance con warnings, O governance ready pero BCS no auditado todavía
  - 'blocked' → governance blocked (override BCS)
  - 'unknown' → falta evidencia para decidir
```

### 2.4 Versionado de fórmula

`BCS_FORMULA_VERSION = 'bcs_v1.0'` (constant futura cuando AI scoring layer shippee TASK-910 — V1 hereda versionado de `ai_metric_scores.prompt_version_tag` per-evaluation).

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `project.id` | `greenhouse_delivery.projects.project_id` | primitivo | identificador canonical |
| `ico_engine.ai_metric_scores` row | BQ table | derivado AI/human | score + breakdown + reasoning + prompt_version |
| `score` field | `ai_metric_scores.score` | derivado | 0-100 |
| `passed` field | `ai_metric_scores.passed` | derivado | boolean (sobreescribe threshold si auditor lo flagged manual) |
| `confidence` field | `ai_metric_scores.confidence` | derivado | 0-1 (qué tan seguro el AI/human del score) |
| `governance.readinessStatus` | `space_notion_governance` per-space | derivado | `ready` / `degraded` / `blocked` |
| `governance.blockingIssuesCount` + `warningsCount` | governance evidence | derivado | issues operacionales detectados en el space |
| `governance.mappedCoreFields` + `missingCoreFields` | governance evidence | derivado | qué fields del brief están mapeados al template canonical |

### 3.1 AI scoring backend (TASK-910 futura)

V1: `ico_engine.ai_metric_scores` es **infraestructura ready** pero data **mayormente vacía** porque AI scoring agent NO está corriendo continuous (TASK-220 contract definido pero scoring backend pendiente TASK-910).

V2 (TASK-910): activar AI agent que evalúa briefs automáticamente al crear projects + escribe score a `ai_metric_scores`. Pattern: triggered on `project.created` event → AI agent prompt evalúa brief content → persiste score + breakdown + reasoning.

### 3.2 Boundary canonical Notion ↔ Greenhouse

- **Notion** captura: brief content (project description, requirements, etc.)
- **Greenhouse (AI agent)** computa: score 0-100 via prompt evaluation → persiste BQ
- **Greenhouse devuelve a Notion**: V2 futuro property `[GH] BCS` per-project read-only

### 3.3 Scoring method canonical

```typescript
type BriefClarityScoringMethod = 'automatic' | 'human' | 'hybrid' | 'unknown'
```

- `automatic` → AI agent scored (default V2 TASK-910)
- `human` → operador HR/Delivery flagged manual review
- `hybrid` → AI inicial + human override
- `unknown` → método no registrado (V1 default cuando data sparse)

---

## 4. Helper canonical (per-project compute)

| Helper | File | Status |
|---|---|---|
| `resolveBriefClarityMetric({score, evidence, governance, threshold?})` | `src/lib/ico-engine/brief-clarity.ts:174-220` (412 líneas total) | Implemented (infrastructure-ready) |

### 4.1 Signature canonical V1

```typescript
import 'server-only'

export const BRIEF_CLARITY_SCORE_METRIC_ID = 'brief_clarity_score'
export const BRIEF_CLARITY_PASSING_SCORE = 80

export type BriefClarityDataStatus = 'available' | 'degraded' | 'unavailable'
export type BriefClarityConfidenceLevel = 'high' | 'medium' | 'low'
export type BriefClarityEvidenceMode = 'observed' | 'missing'

export interface BriefClarityMetric {
  value: number | null
  threshold: number
  passed: boolean | null
  dataStatus: BriefClarityDataStatus
  confidenceLevel: BriefClarityConfidenceLevel | null
  evidenceMode: BriefClarityEvidenceMode
  scoringMethod: BriefClarityScoringMethod
  policyStatus: BriefIntakePolicyStatus  // 'ready' / 'degraded' / 'blocked' / 'unknown'
  evidence: BriefClarityScoreEvidence
  governance: BriefClarityGovernanceEvidence
  qualityGateReasons: string[]
}

export const resolveBriefClarityMetric = (input): BriefClarityMetric
```

### 4.2 Tests

`src/lib/ico-engine/brief-clarity.test.ts` cubre paths canonical: happy passed, degraded sin score, blocked governance override, hybrid scoring, fallback unknown.

---

## 5. Agregado canonical (registry SQL)

**NO está en `metric-registry.ts`** runtime. BCS es métrica project-level — no aggregate per-member-month como métricas operacionales.

Si V3 emerge demanda de aggregate (e.g. "promedio BCS de proyectos del cliente X en Q4"), evaluar entry registry. Por ahora helper standalone suficiente.

### 5.1 BQ source canonical

```sql
SELECT *
FROM `ico_engine.ai_metric_scores`
WHERE metric_id = 'brief_clarity_score'
  AND project_id = $project_id
ORDER BY processed_at DESC
LIMIT 1
```

Table schema (V1 infrastructure-ready):

```sql
ai_metric_scores (
  score_id UUID PK,
  metric_id TEXT NOT NULL,           -- 'brief_clarity_score'
  task_id TEXT NULL,                 -- nullable (BCS es project-level)
  project_id TEXT NOT NULL,
  score NUMERIC NULL,                -- 0-100
  passed BOOLEAN NULL,
  breakdown JSONB NULL,
  reasoning TEXT NULL,
  model TEXT NULL,                   -- e.g. 'claude-opus-4-7'
  prompt_version TEXT NULL,
  prompt_hash TEXT NULL,
  confidence NUMERIC NULL,           -- 0-1
  input_snapshot_url TEXT NULL,
  processed_at TIMESTAMPTZ NOT NULL
)
```

---

## 6. Semántica de casos edge

| Escenario | BCS resultado |
|---|---|
| Project sin score auditado en `ai_metric_scores` | `value=null, dataStatus='unavailable'` |
| Project con score=85, passed=true | `value=85, passed=true, dataStatus='available'` |
| Project con score=70, passed=false (< threshold) | `value=70, passed=false, dataStatus='available'` |
| Project con score=85 pero governance status='blocked' | `policyStatus='blocked'` (override) — equipo NO debería arrancar aún |
| Project con score=85 + governance 'ready' + confidence ≥ 0.85 | `confidenceLevel='high'` — máxima confianza, equipo arranca |
| Project con score=null pero governance ready | `dataStatus='degraded'` — brief no auditado pero governance OK |

### 6.1 Confidence resolution canonical

```typescript
if (policyStatus === 'ready' && passed && scoreConfidence !== null && scoreConfidence >= 0.85) return 'high'
if (policyStatus !== 'blocked' && (scoreConfidence === null || scoreConfidence >= 0.6)) return 'medium'
return 'low'
```

`high` requiere: governance ready + brief pass + score AI confidence ≥0.85. Caso contrario degrada a `medium` o `low`.

### 6.2 V1 mostly unavailable

Mayoría de projects V1 retornan `dataStatus='unavailable'` (sin score auditado). Cuando TASK-910 active AI scoring backend → mayoría projects pasan a `available` con scores reales.

### 6.3 BCS habilita TTM observed (cross-spec invariant)

Per `TTM_V1.md` §3: el evento `brief efectivo` (inicio TTM) es **observed** cuando BCS auditado pass. Si BCS NO existe → TTM degrada a proxy (primera tarea en briefing → start de TTM).

BCS sostenido bajo → TTM `degraded` permanente → palanca 1 Revenue Enabled (Early Launch Advantage) sin evidencia observed.

---

## 7. Estados / dataStatus

| dataStatus | evidenceMode | scoringMethod | UI |
|---|---|---|---|
| `available` | `observed` | `automatic` / `human` / `hybrid` | Score + threshold zone + breakdown drilldown |
| `degraded` | `missing` | `unknown` | Sin score + indicador "auditoría pendiente" |
| `unavailable` | `missing` | `unknown` | `—` |

---

## 8. Threshold canonical + benchmark

**Threshold canonical de paso: `BRIEF_CLARITY_PASSING_SCORE = 80`**.

V1 binary: score ≥ 80 → brief efectivo. < 80 → brief sub-óptimo.

### 8.1 Benchmark interno

Greenhouse operating policy: target ≥ 80% de projects con BCS pass. < 80% indica problema sistémico en intake.

### 8.2 Calibración per tipo de proyecto (futuro)

Out of scope V1. Hipótesis: rebrand complejo requiere brief más estricto (threshold 90) vs banner producción rápida (threshold 70). V2 calibración per tipo.

---

## 9. Writeback a Notion

| Aspecto | Valor |
|---|---|
| Target property Notion per-project | `[GH] BCS Score` (number 0-100) + `[GH] BCS Status` (select pass/fail/pending) — V2 TASK-910 |
| Estado actual | `not_implemented` (TASK-910 futura activa AI backend + writeback) |
| Task de writeback | TASK-910 (BCS AI Layer Activation) |
| Frecuencia | Per project create + property change |

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 spec created (infrastructure-ready, data-empty)

- Spec canonical creado documentando el helper existente + infrastructure ready desde TASK-220.
- **Decisión canonical**: BCS vive como helper project-level standalone (`src/lib/ico-engine/brief-clarity.ts`), NO en registry runtime — métrica narrative-level Revenue Enabled.
- **TASK-910 futura activa el backend AI scoring** — V1 retorna mostly `unavailable` honestamente.
- **Threshold `80` confirmado** del helper canonical existente.
- **Cross-invariante con TTM**: BCS habilita evento `brief efectivo` observed (TTM start).

### 2026-04-04 — TASK-220 contract original

- Contract formalizado en `Contrato_Metricas_ICO_v1.md` Delta 2026-04-04.
- Helper implementado (412 líneas — `brief-clarity.ts`) infrastructure-ready.
- Anti-patrón legacy bloqueado: NO inferir BCS desde heurísticas (e.g. word count del brief).
- Pendiente: activar AI agent backend (TASK-910).

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas (Revenue Enabled palancas)**:
  - [TTM_V1.md](TTM_V1.md) — BCS habilita TTM observed (cross-invariante crítica)
  - [ITERATION_VELOCITY_V1.md](ITERATION_VELOCITY_V1.md) — hermana palanca 2 Revenue Enabled
- **Tasks**: TASK-220 (contract original) · TASK-910 (futura — activar AI backend) · TASK-222 (CVR contrato)
- **Código**:
  - Helper canonical: `src/lib/ico-engine/brief-clarity.ts` (412 líneas — infrastructure-ready)
  - Tests: `src/lib/ico-engine/brief-clarity.test.ts`
  - BQ source: `ico_engine.ai_metric_scores` table
  - Consumer Revenue Enabled: `src/lib/ico-engine/revenue-enabled.ts`
- **Docs reference**:
  - Contrato Delta 2026-04-04 (BCS contract original)
  - Contrato §2.3 (palanca 1 Early Launch Advantage requires BCS for TTM observed)
  - Engine doc `Greenhouse_ICO_Engine_v1.md` líneas 2759-2763 (BCS deferred to Phase 4)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **AI scoring backend activation**: TASK-910 prioritized future. V1 retorna mostly `unavailable`.
- **Multi-language briefs**: V1 prompt asume es-CL/es-MX. V2 multi-lingual (en-US para clientes US/UK).
- **Re-scoring on brief edit**: V2 trigger AI re-evaluation cuando brief content edita post-creation. V1 score solo al create.
- **Human override audit trail**: V2 trackear who overrode (operador HR/Delivery) + reasoning. V1 helper acepta `human` scoring method pero sin audit deep.
- **Calibración per tipo de proyecto**: V1 threshold uniforme 80. V2 calibración (rebrand→90, banner→70).
- **Aggregate per cliente / período**: V1 project-level only. V2 si emerge demanda comparativa (e.g. "BCS promedio Sky Q2").
- **Writeback per-project Notion**: V2 TASK-910 incluye writeback property.
- **Action recommendations from breakdown**: V2 podría exponer breakdown como checklist actionable ("falta info de target audience", "deadline ambiguo") en UI.
