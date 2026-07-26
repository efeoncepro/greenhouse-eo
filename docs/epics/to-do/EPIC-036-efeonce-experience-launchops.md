# EPIC-036 — Efeonce Experience LaunchOps

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Hipótesis de producto y arquitectura propuesta`
- Rank: `TBD`
- Domain: `platform|commercial|marketing-ops|integrations|cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-036-efeonce-experience-launchops`
- GitHub Issue: `none`

## Summary

Programa para validar y construir Experience LaunchOps: un product service de Wave que reduce el time-to-market
de experiencias digitales en organizaciones mid-market y enterprise mediante método, personas, control plane,
agents, adapters CMS, SEO/AEO y measurement.

La adopción debe ser no disruptiva: Experience LaunchOps se enchufa al stack existente del cliente y no exige
reemplazar CMS, DXP, DAM, PIM, analytics, CRM, IAM, ITSM o CI/CD.

El producto debe ser augmentation-first: el Launch Operator es el héroe y los especialistas humanos reciben una
armadura de contexto, herramientas, preflight, trazabilidad y recuperación. No se valida el producto sólo por
velocidad ni por reducción de headcount.

## Why This Epic Exists

El problema cruza negocio, marketing, contenido, diseño, desarrollo, CMS, analytics, search, compliance y release.
Una task de landing, CMS o agent no puede validar por sí sola el producto completo, la economía, la governance y
la repetibilidad comercial.

## Outcome

- Business model y customer model validados con un ICP mid-market/enterprise.
- Piloto gestionado con una experiencia real y un CMS existente.
- Baseline/after de lead time, espera, handoffs, retrabajo, defectos y medición.
- Experience Spec con Search Contract y Measurement Contract.
- Governance & Compliance Operating Model con Launch Policy Pack, risk classes, controls y evidence pack.
- Stack, security/threat model, cloud/deployment, SRE/support, legal/data, agent assurance y enterprise readiness.
- Primer adapter CMS y flujo de preview/approval/release verificable.
- Operating model claro entre Wave, Globe, Search Visibility 360, Measurement, Agent Systems y Efeonce Digital.
- Decisión explícita sobre commercial approval, scale, pivot o stop.

## Architecture Alignment

- `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_GOVERNANCE_COMPLIANCE_OPERATING_MODEL_V1.md`
- `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_HUMAN_AUGMENTATION_PRODUCT_OPERATING_MODEL_V1.md`
- `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_STACK_REFERENCE_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_SECURITY_THREAT_MODEL_V1.md`
- `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_AGENT_ASSURANCE_EVALUATION_MODEL_V1.md`
- `docs/operations/EFEONCE_EXPERIENCE_LAUNCHOPS_CLOUD_DEPLOYMENT_OPERATING_MODEL_V1.md`
- `docs/operations/EFEONCE_EXPERIENCE_LAUNCHOPS_OPERATIONS_SRE_SUPPORT_MODEL_V1.md`
- `docs/business-models/experience-launchops/EXPERIENCE_LAUNCHOPS_LEGAL_CONTRACT_DATA_PROCESSING_PACK_V1.md`
- `docs/business-models/experience-launchops/EXPERIENCE_LAUNCHOPS_ENTERPRISE_READINESS_PROCUREMENT_PACK_V1.md`
- `docs/business-models/experience-launchops/EXPERIENCE_LAUNCHOPS_BUSINESS_MODEL_V1.md`
- `docs/business-models/experience-launchops/EXPERIENCE_LAUNCHOPS_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md`
- `docs/architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md`
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md` (capacidad interna relacionada, no producto comercial)
- `docs/epics/to-do/EPIC-022-growth-seo-search-visibility-360-module.md`

## Phases / Child Tasks

| Fase | Propósito | Estado |
| --- | --- | --- |
| 0 | Customer discovery, qualification y baseline | Planned |
| 1 | Offer design, roles, RACI, scope y pricing hypothesis | Planned |
| 2 | Experience Spec + Search/Measurement Contracts | Planned |
| 3 | Launch Control Plane thin slice y deterministic preflight | Planned |
| 4 | Primer CMS adapter, preview, approval, release y rollback | Planned |
| 5 | Managed pilot y evidence pack | Planned |
| 6 | Commercial gate y roadmap de escala | Planned |

Las tasks hijas se crearán sólo después de definir el piloto, ownership y acceptance criteria; no se deben abrir
tasks técnicas aisladas que confundan discovery con product-market fit.

## Exit Criteria

- [ ] Customer Model Integrity Pack actualizado con entrevistas/evidencia.
- [ ] Un cliente piloto calificado y un Launch Owner identificado.
- [ ] Baseline y after medibles, con definición de denominadores y fuente.
- [ ] Arquitectura revisada y gates de seguridad/compliance definidos.
- [ ] Un policy pack real mapeado a controles, aprobaciones, excepciones y evidencia.
- [ ] Stack, seguridad, cloud, ops, legal/data, agent assurance y enterprise readiness revisados por sus owners.
- [ ] Cada integración declara system of record, modo observe/connect/assist/governed-write, permisos, rollback y salida.
- [ ] El piloto demuestra valor para Launch Operator, UI/UX, UX Content, developers y especialistas sin pérdida de autoría ni calidad.
- [ ] Una experiencia publicada con aprobación humana, Search Contract, Measurement Contract y evidencia post-launch.
- [ ] Cost-to-serve y margen p50/p95 estimados.
- [ ] Decisión documentada: scale, iterate, pivot o stop.

## Non-goals

- Reemplazar el CMS del cliente.
- Forzar migración o sustituir cualquier plataforma existente del cliente.
- Crear un page builder genérico.
- Publicación autónoma en producción.
- Garantizar rankings, indexación o citación.
- Absorber CRM/RevOps desde Wave.
- Convertir Greenhouse en producto comercial de cara al cliente.

## Delta 2026-07-26

Epic creado para separar el product service comercial de Wave del control plane interno de Greenhouse (`EPIC-019`).
