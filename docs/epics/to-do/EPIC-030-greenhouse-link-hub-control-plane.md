# EPIC-030 — Greenhouse Link Hub Control Plane

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseno arquitectonico aceptado; runtime pendiente`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-030-greenhouse-link-hub-control-plane`
- GitHub Issue: `n/a`

## Summary

Coordina una capacidad multi-marca de **Link Hub** gobernada íntegramente desde Greenhouse para usar como enlace de perfil en Instagram y TikTok. La primera activación será Efeonce bajo `links.efeoncepro.com/efeonce`; después, el mismo modelo permitirá operar páginas de clientes con branding propio, URL Efeonce inmediata y dominio personalizado opcional, sin código por cliente ni dependencia de Linktree.

## Why This Epic Exists

La capacidad combina source of truth y publicación versionada, UI operator-facing, renderer público anónimo, dominios/SSL, medición, HubSpot y rollout sobre perfiles sociales externos. Ninguna task individual puede cerrar esas fronteras sin mezclar schema/API, UI y operación. El programa también debe separar con claridad el control plane autenticado de la proyección pública: todo se administra en Greenhouse, pero el visitante social sólo recibe un payload allowlisted, rápido y brand-owned.

## Outcome

- Efeonce usa una página Link Hub propia, accesible y medible como enlace de perfil en Instagram y TikTok, sin branding ni límites de un proveedor externo.
- Greenhouse crea, edita, previsualiza, publica, revierte, mide y opera dominios de Link Hubs mediante commands/readers gobernados y auditables.
- Cada cliente se materializa como configuración tenant/brand-scoped sobre el mismo motor; nunca como fork, página manual o condicional por nombre.
- La URL inmediata `links.efeoncepro.com/<slug>` y el dominio personalizado opcional resuelven la misma publicación canónica.
- La medición separa eventos browser-reported de conversiones verificadas por Growth Forms/HubSpot y evita PII/fingerprinting innecesario.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_LINK_HUB_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/10_experiencia-cliente.md`

## Child Tasks

- `TASK-1433` — foundation `growth.link_hub`: schema, contracts, commands/readers, publicación versionada y proyección pública.
- `TASK-1434` — renderer público brand-owned para `links.efeoncepro.com/<slug>` y custom hosts.
- `TASK-1435` — cockpit Greenhouse de autoría, preview, lifecycle, dominio, analytics e historial.
- `TASK-1436` — provisioning gobernado de dominios, DNS, verificación y TLS.
- `TASK-1437` — medición social-to-conversion, GA4/GTM y atribución HubSpot sin falsa precisión.
- `TASK-1438` — piloto Efeonce y activación en perfiles Instagram/TikTok con rollback.
- `TASK-1439` — productización multi-cliente, primer piloto y continuidad del servicio.

## Existing Related Work

- Growth Forms: `src/lib/growth/forms/**` y su renderer público portable.
- Growth CTA: `src/lib/growth/ctas/**`, cuyo contrato de eventos/suppression separa evidencia browser-reported de conversión autoritativa.
- API Platform: `src/lib/api-platform/**` y `src/app/api/platform/**`.
- Organización/tenant: `organizations`, `space_id`, assets de marca y guards existentes; Discovery de `TASK-1433` debe elegir el binding real, no crear otra identidad de cliente.
- Vercel team `efeonce-7670142f` y operación canónica documentada en la skill `vercel-operations`.
- `docs/services/README.md` como catálogo canónico donde `TASK-1439` registrará el entregable si se incorpora formalmente al servicio de redes sociales.

## Exit Criteria

- [ ] `TASK-1433…1439` están completas o re-scopeadas explícitamente con un Delta del epic.
- [ ] `https://links.efeoncepro.com/efeonce` responde por HTTPS, carga la versión publicada y pasa QA desktop, mobile 390 e in-app browser Instagram/TikTok.
- [ ] La misma página puede publicarse, previsualizarse, revertirse y observarse desde Greenhouse sin operar contenido en Vercel/DB manualmente.
- [ ] Un dominio de cliente opcional resuelve el mismo `link_page_id`, con DNS/SSL visibles en Greenhouse y sin duplicar contenido.
- [ ] Visitas/clics se distinguen de leads verificados; GA4/HubSpot y Greenhouse concilian el piloto sin PII en `dataLayer`.
- [ ] Un primer cliente opera sobre el mismo motor y brand pack, sin fork ni hardcode por cliente.
- [ ] El ADR, documentación funcional/manual, servicio, Handoff y changelog reflejan runtime y rollout reales.

## Non-goals

- Construir un acortador genérico, un clon completo de Linktree o un page builder libre.
- Comprar un dominio corto como dependencia del MVP.
- Publicar contenido social, enviar DMs o modificar perfiles sin confirmación humana explícita.
- Permitir HTML/JavaScript arbitrario, scripts de terceros no gobernados, pagos o commerce en V1.
- Crear un repo, microservicio, `apps/public` o deployable nuevo fuera de una task autorizada por la arquitectura de build vigente.
- Prometer atribución perfecta: dark social y pérdida de referrer permanecen límites explícitos.

## Delta 2026-07-18

Epic creado por decisión del operador. El objetivo principal queda acotado a Instagram/TikTok para Efeonce; multi-cliente es la expansión sobre el mismo motor, no otra implementación.
