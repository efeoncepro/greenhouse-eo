# `TTM` — Time-to-Market — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | TTM (Time-to-Market) |
| Metric ID (helper) | `time_to_market` (NO en registry runtime — métrica per-campaign Revenue Enabled) |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico|campaigns|revenue_enabled` |
| Created | 2026-05-17 |
| Last updated | 2026-05-17 |
| Writeback state | `N.A.` (métrica per-campaign, no per-task Notion) |
| Cross-refs | TASK-218 (source policy original) · BCS_V1 (BCS habilita TTM observed) · ITERATION_VELOCITY_V1 · Contrato §2.3 palanca 1 Revenue Enabled · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**TTM (Time-to-Market)** mide cuántos días pasaron desde que se inició el **brief efectivo** de una campaña hasta que la campaña **activó en mercado**. Es la lectura canonical de **velocidad de salida a mercado** del cliente habilitada por Globe.

Es métrica **per-campaign** (NO per-task) — vive en el contexto de campañas comerciales, no de piezas individuales.

- `TTM = 14 días` → cliente lanzó campaña 14 días después del brief efectivo
- `TTM bajo` → Globe habilita salida rápida → más tiempo en mercado → más Early Launch Advantage (palanca 1 Revenue Enabled)
- `TTM alto` → cliente tardó en lanzar → menos demanda capturada

**A quién le importa**:

- **Cliente performance / marketing**: input directo para captar demanda estacional (Black Friday, lanzamiento producto, ventana competitiva)
- **Pitch comercial**: palanca 1 Revenue Enabled — claim "Globe te ayuda a lanzar antes = capturar más demanda"
- **Producto / Comercial**: TTM bajo = competitive advantage frente a in-house o agencias slower
- **Management**: TTM sostenido bajo per cliente = retention input — clientes que ven valor lanzan más campañas

---

## 2. Fórmula canonical

### 2.1 Per-campaign

```text
TTM(campaign) = activation_date - start_date  (en días calendar)

donde:
  start_date  = primera fecha del evento canonical "brief efectivo"
                (jerarquía source priority — §2.2)
  activation_date = primera fecha del evento canonical "activación en mercado"
                    (jerarquía source priority — §2.3)
```

### 2.2 Source priority canonical para `start_date` (TASK-218 + TASK-220 policy)

Decisión por jerarquía descendente:

1. **`brief efectivo` observed** = BCS auditado pass (score ≥ 80) + processed_at → `evidenceMode='observed'`
2. **Primera tarea en fase `briefing`** (delivery_tasks) → `evidenceMode='proxy'`
3. **`delivery_projects.start_date`** (Notion explicit) → `evidenceMode='proxy'`
4. **`campaign.actual_start_date`** → `evidenceMode='proxy'`
5. **Primera tarea creada del proyecto** → `evidenceMode='proxy'`
6. **`campaign.planned_start_date`** → `evidenceMode='planned'`
7. Ninguna → `evidenceMode='missing'`

### 2.3 Source priority canonical para `activation_date`

1. **`campaign.actual_launch_date`** → `evidenceMode='observed'`
2. **Primera tarea con evidencia de activación / publicación** (e.g. status "Publicado") → `evidenceMode='proxy'`
3. **`delivery_projects.end_date`** → `evidenceMode='proxy'`
4. **`campaign.planned_launch_date`** → `evidenceMode='planned'`
5. Ninguna → `evidenceMode='missing'`

### 2.4 Data status canonical resolution

```text
dataStatus = 'available'   cuando ambos start + activation son `observed`
           = 'degraded'    cuando alguno es proxy o planned
           = 'unavailable' cuando alguno es missing o resultado < 0 (inconsistencia temporal)
```

### 2.5 Versionado de fórmula

`TTM_FORMULA_VERSION = 'ttm_v1.0'` (constant futura). Bump cuando emerja modificación de la jerarquía source priority (e.g. agregar Frame.io as source #2 cuando integration shippee).

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `campaign.id` | `greenhouse_marketing.campaigns.campaign_id` | primitivo | identificador canonical |
| `BCS_V1.md` score + processed_at | `ico_engine.ai_metric_scores` | derivado AI | source #1 observed para start_date |
| First task in `briefing` phase | `greenhouse_delivery.tasks` filtrado por csc_phase | derivado | source #2 proxy start |
| `delivery_projects.start_date` / `end_date` | `greenhouse_delivery.projects` | primitivo | source #3+ proxy |
| `campaign.actual_start_date` / `actual_launch_date` / `planned_start_date` / `planned_launch_date` | `greenhouse_marketing.campaigns` | primitivo | sources varios |
| First task with activation evidence | `greenhouse_delivery.tasks` con status publicación | derivado | source #2 proxy activation |

### 3.1 Boundary canonical

- **Notion** captura: status tasks (`briefing`, `publicado`), `start_date`, `end_date`
- **Cliente / HubSpot** captura: `campaign.actual_launch_date`, `planned_launch_date`
- **Greenhouse AI agent** computa: BCS score → habilita evento `brief efectivo` observed
- **Greenhouse** computa: TTM via source priority resolver per-campaign
- **Greenhouse devuelve a Notion / HubSpot**: V2 podría writeback `[GH] TTM días` a campaign property — V1 NO priorizado

### 3.2 Cross-invariante con BCS

Per `BCS_V1.md` §6.3: BCS auditado pass es **prerequisito** para TTM start `observed`. Sin BCS → TTM degrada a `proxy`.

**Implicación operativa**: cliente que quiere TTM observed (input firme a Revenue Enabled palanca 1) debe asegurar briefs auditables (TASK-910 activa AI backend → más BCS observed → más TTM observed).

---

## 4. Helper canonical (per-campaign compute)

| Helper | File | Status |
|---|---|---|
| `resolveTimeToMarketMetric({startCandidates, activationCandidates})` | `src/lib/ico-engine/time-to-market.ts:94+` | Implemented (TASK-218 SHIPPED) |
| Consumer wiring | `src/lib/campaigns/campaign-metrics.ts` | Implemented |

### 4.1 Signature canonical V1

```typescript
import 'server-only'

export type TimeToMarketDataStatus = 'available' | 'degraded' | 'unavailable'
export type TimeToMarketConfidenceLevel = 'high' | 'medium' | 'low'
export type TimeToMarketEvidenceMode = 'observed' | 'proxy' | 'planned' | 'missing'

export interface TimeToMarketCandidate {
  date: string | null
  label: string
  source: string
  mode: Exclude<TimeToMarketEvidenceMode, 'missing'>
}

export interface TimeToMarketEvidence {
  date: string | null
  label: string | null
  source: string | null
  mode: TimeToMarketEvidenceMode
}

export interface TimeToMarketMetric {
  valueDays: number | null
  dataStatus: TimeToMarketDataStatus
  confidenceLevel: TimeToMarketConfidenceLevel | null
  start: TimeToMarketEvidence
  activation: TimeToMarketEvidence
  qualityGateReasons: string[]
}

export const resolveTimeToMarketMetric = (input: {
  startCandidates: TimeToMarketCandidate[]
  activationCandidates: TimeToMarketCandidate[]
}): TimeToMarketMetric
```

### 4.2 Tests anti-regresión

`src/lib/ico-engine/time-to-market.test.ts` cubre:

- Happy observed: start=BCS observed + activation=actual_launch_date → `dataStatus='available'`, confidence='high'
- Degraded: start=proxy + activation=planned → `dataStatus='degraded'`, confidence='medium'
- Unavailable: missing either side → `dataStatus='unavailable'`
- Inconsistente: activation < start (data corrupta) → `dataStatus='unavailable'` + qualityGateReason
- Source priority cascade: si source #1 missing, salta a #2, etc.

---

## 5. Agregado canonical

**NO está en `metric-registry.ts`**. TTM es métrica per-campaign — no aggregate per-member-month como métricas operacionales.

Consumer la invoca via `resolveTimeToMarketMetric` desde helper standalone.

### 5.1 Materialización futura

Si V2 emerge demanda de aggregate (e.g. "TTM promedio per cliente Q4"), evaluar:

- Agregado per-cliente per-período
- Threshold zones canonicales
- Persistencia en `campaign_metrics` table

Por ahora helper standalone suficiente.

---

## 6. Semántica de casos edge

| Escenario | TTM resultado |
|---|---|
| Campaign con BCS observed + actual_launch_date | `valueDays=N, dataStatus='available', confidence='high'` |
| Campaign sin BCS pero con first task briefing + actual_launch_date | `valueDays=N, dataStatus='degraded' (start proxy)` |
| Campaign con planned dates only | `valueDays=N, dataStatus='degraded' (planned mode)` |
| Campaign sin start data + sin activation data | `valueDays=null, dataStatus='unavailable'` |
| Campaign con activation < start (data corrupta) | `valueDays=null, dataStatus='unavailable', qualityGate reason flagged` |
| Campaign activación pendiente (planned future, no actual aún) | `valueDays=null o "running"` — V1 retorna unavailable hasta actual_launch_date llegue |

### 6.1 V1 mostly degraded mode

V1 la mayoría de campaigns retornan `dataStatus='degraded'` porque BCS scoring backend NO está activo (TASK-910 pendiente). Esto es **honesto** — `proxy` correctamente comunicado a consumers.

Cliente que ve TTM `degraded` recibe: "Time-to-Market estimado por evidencia operativa proxy. Para Time-to-Market `observed`, requerimos briefs auditados (intake formalizado)."

### 6.2 Cross-invariante con palanca 1 Revenue Enabled

Per `Contrato_Metricas_ICO_v1.md` §2.5 (policy observed/range/estimated):

- TTM `observed` → palanca 1 Early Launch Advantage puede reportarse como **observed revenue enabled**
- TTM `degraded` → palanca 1 reporta como **range** (banda con buffer)
- TTM `unavailable` → palanca 1 NO se reporta o se reporta como **estimated** con disclaimer

---

## 7. Estados / dataStatus

| dataStatus | evidenceMode | confidenceLevel | UI |
|---|---|---|---|
| `available` | `observed` (both sides) | `high` | TTM valor + threshold zone + claim Revenue Enabled observed |
| `degraded` | `proxy` (alguno) | `medium` | TTM valor + indicador "(proxy operativo)" |
| `degraded` | `planned` (alguno) | `low` | TTM valor + indicador "(estimado, sin actual)" |
| `unavailable` | `missing` (alguno) | `null` | `—` |

---

## 8. Threshold canonical + benchmark

**N.A. V1 sin threshold canonical fijo**. TTM varía mucho per tipo de campaign (banner → 7d ideal; campaign integrada multi-asset → 30d normal; rebrand portfolio → 90d+ normal).

Interpretación contextual:

- Banner / single-asset: target ≤ 14 días
- Campaign multi-asset performance: target ≤ 30 días
- Campaign integrada (estrategia + producción + activación): target ≤ 45 días
- Rebrand / portfolio refresh: 60-120 días normal

V2 con suficiente data per cliente puede calibrar threshold per campaign_type.

### 8.1 Benchmark externo

Industria creative-tech LATAM: median TTM ~21 días para campañas estándar. Globe target operativo ≤ 14 días para single-asset campaigns para diferenciarse.

---

## 9. Writeback a Notion / HubSpot

| Aspecto | Valor |
|---|---|
| Target property | `[GH] TTM días` (number) + `[GH] TTM mode` (select observed/proxy/planned) — V2 si emerge demanda |
| Estado actual | `not_implemented` |
| Task de writeback | TASK derivada futura (post BCS backend activo + TTM data significativa) |
| Rationale V1 NO writeback | Mayoría campaigns en `degraded` V1 — writeback de degraded data no agrega valor operativo. Cuando V2 mayoría sea observed, justifica writeback. |

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 spec created (canoniza TASK-218 policy)

- Spec canonical creado documentando el helper existente + source priority desde TASK-218.
- **Decisión canonical**: TTM vive como helper per-campaign standalone (`src/lib/ico-engine/time-to-market.ts`), consumer wiring en `src/lib/campaigns/campaign-metrics.ts`. NO en registry runtime — métrica per-campaign Revenue Enabled.
- **Source priority canonical**: 6 sources para start_date (BCS observed → first briefing task → ...), 4 sources para activation_date (actual_launch → ...).
- **Cross-invariante BCS**: BCS pass habilita TTM start observed. Sin BCS → TTM degrada a proxy.
- **V1 mostly degraded**: BCS backend pendiente TASK-910 → la mayoría campaigns en `proxy` honestamente.

### 2026-04-04 — TASK-218 source policy original

- Source policy formalizada en `Contrato_Metricas_ICO_v1.md` Delta 2026-04-04.
- Helper implementado `src/lib/ico-engine/time-to-market.ts`.
- Anti-patrón legacy bloqueado: NO inferir TTM solo desde OTD (TTM mide cliente-side launch, OTD mide deadline-side delivery — métricas distintas).

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas Revenue Enabled palancas**:
  - [BCS_V1.md](BCS_V1.md) — BCS habilita TTM start observed (cross-invariante crítica)
  - [ITERATION_VELOCITY_V1.md](ITERATION_VELOCITY_V1.md) — palanca 2 Revenue Enabled hermana
- **Tasks**: TASK-218 (source policy original) · TASK-220 (BCS contract, cross-invariante) · TASK-910 (futura — BCS backend activa más TTM observed) · TASK-222 (CVR contrato)
- **Código**:
  - Helper canonical: `src/lib/ico-engine/time-to-market.ts` (IMPLEMENTED)
  - Tests: `src/lib/ico-engine/time-to-market.test.ts`
  - Consumer per-campaign: `src/lib/campaigns/campaign-metrics.ts`
  - Consumer Revenue Enabled: `src/lib/ico-engine/revenue-enabled.ts`
- **Docs reference**:
  - Contrato Delta 2026-04-04 (source policy TASK-218)
  - Contrato §2.3 palanca 1 Early Launch Advantage de Revenue Enabled
  - Contrato §2.5 policy observed/range/estimated

---

## 12. Open questions deliberadamente NO resueltas en V1

- **BCS backend activation** (TASK-910): habilita mayoría TTM observed. V1 mayoría proxy.
- **Frame.io / ad platform integration**: V2 podría agregar source #N de activation_date desde ad platform (e.g. Meta Ads `launch_date`).
- **Threshold canonical operacional**: V1 sin threshold. V2 con calibración per campaign_type.
- **Per-cliente customization**: V1 uniforme. V2 si cliente enterprise pide SLA TTM específico.
- **TTM per asset vs per campaign**: V1 per-campaign. ¿Necesario per-asset breakdown (cuándo se activó cada variante del A/B)? Probable NO — es métrica per-campaign por construcción.
- **Writeback property**: V1 NO. V2 cuando data significativa.
- **Aggregate per cliente / período**: V1 per-campaign only. V2 si emerge demanda comparativa.
- **TTM rolling vs absolute**: V1 absolute per-campaign. V2 rolling 90d per-cliente para early-detection trends.
- **TTM real-time** durante campaign en curso: V1 retorna unavailable hasta activation. ¿UI mostrar "running TTM"? Decisión cuando emerja consumer.
