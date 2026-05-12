# EPIC-016 — Revenue-First Sequencing Program

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `1`
- Domain: `cross-domain` (commercial + client_portal + identity + delivery)
- Owner: `unassigned`
- Branch: `epic/EPIC-016-revenue-first-sequencing`
- GitHub Issue: `optional`

## Summary

Programa de secuenciamiento canónico que ordena las tasks y epics existentes del backlog en **5 tiers de retorno económico**, desde "cobrar lo ya vendido" hasta "abrir streams nuevos". No crea trabajo nuevo: coordina trabajo ya diseñado en EPIC-002, EPIC-005, EPIC-014 (parcialmente cerrado), EPIC-015 y tasks sueltas (Bow-tie, Mercado Público, Partnerships, Quote signature, Client Lifecycle V1, Revenue Enabled, QBR, Nexa Pulse client-facing) bajo un único contrato de prioridad orientado a **flujo de caja**.

## Why This Epic Exists

A 2026-05-11, la inversión histórica del portal se concentró en módulos internos de correctitud operativa: Payroll (TASK-005/025/707/745/746/758/782/812/863), Finance (TASK-571/699/700/703/708/720/721/722/728/742/758/765/766/768/771/773/774/780), Reliability Control Plane (EPIC-007), Auth Resilience (TASK-742). Esos módulos son base obligatoria pero **no facturan**.

Lo que sí facturaría hoy está disperso, sin prioridad explícita ni secuenciamiento cross-EPIC:

1. **Cierres legales bloqueados** — TASK-619 (firma electrónica ZapSign) sigue to-do; sin firma criptográfica defendible no se cierran contratos enterprise LATAM (banca, aerolínea, gobierno) y queda revenue acordado verbalmente sin trail auditable.
2. **Portal sin SKUs vendibles** — Hoy el Client Portal es binario (`tenant_type='client'` ↔ ve-todo / ve-nada). EPIC-015 introduce módulos on-demand, pero ninguna task ha entrado a `in-progress`. Sin esto: cero venta de addon, cero pilots, cero diferenciación enterprise vs SMB.
3. **Valor invisible al cliente** — Revenue Enabled (TASK-287), Nexa Pulse client-facing (TASK-432), QBR auto-generado (TASK-298), Reports Center (TASK-288), Brand Health (TASK-296) están specificados pero no buildeados. Sin estas surfaces, el VP Marketing del cliente no tiene argumento ante su CFO en el renewal.
4. **Sin medición de retención/expansion** — Bow-tie (TASK-832/833/834) no implementado: NRR/GRR/Expansion Rate no computables. Forecast revenue ciego.
5. **Streams nuevos parados** — Mercado Público (TASK-675..689) y Partnership programs (TASK-307..312) representan ticket promedio alto y revenue passive respectivamente; ninguno arrancó.

Sin este programa de secuenciamiento, cada agente que llega elige tasks por urgencia técnica, no por aporte a caja. Esto canoniza la cola.

## Outcome

- 5 tiers ordenados por retorno económico, con criterios de salida verificables por tier.
- Cola canónica de tasks/epics existentes alineados al `client_kind` doctrine (Active / Self-Serve / Project per `commercial-expert` skill) y al Bow-tie operativo.
- Calendario indicativo: T1 (semanas 1-4), T2 (semanas 3-9 paralelo), T3 (semanas 6-12), T4 (semanas 10-16), T5 (semanas 12+ stream independiente).
- Métrica única de éxito del programa: **revenue cobrado** atribuible a capacidades habilitadas por este orden, medido vía Bow-tie NRR (TASK-833) una vez activa.
- Decisión documentada de qué NO entra mientras T1-T3 corren (Non-goals).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — el orden respeta el canónico 360 (extensión, no paralelización).
- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` — define qué métricas el programa promete iluminar.
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` — Sample Sprints como motor de adquisición ya canonizado (EPIC-014 mayormente cerrado).
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` — sustrato del Tier 2 (EPIC-015).
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — onboarding/offboarding/reactivation del Tier 4.
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` — el Tier 1 vive en Commercial, no Finance.
- `.claude/skills/commercial-expert/SKILL.md` — doctrine ASaaS + 3 client_kind playbooks.

## Tiers (orden canónico de ejecución)

### Tier 1 — Cierre comercial: cobrar lo vendido (semanas 1-4)

Trabajo que **destraba caja inmediata**. Cada item desbloquea cierres en pipeline hoy.

| Task | Rol | Bloquea revenue de |
|---|---|---|
| `TASK-619` | Firma electrónica ZapSign cotizaciones | Enterprise LATAM (compliance Chile/Colombia/México/Perú) |
| `TASK-619.1` | Signed PDF storage hardening | Auditoría contable post-firma |
| `TASK-619.3` | Quote signature notifications | Time-to-close ↓ |
| `TASK-619.4` | HubSpot bidirectional signature sync | Forecast pipeline sincronizado |
| `TASK-564` | Quote→Deal HubSpot link gating residual | Orgs legacy en builder |
| `TASK-497` | Quote Builder autosave + RHF | Abandono de cotización en sesiones largas |
| `TASK-576` | HubSpot Quote publish contract completion | Quote canónico end-to-end |
| `TASK-499` | Quote Builder polish backlog (20+ micro-items) | Fricción acumulada de venta |
| `TASK-609` | AI Quote Draft Assistant | Tiempo por cotización ↓ → más deals/semana |

Salida T1: el equipo comercial puede emitir, firmar, registrar y sincronizar cotizaciones con HubSpot sin bloqueos legales ni de UX.

### Tier 2 — Greenhouse como producto vendible (semanas 3-9, paralelo a T1)

Convertir el Portal en SKU con SKUs adentro. Habilita addon, trial, pilot pagados y diferenciación enterprise vs SMB sin deploy.

Carril completo: **EPIC-015 Client Portal Domain Consolidation** — `TASK-822 → TASK-823 → TASK-824 → TASK-825 → TASK-826 → TASK-827 → TASK-828 → TASK-829`.

Salida T2:
- 10 módulos del portal cliente vendibles per-organization desde Admin Center.
- Cascade automático desde cierre comercial (engagement_commercial_terms.bundled_modules) → provisioning sin revenue leak.
- Empty states honestos por módulo no asignado (afordancia de upsell para sales).
- Subsystem reliability `Client Portal Health` visible.

### Tier 3 — Valor visible al cliente: justifica spend, alimenta renewal (semanas 6-12)

Sin estas surfaces el VP Marketing del cliente no tiene argumento ante su CFO. Cada item ata renewal y baja churn.

Orden recomendado:

1. `TASK-286` — Client view catalog expansion (registra 10 view codes nuevos; prereq de los siguientes).
2. `TASK-287` — Revenue Enabled standalone (North Star metric client-facing).
3. `TASK-304` — Pulse Revenue headline (KPI en primeros 5s al entrar al portal; quick win sobre T-287).
4. `TASK-432` — Client Portal Nexa Pulse (Nexa como diferenciador comercial vs Sprinklr/Brandwatch).
5. `TASK-298` — QBR Executive Summary (auto-genera el QBR trimestral; ancla renewal).
6. `TASK-288` — Reports Center MVP (export PDF/CSV; requisito de procurement enterprise).
7. `TASK-296` — Brand Health Dashboard (CMO banca/aerolínea reporta consistencia al board).

Salida T3: el portal entrega narrativa ejecutiva exportable al CFO del cliente. QBR como ritual atado al producto.

### Tier 4 — Lifecycle + Bow-tie: forecast y retención intencional (semanas 10-16)

Convierte onboarding/expansion/renewal de ad-hoc en motion medible.

**Sub-tier 4a — Client Lifecycle V1**: `TASK-816 → TASK-817 → TASK-818 → TASK-819 → TASK-820 → TASK-821`.

**Sub-tier 4b — Bow-tie metrics + motion**:
- `TASK-830` — HubSpot portal configuration runbook.
- `TASK-831` — Greenhouse↔HubSpot contractual properties projection.
- `TASK-832` — `is_at_risk` motion property evaluation (MSA expirando + MRR caída + ICO rojo).
- `TASK-833` — Bow-tie metrics engine (NRR / GRR / Expansion Rate / Logo Retention / Time-to-Expansion / Renewal Rate).
- `TASK-834` — Dashboards Revenue Health + Expansion Engine + At-Risk Accounts.

Salida T4: cola priorizada visible para CSM/Sales por motion, NRR computado con steady ≥ 100% target, forecast revenue defendible.

### Tier 5 — Streams nuevos de revenue (semanas 12+, carril independiente)

Líneas que no compiten con T1-T4 porque viven en superficies separadas.

**Sub-tier 5a — Mercado Público (state procurement Chile)**:
- `TASK-674` — Architecture contract.
- `TASK-675` — Licitaciones ingestion foundation.
- `TASK-679` — Document ingestion private assets.
- `TASK-680` — Procedure taxonomy registry.
- `TASK-682` — Public tenders scoring V1.
- `TASK-683` — Workbench list+detail.
- `TASK-684` — Bid/No-bid workflow.
- `TASK-686` — Tender→Deal/Quote bridge.
- `TASK-687` — Notifications reliability.
- `TASK-688` — Submission control room.

**Sub-tier 5b — Partnership programs (20+ partners sin registry)**:
- `TASK-307` — Schema + partner programs registry.
- `TASK-308` — Partnership revenue registration.
- `TASK-309` — Serving views + dashboard.
- `TASK-310` — Cost tracking + profitability.
- `TASK-311` — Partnership contacts role/label.
- `TASK-312` — Automation alerts.

Salida T5: nuevo top-of-funnel (Mercado Público) + revenue passive trackeado (Partnerships).

## Child Tasks

Este EPIC no genera tasks nuevas. Coordina los EPICs y tasks existentes listados por tier. Para cada tier hay un EPIC owner cuando aplica:

- T1 — coordina con `EPIC-002` (Commercial domain separation) y `EPIC-001` (Document Vault + Signature) sin bloquearse en su cierre total.
- T2 — `EPIC-015` (Client Portal Domain Consolidation) es el carril completo.
- T3 — tasks sueltas client-facing (TASK-286/287/288/296/298/304/432).
- T4 — tasks sueltas (TASK-816..821 lifecycle + TASK-830..834 Bow-tie).
- T5 — tasks sueltas Mercado Público (TASK-674..689) y Partnerships (TASK-307..312).

## Existing Related Work

- `EPIC-014` Sample Sprints Engagement Platform — **mayormente completo** (TASK-801..810 cerradas, 835 + 837 cerradas). Es el motor de adquisición que este programa asume operativo.
- `EPIC-001` Document Vault + Signature — pre-requisito de TASK-619 (T1).
- `EPIC-002` Commercial domain separation — alinea nomenclatura/access del Tier 1.
- `EPIC-005` Commercial↔Delivery orchestrator (HubSpot↔Notion) — independiente; importante para integridad de datos pero no es path-to-cash directo en este programa.
- `EPIC-008` Organization Workspace Convergence — sustrato compartido con T2/T3 (organization-by-facets).
- `EPIC-012` Finance Five Capabilities Operating System — internal correctness; queda en paralelo, no compite por priority slot.

## Exit Criteria

- [ ] Tier 1: 100% de cotizaciones nuevas pasan por flujo con firma electrónica ZapSign activable (TASK-619 + .1/.3/.4 cerradas).
- [ ] Tier 1: Quote Builder sin pérdida de trabajo (autosave operativo, recovery testeado).
- [ ] Tier 2: EPIC-015 cerrado con `lifecycle=complete`; 10 módulos seed asignables vía Admin Center.
- [ ] Tier 2: al menos un módulo del portal vendido como addon documentado (cierre comercial → cascade → assignment activo).
- [ ] Tier 3: TASK-287 + TASK-304 + TASK-298 live en producción para al menos 1 cliente Globe enterprise.
- [ ] Tier 3: QBR Q3 2026 generado automático desde el portal (no manual).
- [ ] Tier 4: TASK-833 Bow-tie metrics engine emite NRR / GRR / Expansion Rate mensual con steady state observado por ≥ 30 días.
- [ ] Tier 4: Dashboard At-Risk Accounts (TASK-834) priorizado por sales/CSM (uso semanal documentado).
- [ ] Tier 5: al menos 1 licitación Mercado Público convertida a deal vía bridge (TASK-686).
- [ ] Tier 5: 20+ partnerships registrados en `greenhouse_partnership.partner_programs` con revenue trackeado (TASK-307 + TASK-308).
- [ ] Métrica programa: revenue cobrado atribuible a capacidades del Tier 1-3 ≥ ROI documentado del esfuerzo invertido en Payroll/Finance histórico.

## Non-goals

Mientras T1-T3 corren, **no entra** prioridad cross-EPIC para:

- Refactors técnicos (TASK-510 floating-ui, TASK-511 stack modernization, TASK-514.* React hooks, TASK-516 NextAuth v5, TASK-519 datepicker MUI X, TASK-520 maplibre, TASK-521 clsx, TASK-523 argon2, TASK-845 Node 24). Quedan oportunistas.
- Migraciones de stack visual no críticas (TASK-518 ApexCharts deprecation, TASK-641 ECharts adoption). El stack ApexCharts vigente sigue válido.
- Hardening de plataforma no bloqueante (TASK-126 CSP, TASK-127 cloud posture, TASK-172 platform hardening). Trabajo importante pero no path-to-cash.
- Expansión de capacidades internas (TASK-393..398 management accounting expansion, TASK-394 BU/legal entity, TASK-396 variance forecast tower). Internal correctness; queda en paralelo bajo EPIC-012 cuando capacidad lo permita.
- Hiring ATS end-to-end (EPIC-011). Importante para escalar equipo pero no es revenue inflow.
- Nubox enrichment beyond V2 (TASK-662..668). Path técnico, no caja directa.

Esto es decisión deliberada de **secuenciamiento por caja**, no de calidad técnica de los items diferidos.

## Métrica única de éxito

Revenue cobrado atribuible a capacidades habilitadas por este orden, computado vía:

- `greenhouse_serving.bowtie_metrics_monthly` (TASK-833) — NRR, Expansion Rate.
- `greenhouse_finance.income` filtrado por `service.engagement_kind` y `service.pipeline_stage` — revenue real cobrado.
- Bridge HubSpot ↔ Greenhouse (TASK-706/813/836/837) — deals cerrados con firma electrónica TASK-619 vs cerrados sin firma.

Target inicial Q3 2026: NRR ≥ 100%, al menos 1 addon vendido vía portal cliente, 1 licitación pública convertida a deal.
