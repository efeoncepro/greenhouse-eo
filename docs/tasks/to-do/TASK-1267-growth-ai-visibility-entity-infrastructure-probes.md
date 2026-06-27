# TASK-1267 — Growth AI Visibility: Entity Infrastructure Probes (Knowledge Graph / Wikidata / Reddit-UGC)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|integrations|reliability`
- Blocked by: `TASK-1266`
- Branch: `task/TASK-1267-growth-ai-visibility-entity-infrastructure-probes`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`entity_clarity` se puntúa hoy solo desde percepción de los answer engines. Esta task agrega probes read-only del **backbone real de entidad** de la marca — Google Knowledge Graph / Knowledge Panel, Wikidata/Wikipedia, presencia en Reddit (fuente top de citas de ChatGPT) — como evidencia que explica *por qué* la entidad está difusa, reusando el probe gatherer de TASK-1266.

## Why This Task Exists

En 2026 los motores razonan por entidades, y las **menciones de marca pesan ~3× los backlinks** para visibilidad IA (skill `seo-aeo`). Hoy el grader infiere `entity_clarity` de lo que dicen los motores, pero nunca verifica si la marca tiene entrada en Wikidata, Knowledge Panel en Google o presencia en Reddit — la infraestructura que *causa* (o no) que los motores la entiendan. Sin esto, la recomendación de "construir entidad" es genérica; con esto es específica ("no tienes entrada en Wikidata").

## Goal

- Probes read-only del backbone de entidad: Google Knowledge Graph API, Wikidata/Wikipedia, presencia en Reddit y otras fuentes UGC top.
- Enriquecer la evidencia de `entity_clarity` (y/o el eje structural readiness de TASK-1266) con señales de entidad reales, no solo percepción.
- Honest degradation por fuente: API/probe no disponible → `null` + razón, nunca 0.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §6 gatherers, §7 scoring, §13 privacy/security.
- `docs/tasks/to-do/TASK-1266-growth-ai-visibility-site-readiness-probe-layer.md` — probe gatherer substrate (reusar, no paralelizar).
- `docs/tasks/complete/TASK-1227-growth-ai-visibility-normalization-scoring-engine.md` — `entity_clarity` scoring + honest degradation.
- Skill `seo-aeo` — módulo `03_EEAT_ENTITY` (entidad / Knowledge Graph) + `05_OFFPAGE_AUTHORITY` (Reddit/UGC, menciones > backlinks).

Reglas obligatorias:

- **Reusar el probe gatherer de TASK-1266**, NUNCA un segundo gatherer paralelo. Estos son probes de entidad dentro del mismo substrate.
- **Read-only sobre superficies/APIs públicas:** Knowledge Graph API (key gobernada), Wikidata/Wikipedia API públicas, Reddit search público. Cero auth privada, cero scraping agresivo; respetar rate-limits y ToS de cada fuente.
- **Honest degradation:** fuente caída o sin match → `null` + razón, excluida; nunca 0 (no confundir "no medible" con "ausente").
- **No PII:** solo el nombre/dominio de la marca; nunca datos del lead.
- **Secret hygiene:** API keys (Knowledge Graph) vía `*_SECRET_REF` + Secret Manager.

## Normative Docs

- `docs/epics/to-do/EPIC-020-public-ai-visibility-lead-magnet-program.md`
- `src/lib/growth/ai-visibility/probes/` [de TASK-1266]
- `src/lib/growth/ai-visibility/scoring/config.ts` [verificar `entity_clarity`]

## Dependencies & Impact

### Depends on

- `TASK-1266` — probe gatherer substrate + persistencia de probe results.
- `TASK-1227` — scoring de `entity_clarity` + honest degradation.

### Blocks / Impacts

- Enriquece las recomendaciones de entidad (consumidas por `TASK-1269` fix-it).
- Mejora la accionabilidad del eje de percepción `entity_clarity`.

### Files owned

- `src/lib/growth/ai-visibility/probes/entity-knowledge-graph.ts` [nuevo]
- `src/lib/growth/ai-visibility/probes/entity-wikidata.ts` [nuevo]
- `src/lib/growth/ai-visibility/probes/entity-reddit-ugc.ts` [nuevo]
- `src/lib/growth/ai-visibility/flags.ts` [extender]
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- `entity_clarity` como dimensión de percepción (TASK-1227).
- Probe gatherer substrate (TASK-1266, dependencia).

### Gap

- Cero verificación del backbone real de entidad (Knowledge Graph, Wikidata, Reddit).
- Recomendaciones de entidad genéricas por falta de señal de infraestructura.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: probe gatherer (TASK-1266) + evidencia de `entity_clarity`
- Consumidores afectados: scoring, report builder, recomendaciones, public lead magnet
- Runtime target: `staging|production|worker|external`

### Contract surface

- Contrato existente a respetar: probe interface de TASK-1266, scoring config de TASK-1227.
- Contrato nuevo o modificado: 3 probes de entidad + su contribución a la evidencia de `entity_clarity` / structural readiness.
- Backward compatibility: `gated` (probes detrás de flag; scoring existente intacto sin la evidencia nueva).
- Full API parity: probes server-side reusables; "verificar entidad de este dominio" es capability gobernada.

### Data model and invariants

- Entidades/tablas/views afectadas: `grader_probe_results` (de TASK-1266) [verificar].
- Invariantes que no se pueden romper:
  - Fuente no medible → `null` + razón, nunca 0.
  - Read-only sobre APIs/superficies públicas; respetar ToS/rate-limit de cada fuente.
  - El probe de entidad enriquece evidencia, no inventa un score paralelo nuevo fuera del marco de TASK-1266.
- Tenant/space boundary: dominio público; sin PII del lead.
- Idempotency/concurrency: probe por `(run_id, probe_kind)`; idempotente.
- Audit/outbox/history: probe results append-only; signal de probe failure.

### Migration, backfill and rollout

- Migration posture: `none` (reusa la tabla de TASK-1266) [verificar].
- Default state: `flag OFF` (`GROWTH_AI_VISIBILITY_ENTITY_PROBES_ENABLED`).
- Backfill plan: N/A.
- Rollback path: flag OFF + redeploy.
- External coordination: Knowledge Graph API key + Reddit API access en Secret Manager.

### Security and access

- Auth/access gate: probes server-side / worker.
- Sensitive data posture: sin PII; solo marca/dominio.
- Error contract: errores de fuente sanitizados (`captureWithDomain`); honest degradation.
- Abuse/rate-limit posture: rate-limit por fuente + timeout + circuit breaker.

### Runtime evidence

- Local checks: `pnpm test` focal de cada probe (incl. honest degradation).
- DB/runtime checks: run real sobre una marca con Knowledge Panel conocido + verificar probe result.
- Integration checks: smoke de Knowledge Graph API + Wikidata + Reddit search.
- Reliability signals/logs: `growth.grader.probe.failure_rate` (compartido con TASK-1266).
- Production verification sequence: shadow staging → run sobre marca conocida → flip flag → smoke prod.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Knowledge Graph + Wikidata probes

- Probe de Google Knowledge Graph API (¿la marca es entidad conocida? tipo, descripción) + probe de Wikidata/Wikipedia (¿tiene entrada?).
- Contribución a la evidencia de `entity_clarity` con honest degradation.

### Slice 2 — Reddit / UGC presence probe + signal + ledger

- Probe de presencia en Reddit (menciones de la marca en subreddits relevantes) y otras fuentes UGC top de citas.
- Wiring a la evidencia + fila por flag en `FEATURE_FLAG_STATE_LEDGER.md`.

## Out of Scope

- Render del detalle de entidad en el report (gobernado por TASK-1252).
- Construir el probe gatherer substrate (es TASK-1266).
- Generar el artefacto de remediación de entidad (es TASK-1269).

## Detailed Spec

Cada probe consulta una fuente pública de entidad y devuelve un `ProbeResult` con la señal cruda (¿hay entrada Wikidata? ¿Knowledge Panel? ¿cuántas menciones en Reddit?) + un score/aporte. Estas señales son la **causa** que el eje de percepción solo ve reflejada: una marca sin entrada en Wikidata ni Knowledge Panel casi siempre tiene `entity_clarity` bajo en los motores. El probe lo confirma con evidencia verificable y habilita una recomendación específica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Requiere TASK-1266 cerrado (substrate). Slice 1 (KG/Wikidata) → Slice 2 (Reddit/UGC). Sin orden interno crítico entre fuentes más allá de reusar el substrate.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| ToS/rate-limit de Reddit/Wikidata | integration/legal | medium | API oficial + rate-limit + backoff; no scraping agresivo | probe failure_rate |
| Fuente sin match reportada como 0 | data quality | medium | honest degradation `null`+razón | dimensión `null` rate |
| Knowledge Graph API key mal resuelta | security | low | `*_SECRET_REF` + verificar consumer | probe "not configured" |
| Falso negativo de entidad (marca homónima) | data quality | medium | desambiguar por dominio/sitio, no solo por nombre | manual review de evidencia |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_ENTITY_PROBES_ENABLED` (default `false`). Flip tras shadow staging. Revert: flag OFF + redeploy. <5 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag OFF / revert PR | <5 min | si |
| Slice 2 | flag OFF / revert PR | <5 min | si |

### Production verification sequence

1. Publicar keys (Knowledge Graph, Reddit) en Secret Manager + grant.
2. Flip flag staging + run sobre marca con Knowledge Panel conocido + verificar evidencia.
3. Verificar honest degradation con una marca sin entrada Wikidata.
4. Flip prod + smoke low-volume + signals steady.

### Out-of-band coordination required

- API keys de Knowledge Graph + Reddit (o acceso equivalente) en Secret Manager.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Probes de Knowledge Graph, Wikidata y Reddit corren dentro del probe gatherer de TASK-1266 (sin gatherer paralelo).
- [ ] Cada probe produce evidencia con honest degradation `null≠0`.
- [ ] Read-only sobre APIs/superficies públicas; rate-limit + timeout por fuente.
- [ ] Desambiguación por dominio/sitio, no solo por nombre de marca.
- [ ] API keys vía `*_SECRET_REF`; cero hardcode.
- [ ] Fila por flag en `FEATURE_FLAG_STATE_LEDGER.md`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Run real sobre marca conocida en staging + verificación PG de la evidencia

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1266 substrate, TASK-1269 fix-it)
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` actualizado

## Follow-ups

- Considerar más fuentes UGC (YouTube, foros de industria) si el eval muestra que mueven citas.

## Open Questions

1. ¿Reddit vía API oficial (rate-limited/paga) o búsqueda pública acotada? Propuesta: API oficial con rate-limit; degradar honesto si no hay quota.
