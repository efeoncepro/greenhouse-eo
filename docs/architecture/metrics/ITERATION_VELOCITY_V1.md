# `IterationVelocity` — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | Iteration Velocity |
| Metric ID (helper) | `iteration_velocity` (NO en registry runtime — métrica narrative-level Revenue Enabled) |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico|revenue_enabled` |
| Created | 2026-05-17 by sesión deep-dive |
| Last updated | 2026-05-17 |
| Writeback state | `N.A.` (métrica narrative-level Revenue Enabled — no per-task Notion) |
| Cross-refs | TASK-219 (source policy original) · RPA_V1 (NO confundir — Iteration Velocity ≠ RpA) · PIPELINE_VELOCITY_V1 (NO confundir — Iteration Velocity ≠ pipeline velocity) · Contrato §2.3 palanca 2 Revenue Enabled · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**Iteration Velocity** mide la capacidad habilitada por Globe para que el cliente **testee más rápido en mercado** — más variantes producidas + procesadas en menos tiempo, sin arrastre correctivo.

Es métrica **narrative-level de Revenue Enabled** (palanca 2: Iteration Velocity Impact). Responde la pregunta de negocio: **"¿Globe permite que el cliente itere creatividad rápido suficiente para mejorar performance vía testing?"**

- `Iteration Velocity alta` → cliente puede testear muchas variantes rápido → A/B testing intensivo → mejor ROAS captured
- `Iteration Velocity baja` → cliente envía briefs pero recibe pocas variantes o llegan tarde → testing limitado → ROAS subóptimo

**Cuidado canonical**: Iteration Velocity **NO** es:

- **NO es RpA**: RpA cuenta rondas de **corrección** (cliente rechazó → equipo rehizo). Iteration Velocity cuenta **iteraciones útiles** (variantes nuevas que aportan testing value).
- **NO es Pipeline Velocity**: Pipeline Velocity mide ratio flow del backlog activo. Iteration Velocity mide capacidad de testing habilitada al cliente.
- **NO es throughput de variantes**: throughput es count plano. Iteration Velocity discrimina **útil vs correctivo**.

**A quién le importa**:

- **Cliente performance marketing** (vía CVR/QBR): mide capacidad real de testing creativo → input directo a optimización ROAS
- **Pitch comercial**: palanca 2 de Revenue Enabled — claim "Globe habilita iteración rápida = mejor performance ad-platforms"
- **Producto / Equipo creativo**: input para evaluar fit de equipo creativo con cliente performance-driven vs cliente branding-driven

---

## 2. Fórmula canonical (TASK-219 policy)

### 2.1 Per-task (clasificación útil vs correctivo)

Una tarea cuenta como **iteración útil** cuando cumple TODOS:

- `frame_versions >= 2` OR `workflow_change_round > 0` (evidencia de versionado/iteración interna real)
- `client_change_round = 0` (sin rondas de corrección del cliente — la iteración fue **útil**, no fix)
- `client_review_open = FALSE` (sin reviews del cliente abiertas pendientes)
- `workflow_review_open = FALSE` (sin reviews internas pendientes)
- `open_frame_comments = 0` (sin comentarios Frame.io sin resolver)

Caso contrario (con cambios cliente o reviews abiertas) → cuenta como **corrective rework**, NO útil.

### 2.2 Agregado canonical (per-período per-scope)

```text
IterationVelocity(scope, cadenceWindowDays = 30) = useful_iteration_tasks
                                                    durante últimos N días
                                                    dentro del scope
```

Es **count** de iteraciones útiles en ventana cadencia (default 30 días).

### 2.3 Evidence mode canonical (TASK-219 policy)

Iteration Velocity reporta `evidenceMode` per resultado:

- `observed` → existe evidencia operativa real de iteración útil + cliente reportó usar testing en plataforma ad. Activa lectura "observed" del Revenue Enabled.
- `proxy` → existe evidencia operativa (variantes producidas) pero NO confirmación de uso real en mercado. Lectura `proxy operativo` Revenue Enabled.
- `missing` → sin evidencia de cadencia útil → `unavailable`

V1: la mayoría de scopes operan en `proxy` mode porque la integración con plataformas ad (Meta/Google Ads) NO existe. Cuando emerja, varios scopes pueden alcanzar `observed`.

### 2.4 Versionado de fórmula

`ITERATION_VELOCITY_FORMULA_VERSION = 'iteration_velocity_v1.0'` (TASK-219 policy ya canonizada).

Bump cuando emerja integración con plataformas ad → policy V2 activa lectura `observed` para scopes con evidencia plataforma.

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `task.completed_at` | `greenhouse_delivery.tasks.completed_at` | primitivo | filtro: solo tareas completadas en ventana cadencia |
| `task.frame_versions` | Frame.io integration (futuro V2) | primitivo | número de versiones producidas — V1 hoy NULL para mayoría |
| `task.client_change_round` | Frame.io integration o legacy notion | primitivo | rondas cambio cliente — V1 NULL en muchos casos |
| `task.workflow_change_round` | workflow integration (futuro V2) | primitivo | rondas internas — V1 NULL |
| `task.client_review_open` | Frame.io integration | primitivo | flag reviews cliente abiertas — V1 NULL |
| `task.workflow_review_open` | workflow integration | primitivo | flag reviews internas abiertas — V1 NULL |
| `task.open_frame_comments` | Frame.io integration | primitivo | count comentarios sin resolver — V1 NULL |
| `cadenceWindowDays` | parámetro helper | configuración | default 30 días |
| `hasObservedMarketEvidence` | parámetro helper | configuración | flag para upgradear a `observed` mode |

### 3.1 Boundary canonical Notion ↔ Greenhouse

V1 evidencia mayormente NULL (Frame.io / workflow integrations no existen). El helper se invoca con datos disponibles y degrada honestamente a `proxy` o `unavailable`.

Cuando Frame.io exista (futuro): inputs poblados → helper computa real → algunos scopes pueden alcanzar `observed`.

### 3.2 Source policy TASK-219 canonical

Documentada en `Contrato_Metricas_ICO_v1.md` Delta 2026-04-04. Reglas clave:

- Iteration Velocity **NO** puede derivarse desde RpA (anti-patrón legacy detectado en TASK-219 review)
- Iteration Velocity requiere evidencia **operativa específica** (frame_versions, change rounds, reviews flags)
- Mientras no exista evidencia observada de mercado → lectura `proxy operativo` + `degraded` mode

---

## 4. Helper canonical (per-task compute)

| Helper | File | Status |
|---|---|---|
| `resolveIterationVelocityMetric({tasks, now?, cadenceWindowDays?, hasObservedMarketEvidence?})` | `src/lib/ico-engine/iteration-velocity.ts:86-180` (199 líneas) | Implemented (TASK-219 SHIPPED) |

### 4.1 Signature canonical V1

```typescript
import 'server-only'

export type IterationVelocityDataStatus = 'available' | 'degraded' | 'unavailable'
export type IterationVelocityConfidenceLevel = 'high' | 'medium' | 'low'
export type IterationVelocityEvidenceMode = 'observed' | 'proxy' | 'missing'

export interface IterationVelocityTaskEvidence {
  completedAt: string | null
  frameVersions: number | null
  clientChangeRounds: number | null
  workflowChangeRounds: number | null
  clientReviewOpen: boolean
  workflowReviewOpen: boolean
  openFrameComments: number | null
}

export interface IterationVelocityMetric {
  value: number | null               // count de iteraciones útiles en ventana
  cadenceWindowDays: number
  dataStatus: IterationVelocityDataStatus
  confidenceLevel: IterationVelocityConfidenceLevel | null
  evidenceMode: IterationVelocityEvidenceMode
  qualityGateReasons: string[]       // razones legibles del degraded/unavailable
  evidence: {
    candidateTasks: number
    signalCoverageTasks: number
    tasksWithVersionSignal: number
    tasksWithWorkflowSignal: number
    tasksWithClientRoundSignal: number
    usefulIterationTasks: number
    correctiveReworkTasks: number
  }
}

export const resolveIterationVelocityMetric = (input: IterationVelocityInput): IterationVelocityMetric
```

### 4.2 Tests anti-regresión

Tests existentes en `src/lib/ico-engine/iteration-velocity.test.ts` cubren:

- Happy: tareas con frame_versions ≥ 2 + sin reviews abiertas → counted como útiles
- Edge: tarea con frame_versions=1 → NO cuenta (sin evidencia iteración)
- Edge: tarea con client_review_open=true → NO cuenta (rework pendiente)
- Edge: ventana cadencia (30d default) filtra tareas fuera
- Edge: data status `unavailable` cuando sin tareas en ventana
- Edge: data status `degraded` cuando proxy mode sin observed evidence

---

## 5. Agregado canonical (registry SQL)

**NO está en `metric-registry.ts`**. Iteration Velocity es métrica **narrative-level Revenue Enabled**, no operacional ICO Engine standard. Consumer la invoca via `resolveIterationVelocityMetric` desde helper standalone.

### 5.1 Materialización futura

Si emerge demanda de exponerla como métrica registry standard (per-member-month aggregate, threshold zones, charts):

- V2 podría agregar entry a `metric-registry.ts` con `id='iteration_velocity'`
- Requiere materializar fields `frame_versions`, `client_change_round`, etc. en `v_tasks_enriched` (vienen de Frame.io integration que NO existe V1)
- Por ahora helper standalone suficiente para uso narrative-level

### 5.2 Granularidades soportadas (helper)

- Per-scope ventana cadencia (default 30d, configurable per invocation)
- Scopes: per-member, per-space, per-cliente

---

## 6. Semántica de casos edge

| Escenario | Iteration Velocity |
|---|---|
| Sin tareas completadas en ventana cadencia | `value=null, dataStatus='unavailable', evidenceMode='missing'` |
| Tareas completadas pero todas con corrective rework | `value=0, dataStatus='degraded', evidenceMode='proxy'` (sin iteración útil) |
| Tareas con frame_versions ≥ 2 + sin rework | `value=N, dataStatus='available', evidenceMode='proxy'` (V1 — proxy hasta Frame.io exista) |
| Tareas con útiles + `hasObservedMarketEvidence=true` (futuro Frame.io + ad platform) | `value=N, dataStatus='available', evidenceMode='observed'` (V2) |

### 6.1 Distinción canonical vs métricas hermanas (CRÍTICO)

| Aspecto | Iteration Velocity | RpA | Pipeline Velocity |
|---|---|---|---|
| Mide | Iteración útil de testing | Correcciones del cliente | Flow ratio del backlog |
| Higher is better | Sí (más testing = mejor) | No (menos correcciones = mejor) | Sí (más flow = mejor) |
| Source | frame_versions + change rounds + reviews | status transitions Listo→Feedback | open vs completed counts |
| Narrative-level | Sí (Revenue Enabled palanca 2) | No (operacional bonificaciones) | No (operacional health flow) |
| Unidad | count | número rondas | ratio |

Confundirlas es **bug arquitectónico**.

### 6.2 V1 mostly proxy mode

V1 la mayoría de invocations retornan `evidenceMode='proxy'` porque inputs Frame.io están vacíos. Esto es **honesto** — no fingir `observed` cuando no existe evidencia.

Cliente que pregunta "cómo medimos Iteration Velocity" recibe respuesta: "V1 medimos vía señales operativas (versionado de Notion). V2 mediremos con Frame.io + integración ad platforms cuando emerjan."

---

## 7. Estados / dataStatus

| dataStatus | evidenceMode | Cuándo aplica | UI |
|---|---|---|---|
| `available` | `observed` | Datos completos + ad platform evidence | Valor + threshold zone |
| `available` | `proxy` | Datos operativos completos pero sin ad evidence | Valor + "(proxy operativo)" |
| `degraded` | `proxy` | Datos parciales o `hasObservedMarketEvidence=false` | Valor + warning |
| `unavailable` | `missing` | Sin tareas o evidencia | `—` |

---

## 8. Threshold canonical + benchmark

**N.A. V1 sin threshold canonical**. Iteration Velocity es métrica narrative-level — no tiene threshold operacional fijo como las otras.

Interpretación contextual:

- `value bajo` → equipo NO está habilitando testing activo del cliente
- `value alto + observed` → equipo habilita testing real → input directo Revenue Enabled
- `value alto + proxy` → equipo produce variantes pero falta evidencia que cliente las use en testing real

V2 con integración ad platforms podría establecer threshold (e.g. ≥10 useful iterations/month/space para "saludable").

---

## 9. Writeback a Notion

**N.A.** Iteration Velocity NO se persiste per-task en Notion. Es métrica computada server-side desde data existente.

Si V2 emerge necesidad de visibilizarla per-task (e.g. flag "esta tarea fue iteración útil"), TASK derivada.

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 spec created (canoniza TASK-219 policy)

- Spec canonical creado documentando el helper existente desde TASK-219.
- **Decisión canonical**: Iteration Velocity vive como helper standalone en `src/lib/ico-engine/iteration-velocity.ts`, NO en registry runtime. Razón: métrica narrative-level Revenue Enabled, no operacional ICO standard.
- **Source policy TASK-219**: confirmada — `frame_versions` + `workflow_change_round` + `client_change_round_final` + `client_review_open` + `workflow_review_open` + `open_frame_comments`.
- **NO confundir** con RpA ni Pipeline Velocity (sección 6.1).
- **Mostly proxy mode V1**: Frame.io / workflow integrations NO existen → V1 retorna `proxy` honestamente.

### 2026-04-04 — TASK-219 source policy original

- Source policy formalizada en `Contrato_Metricas_ICO_v1.md` Delta 2026-04-04.
- Helper implementado `src/lib/ico-engine/iteration-velocity.ts` (199 líneas).
- Anti-patrón legacy bloqueado: NO derivar desde RpA ni desde pipeline_velocity ni desde count comentarios.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas (NO confundir)**:
  - [RPA_V1.md](RPA_V1.md) — métrica distinta (correcciones del cliente, no iteración útil)
  - [PIPELINE_VELOCITY_V1.md](PIPELINE_VELOCITY_V1.md) — métrica distinta (flow ratio, no testing velocity)
  - [TTM_V1.md](TTM_V1.md) — métrica hermana Revenue Enabled (Early Launch Advantage palanca 1)
  - [BCS_V1.md](BCS_V1.md) — métrica hermana (Brief Clarity afecta calidad de iteraciones)
- **Tasks**: TASK-219 (source policy original) · TASK-222 (CVR contrato) · TASK-220 (BCS contrato hermano)
- **Código**:
  - Helper canonical: `src/lib/ico-engine/iteration-velocity.ts` (199 líneas — IMPLEMENTED)
  - Tests: `src/lib/ico-engine/iteration-velocity.test.ts`
  - Contract Revenue Enabled: `src/lib/ico-engine/revenue-enabled.ts` (consumer)
- **Docs reference**:
  - Contrato Delta 2026-04-04 (source policy TASK-219)
  - Contrato §2.3 palanca 2 Iteration Velocity Impact de Revenue Enabled

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Integración Frame.io**: hoy NO existe → inputs mayormente NULL → V1 mostly proxy. V2 cuando shippee → muchos scopes alcanzan `observed`.
- **Integración ad platforms** (Meta Ads / Google Ads): habilita `hasObservedMarketEvidence=true` real. V2/V3 futuro.
- **Threshold canonical operacional**: V1 NO. V2 cuando data suficiente per equipo.
- **Materializar en registry runtime**: V1 NO (sigue como helper standalone Revenue Enabled). V2 si emerge demanda de per-member-month bonificaciones.
- **Workflow team rounds**: integration legacy NO existe. V2 si emerge sistema workflow.
- **Per-cliente customization**: V1 uniforme threshold. V2 si cliente performance-driven pide SLA específico.
