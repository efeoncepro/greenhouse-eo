# TASK-594 — Pipeline observability + SLIs + meta-alertas (EPIC-006 child 5/8)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-006`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-591`
- Branch: `task/TASK-594-ico-signals-pipeline-observability`

## Summary

Instrumentar la capa de signals como un sistema alertable por sí mismo. Panel en Admin Ops Health con SLIs (freshness, materialize latency, enrichment latency, MTTA, MTTR, auto-resolve rate, detection stability). Meta-alertas cuando un SLI viola umbral (ej. volumen de signals ±3σ, p95 latencia > 5 min). Reusa infra de `source_sync_runs` y TASK-586 cuando aplique.

## Why This Task Exists

Hoy nadie sabe si la capa de signals está sana. Si el detector deja de fire por un bug, el sistema queda silencioso y el equipo no se entera hasta que un humano nota falta de alertas. Enterprise-grade exige observabilidad self-service del propio pipeline, con SLIs y meta-alertas escalables.

## Goal

- Panel SLIs de ICO signals en Admin Ops Health.
- Tabla `materialize_runs` (de TASK-590) consultable por tenant + rango de fechas.
- Meta-alertas a Slack/Ops Health cuando SLI viola umbral.
- SLIs mínimos: freshness (<24h), materialize latency (<5min p95), enrichment latency (<15min p95), MTTA (<4h critical), MTTR (<48h critical), auto-resolve rate (20-70%), detection stability (±3σ day-over-day).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ICO_ENGINE_V2.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`

## Dependencies & Impact

### Depends on
- `TASK-591` — `materialize_runs` se puebla desde reconcile.
- `TASK-593` — latencias de enrichment y quality se emiten.

### Blocks / Impacts
- TASK-586 — comparte Ops Health surface.
- No bloquea a nadie.

### Files owned
- `src/lib/ico-engine/ai/sli.ts` (computadora de SLIs)
- `src/views/greenhouse/admin/ops-health/IcoSignalsHealthCard.tsx` (nuevo)
- `src/app/api/admin/ico-signals/health/route.ts`
- `src/lib/ops-health/ico-signals-meta-alerts.ts`
- Migración menor si se agrega tabla de alerts state.

## Current Repo State

### Already exists
- `Ops Health` dashboard (`src/views/greenhouse/admin/ops-health/*`).
- `source_sync_runs` table con patrón de runs + warnings.
- TASK-586 en backlog agrega observabilidad para Notion sync.

### Gap
- No hay panel específico de ICO signals health.
- No hay SLIs computados en ninguna parte.
- No hay meta-alertas.

## Scope

### Slice 1 — Computation de SLIs

- `computeIcoSignalsSLIs(space_id, range)` devuelve struct con todos los SLIs.
- Queries sobre `materialize_runs`, `signal_events`, `signals_v2`, `signal_enrichments_v2`.

### Slice 2 — API + Admin panel

- `GET /api/admin/ico-signals/health?space_id=X&range=30d` devuelve SLI snapshot.
- UI card en Ops Health con status por SLI (green/yellow/red) + links a detalle.
- Invocación skills: `greenhouse-dev` + `greenhouse-ux`.

### Slice 3 — Meta-alertas

- Cron `/api/cron/ico-signals-meta-alerts` corre cada 15min.
- Si un SLI viola umbral → emit evento (Slack + log operacional).
- Cooldown para evitar spam (1 alert por SLI por 2h).

### Slice 4 — Dashboard público interno

- Public URL protegida por RBAC `admin.ops_health` con grafana-like view de los últimos 30d.

## Out of Scope

- Integración con Datadog/Grafana externo (follow-up).
- SLIs por tenant individual en dashboard visible a cliente (solo internal).

## Acceptance Criteria

- [ ] 8 SLIs computados y mostrados en Ops Health.
- [ ] Meta-alerta en Slack cuando un SLI viola umbral.
- [ ] Panel accesible con RBAC correcto.
- [ ] `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` clean.

## Verification

- Manual: correr materialize, inducir un SLI alto, ver alert en Slack.
- Panel renderiza con data real en staging.

## Closing Protocol

- [ ] Lifecycle sincronizado.
- [ ] EPIC-006 child 5/8 marcado complete.

## Follow-ups

- Export de SLIs a Prometheus/Grafana si se consolida stack observability externo.
- Dashboard por tenant con SLIs customizados.
