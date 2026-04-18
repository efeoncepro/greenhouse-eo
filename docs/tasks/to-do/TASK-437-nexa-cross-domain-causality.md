# TASK-437 — Nexa Cross-Domain Causality Engine

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-432` + `TASK-433` + `TASK-434` (necesita al menos 2 dominios con engines estables + diversidad de signals)
- Branch: `task/TASK-437-nexa-cross-domain-causality`
- Legacy ID: —
- GitHub Issue: —
- Parent arch doc: `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` (follow-on cross-domain)

## Summary

Genera insights "meta" que conectan signals de 2+ dominios (Finance ↔ ICO ↔ Capacity ↔ Payroll) scoped al mismo space/client/period. Un LLM prompt recibe los enrichments de los dominios involucrados y produce una narrativa causal ("Margen del cliente X bajó 6pp porque OTD cayó 12pp, lo que coincide con sobrecarga de Capacity en el team principal"). Diferenciador técnico real vs herramientas single-domain.

## Why This Task Exists

Hoy los signals viven en silos: Finance ve márgenes, ICO ve OTD, Payroll ve anomalías de cierre. Un humano conecta los puntos mentalmente, pero:

- No escala — depende de memoria y atención del revisor.
- No persiste — la conexión no queda trazada en el portal.
- No se propaga — el líder de Finance ve su signal, no el de ICO.

Un engine cross-domain genera un insight meta cuando detecta correlación causal entre signals del mismo period/entity. Es diferenciador real: la mayoría de herramientas enterprise (Sprinklr, Brandwatch, ERPs) solo ven su dominio.

Esta task **no debe arrancarse** antes de que Payroll/Staff Aug estén operativos — con solo ICO + Finance, el valor agregado es moderado. Con 4 dominios activos, el valor es alto.

## Goal

- Detector cross-domain que identifica enrichments correlacionados: mismo period + overlap de scope (space, client, organization, member).
- Prompt LLM meta que recibe los enrichments correlacionados y produce narrativa causal.
- Materialización en tabla nueva `cross_domain_insights` con trazabilidad a los enrichments fuente.
- Surface: se muestran primero en Space 360 Overview y Client Portal Pulse (cuando aplique).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` — follow-on cross-domain.
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — patrón de engines.

Reglas obligatorias:

- Trazabilidad dura: el insight meta debe mantener referencia FK a los enrichments fuente. Si se borran los fuentes, se regenera o se marca stale.
- No se inventa causalidad: el prompt debe documentar explícitamente cuando la correlación es temporal y no causal.
- Advisory-only — el insight meta no ejecuta acciones.
- Severity del meta se deriva de la severity máxima de los enrichments fuente.
- Si no hay overlap suficiente de scope (menos de 2 dominios con signals en el mismo period/entity), no se genera insight meta.

## Normative Docs

- Readers existentes:
  - `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
  - `src/lib/finance/ai/llm-enrichment-reader.ts`
  - Los futuros de Payroll y Staff Aug.

## Dependencies & Impact

### Depends on

- `TASK-433` Payroll Signal Engine completado.
- `TASK-434` Staff Aug Signal Engine completado.
- `TASK-432` Client Portal Nexa Pulse (para poder emitir meta client-facing si aplica).
- Al menos 2 dominios activos con historial de signals.

### Blocks / Impacts

- Beneficia Client Portal Pulse, Space 360, Finance Dashboard, Home.
- Posible beneficio a push crítico (TASK-436) si se decide empujar metas de severity alta.

### Files owned

- Migración PG: `greenhouse_serving.cross_domain_ai_insights`
- `src/lib/nexa/cross-domain/` (nuevo) — correlator, LLM worker, reader
- Prompt template: `cross_domain_causality_v1.ts`
- Reader: `readCrossDomainAiInsights(scope, period)`
- Integración UI en surfaces existentes (meta insight como elemento destacado del block).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema

- Tabla `cross_domain_ai_insights`:
  - `meta_insight_id TEXT PRIMARY KEY` (`EO-META-*`)
  - `period_year INT NOT NULL`, `period_month INT NOT NULL`
  - `scope_type TEXT NOT NULL` (space, client, organization, member)
  - `scope_id TEXT NOT NULL`
  - `domains_involved TEXT[] NOT NULL` (ej: `['finance','ico','capacity']`)
  - `source_enrichment_ids TEXT[] NOT NULL`
  - `severity TEXT NOT NULL`
  - `narrative TEXT NOT NULL`
  - `confidence NUMERIC(3,2) NOT NULL`
  - `correlation_type TEXT NOT NULL` (`temporal`, `causal_hypothesis`, `mechanistic`)
  - `prompt_version TEXT NOT NULL`, `prompt_hash TEXT NOT NULL`
  - `status TEXT NOT NULL`, `processed_at TIMESTAMPTZ NOT NULL`
- Índices: `(scope_type, scope_id, period_year, period_month)`.

### Slice 2 — Correlator

- `src/lib/nexa/cross-domain/correlator.ts`:
  - Query: enrichments con status=succeeded del último período por `scope_type, scope_id`.
  - Agrupa por scope + period y detecta overlaps de 2+ dominios.
  - Para cada overlap, produce un candidato de meta insight.
- Heurística inicial: solo generar meta si el overlap tiene al menos 1 signal `critical` o 2+ `warning`.

### Slice 3 — LLM worker meta

- Prompt `cross_domain_causality_v1`:
  - Input: lista de enrichments fuente con sus métricas, severidades, narrativas.
  - Output: narrativa meta en formato estandarizado + clasificación `correlation_type`.
  - Regla clave: distinguir `temporal` (coincidencia en tiempo), `causal_hypothesis` (correlación + mecanismo plausible), `mechanistic` (conexión documentada en glosario del dominio).
- Glosario cross-domain: documentar conexiones conocidas (capacity overload → FTR drops → OTD drops → margin pressure).

### Slice 4 — Materialization

- Writer que persiste el meta insight + referencias FK a los enrichments fuente.
- Integración con outbox: `nexa.cross_domain_insight.materialized`.

### Slice 5 — Reader

- `readCrossDomainAiInsights(scope, period)` con filtros por dominios involucrados, severity.

### Slice 6 — UI integration

- `NexaInsightsBlock` admite un prop opcional `metaInsight` que se renderiza destacado arriba del listado.
- Visual: icono "meta" + listado de dominios involucrados como chips.
- Expandible: al hacer click, muestra los source enrichments.

### Slice 7 — Cross-domain governance

- Un insight meta que mezcla Finance (sensible) con Capacity (operativo) debe respetar el nivel de sensibilidad más alto. Si algún source enrichment tiene `client_visible=false`, el meta no es client-facing.

## Out of Scope

- Modelo ML de inferencia causal formal (do-calculus, DAG causal). Esta task usa LLM sobre correlaciones detectadas, no inferencia causal rigurosa.
- Meta insights con más de 4 dominios (primera iteración limitada a 2-3).
- Regeneración automática al cambiar un enrichment fuente (la regeneración es manual/scheduled).

## Acceptance Criteria

- [ ] Migración aplicada; tipos regenerados.
- [ ] Correlator genera candidatos correctos sobre dataset histórico.
- [ ] Worker LLM produce narrativas que clasifican correctamente `correlation_type`.
- [ ] Reader expone insights meta; UI los renderiza con trazabilidad a sources.
- [ ] Advisory-only: nunca ejecuta mutaciones.
- [ ] Validación manual con N=10 metas históricos junto a un líder de agencia.
- [ ] `pnpm build && pnpm lint && npx tsc --noEmit && pnpm test` pasan.

## Verification

- Tests unitarios del correlator (overlap detection, scope matching).
- Tests de integración: flujo completo desde enrichments existentes a meta insight materializado.
- Review manual de muestras LLM antes de activar en staging.

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con capítulo cross-domain.
- [ ] Actualizar `GREENHOUSE_NEXA_EXPANSION_V1.md` con follow-on cerrado.
- [ ] Registrar en `Handoff.md` y `changelog.md`.

## Open Questions

- ¿El scope overlap matching debe considerar jerarquía (member→team→space→client)? Recomendación: sí en v2, empezar en v1 con match exacto de `scope_type + scope_id`.
- ¿Frecuencia de generación? Post cada materialization de enrichments nuevos, o scheduled diario. Recomendación: scheduled diario para evitar thrashing.
- ¿Meta insights entran al Weekly Digest? Recomendación: sí, con prioridad alta — son los más valiosos.
