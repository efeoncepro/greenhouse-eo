# EPIC-037 — Wave Agentic Readiness Product Platform

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Dirección de producto y arquitectura propuesta; sin implementación autorizada`
- Rank: `TBD`
- Domain: `platform|growth|cross-domain`
- Owner: `Wave Product + Product/Architecture`
- Branch: `epic/EPIC-037-wave-agentic-readiness-product-platform`
- GitHub Issue: `TBD — backlog del repositorio Wave`

## Summary

Coordinar la definición y construcción de **Agentic Readiness** como producto de Wave. Wave es la casa de la capa de
producto de sus Product Services: posee las superficies de producto, contratos, runtimes, evidencia y operación de
Search Visibility 360, Web Experience 360, Measurement & Analytics, Agent Systems & Platforms y Digital Automation &
Integrations.

El producto debe combinar un **Agentic Readiness Snapshot** público, un grader/audit completo para operación interna
y clientes, y una ruta de expansión hacia remediación web, visibilidad, sistemas de agentes, automatización y
measurement.

Greenhouse administra todas las plataformas de Efeonce y consume proyecciones gobernadas; no hospeda el runtime de
Wave ni se convierte en el source of truth del producto.

## Why This Epic Exists

El Brand Visibility Grader actual demuestra que una herramienta puede funcionar simultáneamente como lead magnet,
workbench interno, evidencia comercial y servicio recurrente. Su siguiente evolución hacia Agentic Readiness cruza
Lighthouse, probes de web, evaluación de tareas agentic, evidencia, scoring, reportes, monitoreo y remediación.

Ese alcance no debe crecer como una feature del grader ni como un módulo permanente de Greenhouse. Requiere un producto
de Wave con ownership, runtime, seguridad, costos y ciclo de producto propios, integrado a Greenhouse por contratos de
sister platform. Como todo producto de Wave, debe nacer **Agent Native** y con **Full API Parity**, no como una UI a
la que se le agregan agentes y APIs después.

## Outcome

- Existe un modelo de producto Wave para Agentic Readiness con snapshot público, audit completo, workbench interno,
  superficie cliente y monitoreo recurrente.
- Wave posee el runtime, la evidencia, el scoring, Lighthouse/Chromium, los evaluadores de tareas agentic y los
  reportes del producto.
- Greenhouse administra organizaciones, relaciones, acceso, entitlements administrativos, handoffs comerciales y
  proyecciones; no duplica la verdad transaccional de Wave.
- Clientes y colaboradores acceden a Wave desde la identidad federada de Greenhouse sin un segundo login; Wave mantiene
  enforcement local de subject, tenant, capabilities y entitlements.
- Agent Native y Full API Parity son requisitos de nacimiento para la superficie humana, agentes, MCP/SDK/API y
  automatización gobernada.
- Existe un contrato Wave ↔ Greenhouse con identidad/binding explícitos, tenant safety, deep links, readers, eventos y
  reglas de mutación.
- El producto se conecta comercialmente con Wave Web Experience 360 y Search Visibility 360, y puede expandirse a
  Agent Systems & Platforms, Measurement & Analytics y Digital Automation & Integrations.
- Experience LaunchOps queda reconocido como Product Service compuesto de Wave, junto con Agentic Readiness; ambos
  componen las familias base sin crear nuevas familias de portfolio.
- La arquitectura comercial queda coordinada por tres puertas especializadas: Brand Visibility para Search Visibility,
  Agentic Readiness para Web/Agents/Automation/Measurement y Launch Readiness para Experience LaunchOps.
- Se define una transición honesta para el Brand Visibility Grader actual, sin romper sus consumidores ni mover su
  runtime por anticipado.

## Architecture Alignment

- `docs/architecture/EFEONCE_WAVE_PRODUCT_PLATFORM_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`
- `docs/architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md`
- `docs/business-models/wave/WAVE_BUSINESS_MODEL_V1.md`
- `docs/documentation/wave/agentic-readiness-product.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md` (patrón de plataforma hermana)

## Child Tasks

Las tasks de implementación se crearán después de aceptar el ADR y cerrar el primer producto slice.

- `TBD` — Wave product platform baseline y repository/runtime ownership.
- `TBD` — Agentic Readiness product contract: Snapshot, Audit, Monitor y report models.
- `TBD` — Lighthouse/Chromium y probe execution contract en Wave.
- `TBD` — Agent task evaluation, safety, evidence y scoring contract.
- `TBD` — Wave ↔ Greenhouse identity, bindings, projections y admin bridge.
- `TBD` — Public lead magnet, internal workbench y client product surfaces.
- `TBD` — Pilot, cost-to-serve, evidence y commercial validation.

## Existing Related Work

- `EPIC-020` — Public AI Visibility Lead Magnet Program; current Greenhouse grader and acquisition rail.
- `EPIC-021` — AEO brand-aware prompt generation engine.
- `EPIC-022` — Growth SEO/Search Visibility 360 module.
- `TASK-1266` / `TASK-1281` — technical/entity/agentic readiness probe substrate and headless probe runtime gap.
- Current AI Visibility Grader documentation and runtime in `docs/documentation/growth/ai-visibility-grader.md`.

## Exit Criteria

- [ ] ADR Wave ↔ Greenhouse accepted and indexed.
- [ ] Product/runtime ownership and Wave repository boundary are explicit.
- [ ] Agent Native y Full API Parity están definidos como contratos de nacimiento, con consumers y capabilities identificados.
- [ ] Agentic Readiness product contract separates public, internal, client and recurring-monitor surfaces.
- [ ] No new Wave source of truth is created inside Greenhouse.
- [ ] Lighthouse, probes, task evaluations, evidence, scoring, report delivery and cost controls have owners.
- [ ] Greenhouse integration defines bindings, auth, tenant isolation, projections, deep links and failure behavior.
- [ ] Single-login federation is verified for client and collaborator paths, including direct deep links and revocation.
- [ ] First governed pilot has baseline, after evidence, cost-to-serve, review gate and next-step decision.
- [ ] Reporte y CRM handoff recomiendan una ruta concreta de Wave y registran la siguiente decisión bilateral.
- [ ] El sistema mide account qualification, Snapshot→Audit, Audit→Product Service, pipeline contribution, costo por
  diagnóstico, tiempo a primer valor y expansión; no sólo volumen de leads.
- [ ] Migration/coexistence plan exists for the current Greenhouse Brand Visibility Grader.

## Non-goals

- No immediate extraction or migration of the current Brand Visibility Grader.
- No Greenhouse-hosted Wave product runtime, shared database, shared secrets or copied product UI; Greenhouse administra
  transversalmente, pero no absorbe el runtime de Wave.
- No public pricing, checkout, commercial approval or claims of universal agent compatibility.
- No sixth Wave portfolio family; Agentic Readiness is a product/wedge that composes existing families.
- No technical implementation tasks before the ADR and first product contract are accepted.
