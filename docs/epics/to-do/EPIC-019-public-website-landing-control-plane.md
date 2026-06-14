# EPIC-019 — Public Website Landing Control Plane

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Arquitectura propuesta`
- Rank: `TBD`
- Domain: `platform|commercial|marketing-ops|integrations|cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-019-public-website-landing-control-plane`
- GitHub Issue: `none`

## Summary

Programa cross-domain para que Greenhouse gobierne el sitio publico de Efeonce como una superficie operacional: inventario WordPress/Kinsta, plantillas de landing pages, aprobacion, preview, publicacion a WordPress, limpieza de cache Kinsta, auditoria, drift detection y atribucion comercial con HubSpot.

La meta no es reemplazar WordPress en V1. La meta es que Greenhouse sea el **control plane** de las landing pages que crea, mientras WordPress sigue sirviendo `efeoncepro.com` y Kinsta sigue operando el hosting. El bridge WordPress debe ser **Abilities-first** cuando la version runtime lo permita, para alinearse con la direccion oficial de WordPress hacia agentes/MCP.

Actualizacion WordPress developers 2026-06-14: WordPress puede trabajar con React, pero en este epic React debe vivir en las vias nativas de WordPress: Gutenberg/bloques/admin del bridge y WordPress Interactivity API para interacciones frontend acotadas. No cambia la decision de source of truth: Greenhouse no debe convertir el sitio publico en una SPA ni publicar React arbitrario; React 19 sigue siendo un punto de compatibilidad a probar porque Gutenberg 23.3.2 revirtio temporalmente el upgrade.

## Why This Epic Exists

El sitio publico de Efeonce es una superficie comercial, pero hoy vive fuera del loop operativo de Greenhouse. Eso crea drift entre campanas, CTAs, HubSpot, SEO/AEO, landing pages y aprendizaje comercial.

La capacidad pedida por el operador es desplegar landing pages desde Greenhouse a WordPress. Eso requiere mas que una llamada a `/wp/v2/pages`: necesita source of truth, ownership, revisionado, aprobacion, permisos, secretos, audit logs, preflight, cache, rollback, drift detection, attribution y observabilidad.

Sin un epic, el trabajo tenderia a partir con un script o endpoint aislado que publica HTML en WordPress. Ese camino es rapido, pero no construye una capacidad durable de Greenhouse ni respeta el contrato de full API parity.

## Outcome

- Greenhouse sincroniza inventario y salud de `efeoncepro.com` desde WordPress/Kinsta en modo read-only.
- Greenhouse define un landing manifest versionado y un registry de templates gobernadas.
- Greenhouse puede crear una landing como draft en WordPress, con metadata de ownership y preview verificable.
- Greenhouse puede aprobar y publicar una landing a produccion con audit log, Kinsta cache clear y smoke verification.
- Greenhouse detecta drift cuando una landing Greenhouse-owned cambia directo en WordPress.
- Cada landing puede vincularse a HubSpot/campana/CTA/servicio/buyer persona para futura atribucion revenue.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/04_greenhouse-producto.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/11_hubspot-bowtie.md`

## Child Tasks

| Task | Phase | Status | Purpose |
| --- | --- | --- | --- |
| `TASK-1111` | `0` | `in-progress` | WordPress/Kinsta discovery + read-only inventory: public REST/Abilities inventory shipped; authenticated WordPress/Abilities/plugins and WP-CLI theme/plugins/post-types are repeatable. Kinsta API environment/cache/backups remains blocked on token or deferral. |
| `TASK-1122` | `0.5` | `in-progress` | Public Site code baseline + GitOps binding: private repo `efeoncepro/efeonce-public-site-runtime` created with live baseline `0fa6bfd` / tag `baseline-2026-06-14-live`; Greenhouse drift/deploy dry-run still pending. |
| `TASK-1116` | `1` | `in-progress` | WordPress bridge plugin foundation: private namespace, Abilities API registrations, auth/signature verification, health endpoint, metadata contract and draft-only write path in `efeonce-public-site-runtime:wp-content/plugins/greenhouse-wp-bridge`. Current execution is code-only; live write rollout remains blocked by staging/preview, shared secret, least-privilege and Kinsta API backup/cache gap. |
| `TASK-1123` | `1.5` | `in-progress` | Greenhouse AI Content Factory Agent Kit: AI-native but not chat-first; resources, recipes, catalogs, golden examples, validators and Full API Parity primitives so agents can generate Gutenberg post drafts and Elementor/Ohio landing drafts safely. Current slice builds the read-only Content Intelligence Map. MCP remains downstream of API Platform/primitives. |
| `TASK-TBD` | `2` | `planned` | Landing manifest + template registry: canonical schema, revision model, SEO/CTA/HubSpot metadata, validation and audit records, informed by `TASK-1123`. |
| `TASK-TBD` | `3` | `planned` | Greenhouse Landing Ops UI V1: internal surface for inventory, draft creation, review, preview status and operational states. |
| `TASK-TBD` | `4` | `planned` | Publish pipeline: approval gate, WordPress publish, Kinsta cache clear, smoke verification, rollback baseline and drift detection. |
| `TASK-TBD` | `5` | `planned` | Attribution and reporting: HubSpot campaign/form/meeting linkage, landing performance snapshot and Pulse/Account 360 hooks. |
| `TASK-TBD` | `6` | `planned` | Nexa advisory layer: draft copy/SEO suggestions and opportunity detection after deterministic publishing is stable. |

## Existing Related Work

- Official WordPress Agent Skills vendored locally for both Codex and Claude in `.codex/skills/{wordpress-router,wp-*}` and `.claude/skills/{wordpress-router,wp-*}`.
- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md` already includes `public_website.*` as an ecosystem access target.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` governs app/ecosystem lanes and full API parity.
- `docs/context/08_estrategia-comercial.md` names Greenhouse, Verk and Kortex as commercial differentiators and makes product adoption a GTM dependency.
- `docs/context/11_hubspot-bowtie.md` governs HubSpot company/deal lifecycle and commercial motion properties.
- `docs/context/03_ecosistema-producto.md` defines Greenhouse as the hub where ecosystem signals converge.

## Exit Criteria

- [ ] ADR accepted or explicitly recalibrated before write-path tasks ship beyond draft-only.
- [ ] WordPress/Kinsta inventory visible in Greenhouse with no production writes.
- [ ] Bridge plugin contract implemented with secrets, auth, Abilities API registrations where available, health check and least-privilege credentials.
- [ ] Landing manifest/revision/deployment/audit model exists and is documented.
- [ ] At least one governed landing template can publish to WordPress as draft and preview from Greenhouse.
- [ ] Production publish requires approval, writes audit log, clears Kinsta cache and records smoke verification.
- [ ] Drift detection flags out-of-band WordPress edits on Greenhouse-owned landings.
- [ ] HubSpot attribution metadata is attached to each Greenhouse-owned landing.
- [ ] No direct WordPress/Kinsta credentials in frontend code or docs.
- [ ] Destructive Kinsta actions remain out of scope unless a future ADR/task explicitly adds them.

## Non-goals

- Replacing WordPress or migrating `efeoncepro.com` off Kinsta.
- Building a full freeform page builder in Greenhouse.
- Allowing clients to create public landing pages.
- Publishing arbitrary HTML/scripts from Greenhouse.
- Letting Nexa publish autonomously.
- Making WordPress the source of truth for Greenhouse-owned landing pages.
- Automating destructive hosting operations such as site reset, production restore or staging-to-live push in V1.

## Delta 2026-06-13

Epic created from operator request: "capacidad tambien de desplegar landing pages desde Greenhouse a Wordpress". Initial architecture and ADR are proposed, not implemented.

Official WordPress Agent Skills from `WordPress/agent-skills` were vendored into both `.codex/skills` and `.claude/skills`; future WordPress bridge tasks must load the relevant `wp-*` skills before implementation.

## Delta 2026-06-14

Se documento la frontera React/Gutenberg/Interactivity API para este epic. Resultado: React es valido en WordPress para bloques, admin/editor tooling del bridge y microinteracciones frontend con Interactivity API, pero V1 no debe transformarse en una reescritura SPA ni depender de React 19 sin prueba de compatibilidad en el runtime Kinsta/WordPress activo.

Discovery de repositorio/control plane: `efeoncepro/efeonce-web` existe, pero representa un rebuild Astro/headless historico y no el runtime live actual de `efeoncepro.com`. El codigo WordPress mas cercano vivia en `/Users/jreye/Documents/efeonce-sp` con remote `cesargrowth11/efeonce-sp`, mientras Kinsta live ya tenia drift propio en `ohio-child` y plugins activos. `TASK-1122` creo el repo privado `efeoncepro/efeonce-public-site-runtime`, baseline `0fa6bfd`, tag `baseline-2026-06-14-live`, y binding `docs/operations/public-site-runtime-repository-binding-20260614.json`. Queda pendiente modelar drift/deploy dry-run en Greenhouse antes del bridge.
