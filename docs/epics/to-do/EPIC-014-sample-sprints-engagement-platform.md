# EPIC-014 — Sample Sprints Engagement Platform

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `epic`
- Status real: `Diseño aprobado`
- Domain: `commercial`
- Branch convention: `task/TASK-{801..810}-*`
- Spec canónica: `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` (V1.2 — Score 4-pilar 9.0/10)

## Summary

Materializa la primitiva canónica **Sample Sprint** (paraguas comercial UI) sobre `services` con `engagement_kind != 'regular'`. Permite ofrecer pilotos / trials / POCs / discoveries acotados en tiempo, sin compromiso firme, con gobierno explícito de aprobación + capacity warning + audit trail append-only + reclasificación de costo GTM. Reusa toda la plomería canonizada (cost attribution v2, lifecycle history TASK-535/542, outbox + reactive consumer TASK-771/773, asset uploader TASK-721, FK actor TASK-760/761/762).

## Why This Epic Exists

Hoy los Sample Sprints (Sky Content Lead + Paid Social Care, abril-mayo 2026) viven sin schema canónico: sin governance de aprobación, sin reliability signals para detectar zombies, sin reclasificación de costo (Sky aparece como cliente unprofitable durante el Sprint), sin audit trail de decisiones, sin lineage entre Sprint y contrato post-conversión. Cada Sprint nuevo arranca con tracking ad-hoc y deja deuda al cierre. La arquitectura actual de `services` no distingue "servicio facturable" de "servicio en evaluación" — por eso este Epic introduce la dimensión `engagement_kind` ortogonal a `commercial_terms` ortogonal a `lifecycle_phase`.

## Goal

- Permitir declarar Sample Sprints (4 sub-tipos: Operations / Extension / Validation / Discovery) sin crear identidades paralelas al canónico 360.
- Gobernar aprobación con capacity warning + override audit + cost ceiling.
- Track progress semanal con snapshots forensic-friendly (pre-condición para auto-report V2).
- Documentar outcome (converted / adjusted / dropped / cancelled_by_client / cancelled_by_provider) con cancellation_reason cuando aplica.
- Conversión piloto → contrato atómica vía outbox + reactive consumer (lifecycle flip + HubSpot conditional).
- Reclasificación de costo GTM read-time vía VIEW canónica (Sky no aparece unprofitable).
- 6 reliability signals bajo subsystem nuevo `Commercial Health` para detección zombie / overdue / budget overrun / unapproved active / conversion drop / stale progress.

## Architecture Alignment

Spec canónica raíz:

- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` (V1.2)

Specs subordinadas / referenciadas:

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — extender canónico, no paralelar
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — TASK-535/542 lifecycle history canónico
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` — Sample Sprints viven en Commercial
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md` — extender con `attribution_intent`
- `docs/architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md` — patrón TASK-742 7-capas
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry + subsystem rollup
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — 9 outbox events nuevos v1

Patrones canónicos reusados:

- TASK-409 — extender `client_economics` con backfill desde `commercial_cost_attribution`
- TASK-535/542 — lifecycle history append-only con source/by/since
- TASK-571/699/766/774 — VIEW canónica + helper + reliability signal
- TASK-672 — subsystem reliability registry (Finance Data Quality precedent → Commercial Health nuevo)
- TASK-700/765 — state machine + audit log append-only + CHECK constraint
- TASK-708/766/774 — NOT VALID + VALIDATE atomic
- TASK-721 — canonical asset uploader
- TASK-742 — defensa 7 capas
- TASK-760/761/762 — FK actor pattern (TEXT + ON DELETE SET NULL)
- TASK-768 — dimensión analítica separada con resolver + manual queue
- TASK-771/773 — outbox + reactive consumer + dead_letter

Reglas obligatorias:

- Schema interno usa prefijo `engagement_*` (genérico). UI brand "Sample Sprint" no requiere migrations al renombrar.
- Capabilities `commercial.engagement.*`. Outbox events `service.engagement.*_v1`.
- Reliability signals bajo subsystem nuevo `Commercial Health`.
- 16 hard rules anti-regresión declaradas en spec V1.2 §12.

## Decisiones de alcance V1 (auto-resueltas con criterio safe/robust/resilient/scalable)

- **B1 Naming**: híbrido — schema genérico + UI marketing.
- **B2 Notificaciones cliente**: diferidas a V2 (V1 manual).
- **B3 Progress snapshots**: incluidos como primitiva canónica (Slice 4.5).
- **B4 Capacity warning**: soft (warning + override audit, no blocker).
- **B5 Auto-reporte**: manual upload V1 con structured fields (input para V2).

## Children (10 tasks — slices del roadmap §11)

1. **TASK-801** — Engagement primitive: `services.engagement_kind` + `commitment_terms_json` + `client_team_assignments.service_id` + `attribution_intent` (v1+v2 cost attribution)
2. **TASK-802** — `engagement_commercial_terms` time-versioned + helper `getActiveCommercialTerms`
3. **TASK-803** — `engagement_phases` + `engagement_outcomes` (cancellation_reason + next_quotation_id) + `engagement_lineage`
4. **TASK-804** — `engagement_approvals` workflow + capability `commercial.engagement.approve` + helper `getMemberCapacityForPeriod`
5. **TASK-805** — `engagement_progress_snapshots` + capability `commercial.engagement.record_progress` + reliability signal `stale_progress` (Delta v1.2 — B3)
6. **TASK-806** — VIEW `gtm_investment_pnl` + reclassifier helper (lee `commercial_cost_attribution_v2`, patrón TASK-409)
7. **TASK-807** — 6 reliability signals + subsystem `Commercial Health` registry (NUEVO — mirror TASK-672)
8. **TASK-808** — `engagement_audit_log` + outbox events v1 (9 events) + reactive consumers (lifecycle flip + HubSpot conditional)
9. **TASK-809** — UI `/agency/sample-sprints` + wizards declaración / approval / progress / outcome + agrupación per-cliente
10. **TASK-810** — CHECK constraint anti-zombie (NOT VALID + VALIDATE atomic, patrón TASK-708/766/774)

### Children (sibling — incorporada 2026-05-06)

- **TASK-813** — HubSpot p_services (0-162) bidirectional sync activation + phantom seed cleanup. Sibling derivada de auditoría arch-architect 2026-05-06: 30 filas fantasma en `core.services` seedeadas como cross-product `service_modules × clients`, 16 services reales en HubSpot 0-162 sin sincronizar, 3 huérfanos sin org Greenhouse. Soft dep TASK-555, hard dep TASK-801 (consume `engagement_kind`). Recomendado correr **inmediatamente después de TASK-801** y **antes de TASK-802 onward** para que las extensiones del engagement primitive no se declaren contra services fantasma.

## Métricas de éxito del Epic

- ≥ 1 Sample Sprint declarado y convertido end-to-end via UI (smoke con Sky Content Lead).
- 6 reliability signals registradas con steady-state correcto en `/admin/operations`.
- 0 falsos positivos en `commercial.engagement.unapproved_active` post-cutover.
- Conversion rate trailing 6m visible en UI con datos reales.
- Audit log invariante: 0 UPDATE / 0 DELETE permitidos (test con triggers PG).
- Cost reclassification verifiable: dashboard `/finance/clients/sky` muestra Sky margin neutral durante Sprint, dashboard `/finance/gtm-investment` muestra costo separado.

## Score 4-pilar (heredado de spec V1.2)

- Safety: 8.5/10
- Robustness: 9.0/10
- Resilience: 8.5/10
- Scalability: 9.0/10
- **Promedio: 9.0/10**

## References

- Spec V1.2: `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`
- PDFs origen (Sky Content Lead + Paid Social Care, abril 2026)
- Skill arquitectónica: `~/.claude/skills/arch-architect/` + repo overlay `.claude/skills/arch-architect/SKILL.md`
