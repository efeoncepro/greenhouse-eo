# TASK-674 — Commercial Public Procurement Architecture Contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `policy`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-674-commercial-public-procurement-contract`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Define el contrato canonico del subdominio `Commercial / Public Procurement`: agregado principal, lifecycle, fuentes, eventos, permisos, modelo documental y fronteras con cotizaciones, deals, OC, Reliability y API Platform. Es el paso previo para no crear un modulo estrecho de "licitaciones" que luego no soporte Compra Agil, RFI, RFQ-like y post-award.

## Why This Task Exists

El research confirmo que Mercado Publico no es una sola superficie: licitaciones via API oficial, Compra Agil via datos abiertos COT y futura Beta API, adjuntos via ficha WebForms, OC via API separada, y postulacion sin API publica. Antes de persistir datos productivos necesitamos una decision arquitectonica versionada sobre el agregado amplio `public_procurement_opportunity`.

## Goal

- Crear arquitectura tecnica canonica para Public Procurement en Greenhouse.
- Fijar grano de datos, lifecycle, eventos, acceso y retencion documental.
- Convertir `RESEARCH-007` en decisiones ejecutables para las tasks hijas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- El agregado base debe soportar licitaciones, Compra Agil, RFI/RF, tratos directos, convenio marco y post-award sin renombrado estructural temprano.
- La autorizacion visible debe declarar `views` y `entitlements`; no basta con route guards.
- No prometer postulacion automatica si Mercado Publico no expone API publica para ofertar.
- Las metricas de negocio futuras deben venir de ICO Engine / serving, no de calculos inline en UI.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/research/TASK-673-findings.md`
- `docs/tasks/complete/TASK-673-mercadopublico-poc.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Research validado de Mercado Publico en `docs/research/RESEARCH-007-commercial-public-tenders-module.md`.
- POC helper/read path en `src/lib/integrations/mercado-publico/tenders.ts`.

### Blocks / Impacts

- `TASK-675`
- `TASK-676`
- `TASK-677`
- `TASK-678`
- `TASK-679`
- `TASK-680`
- `TASK-681`
- `TASK-682`
- `TASK-683`
- `TASK-684`
- `TASK-685`
- `TASK-686`
- `TASK-687`
- `TASK-688`
- `TASK-689`

### Files owned

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `project_context.md`
- `Handoff.md`

## Current Repo State

### Already exists

- Research profundo en `docs/research/RESEARCH-007-commercial-public-tenders-module.md`.
- Findings POC en `docs/research/TASK-673-findings.md`.
- Helper Mercado Publico en `src/lib/integrations/mercado-publico/tenders.ts`.
- Secret documentado `greenhouse-mercado-publico-ticket`.

### Gap

- No existe contrato arquitectonico canonico para Public Procurement.
- No hay DDL productivo `greenhouse_commercial.public_procurement_*`.
- No hay decision versionada sobre naming, lifecycle, eventos, permissions, raw retention ni asset policy.

<!-- ZONE 2 — PLAN MODE intentionally empty -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Architecture Contract

- Crear `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`.
- Declarar bounded context, objetivos, anti-objetivos y vocabulario canonico.
- Definir el agregado `public_procurement_opportunity` y sus child objects.

### Slice 2 — Data, Events And Access

- Definir tablas objetivo, grano, keys externas, lifecycle y estados.
- Definir eventos salientes/entrantes y consumidores esperados.
- Definir `views`, route groups y capabilities objetivo.

### Slice 3 — Source And Reliability Contract

- Definir fuentes oficiales: licitaciones API, OC API, COT monthly files, futura Beta API, adjuntos WebForms.
- Definir freshness/SLA, observabilidad, replay, raw retention y degraded modes.
- Actualizar `RESEARCH-007`, `project_context.md` y `Handoff.md` con la decision canonica.

## Out of Scope

- Crear migraciones o tablas.
- Crear UI.
- Implementar ingestion jobs.
- Automatizar postulacion en Mercado Publico.

## Detailed Spec

El contrato debe preferir `public_procurement_opportunity` por sobre `public_tender` para evitar quedar atrapados en licitaciones clasicas. Debe mapear `opportunity_kind`, `external_type_code`, `commercial_motion`, `source_surface`, `source_system`, `deadline_at`, `buyer`, `items`, `documents`, `awards`, `purchase_orders`, `decision` y `links` hacia objetos comerciales Greenhouse.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Existe `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`.
- [ ] El documento distingue licitaciones, Compra Agil, RFI/RF, OC, documentos y postulacion asistida.
- [ ] El modelo de acceso declara `views` y `entitlements`.
- [ ] Las tasks hijas quedan alineadas con el naming y lifecycle elegidos.
- [ ] `RESEARCH-007` referencia la arquitectura canonica en vez de ser la unica fuente.

## Verification

- Revision manual contra docs listados en `Architecture Alignment`.
- `rg -n "public_procurement|public_tender|Mercado Publico|Compra Agil" docs/architecture docs/research docs/tasks`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real.
- [ ] el archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible.
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas.
- [ ] `project_context.md` referencia el nuevo contrato si cambia arquitectura del dominio.

## Follow-ups

- Ejecutar `TASK-675` y `TASK-680` como primeros slices de implementacion tras cerrar este contrato.

## Open Questions

- Si el modulo visible se llamara `Licitaciones Publicas`, confirmar si el agregado tecnico queda igualmente como `public_procurement_opportunity`.
