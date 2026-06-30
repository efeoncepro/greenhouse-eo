# Greenhouse — Finance AI Signal Source Of Truth (Decision V1)

> **Tipo:** ADR (Architecture Decision Record)
> **Status:** Accepted (storage semantics) — consumer enablement gated
> **Date:** 2026-06-23
> **Owner:** Finance + Nexa
> **Scope:** `src/lib/finance/ai/**`, `greenhouse_serving.finance_ai_*`, Nexa finance drill/actions, reliability `finance.ai.*`
> **Reversibility:** two-way-but-slow (cutover a event-log intra-período requiere ADR propio)
> **Confidence:** high
> **Validated as of:** 2026-06-23 (PG real: 3 tablas existen, 69 runs `succeeded`, 0 signals, 0 enrichments)
> **Task:** TASK-1201 (blocked-by TASK-1200 para el desbloqueo real de Nexa-finance)
> **Canonical doc consumido:** `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`, `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`, `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

## Context

El audit `docs/audits/finance/FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20.md` (hallazgo FD-7) reportó
enrichment runs sin señales persistidas utilizables. Verificado contra PG real el 2026-06-23:

| Check | Resultado |
|---|---:|
| `greenhouse_serving.finance_ai_enrichment_runs` | 69 (todos `status='succeeded'`) |
| `greenhouse_serving.finance_ai_signals` | 0 |
| `greenhouse_serving.finance_ai_signal_enrichments` | 0 |

Diagnóstico de causa raíz (no cosmético):

1. **Run-truth deshonesto.** `materializeFinanceAiLlmEnrichments` (`src/lib/finance/ai/llm-enrichment-worker.ts`)
   computaba `status='succeeded'` cuando `signals.length === 0` (nada que enriquecer).
   El worker se invoca sin gate de señales desde `services/ico-batch/server.ts` (`/finance/llm-enrich`),
   produciendo runs `succeeded` que no enriquecieron nada. Viola la regla CLAUDE.md
   "un run que ve data cruda elegible pero materializa 0 records nunca es `succeeded`".
2. **Reader-honesty deshonesto.** `resolveFinanceNexaInsightsDataStatus` usaba
   `MAX(started_at)` de `finance_ai_enrichment_runs` como "lastCronRun", pero el paso de
   enrichment SOLO corre cuando `signalsWritten > 0` (`src/app/api/cron/finance-ai-signals/route.ts`).
   Un período sano sin anomalías (el anomaly materializer corrió y produjo 0 señales) NO dejaba
   run de enrichment → el reader reportaba `empty-pending` ("el cron aún no corrió") cuando la
   verdad era `empty-positive`. **Faltaba provenance del paso de materialización (anomaly step).**
3. **SoT no explícita.** No había una decisión documentada de qué es la fuente de verdad
   durable de Finance AI signals; sin eso, Nexa podía hablar con confianza sobre una capa que
   efectivamente está vacía.

Adicionalmente, `client_economics` (input del anomaly detector) tiene revenue/costo 0 en períodos
recientes — el gap que cierra **TASK-1200**. Por eso Finance AI no debe afirmar margen como insight
canónico hasta que la cobertura de costo sea confiable.

## Decision

**1. Fuente de verdad (SoT) de Finance AI signals = snapshot por-período + ledger de provenance append-only.**

- **Señales** (`greenhouse_serving.finance_ai_signals`) y **enrichments**
  (`greenhouse_serving.finance_ai_signal_enrichments`) son **snapshots por-período**:
  semántica replace-current-period (DELETE del período + INSERT), idempotente ante re-runs del
  mismo mes, **sin** borrar períodos cerrados. Representan "el estado vigente de anomalías/insights
  del período X", derivado de `client_economics`.
- **Provenance** es un **ledger append-only**:
  - `greenhouse_serving.finance_ai_enrichment_runs` — ya append-only de facto
    (`stableFinanceRunId` incluye `Date.now()` → `run_id` único por ejecución).
  - `greenhouse_serving.finance_ai_materialization_runs` — **nueva** (TASK-1201): provenance del
    paso de anomaly-materialization. Append-only, una fila por ejecución, con
    `snapshots_evaluated`, `signals_written`, `status` honesto y timestamps. Es lo que permite al
    reader distinguir `empty-positive` (corrió, economics elegible, 0 anomalías) de `empty-pending`
    (nunca corrió o economics no listo).

**2. Run-truth honesto.** Una ejecución que ve 0 señales NO es `succeeded`:
- El anomaly materializer registra status `succeeded` (≥1 señal), `empty_positive`
  (`snapshots_evaluated > 0` y 0 señales), `skipped_no_eligible_data` (`snapshots_evaluated = 0`),
  o `failed` (excepción).
- El LLM enrichment worker, ante `signalsSeen === 0`, **no persiste un run engañoso**: corta y
  retorna `run: null` (no hubo enrichment). El run de enrichment solo existe cuando enrichment
  realmente corrió sobre ≥1 señal.

**3. Reader/status honesto (un solo contrato, Full API parity).**
`readFinanceAiLlmSummary` / `readClientFinanceAiLlmSummary` (`src/lib/finance/ai/llm-enrichment-reader.ts`)
son el único contrato server-side; UI y Nexa son consumers del MISMO reader. El estado
`dataStatus` deriva de la provenance de materialización (anomaly step) + conteo de señales/insights,
distinguiendo `ready` | `empty-positive` | `empty-pending` | `stale-degraded`.

**4. Consumer Nexa-finance gated.** Nexa finance drill/actions quedan **bloqueados** hasta que:
(a) el `dataStatus` del período sea `ready`, **y** (b) la cobertura de costo de TASK-1200 sea sana
(`finance.operational_pl.cost_coverage_degraded` en steady). Mientras tanto los consumers degradan
honestamente; no se genera ningún insight finance en UI ni en Nexa sin señal durable.

**5. Reliability heartbeat.** `finance.ai.signals.stale_materialization` (moduleKey `finance`,
kind `lag`, steady=ok) detecta cuando el anomaly step quedó stale (>24h con economics elegible) o
falló — el síntoma "finance AI no-signal with eligible data" del risk matrix.

## Alternatives Considered

- **Full append-only event log intra-período (ICO TASK-943 parity, `*_current` VIEW
  latest-per-signal).** Da evolución intra-período ("qué se vio el día 5 vs el día 20"). **Rechazada
  por ahora**: (a) es un cutover de mayor blast-radius (migración + VIEW + reescritura de
  materializer/reader/tests) que la spec exige envolver en su propio ADR; (b) NO es lo que cierra
  el hallazgo del audit (el gap es "0 señales durables + runs deshonestos", no "falta historia
  intra-período"); (c) `finance_ai_enrichment_runs` ya es append-only de facto, así que la
  provenance no se pierde. Queda como **follow-up** (TASK-948+), condicionado al "Revisit When".
- **Repurposear `finance_ai_enrichment_runs` para provenance del anomaly step** (discriminando por
  `source`). Rechazada: sobrecarga semántica de columnas (`signals_seen` significaría cosas
  distintas por `source`) y confunde al reader. Una tabla dedicada es más honesta y la migración
  es additive (clase de riesgo más baja).
- **Que el worker escriba un run `noop` en DB.** Rechazada: la provenance del "corrió, 0 señales"
  ya vive en `finance_ai_materialization_runs`; un run de enrichment debe significar "enrichment
  realmente corrió", no contaminarse con noops.

## Consequences

**Beneficios:**
- Nexa/UI no pueden afirmar insights finance sin señal durable + status `ready`.
- El estado `empty-positive` (salud, sin anomalías) deja de confundirse con `empty-pending`
  (pipeline no corrió) ni con `degraded` (pipeline roto).
- Provenance auditable del anomaly step (append-only, audit-grade: NO DELETE).
- Heartbeat reliability hace observable el "no-signal with eligible data".

**Costos / riesgos:**
- Una tabla additive nueva (`finance_ai_materialization_runs`) + regen de `db.d.ts`.
- El reader cambia su fuente de `lastCronRun` (de enrichment runs → materialization runs);
  cubierto por tests.

**Runtime Contract (fuente de verdad):**
- Snapshot señales: `greenhouse_serving.finance_ai_signals` (escrito por `materializeFinanceSignals`).
- Snapshot enrichments: `greenhouse_serving.finance_ai_signal_enrichments` (escrito por el worker).
- Provenance ledger: `greenhouse_serving.finance_ai_enrichment_runs` (enrichment) +
  `greenhouse_serving.finance_ai_materialization_runs` (anomaly step).
- Reader único: `readFinanceAiLlmSummary` / `readClientFinanceAiLlmSummary`.
- Status: `resolveFinanceNexaInsightsDataStatus`.
- Heartbeat: `finance.ai.signals.stale_materialization`.

## Revisit When

- Se necesite evolución intra-período de señales finance (un consumer pide "qué señales aplicaban
  el día N del mes") → promover al event-log append-only (ICO TASK-943 parity) vía ADR de cutover.
- TASK-1200 cierre y la cobertura de costo sea confiable → desbloquear Nexa finance drill/actions
  (Slice 4 enablement), removiendo el gate conservador.
- El volumen de señales por período crezca al punto de necesitar particionado/retención.
